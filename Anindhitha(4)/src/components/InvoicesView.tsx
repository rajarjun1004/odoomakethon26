import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import { PrintableInvoice } from './PrintableInvoice';
import {
  FileText,
  Search,
  Printer,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  CreditCard,
  Send
} from 'lucide-react';

interface InvoicesViewProps {
  onOpenRecordPayment: (invoice: Invoice) => void;
  onSelectTab: (tab: string) => void;
  onDataChanged?: () => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ onOpenRecordPayment, onSelectTab, onDataChanged }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices();
      setInvoices(data.invoices);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const handleOpenPrintPreview = async (invId: string) => {
    try {
      const data = await api.getInvoiceDetail(invId);
      setViewInvoice(data.invoice);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await api.confirmInvoice(id);
      await loadInvoices();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Cancel this invoice? This will set balance to zero.')) return;
    try {
      await api.cancelInvoice(id);
      await loadInvoices();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSend = async (id: string) => {
    try {
      const res = await api.sendInvoice(id);
      alert(res.message);
      await loadInvoices();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      (inv.subscription_number && inv.subscription_number.toLowerCase().includes(search.toLowerCase()));

    if (statusFilter === 'All') return matchesSearch;
    if (statusFilter === 'Overdue') return matchesSearch && inv.is_overdue;
    return matchesSearch && inv.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Printable Invoice Modal preview */}
      {viewInvoice && (
        <PrintableInvoice invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isCustomer ? 'My Invoices & Statements' : 'Invoices & Billing'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated billing ledger, status transitions (Draft → Confirmed → Paid), and printable invoices
          </p>
        </div>

        {!isCustomer && (
          <button
            onClick={() => onSelectTab('billing')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Run Billing Cycle</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto w-full sm:w-auto">
          {['All', 'Confirmed', 'Paid', 'Overdue', 'Draft', 'Cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 text-2xs font-semibold rounded-md transition-all whitespace-nowrap shrink-0 ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue / Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-indigo-700">{inv.invoice_number}</div>
                      {inv.subscription_number && (
                        <div className="text-2xs font-mono text-slate-400">{inv.subscription_number}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.customer_name}</div>
                      <div className="text-2xs text-slate-400">{inv.customer_email}</div>
                    </td>
                    <td className="py-3 px-4 text-2xs text-slate-600 space-y-0.5">
                      <div>Issued: <span className="font-mono">{inv.issue_date}</span></div>
                      <div>
                        Due: <span className={`font-mono font-medium ${inv.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>{inv.due_date}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'Paid' ? (
                        <span className="inline-block px-2 py-0.5 text-2xs font-bold text-emerald-800 bg-emerald-100 rounded-md">
                          Paid
                        </span>
                      ) : inv.is_overdue ? (
                        <span className="inline-block px-2 py-0.5 text-2xs font-bold text-rose-800 bg-rose-100 rounded-md">
                          Overdue
                        </span>
                      ) : inv.status === 'Confirmed' ? (
                        <span className="inline-block px-2 py-0.5 text-2xs font-bold text-amber-800 bg-amber-100 rounded-md">
                          Unpaid
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 text-2xs font-bold text-slate-700 bg-slate-100 rounded-md">
                          {inv.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ${Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      <span className={inv.balance_due > 0 ? (inv.is_overdue ? 'text-rose-600' : 'text-amber-700') : 'text-slate-400'}>
                        ${Number(inv.balance_due).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenPrintPreview(inv.id)}
                          title="Print / View Invoice"
                          className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>

                        {!isCustomer && inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleSend(inv.id)}
                            title="Send Invoice to Customer"
                            className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Send</span>
                          </button>
                        )}

                        {!isCustomer && inv.balance_due > 0 && inv.status !== 'Cancelled' && (
                          <button
                            onClick={() => onOpenRecordPayment(inv)}
                            title="Record Payment"
                            className="inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-2xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        {!isCustomer && inv.status === 'Draft' && (
                          <button
                            onClick={() => handleConfirm(inv.id)}
                            title="Confirm Invoice"
                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {!isCustomer && inv.status !== 'Cancelled' && inv.status !== 'Paid' && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            title="Cancel Invoice"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No invoices found.
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
