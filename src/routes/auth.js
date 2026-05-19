const express = require("express");
const router  = express.Router();
const { authApiKey, generarToken } = require("../middleware/auth");

/**
 * POST /auth/token
 *
 * Brain Studio intercambia su API Key por un Bearer Token.
 * El token dura 1 hora (configurable con TOKEN_EXPIRES_IN).
 *
 * Request:
 *   Header: X-API-Key: <api_key>
 *
 * Response:
 *   { success, data: { token, token_type, expires_in } }
 */
router.post("/token", authApiKey, (req, res) => {
  const expiresIn = process.env.TOKEN_EXPIRES_IN || "1h";

  const token = generarToken(
    {
      cliente: "jelou-brain-studio",
      proyecto: "grupo-efe-connect",
      ambiente: process.env.NODE_ENV || "development",
    },
    expiresIn
  );

  res.json({
    success: true,
    data: {
      token,
      token_type: "Bearer",
      expires_in: expiresIn,
      uso: "Agrega este token en cada request: Authorization: Bearer <token>",
    },
  });
});

module.exports = router;
