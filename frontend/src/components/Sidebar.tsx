import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth, formatRole } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  UserCheck, 
  Radio, 
  MessageSquare, 
  ShieldAlert, 
  KeyRound, 
  Settings, 
  History,
  LogOut,
  Sparkles,
  X,
  Building,
  BarChart3,
  Lock,
  Images
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, logout, apiFetch } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch count of error logs periodically (every 15s)
  const { data: errorCountData } = useQuery<{ count: number }>({
    queryKey: ['error-logs-count'],
    queryFn: () => apiFetch('/logs/errors/count').catch(() => ({ count: 0 })),
    refetchInterval: 15000,
    enabled: !!user,
  });

  const errorCount = errorCountData?.count || 0;

  const navItems = [
    ...(user?.role?.toLowerCase() === 'superadmin' ? [{ name: 'Super Admin', path: '/superadmin', icon: ShieldAlert }] : []),
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Staff Members', path: '/workers', icon: Users },
    { name: 'Departments', path: '/departments', icon: Building },
    { name: 'Proof Gallery', path: '/proof-gallery', icon: Images },
    ...(user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'superadmin' ? [{ name: 'Organisation Heads', path: '/owners', icon: UserCheck }] : []),
    { name: 'Webhook Logs', path: '/webhook-logs', icon: Radio },
    { name: 'Message Logs', path: '/message-logs', icon: MessageSquare },
    { name: 'Error Logs', path: '/error-logs', icon: ShieldAlert },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'AI Assistant', path: '/ai-chat', icon: Sparkles },
    ...(user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'superadmin' ? [
      { name: 'Credentials', path: '/credentials', icon: KeyRound },
      { name: 'Security Logs', path: '/security-logs', icon: Lock }
    ] : []),
    ...(user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin' ? [{ name: 'Settings', path: '/settings', icon: Settings }] : []),
  ];

  return (
    <aside className={`w-64 glass-panel border-r border-border h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
            <img src="/logo-transparent-2.png" alt="Setu AI Logo" className="w-[170%] h-[170%] max-w-none object-cover" />
          </div>
          <div className="pt-1">
            <h1 className="font-extrabold text-lg leading-tight tracking-wider text-gradient">SETU AI</h1>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">by DotnLott</span>
          </div>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isErrorLogs = item.path === '/error-logs';
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-gradient-to-r from-primary/10 to-secondary/5 text-primary border-l-2 border-primary shadow-sm font-bold' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/75 dark:hover:bg-slate-800/60'}
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              
              {isErrorLogs && errorCount > 0 && (
                <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
                  {errorCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
 
      {/* Profile & Logout */}
      <div className="p-4 border-t border-border dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="truncate">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-250 truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{formatRole(user?.role)}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10"></div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-rose-500/10 hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
export default Sidebar;

