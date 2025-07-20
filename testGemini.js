const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const geminiClient = new GoogleGenerativeAI("AIzaSyClwydLyF1n6vxBv3dvqfLYQ_IaI90Nw5Y");

async function test() {
  const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-pro" });

  const prompt = "Corrige el siguiente texto médico: pac con HTA q no toma meds";
  const result = await model.generateContent(prompt);
  const response = await result.response;
  console.log("Respuesta Gemini:", response.text());
}

test().catch(console.error);