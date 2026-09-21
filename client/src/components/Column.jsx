import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { createTask } from '../api/tasks';

export default function Column({ column, tasks, onTaskAdded, onTaskDeleted, onTaskUpdated }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [inlineTitle, setInlineTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInlineSubmit = async (e) => {
    e.preventDefault();
    if (!inlineTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newTask = await createTask({
        title: inlineTitle.trim(),
        status: 'TODO',
        priority: 'MEDIUM',
      });
      setInlineTitle('');
      if (onTaskAdded) {
        onTaskAdded(newTask);
      }
    } catch (err) {
      console.error('Failed to create task inline:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`column ${isOver ? 'column--over' : ''}`}
      style={{ '--col-color': column.color, '--col-bg': column.bg }}
    >
      {/* Column Header */}
      <div className="col-header">
        <div className="col-header-left">
          <span className="col-icon">{column.icon}</span>
          <div>
            <h3 className="col-title" style={{ color: column.color }}>{column.label}</h3>
            <p className="col-desc">{column.description}</p>
          </div>
        </div>
        <div className="col-count" style={{ background: column.bg, color: column.color }}>
          {tasks.length}
        </div>
      </div>

      {/* Colorline */}
      <div className="col-colorline" style={{ background: `linear-gradient(90deg, ${column.color}, transparent)` }} />

      {/* Inline Task Creation Input for "TO DO" column */}
      {column.id === 'TODO' && (
        <form className="inline-add-form" onSubmit={handleInlineSubmit}>
          <input
            type="text"
            className="inline-add-input"
            placeholder="+ Add task & press Enter..."
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            disabled={isSubmitting}
            id="inline-todo-input"
          />
          <button
            type="submit"
            className="inline-add-btn"
            disabled={!inlineTitle.trim() || isSubmitting}
            title="Add task"
            id="inline-todo-submit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </form>
      )}

      {/* Task List */}
      <SortableContext
        id={column.id}
        items={tasks.map((t) => t._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="col-tasks" ref={setNodeRef}>
          {tasks.length === 0 ? (
            <div className="col-empty">
              <div className="col-empty-icon" style={{ color: column.color }}>{column.icon}</div>
              <p>No tasks yet</p>
              <span>{column.id === 'TODO' ? 'Type above to add a task' : 'Drag tasks here'}</span>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onDeleted={onTaskDeleted}
                onUpdated={onTaskUpdated}
              />
            ))
          )}
        </div>
      </SortableContext>

      <style>{`
        .column {
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          transition: border-color var(--transition-base), box-shadow var(--transition-base), background var(--transition-base);
          min-height: 0;
        }

        .column--over {
          border-color: var(--col-color);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 1px var(--col-color), inset 0 0 30px rgba(var(--col-rgb, 139,92,246), 0.05);
        }

        /* Header */
        .col-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 16px 12px;
          flex-shrink: 0;
        }

        .col-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .col-icon {
          font-size: 1.2rem;
          line-height: 1;
        }

        .col-title {
          font-size: 0.9rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 0;
        }

        .col-desc {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 400;
          margin: 0;
          line-height: 1;
        }

        .col-count {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: var(--radius-full);
          min-width: 26px;
          text-align: center;
        }

        /* Colorline */
        .col-colorline {
          height: 2px;
          flex-shrink: 0;
          opacity: 0.6;
        }

        /* Inline Add Form for TO DO */
        .inline-add-form {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px 4px;
          flex-shrink: 0;
        }

        .inline-add-input {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 0.8rem;
          outline: none;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        .inline-add-input::placeholder {
          color: var(--text-muted);
        }

        .inline-add-input:focus {
          border-color: var(--col-color);
          background: rgba(255, 255, 255, 0.09);
        }

        .inline-add-btn {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--col-bg);
          border: 1px solid var(--col-color);
          color: var(--col-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .inline-add-btn:hover:not(:disabled) {
          background: var(--col-color);
          color: #fff;
        }

        .inline-add-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Tasks scrollable area */
        .col-tasks {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 80px;
        }

        .col-tasks::-webkit-scrollbar { width: 4px; }
        .col-tasks::-webkit-scrollbar-track { background: transparent; }
        .col-tasks::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 4px;
        }

        /* Empty State */
        .col-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          gap: 6px;
          text-align: center;
          border: 2px dashed var(--border);
          border-radius: var(--radius-md);
          flex: 1;
          min-height: 120px;
        }

        .col-empty-icon {
          font-size: 2rem;
          opacity: 0.4;
          margin-bottom: 4px;
        }

        .col-empty p {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0;
        }

        .col-empty span {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
