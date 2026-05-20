require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const swaggerUi    = require("swagger-ui-express");
const YAML         = require("yamljs");
const path         = require("path");

const authRoutes     = require("./routes/auth");
const ventasRoutes   = require("./routes/ventas");
const catalogoRoutes = require("./routes/catalogo");

const swaggerDoc = YAML.load(path.join(__dirname, "swagger.yaml"));

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Seguridad ──────────────────────────────────────────────────────────────
// Desactivar contentSecurityPolicy solo para Swagger UI (necesita inline scripts)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: "*",
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

// ── Swagger UI ─────────────────────────────────────────────────────────────
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDoc, {
    customSiteTitle: "Grupo EFE API — Jelou",
    customCss: `
      .topbar { background-color: #1B4F8A; }
      .topbar-wrapper img { content: url(''); width: 0; }
      .topbar-wrapper::after {
        content: 'Grupo EFE × Jelou — API de Reportes de Ventas';
        color: white; font-size: 18px; font-weight: bold;
        padding-left: 16px;
      }
      .swagger-ui .info h2.title { color: #1B4F8A; }
    `,
    swaggerOptions: {
      persistAuthorization: true,        // recuerda el token entre recargas
      displayRequestDuration: true,      // muestra cuánto tarda cada request
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      tryItOutEnabled: true,             // habilita "Try it out" por defecto
    },
  })
);

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    api: "Grupo EFE — Agente IA Reportes de Ventas",
    version: "2.1.0",
    estado: "operativo",
    timestamp: new Date().toISOString(),
    documentacion: `http://localhost:${PORT}/docs`,
    flujo_auth: [
      "1. POST /auth/token  con X-API-Key  → obtienes Bearer Token",
      "2. Usar Bearer Token en Authorization header para todos los demás endpoints",
    ],
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
  console.log(`\n🚀 Grupo EFE API v2.1  —  http://localhost:${PORT}`);
  console.log(`📚 Swagger UI          —  http://localhost:${PORT}/docs`);
  console.log(`🔑 API Key             —  ${process.env.API_KEY || "efe-sandbox-key-2026"}\n`);
});

module.exports = app;