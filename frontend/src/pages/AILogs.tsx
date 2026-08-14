import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Cpu, Clock, Terminal, ChevronRight, Zap, Loader2 } from 'lucide-react';

interface AILog {
  id: string;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  execution_time: number;
  timestamp: string;
}

export const AILogs: React.FC = () => {
  const { apiFetch } = useAuth();

  const { data: logs, isLoading, error } = useQuery<AILog[]>({
    queryKey: ['ai-logs'],
    queryFn: () => apiFetch('/logs/ai?limit=100'),
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
        Failed to load AI telemetry logs: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
          <Cpu className="w-8 h-8 text-primary animate-pulse" />
          AI Engine Telemetry
        </h2>
        <p className="text-slate-400 text-sm mt-1">Prompt ingestion parameters, LLM model classifications, and API execution latencies</p>
      </div>

      {/* List */}
      <div className="space-y-4">
        {logs?.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center glass-panel rounded-2xl border border-white/5 text-slate-500 space-y-2">
            <Cpu className="w-8 h-8 text-slate-700" />
            <p className="text-sm">No AI logs available.</p>
            <p className="text-xs text-slate-600">AI pipelines (Sarvam, OpenAI, Gemini) will write telemetry here in future phases.</p>
          </div>
        ) : (
          logs?.map((log) => (
            <div 
              key={log.id} 
              className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4"
            >
              {/* Header metrics */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-[#8b5cf6]/10 text-[#a78bfa] border border-[#8b5cf6]/10 text-xs font-bold uppercase tracking-wider">
                    {log.provider}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Model: {log.model}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-400" /> {log.execution_time} ms</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {/* Grid content prompt vs response */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/25 border border-white/5 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <Terminal className="w-3.5 h-3.5" /> Ingested Input Prompt
                  </div>
                  <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {log.prompt}
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-black/25 border border-white/5 space-y-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    <ChevronRight className="w-3.5 h-3.5" /> Extracted Structure Response
                  </div>
                  <p className="text-xs text-[#a78bfa] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {log.response}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default AILogs;
