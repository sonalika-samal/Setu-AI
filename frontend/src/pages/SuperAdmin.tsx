import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  ShieldCheck,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Key,
  Globe
} from 'lucide-react';

interface Organisation {
  _id: string;
  orgId: string;
  name: string;
  plan: 'trial' | 'starter' | 'pro' | 'enterprise';
  isActive: boolean;
  adminEmail?: string;
  userCount?: number;
  taskCount?: number;
  createdAt: string;
}

export const SuperAdmin: React.FC = () => {
  const { apiFetch } = useAuth();
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    orgId: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: '',
    plan: 'starter',
    metaPhoneNumberId: '',
    sarvamApiKey: ''
  });

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/superadmin/orgs');
      setOrgs(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load organisations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    setFormData(prev => ({
      ...prev,
      name,
      orgId: slug
    }));
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiFetch('/superadmin/orgs', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      setSuccessMsg(`Organisation "${formData.name}" created successfully!`);
      setShowModal(false);
      setFormData({
        name: '',
        orgId: '',
        adminEmail: '',
        adminUsername: '',
        adminPassword: '',
        plan: 'starter',
        metaPhoneNumberId: '',
        sarvamApiKey: ''
      });
      fetchOrgs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create organisation');
    }
  };

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/superadmin/orgs/${orgId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchOrgs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update status');
    }
  };

  const handleUpdatePlan = async (orgId: string, newPlan: string) => {
    try {
      await apiFetch(`/superadmin/orgs/${orgId}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: newPlan })
      });
      fetchOrgs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update plan');
    }
  };

  const filteredOrgs = orgs.filter(
    o => o.name.toLowerCase().includes(search.toLowerCase()) || o.orgId.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = orgs.filter(o => o.isActive).length;
  const totalUsers = orgs.reduce((acc, curr) => acc + (curr.userCount || 0), 0);
  const totalTasks = orgs.reduce((acc, curr) => acc + (curr.taskCount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold">Platform Super Admin</h1>
          </div>
          <p className="text-slate-400 mt-1">Manage platform organisations, SaaS subscriptions, and client tenants.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchOrgs}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition text-slate-300 hover:text-white"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Organisation</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200 font-bold">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200 font-bold">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Organisations</span>
            <Building2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{orgs.length}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Active Tenants</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{activeCount}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Users Across Orgs</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{totalUsers}</div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-sm font-medium">Total Tasks Processed</span>
            <Layers className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-white mt-2">{totalTasks}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-4 bg-slate-800/40 border border-slate-700/40 p-3 rounded-2xl">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search organisation name or orgId..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-white placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Organisations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="py-4 px-6">Organisation</th>
                <th className="py-4 px-6">Org ID</th>
                <th className="py-4 px-6">Plan</th>
                <th className="py-4 px-6">Users</th>
                <th className="py-4 px-6">Tasks</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading organisations...</td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No organisations found.</td>
                </tr>
              ) : (
                filteredOrgs.map(org => (
                  <tr key={org._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6 font-semibold text-white">
                      {org.name}
                      {org.adminEmail && <div className="text-xs text-slate-400 font-normal">{org.adminEmail}</div>}
                    </td>
                    <td className="py-4 px-6 font-mono text-indigo-400">{org.orgId}</td>
                    <td className="py-4 px-6">
                      <select
                        value={org.plan}
                        onChange={e => handleUpdatePlan(org.orgId, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="trial">Trial</option>
                        <option value="starter">Starter</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">{org.userCount || 0}</td>
                    <td className="py-4 px-6">{org.taskCount || 0}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {org.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{org.isActive ? 'Active' : 'Inactive'}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleToggleStatus(org.orgId, org.isActive)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                          org.isActive
                            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {org.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <Building2 className="w-6 h-6 text-indigo-400" />
                <span>Create New Organisation</span>
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4 text-sm">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Organisation Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bajaj Finance"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Org ID (Slug) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bajaj_finance"
                  value={formData.orgId}
                  onChange={e => setFormData({ ...formData, orgId: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Admin Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin_bajaj"
                    value={formData.adminUsername}
                    onChange={e => setFormData({ ...formData, adminUsername: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Admin Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Set password"
                    value={formData.adminPassword}
                    onChange={e => setFormData({ ...formData, adminPassword: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Plan *</label>
                <select
                  value={formData.plan}
                  onChange={e => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="trial">Trial (5 users, 2 depts)</option>
                  <option value="starter">Starter (15 users, 5 depts)</option>
                  <option value="pro">Pro (50 users, 15 depts)</option>
                  <option value="enterprise">Enterprise (Unlimited)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Admin Contact Email</label>
                <input
                  type="email"
                  placeholder="contact@organisation.com"
                  value={formData.adminEmail}
                  onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
