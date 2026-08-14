import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Download, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Layers, 
  ChevronRight,
  TrendingUp,
  FileText,
  Printer,
  ShieldAlert,
  CalendarDays,
  Bell
} from 'lucide-react';

interface SummaryData {
  tasks: {
    total: number;
    open: number;
    started: number;
    details: number;
    completed: number;
    closed: number;
    overdue: number;
    escalated: number;
  };
  workers: {
    enabled: number;
    disabled: number;
    available: number;
    unavailable: number;
  };
  departmentPerformance: Array<{
    departmentName: string;
    departmentCode: string;
    totalTasks: number;
    completedTasks: number;
    workersCount: number;
  }>;
  avgCompletionMinutes: number;
  topWorkers: Array<{
    name: string;
    phone: string;
    completed: number;
    active: number;
  }>;
  tasksCreatedTrend: Array<{ label: string; count: number }>;
  tasksCompletedTrend: Array<{ label: string; count: number }>;
  remindersSent: number;
  escalationsCount: number;
}

export const Analytics: React.FC = () => {
  const { apiFetch } = useAuth();

  const { data: summary, isLoading } = useQuery<SummaryData>({
    queryKey: ['analytics-summary'],
    queryFn: () => apiFetch('/analytics/summary'),
    refetchInterval: 30000
  });

  const handleExportCSV = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/analytics/export', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Export failed.');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `setu_analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export CSV report.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !summary) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-28 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const maxTasks = Math.max(...summary.departmentPerformance.map(d => d.totalTasks), 5);
  const totalTasksCount = summary.tasks.total || 1;

  // Pie chart ring segments
  const statuses = [
    { label: 'Open', count: summary.tasks.open, color: '#6366f1' },
    { label: 'Started', count: summary.tasks.started, color: '#f59e0b' },
    { label: 'Details Needed', count: summary.tasks.details, color: '#ec4899' },
    { label: 'Completed', count: summary.tasks.completed, color: '#10b981' },
    { label: 'Closed', count: summary.tasks.closed, color: '#64748b' }
  ].filter(s => s.count > 0);

  let cumulativePercent = 0;
  const pieSegments = statuses.map(s => {
    const percent = (s.count / totalTasksCount) * 100;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    const strokeDash = `${percent} ${100 - percent}`;
    const strokeOffset = 100 - startPercent + 25; 
    return { ...s, strokeDash, strokeOffset };
  });

  // Calculate trends line points
  const maxTrendVal = Math.max(
    ...(summary.tasksCreatedTrend || []).map(t => t.count),
    ...(summary.tasksCompletedTrend || []).map(t => t.count),
    5
  );

  const createdPoints = (summary.tasksCreatedTrend || []).map((t, idx) => {
    const x = 40 + idx * 75;
    const y = 160 - (t.count / maxTrendVal) * 120;
    return `${x},${y}`;
  }).join(' ');

  const completedPoints = (summary.tasksCompletedTrend || []).map((t, idx) => {
    const x = 40 + idx * 75;
    const y = 160 - (t.count / maxTrendVal) * 120;
    return `${x},${y}`;
  }).join(' ');

  const topWorkerMax = Math.max(...(summary.topWorkers || []).map(w => w.completed + w.active), 5);

  return (
    <div className="p-6 space-y-6 print:p-0 print:space-y-4">
      {/* Print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: #1e293b !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full {
            width: 100% !important;
            max-width: 100% !important;
            grid-template-cols: 1fr !important;
          }
        }
      `}</style>

      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 p-6 rounded-2xl border border-emerald-500/10 backdrop-blur-sm no-print">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Reports & Analytics</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Factual operational reports, completion duration averages, and visual team statistics.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Export CSV Report
          </button>
        </div>
      </div>

      {/* Print header banner */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">SETU AI BY DOTNLOTT</h1>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">Enterprise Workforce Management Systems - Operational Report</p>
        <div className="text-[10px] text-slate-400 mt-2 font-bold flex justify-between">
          <span>Date Generated: {new Date().toLocaleString('en-IN')}</span>
          <span>Target Scope: All Active Workforce Channels</span>
        </div>
      </div>

      {/* Top Aggregation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Active Tasks</span>
            <p className="text-2xl font-extrabold text-slate-800">
              {summary.tasks.open + summary.tasks.started + summary.tasks.details}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Open, Started & Asked</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl no-print">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed & Closed</span>
            <p className="text-2xl font-extrabold text-emerald-600">
              {summary.tasks.completed + summary.tasks.closed}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Out of {summary.tasks.total} total</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl no-print">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overdue & Escalated</span>
            <p className={`text-2xl font-extrabold ${summary.tasks.overdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {summary.tasks.overdue} <span className="text-xs font-normal text-slate-400">/ {summary.tasks.escalated} esc</span>
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Require immediate action</span>
          </div>
          <div className={`p-3 rounded-xl no-print ${summary.tasks.overdue > 0 ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Completion Speed</span>
            <p className="text-2xl font-extrabold text-slate-800">
              {summary.avgCompletionMinutes} <span className="text-xs font-normal text-slate-400">mins</span>
            </p>
            <span className="text-[10px] text-slate-500 font-medium">Factual start-to-stop time</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl no-print">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Graphical Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1">
        
        {/* Chart 1: Ring Status breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Task Status Distribution</h2>
            <p className="text-[10px] text-slate-400 font-medium">Visual proportion of active vs closed tasks.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
            {/* SVG Donut Ring chart */}
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                {pieSegments.map((segment, idx) => (
                  <circle
                    key={idx}
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="transparent"
                    stroke={segment.color}
                    strokeWidth="3.2"
                    strokeDasharray={segment.strokeDash}
                    strokeDashoffset={segment.strokeOffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-800">{summary.tasks.total}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Tasks</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-2 flex-1 max-w-xs">
              {statuses.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span>{s.label}</span>
                  </div>
                  <span className="font-bold text-slate-800">{s.count} ({Math.round((s.count / totalTasksCount) * 100)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: 7-Day Completion & Creation Trends Line Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">7-Day Completion & Creation Trends</h2>
            <p className="text-[10px] text-slate-400 font-medium">Factual representation of ingestion vs task completion rates.</p>
          </div>

          <div className="relative pt-2">
            <svg viewBox="0 0 520 200" className="w-full h-auto">
              {/* Grid lines */}
              <line x1="40" y1="40" x2="490" y2="40" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="490" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="160" x2="490" y2="160" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Y Axis Labels */}
              <text x="30" y="45" textAnchor="end" className="text-[10px] fill-slate-400 font-bold">{maxTrendVal}</text>
              <text x="30" y="105" textAnchor="end" className="text-[10px] fill-slate-400 font-bold">{Math.round(maxTrendVal / 2)}</text>
              <text x="30" y="165" textAnchor="end" className="text-[10px] fill-slate-400 font-bold">0</text>

              {/* Created trend polyline */}
              {createdPoints && (
                <>
                  <polyline
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={createdPoints}
                  />
                  {(summary.tasksCreatedTrend || []).map((t, idx) => {
                    const x = 40 + idx * 75;
                    const y = 160 - (t.count / maxTrendVal) * 120;
                    return (
                      <circle key={idx} cx={x} cy={y} r="4.5" fill="#6366f1" stroke="#white" strokeWidth="1.5" />
                    );
                  })}
                </>
              )}

              {/* Completed trend polyline */}
              {completedPoints && (
                <>
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={completedPoints}
                  />
                  {(summary.tasksCompletedTrend || []).map((t, idx) => {
                    const x = 40 + idx * 75;
                    const y = 160 - (t.count / maxTrendVal) * 120;
                    return (
                      <circle key={idx} cx={x} cy={y} r="4.5" fill="#10b981" stroke="#white" strokeWidth="1.5" />
                    );
                  })}
                </>
              )}

              {/* X Axis Labels */}
              {(summary.tasksCreatedTrend || []).map((t, idx) => {
                const x = 40 + idx * 75;
                const label = t.label.split(',')[0] || '';
                return (
                  <text key={idx} x={x} y="185" textAnchor="middle" className="text-[9px] fill-slate-500 font-extrabold">{label}</text>
                );
              })}
            </svg>

            {/* Legends */}
            <div className="flex items-center justify-center gap-6 mt-2 text-[10px] font-bold">
              <div className="flex items-center gap-1.5 text-indigo-600">
                <div className="w-3 h-1 bg-indigo-500 rounded" />
                <span>Tasks Ingested</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <div className="w-3 h-1 bg-emerald-500 rounded" />
                <span>Tasks Completed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart 3: Worker Productivity Horizontal Bars */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Staff Member Productivity (Top 5)</h2>
            <p className="text-[10px] text-slate-400 font-medium">Rankings of agents based on total completed task outputs.</p>
          </div>

          <div className="space-y-4 pt-2">
            {!summary.topWorkers || summary.topWorkers.length === 0 ? (
              <div className="text-center p-4 italic text-xs text-slate-400">No staff member records logged yet.</div>
            ) : (
              summary.topWorkers.map((worker, idx) => {
                const total = worker.completed + worker.active;
                const pctCompleted = total > 0 ? (worker.completed / topWorkerMax) * 100 : 0;
                const pctActive = total > 0 ? (worker.active / topWorkerMax) * 100 : 0;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">{idx + 1}</span>
                        <span className="font-extrabold text-slate-800">{worker.name}</span>
                      </div>
                      <span className="font-bold text-slate-600">
                        {worker.completed} completed <span className="text-[10px] text-slate-400">/ {worker.active} active</span>
                      </span>
                    </div>

                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${pctCompleted}%` }} 
                        className="bg-emerald-500 h-full rounded-l-full transition-all duration-500" 
                        title="Completed Tasks"
                      />
                      <div 
                        style={{ width: `${pctActive}%` }} 
                        className="bg-amber-400 h-full rounded-r-full transition-all duration-500" 
                        title="Active Tasks"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart 4: Department work progress bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Department Tasks & Outputs</h2>
            <p className="text-[10px] text-slate-400 font-medium">Workloads allocated per workforce business unit.</p>
          </div>

          <div className="space-y-3.5 pt-2">
            {summary.departmentPerformance.map((dept, idx) => {
              const workloadPct = (dept.totalTasks / maxTasks) * 100;
              const completedPct = dept.totalTasks > 0 ? (dept.completedTasks / dept.totalTasks) * 100 : 0;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800">{dept.departmentName}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">({dept.departmentCode})</span>
                    </div>
                    <span className="font-bold text-slate-600">
                      {dept.completedTasks} / {dept.totalTasks} Done
                    </span>
                  </div>
                  
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div 
                      style={{ width: `${workloadPct}%` }}
                      className="h-full bg-indigo-500/20 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                    >
                      <div 
                        style={{ width: `${completedPct}%` }}
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Reminders Count, Escalation Count, and Resource Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Reminders & Escalations Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-1 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Operational Reminders & Esc</h2>
            <p className="text-[10px] text-slate-400 font-medium">Total dispatcher telemetry triggers logged.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Reminders Sent
              </span>
              <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{summary.remindersSent ?? 0}</p>
            </div>

            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-center space-y-1">
              <span className="text-[9px] font-black text-rose-400 uppercase tracking-wider flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Escalated Alarms
              </span>
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{summary.escalationsCount ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Workforce Resource Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 md:col-span-2 print:p-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-800">Workforce Resource Summary</h2>
            <p className="text-[10px] text-slate-400 font-medium">Headcounts and active statuses of registered staff members.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enabled</span>
              <p className="text-xl font-extrabold text-slate-800">{summary.workers.enabled}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Disabled</span>
              <p className="text-xl font-extrabold text-rose-600">{summary.workers.disabled}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Available</span>
              <p className="text-xl font-extrabold text-emerald-600">{summary.workers.available}</p>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Unavailable</span>
              <p className="text-xl font-extrabold text-slate-500">{summary.workers.unavailable}</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
