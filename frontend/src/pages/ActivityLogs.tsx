import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { History, User, Clock, ShieldAlert, Loader2 } from 'lucide-react';

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  description: string;
  timestamp: string;
}

export const ActivityLogs: React.FC = () => {
  const { apiFetch } = useAuth();

  const { data: logs, isLoading, error } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs'],
    queryFn: () => apiFetch('/logs/activity?limit=100'),
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
        Failed to load activity logs: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-wide flex items-center gap-3">
          <History className="w-8 h-8 text-primary" />
          User Activity Audit Trail
        </h2>
        <p className="text-slate-400 text-sm mt-1">Audit log of developer, Organisation Administrator, and Organisation Head configurations updates and session handshakes</p>
      </div>

      {/* Audit List */}
      <div className="space-y-2">
        {logs?.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center glass-panel rounded-2xl border border-white/5 text-slate-500 space-y-2">
            <History className="w-8 h-8 text-slate-700" />
            <p className="text-sm">No activity logs recorded.</p>
            <p className="text-xs text-slate-600">Actions taken inside this control panel are audited here.</p>
          </div>
        ) : (
          logs?.map((log) => (
            <div 
              key={log.id} 
              className="glass-panel p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center hover:bg-white/5 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-[#a78bfa] uppercase tracking-wide bg-primary/10 border border-primary/10 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                    <User className="w-3.5 h-3.5 text-slate-500" /> {log.username}
                  </span>
                </div>
                <p className="text-sm text-slate-200 font-medium">{log.description}</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default ActivityLogs;
