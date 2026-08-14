import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  LogIn, 
  LogOut, 
  Loader2, 
  Edit, 
  X, 
  ShieldAlert, 
  Trash2, 
  UserCheck, 
  UserX,
  Search,
  SlidersHorizontal,
  Download,
  Building,
  ArrowRightLeft,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

export const Workers: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const queryClient = useQueryClient();

  // Dialog State
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('Available');
  const [overrideReason, setOverrideReason] = useState<string>('');

  const [showAddEditWorkerModal, setShowAddEditWorkerModal] = useState(false);
  const [selectedWorkerForEdit, setSelectedWorkerForEdit] = useState<any | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerDeptId, setWorkerDeptId] = useState('');

  // Bulk operation states
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [bulkTargetDeptId, setBulkTargetDeptId] = useState<string>('');

  // Filters State
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Fetch departments for selection
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ['departments-list-workers'],
    queryFn: () => apiFetch('/departments')
  });

  // Fetch Workers List
  const { data: workers = [], isLoading: workersLoading } = useQuery<any[]>({
    queryKey: ['workers-management-list'],
    queryFn: () => apiFetch('/auth/workers'),
  });

  // Fetch Attendance Stats
  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['attendance-summary-stats'],
    queryFn: () => apiFetch('/tasks/workers/attendance-stats'),
  });

  // Handle Realtime Socket Updates
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(backendUrl);

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-stats'] });
    };

    socket.on('task:updated', handleUpdate);
    socket.on('message:received', handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const handleEditClick = (worker: any) => {
    setEditingWorker(worker);
    setOverrideStatus(worker.availability_status || 'Unavailable');
    setOverrideReason('');
  };

  const handleSaveOverride = async () => {
    if (!editingWorker) return;
    try {
      await apiFetch(`/tasks/workers/${editingWorker._id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: overrideStatus,
          reason: overrideReason || 'Manual adjustment by owner'
        })
      });
      setEditingWorker(null);
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-stats'] });
      toast.success('Worker availability status updated successfully.');
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeleteWorker = async (workerId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete worker "${name}"? This will permanently remove them from the database.`)) {
      return;
    }
    try {
      await apiFetch(`/auth/workers/${workerId}`, {
        method: 'DELETE'
      });
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-stats'] });
      toast.success('Worker deleted successfully.');
    } catch (err: any) {
      toast.error("Failed to delete worker: " + err.message);
    }
  };

  // Filter Workers List
  const filteredWorkers = workers.filter(w => {
    const wDeptId = w.department_id?._id || w.department_id || '';
    const matchSearch = w.name.toLowerCase().includes(filterSearch.toLowerCase()) || 
                        w.phone.includes(filterSearch);
    const matchDept = filterDept ? wDeptId === filterDept : true;
    const matchAvailability = filterAvailability ? w.availability_status === filterAvailability : true;
    const matchStatus = filterStatus ? w.worker_status === filterStatus : true;

    return matchSearch && matchDept && matchAvailability && matchStatus;
  });

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedWorkerIds(filteredWorkers.map(w => w._id));
    } else {
      setSelectedWorkerIds([]);
    }
  };

  const handleSelectOne = (workerId: string, checked: boolean) => {
    if (checked) {
      setSelectedWorkerIds(prev => [...prev, workerId]);
    } else {
      setSelectedWorkerIds(prev => prev.filter(id => id !== workerId));
    }
  };

  // Bulk mutations
  const handleBulkStatusChange = async (status: 'Enabled' | 'Disabled') => {
    if (selectedWorkerIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to bulk update status of ${selectedWorkerIds.length} workers to ${status}?`)) {
      return;
    }

    try {
      await apiFetch('/auth/workers/bulk-status', {
        method: 'POST',
        body: JSON.stringify({
          workerIds: selectedWorkerIds,
          status
        })
      });
      setSelectedWorkerIds([]);
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      toast.success('Bulk status updated successfully.');
    } catch (err: any) {
      toast.error('Failed bulk status update: ' + err.message);
    }
  };

  const handleBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkerIds.length === 0 || !bulkTargetDeptId) return;

    try {
      await apiFetch('/departments/move-workers', {
        method: 'PUT',
        body: JSON.stringify({
          workerIds: selectedWorkerIds,
          targetDepartmentId: bulkTargetDeptId
        })
      });
      setSelectedWorkerIds([]);
      setBulkTargetDeptId('');
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      toast.success('Bulk department relocation complete.');
    } catch (err: any) {
      toast.error('Failed bulk relocation: ' + err.message);
    }
  };

  const handleSaveAddEditWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName || !workerPhone) {
      toast.error('Name and phone numbers are required.');
      return;
    }

    try {
      if (selectedWorkerForEdit) {
        // Update
        await apiFetch(`/auth/workers/${selectedWorkerForEdit._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: workerName,
            phone: workerPhone,
            department_id: workerDeptId || undefined
          })
        });
        toast.success('Worker details updated.');
      } else {
        // Create
        await apiFetch('/auth/workers', {
          method: 'POST',
          body: JSON.stringify({
            name: workerName,
            phone: workerPhone,
            department_id: workerDeptId || undefined
          })
        });
        toast.success('New worker successfully registered.');
      }
      setShowAddEditWorkerModal(false);
      queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-summary-stats'] });
    } catch (err: any) {
      toast.error('Failed to save worker: ' + err.message);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredWorkers.length === 0) {
      toast.warning('No records found to export.');
      return;
    }

    const headers = ['Name', 'Phone', 'Department', 'Availability', 'Status', 'Active Tasks', 'Completed Tasks', 'Last Activity', 'Joined Date'];
    const rows = filteredWorkers.map(w => [
      w.name,
      w.phone,
      w.department_name || 'Other',
      w.availability_status || 'Unavailable',
      w.worker_status || 'Enabled',
      w.activeTasksCount || 0,
      w.completedTasksCount || 0,
      w.last_activity || '—',
      w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN') : '—'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Setu_Workers_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statsCards = [
    {
      title: 'Total Staff Members',
      value: stats?.totalWorkers ?? 0,
      icon: Users,
      color: 'from-violet-500 via-purple-600 to-indigo-600 border-violet-500/20 text-white shadow-lg shadow-violet-500/10'
    },
    {
      title: 'Available',
      value: stats?.available ?? 0,
      icon: CheckCircle,
      color: 'from-emerald-400 via-emerald-500 to-teal-500 border-emerald-500/20 text-white shadow-lg shadow-emerald-500/10'
    },
    {
      title: 'Unavailable',
      value: stats?.unavailable ?? 0,
      icon: XCircle,
      color: 'from-rose-500 via-red-500 to-red-600 border-rose-500/20 text-white shadow-lg shadow-rose-500/10'
    },
    {
      title: 'Checked In Today',
      value: stats?.checkedInToday ?? 0,
      icon: LogIn,
      color: 'from-sky-500 via-blue-500 to-indigo-500 border-sky-500/20 text-white shadow-lg shadow-blue-500/10'
    },
    {
      title: 'Checked Out Today',
      value: stats?.checkedOutToday ?? 0,
      icon: LogOut,
      color: 'from-amber-400 via-amber-500 to-orange-500 border-amber-500/20 text-white shadow-lg shadow-amber-500/10'
    }
  ];

  return (
    <div className="space-y-6 text-slate-800 min-w-0 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-wide">Workforce Telemetry & Attendance</h2>
          <p className="text-slate-500 text-sm mt-1">Real-time daily presence audits, availability logs, and task routing warning indicators</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          
          {(user?.role === 'Owner' || user?.role === 'Admin') && (
            <button
              onClick={() => {
                setSelectedWorkerForEdit(null);
                setWorkerName('');
                setWorkerPhone('');
                setWorkerDeptId('');
                setShowAddEditWorkerModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
            >
              <Users className="w-4 h-4" />
              Add New Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((card, idx) => (
          <div 
            key={idx} 
            className={`bg-gradient-to-br ${card.color} border p-5 rounded-2xl flex flex-col justify-between h-[120px] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">{card.title}</span>
              <card.icon className="w-5 h-5 text-white/85" />
            </div>
            <div>
              {statsLoading ? (
                <div className="h-8 w-12 bg-white/20 animate-pulse rounded-md" />
              ) : (
                <span className="text-3xl font-extrabold tracking-tight text-white">{card.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Quick Search */}
          <div className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff member name or phone..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="bg-transparent outline-none flex-1 text-slate-700 font-medium"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none"
          >
            <option value="">All Availabilities</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Enabled">Enabled</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        {/* Selected count info */}
        {selectedWorkerIds.length > 0 && (
          <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 animate-pulse">
            {selectedWorkerIds.length} Selected
          </div>
        )}
      </div>

      {/* Bulk Operations Floating Bar */}
      {selectedWorkerIds.length > 0 && (user?.role === 'Owner' || user?.role === 'Admin') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl animate-bounce">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold">Bulk actions for {selectedWorkerIds.length} selected staff members</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleBulkStatusChange('Enabled')}
              className="flex items-center gap-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-lg transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Enable Selected
            </button>
            <button
              onClick={() => handleBulkStatusChange('Disabled')}
              className="flex items-center gap-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-xs font-bold rounded-lg transition-all"
            >
              <UserX className="w-3.5 h-3.5" />
              Disable Selected
            </button>
            
            {/* Relocation */}
            <form onSubmit={handleBulkTransfer} className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <select
                value={bulkTargetDeptId}
                onChange={(e) => setBulkTargetDeptId(e.target.value)}
                required
                className="bg-transparent border-none text-xs font-semibold outline-none text-white/90 px-1 py-0.5"
              >
                <option value="" className="text-slate-800">Relocate to...</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id} className="text-slate-800">{d.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!bulkTargetDeptId}
                className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-[10px] font-black rounded uppercase tracking-wider transition-all"
              >
                Transfer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Workforce Attendance Grid Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto select-none">
          <table className="w-full text-left border-collapse table-fixed min-w-[1300px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 w-[45px] text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={filteredWorkers.length > 0 && selectedWorkerIds.length === filteredWorkers.length}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 cursor-pointer accent-indigo-600 rounded"
                  />
                </th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[200px]">Staff Member Name</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[150px]">Availability</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[160px]">Active Tasks</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[160px]">Completed Tasks</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[160px]">Last Seen</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[240px]">Last Activity</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[150px]">Joined Date</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[120px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {workersLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Synchronizing staff availability records...</span>
                  </td>
                </tr>
              ) : filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 italic text-xs">
                    No matching staff members found.
                  </td>
                </tr>
              ) : (
                filteredWorkers.map(w => {
                  const isChecked = selectedWorkerIds.includes(w._id);
                  return (
                    <tr key={w._id} className={`hover:bg-slate-50/50 transition-colors text-xs text-slate-700 font-medium group ${
                      isChecked ? 'bg-indigo-50/15' : ''
                    }`}>
                      {/* Selection checkbox */}
                      <td className="p-3 text-center border-r border-slate-100">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleSelectOne(w._id, e.target.checked)}
                          className="w-3.5 h-3.5 cursor-pointer accent-indigo-600 rounded"
                        />
                      </td>

                      {/* Worker Name & Department */}
                      <td className="p-3.5 font-bold text-slate-900 border-r border-slate-100 truncate">
                        {w.name}
                        <div className="text-[10px] font-normal text-slate-400 mt-0.5">{w.phone}</div>
                        <div className="text-[10px] font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          {w.department_name || 'Other'}
                        </div>
                      </td>

                      {/* Availability Status */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              w.availability_status === 'Available'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {w.availability_status || 'Unavailable'}
                            </span>
                            {(user?.role === 'Owner' || user?.role === 'Admin') && (
                              <button
                                onClick={() => handleEditClick(w)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Override Availability Status"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              w.worker_status === 'Enabled' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-rose-100 text-rose-700 animate-pulse'
                            }`}>
                              {w.worker_status || 'Enabled'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Active Tasks */}
                      <td className="p-3.5 border-r border-slate-100 font-bold text-slate-800 text-center">
                        {w.activeTasksCount ?? 0}
                      </td>

                      {/* Completed Tasks */}
                      <td className="p-3.5 border-r border-slate-100 font-bold text-emerald-700 text-center">
                        {w.completedTasksCount ?? 0}
                      </td>

                      {/* Last Seen */}
                      <td className="p-3.5 border-r border-slate-100 text-slate-600 truncate">
                        {w.last_seen ? new Date(w.last_seen).toLocaleString('en-IN') : '—'}
                      </td>

                      {/* Last Activity */}
                      <td className="p-3.5 border-r border-slate-100 text-slate-500 truncate" title={w.last_activity}>
                        {w.last_activity || '—'}
                      </td>

                      {/* Joined Date */}
                      <td className="p-3.5 border-r border-slate-100 text-slate-500 truncate">
                        {w.createdAt ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(w.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Actions Column */}
                      <td className="p-3.5 text-center">
                        {(user?.role === 'Owner' || user?.role === 'Admin') && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedWorkerForEdit(w);
                                setWorkerName(w.name);
                                setWorkerPhone(w.phone);
                                setWorkerDeptId(w.department_id?._id || w.department_id || '');
                                setShowAddEditWorkerModal(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                              title="Edit staff member details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            
                            {/* Enable/Disable status toggler */}
                            <button
                              onClick={async () => {
                                const nextStatus = w.worker_status === 'Enabled' ? 'Disabled' : 'Enabled';
                                try {
                                  await apiFetch(`/auth/users/${w._id}/status`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: nextStatus })
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['workers-management-list'] });
                                  toast.success(`Worker status toggled to ${nextStatus}.`);
                                } catch (err: any) {
                                  toast.error('Failed to toggle worker status: ' + err.message);
                                }
                              }}
                              className={`p-1.5 rounded-xl border transition-all ${
                                w.worker_status === 'Enabled'
                                  ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                              }`}
                              title={w.worker_status === 'Enabled' ? 'Disable Staff Member' : 'Enable Staff Member'}
                            >
                              {w.worker_status === 'Enabled' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteWorker(w._id, w.name)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-55 rounded-xl transition-all"
                              title="Delete staff member permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Availability Override Modal */}
      {editingWorker && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base">Override Staff Member Availability</h3>
              <button onClick={() => setEditingWorker(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-wider">Availability Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-slate-50 font-bold focus:border-primary"
                >
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-wider">Adjustment Reason</label>
                <textarea
                  placeholder="Provide brief notes regarding this status override..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-slate-50 font-bold focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingWorker(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOverride}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Save Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Worker Modal */}
      {showAddEditWorkerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSaveAddEditWorker} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base">
                {selectedWorkerForEdit ? 'Edit Staff Member Profile' : 'Register New Staff Member'}
              </h3>
              <button type="button" onClick={() => setShowAddEditWorkerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-wider">Staff Member Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  required
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-slate-50 font-bold focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-wider">Phone Number (WhatsApp Format)</label>
                <input
                  type="text"
                  placeholder="e.g. 7846969508"
                  value={workerPhone}
                  onChange={(e) => setWorkerPhone(e.target.value)}
                  required
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-slate-50 font-bold focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 uppercase tracking-wider">Department Assignment</label>
                <select
                  value={workerDeptId}
                  onChange={(e) => setWorkerDeptId(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-slate-700 bg-slate-50 font-bold focus:border-primary"
                >
                  <option value="">Other / Unassigned</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEditWorkerModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Workers;
