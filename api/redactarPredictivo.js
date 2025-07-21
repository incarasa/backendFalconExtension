const OpenAI = require("openai");
require("dotenv").config();

const openAIClient = new OpenAI({
  apiKey: process.env.CHATGPT_API_KEY,
});

module.exports = async (req, res) => {
  // Cabeceras CORS para permitir solicitudes desde otros orígenes (localhost incluido)
  res.setHeader("Access-Control-Allow-Origin", "*"); // Para producción reemplazar * por el dominio exacto
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

    Busca incluir en tu respuesta la siguiente información, sin inventar nada.
        - Antecedentes
        - Medicamentos que toma el paciente
        - Síntomas del paciente
        - Cuanto tiempo ha transcurrido
        - Tomó medicamentos adicionales
        - Atenuantes y exhacerbantes
        - Pertinentes negativos (MUY IMPORTANTE pues es un seguro legal para los médicos)

    
    En un parrafo aparte señalale al médico que le puede hacer falta, es decir primero completa la historia clínica y luego en
    un parrafo adicional (en forma de bullets) cuyo titulo en mayusculas es "IMPORTANTE:" haz las recomendaciones al médico sobre información que pueda hacer falta.

    Texto original del médico:
    "${texto_usuario}"

    Redacta el texto corregido a continuación, sin el encabezado (Enfermedad actual:):
  `;

  try {
    const response = await openAIClient.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "Eres un médico profesional que ayuda a mejorar historias clínicas para que estén redactadas correctamente según la ley colombiana. Eres experto en semiología médica. La respuesta debe completar la casilla de enfermedad actual en el sistema médico, es decir no poner información que no sea relevante",
        },
        { role: "user", content: prompt },
      ],
    });

    const respuestaTexto = response.choices[0].message.content;

    // Separar sección IMPORTANTE
    const partes = respuestaTexto.split("IMPORTANTE:");
    const textoMejorado = partes[0]?.trim() ?? "";
    const textoImportante = partes[1]?.trim() ?? "";

    res.status(200).json({
      texto_mejorado: textoMejorado,
      texto_importante: textoImportante
    });

/*     res.status(200).json({ texto_mejorado: respuestaTexto }); */
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud." });
  }
};