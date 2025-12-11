// backend/src/server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import pdf from "pdf-parse";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// =========================
// 🔹 VARIABLES GLOBALES
// =========================
let pdfText = "";
let lastAnswer = "";

// =========================
// 🔹 MULTER CONFIG
// =========================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =========================
// 🔹 SUBIR PDF /api/upload
// =========================
app.post("/api/upload", upload.single("pdf"), async (req, res) => {
  console.log("📄 Subiendo PDF...");

  try {
    if (!req.file) {
      console.log("❌ No file provided");
      return res.json({ ok: false, error: "NO_FILE" });
    }

    const data = await pdf(req.file.buffer);

    pdfText = data.text || "";
    console.log("📚 Longitud PDF:", pdfText.length);

    const preview = pdfText.slice(0, 1500);

    return res.json({
      ok: true,
      pdf: {
        filename: req.file.originalname,
        pages: data.numpages,
        characters: pdfText.length,
      },
      preview,
    });
  } catch (err) {
    console.error("🔥 ERROR en /api/upload:", err);
    return res.json({
      ok: false,
      error: "UPLOAD_FAIL",
      message: err.message,
    });
  }
});

// =========================
// 🔹 ASK AI /api/ask
// =========================
app.post("/api/ask", async (req, res) => {
  console.log("📩 /api/ask recibió una petición");

  try {
    const { question, mode } = req.body;
    console.log("➡️ Pregunta:", question);
    console.log("➡️ Modo:", mode);

    if (!pdfText) {
      console.log("❌ No PDF cargado");
      return res.json({
        ok: false,
        error: "NO_PDF",
        message: "Upload a PDF first.",
      });
    }

    console.log("📚 Longitud PDF:", pdfText.length);

    // Prompt inteligente con soporte EN+ES
    const systemPrompt = `
You are an expert multilingual PDF assistant.
Your rules:
- Detect automatically if the user is writing in English or Spanish.
- Respond ALWAYS in the same language the user uses.
- If the question is unclear, ask for clarification.
- Base your response ONLY on this PDF content:

${pdfText.slice(0, 4000)}
`;

    console.log("🧠 Enviando solicitud a Groq...");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        temperature: 0.3,
      }),
    });

    console.log("📥 Status Groq:", groqRes.status);

    const groqData = await groqRes.json();
    console.log("📦 Respuesta completa Groq:", groqData);

    if (!groqData.choices || !groqData.choices[0]?.message?.content) {
      console.log("❌ Groq devolvió una respuesta inválida");
      return res.json({
        ok: false,
        error: "INVALID_RESPONSE",
        details: groqData,
      });
    }

    const answer = groqData.choices[0].message.content;
    lastAnswer = answer;

    console.log("✅ Respuesta generada correctamente");

    return res.json({ ok: true, answer });
  } catch (err) {
    console.error("🔥 ERROR en /api/ask:", err);
    return res.json({
      ok: false,
      error: "SERVER_FAIL",
      message: err.message,
      stack: err.stack,
    });
  }
});

// =========================
// 🔹 Descargar última respuesta
// =========================
app.get("/api/last-answer", (req, res) => {
  if (!lastAnswer) {
    return res.json({ ok: false, message: "No answer yet." });
  }

  return res.json({ ok: true, answer: lastAnswer });
});

// =========================
// 🔹 Arrancar servidor
// =========================
app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader backend running on http://localhost:${PORT}`);
});
