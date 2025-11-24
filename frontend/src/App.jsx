import { useEffect, useState } from "react";

function App() {
  const [pdfName, setPdfName] = useState("");
  const [pdfPages, setPdfPages] = useState(null);
  const [pdfChars, setPdfChars] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Clean preview URL on unmount / change
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const processPdfFile = async (file) => {
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }

    // Create preview URL
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);

    setError("");
    setIsUploading(true);
    setIsPdfReady(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error uploading PDF.");
      }

      setPdfName(data.fileName);
      setPdfPages(data.pages);
      setPdfChars(data.textLength);
      setIsPdfReady(true);

      setMessages([
        {
          role: "system",
          content: `✅ PDF "${data.fileName}" loaded. Pages: ${data.pages}. Text length: ${data.textLength} characters.`,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error uploading PDF.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files?.[0];
    processPdfFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    processPdfFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const ask = async (rawQuestion) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed) return;
    if (!isPdfReady) {
      setError("Please upload a PDF first.");
      return;
    }

    setError("");
    setIsAsking(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error processing the request.");
      }

      const answer = data.answer || "No answer received.";

      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error contacting the AI.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleAskSubmit = (e) => {
    e.preventDefault();
    ask(question);
  };

  const handleQuickAsk = (template) => {
    ask(template);
  };

  const handleClearChat = () => {
    setMessages([]);
    setError("");
  };

  const pdfLoaded = Boolean(pdfName);

  return (
    <div className="app">
      <div className="app-shell shell-animate">
        {/* HEADER */}
        <header className="app-header">
          <div className="header-left">
            <h1>AI PDF Reader</h1>
            <p className="subtitle">
              Upload · Analyze · Ask anything · Groq-powered
            </p>
          </div>
          <div className="header-right">
            <div className="header-chip">v1 · Prototype</div>
            <div className="header-chip secondary">Built by you</div>
          </div>
        </header>

        {/* TOP STATUS BAR */}
        <section className="status-bar">
          <div className="status-item">
            <span className="status-label">Current PDF</span>
            <span className="status-value">
              {pdfLoaded ? pdfName : "No PDF loaded"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Pages</span>
            <span className="status-value">
              {pdfLoaded && pdfPages != null ? pdfPages : "—"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Characters</span>
            <span className="status-value">
              {pdfLoaded && pdfChars != null ? pdfChars : "—"}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">State</span>
            <span className={`status-dot ${isPdfReady ? "on" : "off"}`}>
              {isPdfReady ? "Ready" : "Idle"}
            </span>
          </div>
        </section>

        {/* MAIN LAYOUT */}
        <main className="app-main">
          {/* LEFT PANEL: UPLOAD + PREVIEW */}
          <section className="panel panel-animate">
            <h2 className="panel-title">1. Upload & preview PDF</h2>
            <p className="panel-text">
              Drag & drop a PDF file or select it manually. Then ask natural
              language questions about its content.
            </p>

            <div
              className={`drop-zone ${
                isDragging ? "drop-zone--dragging" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <p className="drop-zone-title">
                {isUploading ? "Processing PDF..." : "Drag & drop your PDF here"}
              </p>
              <p className="drop-zone-sub">
                or{" "}
                <label className="file-upload-inline">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileInputChange}
                    disabled={isUploading}
                  />
                  <span>Select PDF</span>
                </label>
              </p>
            </div>

            <div className="pdf-status">
              {pdfLoaded ? (
                <>
                  <p className="pdf-name">
                    Loaded: <strong>{pdfName}</strong>
                  </p>
                  {isPdfReady ? (
                    <span className="status-pill ready">Ready to ask</span>
                  ) : (
                    <span className="status-pill pending">Processing…</span>
                  )}
                </>
              ) : (
                <p className="pdf-name pdf-name--empty">
                  No PDF uploaded yet.
                </p>
              )}
            </div>

            {error && <div className="error-box">{error}</div>}

            {/* QUICK ACTIONS */}
            <div className="quick-actions">
              <div className="quick-actions-header">
                <span>Quick actions</span>
                <button
                  type="button"
                  className="quick-clear"
                  onClick={handleClearChat}
                  disabled={!messages.length}
                >
                  Clear chat
                </button>
              </div>
              <div className="quick-actions-buttons">
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAsk(
                      "Summarize this PDF in 5 short bullet points."
                    )
                  }
                  disabled={!isPdfReady || isAsking}
                >
                  Summarize PDF
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAsk(
                      "List the 10 most important insights from this PDF."
                    )
                  }
                  disabled={!isPdfReady || isAsking}
                >
                  Key insights
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleQuickAsk(
                      "Explain the main idea of this PDF as if I were 10 years old."
                    )
                  }
                  disabled={!isPdfReady || isAsking}
                >
                  Explain like I&apos;m 10
                </button>
              </div>
            </div>

            {/* PDF PREVIEW */}
            <div className="preview-card">
              <div className="preview-header">
                <p className="preview-title">PDF preview</p>
                {pdfLoaded && (
                  <span className="preview-meta">
                    {pdfPages != null ? `${pdfPages} pages · ` : ""}
                    {pdfChars != null ? `${pdfChars} chars` : ""}
                  </span>
                )}
              </div>
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  title="PDF preview"
                  className="pdf-preview-frame"
                />
              ) : (
                <p className="preview-placeholder">
                  Upload a PDF to see a live preview here.
                </p>
              )}
            </div>

            {/* TIPS */}
            <div className="tips">
              <p className="tips-title">Tips</p>
              <ul>
                <li>Use PDFs with selectable text (not scanned images).</li>
                <li>
                  Ask focused questions, e.g.{" "}
                  <em>"What are the main clauses of this contract?"</em>
                </li>
                <li>
                  This is v1 — you can extend it later with history, auth,
                  database, etc.
                </li>
              </ul>
            </div>
          </section>

          {/* RIGHT PANEL: CHAT */}
          <section className="panel panel-animate panel-delay">
            <h2 className="panel-title">2. Ask the AI</h2>

            <div className="chat-window">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <p>Upload a PDF and ask your first question.</p>
                  <p className="empty-chat-sub">
                    Example:{" "}
                    <em>"What is this document about in simple terms?"</em>
                  </p>
                </div>
              ) : (
                <div className="messages">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`message message-${msg.role}`}
                    >
                      <div className="message-role">
                        {msg.role === "user"
                          ? "You"
                          : msg.role === "assistant"
                          ? "AI"
                          : "System"}
                      </div>
                      <div className="message-content">{msg.content}</div>
                    </div>
                  ))}
                  {isAsking && (
                    <div className="message message-assistant">
                      <div className="message-role">AI</div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form className="chat-input-row" onSubmit={handleAskSubmit}>
              <input
                type="text"
                placeholder={
                  isPdfReady
                    ? "Ask something about the PDF..."
                    : "Upload a PDF first."
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={!isPdfReady || isAsking}
              />
              <button
                type="submit"
                disabled={!isPdfReady || isAsking || !question.trim()}
              >
                {isAsking ? "Sending…" : "Ask"}
              </button>
            </form>
          </section>
        </main>

        <footer className="app-footer">
          <span>Built with Groq · React · Node</span>
          <span className="footer-right">Base for a premium product / SaaS.</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
