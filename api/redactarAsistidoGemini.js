const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { texto_usuario } = req.body;

  if (!texto_usuario || texto_usuario.trim() === "") {
    return res.status(400).json({ error: "Texto del usuario vacío." });
  }

  const prompt = `
A partir del siguiente texto escrito por un médico, redacta una historia clínica clara y ordenada, con lenguaje técnico y profesional. Puedes reorganizar la información en secciones como síntomas, antecedentes, medicamentos, etc., siempre respetando el contenido original.

No debes inventar información ni agregar síntomas o antecedentes que no estén escritos. Puedes inferir relaciones simples si están implícitas (por ejemplo, duración si se menciona tiempo), pero no añadas datos clínicos nuevos.
En la primer parte no uses markdown.

Incluye al final un apartado titulado "IMPORTANTE:" donde señales (en forma de bullets) si falta información clave para completar la historia clínica. Puedes usar markdown si deseas.
Donde sea necesario incluye las fuentes médicas o científicas de donde obtuviste la información para brindarle más confianza al médico.


Texto original del médico:
"${texto_usuario}"

Redacta el texto corregido a continuación, sin encabezado:
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