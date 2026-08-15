import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu, Bell, BellOff, Info, AlertTriangle, CheckCircle2, RefreshCw, Sun, Moon, History } from 'lucide-react';
import { useAuth, formatRole } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'alerts'>('activity');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  
  const { user, apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Fetch activity logs for live dropdown feed
  const { data: activityLogs = [], refetch: refetchActivityLogs } = useQuery<any[]>({
    queryKey: ['bell-activity-logs'],
    queryFn: () => apiFetch('/logs/activity?limit=15'),
    enabled: !!user,
  });

  // Realtime Socket connection for activity feed updates
  useEffect(() => {
    if (!user) return;
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(backendUrl);

    const handleSocketUpdate = () => {
      refetchActivityLogs();
    };

    socket.on('notification:received', handleSocketUpdate);
    socket.on('notification:read_sync', handleSocketUpdate);
    socket.on('task:created', handleSocketUpdate);
    socket.on('task:updated', handleSocketUpdate);

    return () => {
      socket.disconnect();
    };
  }, [user, refetchActivityLogs]);

  // Handle outside click to close bell popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleBellClick = () => {
    setBellOpen(!bellOpen);
  };

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Backdrop overlay for mobile screens */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content wrapper */}
      <div className="flex-1 pl-0 lg:pl-64 flex flex-col min-h-screen min-w-0">
        
        {/* Top Header Navigation (desktop & mobile) */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-20 w-full select-none">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 flex items-center justify-center">
                <img src="/logo-transparent-2.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-sm tracking-wider text-gradient">SETU AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all shadow-xs"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Realtime Smart Notification Center Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleBellClick}
                className={`p-2 rounded-xl border transition-all relative ${
                  bellOpen 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/40 dark:border-indigo-800/80 dark:text-indigo-400' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Bell className="w-4 h-4" />

              </button>

              {/* Notification Center Bell Dropdown list */}
              {bellOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-50 animate-fade-in text-slate-800 dark:text-slate-100">
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-indigo-500" />
                      Activity Alerts
                    </span>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-thin select-text p-2 space-y-2">
                    {activityLogs.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                        <History className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-semibold">No activity logs recorded yet.</p>
                      </div>
                    ) : (
                      activityLogs.map((log: any) => (
                        <div 
                          key={log._id} 
                          className="p-2.5 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-1 text-left transition-colors"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                            <span className="text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">{log.action}</span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-normal">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{log.description}</p>
                          <div className="text-[8px] text-slate-400 dark:text-slate-555 font-bold">Actor: {log.username}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{user.name}</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{formatRole(user.role)}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>

        {/* Dynamic global footer */}
        <footer className="py-6 border-t border-slate-200/50 text-center text-xs text-slate-500 font-medium shrink-0">
          All rights reserved by Setu AI by DotnLott {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};
export default Layout;
