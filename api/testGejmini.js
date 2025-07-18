const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function test() {
  const model = geminiClient.getGenerativeModel({ model: "gemini-pro" });

  const prompt = "Corrige el siguiente texto médico: pac con HTA q no toma meds";
  const result = await model.generateContent(prompt);
  const response = await result.response;
  console.log("Respuesta Gemini:", response.text());
}

test().catch(console.error);