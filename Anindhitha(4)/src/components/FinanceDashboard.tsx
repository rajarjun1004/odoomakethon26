import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { FinanceStats } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Repeat,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface FinanceDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenCreateSub: () => void;
  onDataChanged?: () => void;
}

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ onSelectTab, onOpenCreateSub, onDataChanged }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getFinanceStats();
      setStats(data);
    } catch (err: any) {
      if (!err.message?.includes('Authentication required')) {
        console.error('Failed to fetch finance stats', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading financial analytics and active ledger...
      </div>
    );
  }

  const s = stats || {
    activeSubCount: 0,
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    outstandingBalance: 0,
    overdueCount: 0,
    overdueAmount: 0,
    monthlyRevenue: [],
    upcomingBilling: []
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Fast Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Finance & Operational Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time subscription performance, collected cashflow, and recurring billing schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('billing')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-200" />
            <span>Run Billing Engine</span>
          </button>
          <button
            onClick={onOpenCreateSub}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <span>+ New Subscription</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active Subscriptions & MRR */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Subscriptions</span>
            <Repeat className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              {s.activeSubCount}
            </span>
            <span className="text-xs text-slate-500">accounts</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-600">
            <span>Normalized MRR:</span>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">${s.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Metric 2: Annual Run Rate (ARR) */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              ${s.arr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-600">
            <span>Billing frequency:</span>
            <span className="font-medium text-slate-700">Contracted Annualized</span>
          </div>
        </div>

        {/* Metric 3: Collected Revenue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Collected Cashflow</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
              ${s.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-600">
            <span>Outstanding to collect:</span>
            <span className="font-mono font-semibold text-amber-700 tabular-nums">${s.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Metric 4: Overdue Invoices */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Overdue Receivables</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 font-mono tabular-nums">
              ${s.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-600">
            <span>Unpaid past due:</span>
            <span className="font-medium text-rose-700">{s.overdueCount} invoice(s)</span>
          </div>
        </div>
      </div>

      {/* Two-Column Analytics & Operational Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Monthly Revenue History */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Monthly Cash Collections</h2>
              <span className="text-2xs text-slate-400">Actual ledger records</span>
            </div>

            <div className="mt-4 space-y-3">
              {s.monthlyRevenue && s.monthlyRevenue.length > 0 ? (
                s.monthlyRevenue.map((row) => {
                  const maxRev = Math.max(...s.monthlyRevenue.map((m) => m.revenue), 1000);
                  const pct = Math.min(100, Math.round((row.revenue / maxRev) * 100));
                  return (
                    <div key={row.month} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700">{row.month}</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          ${Number(row.revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No payment history recorded yet.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
            <span>Calculated from real transaction payments</span>
            <button
              onClick={() => onSelectTab('payments')}
              className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
            >
              View Payment Ledger <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Upcoming Recurring Billing Queue */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900">Upcoming Billing Queue</h2>
              </div>
              <span className="text-2xs text-slate-400">Automated cycle</span>
            </div>

            <div className="mt-4 divide-y divide-slate-100 text-xs">
              {s.upcomingBilling && s.upcomingBilling.length > 0 ? (
                s.upcomingBilling.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{item.customer_name}</div>
                      <div className="text-2xs text-slate-500 flex items-center gap-1.5">
                        <span className="font-mono">{item.subscription_number}</span>
                        <span>·</span>
                        <span className="capitalize">{item.billing_cadence}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-900 tabular-nums">
                        ${Number(item.total_amount).toFixed(2)}
                      </div>
                      <div className="text-2xs font-mono text-indigo-700 font-medium">
                        Due: {item.next_billing_date}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 py-4 text-center">No active billing events queued.</p>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
            <span>Evaluated automatically by recurring billing</span>
            <button
              onClick={() => onSelectTab('billing')}
              className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
            >
              Open Billing Engine <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
