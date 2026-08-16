import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  FileText,
  UserCheck,
  TrendingUp,
  Activity,
  ArrowUpDown,
  Download,
  Search,
  Filter,
  X,
  MessageSquare,
  History,
  Terminal,
  ArrowRight,
  Shield,
  Layers,
  Check,
  Info,
  Lock,
  Edit,
  AlertCircle,
  CheckCheck,
  Trash2,
  ExternalLink,
  Users,
  Bell
} from 'lucide-react';

interface Stats {
  total: number;
  open: number;
  started: number;
  details: number;
  completed: number;
  closed: number;
  overdue: number;
  escalated: number;
  online: number;
  offline: number;
  activeToday: number;
}

interface Task {
  _id: string;
  taskId?: string;
  worker_name: string;
  task_msg: string;
  location: string;
  deadline?: string;
  deadline_exact?: boolean;
  task_status: 'Open' | 'Started' | 'More Details Asked' | 'Completed';
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  from_number: string;
  worker_id: string;
  worker_phone: string;
  reminder_time?: string;
  reminder_sent?: boolean;
  owner_name?: string;
  owner_phone?: string;
  priority?: string;
  started_time?: string;
  completed_time?: string;
  last_worker_reply?: string;
  processing_status?: string;
}

interface TimelineEntry {
  _id: string;
  action: string;
  description: string;
  performed_by: string;
  timestamp: string;
}

interface MessageLog {
  _id: string;
  message_id: string;
  sender: string;
  receiver: string;
  direction: 'incoming' | 'outgoing';
  type: string;
  message: string;
  status: string;
  timestamp: string;
}

interface ActivityLog {
  _id: string;
  username: string;
  action: string;
  description: string;
  timestamp: string;
}

interface AILog {
  _id: string;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  execution_time: number;
  timestamp: string;
}

interface ProofUpload {
  _id: string;
  media_id: string;
  media_url?: string;
  mime_type: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  owner_remarks?: string;
  uploaded_at: string;
  audited_at?: string;
  audited_by?: string;
}

interface TaskDetailsResponse {
  task: Task;
  timeline: TimelineEntry[];
  messages: MessageLog[];
  activityLogs: ActivityLog[];
  aiLogs: AILog[];
  proofs?: ProofUpload[];
}

