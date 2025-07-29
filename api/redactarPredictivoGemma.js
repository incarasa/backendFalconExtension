const aws4 = require("aws4");
const https = require("https");
require("dotenv").config();

const endpointHost = "runtime.sagemaker.us-east-2.amazonaws.com";
const endpointPath = "/endpoints/medgemma-27b-endpoint/invocations";

console.log("🟢 El endpoint redactarPredictivoGemma.js ha sido cargado.");

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
Eres un asistente médico experto en redacción de historias clínicas según estándares legales en Colombia.

A partir del siguiente texto informal o abreviado, redacta una versión clara, profesional y completa de la historia clínica, con lenguaje técnico médico y excelente redacción.

Organiza la historia clínica incluyendo las secciones que el médico ha solicitado:
${requisitos}

Además, complementa la historia con las siguientes secciones inferidas clínicamente, siempre que sea posible:
- EXAMEN FÍSICO: Describe las exploraciones que el médico debería realizar.
- IMPRESIÓN DIAGNÓSTICA: Sugiere un posible diagnóstico clínico con base en la información dada.
- POSIBLE TRATAMIENTO: Recomienda un tratamiento inicial razonable o medidas a tomar, aclarando que son sugerencias clínicas y no prescripciones.

IMPORTANTE: Al final, incluye una sección titulada "IMPORTANTE:" en mayúsculas, con bullets que indiquen la información faltante que el médico debe complementar.

Donde sea necesario, incluye fuentes médicas reconocidas o evidencia científica que respalde tus sugerencias.

Texto original del médico:
"${texto_usuario}"

Redacta el texto corregido a continuación, sin encabezado:
`;

  const body = JSON.stringify({
    inputs: prompt,
    parameters: {
      max_new_tokens: 768,
      temperature: 0.7,
      do_sample: true,
      return_full_text: false
    }
  });

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
        let respuestaTexto = "";
        try {
          const json = JSON.parse(data);
          if (Array.isArray(json) && json[0]?.generated_text) {
            respuestaTexto = json[0].generated_text;
          } else if (json.generated_text) {
            respuestaTexto = json.generated_text;
          } else {
            respuestaTexto = data;
          }
        } catch (err) {
          console.error("Error al parsear respuesta de MedGemma:", err);
          respuestaTexto = data;
        }

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