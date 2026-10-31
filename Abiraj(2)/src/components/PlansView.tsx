import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { SubscriptionPlan } from '../types';
import { useAuth } from '../context/AuthContext';
import { Layers, Plus, Check, X, Shield, Calendar } from 'lucide-react';

interface PlansViewProps {
  onDataChanged?: () => void;
}

export const PlansView: React.FC<PlansViewProps> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState('');
  const [billingCadence, setBillingCadence] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [baseCost, setBaseCost] = useState('490');
  const [minQuantity, setMinQuantity] = useState('1');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [autoCloseOnEnd, setAutoCloseOnEnd] = useState(false);
  const [allowEarlyClose, setAllowEarlyClose] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenew, setAllowRenew] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data.plans);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setName('');
    setBillingCadence('monthly');
    setBaseCost('490');
    setMinQuantity('1');
    setValidFrom('');
    setValidUntil('');
    setAutoCloseOnEnd(false);
    setAllowEarlyClose(true);
    setAllowPause(true);
    setAllowRenew(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setBillingCadence(plan.billing_cadence);
    setBaseCost(String(plan.base_cost));
    setMinQuantity(String(plan.min_quantity));
    setValidFrom(plan.valid_from || '');
    setValidUntil(plan.valid_until || '');
    setAutoCloseOnEnd(Boolean(plan.auto_close_on_end));
    setAllowEarlyClose(Boolean(plan.allow_early_close));
    setAllowPause(Boolean(plan.allow_pause));
    setAllowRenew(Boolean(plan.allow_renew));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, {
          name,
          billing_cadence: billingCadence,
          base_cost: Number(baseCost),
          min_quantity: Number(minQuantity),
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          auto_close_on_end: autoCloseOnEnd,
          allow_early_close: allowEarlyClose,
          allow_pause: allowPause,
          allow_renew: allowRenew,
          is_active: editingPlan.is_active
        });
      } else {
        await api.createPlan({
          name,
          billing_cadence: billingCadence,
          base_cost: Number(baseCost),
          min_quantity: Number(minQuantity),
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          auto_close_on_end: autoCloseOnEnd,
          allow_early_close: allowEarlyClose,
          allow_pause: allowPause,
          allow_renew: allowRenew
        });
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Subscription Plans & Rules</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadence configuration (daily, weekly, monthly, yearly) and plan lifecycle governance rules
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Plan</span>
          </button>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {p.billing_cadence}
                </span>
                <span className="text-2xs font-mono text-slate-400">Min Qty: {p.min_quantity}</span>
              </div>

              <h3 className="mt-2 text-base font-bold text-slate-900">{p.name}</h3>

              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  ${p.base_cost.toFixed(2)}
                </span>
                <span className="text-2xs text-slate-500">/{p.billing_cadence}</span>
              </div>

              {/* Lifecycle Rules Checklist */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-2xs space-y-2">
                <span className="font-semibold text-slate-600 block uppercase tracking-wider">
                  Plan Lifecycle Rules:
                </span>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Allow Pausing:</span>
                  <span className={p.allow_pause ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {p.allow_pause ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Allow Early Close:</span>
                  <span className={p.allow_early_close ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {p.allow_early_close ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Allow Renewal:</span>
                  <span className={p.allow_renew ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                    {p.allow_renew ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Auto-close on End:</span>
                  <span className={p.auto_close_on_end ? 'text-indigo-700 font-bold' : 'text-slate-400'}>
                    {p.auto_close_on_end ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-5 pt-3 border-t border-slate-100 text-right">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit Plan Rules →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {editingPlan ? 'Edit Plan Rules' : 'Create Subscription Plan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plan Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Professional Monthly"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Billing Cadence *</label>
                  <select
                    value={billingCadence}
                    onChange={(e) => setBillingCadence(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="daily">Daily Pass</option>
                    <option value="weekly">Weekly Fast-Track</option>
                    <option value="monthly">Monthly Recurring</option>
                    <option value="yearly">Yearly Contract</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Base Plan Cost ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={baseCost}
                    onChange={(e) => setBaseCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={minQuantity}
                    onChange={(e) => setMinQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full px-2 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Lifecycle rule checkboxes */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                <span className="font-semibold text-slate-800 block">Plan Lifecycle Governance:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPause}
                    onChange={(e) => setAllowPause(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Allow customers/staff to pause subscriptions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowEarlyClose}
                    onChange={(e) => setAllowEarlyClose(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Allow early cancellation/closure</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRenew}
                    onChange={(e) => setAllowRenew(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Allow renewal on contract end</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCloseOnEnd}
                    onChange={(e) => setAutoCloseOnEnd(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Automatically close subscription when expiry date is reached</span>
                </label>
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
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
