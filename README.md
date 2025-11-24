# AI PDF Reader · Groq-powered

AI PDF Reader is a modern, full-stack application that lets you upload a PDF, analyze its content with an AI model, and ask natural language questions about the document.

The goal of this project is to be **product-ready**: clean architecture, premium UI, and a solid base to turn into a SaaS or a sellable template.

---

## ✨ Features

- 📄 **PDF upload** via file selector or drag & drop
- 🔍 **Text extraction** from PDF using `pdf-parse`
- 🤖 **AI Q&A over PDF content** using Groq (`llama-3.1-8b-instant`)
- 💬 **Chat interface** to ask multiple questions about the same PDF
- ⚡ **Quick actions**:
  - Summarize the PDF
  - Extract key insights
  - Explain the document “like I'm 10”
- 👀 **Live PDF preview** (embedded iframe)
- 🧠 **Language-aware answers**  
  The model always answers in the **same language as the user's question**, regardless of the PDF language.
- 🎨 **Premium UI** built with React + custom CSS, designed to look like a real product, not a demo.

---

## 🏗 Tech Stack

**Frontend**

- React + Vite
- Fetch API
- Custom CSS (dark, modern, responsive UI)

**Backend**

- Node.js + Express
- Multer (file upload)
- pdf-parse (PDF text extraction)
- Groq SDK (chat completions API)

---

## 📂 Project Structure

```bash
AI-PDF-READER/
  backend/
    src/
      server.js       # Express server, upload & ask endpoints
    package.json
    .gitignore        # MUST ignore .env
    .env              # (local only, not committed)

  frontend/
    src/
      App.jsx         # Main React app (premium UI)
      main.jsx        # React entry point
      index.css       # Global styles
    vite.config.js
    package.json

  README.md
⚙️ Environment Variables
Create a .env file inside the backend folder:

bash
Copiar código
AI-PDF-READER/
  backend/
    .env
Contents:

env
Copiar código
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
⚠️ Important:

Do not commit .env to Git.

Make sure .env is listed in backend/.gitignore.

🚀 Getting Started (Local Development)
1. Clone the repository
bash
Copiar código
git clone https://github.com/your-username/AI-PDF-READER.git
cd AI-PDF-READER
2. Backend setup
bash
Copiar código
cd backend
npm install
Create the .env file:

bash
Copiar código
PORT=5001
FRONTEND_ORIGIN=http://localhost:5173
GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
Run the backend in development mode:

bash
Copiar código
npm run dev
The backend will be available at:

bash
Copiar código
http://localhost:5001
3. Frontend setup
Open another terminal in the project root:

bash
Copiar código
cd frontend
npm install
npm run dev
By default, Vite runs on:

bash
Copiar código
http://localhost:5173
The frontend is configured to call:

POST /api/upload → upload & process PDF

POST /api/ask → ask questions about the PDF

When running locally via Vite dev server, the frontend proxies API calls to the backend.

🧠 How It Works
Upload PDF

The user uploads a PDF using the file input or drag & drop.

The file is sent to POST /api/upload.

The backend uses pdf-parse to extract text.

The extracted text is stored in memory (v1) and basic metadata (file name, pages, text length) is returned to the frontend.

Ask a question

The user types a question in the chat.

The question is sent to POST /api/ask.

The backend combines:

A truncated snippet of the PDF text

The user’s question

A prompt with clear rules:

Always answer in the same language as the user’s question

Do not infer the language from the PDF

Clearly say if the answer is not in the PDF

The backend calls Groq (llama-3.1-8b-instant) and returns the answer.

The frontend displays the conversation in a chat-like UI with user, system and AI messages.

🖥 UI Overview
The app is split into two main panels:

Left panel — “Upload & preview PDF”

Drag & drop area + “Select PDF” button

PDF status (loaded, processing, ready)

Quick actions:

Summarize PDF

Key insights

Explain like I’m 10

Live PDF preview iframe

Tips section

Right panel — “Ask the AI”

Chat window with message history

Typing indicator while the AI is thinking

Input box and “Ask” button

A status bar at the top shows:

Current PDF name

Pages

Character count

State (Idle / Ready)

🧩 Roadmap / Next Steps
Planned or easy improvements:

🔐 Authentication (users, sessions, roles)

💾 Persistent storage (DB for PDFs and Q&A history)

📊 Usage dashboard (per user / per document)

🌐 Deployment:

Frontend → Vercel

Backend → Render / Railway

🧱 Turn it into a reusable template (Gumroad / marketplace)

🧬 Vector DB integration (semantic search over large PDFs)

📝 Scripts
Backend (backend/)
bash
Copiar código
npm run dev      # Start backend in development mode
Frontend (frontend/)
bash
Copiar código
npm run dev      # Start Vite dev server
npm run build    # Build for production
npm run preview  # Preview production build
📜 License
This project is currently closed-source / personal.
You can adapt this section to your needs (MIT, proprietary, etc.).

🤝 Contributions / Contact
This project is built as a full-stack AI portfolio piece and as a potential micro-SaaS starter.

If you want to:

Extend it

Adapt it to your stack

Use it as a base for a product
