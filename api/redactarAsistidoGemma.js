require("dotenv").config();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const { texto_usuario } = req.body; // Solo esperamos 'texto_usuario'

  if (!texto_usuario || texto_usuario.trim() === "") {
    return res.status(400).json({ error: "Texto del usuario vacío." });
  }

  // --- MODELO ESPECÍFICO Y AJUSTES DE PROMPT ---
  const MODEL_ID = "google/medgemma-4b-it:featherless-ai"; // Asegúrate de que este sea el ID correcto
  const API_URL = "https://router.huggingface.co/v1/chat/completions";

  // Construcción del array de mensajes para el API de chat
  const messages = [
    {
      role: "system",
      content: "You are a medical assistant specialized in structuring clinical notes and identifying missing information. Always respond in a professional and concise manner, using clear medical terminology.",
    },
    {
      role: "user",
      content: `TASK: Structure the following clinical note into a clear, organized medical history using professional language. Organize the information into sections like "Symptoms", "History", "Medications". Do not invent information. At the end, include a section titled "IMPORTANT:" listing any key missing information.

    ORIGINAL TEXT:
    "${texto_usuario}"
        
    STRUCTURED CLINICAL NOTE:`,
        },
      ];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages: messages, // Usamos 'messages'
        max_tokens: 1500,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Error from Hugging Face API:", errorBody);
      return res.status(response.status).json({ error: `Hugging Face API error for model ${MODEL_ID}: ${errorBody}` });
    }

    const apiResult = await response.json();
    const respuestaTexto = apiResult?.choices?.[0]?.message?.content ?? "";

    const partes = respuestaTexto.split("IMPORTANT:");
    const textoMejorado = partes[0]?.trim() ?? "";
    const textoImportante = partes[1]?.trim() ?? "";

    res.status(200).json({
      texto_mejorado: textoMejorado,
      texto_importante: textoImportante,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud con MedGemma." });
  }
};