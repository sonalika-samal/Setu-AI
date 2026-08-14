import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { 
  Radio, 
  Clock, 
  Phone, 
  User, 
  MessageSquareCode, 
  ChevronRight, 
  ChevronDown,
  Cpu,
  Wifi,
  WifiOff,
  Search,
  Database
} from 'lucide-react';

interface WebhookLog {
  id: string;
  sender_name: string;
  sender_phone: string;
  message_id: string;
  message_type: string;
  direction: 'incoming' | 'outgoing';
  delivery_status: string;
  timestamp: string;
  processing_status: 'pending' | 'processed' | 'failed';
  payload: any;
}

export const WebhookLogs: React.FC = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch historical webhook logs from backend API
  const { data: historicalLogs, isLoading } = useQuery<WebhookLog[]>({
    queryKey: ['webhook-logs'],
    queryFn: () => apiFetch('/logs/webhooks?limit=100'),
  });

  // Sync state on query load
  useEffect(() => {
    if (historicalLogs) {
      setLogs(historicalLogs);
    }
  }, [historicalLogs]);

  // 2. Connect Socket.IO client for live, real-time updates
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Listen for live WhatsApp webhook events broadcasted by backend
    socket.on('webhook:received', (newLog: WebhookLog) => {
      setLogs((prev) => {
        // Prevent duplicate entries
        if (prev.some((log) => log.id === newLog.id)) return prev;
        return [newLog, ...prev];
      });
      // Invalidate stats cache so stats update instantly
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const filteredLogs = logs.filter(log => 
    log.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.sender_phone?.includes(searchQuery) ||
    log.message_id?.includes(searchQuery) ||
    log.message_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title section with live status indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-wide flex items-center gap-3">
            <Radio className="w-8 h-8 text-primary pulse-active" />
            Meta Webhook Streams
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time HTTP logs tracking incoming payloads and delivery status callbacks</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider border ${
          socketConnected 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {socketConnected ? (
            <>
              <Wifi className="w-4 h-4 pulse-active" />
              Live WebSocket Bound
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              WebSocket Reconnecting...
            </>
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
            placeholder="Search by sender name, phone, message ID, type..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white glass-input"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Database className="w-4 h-4" />
          Showing {filteredLogs.length} logs
        </div>
      </div>

      {/* Logs List Container */}
      <div className="space-y-3">
        {isLoading && logs.length === 0 ? (
          <div className="h-40 flex items-center justify-center glass-panel rounded-2xl border border-white/5">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center glass-panel rounded-2xl border border-white/5 text-slate-500 space-y-2">
            <MessageSquareCode className="w-8 h-8 text-slate-700" />
            <p className="text-sm">No webhook payloads found.</p>
            <p className="text-xs text-slate-600">Send a test message from your WhatsApp business app to trigger webhook events.</p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div 
                key={log.id} 
                className="glass-panel rounded-xl border border-white/5 overflow-hidden transition-all duration-200"
              >
                {/* Header/Row Summary */}
                <div 
                  onClick={() => toggleExpand(log.id)}
                  className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className={`p-2.5 rounded-lg ${
                      log.direction === 'incoming' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-secondary/10 text-secondary'
                    }`}>
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{log.sender_name || 'System Update'}</span>
                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-400 capitalize font-medium">
                          {log.message_type || 'Status update'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {log.sender_phone || 'Meta System'}</span>
                        <span className="hidden sm:inline truncate max-w-[200px]">ID: {log.message_id || 'System Event'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        log.delivery_status === 'received' || log.delivery_status === 'read' || log.delivery_status === 'delivered'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                      }`}>
                        {log.delivery_status || 'Ingested'}
                      </span>
                    </div>
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Raw JSON View */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/45 p-4 space-y-3 font-mono text-xs">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">
                      <span>Payload Body JSON</span>
                      <span className="flex items-center gap-1 text-primary"><Cpu className="w-3 h-3" /> Telemetry Log ID: {log.id}</span>
                    </div>
                    <pre className="overflow-x-auto text-violet-300 p-3 rounded-lg bg-black/30 max-h-96 scrollbar-thin">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default WebhookLogs;
