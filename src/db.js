/**
 * Base de datos en memoria — dev-grupo-efe-db (sandbox)
 *
 * NOTA ARQUITECTÓNICA:
 * Los usuarios NO viven aquí. El Datum de Jelou es la fuente de verdad
 * para saber quién puede usar el bot y cuál es su rol/región/tienda.
 * Esta API solo provee datos de ventas filtrados por los parámetros
 * que Brain Studio le pasa (nivel, region_id, tienda_id).
 */

// ─────────────────────────────────────────────────────────
// REGIONES — basado en el PDF de jerarquías (GR1-GR9)
// ─────────────────────────────────────────────────────────
const regiones = [
  { region_id: "R1", nombre_region: "Región 1", empresa: "Conecta" },
  { region_id: "R2", nombre_region: "Región 2", empresa: "Conecta" },
  { region_id: "R3", nombre_region: "Región 3", empresa: "Conecta" },
  { region_id: "R4", nombre_region: "Región 4", empresa: "Conecta" },
  { region_id: "R5", nombre_region: "Región 5", empresa: "Conecta" },
  { region_id: "R6", nombre_region: "Región 6", empresa: "Conecta" },
  { region_id: "R7", nombre_region: "Región 7", empresa: "Conecta" },
  { region_id: "R8", nombre_region: "Región 8", empresa: "Conecta" },
  { region_id: "R9", nombre_region: "Región 9", empresa: "Conecta" },
  { region_id: "R1E", nombre_region: "Región 1", empresa: "Efectiva" },
  { region_id: "R2E", nombre_region: "Región 2", empresa: "Efectiva" },
  { region_id: "R3E", nombre_region: "Región 3", empresa: "Efectiva" },
];

// ─────────────────────────────────────────────────────────
// TIENDAS — basado en el reporte real de Región 3 del PDF
// ─────────────────────────────────────────────────────────
const tiendas = [
  // Región 3
  { tienda_id: "T301", nombre_tienda: "Barranca - EFE",     region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T302", nombre_tienda: "Barranca - LC",      region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T303", nombre_tienda: "Chimbote - EFE",     region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T304", nombre_tienda: "Chimbote - LC",      region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T305", nombre_tienda: "Chimbote II - EFE",  region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T306", nombre_tienda: "Trujillo I - EFE",   region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T307", nombre_tienda: "Trujillo - LC",      region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T308", nombre_tienda: "Trujillo II - EFE",  region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T309", nombre_tienda: "Trujillo II - LC",   region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T310", nombre_tienda: "Huaraz - EFE",       region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T311", nombre_tienda: "Huaraz - LC",        region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T312", nombre_tienda: "Huacho - EFE",       region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T313", nombre_tienda: "Huacho - LC",        region_id: "R3", empresa: "Conecta" },
  { tienda_id: "T314", nombre_tienda: "Viru - LC",          region_id: "R3", empresa: "Conecta" },
  // Región 1
  { tienda_id: "T101", nombre_tienda: "Lima Norte - EFE",   region_id: "R1", empresa: "Conecta" },
  { tienda_id: "T102", nombre_tienda: "Lima Norte - LC",    region_id: "R1", empresa: "Conecta" },
  { tienda_id: "T103", nombre_tienda: "Comas - EFE",        region_id: "R1", empresa: "Conecta" },
  { tienda_id: "T104", nombre_tienda: "Independencia - LC", region_id: "R1", empresa: "Conecta" },
  // Región 8
  { tienda_id: "T801", nombre_tienda: "Arequipa - EFE",     region_id: "R8", empresa: "Conecta" },
  { tienda_id: "T802", nombre_tienda: "Arequipa - LC",      region_id: "R8", empresa: "Conecta" },
  { tienda_id: "T803", nombre_tienda: "Mollendo - EFE",     region_id: "R8", empresa: "Conecta" },
];

// ─────────────────────────────────────────────────────────
// CATEGORÍAS DE VENTA
// ─────────────────────────────────────────────────────────
const categorias = [
  "LINEA BLANCA",
  "COMPUTO",
  "VIDEO",
  "TELEFONIA",
  "MOTOS",
  "PADS",
  "HOGAR",
  "SERVICIOS",
  "AUDIO",
  "ACCESORIOS TECNOLOGICOS",
  "GARANTIA Y SEGUROS",
  "DIGITAL",
];

