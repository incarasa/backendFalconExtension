console.log("🟢 El endpoint redactarPredictivoGemma.js ha sido cargado.");
module.exports = async (req, res) => {
  res.status(200).json({ ok: true });
};



const aws4 = require("aws4");
const https = require("https");
require("dotenv").config();

const endpointHost = "runtime.sagemaker.us-east-2.amazonaws.com";
const endpointPath = "/endpoints/medgemma-27b-endpoint/invocations";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST requests allowed" });

  const { texto_usuario, requisitos } = req.body;

  if (!texto_usuario || texto_usuario.trim() === "") {
    return res.status(400).json({ error: "Texto del usuario vacío." });
  }

  const prompt = `
A partir del siguiente texto escrito por un médico, redacta una historia clínica clara y ordenada, con lenguaje técnico y profesional. Puedes reorganizar la información en secciones como síntomas, antecedentes, medicamentos, etc., siempre respetando el contenido original.
Por otra parte, trata de seguir las instrucciones (si las hay) del médico a continuación:
Instrucciones del médico: "${requisitos}"

No debes inventar información ni agregar síntomas o antecedentes que no estén escritos. Puedes inferir relaciones simples si están implícitas (por ejemplo, duración si se menciona tiempo), pero no añadas datos clínicos nuevos.

IMPORTANTE: Incluye al final un apartado titulado "IMPORTANTE:" donde señales si falta información clave para completar la historia clínica.

Texto original del médico:
"${texto_usuario}"

Redacta el texto corregido a continuación, sin encabezado:
`;

  const body = JSON.stringify({ inputs: prompt });

  const requestOptions = {
    host: endpointHost,
    path: endpointPath,
    service: "sagemaker",
    region: "us-east-2",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  };

  aws4.sign(requestOptions, {
    accessKeyId: process.env.AccessKey,
    secretAccessKey: process.env.SecretKey,
  });

  try {
    const awsReq = https.request(requestOptions, (awsRes) => {
      let data = "";

      awsRes.on("data", (chunk) => {
        data += chunk;
      });

      awsRes.on("end", () => {
        const respuestaTexto = JSON.parse(data).generated_text || data;

        const partes = respuestaTexto.split("IMPORTANTE:");
        const textoMejorado = partes[0]?.trim() ?? "";
        const textoImportante = partes[1]?.trim() ?? "";

        res.status(200).json({
          texto_mejorado: textoMejorado,
          texto_importante: textoImportante,
        });
      });
    });

    awsReq.on("error", (err) => {
      console.error("Error al llamar a MedGemma:", err);
      res.status(500).json({ error: "Error al procesar la solicitud con MedGemma." });
    });

    awsReq.write(body);
    awsReq.end();
  } catch (error) {
    console.error("Error general:", error);
    res.status(500).json({ error: "Hubo un problema al procesar la solicitud." });
  }
};