"""
Kanban Board Chatbot Service (FastAPI)
Purely rule-based Python chatbot (No external AI APIs like Gemini/OpenAI required).
Fetches live task data from Node.js REST API (port 5001) and answers user queries using string matching (if/elif logic).
"""

import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

NODE_API_URL = os.getenv("NODE_API_URL", "https://kanban-cfma.onrender.com")

app = FastAPI(
    title="Kanban Rule-Based Chatbot",
    description="FastAPI chatbot service using Python rule-based logic to answer questions about Kanban tasks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kanban-roan-mu.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str


PRIORITY_EMOJIS = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}

STATUS_LABELS = {
    "TODO": "TO DO",
    "IN_PROGRESS": "IN PROGRESS",
    "DONE": "DONE",
    "APPROVED": "APPROVED",
}


def normalize_status(status_str: str) -> str:
    """Normalize any status representation to canonical keys: TODO, IN_PROGRESS, DONE, APPROVED."""
    if not status_str:
        return ""
    s = str(status_str).strip().upper().replace(" ", "_").replace("-", "_")
    if s in ("TODO", "TO_DO", "BACKLOG"):
        return "TODO"
    if s in ("IN_PROGRESS", "INPROGRESS", "PROGRESS", "WIP", "WORKING", "ACTIVE"):
        return "IN_PROGRESS"
    if s in ("DONE", "COMPLETED", "FINISHED", "CLOSED"):
        return "DONE"
    if s in ("APPROVED", "APPROVAL"):
        return "APPROVED"
    return s


async def fetch_tasks(status: str = None) -> list[dict]:
    """Fetch tasks from the Node.js API (port 5001)."""
    url = f"{NODE_API_URL}/api/tasks"
    params = {"status": status} if status else {}
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("tasks", []) if isinstance(data, dict) else data
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Cannot connect to Node.js backend at {NODE_API_URL}. "
                    "Make sure the Express server is running on port 5001."
                ),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"API error: {str(e)}")


def format_task_list(tasks: list[dict], status_label: str) -> str:
    """Format a list of tasks into markdown string."""
    if not tasks:
        return f"✅ There are currently no tasks in **{status_label}**."

    lines = [f"📋 **{status_label}** — {len(tasks)} task(s):\n"]
    for i, task in enumerate(tasks, 1):
        emoji = PRIORITY_EMOJIS.get(task.get("priority", "MEDIUM"), "🟡")
        line = f"{i}. {emoji} **{task.get('title', 'Untitled')}**"
        if task.get("description"):
            line += f"\n   _{task['description']}_"
        if task.get("assignee"):
            line += f"\n   👤 {task['assignee']}"
        lines.append(line)
    return "\n".join(lines)


def process_user_message(msg: str, all_tasks: list[dict]) -> str:
    """
    Rule-based Python logic (if / elif) to process user queries.
    Uses string matching and status normalization without external AI APIs.
    """
    msg_lower = msg.lower().strip()

    # 1. Status detection (check specific multi-word statuses like "in progress" first)
    target_status = None
    if any(k in msg_lower for k in ["in progress", "inprogress", "working", "wip", "active"]):
        target_status = "IN_PROGRESS"
    elif any(k in msg_lower for k in ["to do", "todo", "backlog"]):
        target_status = "TODO"
    elif any(k in msg_lower for k in ["approved", "approval"]):
        target_status = "APPROVED"
    elif any(k in msg_lower for k in ["done", "completed", "finished"]):
        target_status = "DONE"

    # 2. Count queries (e.g. "how many in to do?", "count done")
    if any(k in msg_lower for k in ["how many", "count", "number of"]):
        if target_status:
            filtered = [t for t in all_tasks if normalize_status(t.get("status")) == target_status]
            label = STATUS_LABELS[target_status]
            noun = "task" if len(filtered) == 1 else "tasks"
            return f"🔢 There are **{len(filtered)} {noun}** in **{label}**."
        else:
            return f"🔢 There are **{len(all_tasks)} total tasks** on the board."

    # 3. Direct status column query (e.g. "To Do", "In Progress", "Done", "Approved")
    if target_status:
        filtered = [t for t in all_tasks if normalize_status(t.get("status")) == target_status]
        return format_task_list(filtered, STATUS_LABELS[target_status])

    # 4. Greetings & Help
    if any(k in msg_lower for k in ["hi", "hello", "hey", "help", "commands"]):
        return (
            "👋 Hi! I'm your **Kanban Rule-Based Assistant**.\n\n"
            "Here are queries you can ask me:\n"
            "- 📋 **To Do** (or _\"List TO DO tasks\"_)\n"
            "- ⚡ **In Progress** (or _\"What is IN PROGRESS?\"_)\n"
            "- ✅ **Done** (or _\"What is DONE?\"_)\n"
            "- 🏆 **Approved** (or _\"What is APPROVED?\"_)\n"
            "- 📊 **Show all tasks** (or _\"Overview\"_)\n"
            "- 🔢 **Count tasks** (or _\"How many tasks in TO DO?\"_)\n\n"
            "Try typing one of these queries! 🚀"
        )

    # 5. Show all / Overview / Summary
    if any(k in msg_lower for k in ["all", "everything", "overview", "summary", "board"]):
        if not all_tasks:
            return "The Kanban board is currently empty! Type a task in **To Do** to create one. 🎉"
        
        sections = []
        for status_key, label in STATUS_LABELS.items():
            tasks_in_status = [t for t in all_tasks if normalize_status(t.get("status")) == status_key]
            if tasks_in_status:
                sections.append(format_task_list(tasks_in_status, label))
        
        if not sections:
            return "No tasks found across any columns."

        return f"📊 **Board Overview** — {len(all_tasks)} total task(s)\n\n" + "\n\n---\n\n".join(sections)

    # 6. Add task hint
    if "add" in msg_lower or "create" in msg_lower or "new task" in msg_lower:
        return "➕ To create a task, type the task title directly into the input box inside the **To Do** column and press Enter!"

    # 7. Default fallback
    return (
        "🤔 I didn't recognize that query.\n\n"
        "Please try asking:\n"
        "- _\"To Do\"_\n"
        "- _\"In Progress\"_\n"
        "- _\"Done\"_\n"
        "- _\"Approved\"_\n"
        "- _\"Show all tasks\"_\n\n"
        "Or type **help** for a list of commands."
    )


@app.get("/")
async def root():
    return {
        "service": "Kanban Python Rule-Based Chatbot",
        "status": "running",
        "node_api_url": NODE_API_URL,
    }


@app.get("/health")
async def health():
    return {"status": "OK"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    message = request.message.strip()
    if not message:
        return ChatResponse(reply="Please type a message so I can answer! 😊")

    # Fetch live tasks from Node.js backend on every chat request
    all_tasks = await fetch_tasks()

    # Process using Python rule-based logic (if/elif) with status normalization
    reply = process_user_message(message, all_tasks)

    return ChatResponse(reply=reply)
