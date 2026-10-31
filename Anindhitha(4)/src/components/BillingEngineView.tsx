import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BillingRunRecord } from '../types';
import { Zap, Play, CheckCircle, AlertCircle, RefreshCw, Calendar, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface BillingEngineViewProps {
  onSelectTab: (tab: string) => void;
  onDataChanged?: () => void;
}

export const BillingEngineView: React.FC<BillingEngineViewProps> = ({ onSelectTab, onDataChanged }) => {
  const [history, setHistory] = useState<BillingRunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [latestResult, setLatestResult] = useState<any | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const data = await api.getBillingHistory();
      setHistory(data.history);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRunBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setLatestResult(null);
    try {
      const res = await api.runBilling(asOfDate);
      setLatestResult(res);
      await loadHistory();
      onDataChanged?.();
    } catch (err: any) {
      alert(`Billing run failed: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Recurring Billing Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated subscription evaluation, duplicate-prevention invoicing, and scheduled cycle audits
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit History</span>
        </button>
      </div>

      {/* Manual Trigger & Date Simulator Box */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-slate-900">Execute Billing Cycle</h2>
            <p className="text-xs text-slate-500 mt-1">
              Evaluates all active subscriptions whose next billing date is on or before the reference date.
              Applies valid discount rules and tax rates, generates confirmed invoices, advances subscription billing dates,
              and prevents any duplicate invoices for the same period.
            </p>

            <form onSubmit={handleRunBilling} className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Reference Date:
                </label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={running}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${running ? 'animate-pulse' : ''}`} />
                <span>{running ? 'Evaluating Subscriptions...' : 'Run Billing Engine Now'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Real-time execution banner if triggered */}
        {latestResult && (
          <div className="mt-6 p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-indigo-950">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Billing Run Finished for {latestResult.runDate}</span>
              </div>
              <button
                onClick={() => onSelectTab('invoices')}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline"
              >
                View Generated Invoices →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="text-2xs text-slate-500 block">Subscriptions Evaluated</span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {latestResult.evaluatedCount}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="text-2xs text-slate-500 block">Invoices Created</span>
                <span className="font-mono text-sm font-bold text-emerald-700 tabular-nums">
                  {latestResult.createdInvoicesCount}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="text-2xs text-slate-500 block">Total Billed Amount</span>
                <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  ${Number(latestResult.totalBilledAmount).toFixed(2)}
                </span>
              </div>
              <div className="p-2 bg-white rounded border border-indigo-100">
                <span className="text-2xs text-slate-500 block">Skipped / Duplicates Avoided</span>
                <span className="font-mono text-sm font-bold text-amber-700 tabular-nums">
                  {latestResult.skippedCount}
                </span>
              </div>
            </div>

            {/* Generated Invoices List */}
            {latestResult.createdInvoices && latestResult.createdInvoices.length > 0 && (
              <div className="pt-2">
                <span className="text-2xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                  Newly Created Invoices:
                </span>
                <div className="space-y-1">
                  {latestResult.createdInvoices.map((inv: any) => (
                    <div key={inv.invoiceId} className="flex justify-between p-1.5 bg-white rounded border border-indigo-100 font-mono text-2xs">
                      <span>{inv.invoiceNumber} · {inv.customerName}</span>
                      <span className="font-bold text-emerald-700">${Number(inv.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Billing Execution History & Audit Logs</h2>
            <p className="text-2xs text-slate-500">Traceable records of every automated and manual billing run</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">{history.length} runs recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Run Date / Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Evaluated</th>
                <th className="py-3 px-4 text-center">Invoices Created</th>
                <th className="py-3 px-4 text-right">Total Billed</th>
                <th className="py-3 px-4 text-center">Logs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length > 0 ? (
                history.map((record) => {
                  const isExpanded = expandedLogId === record.id;
                  return (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 font-mono">{record.run_date}</div>
                          <div className="text-2xs text-slate-400 font-mono">
                            {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 text-2xs font-bold rounded-md ${
                            record.status === 'Completed'
                              ? 'text-emerald-800 bg-emerald-100'
                              : 'text-rose-800 bg-rose-100'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums">
                          {record.subscriptions_evaluated}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-900">
                          {record.invoices_created}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          ${Number(record.total_billed_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : record.id)}
                            className="inline-flex items-center gap-1 text-2xs font-semibold text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-50"
                          >
                            <span>{isExpanded ? 'Hide' : 'View'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-900 text-slate-200 p-4 font-mono text-2xs">
                            <div className="font-bold text-slate-400 mb-2 border-b border-slate-700 pb-1">
                              Execution Details Log ({record.id}):
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {Array.isArray(record.logs) && record.logs.length > 0 ? (
                                record.logs.map((logLine, idx) => (
                                  <div key={idx} className="leading-relaxed">
                                    <span className="text-slate-500 mr-2">[{idx + 1}]</span>
                                    {logLine}
                                  </div>
                                ))
                              ) : (
                                <div className="text-slate-500">No verbose logs stored for this run.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No billing cycles executed yet. Click "Run Billing Engine Now" above to evaluate due subscriptions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
