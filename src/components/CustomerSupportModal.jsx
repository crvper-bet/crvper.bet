import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, ShieldCheck, Headphones } from 'lucide-react';
import { storage } from '../services/storage';
import { useAuth } from '../context/AuthContext';

export default function CustomerSupportModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadChat = async () => {
      const chat = await storage.getUserChatAsync(user.id);
      setMessages(chat?.messages || []);
    };

    loadChat();

    const handleSupportUpdated = async (e) => {
      if (e.detail?.userId && String(e.detail.userId) !== String(user.id)) return;
      const chat = await storage.getUserChatAsync(user.id);
      setMessages(chat?.messages || []);
    };

    window.addEventListener('crvper_support_updated', handleSupportUpdated);
    return () => window.removeEventListener('crvper_support_updated', handleSupportUpdated);
  }, [isOpen, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const textToSend = input.trim();
    setInput('');
    await storage.sendSupportMessage(user.id, user.phone, textToSend, 'user');
    const updated = await storage.getUserChatAsync(user.id);
    setMessages(updated?.messages || []);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md h-[560px] bg-white border-sky-200 border border-cyan-500/30 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-sky-50 px-4 py-3.5 border-b border-sky-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-white text-sm">CRVPER VIP Support</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xs text-slate-500">Online 24/7 • Instant manual assistance</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Pill */}
        <div className="bg-cyan-950/40 border-b border-cyan-900/40 px-4 py-2 flex items-center space-x-2 text-xs text-cyan-300">
          <ShieldCheck className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Support tickets are reviewed by official CRVPER Admins.</span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m) => {
            const isAdmin = m.sender === 'admin';
            return (
              <div 
                key={m.id} 
                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
              >
                <div 
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isAdmin 
                      ? 'bg-[#1e293b] text-slate-800 border border-sky-200/60 rounded-tl-sm' 
                      : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-md'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {isAdmin ? 'CRVPER Agent' : 'You'} • {m.time}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-sky-50 border-t border-sky-100 flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message or deposit issue..."
            className="flex-1 bg-[#0b1120] border border-sky-200/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-black font-bold transition shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
