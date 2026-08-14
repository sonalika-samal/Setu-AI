import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  User, 
  Loader2, 
  Check, 
  CheckCheck
} from 'lucide-react';

interface MessageLog {
  id: string;
  message_id: string;
  sender: string;
  receiver: string;
  direction: 'incoming' | 'outgoing';
  type: string;
  message: string;
  status: string;
  timestamp: string;
}

export const MessageLogs: React.FC = () => {
  const { apiFetch } = useAuth();

  const { data: messages, isLoading, error } = useQuery<MessageLog[]>({
    queryKey: ['message-logs'],
    queryFn: () => apiFetch('/logs/messages?limit=100'),
    refetchInterval: 5000, // Refresh every 5s for live telemetry feel
  });

  if (isLoading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm">
        Failed to load message logs: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Message Telemetry Logs
        </h2>
        <p className="text-slate-400 text-sm mt-1">Ingested WhatsApp chat streams showing full message texts, routes, and Meta delivery confirmations</p>
      </div>

      {/* Message List */}
      <div className="space-y-3">
        {messages?.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center glass-panel rounded-2xl border border-white/5 text-slate-500 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-700" />
            <p className="text-sm">No recorded messages found.</p>
            <p className="text-xs text-slate-600">Simulate incoming/outgoing messages to populate telemetry details.</p>
          </div>
        ) : (
          messages?.map((msg) => {
            const isIncoming = msg.direction === 'incoming';
            return (
              <div 
                key={msg.id} 
                className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="flex gap-4">
                  <div className={`p-2.5 rounded-lg flex-shrink-0 h-fit ${
                    isIncoming 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-secondary/10 text-secondary'
                  }`}>
                    {isIncoming ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {isIncoming ? 'Sender' : 'Receiver'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {isIncoming ? msg.sender : msg.receiver}
                      </span>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500 font-semibold capitalize">
                        {msg.type}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-100 font-medium whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Message ID: {msg.message_id}</p>
                  </div>
                </div>

                <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-end gap-2 text-xs text-slate-400 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 capitalize text-[10px] font-semibold text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                    {msg.status === 'read' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                    ) : msg.status === 'sent' ? (
                      <Check className="w-3.5 h-3.5 text-slate-400" />
                    ) : null}
                    <span>{msg.status || 'Received'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default MessageLogs;
