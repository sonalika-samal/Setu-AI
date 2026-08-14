import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  ArrowLeft, 
  Users, 
  Briefcase, 
  Activity, 
  Award,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  User,
  Clock,
  ExternalLink,
  Zap
} from 'lucide-react';

interface Worker {
  _id: string;
  name: string;
  phone: string;
  availability_status: string;
  worker_status: string;
  last_seen?: string;
}

interface Task {
  _id: string;
  taskId: string;
  task_msg: string;
  location: string;
  deadline?: string;
  task_status: string;
  priority: string;
}

interface ActivityLog {
  _id: string;
  username: string;
  action: string;
  description: string;
  timestamp: string;
}

interface DepartmentDetailsData {
  department: {
    _id: string;
    name: string;
    code: string;
    description: string;
    status: 'Active' | 'Inactive';
    created_by: string;
    createdAt: string;
  };
  workers: Worker[];
  activeTasks: Task[];
  recentActivities: ActivityLog[];
  performance: {
    totalCompleted: number;
    completedToday: number;
    totalAssigned: number;
  };
}

export const DepartmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useAuth();

  const { data, isLoading, error } = useQuery<DepartmentDetailsData>({
    queryKey: ['department-details', id],
    queryFn: () => apiFetch(`/departments/${id}/details`),
    refetchInterval: 10000
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 rounded-2xl md:col-span-1"></div>
          <div className="h-32 bg-slate-200 rounded-2xl md:col-span-3"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Failed to load department details</h2>
        <Link to="/departments" className="text-indigo-600 font-bold text-sm inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Departments
        </Link>
      </div>
    );
  }

  const { department, workers, activeTasks, recentActivities, performance } = data;

  // Compute completion rate
  const completionRate = performance.totalAssigned > 0 
    ? Math.round((performance.totalCompleted / performance.totalAssigned) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header Back Link & Title */}
      <div className="flex flex-col gap-3">
        <Link to="/departments" className="text-slate-500 hover:text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Workforce Departments
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">{department.name}</h1>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">
                  {department.code}
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-1 font-medium">{department.description || 'No department description provided.'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${
              department.status === 'Active' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}>
              {department.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase">Total Staff Members</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{workers.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase">Active Workloads</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{activeTasks.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase">Completed Today</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{performance.completedToday}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] font-bold uppercase">Task Success Rate</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{completionRate}%</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid containing details layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Workers List Column */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs xl:col-span-1 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm inline-flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" /> Registered Staff Members ({workers.length})
            </h3>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
            {workers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 italic text-xs">No staff members in this department.</div>
            ) : (
              workers.map(w => (
                <div key={w._id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl transition-all border border-slate-100">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                      {w.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-700 text-xs truncate">{w.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">{w.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      w.availability_status === 'Available' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-[10px] font-bold text-slate-500">{w.availability_status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Tasks list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm inline-flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-slate-400" /> Active Operations ({activeTasks.length})
            </h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {activeTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-xs">No active tasks at this moment.</div>
            ) : (
              activeTasks.map(t => (
                <div key={t._id} className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">{t.taskId}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        t.priority === 'High' 
                          ? 'bg-rose-50 border-rose-100 text-rose-600' 
                          : t.priority === 'Medium'
                          ? 'bg-amber-50 border-amber-100 text-amber-600'
                          : 'bg-slate-50 border-slate-100 text-slate-500'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs font-semibold">{t.task_msg}</p>
                    {t.location && (
                      <div className="text-[10px] text-slate-400 font-semibold">Location: {t.location}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {t.deadline && (
                      <div className="text-right text-[10px] text-slate-400 font-semibold">
                        <div>Deadline</div>
                        <div className="text-slate-600 font-bold">{new Date(t.deadline).toLocaleDateString('en-IN')}</div>
                      </div>
                    )}

                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      t.task_status === 'Started'
                        ? 'bg-blue-100 text-blue-700'
                        : t.task_status === 'More Details Asked'
                        ? 'bg-orange-100 text-orange-700 animate-pulse'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.task_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Recent Activities Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm inline-flex items-center gap-1.5 border-b border-slate-100 pb-3 w-full">
          <Activity className="w-4 h-4 text-slate-400" /> Recent Department Activities
        </h3>

        <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
          {recentActivities.length === 0 ? (
            <div className="text-center py-6 text-slate-400 italic text-xs">No recent actions logged for department staff members.</div>
          ) : (
            recentActivities.map(act => (
              <div key={act._id} className="flex items-start gap-3.5 text-xs text-slate-600">
                <div className="p-1.5 rounded-full bg-slate-100 text-slate-400 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{act.username}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{new Date(act.timestamp).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="font-bold text-slate-700 mt-0.5">{act.action}</div>
                  <p className="text-slate-500 mt-0.5">{act.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetails;
