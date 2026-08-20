import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, UserX, UserCheck, MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { safeFetch, parseResponseJson } from '../utils/safeFetch';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Sales Associate');
  const [status, setStatus] = useState('active');

  const roles = ['Admin', 'Inventory Manager', 'Sales Associate', 'Auditor'];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await safeFetch('/api/users');
      const data = await parseResponseJson(res);
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (err: any) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await safeFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });
      await parseResponseJson(res);
      toast.success('User added successfully');
      setIsAddModalOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to add user: ' + err.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await safeFetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, status }),
      });
      await parseResponseJson(res);
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to update user: ' + err.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await safeFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      await parseResponseJson(res);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to delete user: ' + err.message);
    }
  };

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      const res = await safeFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await parseResponseJson(res);
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'disabled'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('Sales Associate');
    setStatus('active');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setRole(user.role || 'Sales Associate');
    setStatus(user.status || 'active');
    setIsEditModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-600" />
            User Management & Permissions
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl">
            Manage staff accounts, assign roles, and enforce access control across the enterprise.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl transition-all shadow-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="p-4 pl-6">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <Users className="w-12 h-12 text-gray-300 mb-3" />
                    <p>No staff accounts found.</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{user.email}</p>
                    </td>
                    <td className="p-4 hidden sm:table-cell text-gray-600 text-sm">{user.email}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                        {user.status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 space-x-2">
                      <button
                        onClick={() => toggleStatus(user)}
                        title={user.status === 'active' ? "Disable User" : "Activate User"}
                        className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"
                      >
                        {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        title="Edit Role/Status"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        title="Delete User"
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add New Staff</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="e.g. jane@xlncexotichomes.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Sales Associates cannot view cost prices, profit margins, or supplier information.
                </p>
              </div>
              
              <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-xl shadow-sm transition-all"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit Permissions</h2>
              <button onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-5 sm:p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">Updating access for <strong className="text-gray-900">{selectedUser.name}</strong> ({selectedUser.email})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              
              <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