// ─────────────────────────────────────────────────────────
// GENERADORES DE DATOS DE VENTA
// Deterministas: misma tienda + misma fecha = mismo valor.
// Reemplazar con consulta real a Clicksense/S3 en producción.
// ─────────────────────────────────────────────────────────

function generarVentaTienda(tienda_id, region_id, fecha) {
  const seed = tienda_id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const base = 20 + (seed % 80);
  const factorMeta = 0.7 + (seed % 60) / 100;

  const ventas_categoria = categorias.map((cat, i) => {
    const s = seed + i * 7;
    const venta = parseFloat(((base / categorias.length) * (0.4 + (s % 100) / 80)).toFixed(1));
    const meta  = parseFloat((venta / factorMeta).toFixed(1));
    return {
      categoria: cat,
      venta_dia_miles_soles: venta,
      meta_dia_miles_soles: meta,
      avance_dia_pct: parseFloat(((venta / meta) * 100).toFixed(1)),
      venta_mes_miles_soles: parseFloat((venta * 17.3).toFixed(1)),
      meta_mes_miles_soles: parseFloat((meta * 17.3).toFixed(1)),
      avance_mes_pct: parseFloat(((venta / meta) * 100 * (0.85 + (s % 30) / 100)).toFixed(1)),
      var_vs_anio_anterior_pct: parseFloat((((s % 60) - 20) / 10).toFixed(1)),
    };
  });

  const venta_dia = parseFloat(ventas_categoria.reduce((s, c) => s + c.venta_dia_miles_soles, 0).toFixed(1));
  const meta_dia  = parseFloat(ventas_categoria.reduce((s, c) => s + c.meta_dia_miles_soles, 0).toFixed(1));
  const venta_mes = parseFloat(ventas_categoria.reduce((s, c) => s + c.venta_mes_miles_soles, 0).toFixed(1));
  const meta_mes  = parseFloat(ventas_categoria.reduce((s, c) => s + c.meta_mes_miles_soles, 0).toFixed(1));

  return {
    tienda_id,
    nombre_tienda: tiendas.find(t => t.tienda_id === tienda_id)?.nombre_tienda || tienda_id,
    region_id,
    fecha,
    venta_dia_miles_soles: venta_dia,
    meta_dia_miles_soles: meta_dia,
    avance_dia_pct: parseFloat(((venta_dia / meta_dia) * 100).toFixed(1)),
    venta_mes_miles_soles: venta_mes,
    meta_mes_miles_soles: meta_mes,
    avance_mes_pct: parseFloat(((venta_mes / meta_mes) * 100).toFixed(1)),
    var_dia_vs_anio_anterior_pct: parseFloat((((seed % 60) - 30) / 10).toFixed(1)),
    categorias: ventas_categoria,
  };
}

