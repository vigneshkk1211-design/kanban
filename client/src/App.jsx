import { useState, useCallback } from 'react';
import KanbanBoard from './components/KanbanBoard';
import ChatWidget from './components/ChatWidget';

export default function App() {
  const [boardKey, setBoardKey] = useState(0);

  // Allows child components to signal a global board refresh
  const refreshBoard = useCallback(() => {
    setBoardKey((k) => k + 1);
  }, []);

  return (
    <div className="app-shell">
      {/* ── App Header ── */}
      <header className="app-header glass">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="7" height="18" rx="2" fill="url(#grad1)" opacity="0.9"/>
              <rect x="10.5" y="3" width="4" height="12" rx="2" fill="url(#grad2)" opacity="0.8"/>
              <rect x="16" y="3" width="6" height="8" rx="2" fill="url(#grad3)" opacity="0.7"/>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
                <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#ec4899"/>
                </linearGradient>
                <linearGradient id="grad3" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 className="brand-name">KanbanAI</h1>
            <p className="brand-tagline">Smart Project Board</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="header-badge">
            <span className="status-dot status-dot--live"></span>
            AI Assistant Active
          </div>
        </div>
      </header>

      {/* ── Kanban Board ── */}
      <main className="app-main">
        <KanbanBoard key={boardKey} onBoardRefresh={refreshBoard} />
      </main>

      {/* ── Chat Widget ── */}
      <ChatWidget />

      <style>{`
        .app-shell {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* Header */
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          height: 64px;
          border-bottom: 1px solid var(--border);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2));
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(139,92,246,0.2);
        }

        .brand-name {
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #f1f5f9 30%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
          margin-bottom: 2px;
        }

        .brand-tagline {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 9999px;
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--accent-purple-light);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-purple-light);
        }

        .status-dot--live {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 2s ease-in-out infinite;
        }

        /* Main */
        .app-main {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
          50% { opacity: 0.6; box-shadow: 0 0 16px #10b981; }
        }
      `}</style>
    </div>
  );
}
