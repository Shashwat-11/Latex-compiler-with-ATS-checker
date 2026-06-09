# Overleaf — LaTeX Editor with AI Copilot

A modern, feature-rich LaTeX editor with **AI-powered copilot**, **one-click resume generation**, and **real-time PDF preview**. Built with TypeScript, React, Fastify, and PostgreSQL.

---

## ✨ Features

### 📝 LaTeX Editor
- Monaco Editor with LaTeX syntax highlighting and autocomplete
- Real-time PDF preview via `pdfjs-dist`
- Resizable split panels (File Explorer | Editor | PDF)
- Project-based file management with folders
- Auto-save (1.5s debounce) + Ctrl+S to save & compile
- Docker-sandboxed LaTeX compilation (pdflatex, xelatex, lualatex)

### 🤖 AI Copilot
- **Chat sidebar** — Ask questions about your document, get LaTeX help
- **Create & edit files** — Just ask: *"Create a file called report.tex"* or *"Add a section to main.tex"*
- **Inline completions** — AI suggests LaTeX code as you type
- **Project-aware** — The AI sees your file tree and current document context
- File Changes panel shows what files were created/edited

### 📄 Resume Wizard
- 4-step wizard: Template → Personal Info → Content → Generate
- **4 built-in templates**: Modern CV, Two-Column Resume, Simple Resume, Awesome CV
- AI generates complete LaTeX from your structured data
- One-click save as project + compile to PDF

