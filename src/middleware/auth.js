/**
 * Middleware de autenticación
 *
 * Flujo:
 *   1. Brain Studio llama POST /auth/token con X-API-Key
 *   2. Recibe un Bearer Token (JWT de corta duración)
 *   3. Usa ese token en todas las llamadas siguientes
 *
 * Esto evita exponer la API Key en cada request y permite
 * invalidar tokens sin cambiar la clave principal.
 */

const jwt = require("jsonwebtoken");

const API_KEY    = process.env.API_KEY    || "efe-sandbox-key-2026";
const JWT_SECRET = process.env.JWT_SECRET || "cambia-esto-en-produccion-min-32-chars";

/**
 * Valida API Key estática.
 * Solo usado en POST /auth/token.
 */
function authApiKey(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!key || key !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: "API Key inválida. Header requerido: X-API-Key",
    });
  }
  next();
}

/**
 * Valida Bearer Token JWT.
 * Usado en todos los endpoints de ventas y catálogo.
 */
function authBearer(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Token requerido. Header: Authorization: Bearer <token>",
    });
  }
  try {
    const token = header.split(" ")[1];
    req.tokenPayload = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Token expirado. Llama a POST /auth/token para obtener uno nuevo."
      : "Token inválido.";
    return res.status(401).json({ success: false, error: msg });
  }
}

/**
 * Genera un JWT firmado para Brain Studio.
 */
function generarToken(payload, expiresIn = "1h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authApiKey, authBearer, generarToken };
