import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deleteTask, updateTask } from '../api/tasks';

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', className: 'badge-high', dot: '#ef4444' },
  MEDIUM: { label: 'Medium', className: 'badge-medium', dot: '#f59e0b' },
  LOW: { label: 'Low', className: 'badge-low', dot: '#10b981' },
};

const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  APPROVED: 'Approved',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  if (!name) return '#8b5cf6';
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export default function TaskCard({ task, isDragging = false, isOverlay = false, onDeleted, onUpdated }) {
  const [showActions, setShowActions] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging && !isOverlay ? 0.4 : 1,
  };

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const avatarColor = getAvatarColor(task.assignee);
  const createdDate = formatDate(task.createdAt);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (deleting) return;
    if (!confirm(`Delete "${task.title}"?`)) return;
    setDeleting(true);
    try {
      await deleteTask(task._id);
      onDeleted?.(task._id);
    } catch {
      alert('Failed to delete task');
      setDeleting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`task-card ${isDragging || isOverlay ? 'task-card--dragging' : ''} ${isSortableDragging ? 'task-card--ghost' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      id={`task-${task._id}`}
    >
      {/* Priority indicator strip */}
      <div className="task-priority-strip" style={{ background: priority.dot }} />

      {/* Card Body */}
      <div className="task-body">
        {/* Top row: Badge + Actions */}
        <div className="task-top">
          <span className={`badge ${priority.className}`}>
            <span className="priority-dot" style={{ background: priority.dot }}></span>
            {priority.label}
          </span>

          {showActions && !isOverlay && (
            <button
              className="btn-icon task-delete-btn"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete task"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {deleting ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Task Title */}
        <h4 className="task-title">{task.title}</h4>

        {/* Description */}
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}

        {/* Footer: Date + Assignee */}
        <div className="task-footer">
          {createdDate && (
            <span className="task-date">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {createdDate}
            </span>
          )}
          {task.assignee && (
            <div
              className="task-avatar"
              style={{ background: avatarColor }}
              title={task.assignee}
            >
              {getInitials(task.assignee)}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .task-card {
          position: relative;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: grab;
          transition:
            transform var(--transition-base),
            box-shadow var(--transition-base),
            border-color var(--transition-base),
            background var(--transition-base);
          user-select: none;
          touch-action: none;
          animation: fadeIn 0.25s ease;
        }

        .task-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(139,92,246,0.3);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(139,92,246,0.1);
          transform: translateY(-1px);
        }

        .task-card:active { cursor: grabbing; }

        .task-card--dragging {
          cursor: grabbing;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 2px var(--accent-purple), var(--shadow-glow-strong);
          transform: rotate(1.5deg) scale(1.02);
          border-color: var(--accent-purple);
          background: rgba(139,92,246,0.08);
          z-index: 999;
        }

        .task-card--ghost {
          opacity: 0.3 !important;
        }

        /* Priority Strip */
        .task-priority-strip {
          height: 3px;
          width: 100%;
        }

        /* Body */
        .task-body {
          padding: 12px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Top Row */
        .task-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 22px;
        }

        /* Delete button */
        .task-delete-btn {
          opacity: 0.7;
          transition: all var(--transition-fast);
          padding: 4px;
          border-radius: 4px;
        }
        .task-delete-btn:hover {
          opacity: 1;
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }

        /* Priority Dot */
        .priority-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        /* Title */
        .task-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0;
        }

        /* Description */
        .task-description {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Footer */
        .task-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        .task-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .task-date svg { opacity: 0.7; }

        /* Avatar */
        .task-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
        }

        @keyframes animate-spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: animate-spin 0.7s linear infinite; }
      `}</style>
    </div>
  );
}
