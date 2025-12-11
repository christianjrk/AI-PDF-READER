// frontend/src/App.jsx
import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "/api";

// Detectar idioma + instrucciones especiales
function detectLanguage(question) {
  const q = question.toLowerCase();

  if (q.includes("en español") || q.includes("al español") || q.includes("tradúcelo al español")) {
    return "spanish";
  }
  if (q.includes("in english") || q.includes("to english") || q.includes("respond in english")) {
    return "english";
  }

  const spanishRegex = /[áéíóúñ¿¡]/;
  const englishKeywords = /\b(the|and|what|why|how|explain|summarize|summary)\b/;

  if (spanishRegex.test(q)) return "spanish";
  if (englishKeywords.test(q)) return "english";

  return "auto";
}

function App() {
  const [theme, setTheme] = useState("dark");

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [pdfPreview, setPdfPreview] = useState("");

  const [status, setStatus] = useState("Idle");
  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");

  const chatEndRef = useRef(null);

  // Scroll suave al final del chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ==============================
  // THEME
  // ==============================
  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  // ==============================
  // MANEJO DEL PDF
  // ==============================
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetPdfState();
    setPdfFile(file);
    setStatus("PDF selected. Click “Analyze PDF”.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      alert("Please upload a PDF file.");
      return;
    }

    resetPdfState();
    setPdfFile(file);
    setStatus("PDF selected. Click “Analyze PDF”.");
  };

  const handleDragOver = (e) => e.preventDefault();

  const resetPdfState = () => {
    setPdfMeta(null);
    setPdfPreview("");
    setMessages([]);
  };

  const uploadPdf = async () => {
    if (!pdfFile) {
      alert("Select a PDF first.");
      return;
    }

    try {
      setIsUploading(true);
      setStatus("Uploading & analyzing PDF...");

      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        console.error("Upload error:", data);
        alert("Error processing PDF.");
        setStatus("Error processing PDF.");
        return;
      }

      setPdfMeta(data.pdf);
      setPdfPreview(data.preview || "");
      setMessages([
        {
          role: "system",
          content: `✅ PDF "${data.pdf.filename}" loaded. Pages: ${data.pdf.pages}. Characters: ${data.pdf.characters}.`,
        },
      ]);
      setStatus("PDF analyzed. Ready to ask questions.");
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
      setStatus("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // ==============================
  // ENVIAR PREGUNTA A LA IA
  // ==============================
  const sendQuestion = async (mode = "chat", overrideQuestion) => {
    if (!pdfMeta) {
      alert("Upload and analyze a PDF first.");
      return;
    }

    let rawQuestion = overrideQuestion ?? question.trim();
    if (!rawQuestion) {
      if (mode === "chat") return;
      // quick action sin texto explícito
      if (mode === "summary") rawQuestion = "Give me a clear structured summary of this PDF.";
      else if (mode === "key_insights") rawQuestion = "Give me the key insights of this PDF.";
      else if (mode === "explain_like_10") rawQuestion = "Explain the main ideas of this PDF like I am 10 years old.";
      else if (mode === "action_items") rawQuestion = "Extract actionable items and next steps from this PDF.";
    }

    const lang = detectLanguage(rawQuestion);
    let finalQuestion = rawQuestion;

    if (lang === "english") {
      finalQuestion = `${rawQuestion}\n\nIMPORTANT: Answer strictly in English.`;
    } else if (lang === "spanish") {
      finalQuestion = `${rawQuestion}\n\nIMPORTANTE: Responde estrictamente en español.`;
    }

    // Mensaje de usuario visible en el chat
    let visibleUserText = rawQuestion;
    if (mode !== "chat" && !overrideQuestion) {
      const labelMap = {
        summary: "Summarize this PDF.",
        key_insights: "Give me key insights from this PDF.",
        explain_like_10: "Explain this PDF like I'm 10.",
        action_items: "Extract action items from this PDF.",
      };
      visibleUserText = labelMap[mode] || rawQuestion;
    }

    setMessages((prev) => [...prev, { role: "user", content: visibleUserText }]);
    setQuestion("");
    setIsAsking(true);
    setStatus("Asking the AI...");

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: finalQuestion,
          mode,
          language: lang, // si el backend lo usa, bien; si no, lo ignora
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        console.error("Ask error:", data);
        alert("Error asking the AI.");
        setStatus("Error asking the AI.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer },
      ]);

      setStatus("Ready.");
    } catch (err) {
      console.error(err);
      alert("AI request failed.");
      setStatus("AI request failed.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleQuickAction = (mode) => {
    sendQuestion(mode, ""); // la función ya se encarga de generar el texto
  };

  // ENTER para enviar
  const handleInputKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isAsking && question.trim()) {
        sendQuestion("chat");
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStatus("Chat cleared.");
  };

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className={`app-root theme-${theme}`}>
      {/* TOP BAR */}
      <header className="top-bar">
        <div className="brand">
          <div className="brand-icon">AI</div>
          <div className="brand-text">
            <div className="brand-title">PDF Reader PRO · IAROT</div>
            <div className="brand-subtitle">
              Upload · Analyze · Ask anything · Groq-powered · EN/ES Smart
            </div>
          </div>
        </div>

        <div className="top-actions">
          <button className="ghost-button" type="button" onClick={clearChat}>
            Clear chat
          </button>

          <button
            className={`theme-toggle ${isDark ? "on" : "off"}`}
            type="button"
            onClick={handleThemeToggle}
            title="Toggle light/dark"
          >
            <span className="theme-dot" />
          </button>
        </div>
      </header>

      {/* STATUS BAR */}
      <div className="status-bar">
        <span className="status-dot" />
        <span className="status-text">{status}</span>

        {pdfMeta && (
          <div className="status-meta">
            <span>{pdfMeta.filename}</span>
            <span>• {pdfMeta.pages} pages</span>
            <span>• {pdfMeta.characters} chars</span>
          </div>
        )}
      </div>

      {/* MAIN LAYOUT */}
      <main className="layout">
        {/* LEFT PANEL: PDF */}
        <section className="panel panel-left">
          <div className="panel-header">
            <h2>Document</h2>
            <span className="panel-tag">Max 20MB · PDF only</span>
          </div>

          <div
            className="drop-area"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className="drop-icon">📄</div>
            <div className="drop-title">Drag &amp; drop your PDF here</div>
            <div className="drop-subtitle">
              Or select it manually and let IAROT analyze the content.
            </div>

            <label className="file-button">
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={handleFileChange}
              />
              <span>{pdfFile ? "Change PDF" : "Select PDF"}</span>
            </label>
          </div>

          <button
            className="primary-button full-width"
            type="button"
            onClick={uploadPdf}
            disabled={isUploading || !pdfFile}
          >
            {isUploading ? "Analyzing PDF..." : "Analyze PDF"}
          </button>

          {/* QUICK ACTIONS */}
          <div className="panel-section">
            <div className="section-header">
              <h3>Quick actions</h3>
              <button
                className="link-button"
                type="button"
                onClick={clearChat}
              >
                Clear chat
              </button>
            </div>

            <div className="quick-actions">
              <button
                className="chip-button"
                type="button"
                onClick={() => handleQuickAction("summary")}
                disabled={!pdfMeta || isAsking}
              >
                📝 Summary
              </button>
              <button
                className="chip-button"
                type="button"
                onClick={() => handleQuickAction("key_insights")}
                disabled={!pdfMeta || isAsking}
              >
                💡 Key insights
              </button>
              <button
                className="chip-button"
                type="button"
                onClick={() => handleQuickAction("explain_like_10")}
                disabled={!pdfMeta || isAsking}
              >
                🤓 Explain like I'm 10
              </button>
              <button
                className="chip-button"
                type="button"
                onClick={() => handleQuickAction("action_items")}
                disabled={!pdfMeta || isAsking}
              >
                ✅ Action items
              </button>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="panel-section">
            <div className="section-header">
              <h3>PDF preview</h3>
              {pdfMeta && (
                <span className="section-meta">
                  {pdfMeta.pages} pages · {pdfMeta.characters} characters
                </span>
              )}
            </div>

            <div className="preview-box">
              {pdfPreview ? (
                <pre>{pdfPreview}</pre>
              ) : (
                <div className="preview-placeholder">
                  The first lines of your PDF will appear here after analysis.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: CHAT */}
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>Chat with your PDF</h2>
            <span className="panel-tag">Ask in English or Spanish</span>
          </div>

          <div className="chat-box">
            {messages.length === 0 && (
              <div className="chat-placeholder">
                <p>Ask anything about your document.</p>
                <p className="chat-example">
                  Examples:
                  <br />
                  • What is this PDF about? (English)
                  <br />
                  • Resúmeme este PDF en español.
                  <br />
                  • Explica los conceptos clave y respóndeme en inglés.
                  <br />
                  • Tradúceme al español las conclusiones.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message chat-${msg.role}`}
              >
                <div className="chat-role">
                  {msg.role === "user"
                    ? "You"
                    : msg.role === "assistant"
                    ? "AI"
                    : "System"}
                </div>
                <div className="chat-bubble">{msg.content}</div>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-area">
            <textarea
              className="chat-input"
              placeholder="Ask something about this PDF..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleInputKeyDown}
              rows={3}
            />

            <button
              className="primary-button"
              type="button"
              onClick={() => sendQuestion("chat")}
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div>Built with Groq · React · Node</div>
        <div>IAROT · Base for a premium product / SaaS</div>
      </footer>
    </div>
  );
}

export default App;
