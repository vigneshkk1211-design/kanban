import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const AI_API = 'http://localhost:8000';

const QUICK_PROMPTS = [
  { label: '📋 To Do', query: 'List the TO DO tasks' },
  { label: '⚡ In Progress', query: 'What is IN PROGRESS?' },
  { label: '✅ Done', query: 'Show DONE tasks' },
  { label: '🏆 Approved', query: 'What is APPROVED?' },
  { label: '📊 Overview', query: 'Show me all tasks' },
];

function TypingDots() {
  return (
    <div className="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  );
}

function MarkdownMessage({ text }) {
  // Simple markdown rendering without a library dependency issue
  const lines = text.split('\n');
  return (
    <div className="msg-content">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
        );
        // Horizontal rule
        if (line === '---') return <hr key={i} className="msg-hr" />;
        // List item
        if (line.match(/^\d+\.\s/)) return <div key={i} className="msg-list-item">{rendered}</div>;
        // Italic line starting with _
        if (line.startsWith('   _') && line.endsWith('_')) {
          return <div key={i} className="msg-italic">{line.slice(4, -1)}</div>;
        }
        // Indented line (assignee / desc)
        if (line.startsWith('   ')) return <div key={i} className="msg-indent">{rendered}</div>;
        // Empty line
        if (!line.trim()) return <div key={i} className="msg-break" />;
        // Normal line
        return <div key={i}>{rendered}</div>;
      })}
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'bot',
      text: "👋 Hi! I'm your **Kanban AI Assistant**.\n\nAsk me anything about your tasks — like **\"List TO DO tasks\"** or **\"Show all tasks\"**.\n\nType **help** to see all commands.",
      ts: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [voiceListening, setVoiceListening] = useState(false);
  const [unread, setUnread] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;
    const userText = text.trim();

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', text: userText, ts: new Date() },
    ]);
    setInput('');
    setLoading(true);
    setShowQuick(false);

    try {
      const { data } = await axios.post(`${AI_API}/chat`, { message: userText }, { timeout: 15000 });
      const botText = data.reply || 'Sorry, I could not get a response.';
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'bot', text: botText, ts: new Date() },
      ]);
      if (!open) setUnread((n) => n + 1);
    } catch (err) {
      const errMsg = err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK'
        ? '⚠️ Cannot reach the AI service. Make sure Python FastAPI is running on port 8000.'
        : '⚠️ Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'bot', text: errMsg, ts: new Date(), isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickPrompt = (query) => {
    sendMessage(query);
  };

  // ── Voice Recognition ───────────────────────────────────────────────────────
  const startVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. Try Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setVoiceListening(true);
    recognition.onend = () => setVoiceListening(false);
    recognition.onerror = () => setVoiceListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => sendMessage(transcript), 300);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setVoiceListening(false);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'bot',
      text: "👋 Hi! I'm your **Kanban AI Assistant**. Ask me about your tasks!",
      ts: new Date(),
    }]);
    setShowQuick(true);
  };

  return (
    <>
      {/* ── Chat Window ── */}
      {open && (
        <div className="chat-window animate-slide-up" id="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-agent-info">
              <div className="chat-avatar">
                <span>🤖</span>
                <span className="chat-avatar-dot"></span>
              </div>
              <div>
                <p className="chat-agent-name">KanbanAI</p>
                <p className="chat-agent-status">
                  {voiceListening ? '🎤 Listening...' : loading ? '✍️ Typing...' : '● Online'}
                </p>
              </div>
            </div>
            <div className="chat-header-actions">
              <button className="btn-icon" title="Clear chat" onClick={clearChat} id="chat-clear-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
                </svg>
              </button>
              <button className="btn-icon" title="Close chat" onClick={() => setOpen(false)} id="chat-close-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" id="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-msg ${msg.role === 'user' ? 'chat-msg--user' : 'chat-msg--bot'} ${msg.isError ? 'chat-msg--error' : ''}`}
              >
                {msg.role === 'bot' && (
                  <div className="chat-bot-icon">🤖</div>
                )}
                <div className="chat-bubble">
                  <MarkdownMessage text={msg.text} />
                  <span className="chat-time">{formatTime(msg.ts)}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg chat-msg--bot">
                <div className="chat-bot-icon">🤖</div>
                <div className="chat-bubble">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {showQuick && (
            <div className="chat-quick-prompts">
              <p className="quick-label">Quick queries:</p>
              <div className="quick-buttons">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.query}
                    className="quick-btn"
                    onClick={() => handleQuickPrompt(p.query)}
                    id={`quick-${p.label.replace(/\s+/g,'').toLowerCase()}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form className="chat-input-area" onSubmit={handleSubmit} id="chat-form">
            <button
              type="button"
              className={`chat-voice-btn ${voiceListening ? 'chat-voice-btn--active' : ''}`}
              onClick={voiceListening ? stopVoice : startVoice}
              title={voiceListening ? 'Stop listening' : 'Voice input'}
              id="chat-voice-btn"
            >
              {voiceListening ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              )}
            </button>
            <input
              ref={inputRef}
              type="text"
              className="chat-input"
              placeholder={voiceListening ? 'Listening...' : 'Ask about your tasks...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || voiceListening}
              id="chat-input"
              autoComplete="off"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
              id="chat-send-btn"
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{animation:'spin 0.7s linear infinite'}}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ── FAB Toggle Button ── */}
      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''} ${voiceListening ? 'chat-fab--listening' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle AI Chat"
        id="chat-fab-btn"
      >
        {unread > 0 && !open && (
          <span className="chat-unread">{unread}</span>
        )}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="10" r="1" fill="currentColor"/>
            <circle cx="8" cy="10" r="1" fill="currentColor"/>
            <circle cx="16" cy="10" r="1" fill="currentColor"/>
          </svg>
        )}
      </button>

      <style>{`
        /* ── FAB ── */
        .chat-fab {
          position: fixed;
          bottom: 28px;
          right: 28px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 24px rgba(139,92,246,0.4), 0 2px 8px rgba(0,0,0,0.3);
          transition: all var(--transition-base);
          z-index: 1000;
        }

        .chat-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 8px 32px rgba(139,92,246,0.6), 0 4px 16px rgba(0,0,0,0.4);
        }

        .chat-fab--open {
          background: linear-gradient(135deg, #374151, #1f2937);
        }

        .chat-fab--listening {
          animation: fab-pulse 1s ease-in-out infinite;
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }

        @keyframes fab-pulse {
          0%, 100% { box-shadow: 0 6px 24px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 6px 40px rgba(239,68,68,0.8); transform: scale(1.05); }
        }

        .chat-unread {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 0.65rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-primary);
        }

        /* ── Chat Window ── */
        .chat-window {
          position: fixed;
          bottom: 104px;
          right: 28px;
          width: 380px;
          height: 560px;
          background: #13131f;
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.15);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 999;
        }

        /* Header */
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1));
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-agent-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .chat-avatar {
          position: relative;
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.3));
          border: 1px solid rgba(139,92,246,0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .chat-avatar-dot {
          position: absolute;
          bottom: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          background: #10b981;
          border-radius: 50%;
          border: 2px solid #13131f;
        }

        .chat-agent-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.2;
        }

        .chat-agent-status {
          font-size: 0.7rem;
          color: #10b981;
          font-weight: 500;
          margin: 0;
          line-height: 1;
        }

        .chat-header-actions {
          display: flex;
          gap: 4px;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          scroll-behavior: smooth;
        }

        .chat-messages::-webkit-scrollbar { width: 4px; }
        .chat-messages::-webkit-scrollbar-track { background: transparent; }
        .chat-messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .chat-msg {
          display: flex;
          gap: 8px;
          animation: fadeIn 0.25s ease;
        }

        .chat-msg--user {
          flex-direction: row-reverse;
        }

        .chat-bot-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2));
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .chat-bubble {
          max-width: 80%;
          padding: 10px 13px;
          border-radius: 14px;
          font-size: 0.82rem;
          line-height: 1.55;
          position: relative;
        }

        .chat-msg--bot .chat-bubble {
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border);
          border-top-left-radius: 4px;
          color: var(--text-primary);
        }

        .chat-msg--user .chat-bubble {
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          border-top-right-radius: 4px;
          color: white;
        }

        .chat-msg--error .chat-bubble {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.25);
          color: #fca5a5;
        }

        .chat-time {
          display: block;
          font-size: 0.62rem;
          opacity: 0.5;
          margin-top: 4px;
          text-align: right;
        }

        /* Markdown rendering */
        .msg-content { display: flex; flex-direction: column; gap: 2px; }
        .msg-list-item { padding: 1px 0; }
        .msg-indent { padding-left: 14px; opacity: 0.8; }
        .msg-italic { padding-left: 14px; font-style: italic; opacity: 0.75; font-size: 0.78rem; }
        .msg-break { height: 4px; }
        .msg-hr { border: none; border-top: 1px solid var(--border); margin: 6px 0; }

        /* Typing dots */
        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 7px;
          height: 7px;
          background: var(--accent-purple-light);
          border-radius: 50%;
          animation: bounce 1.2s ease-in-out infinite;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        /* Quick prompts */
        .chat-quick-prompts {
          padding: 10px 14px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }

        .quick-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .quick-btn {
          padding: 5px 10px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: var(--radius-full);
          color: var(--accent-purple-light);
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-family: var(--font-family);
          white-space: nowrap;
        }

        .quick-btn:hover {
          background: rgba(139,92,246,0.2);
          border-color: rgba(139,92,246,0.4);
          transform: translateY(-1px);
        }

        /* Input area */
        .chat-input-area {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid var(--border);
          flex-shrink: 0;
          background: rgba(255,255,255,0.02);
        }

        .chat-voice-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .chat-voice-btn:hover {
          background: rgba(139,92,246,0.15);
          border-color: rgba(139,92,246,0.3);
          color: var(--accent-purple-light);
        }

        .chat-voice-btn--active {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.4);
          color: #ef4444;
          animation: fab-pulse 1s ease-in-out infinite;
        }

        .chat-input {
          flex: 1;
          padding: 9px 13px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          color: var(--text-primary);
          font-family: var(--font-family);
          font-size: 0.83rem;
          outline: none;
          transition: border-color var(--transition-base);
        }

        .chat-input::placeholder { color: var(--text-muted); }
        .chat-input:focus { border-color: var(--accent-purple); }

        .chat-send-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-base);
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(139,92,246,0.35);
        }

        .chat-send-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(139,92,246,0.5);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 480px) {
          .chat-window {
            right: 12px;
            bottom: 96px;
            width: calc(100vw - 24px);
            height: 70vh;
          }
          .chat-fab {
            right: 16px;
            bottom: 16px;
          }
        }
      `}</style>
    </>
  );
}