### 📊 ATS Resume Checker
- Analyze your compiled resume PDF for ATS compatibility
- Keyword matching, bullet quality scoring, formatting checks
- Section ordering validation, readability metrics

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Tailwind CSS v4, Monaco Editor, Zustand, TanStack Query |
| **Backend** | Fastify 5, TypeScript, Drizzle ORM |
| **Database** | PostgreSQL 16 |
| **AI** | Google Gemini API (`@google/genai` SDK) |
| **LaTeX** | Docker sandbox with `texlive` image |
| **Build** | Turborepo + pnpm workspaces |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 22
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Docker** (for LaTeX compilation)
- **PostgreSQL** 16 (or Docker image)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/overleaf.git
cd overleaf
pnpm install
```

### 2. Configure Environment

Copy the example env file and edit it:

```bash
cp .env.example .env
```

Key variables to configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://overleaf:overleaf@localhost:5432/overleaf` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | _(set a strong random value)_ |
| `GEMINI_API_KEY` | Google Gemini API key | _(get one free at [aistudio.google.com](https://aistudio.google.com))_ |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:5173` |

> **Note**: AI features require `GEMINI_API_KEY`. Without it, the editor and compilation still work — only the AI Copilot and Resume Wizard will be unavailable.

### 3. Start PostgreSQL

Using Docker (recommended):

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Run Database Migrations & Seed

```bash
# Generate migration files
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Seed with demo data (sample projects + resume templates)
pnpm db:seed
```

This creates:
- **Demo user**: `demo@overleaf.local` / `password123`
- **Guest user**: `guest@overleaf.local` / `guest`
- **Sample projects**: "Resume 2026", "Research Paper"
- **4 resume templates**: Modern CV, Two-Column, Simple, Awesome CV

### 5. Start Development Servers

```bash
# Start both API server (port 3001) and frontend (port 5173)
pnpm dev
```

Or start them individually:

```bash
pnpm --filter @overleaf/api dev    # Backend: http://localhost:3001
pnpm --filter @overleaf/web dev    # Frontend: http://localhost:5173
```

### 6. Open the App

Visit **http://localhost:5173** and log in with `demo@overleaf.local` / `password123`.

---

## 🤖 Using the AI Copilot

> **Requires**: `GEMINI_API_KEY` set in `.env`

### Chat Assistant
1. Open any project
2. Click the ✨ **Sparkles** button in the toolbar
3. The Copilot appears as a bottom panel (like VSCode terminal)
4. Ask questions: *"How do I create a table in LaTeX?"*
5. Ask to edit files: *"Change the title to My Paper"*
6. Ask to create files: *"Create a file called references.bib"*

The AI sees your project's file tree and the currently open file. File changes appear in the **File Changes** panel at the top of the Copilot sidebar.

### Inline Completions
As you type in the editor, the AI suggests LaTeX completions automatically (debounced 400ms after you stop typing).

---

## 📄 Resume Wizard

1. Navigate to **http://localhost:5173/resume/new**
2. **Step 1**: Pick a template (Modern CV, Two-Column, Simple, Awesome CV) + style/color
3. **Step 2**: Fill in personal info (name, email, phone, summary)
4. **Step 3**: Add education, experience, and skills
5. **Step 4**: Click "Generate Resume" — AI creates the LaTeX, auto-saves as a project, and redirects to the editor

---

## 📁 Project Structure

```
overleaf/
├── apps/
│   ├── api/                        # Fastify backend
│   │   └── src/
│   │       ├── config/env.ts       # Environment variable validation
│   │       ├── routes/             # API route handlers
│   │       │   ├── auth.routes.ts
│   │       │   ├── ai.routes.ts    # AI chat, completions, templates, resume
│   │       │   ├── project.routes.ts
│   │       │   ├── file.routes.ts
│   │       │   ├── compilation.routes.ts
│   │       │   └── ...
│   │       ├── services/           # Business logic
│   │       │   ├── ai.service.ts   # Gemini API client + model fallback
│   │       │   ├── resume.service.ts
│   │       │   └── ...
│   │       └── middleware/         # Auth, project access, error handling
│   │
│   └── web/                        # React frontend
│       └── src/
│           ├── components/
│           │   ├── ai/             # AI Copilot, Resume Wizard, Template Gallery
│           │   ├── editor/         # Monaco Editor, tabs, status bar
│           │   ├── pdf-viewer/     # PDF viewer + ATS panel
│           │   ├── file-explorer/  # File tree
│           │   └── layout/         # AuthLayout, Sidebar, PublicLayout
│           ├── hooks/              # React hooks (useAiChat, useFiles, etc.)
│           ├── stores/             # Zustand stores (editor, compilation, UI)
│           ├── routes/             # Page components
│           └── styles/             # CSS with Gruvbox design tokens
│
├── packages/
│   ├── db/                         # Database schema, migrations, seed
│   │   ├── src/schema/             # Drizzle ORM table definitions
│   │   └── drizzle/                # SQL migration files
│   └── shared/                     # Shared TypeScript types
│
└── docker/                         # Docker compose for PostgreSQL + LaTeX
```

---

## 🔌 API Routes

### Auth (`/api/v1/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Sign in |
| POST | `/logout` | Yes | Sign out |
| POST | `/refresh` | Cookie | Refresh access token |
| GET | `/me` | Yes | Get current user |

### AI (`/api/v1`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/templates` | No | List resume templates |
| GET | `/templates/:slug` | No | Get template detail |
| POST | `/projects/:id/chat` | Yes | Streaming AI chat (SSE) |
| GET | `/projects/:id/chat/history` | Yes | Chat conversation history |
| POST | `/projects/:id/completions` | Yes | Inline LaTeX completions |
| POST | `/resume/generate` | Yes | Generate resume from form data |
| POST | `/resume/:id/save` | Yes | Save generated resume as project |

### Projects (`/api/v1/projects`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | List user's projects |
| POST | `/` | Yes | Create project |
| GET | `/:id` | Yes | Get project |
| PATCH | `/:id` | Yes | Update project |
| DELETE | `/:id` | Yes | Delete project |
| POST | `/:id/duplicate` | Yes | Duplicate project |
| GET | `/:id/files` | Yes | List project files |
| POST | `/:id/files` | Yes | Create file/folder |
| GET | `/:id/files/:fileId` | Yes | Get file content |
| PATCH | `/:id/files/:fileId` | Yes | Update file |
| DELETE | `/:id/files/:fileId` | Yes | Delete file |
| POST | `/:id/compile` | Yes | Trigger LaTeX compilation |
| GET | `/:id/pdf/latest` | Yes | Download latest PDF |

---

## 🎨 Theme

The app uses a **Gruvbox** dark/light theme with CSS custom properties:

```css
--bg: #1d2021           /* Dark background */
--bg-elevated: #282828  /* Card/sidebar background */
--text-primary: #ebdbb2 /* Main text */
--accent: #83a598       /* Blue accent */
--success: #b8bb26      /* Green */
--warning: #fabd2f      /* Yellow */
--danger: #fb4934       /* Red */
```

Switch between dark/light/system via the theme toggle in the sidebar.

---

## 🐳 LaTeX Compilation

Compilation runs in a **Docker sandbox** for security:

- Image: `overleaf-tex:latest` (configurable via `LATEX_DOCKER_IMAGE`)
- Memory limit: 1024MB
- Timeout: 30 seconds
- Network: none (fully isolated)
- Supports pdflatex, xelatex, lualatex
- Automatic biber/bibtex when `.bib` files are detected

Build the Docker image:

```bash
docker build -t overleaf-tex:latest -f docker/Dockerfile.latex docker/
```

Or use an existing TeXLive image:
```
LATEX_DOCKER_IMAGE=texlive/texlive:latest
```

---

## 🧪 Common Commands

```bash
# Development
pnpm dev                     # Start all dev servers
pnpm --filter @overleaf/web dev   # Frontend only
pnpm --filter @overleaf/api dev   # Backend only

# Database
pnpm db:generate             # Generate SQL migration
pnpm db:migrate              # Apply migrations
pnpm db:seed                 # Seed demo data
pnpm db:reset                # Drop + recreate + migrate + seed

# Type checking
pnpm typecheck               # Check all packages

# Building
pnpm build                   # Build all packages for production

# Testing
pnpm --filter @overleaf/api test   # Run backend tests
```

---

## 📄 License

This project is for educational and personal use. LaTeX templates are licensed under LPPL.
