import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Brain,
  MessageCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AIChat: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello ${user?.name || 'Organisation Head'}, I am your Setu AI Assistant. Ask me anything about tasks, staff members, departments, proof uploads, notifications, or security logs. I will retrieve live, factual database records before answering.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [suggestionChips, setSuggestionChips] = useState<string[]>([
    "Show open tasks",
    "What is Ramesh doing?",
    "Show disabled staff members",
    "Highest performing department?",
    "Today's uploaded proofs",
    "Show latest escalations"
  ]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    // Build standard format history for unified OwnerAIService
    const historyPayload = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const response = await apiFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload
        })
      });

      const replyMessage: Message = {
        role: 'assistant',
        content: response.reply || "Sorry, I could not compile a response.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, replyMessage]);

      const queryLower = textToSend.toLowerCase();
      if (queryLower.includes('ramesh') || queryLower.includes('worker') || queryLower.includes('who is') || queryLower.includes('doing')) {
        const nameMatch = textToSend.match(/([A-Z][a-z]+)/);
        const name = nameMatch ? nameMatch[0] : 'Ramesh';
        setSuggestionChips([
          `Show ${name}'s active tasks`,
          `Is ${name} available right now?`,
          `Show all available staff members`
        ]);
      } else if (queryLower.includes('task') || queryLower.includes('open') || queryLower.includes('completed')) {
        setSuggestionChips([
          "Show overdue tasks",
          "Today's completed tasks",
          "Show recent activity logs"
        ]);
      } else if (queryLower.includes('proof') || queryLower.includes('upload') || queryLower.includes('media')) {
        setSuggestionChips([
          "Show pending proofs",
          "Show security logs",
          "Show latest escalations"
        ]);
      } else if (queryLower.includes('department') || queryLower.includes('dept')) {
        setSuggestionChips([
          "Highest performing department?",
          "Show all departments",
          "Show open tasks"
        ]);
      } else {
        setSuggestionChips([
          "Show open tasks",
          "Highest performing department?",
          "Show latest escalations"
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || 'AI Chat encountered an error.');
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I ran into a configuration or execution issue. Please check that Meta WhatsApp services are enabled and retry.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-120px)] sm:h-[calc(100vh-112px)] flex flex-col space-y-4">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/5 p-4 rounded-2xl border border-purple-500/10 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <Sparkles className="w-5 h-5 pulse-active" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight">AI Operations Assistant</h1>
            <p className="text-slate-500 text-[10px] font-medium">Factual operations analytics directly driven by live MongoDB collections. Guessing is disabled.</p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-1 bg-white/50 border border-slate-200 px-3 py-1 rounded-full text-[9px] font-bold text-indigo-600">
          <Brain className="w-3.5 h-3.5" />
          QueryService Integrated
        </div>
      </div>

      {/* Main chat box */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.map((m, idx) => {
            const isAI = m.role === 'assistant';
            return (
              <div 
                key={idx}
                className={`flex gap-3 max-w-[85%] ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border text-xs font-bold ${
                  isAI ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 ${
                  isAI 
                    ? 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none' 
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}>
                  <p className="whitespace-pre-line">{m.content}</p>
                  <span className={`block text-[8px] font-bold text-right ${isAI ? 'text-slate-400' : 'text-indigo-200'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {isSending && (
            <div className="flex gap-3 max-w-[70%] mr-auto">
              <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center border bg-purple-50 border-purple-100 text-purple-600">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick prompt chips */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-1.5 shrink-0 select-none">
          {suggestionChips.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp)}
              disabled={isSending}
              className="text-[9px] font-bold px-2.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-350 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Text input area */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900/30"
        >
          <input 
            type="text" 
            placeholder="Type your operational question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            className="flex-1 text-xs px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 outline-none disabled:opacity-50 dark:text-slate-100"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow shadow-purple-600/15 active:scale-95 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
