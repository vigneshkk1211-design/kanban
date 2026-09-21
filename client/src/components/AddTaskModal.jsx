import { useState } from 'react';
import { createTask } from '../api/tasks';

const STATUS_OPTIONS = [
  { value: 'TODO', label: '📋 To Do' },
  { value: 'IN_PROGRESS', label: '⚡ In Progress' },
  { value: 'DONE', label: '✅ Done' },
  { value: 'APPROVED', label: '🏆 Approved' },
];

const PRIORITY_OPTIONS = [
  { value: 'HIGH', label: '🔴 High' },
  { value: 'MEDIUM', label: '🟡 Medium' },
  { value: 'LOW', label: '🟢 Low' },
];

export default function AddTaskModal({ defaultStatus = 'TODO', onTaskAdded, onClose }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: defaultStatus,
    priority: 'MEDIUM',
    assignee: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Task title cannot be empty.');
      return;
    }
    setLoading(true);
    try {
      const newTask = await createTask(form);
      onTaskAdded(newTask);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="add-task-modal">
      <div className="modal animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">✨ New Task</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal" id="modal-close-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-banner">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-title">Task Title *</label>
              <input
                id="task-title"
                name="title"
                type="text"
                className="input"
                placeholder="e.g. Design the landing page"
                value={form.title}
                onChange={handleChange}
                autoFocus
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                name="description"
                className="input"
                placeholder="Optional description..."
                value={form.description}
                onChange={handleChange}
                rows={3}
                maxLength={1000}
              />
            </div>

            {/* Status + Priority row */}
            <div className="modal-row">
              <div className="form-group">
                <label className="form-label" htmlFor="task-status">Status</label>
                <select
                  id="task-status"
                  name="status"
                  className="select"
                  value={form.status}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-priority">Priority</label>
                <select
                  id="task-priority"
                  name="priority"
                  className="select"
                  value={form.priority}
                  onChange={handleChange}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-assignee">Assignee</label>
              <input
                id="task-assignee"
                name="assignee"
                type="text"
                className="input"
                placeholder="e.g. John Doe"
                value={form.assignee}
                onChange={handleChange}
                maxLength={100}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} id="modal-cancel-btn">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              id="modal-submit-btn"
            >
              {loading ? (
                <>
                  <span className="btn-spinner"></span>
                  Creating...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .btn-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
