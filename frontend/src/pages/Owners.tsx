import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, formatRole } from '../context/AuthContext';
import { 
  UserCheck, 
  Lock, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  ShieldAlert,
  UserPlus,
  UserX
} from 'lucide-react';

export const Owners: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const queryClient = useQueryClient();

  const isOwner = user?.role === 'Owner';

  // Dialog / Modal State
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Owner'>('Admin');

  // Fetch Admins & Owners List
  const { data: users, isLoading: usersLoading, error } = useQuery<any[]>({
    queryKey: ['admins-owners-list'],
    queryFn: () => apiFetch('/auth/admins-owners'),
    enabled: isOwner,
  });

  const handleEditClick = (u: any) => {
    setSelectedUserForEdit(u);
    setName(u.name);
    setUsername(u.username);
    setPhone(u.phone);
    setPassword(''); // Leave password empty for edit unless they want to change it
    setRole(u.role);
    setShowAddEditModal(true);
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === user?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiFetch(`/auth/admins-owners/${id}`, {
        method: 'DELETE',
      });
      queryClient.invalidateQueries({ queryKey: ['admins-owners-list'] });
    } catch (err: any) {
      alert("Failed to delete user: " + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name,
        username,
        phone,
        role,
      };

      if (!selectedUserForEdit) {
        if (!password) {
          alert('Password is required when creating a new user.');
          return;
        }
        payload.password = password;
      } else {
        if (password) {
          payload.password = password;
        }
      }

      const url = selectedUserForEdit ? `/auth/admins-owners/${selectedUserForEdit._id}` : '/auth/admins-owners';
      const method = selectedUserForEdit ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setShowAddEditModal(false);
      queryClient.invalidateQueries({ queryKey: ['admins-owners-list'] });
    } catch (err: any) {
      alert("Failed to save user details: " + err.message);
    }
  };

  if (!isOwner) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
          <Lock className="w-8 h-8 text-rose-500 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-wide">Access Restricted</h2>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Only the system **Organisation Head** has permission to view, edit, or register Organisation Administrators and Organisation Heads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800 min-w-0 w-full animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-wide">Administrative Control Center</h2>
          <p className="text-slate-500 text-sm mt-1">Manage Organisation Administrators, Organisation Heads, credentials, and access control permissions</p>
        </div>
        <button
          onClick={() => {
            setSelectedUserForEdit(null);
            setName('');
            setUsername('');
            setPhone('');
            setPassword('');
            setRole('Admin');
            setShowAddEditModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add Organisation Administrator / Organisation Head
        </button>
      </div>

      {/* Admin/Owner Grid Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary" />
            <h3 className="font-extrabold text-slate-900 text-base">Administrative Users</h3>
          </div>
        </div>

        <div className="overflow-x-auto select-none">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[200px]">Full Name</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[180px]">Username</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[180px]">Phone Number</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[150px]">Security Role</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[120px] text-center">Status</th>
                <th className="p-3.5 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-[150px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Synchronizing administration records...</span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-rose-500">
                    <span>Error loading administrator accounts: {(error as Error).message}</span>
                  </td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                    No Organisation Administrators or Organisation Heads found in the control center.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u._id} className="hover:bg-slate-50/50 transition-colors text-xs text-slate-700 font-medium">
                    {/* Full Name */}
                    <td className="p-3.5 font-bold text-slate-900 border-r border-slate-100 truncate">
                      {u.name}
                    </td>

                    {/* Username */}
                    <td className="p-3.5 border-r border-slate-100 text-slate-600 truncate">
                      {u.username}
                    </td>

                    {/* Phone */}
                    <td className="p-3.5 border-r border-slate-100 text-slate-600 truncate">
                      {u.phone}
                    </td>

                    {/* Security Role */}
                    <td className="p-3.5 border-r border-slate-100 font-bold">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        u.role === 'Owner'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {formatRole(u.role)}
                      </span>
                    </td>

                    {/* Account status */}
                    <td className="p-3.5 border-r border-slate-100 text-center font-bold">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        u.account_status === 'Disabled'
                          ? 'bg-rose-100 text-rose-700 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.account_status || 'Enabled'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                          title="Edit administrative credentials"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Status Toggle Button */}
                        <button
                          onClick={async () => {
                            const nextStatus = u.account_status === 'Disabled' ? 'Enabled' : 'Disabled';
                            try {
                              await apiFetch(`/auth/users/${u._id}/status`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: nextStatus })
                              });
                              queryClient.invalidateQueries({ queryKey: ['admins-owners-list'] });
                            } catch (err: any) {
                              alert('Failed to update account status: ' + err.message);
                            }
                          }}
                          disabled={u._id === user?.id}
                          className={`p-1.5 rounded-xl border transition-all ${
                            u._id === user?.id
                              ? 'text-slate-300 border-slate-100 cursor-not-allowed opacity-50'
                              : u.account_status === 'Disabled'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
                                : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                          }`}
                          title={u._id === user?.id ? "Cannot disable yourself" : u.account_status === 'Disabled' ? "Enable Account" : "Disable Account"}
                        >
                          {u.account_status === 'Disabled' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={u._id === user?.id}
                          className={`p-1.5 rounded-xl transition-all ${
                            u._id === user?.id
                              ? 'text-slate-300 cursor-not-allowed opacity-50'
                              : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title={u._id === user?.id ? "Cannot delete yourself" : "Delete user account"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Admin-Owner Modal */}
      {showAddEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 text-slate-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                {selectedUserForEdit ? 'Edit Organisation Administrator / Organisation Head Details' : 'Add New Organisation Administrator / Organisation Head'}
              </h3>
              <button 
                onClick={() => setShowAddEditModal(false)}
                className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Setu Manager"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Login Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. manager123"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Phone Number (with country code)</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +918888888888"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Password {selectedUserForEdit && <span className="text-[10px] font-normal text-slate-400 lowercase italic">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  required={!selectedUserForEdit}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={selectedUserForEdit ? "••••••••" : "Enter password"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Security Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value="Admin">Organisation Administrator</option>
                  <option value="Owner">Organisation Head</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Owners;
