const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// 🔁 Cargar todos tus endpoints manualmente
app.post("/api/redactarAsistido", require("./api/redactarAsistido"));
app.post("/api/redactarAsistidoGemini", require("./api/redactarAsistidoGemini"));
app.post("/api/redactarAsistidoGemma", require("./api/redactarAsistidoGemma"));
app.post("/api/redactarManual", require("./api/redactarManual"));
app.post("/api/redactarManualGemini", require("./api/redactarManualGemini"));
app.post("/api/redactarPredictivo", require("./api/redactarPredictivo"));
app.post("/api/redactarPredictivoGemini", require("./api/redactarPredictivoGemini"));

// Puedes probar este también:
app.get("/api/hello", require("./api/hello"));

// 🛠 Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Error interno del servidor");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de desarrollo local corriendo en http://localhost:${PORT}`);
});