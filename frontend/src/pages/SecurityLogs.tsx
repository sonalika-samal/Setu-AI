import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  History, 
  ShieldAlert, 
  Terminal, 
  UserCheck, 
  AlertOctagon,
  Search,
  Globe,
  Monitor,
  Power,
  LogOut,
  ShieldX
} from 'lucide-react';
import { toast } from 'react-toastify';

interface LoginRecord {
  _id: string;
  username: string;
  ip_address: string;
  user_agent: string;
  status: 'Success' | 'Failed';
  timestamp: string;
}

interface AuditRecord {
  _id: string;
  username: string;
  action: string;
  ip_address: string;
  details: string;
  timestamp: string;
}

interface ActiveSession {
  _id: string;
  user_id: {
    _id: string;
    username: string;
    name: string;
    phone: string;
    role: string;
  } | null;
  token: string;
  expires_at: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const SecurityLogs: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'logins' | 'audits' | 'sessions'>('sessions');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Queries
  const { data: logins = [], isLoading: isLoadingLogins } = useQuery<LoginRecord[]>({
    queryKey: ['login-history'],
    queryFn: () => apiFetch('/auth/login-history'),
    refetchInterval: 15000
  });

  const { data: audits = [], isLoading: isLoadingAudits } = useQuery<AuditRecord[]>({
    queryKey: ['security-logs'],
    queryFn: () => apiFetch('/auth/security-logs'),
    refetchInterval: 15000
  });

  const { data: sessions = [], isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery<ActiveSession[]>({
    queryKey: ['active-sessions'],
    queryFn: () => apiFetch('/auth/sessions'),
    refetchInterval: 15000
  });

  // 2. Mutations
  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiFetch(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Active session successfully terminated.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to revoke session.')
  });

  const forceLogoutMutation = useMutation({
    mutationFn: (userId: string) => apiFetch(`/auth/force-logout/${userId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('User forced to logout from all active sessions.');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to force logout user.')
  });

  // Filter records
  const filteredLogins = logins.filter(l => 
    l.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.ip_address || '').includes(searchQuery)
  );

  const filteredAudits = audits.filter(a => 
    a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.details || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessions = sessions.filter(s => {
    const userObj = s.user_id || {};
    return (userObj.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (userObj.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (s.ip_address || '').includes(searchQuery);
  });

  const handleRevokeSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to terminate this specific login session? The user will be requested to log in again on that browser.')) {
      revokeSessionMutation.mutate(sessionId);
    }
  };

  const handleForceLogout = (userId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userId === user?.id) {
      toast.error('You cannot execute force logout on yourself.');
      return;
    }
    if (window.confirm(`Are you sure you want to force logout user "${name}" from ALL active devices? This resets their credentials validation tokens.`)) {
      forceLogoutMutation.mutate(userId);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 to-amber-500/5 p-6 rounded-2xl border border-rose-500/10 backdrop-blur-sm animate-fade-in shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Security Auditing</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Factual login telemetry logs, session termination logs, password modification tracking, and system audit history.</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-rose-500/10 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold">
          <ShieldAlert className="w-4 h-4" />
          Enterprise Security Monitoring
        </div>
      </div>

      {/* Tab controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('sessions'); setSearchQuery(''); }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'sessions' 
                ? 'bg-white text-slate-800 shadow' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Active Sessions
          </button>
          <button
            onClick={() => { setActiveTab('logins'); setSearchQuery(''); }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'logins' 
                ? 'bg-white text-slate-800 shadow' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Login History
          </button>
          <button
            onClick={() => { setActiveTab('audits'); setSearchQuery(''); }}
            className={`flex items-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'audits' 
                ? 'bg-white text-slate-800 shadow' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Security Audit Trail
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'sessions' ? "Filter sessions..." : activeTab === 'logins' ? "Filter logins..." : "Filter audit events..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none flex-1 text-slate-700 font-medium"
          />
        </div>
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <th className="p-4">Login Time</th>
                  <th className="p-4">User Details</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Client Browser</th>
                  <th className="p-4 text-center">Session Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingSessions ? (
                  [1,2,3].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td colSpan={6} className="p-5 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 italic font-medium">
                      No active login sessions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => {
                    const uObj = session.user_id || { name: 'Unknown User', username: 'unknown', role: 'Worker' };
                    const isSelf = uObj._id === user?.id;

                    return (
                      <tr key={session._id} className="hover:bg-slate-50/50 transition-colors text-slate-600 font-medium">
                        <td className="p-4 text-slate-400 font-bold">
                          {session.created_at ? new Date(session.created_at).toLocaleString('en-IN') : '—'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            {uObj.name}
                            {isSelf && (
                              <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full uppercase">Self</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">{uObj.username}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            uObj.role === 'Owner' 
                              ? 'bg-purple-50 border-purple-100 text-purple-700' 
                              : 'bg-blue-50 border-blue-100 text-blue-700'
                          }`}>
                            {uObj.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            {session.ip_address}
                          </span>
                        </td>
                        <td className="p-4 truncate max-w-xs" title={session.user_agent}>
                          <span className="flex items-center gap-1.5 truncate">
                            <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {session.user_agent}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Revoke single session */}
                            <button
                              onClick={(e) => handleRevokeSession(session._id, e)}
                              className="flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition-all"
                              title="Terminate Session"
                            >
                              <Power className="w-3.5 h-3.5" />
                              Revoke
                            </button>
                            
                            {/* Force logout user from all devices */}
                            {uObj._id && (
                              <button
                                onClick={(e) => handleForceLogout(uObj._id!, uObj.name, e)}
                                disabled={isSelf}
                                className={`flex items-center gap-1 py-1.5 px-3 rounded-lg border font-bold transition-all ${
                                  isSelf 
                                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50' 
                                    : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                                }`}
                                title="Force Logout from all devices"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                Force Logout
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Login History Tab */}
      {activeTab === 'logins' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">User Agent</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLogins ? (
                  [1,2,3].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td colSpan={5} className="p-5 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredLogins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium">
                      No matching login attempts recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogins.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors text-slate-600 font-medium">
                      <td className="p-4 text-slate-400 font-bold">
                        {new Date(log.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-4 text-slate-800 font-bold">
                        {log.username}
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {log.ip_address || 'unknown'}
                        </span>
                      </td>
                      <td className="p-4 truncate max-w-xs" title={log.user_agent}>
                        <span className="flex items-center gap-1.5 truncate">
                          <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {log.user_agent}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          log.status === 'Success' 
                            ? 'bg-emerald-500/10 text-emerald-600' 
                            : 'bg-rose-500/10 text-rose-600 animate-pulse'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auditing Trail Table */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-200">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Security Action</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingAudits ? (
                  [1,2,3].map(n => (
                    <tr key={n} className="animate-pulse">
                      <td colSpan={5} className="p-5 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 italic font-medium">
                      No security audit logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((log) => {
                    const isAlert = ['Password Reset', 'Force Logout', 'Account Disabled', 'Rate Limit Exceeded', 'Session Revoked'].includes(log.action);
                    return (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors text-slate-600 font-medium">
                        <td className="p-4 text-slate-400 font-bold">
                          {new Date(log.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-slate-800 font-bold">
                          {log.username}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isAlert 
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/15' 
                              : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/15'
                          }`}>
                            {isAlert ? <AlertOctagon className="w-3 h-3 shrink-0" /> : <UserCheck className="w-3 h-3 shrink-0" />}
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-slate-400" />
                            {log.ip_address || 'system'}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-700">
                          {log.details}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityLogs;