function generarVentaRegion(region_id, fecha) {
  const tiendasRegion = tiendas.filter(t => t.region_id === region_id);
  const ventasTiendas = tiendasRegion.map(t => generarVentaTienda(t.tienda_id, t.region_id, fecha));

  const venta_dia = parseFloat(ventasTiendas.reduce((s, t) => s + t.venta_dia_miles_soles, 0).toFixed(1));
  const meta_dia  = parseFloat(ventasTiendas.reduce((s, t) => s + t.meta_dia_miles_soles, 0).toFixed(1));
  const venta_mes = parseFloat(ventasTiendas.reduce((s, t) => s + t.venta_mes_miles_soles, 0).toFixed(1));
  const meta_mes  = parseFloat(ventasTiendas.reduce((s, t) => s + t.meta_mes_miles_soles, 0).toFixed(1));

  const ventas_categoria = categorias.map(cat => {
    const venta = parseFloat(ventasTiendas.reduce((s, t) => {
      const c = t.categorias.find(c => c.categoria === cat);
      return s + (c ? c.venta_dia_miles_soles : 0);
    }, 0).toFixed(1));
    const meta = parseFloat(ventasTiendas.reduce((s, t) => {
      const c = t.categorias.find(c => c.categoria === cat);
      return s + (c ? c.meta_dia_miles_soles : 0);
    }, 0).toFixed(1));
    const venta_mes_cat = parseFloat(ventasTiendas.reduce((s, t) => {
      const c = t.categorias.find(c => c.categoria === cat);
      return s + (c ? c.venta_mes_miles_soles : 0);
    }, 0).toFixed(1));
    return {
      categoria: cat,
      venta_dia_miles_soles: venta,
      meta_dia_miles_soles: meta,
      avance_dia_pct: parseFloat(((venta / (meta || 1)) * 100).toFixed(1)),
      venta_mes_miles_soles: venta_mes_cat,
    };
  });

  return {
    region_id,
    nombre_region: regiones.find(r => r.region_id === region_id)?.nombre_region || region_id,
    fecha,
    venta_dia_miles_soles: venta_dia,
    meta_dia_miles_soles: meta_dia,
    avance_dia_pct: parseFloat(((venta_dia / meta_dia) * 100).toFixed(1)),
    venta_mes_miles_soles: venta_mes,
    meta_mes_miles_soles: meta_mes,
    avance_mes_pct: parseFloat(((venta_mes / meta_mes) * 100).toFixed(1)),
    var_dia_vs_anio_anterior_pct: parseFloat((((region_id.charCodeAt(1) || 50) % 60 - 30) / 10).toFixed(1)),
    categorias: ventas_categoria,
    tiendas: ventasTiendas.map(t => ({
      tienda_id: t.tienda_id,
      nombre_tienda: t.nombre_tienda,
      venta_dia_miles_soles: t.venta_dia_miles_soles,
      meta_dia_miles_soles: t.meta_dia_miles_soles,
      avance_dia_pct: t.avance_dia_pct,
      avance_mes_pct: t.avance_mes_pct,
    })),
  };
}

function generarResumenCompania(fecha) {
  const regionesConecta = regiones.filter(r => r.empresa === "Conecta");
  const ventasRegiones = regionesConecta.map(r => generarVentaRegion(r.region_id, fecha));

  const venta_dia = parseFloat(ventasRegiones.reduce((s, r) => s + r.venta_dia_miles_soles, 0).toFixed(1));
  const meta_dia  = parseFloat(ventasRegiones.reduce((s, r) => s + r.meta_dia_miles_soles, 0).toFixed(1));
  const venta_mes = parseFloat(ventasRegiones.reduce((s, r) => s + r.venta_mes_miles_soles, 0).toFixed(1));
  const meta_mes  = parseFloat(ventasRegiones.reduce((s, r) => s + r.meta_mes_miles_soles, 0).toFixed(1));

  return {
    empresa: "Conecta",
    fecha,
    venta_dia_miles_soles: venta_dia,
    meta_dia_miles_soles: meta_dia,
    avance_dia_pct: parseFloat(((venta_dia / meta_dia) * 100).toFixed(1)),
    venta_mes_miles_soles: venta_mes,
    meta_mes_miles_soles: meta_mes,
    avance_mes_pct: parseFloat(((venta_mes / meta_mes) * 100).toFixed(1)),
    var_dia_vs_anio_anterior_pct: -2.4,
    var_dia_vs_anio_previo_pct: 12.7,
    regiones: ventasRegiones.map(r => ({
      region_id: r.region_id,
      nombre_region: r.nombre_region,
      venta_dia_miles_soles: r.venta_dia_miles_soles,
      meta_dia_miles_soles: r.meta_dia_miles_soles,
      avance_dia_pct: r.avance_dia_pct,
      avance_mes_pct: r.avance_mes_pct,
    })),
  };
}

// ─────────────────────────────────────────────────────────
// HELPER — Top N con menor avance de meta
// ─────────────────────────────────────────────────────────
function peoresPorAvance(lista, campoAvance = "avance_dia_pct", n = 3) {
  return [...lista]
    .filter(item => (item[campoAvance] || 0) > 0)
    .sort((a, b) => a[campoAvance] - b[campoAvance])
    .slice(0, n)
    .map(item => ({
      ...item,
      semaforo: item[campoAvance] < 50 ? "🔴" : item[campoAvance] < 80 ? "🟡" : "🟢",
    }));
}

module.exports = {
  regiones,
  tiendas,
  categorias,
  generarVentaTienda,
  generarVentaRegion,
  generarResumenCompania,
  peoresPorAvance,
};
