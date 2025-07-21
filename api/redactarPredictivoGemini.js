const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
  // Cabeceras CORS para permitir solicitudes desde otros orígenes (localhost incluido)
  res.setHeader("Access-Control-Allow-Origin", "*"); // En producción, reemplaza * por el dominio exacto
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Responder a la solicitud OPTIONS (preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Solo aceptar POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { texto_usuario } = req.body;

  if (!texto_usuario || texto_usuario.trim() === "") {
    return res.status(400).json({ error: "Texto del usuario vacío." });
  }

  // PROMPT MÉDICO PARA REDACCIÓN PROFESIONAL DE HISTORIA CLÍNICA
  const prompt = `
Eres un asistente médico experto en redacción de historias clínicas según estándares legales en Colombia.

A partir del siguiente texto informal o abreviado, redacta una versión clara, profesional y completa de la historia clínica, con lenguaje técnico médico y buena redacción.

Busca incluir en tu respuesta la siguiente información, sin inventar nada:
  - Antecedentes
  - Medicamentos que toma el paciente
  - Síntomas del paciente
  - Cuánto tiempo ha transcurrido
  - Tomó medicamentos adicionales
  - Atenuantes y exacerbantes
  - Pertinentes negativos (MUY IMPORTANTE pues es un seguro legal para los médicos)

En un párrafo aparte señálale al médico qué le puede hacer falta. Es decir, primero completa la historia clínica y luego, en un párrafo adicional (en forma de bullets) cuyo título en mayúsculas sea "IMPORTANTE:", haz las recomendaciones al médico sobre información que pueda hacer falta.

No uses ningún tipo de formato Markdown ni caracteres especiales como * o **. Escribe todo en texto plano sin negritas, listas, guiones ni símbolos.

Texto original del médico:
"${texto_usuario}"

Redacta el texto corregido a continuación, sin el encabezado (Enfermedad actual:):
`;

  try {
    const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const texto_mejorado = response.text();

    // Separar sección IMPORTANTE
    const partes = texto_mejorado.split("IMPORTANTE:");
    const textoMejorado = partes[0]?.trim() ?? "";
    const textoImportante = partes[1]?.trim() ?? "";

    res.status(200).json({
      texto_mejorado: textoMejorado,
      texto_importante: textoImportante
    });
  } catch (error) {
    console.error("Error con Gemini:", {
      message: error.message,
      stack: error.stack,
      response: error.response?.data || error.response || null,
    });
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud con Gemini." });
  }
};