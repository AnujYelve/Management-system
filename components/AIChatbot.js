'use client';

import { useState, useRef, useEffect } from 'react';

const BotIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="12" cy="5" r="2"/>
    <path d="M12 7v4"/>
    <line x1="8" y1="16" x2="8" y2="16"/>
    <line x1="16" y1="16" x2="16" y2="16"/>
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const STARTERS = [
  'Recommend a mystery novel',
  'What science fiction books are available?',
  'How do I issue a book?',
  'Show me books by Agatha Christie',
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'model',
    parts: "Hi! I'm your AI Librarian 📚 Ask me about books, recommendations, or how to use LibraryHub!",
    suggestedBooks: [],
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (isOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isOpen]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const send = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;
    const newMsgs = [...messages, { role: 'user', parts: trimmed, suggestedBooks: [] }];
    setMessages(newMsgs);
    setInput('');
    setIsLoading(true);
    try {
      const history = newMsgs.slice(1, -1).map((m) => ({ role: m.role, parts: m.parts }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, conversationHistory: history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMessages((p) => [...p, { role: 'model', parts: data.reply, suggestedBooks: data.suggestedBooks || [] }]);
    } catch (err) {
      setMessages((p) => [...p, { role: 'model', parts: `Sorry: ${err.message}`, suggestedBooks: [] }]);
    } finally { setIsLoading(false); }
  };

  return (
    <>
      <button id="ai-chatbot-toggle" onClick={() => setIsOpen((p) => !p)}
        title="AI Librarian"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
          bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center
          transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ boxShadow: '0 4px 24px rgba(79,70,229,0.5)' }}
      >
        {isOpen ? <CloseIcon /> : <BotIcon />}
        {!isOpen && messages.length > 1 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full
            text-white text-xs flex items-center justify-center font-bold">!</span>
        )}
      </button>

      {isOpen && (
        <div id="ai-chatbot-drawer"
          className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]
            bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
          style={{ height: '520px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-600 text-white">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><BotIcon /></div>
            <div>
              <p className="font-semibold text-sm leading-none">AI Librarian</p>
              <p className="text-indigo-200 text-xs mt-0.5">Powered by Gemini</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="ml-auto text-white/70 hover:text-white"><CloseIcon /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                }`}>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{msg.parts}</p>
                  {msg.suggestedBooks?.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
                      <p className="text-xs text-gray-500 font-medium">Related books:</p>
                      {msg.suggestedBooks.slice(0, 3).map((b) => (
                        <div key={b._id} className="text-xs bg-indigo-50 rounded-lg p-2">
                          <p className="font-semibold text-indigo-900">{b.title}</p>
                          <p className="text-gray-500">{b.author} · {b.category}</p>
                          <p className={b.availableCopies > 0 ? 'text-green-600' : 'text-red-500'}>
                            {b.availableCopies > 0 ? `${b.availableCopies} available` : 'Unavailable'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex gap-1.5 items-center">
                  {[0,1,2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-indigo-400"
                      style={{ animation: `bounce 1s infinite ${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Starters */}
          {messages.length === 1 && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-gray-50 border-t border-gray-100">
              {STARTERS.map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="text-xs px-3 py-1.5 rounded-full border border-indigo-200
                    text-indigo-700 bg-white hover:bg-indigo-50 transition"
                >{p}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 bg-white">
            <textarea ref={inputRef} id="ai-chatbot-input" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask me about books..." rows={1} disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2
                text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200
                transition max-h-24 overflow-y-auto"
            />
            <button id="ai-chatbot-send" onClick={() => send()}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white
                flex items-center justify-center transition disabled:opacity-40 flex-shrink-0"
            ><SendIcon /></button>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(.8);opacity:.5}40%{transform:scale(1.2);opacity:1}}`}</style>
    </>
  );
}
