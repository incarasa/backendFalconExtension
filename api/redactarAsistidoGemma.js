require("dotenv").config();

// No necesitamos la librería de OpenAI
// const OpenAI = require("openai");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Añade Authorization

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

  // El prompt puede ser más directo para Med-Gemma.
   // Es posible que necesites experimentar para encontrar el mejor prompt.
  const prompt = `
    TASK: Structure the following unstructured clinical note into a clear, organized medical history using professional and technical language. Organize the information into sections like "Symptoms", "History", "Medications", etc. Do not invent information. At the end, include a section titled "IMPORTANT:" listing any key information that is missing.

    ORIGINAL TEXT:
    "${texto_usuario}"

    STRUCTURED CLINICAL NOTE:
    `;

  try {
    // 1. Definimos el endpoint del modelo Med-Gemma en Hugging Face
    const API_URL = "https://api-inference.huggingface.co/models/google/medgemma-7b";
    
    // 2. Preparamos la llamada a la API con fetch
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            // Usamos el token de Hugging Face
            "Authorization": `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            inputs: prompt,
            parameters: { // Opciones para controlar la generación
                max_new_tokens: 1024,
                temperature: 0.7,
                return_full_text: false, // Para no recibir el prompt en la respuesta
            }
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Error from Hugging Face API:", errorBody);
        throw new Error(`Hugging Face API responded with status ${response.status}`);
    }

    // 3. Procesamos la respuesta de Hugging Face
    const apiResult = await response.json();
    
    // La respuesta de HF suele venir en un formato como [{"generated_text": "..."}]
    const respuestaTexto = apiResult[0]?.generated_text ?? "";

    // Mantenemos la misma lógica para separar la sección IMPORTANTE
    const partes = respuestaTexto.split("IMPORTANT:"); // Usamos "IMPORTANT:" en mayúsculas como en el nuevo prompt
    const textoMejorado = partes[0]?.trim() ?? "";
    const textoImportante = partes[1]?.trim() ?? "";

    res.status(200).json({
      texto_mejorado: textoMejorado,
      texto_importante: textoImportante,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud con Med-Gemma." });
  }
};