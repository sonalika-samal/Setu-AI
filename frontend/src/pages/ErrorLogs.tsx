import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Clock, 
  Terminal, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  Search, 
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface ErrorLog {
  id: string;
  code: string;
  message: string;
  status: number;
  timestamp: string;
}

export const ErrorLogs: React.FC = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // 1. Fetch error logs
  const { data: logs, isLoading, error, refetch, isRefetching } = useQuery<ErrorLog[]>({
    queryKey: ['error-logs'],
    queryFn: () => apiFetch('/logs/errors?limit=100'),
    refetchInterval: 15000, // auto-refresh errors list every 15s
  });

  // 2. Clear error logs mutation
  const clearMutation = useMutation({
    mutationFn: () => apiFetch('/logs/errors', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
      queryClient.invalidateQueries({ queryKey: ['error-logs-count'] });
      setShowConfirmClear(false);
    },
  });

  const handleClearLogs = () => {
    clearMutation.mutate();
  };

  const filteredLogs = (logs || []).filter(log => 
    log.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.status?.toString().includes(searchQuery)
  );

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
        Failed to load error logs: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
            System Error Audit Logs
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time recording of HTTP exceptions, API handshakes failure, and server runtime issues</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/5 hover:border-white/10 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {logs && logs.length > 0 && (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/30 text-rose-400 font-bold py-2.5 px-4 rounded-xl text-xs transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Wipe Logs
            </button>
          )}
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute inset-y-0 left-3 my-auto w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code, error message or status..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white glass-input"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-shrink-0">
          <Terminal className="w-4 h-4" />
          Captured {filteredLogs.length} error traces
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmClear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-white/10 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
              <h3 className="text-lg font-bold">Wipe System Logs?</h3>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              This action will permanently delete all captured error logs in MongoDB. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleClearLogs}
                disabled={clearMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5"
              >
                {clearMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Wiping...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center glass-panel rounded-2xl border border-white/5 text-slate-500 space-y-2">
            <ShieldAlert className="w-10 h-10 text-slate-700" />
            <p className="text-sm font-bold text-slate-400">No error logs recorded</p>
            <p className="text-xs text-slate-600 max-w-xs text-center leading-normal">
              Excellent! Your backend APIs are functioning cleanly. Real-time runtime logs arise here when they occur.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isSevere = log.status >= 500;
            return (
              <div 
                key={log.id} 
                className="glass-panel p-5 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-white/5 transition-all duration-200"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                      isSevere 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      STATUS {log.status}
                    </span>

                    {/* Code String */}
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {log.code}
                    </span>
                  </div>

                  {/* Error Message */}
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium break-words leading-relaxed font-mono">
                    {log.message}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono flex-shrink-0 self-end md:self-center">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ErrorLogs;
