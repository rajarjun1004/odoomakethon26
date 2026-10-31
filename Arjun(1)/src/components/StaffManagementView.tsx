import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, Shield, Mail, Key } from 'lucide-react';

interface StaffManagementViewProps {
  onDataChanged?: () => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Brightloop#2026');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const hasMinLength = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isPwdCompliant = hasMinLength && hasUpper && hasLower && hasSpecial;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwdCompliant) {
      setError('Password must satisfy security criteria (>8 chars, Upper, Lower, Symbol).');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.addStaffMember({ name, email, password });
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('Brightloop#2026');
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const staffMembers = users.filter((u) => u.role === 'staff' || u.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Internal Operations Team</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin console: Only the system administrator can invite or provision internal staff accounts
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Members Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Member Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4 text-center">Assigned Role</th>
              <th className="py-3 px-4 text-right">Access Level</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffMembers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <span>{u.name}</span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-block px-2 py-0.5 text-2xs font-bold rounded-md ${
                    u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-slate-500 text-2xs">
                  {u.role === 'admin' ? 'Full System & Financial Authority' : 'Quotes, Invoices & Subscriptions Operations'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ADD STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Provision Staff Account</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-3">
              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Taylor Swift (Ops Rep)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Corporate Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="taylor@brightloop.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Initial Temporary Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 9 chars with Upper, Lower, Symbol"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />

                <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-2xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasMinLength ? '✓' : '○'}
                    </span>
                    <span className={hasMinLength ? 'text-slate-700' : 'text-slate-500'}>More than 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasUpper ? '✓' : '○'}
                    </span>
                    <span className={hasUpper ? 'text-slate-700' : 'text-slate-500'}>Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasLower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasLower ? '✓' : '○'}
                    </span>
                    <span className={hasLower ? 'text-slate-700' : 'text-slate-500'}>Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasSpecial ? '✓' : '○'}
                    </span>
                    <span className={hasSpecial ? 'text-slate-700' : 'text-slate-500'}>Special character</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !isPwdCompliant}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
