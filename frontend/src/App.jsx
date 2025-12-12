// frontend/src/App.jsx
import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "/api";

function App() {
  const [theme, setTheme] = useState("dark");

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [pdfPreview, setPdfPreview] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [status, setStatus] = useState("Idle");

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");

  const chatEndRef = useRef(null);

  /* =========================================================
     SCROLL CONTROL (FIX MOBILE JUMP)
     ========================================================= */
  const preserveScroll = () => {
    const y = window.scrollY;
    requestAnimationFrame(() => window.scrollTo(0, y));
  };

  /* =========================================================
     AUTO SCROLL CHAT (ONLY CHAT)
     ========================================================= */
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  /* =========================================================
     THEME
     ========================================================= */
  const handleThemeToggle = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const isDark = theme === "dark";

  /* =========================================================
     PDF HANDLING
     ========================================================= */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    preserveScroll(); // 🔥 evita salto en móvil

    setPdfFile(file);
    setPdfMeta(null);
    setPdfPreview("");
    setMessages([]);
    setStatus("PDF selected. Click “Analyze PDF”.");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.includes("pdf")) {
      alert("Please drop a PDF file.");
      return;
    }

    preserveScroll(); // 🔥 evita salto en móvil

    setPdfFile(file);
    setPdfMeta(null);
    setPdfPreview("");
    setMessages([]);
    setStatus("PDF selected. Click “Analyze PDF”.");
  };

  const handleDragOver = (e) => e.preventDefault();

  const uploadPdf = async () => {
    if (!pdfFile) {
      alert("Please select a PDF first.");
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
        alert("Error processing PDF.");
        setStatus("Error processing PDF.");
        return;
      }

      setPdfMeta(data.pdf);
      setPdfPreview(data.preview || "");
      setStatus("PDF analyzed. Ready to ask questions.");

      setMessages([
        {
          role: "system",
          content: `✅ PDF "${data.pdf.filename}" loaded. Pages: ${data.pdf.pages}. Characters: ${data.pdf.characters}.`,
        },
      ]);
    } catch (err) {
      alert("Upload failed.");
      setStatus("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  /* =========================================================
     CHAT
     ========================================================= */
  const sendQuestion = async () => {
    if (!pdfMeta) {
      alert("Upload and analyze a PDF first.");
      return;
    }

    const q = question.trim();
    if (!q) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setIsAsking(true);
    setStatus("Asking the AI...");

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const data = await res.json();

      if (!data.ok) {
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
      alert("AI request failed.");
      setStatus("AI request failed.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isAsking) sendQuestion();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setStatus("Chat cleared.");
  };

  /* =========================================================
     RENDER
     ========================================================= */
  return (
    <div className={`app-root theme-${theme}`}>
      {/* TOP BAR */}
      <header className="top-bar">
        <div className="brand">
          <div className="brand-icon">AI</div>
          <div className="brand-text">
            <div className="brand-title">PDF Reader PRO · IAROT</div>
            <div className="brand-subtitle">
              Upload · Analyze · Ask anything · Groq-powered
            </div>
          </div>
        </div>

        <div className="top-actions">
          <button className="ghost-button" onClick={clearChat}>
            Clear chat
          </button>

          <button
            className={`theme-toggle ${isDark ? "on" : "off"}`}
            onClick={handleThemeToggle}
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

      {/* MAIN */}
      <main className="layout">
        {/* LEFT PANEL */}
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
            <div className="drop-title">Drag & drop your PDF here</div>
            <div className="drop-subtitle">
              Or select it manually and let IAROT analyze the content.
            </div>

            <label className="file-button">
              <input
                type="file"
                accept="application/pdf"
                hidden
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onChange={handleFileChange}
              />
              <span>{pdfFile ? "Change PDF" : "Select PDF"}</span>
            </label>
          </div>

          <button
            className="primary-button full-width"
            onClick={uploadPdf}
            disabled={isUploading || !pdfFile}
          >
            {isUploading ? "Analyzing PDF..." : "Analyze PDF"}
          </button>

          {/* PREVIEW */}
          <div className="panel-section">
            <div className="section-header">
              <h3>PDF preview</h3>
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

        {/* RIGHT PANEL */}
        <section className="panel panel-right">
          <div className="panel-header">
            <h2>Chat with your PDF</h2>
          </div>

          <div className="chat-box">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-message chat-${msg.role}`}>
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
              onKeyDown={handleKeyDown}
              rows={3}
            />

            <button
              className="primary-button"
              onClick={sendQuestion}
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <div>Built with Groq · React · Node</div>
        <div>IAROT · Premium AI Tools</div>
      </footer>
    </div>
  );
}

export default App;
