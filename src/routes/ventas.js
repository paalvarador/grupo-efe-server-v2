const express = require("express");
const router = express.Router();
const {
  regiones,
  tiendas,
  generarVentaTienda,
  generarVentaRegion,
  generarResumenCompania,
  peoresPorAvance,
} = require("../db");
const { authBearer } = require("../middleware/auth");

// Todos los endpoints requieren X-API-Key
router.use(authBearer);

// ─────────────────────────────────────────────────────────
// HELPER — fecha de ayer (default) o la que viene por query
// ─────────────────────────────────────────────────────────
function getFecha(query) {
  if (query.fecha) return query.fecha;
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  return ayer.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────
// HELPER — valida params obligatorios
// ─────────────────────────────────────────────────────────
function validarParams(req, res, campos) {
  const faltantes = campos.filter(c => !req.query[c]);
  if (faltantes.length) {
    res.status(400).json({
      success: false,
      error: `Parámetros requeridos: ${faltantes.join(", ")}`,
    });
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/resumen-campana
//
// Endpoint principal — usado por el cron de las 8am y por el agente.
// Brain Studio pasa el perfil del usuario (tomado del Datum de Jelou)
// como query params. La API devuelve el resumen personalizado listo
// para armar el mensaje de WhatsApp.
//
// Params:
//   nivel      → back_office | regional | tienda  (obligatorio)
//   region_id  → R1..R9  (obligatorio si nivel=regional o tienda)
//   tienda_id  → T306    (obligatorio si nivel=tienda)
//   nombre     → nombre del usuario para el saludo (opcional)
//   fecha      → YYYY-MM-DD (opcional, default: ayer)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/resumen-campana", (req, res) => {
  const { nivel, region_id, tienda_id, nombre = "Gerente" } = req.query;
  const fecha = getFecha(req.query);

  if (!nivel) {
    return res.status(400).json({ success: false, error: "Parámetro 'nivel' requerido (back_office | regional | tienda)" });
  }

  // ── BACK OFFICE ──────────────────────────────────────────
  if (nivel === "back_office") {
    const datos = generarResumenCompania(fecha);
    const oportunidades = peoresPorAvance(datos.regiones, "avance_dia_pct", 3);

    return res.json({
      success: true,
      data: {
        tipo: "back_office",
        nombre_usuario: nombre,
        empresa: datos.empresa,
        fecha,
        resumen: {
          venta_dia_miles_soles: datos.venta_dia_miles_soles,
          meta_dia_miles_soles: datos.meta_dia_miles_soles,
          avance_dia_pct: datos.avance_dia_pct,
          venta_mes_miles_soles: datos.venta_mes_miles_soles,
          meta_mes_miles_soles: datos.meta_mes_miles_soles,
          avance_mes_pct: datos.avance_mes_pct,
          var_dia_vs_anio_anterior_pct: datos.var_dia_vs_anio_anterior_pct,
          var_dia_vs_anio_previo_pct: datos.var_dia_vs_anio_previo_pct,
          total_regiones: datos.regiones.length,
        },
        oportunidades_mejora: oportunidades.map(r => ({
          region_id: r.region_id,
          nombre_region: r.nombre_region,
          avance_dia_pct: r.avance_dia_pct,
          venta_dia_miles_soles: r.venta_dia_miles_soles,
          semaforo: r.semaforo,
        })),
        mensaje_accion: `Las regiones con menor avance hoy son: ${oportunidades.map(r => r.region_id).join(", ")}.`,
      },
    });
  }

  // ── REGIONAL ─────────────────────────────────────────────
  if (nivel === "regional") {
    if (!validarParams(req, res, ["region_id"])) return;

    const region = regiones.find(r => r.region_id === region_id);
    if (!region) return res.status(404).json({ success: false, error: `Región '${region_id}' no encontrada` });

    const datos = generarVentaRegion(region_id, fecha);
    const oportunidades_categoria = peoresPorAvance(datos.categorias, "avance_dia_pct", 3);
    const oportunidades_tienda    = peoresPorAvance(datos.tiendas, "avance_dia_pct", 3);

    return res.json({
      success: true,
      data: {
        tipo: "regional",
        nombre_usuario: nombre,
        region_id,
        nombre_region: region.nombre_region,
        empresa: region.empresa,
        fecha,
        resumen: {
          venta_dia_miles_soles: datos.venta_dia_miles_soles,
          meta_dia_miles_soles: datos.meta_dia_miles_soles,
          avance_dia_pct: datos.avance_dia_pct,
          venta_mes_miles_soles: datos.venta_mes_miles_soles,
          meta_mes_miles_soles: datos.meta_mes_miles_soles,
          avance_mes_pct: datos.avance_mes_pct,
          var_dia_vs_anio_anterior_pct: datos.var_dia_vs_anio_anterior_pct,
          total_tiendas: datos.tiendas.length,
        },
        oportunidades_mejora_categoria: oportunidades_categoria.map(c => ({
          categoria: c.categoria,
          avance_dia_pct: c.avance_dia_pct,
          venta_dia_miles_soles: c.venta_dia_miles_soles,
          semaforo: c.semaforo,
        })),
        oportunidades_mejora_tienda: oportunidades_tienda.map(t => ({
          tienda_id: t.tienda_id,
          nombre_tienda: t.nombre_tienda,
          avance_dia_pct: t.avance_dia_pct,
          venta_dia_miles_soles: t.venta_dia_miles_soles,
          semaforo: t.semaforo,
        })),
        mensaje_accion: `Tiendas con menor avance hoy: ${oportunidades_tienda.map(t => t.nombre_tienda).join(", ")}.`,
      },
    });
  }

  // ── TIENDA ────────────────────────────────────────────────
  if (nivel === "tienda") {
    if (!validarParams(req, res, ["region_id", "tienda_id"])) return;

    const tienda = tiendas.find(t => t.tienda_id === tienda_id);
    if (!tienda) return res.status(404).json({ success: false, error: `Tienda '${tienda_id}' no encontrada` });

    const datos = generarVentaTienda(tienda_id, region_id, fecha);
    const oportunidades = peoresPorAvance(datos.categorias, "avance_dia_pct", 3);

    return res.json({
      success: true,
      data: {
        tipo: "tienda",
        nombre_usuario: nombre,
        tienda_id,
        nombre_tienda: tienda.nombre_tienda,
        region_id,
        empresa: tienda.empresa,
        fecha,
        resumen: {
          venta_dia_miles_soles: datos.venta_dia_miles_soles,
          meta_dia_miles_soles: datos.meta_dia_miles_soles,
          avance_dia_pct: datos.avance_dia_pct,
          venta_mes_miles_soles: datos.venta_mes_miles_soles,
          meta_mes_miles_soles: datos.meta_mes_miles_soles,
          avance_mes_pct: datos.avance_mes_pct,
        },
        oportunidades_mejora: oportunidades.map(c => ({
          categoria: c.categoria,
          avance_dia_pct: c.avance_dia_pct,
          venta_dia_miles_soles: c.venta_dia_miles_soles,
          semaforo: c.semaforo,
        })),
        mensaje_accion: `Categorías prioritarias hoy: ${oportunidades.map(c => c.categoria).join(", ")}.`,
      },
    });
  }

  res.status(400).json({ success: false, error: `Nivel '${nivel}' no válido. Usa: back_office | regional | tienda` });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/campana-masiva
//
// Endpoint para el cron de las 8am.
// Recibe una lista de usuarios (tomados del Datum de Jelou) y devuelve
// el resumen personalizado para cada uno en una sola llamada.
// Evita N llamadas al API — una sola llamada por ejecución del cron.
//
// Body (POST) o query:
//   fecha → YYYY-MM-DD (opcional, default: ayer)
//
// Body JSON:
//   { "usuarios": [
//       { "whatsapp_number": "51999...", "nombre": "...", "nivel": "back_office", "region_id": null, "tienda_id": null },
//       { "whatsapp_number": "51999...", "nombre": "...", "nivel": "regional",    "region_id": "R3", "tienda_id": null },
//       { "whatsapp_number": "51999...", "nombre": "...", "nivel": "tienda",      "region_id": "R3", "tienda_id": "T306" }
//   ]}
// ─────────────────────────────────────────────────────────────────────────────
router.post("/campana-masiva", (req, res) => {
  const { usuarios = [] } = req.body;
  const fecha = getFecha(req.query);

  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    return res.status(400).json({ success: false, error: "Body debe incluir 'usuarios' como array no vacío" });
  }

  const resultados = [];
  const errores = [];

  for (const u of usuarios) {
    try {
      const { whatsapp_number, nombre = "Gerente", nivel, region_id, tienda_id } = u;

      if (!nivel) {
        errores.push({ whatsapp_number, error: "nivel requerido" });
        continue;
      }

      let resumenData;

      if (nivel === "back_office") {
        const datos = generarResumenCompania(fecha);
        const oportunidades = peoresPorAvance(datos.regiones, "avance_dia_pct", 3);
        resumenData = {
          tipo: "back_office",
          nombre_usuario: nombre,
          resumen: {
            venta_dia_miles_soles: datos.venta_dia_miles_soles,
            avance_dia_pct: datos.avance_dia_pct,
            avance_mes_pct: datos.avance_mes_pct,
          },
          oportunidades_mejora: oportunidades.map(r => ({
            label: r.nombre_region || r.region_id,
            avance_dia_pct: r.avance_dia_pct,
            semaforo: r.semaforo,
          })),
          mensaje_accion: `Regiones con menor avance: ${oportunidades.map(r => r.region_id).join(", ")}.`,
        };

      } else if (nivel === "regional") {
        if (!region_id) { errores.push({ whatsapp_number, error: "region_id requerido para nivel regional" }); continue; }
        const datos = generarVentaRegion(region_id, fecha);
        const opTiendas = peoresPorAvance(datos.tiendas, "avance_dia_pct", 3);
        resumenData = {
          tipo: "regional",
          nombre_usuario: nombre,
          region_id,
          nombre_region: datos.nombre_region,
          resumen: {
            venta_dia_miles_soles: datos.venta_dia_miles_soles,
            avance_dia_pct: datos.avance_dia_pct,
            avance_mes_pct: datos.avance_mes_pct,
          },
          oportunidades_mejora: opTiendas.map(t => ({
            label: t.nombre_tienda,
            avance_dia_pct: t.avance_dia_pct,
            semaforo: t.semaforo,
          })),
          mensaje_accion: `Tiendas con menor avance: ${opTiendas.map(t => t.nombre_tienda).join(", ")}.`,
        };

      } else if (nivel === "tienda") {
        if (!region_id || !tienda_id) { errores.push({ whatsapp_number, error: "region_id y tienda_id requeridos" }); continue; }
        const datos = generarVentaTienda(tienda_id, region_id, fecha);
        const opCats = peoresPorAvance(datos.categorias, "avance_dia_pct", 3);
        resumenData = {
          tipo: "tienda",
          nombre_usuario: nombre,
          tienda_id,
          nombre_tienda: datos.nombre_tienda,
          resumen: {
            venta_dia_miles_soles: datos.venta_dia_miles_soles,
            avance_dia_pct: datos.avance_dia_pct,
            avance_mes_pct: datos.avance_mes_pct,
          },
          oportunidades_mejora: opCats.map(c => ({
            label: c.categoria,
            avance_dia_pct: c.avance_dia_pct,
            semaforo: c.semaforo,
          })),
          mensaje_accion: `Categorías prioritarias: ${opCats.map(c => c.categoria).join(", ")}.`,
        };
      } else {
        errores.push({ whatsapp_number, error: `nivel '${nivel}' no válido` });
        continue;
      }

      resultados.push({ whatsapp_number, fecha, ...resumenData });

    } catch (err) {
      errores.push({ whatsapp_number: u.whatsapp_number, error: err.message });
    }
  }

  res.json({
    success: true,
    fecha,
    procesados: resultados.length,
    errores: errores.length,
    data: resultados,
    ...(errores.length ? { detalle_errores: errores } : {}),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/compania
// Vista completa de la compañía. Solo para back_office.
// Params: fecha (opcional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/compania", (req, res) => {
  const fecha = getFecha(req.query);
  const datos = generarResumenCompania(fecha);
  res.json({ success: true, data: datos });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/region/:region_id
// Detalle completo de una región con tiendas y categorías.
// Params: fecha (opcional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/region/:region_id", (req, res) => {
  const { region_id } = req.params;
  const region = regiones.find(r => r.region_id === region_id);
  if (!region) return res.status(404).json({ success: false, error: `Región '${region_id}' no encontrada` });

  const fecha = getFecha(req.query);
  const datos = generarVentaRegion(region_id, fecha);
  res.json({ success: true, data: datos });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/tienda/:tienda_id
// Detalle de una tienda con desglose por categorías.
// Params: region_id (obligatorio), fecha (opcional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/tienda/:tienda_id", (req, res) => {
  const { tienda_id } = req.params;
  const tienda = tiendas.find(t => t.tienda_id === tienda_id);
  if (!tienda) return res.status(404).json({ success: false, error: `Tienda '${tienda_id}' no encontrada` });

  const fecha = getFecha(req.query);
  const datos = generarVentaTienda(tienda_id, tienda.region_id, fecha);
  res.json({ success: true, data: datos });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/ranking-tiendas
// Ranking de tiendas por avance de meta.
// Params:
//   region_id → filtra a una región (opcional, si no se pasa devuelve todas)
//   orden     → asc (peores primero, default) | desc (mejores primero)
//   fecha     → YYYY-MM-DD (opcional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ranking-tiendas", (req, res) => {
  const { region_id, orden = "asc" } = req.query;
  const fecha = getFecha(req.query);

  const tiendasFiltradas = region_id
    ? tiendas.filter(t => t.region_id === region_id)
    : tiendas;

  if (!tiendasFiltradas.length) {
    return res.status(404).json({ success: false, error: "No se encontraron tiendas para el filtro dado" });
  }

  const ranking = tiendasFiltradas
    .map(t => {
      const datos = generarVentaTienda(t.tienda_id, t.region_id, fecha);
      return {
        tienda_id: t.tienda_id,
        nombre_tienda: t.nombre_tienda,
        region_id: t.region_id,
        empresa: t.empresa,
        avance_dia_pct: datos.avance_dia_pct,
        venta_dia_miles_soles: datos.venta_dia_miles_soles,
        meta_dia_miles_soles: datos.meta_dia_miles_soles,
        avance_mes_pct: datos.avance_mes_pct,
        semaforo: datos.avance_dia_pct < 50 ? "🔴" : datos.avance_dia_pct < 80 ? "🟡" : "🟢",
      };
    })
    .sort((a, b) =>
      orden === "desc"
        ? b.avance_dia_pct - a.avance_dia_pct
        : a.avance_dia_pct - b.avance_dia_pct
    );

  res.json({
    success: true,
    total: ranking.length,
    orden: orden === "desc" ? "mejor_a_peor" : "peor_a_mejor",
    fecha,
    ...(region_id ? { region_id } : {}),
    data: ranking,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ventas/categorias
// Ventas por categoría. Filtra por scope según params.
// Params:
//   nivel     → back_office | regional | tienda
//   region_id → requerido si nivel=regional o tienda
//   tienda_id → requerido si nivel=tienda
//   fecha     → YYYY-MM-DD (opcional)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/categorias", (req, res) => {
  const { nivel, region_id, tienda_id } = req.query;
  const fecha = getFecha(req.query);

  if (!nivel) return res.status(400).json({ success: false, error: "Parámetro 'nivel' requerido" });

  if (nivel === "back_office") {
    const datos = generarResumenCompania(fecha);
    const cats = datos.regiones
      .flatMap(r => r.categorias || [])
      .reduce((acc, c) => {
        const ex = acc.find(a => a.categoria === c.categoria);
        if (ex) {
          ex.venta_dia_miles_soles += c.venta_dia_miles_soles;
          ex.meta_dia_miles_soles  += c.meta_dia_miles_soles;
        } else {
          acc.push({ ...c });
        }
        return acc;
      }, [])
      .map(c => ({
        ...c,
        avance_dia_pct: parseFloat(((c.venta_dia_miles_soles / (c.meta_dia_miles_soles || 1)) * 100).toFixed(1)),
        semaforo: c.avance_dia_pct < 50 ? "🔴" : c.avance_dia_pct < 80 ? "🟡" : "🟢",
      }))
      .sort((a, b) => b.venta_dia_miles_soles - a.venta_dia_miles_soles);
    return res.json({ success: true, ambito: "compania", fecha, data: cats });
  }

  if (nivel === "regional") {
    if (!region_id) return res.status(400).json({ success: false, error: "region_id requerido" });
    const datos = generarVentaRegion(region_id, fecha);
    return res.json({
      success: true, ambito: "regional", region_id, fecha,
      data: datos.categorias.sort((a, b) => b.venta_dia_miles_soles - a.venta_dia_miles_soles),
    });
  }

  if (nivel === "tienda") {
    if (!region_id || !tienda_id) return res.status(400).json({ success: false, error: "region_id y tienda_id requeridos" });
    const datos = generarVentaTienda(tienda_id, region_id, fecha);
    return res.json({
      success: true, ambito: "tienda", tienda_id, fecha,
      data: datos.categorias.sort((a, b) => b.venta_dia_miles_soles - a.venta_dia_miles_soles),
    });
  }

  res.status(400).json({ success: false, error: `Nivel '${nivel}' no válido` });
});

module.exports = router;
