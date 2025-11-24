import express from "express";
import cors from "cors";
import multer from "multer";
import pdfParse from "pdf-parse";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "http://localhost:5173";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Middleware
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

// Multer config (PDF stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// PDF cache (v1)
let currentPdfText = "";
let currentPdfName = "";

/* ============================================================
   HEALTHCHECK
============================================================ */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    pdfLoaded: !!currentPdfText,
    pdfName: currentPdfName || null,
  });
});

/* ============================================================
   1️⃣ UPLOAD PDF
============================================================ */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ error: "A PDF file must be provided." });
    }

    const { originalname, buffer } = req.file;

    // Extract text from PDF
    const data = await pdfParse(buffer);
    const text = data.text || "";

    if (!text.trim()) {
      return res.status(400).json({
        error:
          "No readable text was found in this PDF. It may be scanned or empty.",
      });
    }

    currentPdfText = text;
    currentPdfName = originalname;

    res.json({
      success: true,
      fileName: originalname,
      pages: data.numpages,
      textLength: text.length,
      message: "PDF uploaded and processed successfully.",
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).json({
      error: "Server error while processing the PDF.",
    });
  }
});

/* ============================================================
   2️⃣ ASK THE AI
============================================================ */
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: "The question cannot be empty." });
    }

    if (!currentPdfText) {
      return res.status(400).json({
        error: "No PDF uploaded yet. Please upload a PDF first.",
      });
    }

    // Limit the text chunk sent to the AI
    const MAX_CHARS = 12000;
    const pdfSnippet =
      currentPdfText.length > MAX_CHARS
        ? currentPdfText.slice(0, MAX_CHARS)
        : currentPdfText;

    // FINAL CLEAN PROMPT (PURE ENGLISH + PERFECT LANGUAGE RULE)
    const userPrompt = `
You are an AI assistant that answers questions about a PDF document.

Here is the PDF content (may be truncated):
"""
${pdfSnippet}
"""

The user's question is:
"${question}"

CRITICAL RULES:
- ALWAYS answer in the SAME LANGUAGE the user used in their question.
- DO NOT infer language from the PDF. Only detect language from the user question.
- If the PDF does not contain the answer, clearly say so.
- Be clear, accurate, and concise.
    `.trim();

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant specialized in analyzing PDF documents and answering questions in the user's language.",
        },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim() ||
      "No answer generated.";

    res.json({ success: true, answer });
  } catch (error) {
    console.error("Error in /api/ask:", error);
    res
      .status(500)
      .json({ error: "Error generating the response using Groq." });
  }
});

/* ============================================================
   START SERVER
============================================================ */
app.listen(PORT, () => {
  console.log(`🚀 AI PDF Reader backend running at http://localhost:${PORT}`);
});
