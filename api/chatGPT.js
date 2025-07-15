const OpenAI = require("openai");
require("dotenv").config();

const openAIClient = new OpenAI({
  apiKey: process.env.CHATGPT_API_KEY,
});

module.exports = async (req, res) => {
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
        En caso de no estar la información indica claramente que debe añadir el médico para completar el correctamente el campo.
            - Antecedentes
            - Medicamentos que toma el paciente
            - Síntomas del paciente
            - Cuanto tiempo ha transcurrido
            - Tomó medicamentos adicionales
            - Atenuantes y exhacerbantes
            - Pertinentes negativos (MUY IMPORTANTE pues es un seguro legal para los médicos)

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
            "Eres un médico profesional que ayuda a mejorar historias clínicas para que estén redactadas correctamente según la ley colombiana. Eres experto en semiología medica. La respuesta debe completar la casilla de enfermedad actual en el sistema medico, es decir no poner información que no sea relevante",
        },
        { role: "user", content: prompt },
      ],
    });

    const respuestaTexto = response.choices[0].message.content;
    res.status(200).json({ texto_mejorado: respuestaTexto });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud." });
  }
};