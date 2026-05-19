const express = require("express");
const router = express.Router();
const { regiones, tiendas } = require("../db");
const { authBearer } = require("../middleware/auth");

router.use(authBearer);

/** GET /catalogo/regiones?empresa=Conecta */
router.get("/regiones", (req, res) => {
  const { empresa } = req.query;
  const resultado = empresa
    ? regiones.filter(r => r.empresa === empresa)
    : regiones;
  res.json({ success: true, total: resultado.length, data: resultado });
});

/** GET /catalogo/tiendas?region_id=R3&empresa=Conecta */
router.get("/tiendas", (req, res) => {
  const { region_id, empresa } = req.query;
  let resultado = tiendas;
  if (region_id) resultado = resultado.filter(t => t.region_id === region_id);
  if (empresa)   resultado = resultado.filter(t => t.empresa === empresa);
  res.json({ success: true, total: resultado.length, data: resultado });
});

/** GET /catalogo/tiendas/:tienda_id */
router.get("/tiendas/:tienda_id", (req, res) => {
  const tienda = tiendas.find(t => t.tienda_id === req.params.tienda_id);
  if (!tienda) return res.status(404).json({ success: false, error: "Tienda no encontrada" });
  res.json({ success: true, data: tienda });
});

module.exports = router;
