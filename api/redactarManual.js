const OpenAI = require("openai");
require("dotenv").config();

const openAIClient = new OpenAI({
  apiKey: process.env.CHATGPT_API_KEY,
});

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
    Eres un corrector de estilo médico. A partir del siguiente texto escrito de forma informal o abreviada por un médico, mejora únicamente la redacción: ortografía, gramática, y reemplazo de abreviaturas por términos técnicos. No debes interpretar ni asumir nada. No cambies el orden, contenido o significado del texto.

    Texto original del médico:
    "${texto_usuario}"
  
    Redacta el texto corregido a continuación, sin encabezado ni comentarios adicionales:
    `;

  try {
    const response = await openAIClient.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content:
            "Actúas como un corrector de estilo médico. Solo corriges errores gramaticales, ortográficos o de formato. No agregas, infieres, reorganizas ni completas nada. Mantienes las ideas tal como están escritas.",
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