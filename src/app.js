require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes    = require("./routes/auth");
const ventasRoutes  = require("./routes/ventas");
const catalogoRoutes = require("./routes/catalogo");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Seguridad ──────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: "*", // En producción: restringir a dominios Jelou
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: "Demasiadas solicitudes, intenta más tarde" },
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(express.json({ limit: "1mb" }));

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    api: "Grupo EFE — Agente IA Reportes de Ventas",
    version: "2.1.0",
    estado: "operativo",
    timestamp: new Date().toISOString(),
    flujo_auth: [
      "1. POST /auth/token  con X-API-Key  → obtienes Bearer Token",
      "2. Usar Bearer Token en Authorization header para todos los demás endpoints",
    ],
    endpoints: {
      auth:    ["POST /auth/token"],
      ventas:  [
        "GET  /ventas/resumen-campana?nivel=back_office&nombre=Carlos",
        "GET  /ventas/resumen-campana?nivel=regional&region_id=R3&nombre=Marco",
        "GET  /ventas/resumen-campana?nivel=tienda&region_id=R3&tienda_id=T306&nombre=Ana",
        "POST /ventas/campana-masiva",
        "GET  /ventas/compania",
        "GET  /ventas/region/:region_id",
        "GET  /ventas/tienda/:tienda_id",
        "GET  /ventas/ranking-tiendas?region_id=R3&orden=asc",
        "GET  /ventas/categorias?nivel=regional&region_id=R3",
      ],
      catalogo: [
        "GET  /catalogo/regiones?empresa=Conecta",
        "GET  /catalogo/tiendas?region_id=R3",
        "GET  /catalogo/tiendas/:tienda_id",
      ],
    },
  });
});

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use("/auth",     authRoutes);
app.use("/ventas",   ventasRoutes);
app.use("/catalogo", catalogoRoutes);

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(500).json({
    success: false,
    error: "Error interno del servidor",
    detalle: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Grupo EFE API v2.1 — http://localhost:${PORT}`);
  console.log(`🔑 Paso 1: POST /auth/token  con X-API-Key: ${process.env.API_KEY || "efe-sandbox-key-2026"}`);
  console.log(`🎫 Paso 2: Usar el Bearer Token en Authorization header\n`);
});

module.exports = app;
