import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import Column from './Column';
import TaskCard from './TaskCard';
import AddTaskModal from './AddTaskModal';
import { fetchTasks, updateTask } from '../api/tasks';

const COLUMNS = [
  {
    id: 'TODO',
    label: 'To Do',
    color: 'var(--col-todo)',
    bg: 'var(--col-todo-bg)',
    icon: '📋',
    description: 'Tasks waiting to be started',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    color: 'var(--col-inprogress)',
    bg: 'var(--col-inprogress-bg)',
    icon: '⚡',
    description: 'Currently being worked on',
  },
  {
    id: 'DONE',
    label: 'Done',
    color: 'var(--col-done)',
    bg: 'var(--col-done-bg)',
    icon: '✅',
    description: 'Completed tasks',
  },
  {
    id: 'APPROVED',
    label: 'Approved',
    color: 'var(--col-approved)',
    bg: 'var(--col-approved-bg)',
    icon: '🏆',
    description: 'Reviewed and approved',
  },
];

export default function KanbanBoard({ onBoardRefresh }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addToColumn, setAddToColumn] = useState('TODO');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Load Tasks ──────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      setError('Could not connect to backend server (https://kanban-1-ftyd.onrender.com). If the server is spinning up on Render free tier, please wait a few seconds and refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getTasksByStatus = (status) => tasks.filter((t) => t.status === status);

  const findContainer = (id) => {
    // If id is a column id, return it directly
    if (COLUMNS.some((c) => c.id === id)) return id;
    // Otherwise find which column the task belongs to
    const task = tasks.find((t) => t._id === id);
    return task?.status || null;
  };

  // ── Drag Handlers ───────────────────────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = findContainer(over.id);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTasks((prev) =>
      prev.map((t) => (t._id === active.id ? { ...t, status: overContainer } : t))
    );
  };

  const handleDragEnd = async ({ active, over }) => {
    const draggedTask = activeTask;
    setActiveTask(null);

    if (!over || !draggedTask) return;

    const overContainer = findContainer(over.id);
    if (!overContainer) return;

    const originalStatus = draggedTask.status;

    if (originalStatus !== overContainer) {
      // 1. Optimistic state update in React UI
      setTasks((prev) =>
        prev.map((t) => (t._id === active.id ? { ...t, status: overContainer } : t))
      );

      // 2. Persist status change to MongoDB server
      try {
        await updateTask(active.id, { status: overContainer });
        // 3. Re-fetch from DB to ensure 100% sync
        const updatedTasks = await fetchTasks();
        setTasks(updatedTasks);
      } catch (err) {
        console.error('Failed to persist drag drop to DB:', err);
        await loadTasks();
        setError('Failed to update task status in database.');
      }
    }
  };

  const handleTaskAdded = (newTask) => {
    setTasks((prev) => [...prev, newTask]);
    setShowAddModal(false);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const handleAddToColumn = (columnId) => {
    setAddToColumn(columnId);
    setShowAddModal(true);
  };

  // ── Total count ─────────────────────────────────────────────────────────────
  const totalTasks = tasks.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner"></div>
        <p>Loading board...</p>
      </div>
    );
  }

  return (
    <div className="kanban-root">
      {/* Board Header */}
      <div className="board-header">
        <div className="board-meta">
          <h2 className="board-title">Project Board</h2>
          <span className="task-count">{totalTasks} task{totalTasks !== 1 ? 's' : ''}</span>
        </div>
        <div className="board-controls">
          {error && (
            <div className="error-banner">
              <span>⚠️</span> {error}
            </div>
          )}
        </div>
      </div>

      {/* Kanban Columns */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              column={col}
              tasks={getTasksByStatus(col.id)}
              onTaskAdded={handleTaskAdded}
              onTaskDeleted={handleTaskDeleted}
              onTaskUpdated={loadTasks}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal
          defaultStatus={addToColumn}
          onTaskAdded={handleTaskAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <style>{`
        .kanban-root {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 64px);
          padding: 24px 28px;
          gap: 20px;
          overflow: hidden;
        }

        /* Board Header */
        .board-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .board-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .board-title {
          font-size: 1.4rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text-primary) 40%, var(--accent-purple-light) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .task-count {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 4px 10px;
          background: var(--bg-glass);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
        }

        .board-controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Columns Layout */
        .board-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }

        /* Loading */
        .board-loading {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-secondary);
        }

        @media (max-width: 1024px) {
          .board-columns {
            grid-template-columns: repeat(2, 1fr);
            overflow-y: auto;
          }
          .kanban-root {
            height: auto;
            overflow: auto;
          }
        }

        @media (max-width: 640px) {
          .board-columns {
            grid-template-columns: 1fr;
          }
          .kanban-root {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
