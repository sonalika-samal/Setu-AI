import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  UserCheck, 
  UserX,
  Search,
  SlidersHorizontal,
  FolderLock,
  Layers,
  FolderOpen,
  Users,
  CheckCircle2,
  XCircle,
  Briefcase,
  Award,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  status: 'Active' | 'Inactive';
  created_by: string;
}

interface Worker {
  _id: string;
  name: string;
  phone: string;
  availability_status: 'Available' | 'Unavailable';
  worker_status: 'Enabled' | 'Disabled';
  activeTasks?: number;
}

export const Departments: React.FC = () => {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({ OTHER: true });

  // Dialog states
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '' });

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingWorker, setMovingWorker] = useState<Worker | null>(null);
  const [targetDeptId, setTargetDeptId] = useState('');

  // 1. Queries
  const { data: departments = [], isLoading: isLoadingDepts } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn: () => apiFetch('/departments')
  });

  const { data: workers = [], isLoading: isLoadingWorkers } = useQuery<Worker[]>({
    queryKey: ['workers'],
    queryFn: () => apiFetch('/auth/workers')
  });

  const { data: summaryStats = [] } = useQuery<any[]>({
    queryKey: ['department-summary-stats'],
    queryFn: () => apiFetch('/departments/summary-stats'),
    refetchInterval: 10000
  });

  const totalWorkers = summaryStats.reduce((acc, d) => acc + (d.totalWorkers || 0), 0);
  const availableWorkers = summaryStats.reduce((acc, d) => acc + (d.availableWorkers || 0), 0);
  const unavailableWorkers = totalWorkers - availableWorkers;
  const activeTasksCount = summaryStats.reduce((acc, d) => acc + (d.activeTasks || 0), 0);
  const completedTodayCount = summaryStats.reduce((acc, d) => acc + (d.completedToday || 0), 0);

  // 2. Mutations
  const createDeptMutation = useMutation({
    mutationFn: (data: typeof deptForm) => apiFetch('/departments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '' });
      toast.success('Department created successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create department.')
  });

  const updateDeptMutation = useMutation({
    mutationFn: (data: { id: string; body: Partial<Department> }) => 
      apiFetch(`/departments/${data.id}`, { method: 'PUT', body: JSON.stringify(data.body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsDeptModalOpen(false);
      setEditingDept(null);
      toast.success('Department updated successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update department.')
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/departments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Department deleted. Workers moved to "Other".');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete department.')
  });

  const moveWorkersMutation = useMutation({
    mutationFn: (data: { workerIds: string[]; targetDepartmentId: string }) => 
      apiFetch('/departments/move-workers', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      setIsMoveModalOpen(false);
      setMovingWorker(null);
      toast.success('Worker moved successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to move worker.')
  });

  const toggleWorkerStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: 'Enabled' | 'Disabled' }) => 
      apiFetch(`/auth/users/${data.id}/status`, { method: 'PUT', body: JSON.stringify({ status: data.status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workers'] });
      toast.success('Worker status updated successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to toggle status.')
  });

  const toggleDeptStatusMutation = useMutation({
    mutationFn: (data: { id: string; status: 'Active' | 'Inactive' }) => 
      apiFetch(`/departments/${data.id}`, { method: 'PUT', body: JSON.stringify({ status: data.status }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department status updated successfully!');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to toggle department status.')
  });

  // Helpers
  const toggleExpand = (code: string) => {
    setExpandedDepts(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleOpenCreate = () => {
    setEditingDept(null);
    setDeptForm({ name: '', code: '', description: '' });
    setIsDeptModalOpen(true);
  };

  const handleOpenEdit = (dept: Department, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDept(dept);
    setDeptForm({ name: dept.name, code: dept.code, description: dept.description });
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDept) {
      updateDeptMutation.mutate({ id: editingDept._id, body: deptForm });
    } else {
      createDeptMutation.mutate(deptForm);
    }
  };

  const handleDeleteDept = (id: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (code === 'OTHER') {
      toast.error('The default "Other" department cannot be deleted.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this department? All workers will be relocated to the "Other" department.')) {
      deleteDeptMutation.mutate(id);
    }
  };

  const handleOpenMove = (worker: Worker, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovingWorker(worker);
    setTargetDeptId('');
    setIsMoveModalOpen(true);
  };

  const handleSaveMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (movingWorker && targetDeptId) {
      moveWorkersMutation.mutate({
        workerIds: [movingWorker._id],
        targetDepartmentId: targetDeptId
      });
    }
  };

  const handleToggleWorkerStatus = (worker: Worker, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = worker.worker_status === 'Enabled' ? 'Disabled' : 'Enabled';
    toggleWorkerStatusMutation.mutate({ id: worker._id, status: nextStatus });
  };

  const handleToggleDeptStatus = (dept: Department, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = dept.status === 'Active' ? 'Inactive' : 'Active';
    toggleDeptStatusMutation.mutate({ id: dept._id, status: nextStatus });
  };

  // Grouping workers by department
  const getWorkersForDept = (deptId: string) => {
    return workers.filter(w => {
      const wAny = w as any;
      const wDeptId = wAny.department_id?._id || wAny.department_id;
      const matchSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          w.phone.includes(searchQuery);
      return wDeptId === deptId && matchSearch;
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/5 p-6 rounded-2xl border border-indigo-500/10 backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Building className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Workforce Departments</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Manage corporate organizational units, relocate staff members, and set work status controls.</p>
        </div>
        
        <button 
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Department
        </button>
      </div>

      {/* Search Filter Controls */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm max-w-md">
        <Search className="w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search staff members in departments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs outline-none bg-transparent text-slate-700"
        />
      </div>

      {/* Department Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Staff Members</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{totalWorkers}</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Available</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{availableWorkers}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Unavailable</div>
            <div className="text-xl font-black text-slate-500 mt-0.5">{unavailableWorkers}</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Tasks</div>
            <div className="text-xl font-black text-indigo-600 mt-0.5">{activeTasksCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Completed Today</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{completedTodayCount}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
            <Award className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Collapsible Lists */}
      <div className="space-y-4">
        {departments.map((dept) => {
          const deptWorkers = getWorkersForDept(dept._id);
          const isExpanded = !!expandedDepts[dept.code];

          return (
            <div 
              key={dept._id} 
              className={`glass-panel border rounded-2xl overflow-hidden transition-all duration-300 ${
                isExpanded ? 'border-indigo-300 dark:border-indigo-800 shadow-md bg-white dark:bg-slate-900/30' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/10'
              }`}
            >
              {/* Collapsible Header */}
              <div 
                onClick={() => toggleExpand(dept.code)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none"
              >
                <div className="flex items-center gap-4">
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{dept.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider">{dept.code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        dept.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                      }`}>{dept.status}</span>
                    </div>
                    {dept.description && (
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-slate-800/80 px-2.5 py-1 rounded-full">
                    {deptWorkers.length} Staff Members
                  </span>
                  
                  {/* Department Control Actions */}
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Link 
                      to={`/departments/${dept._id}`}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
                      title="View Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    {dept.code !== 'OTHER' && (
                      <>
                        <button 
                          onClick={(e) => handleToggleDeptStatus(dept, e)}
                          className={`px-2 py-1 rounded-lg border text-[10px] font-extrabold uppercase transition-all ${
                            dept.status === 'Active' 
                              ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' 
                              : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {dept.status === 'Active' ? 'Disable' : 'Enable'}
                        </button>
                        <button 
                          onClick={(e) => handleOpenEdit(dept, e)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteDept(dept._id, dept.code, e)}
                          className="p-1.5 rounded-lg border border-rose-100 bg-rose-50/50 text-rose-600 hover:bg-rose-100 transition-colors"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsed Workers List */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/20 p-4">
                  {deptWorkers.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic text-center py-4">No staff members matched in this department.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {deptWorkers.map((worker) => {
                        const activeTasks = (worker as any).activeTasks || 0;
                        return (
                          <div 
                            key={worker._id} 
                            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow flex items-start justify-between gap-3"
                          >
                            <div className="space-y-2 flex-1">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200">{worker.name}</h3>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                    worker.worker_status === 'Enabled' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                  }`}>
                                    {worker.worker_status}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{worker.phone}</p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                                  worker.availability_status === 'Available' 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                }`}>
                                  {worker.availability_status}
                                </span>
                                
                                {activeTasks > 0 ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                    {activeTasks} Active Tasks
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
                                    Idle
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Worker Relocate/Relocation Actions */}
                            <div className="flex flex-col gap-1.5">
                              <button 
                                onClick={(e) => handleOpenMove(worker, e)}
                                title="Move Department"
                                className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => handleToggleWorkerStatus(worker, e)}
                                title={worker.worker_status === 'Enabled' ? 'Disable Staff Member' : 'Enable Staff Member'}
                                className={`p-2 rounded-lg border transition-colors ${
                                  worker.worker_status === 'Enabled' 
                                    ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100' 
                                    : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                                }`}
                              >
                                {worker.worker_status === 'Enabled' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create / Edit Department Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <h2 className="text-base font-extrabold text-slate-800">
              {editingDept ? `Edit Department: ${editingDept.name}` : 'Create Department'}
            </h2>
            <form onSubmit={handleSaveDept} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Department Name</label>
                <input 
                  type="text" 
                  value={deptForm.name}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g. Electrical, Sales"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Department Code</label>
                <input 
                  type="text" 
                  value={deptForm.code}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  placeholder="e.g. ELEC, SALES"
                  disabled={editingDept?.code === 'OTHER'}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <textarea 
                  value={deptForm.description}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide department purpose details..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsDeptModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/15"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Worker Relocate Modal */}
      {isMoveModalOpen && movingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Relocate Staff Member</h2>
              <p className="text-[11px] text-slate-400 font-medium">Select a department to move **{movingWorker.name}**.</p>
            </div>
            
            <form onSubmit={handleSaveMove} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Department</label>
                <select 
                  value={targetDeptId}
                  onChange={(e) => setTargetDeptId(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsMoveModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!targetDeptId}
                  className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/15 disabled:opacity-50"
                >
                  Move Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
