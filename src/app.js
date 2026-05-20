require("dotenv").config();
const express      = require("express");
const cors         = require("cors");
const helmet       = require("helmet");
const rateLimit    = require("express-rate-limit");
const fs           = require("fs");
const path         = require("path");

const authRoutes     = require("./routes/auth");
const ventasRoutes   = require("./routes/ventas");
const catalogoRoutes = require("./routes/catalogo");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Seguridad ──────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Swagger UI necesita inline scripts desde CDN
}));
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

// ── Swagger UI desde CDN ───────────────────────────────────────────────────
// Servimos el HTML inline con el spec embebido directamente en el JS.
// Esto evita el problema de Vercel con swagger-ui-express que no sirve
// correctamente los assets estáticos en entornos serverless.
app.get("/docs", (req, res) => {
  // Leer y embeber el YAML como JSON directamente en el HTML
  const swaggerYaml = require("yamljs");
  const swaggerSpec = swaggerYaml.load(path.join(__dirname, "swagger.yaml"));
  const specJson    = JSON.stringify(swaggerSpec);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Grupo EFE API — Jelou</title>
  <link rel="stylesheet"
    href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { background-color: #1B4F8A !important; }
    .topbar-wrapper .link { display: none; }
    .topbar-wrapper::after {
      content: 'Grupo EFE × Jelou — API de Reportes de Ventas';
      color: white;
      font-size: 17px;
      font-weight: bold;
      padding: 0 20px;
      line-height: 50px;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      const spec = ${specJson};
      SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>`);
});

// ── Servir el spec como JSON (útil para herramientas externas como Postman) ─
app.get("/docs/spec.json", (req, res) => {
  const swaggerYaml = require("yamljs");
  const spec = swaggerYaml.load(path.join(__dirname, "swagger.yaml"));
  res.json(spec);
});

// ── Health check ───────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    api: "Grupo EFE — Agente IA Reportes de Ventas",
    version: "2.1.0",
    estado: "operativo",
    timestamp: new Date().toISOString(),
    documentacion: "/docs",
    spec_json: "/docs/spec.json",
    flujo_auth: [
      "1. POST /auth/token  con X-API-Key  → obtienes Bearer Token",
      "2. Usar Bearer Token en Authorization header para el resto de endpoints",
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
  console.log(`📄 Spec JSON           —  http://localhost:${PORT}/docs/spec.json`);
  console.log(`🔑 API Key             —  ${process.env.API_KEY || "efe-sandbox-key-2026"}\n`);
});

module.exports = app;