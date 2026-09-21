# 🗂️ KanbanAI — Smart Kanban Board with AI Chatbot

> A full-stack Kanban Board with drag-and-drop task management and an integrated AI chatbot/voice agent.

**Tech Stack:** React (Vite) · Node.js/Express · MongoDB · Python FastAPI

---

## 📁 Project Structure

```
kanban-board/
├── client/                # React + Vite frontend
│   ├── src/
│   │   ├── api/tasks.js        # Axios API client
│   │   ├── components/
│   │   │   ├── KanbanBoard.jsx # Main board with 4 columns
│   │   │   ├── Column.jsx      # Droppable column
│   │   │   ├── TaskCard.jsx    # Draggable task card
│   │   │   ├── AddTaskModal.jsx# Create task modal
│   │   │   └── ChatWidget.jsx  # AI chat + voice widget
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                # Node.js + Express + MongoDB
│   ├── models/Task.js     # Mongoose schema
│   ├── routes/tasks.js    # REST API routes
│   ├── index.js           # Express entry point
│   ├── .env               # MongoDB URI, PORT
│   └── package.json
│
├── ai-service/            # Python FastAPI chatbot
│   ├── main.py            # FastAPI app + NLP logic
│   ├── requirements.txt
│   └── .env               # NODE_API_URL
│
├── package.json           # Root convenience scripts
└── README.md
```

---

## ⚡ Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| MongoDB | 6+ (running locally) |
| Python | 3.10+ |
| pip | latest |

---

## 🚀 Setup & Run

### 1. Clone and install dependencies

```bash
# Install Node dependencies
cd server && npm install
cd ../client && npm install
```

### 2. Start MongoDB

Make sure MongoDB is running locally:
```bash
mongod
```
Or update `server/.env` to point to MongoDB Atlas:
```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/kanban
```

### 3. Start Node.js Server (Terminal 1)
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### 4. Install Python dependencies and Start AI Service (Terminal 2)
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Runs on http://localhost:8000
```

### 5. Start React Frontend (Terminal 3)
```bash
cd client
npm run dev
# Opens at http://localhost:5173
```

---

## 🌐 Service Ports

| Service | Port | URL |
|---|---|---|
| React Frontend | 5173 | http://localhost:5173 |
| Node.js API | 5000 | http://localhost:5000/api/tasks |
| Python AI | 8000 | http://localhost:8000/chat |
| API Health | 5000 | http://localhost:5000/health |
| AI Health | 8000 | http://localhost:8000/health |

---

## 🎯 Features

### Kanban Board
- ✅ 4 columns: **To Do**, **In Progress**, **Done**, **Approved**
- ✅ Drag-and-drop task cards between columns (via `@dnd-kit`)
- ✅ Sortable cards within each column
- ✅ Create tasks with title, description, priority, status, assignee
- ✅ Delete tasks with confirmation
- ✅ Priority color indicators (High/Medium/Low)
- ✅ Assignee avatars generated from initials

### AI Chatbot
- ✅ Bottom-right floating chat widget
- ✅ Voice input (Web Speech API — Chrome recommended)
- ✅ Quick prompt chips for common queries
- ✅ Queries: "List TO DO tasks", "What's IN PROGRESS?", "Show all tasks", "How many done?"
- ✅ Full board overview command
- ✅ Unread message badge
- ✅ Typing indicator
- ✅ Keyboard shortcut friendly

---

## 📡 REST API Reference

```
GET    /api/tasks              # Get all tasks
GET    /api/tasks?status=TODO  # Filter by status
GET    /api/tasks/:id          # Get single task
POST   /api/tasks              # Create task
PUT    /api/tasks/:id          # Update task
DELETE /api/tasks/:id          # Delete task
```

### Task Statuses
- `TODO` — To Do
- `IN_PROGRESS` — In Progress
- `DONE` — Done
- `APPROVED` — Approved

### Priority Values
- `HIGH`, `MEDIUM`, `LOW`

---

## 🤖 AI Chat Commands

| Query | Example |
|---|---|
| List by status | "List TO DO tasks" / "What's in progress?" |
| Full overview | "Show all tasks" / "Give me a summary" |
| Count tasks | "How many tasks are done?" |
| Add task hint | "Add a new task" |
| Help | "help" |

---

## 🛠️ Environment Variables

### `server/.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/kanban
CLIENT_ORIGIN=http://localhost:5173
```

### `ai-service/.env`
```env
NODE_API_URL=http://localhost:5000
```

---

## 📄 License

MIT — Built for demonstration purposes.