export const Dashboard: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const [socketConnected, setSocketConnected] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter/Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [workerFilter, setWorkerFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Task>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column Width States (Column Resizing)
  const [colWidths, setColWidths] = useState({
    taskId: 120,
    status: 130,
    workerName: 120,
    description: 280,
    location: 150,
    priority: 100,
    deadline: 150,
    reminderStatus: 150,
    created: 150,
    started: 150,
    completed: 150,
    lastReply: 200,
    processing: 130,
    actions: 100,
  });

  // Selected Task for Details Modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'chat' | 'timeline' | 'activity' | 'ai' | 'proof'>('chat');

  // Manual Status Quick Edit States
  const [quickEditTask, setQuickEditTask] = useState<any | null>(null);
  const [quickEditStatusVal, setQuickEditStatusVal] = useState<string>('Open');
  const [quickEditRemarks, setQuickEditRemarks] = useState<string>('');

  // Edit Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    task_msg: '',
    location: '',
    priority: 'Medium',
    deadline: '',
    worker_id: '',
    worker_name: '',
    worker_phone: '',
    notes: '',
  });

  const { data: workersListSelection } = useQuery<any[]>({
    queryKey: ['workers-list-selection'],
    queryFn: () => apiFetch('/auth/workers'),
  });

  useEffect(() => {
    if (editingTask) {
      let formattedDeadline = '';
      if (editingTask.deadline) {
        const d = new Date(editingTask.deadline);
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
        formattedDeadline = adjustedDate.toISOString().slice(0, 16);
      }
      setEditForm({
        task_msg: editingTask.task_msg || '',
        location: editingTask.location || '',
        priority: editingTask.priority || 'Medium',
        deadline: formattedDeadline,
        worker_id: editingTask.worker_id || '',
        worker_name: editingTask.worker_name || '',
        worker_phone: editingTask.worker_phone || '',
        notes: editingTask.notes || '',
      });
    }
  }, [editingTask]);

  // 1. Fetch historical dashboard stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiFetch('/tasks/stats'),
  });

  // 2. Fetch all tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['tasks-list'],
    queryFn: () => apiFetch('/tasks'),
  });



  // 3. Fetch single task details if selected
  const { data: taskDetails, isLoading: detailsLoading } = useQuery<TaskDetailsResponse>({
    queryKey: ['task-details', selectedTaskId],
    queryFn: () => apiFetch(`/tasks/${selectedTaskId}/details`),
    enabled: !!selectedTaskId,
  });

  // 5. Open Task Modal via Redirect Parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openTaskId = params.get('openTaskId');
    if (openTaskId) {
      setSelectedTaskId(openTaskId);
      setDetailTab('chat');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // 4. Socket.IO integration
  useEffect(() => {
    const socket = io('http://localhost:5000');

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Invalidate caches instantly when notifications are received
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['task-details', selectedTaskId] });
      }
    };

    socket.on('task:created', handleUpdate);
    socket.on('task:updated', handleUpdate);
    socket.on('webhook:received', handleUpdate);
    socket.on('message:received', handleUpdate);
    socket.on('message:sent', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient, selectedTaskId]);

  // Extract unique workers list for filter dropdown
  const workersList = useMemo(() => {
    if (!tasks) return [];
    const names = tasks.map(t => t.worker_name).filter(Boolean);
    return Array.from(new Set(names));
  }, [tasks]);

  // Column Resize Drag Handler
  const startColResize = (col: keyof typeof colWidths, startX: number, startWidth: number) => {
    const onMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(60, startWidth + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [col]: newWidth }));
    };
    
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Sort Handler
  const handleSort = (field: keyof Task) => {
    if (!field) return;
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Process sorting, filtering, searching
  const processedTasks = useMemo(() => {
    if (!tasks) return [];

    let result = [...tasks];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        (t.taskId || '').toLowerCase().includes(query) ||
        (t.worker_name || '').toLowerCase().includes(query) ||
        (t.owner_name || '').toLowerCase().includes(query) ||
        (t.task_msg || '').toLowerCase().includes(query) ||
        (t.location || '').toLowerCase().includes(query) ||
        (t.worker_phone || '').includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      result = result.filter(t => t.task_status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      result = result.filter(t => (t.priority || 'Medium') === priorityFilter);
    }

    // Worker filter
    if (workerFilter !== 'ALL') {
      result = result.filter(t => t.worker_name === workerFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';

      if (sortField === 'deadline' || sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'started_time' || sortField === 'completed_time') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, workerFilter, sortField, sortOrder]);

  // Paginated Subset
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedTasks.slice(startIndex, startIndex + pageSize);
  }, [processedTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(processedTasks.length / pageSize) || 1;

  // Export to CSV Function
  const handleExportCSV = () => {
    const headers = [
      'Task ID', 'Task Status', 'Organisation Head Name', 'Organisation Head Phone', 'Staff Member Name', 'Staff Member Phone',
      'Description', 'Location', 'Priority', 'Deadline', 'Reminder Status',
      'Created Time', 'Updated Time', 'Started Time', 'Completed Time', 'Last Staff Member Reply', 'Processing Status'
    ];
    
    const rows = processedTasks.map(t => [
      t.taskId || t._id,
      t.task_status,
      t.owner_name || '',
      t.owner_phone || t.from_number || '',
      t.worker_name || '',
      t.worker_phone || '',
      (t.task_msg || '').replace(/"/g, '""'),
      (t.location || '').replace(/"/g, '""'),
      t.priority || 'Medium',
      t.deadline ? new Date(t.deadline).toISOString() : '',
      t.reminder_sent ? 'Sent' : 'Scheduled',
      new Date(t.timestamp || t.createdAt).toISOString(),
      new Date(t.updatedAt).toISOString(),
      t.started_time ? new Date(t.started_time).toISOString() : '',
      t.completed_time ? new Date(t.completed_time).toISOString() : '',
      (t.last_worker_reply || '').replace(/"/g, '""'),
      t.processing_status || 'success'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `setu_operations_sheet_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await apiFetch(`/tasks/${editingTask._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setShowEditModal(false);
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['task-details', selectedTaskId] });
      }
    } catch (err: any) {
      alert("Failed to update task: " + err.message);
    }
  };

  const handleCloseTask = async (taskId: string) => {
    const notes = window.prompt("Optional closing notes:") || "";
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_status: 'Closed', closing_notes: notes }),
      });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['task-details', taskId] });
    } catch (err: any) {
      alert("Failed to close task: " + err.message);
    }
  };

  const handleDeleteTask = async (taskId: string, displayId: string) => {
    if (!window.confirm(`Are you sure you want to delete task "${displayId}"? This will permanently remove it from the database.`)) {
      return;
    }
    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'DELETE'
      });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  const handleQuickEditStatus = (task: any) => {
    setQuickEditTask(task);
    setQuickEditStatusVal(task.task_status);
    setQuickEditRemarks('');
  };

  const submitQuickEditStatus = async () => {
    if (!quickEditTask) return;
    try {
      await apiFetch(`/tasks/${quickEditTask._id}/status-manual`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: quickEditStatusVal,
          remarks: quickEditRemarks
        })
      });
      setQuickEditTask(null);
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (selectedTaskId) {
        queryClient.invalidateQueries({ queryKey: ['task-details', selectedTaskId] });
      }
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const cards = [
    {
      title: 'Total Tasks',
      value: stats?.total ?? 0,
      icon: FileText,
      color: 'from-indigo-500 via-indigo-600 to-purple-600 border-indigo-500/20 text-white shadow-lg shadow-indigo-500/10',
      textColor: 'text-white',
      labelColor: 'text-indigo-100/90',
      filterId: 'ALL'
    },
    {
      title: 'Open Tasks',
      value: stats?.open ?? 0,
      icon: Clock,
      color: 'from-amber-400 via-amber-500 to-orange-500 border-amber-500/20 text-white shadow-lg shadow-amber-500/10',
      textColor: 'text-white',
      labelColor: 'text-amber-100/90',
      filterId: 'Open'
    },
    {
      title: 'Started Tasks',
      value: stats?.started ?? 0,
      icon: Activity,
      color: 'from-sky-500 via-blue-500 to-indigo-600 border-sky-500/20 text-white shadow-lg shadow-blue-500/10',
      textColor: 'text-white',
      labelColor: 'text-sky-100/90',
      filterId: 'Started'
    },
    {
      title: 'More Details Asked',
      value: stats?.details ?? 0,
      icon: Info,
      color: 'from-pink-500 via-rose-500 to-red-500 border-pink-500/20 text-white shadow-lg shadow-pink-500/10',
      textColor: 'text-white',
      labelColor: 'text-pink-100/90',
      filterId: 'More Details Asked'
    },
    {
      title: 'Completed Tasks',
      value: stats?.completed ?? 0,
      icon: CheckCircle2,
      color: 'from-emerald-400 via-emerald-500 to-teal-500 border-emerald-500/20 text-white shadow-lg shadow-emerald-500/10',
      textColor: 'text-white',
      labelColor: 'text-emerald-100/90',
      filterId: 'Completed'
    }
  ];

  return (
    <div className="space-y-5 text-slate-800 min-w-0 w-full animate-fade-in-up -mt-3">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
        {/* Abstract vector backgrounds */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/[0.03] dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/[0.03] dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mb-20"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌟</span>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-cyan-300 dark:to-indigo-300">{user?.name}</span>!
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-medium max-w-xl">
              You are managing <span className="text-indigo-600 dark:text-cyan-400 font-bold">{stats?.total ?? 0} total tasks</span> across Setu AI operations. There are currently <span className="text-amber-600 dark:text-amber-400 font-bold">{stats?.open ?? 0} open</span> and <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats?.completed ?? 0} completed</span> tasks.
            </p>
          </div>
          
          <div className="flex flex-row items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-start md:justify-end flex-wrap">
            {/* Clock */}
            <div className="bg-slate-50 dark:bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col items-center justify-center font-mono select-none whitespace-nowrap min-w-[130px] h-[48px]">
              <span className="text-sm font-bold text-slate-800 dark:text-cyan-300 tracking-wider whitespace-nowrap leading-tight">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap leading-none">
                {time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {/* Connection Status badge */}
            <div className={`flex items-center justify-center gap-2 border px-4 rounded-xl text-[10px] font-extrabold uppercase tracking-widest bg-white/5 whitespace-nowrap h-[48px] ${
              socketConnected 
                ? 'border-emerald-250/60 text-emerald-600 bg-emerald-50/50 dark:border-emerald-800/30 dark:text-emerald-450 dark:bg-emerald-950/20' 
                : 'border-rose-250/60 text-rose-600 bg-rose-50/50 dark:border-rose-800/30 dark:text-rose-450 dark:bg-rose-950/20'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${socketConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></span>
              <span>{socketConnected ? 'Real-Time Active' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const isActive = statusFilter === card.filterId;
          return (
            <div 
              key={i} 
              onClick={() => { setStatusFilter(card.filterId); setCurrentPage(1); }}
              className={`bg-gradient-to-br ${card.color} border p-2.5 sm:p-4 rounded-xl flex flex-col justify-between h-[84px] sm:h-[96px] transition-all duration-300 cursor-pointer select-none active:scale-[0.98] ${
                isActive 
                  ? 'ring-4 ring-black/25 dark:ring-white/30 scale-[1.03] shadow-xl border-white/40 z-10' 
                  : 'hover:scale-[1.02] hover:shadow-md border-white/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${card.labelColor} line-clamp-1`}>{card.title}</span>
                <div className="p-0.5 sm:p-1 rounded-md bg-white/15 backdrop-blur-xs text-white flex-shrink-0">
                  <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-lg sm:text-2xl font-extrabold tracking-tight ${card.textColor}`}>{card.value}</span>
                <span className={`hidden sm:inline text-[8px] font-bold uppercase tracking-wider ${card.labelColor}`}>Live</span>
              </div>
            </div>
          );
        })}
      </div>


      {/* Main Operations Control Panel: Google Sheets / Airtable style */}
      <div className="glass-panel rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col min-w-0 w-full">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-grow max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input 
                type="text"
                placeholder="Search spreadsheet by ID, Staff Member, Message..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs focus:outline-none focus:border-primary/50 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 text-xs focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-white text-slate-800">All Statuses</option>
                <option value="Open" className="bg-white text-slate-800">Open</option>
                <option value="Started" className="bg-white text-slate-800">Started</option>
                <option value="More Details Asked" className="bg-white text-slate-800">More Details Asked</option>
                <option value="Completed" className="bg-white text-slate-800">Completed</option>
                <option value="Closed" className="bg-white text-slate-800">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={priorityFilter}
                onChange={e => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 text-xs focus:outline-none border-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-white text-slate-800">All Priorities</option>
                <option value="Low" className="bg-white text-slate-800">Low</option>
                <option value="Medium" className="bg-white text-slate-800">Medium</option>
                <option value="High" className="bg-white text-slate-800">High</option>
              </select>
            </div>

            {/* Worker Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select 
                value={workerFilter}
                onChange={e => { setWorkerFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 text-xs focus:outline-none border-none cursor-pointer pr-1 max-w-[120px]"
              >
                <option value="ALL" className="bg-white text-slate-800">All Staff Members</option>
                {workersList.map(name => (
                  <option key={name} value={name} className="bg-white text-slate-800">{name}</option>
                ))}
              </select>
            </div>

            {/* Export CSV */}
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary py-1.5 px-3.5 rounded-xl text-xs font-bold hover:bg-primary/20 transition-all uppercase tracking-wider"
              title="Download filtered dataset to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
        {/* Spreadsheet Data Grid */}
        <div className="overflow-x-auto overflow-y-hidden select-none relative">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="bg-slate-100/75 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 backdrop-blur-md">
              <tr>
                {/* Column Headers */}
                {[
                  { id: 'taskId', label: 'Task ID', field: 'taskId' },
                  { id: 'status', label: 'Status', field: 'task_status' },
                  { id: 'workerName', label: 'Staff Member', field: 'worker_name' },
                  { id: 'description', label: 'Task Description', field: 'task_msg' },
                  { id: 'location', label: 'Location', field: 'location' },
                  { id: 'priority', label: 'Priority', field: 'priority' },
                  { id: 'deadline', label: 'Deadline', field: 'deadline' },
                  { id: 'reminderStatus', label: 'Reminder Status', field: 'reminder_sent' },
                  { id: 'created', label: 'Created', field: 'createdAt' },
                  { id: 'started', label: 'Started', field: 'started_time' },
                  { id: 'completed', label: 'Completed', field: 'completed_time' },
                  { id: 'lastReply', label: 'Last Reply', field: 'last_worker_reply' },
                  { id: 'processing', label: 'Processing Status', field: 'processing_status' },
                  { id: 'actions', label: 'Actions', field: '' }
                ].map(col => (
                  <th 
                    key={col.id}
                    style={{ width: `${colWidths[col.id as keyof typeof colWidths]}px` }}
                    className="p-3 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider relative border-r border-slate-200/50 dark:border-slate-800/50 select-none"
                  >
                    <div 
                      onClick={() => handleSort(col.field as keyof Task)}
                      className="flex items-center justify-between cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span className="truncate">{col.label}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    </div>
                    {/* Resize Handle */}
                    <div 
                      onMouseDown={e => {
                        e.stopPropagation();
                        startColResize(col.id as keyof typeof colWidths, e.clientX, colWidths[col.id as keyof typeof colWidths]);
                      }}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/45 transition-colors z-10"
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-850 bg-white dark:bg-[#0d121f]">
              {tasksLoading ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Synchronizing database records...</span>
                  </td>
                </tr>
              ) : paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500 text-xs">
                    No active tasks match current filter selection.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map(task => (
                  <tr 
                    key={task._id}
                    onClick={() => { setSelectedTaskId(task._id); setDetailTab('chat'); }}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer text-xs text-slate-700 dark:text-slate-300 font-medium group border-b border-slate-100 dark:border-slate-850 ${
                      task.priority === 'High' 
                        ? 'border-l-2 border-l-rose-500 bg-rose-50/5 dark:bg-rose-950/5' 
                        : task.task_status === 'More Details Asked'
                          ? 'border-l-2 border-l-orange-400 bg-orange-50/5 dark:bg-orange-950/5'
                          : ''
                    }`}
                  >
                    {/* Task ID */}
                    <td className="p-3 font-mono text-[10px] text-slate-400 dark:text-slate-500 truncate border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.taskId || task._id}
                    </td>

                    {/* Status */}
                    <td className="p-3 border-r border-slate-150/40 dark:border-slate-800/40">
                      <div className="flex items-center gap-1.5 justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border inline-flex items-center gap-1.5 ${
                          task.task_status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/5'
                            : task.task_status === 'Closed'
                              ? 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5'
                              : task.task_status === 'Started'
                                ? 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400 dark:bg-blue-500/5'
                                : task.task_status === 'More Details Asked'
                                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/5'
                                  : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            task.task_status === 'Completed'
                              ? 'bg-emerald-500'
                              : task.task_status === 'Closed'
                                ? 'bg-slate-400'
                                : task.task_status === 'Started'
                                  ? 'bg-blue-500'
                                  : task.task_status === 'More Details Asked'
                                    ? 'bg-rose-500'
                                    : 'bg-amber-500'
                          }`} />
                          {task.task_status}
                        </span>

                        {(user?.role === 'Owner' || user?.role === 'Admin') && 
                         ['Open', 'Started', 'More Details Asked'].includes(task.task_status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickEditStatus(task);
                            }}
                            className="p-1 text-slate-400 dark:text-slate-550 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit task status inline"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Worker */}
                    <td className="p-3 truncate font-bold text-slate-900 dark:text-slate-200 border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.worker_name ? `${task.worker_name} (${task.worker_phone})` : 'Unassigned'}
                    </td>

                    {/* Task Description */}
                    <td className="p-3 truncate text-slate-700 dark:text-slate-350 group-hover:text-primary transition-colors border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.task_msg}
                    </td>

                    {/* Location */}
                    <td className="p-3 truncate border-r border-slate-150/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-400">
                      {task.location || 'N/A'}
                    </td>

                    {/* Priority */}
                    <td className="p-3 border-r border-slate-150/40 dark:border-slate-800/40">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border inline-flex items-center gap-1.5 ${
                        task.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-450 dark:bg-rose-500/5'
                          : task.priority === 'Low'
                            ? 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5'
                            : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400 dark:bg-amber-500/5'
                      }`}>
                        {task.priority || 'Medium'}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="p-3 truncate text-slate-600 dark:text-slate-400 border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.deadline ? new Date(task.deadline).toLocaleString() : 'N/A'}
                    </td>

                    {/* Reminder Status */}
                    <td className="p-3 border-r border-slate-150/40 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 truncate">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border inline-flex items-center gap-1 ${
                        task.reminder_sent
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-500/5'
                          : 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400 dark:bg-slate-500/5'
                      }`}>
                        {task.reminder_sent ? 'Sent' : 'Scheduled'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="p-3 truncate text-slate-650 dark:text-slate-400 border-r border-slate-150/40 dark:border-slate-800/40">
                      {new Date(task.timestamp || task.createdAt).toLocaleString()}
                    </td>

                    {/* Started */}
                    <td className="p-3 truncate text-slate-655 dark:text-slate-400 border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.started_time ? new Date(task.started_time).toLocaleString() : '-'}
                    </td>

                    {/* Completed */}
                    <td className="p-3 truncate text-slate-655 dark:text-slate-400 border-r border-slate-150/40 dark:border-slate-800/40">
                      {task.completed_time ? new Date(task.completed_time).toLocaleString() : '-'}
                    </td>

                    {/* Last Reply */}
                    <td className="p-3 truncate text-slate-700 dark:text-slate-350 border-r border-slate-150/40 dark:border-slate-800/40 italic font-sans font-normal">
                      {task.last_worker_reply || '-'}
                    </td>

                    {/* Processing Status */}
                    <td className="p-3 border-r border-slate-150/40 dark:border-slate-800/40">
                      <span className={`text-[10px] font-bold ${
                        task.processing_status === 'success' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : task.processing_status === 'failed' 
                            ? 'text-rose-600 dark:text-rose-455' 
                            : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {task.processing_status || 'success'}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="p-3 text-center">
                      {(user?.role === 'Owner' || user?.role === 'Admin') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(task._id, task.taskId || task._id);
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                          title="Delete task permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Spreadsheet Footer / Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="text-center md:text-left">
            Showing <span className="text-slate-800 dark:text-slate-200 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-800 dark:text-slate-200 font-bold">{Math.min(currentPage * pageSize, processedTasks.length)}</span> of <span className="text-slate-800 dark:text-slate-200 font-bold">{processedTasks.length}</span> rows
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-center sm:justify-end">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5 justify-center">
              <span>Rows per page:</span>
              <select 
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-350 text-xs focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value={5} className="dark:bg-slate-800 dark:text-slate-200">5</option>
                <option value={10} className="dark:bg-slate-800 dark:text-slate-200">10</option>
                <option value={20} className="dark:bg-slate-800 dark:text-slate-200">20</option>
                <option value={50} className="dark:bg-slate-800 dark:text-slate-200">50</option>
              </select>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-50 font-bold"
              >
                &lt;&lt;
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-50"
              >
                Next
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-50 font-bold"
              >
                &gt;&gt;
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Drawer / Task Details Panel */}
      {selectedTaskId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity duration-300 select-text">
          <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full shadow-2xl flex flex-col animate-slide-in select-text text-slate-700">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Telemetry details</span>
                  <span className="text-[9px] font-mono bg-slate-200 px-2 py-0.5 rounded text-slate-600">ID: {taskDetails?.task?.taskId || selectedTaskId}</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                  {taskDetails?.task?.task_msg || 'Loading Task Message...'}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTaskId(null)}
                className="p-1.5 rounded-xl bg-slate-200/50 border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-200 px-4 text-xs font-bold">
              {[
                { id: 'chat', label: 'WhatsApp Conversation', icon: MessageSquare },
                { id: 'timeline', label: 'Task Timeline', icon: History },
                { id: 'activity', label: 'Activity Logs', icon: Clock },
                { id: 'ai', label: 'AI LLM Telemetry', icon: Terminal },
                { id: 'proof', label: 'Proof of Work Gallery', icon: CheckCheck }
              ].map(tab => {
                const Icon = tab.icon;
                const active = detailTab === tab.id;
                return (
                  <button 
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
                      active 
                        ? 'border-primary text-primary bg-primary/5 font-extrabold' 
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Body */}
            <div className="flex-grow overflow-y-auto p-6 bg-slate-50/40">
              {detailsLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs">Aggregating telemetry streams...</span>
                </div>
              ) : !taskDetails ? (
                <div className="text-center p-8 text-slate-500 text-xs">
                  Task records failed to load.
                </div>
              ) : (
                <>
                  {/* WhatsApp Conversation Tab */}
                  {detailTab === 'chat' && (
                    <div className="space-y-4">
                      {taskDetails.messages.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
                          No messages logged for this task or worker.
                        </div>
                      ) : (
                        <div className="space-y-3 max-w-xl mx-auto flex flex-col">
                          {taskDetails.messages.map(msg => {
                            const isIncoming = msg.direction === 'incoming';
                            return (
                              <div 
                                key={msg._id}
                                className={`flex flex-col gap-1 w-full max-w-[85%] ${
                                  isIncoming ? 'self-start items-start' : 'self-end items-end'
                                }`}
                              >
                                <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400 capitalize px-2">
                                  {isIncoming ? (taskDetails.task.worker_name || 'Staff Member') : 'Setu AI System'}
                                </span>
                                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-all hover:scale-[1.01] ${
                                  isIncoming 
                                    ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-xs' 
                                    : 'bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 dark:from-indigo-950/20 dark:to-cyan-950/10 border-indigo-500/20 dark:border-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-tr-none shadow-xs shadow-indigo-500/5'
                                }`}>
                                  <p className="whitespace-pre-wrap">{msg.message}</p>
                                </div>
                                <span className="text-[9px] font-mono text-slate-500 px-2 mt-0.5">
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task Timeline Tab */}
                  {detailTab === 'timeline' && (
                    <div className="space-y-6 max-w-md mx-auto relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {taskDetails.timeline.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl -ml-6 bg-white">
                          No timeline milestones logged.
                        </div>
                      ) : (
                        taskDetails.timeline.map((entry, idx) => (
                          <div key={entry._id} className="relative space-y-1">
                            {/* Dot indicator */}
                            <div className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                              entry.action === 'Task Completed'
                                ? 'bg-emerald-500 border-white'
                                : entry.action.includes('Failed')
                                  ? 'bg-rose-500 border-white'
                                  : 'bg-primary border-white'
                            }`} />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-extrabold text-slate-800">{entry.action}</span>
                              <span className="text-[10px] font-mono text-slate-500">{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-600 text-xs leading-relaxed">
                              {entry.description}
                            </p>
                            <span className="text-[9px] text-slate-500 font-bold block pt-0.5 uppercase tracking-wide">
                              Actor: {entry.performed_by}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Activity Logs Tab */}
                  {detailTab === 'activity' && (
                    <div className="space-y-3">
                      {taskDetails.activityLogs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
                          No related system activities logged.
                        </div>
                      ) : (
                        taskDetails.activityLogs.map(log => (
                          <div key={log._id} className="glass-panel p-3.5 rounded-xl border border-slate-200 text-xs flex justify-between gap-4 bg-white">
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-800">{log.action}</span>
                              <p className="text-slate-600">{log.description}</p>
                              <span className="text-[9px] text-slate-500 font-bold block uppercase">User: {log.username}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap align-self-start">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* AI Logs Tab */}
                  {detailTab === 'ai' && (
                    <div className="space-y-4">
                      {taskDetails.aiLogs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
                          No LLM prompt telemetry logs for this context.
                        </div>
                      ) : (
                        taskDetails.aiLogs.map(log => (
                          <div key={log._id} className="glass-panel p-4 rounded-xl border border-slate-200 text-xs space-y-2.5 bg-slate-50">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-[10px] text-slate-500 font-bold">
                              <span>Model: {log.model} ({log.provider})</span>
                              <div className="flex items-center gap-3">
                                <span>Time: {log.execution_time}ms</span>
                                <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Prompt context</span>
                                <pre className="p-2.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[10px] mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                                  {log.prompt}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider block">Response content</span>
                                <pre className="p-2.5 rounded bg-white border border-slate-200 text-primary font-mono text-[10px] mt-1 whitespace-pre-wrap overflow-x-auto max-h-40">
                                  {log.response}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Proof of Work Tab */}
                  {detailTab === 'proof' && (
                    <div className="space-y-6">
                       {!taskDetails.proofs || taskDetails.proofs.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-white">
                          No Proof of Work uploads logged for this task.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                toast.info("Downloading all proof files for this task...");
                                taskDetails.proofs?.forEach((proof, idx) => {
                                  setTimeout(() => {
                                    const link = document.createElement('a');
                                    link.href = proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`;
                                    link.target = '_blank';
                                    link.download = proof.file_name || `proof_${proof.media_id}`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }, idx * 600);
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download All
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {taskDetails.proofs.map((proof) => {
                            const isPending = proof.status === 'Pending';
                            const isApproved = proof.status === 'Approved';
                            const isRejected = proof.status === 'Rejected';
                            
                            // Check if image vs video vs other
                            const isImage = proof.mime_type?.startsWith('image/');
                            const isVideo = proof.mime_type?.startsWith('video/');

                            return (
                              <div key={proof._id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                                {/* Media Container */}
                                <div className="h-48 bg-slate-900 flex items-center justify-center relative group">
                                  {isImage ? (
                                    <img 
                                      src={proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`} 
                                      alt="Proof image" 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : isVideo ? (
                                    <video 
                                      src={proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`} 
                                      controls 
                                      className="w-full h-full object-contain"
                                    />
                                  ) : proof.mime_type?.toLowerCase().includes('pdf') || proof.file_name?.toLowerCase().endsWith('.pdf') ? (
                                    <div className="text-center text-white/70 space-y-2">
                                      <FileText className="w-12 h-12 mx-auto text-rose-400" />
                                      <span className="text-xs font-bold truncate max-w-[200px] block">{proof.file_name || 'Document.pdf'}</span>
                                      <a 
                                        href={proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase tracking-wider"
                                      >
                                        Preview PDF <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="text-center text-white/70 space-y-2">
                                      <FileText className="w-12 h-12 mx-auto text-white/50" />
                                      <span className="text-xs font-mono truncate max-w-[200px] block">{proof.mime_type || 'Unknown File'}</span>
                                      <a 
                                        href={proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-indigo-400 hover:text-indigo-300 text-[10px] font-bold"
                                      >
                                        Open Media Link
                                      </a>
                                    </div>
                                  )}
                                  
                                  {/* Status overlay */}
                                  <div className="absolute top-3 right-3 select-none">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                                      isApproved 
                                        ? 'bg-emerald-500 text-white border-emerald-600' 
                                        : isRejected 
                                          ? 'bg-rose-500 text-white border-rose-600' 
                                          : 'bg-amber-500 text-white border-amber-600 animate-pulse'
                                    }`}>
                                      {proof.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Information & Remarks & Audit details */}
                                <div className="p-4 flex-1 flex flex-col justify-between gap-4 bg-slate-50/50">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                                      <span>ID: {proof.media_id}</span>
                                      <span>Uploaded: {new Date(proof.uploaded_at).toLocaleString('en-IN')}</span>
                                    </div>
                                    
                                    {proof.owner_remarks && (
                                      <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-medium leading-relaxed">
                                        <strong className="block text-slate-700 text-[10px] uppercase font-bold">Audit Remarks</strong>
                                        {proof.owner_remarks}
                                      </div>
                                    )}

                                    {proof.audited_by && (
                                      <span className="block text-[9px] text-slate-400 font-bold uppercase">
                                        Audited by {proof.audited_by} on {proof.audited_at ? new Date(proof.audited_at).toLocaleString() : ''}
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = proof.media_url || `http://localhost:5000/api/proofs/media/${proof.media_id}`;
                                        link.target = '_blank';
                                        link.download = proof.file_name || `proof_${proof.media_id}`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      Download
                                    </button>

                                    {isPending && (user?.role === 'Owner' || user?.role === 'Admin') && (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={async () => {
                                            const remarks = window.prompt("Enter rejection remarks (optional):") || "";
                                            try {
                                              await apiFetch(`/proofs/${proof._id}/audit`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'Rejected', remarks })
                                              });
                                              queryClient.invalidateQueries({ queryKey: ['task-details', selectedTaskId] });
                                            } catch (err: any) {
                                              alert("Failed to reject proof: " + err.message);
                                            }
                                          }}
                                          className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-extrabold uppercase rounded-lg transition-colors"
                                        >
                                          Reject
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const remarks = window.prompt("Enter approval remarks (optional):") || "";
                                            try {
                                              await apiFetch(`/proofs/${proof._id}/audit`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ status: 'Approved', remarks })
                                              });
                                              queryClient.invalidateQueries({ queryKey: ['task-details', selectedTaskId] });
                                            } catch (err: any) {
                                              alert("Failed to approve proof: " + err.message);
                                            }
                                          }}
                                          className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold uppercase rounded-lg transition-colors shadow shadow-emerald-600/10"
                                        >
                                          Approve
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Action buttons panel (only visible to Owner/Admin) */}
            {(user?.role === 'Owner' || user?.role === 'Admin') && taskDetails && (
              <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {/* Close Task button - visible if task is Completed or is escalated/overdue and not already Closed */}
                  {(taskDetails.task.task_status === 'Completed' || taskDetails.task.is_escalated || taskDetails.task.is_overdue) && taskDetails.task.task_status !== 'Closed' && (
                    <button
                      onClick={() => handleCloseTask(taskDetails.task._id)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 hover:shadow-glow text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Close Task
                    </button>
                  )}
                  {/* Edit Task button */}
                  {taskDetails.task.task_status !== 'Closed' && (
                    <button
                      onClick={() => {
                        setEditingTask(taskDetails.task);
                        setShowEditModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Task
                    </button>
                  )}
                </div>
                {taskDetails.task.task_status === 'Closed' && (
                  <div className="text-[10px] text-slate-500 normal-case">
                    Closed by <span className="font-mono text-slate-800 font-bold">{taskDetails.task.closed_by}</span> on {new Date(taskDetails.task.closed_time).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-bold uppercase">
              <span>Setu AI Operations telemetry</span>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                <span>Audited Stream</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-text text-left">
          <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-white/10 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Edit Task Details
              </h3>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTask(null);
                }}
                className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* Task Message */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Task Description</label>
                <textarea
                  value={editForm.task_msg}
                  onChange={e => setEditForm(prev => ({ ...prev, task_msg: e.target.value }))}
                  className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs min-h-[70px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={e => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Deadline</label>
                <input
                  type="datetime-local"
                  value={editForm.deadline}
                  onChange={e => setEditForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs"
                  required
                />
              </div>

              {/* Worker Assignment Dropdown */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Staff Member Assignment</label>
                <select
                  value={editForm.worker_id}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const w = (workersListSelection || []).find(x => x._id === selectedId);
                    if (w) {
                      setEditForm(prev => ({
                        ...prev,
                        worker_id: w._id,
                        worker_name: w.name,
                        worker_phone: w.phone,
                      }));
                    } else {
                      setEditForm(prev => ({
                        ...prev,
                        worker_id: '',
                        worker_name: '',
                        worker_phone: '',
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {(workersListSelection || []).map(w => (
                    <option key={w._id} value={w._id}>
                      {w.name} ({w.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-slate-400 font-medium">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-white bg-black/45 border border-white/10 rounded-lg focus:outline-none focus:border-primary/50 text-xs min-h-[50px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Status Quick Edit Modal */}
      {quickEditTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-text">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary" />
                Quick Edit Task Status
              </h3>
              <button 
                onClick={() => setQuickEditTask(null)}
                className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Task ID</label>
              <span className="font-mono text-xs font-bold text-slate-800">{quickEditTask.taskId || quickEditTask._id}</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Worker</label>
              <span className="text-xs font-bold text-slate-900">{quickEditTask.worker_name || 'Unassigned'}</span>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">New Status</label>
              <select
                value={quickEditStatusVal}
                onChange={e => setQuickEditStatusVal(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="Open">Open</option>
                <option value="Started">Started</option>
                <option value="More Details Asked">More Details Asked</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Remarks / Closing Notes</label>
              <textarea
                value={quickEditRemarks}
                onChange={e => setQuickEditRemarks(e.target.value)}
                placeholder="Add status notes or closing logs..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary/50 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-3 pt-2 justify-end">
              <button
                onClick={() => setQuickEditTask(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitQuickEditStatus}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
