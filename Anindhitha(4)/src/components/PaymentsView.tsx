import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Payment, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CreditCard,
  Plus,
  Search,
  DollarSign,
  Calendar,
  CheckCircle,
  FileText
} from 'lucide-react';

interface PaymentsViewProps {
  initialInvoiceToPay?: Invoice | null;
  onClearInitialInvoice?: () => void;
  onDataChanged?: () => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ initialInvoiceToPay, onClearInitialInvoice, onDataChanged }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Record Payment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const pData = await api.getPayments();
      setPayments(pData.payments);

      if (!isCustomer) {
        const iData = await api.getInvoices();
        setInvoices(iData.invoices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Open modal if triggered externally with an invoice
  useEffect(() => {
    if (initialInvoiceToPay) {
      setPayInvoiceId(initialInvoiceToPay.id);
      setPayAmount(String(initialInvoiceToPay.balance_due));
      setPayReference(`WIRE-${Date.now().toString().slice(-6)}`);
      setIsModalOpen(true);
      if (onClearInitialInvoice) onClearInitialInvoice();
    }
  }, [initialInvoiceToPay]);

  const handleInvoiceChange = (id: string) => {
    setPayInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) {
      setPayAmount(String(inv.balance_due));
      setPayReference(`WIRE-${Date.now().toString().slice(-6)}`);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoiceId || !payAmount || !payReference) {
      alert('Please fill all required payment fields.');
      return;
    }

    setSubmitting(true);
    try {
      await api.recordPayment({
        invoice_id: payInvoiceId,
        amount: Number(payAmount),
        payment_date: payDate,
        payment_method: payMethod,
        reference: payReference,
        notes: payNotes
      });
      setIsModalOpen(false);
      setPayNotes('');
      await loadData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const s = search.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(s) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(s)) ||
      (p.customer_name && p.customer_name.toLowerCase().includes(s)) ||
      p.reference.toLowerCase().includes(s)
    );
  });

  const unpaidInvoices = invoices.filter((i) => i.balance_due > 0 && i.status !== 'Cancelled');
  const selectedInvoice = invoices.find((i) => i.id === payInvoiceId);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isCustomer ? 'Payment Receipts & History' : 'Payment Transactions'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Realized cash collections, partial installment tracking, and invoice settlement ledger
          </p>
        </div>

        {!isCustomer && (
          <button
            onClick={() => {
              if (unpaidInvoices.length > 0) {
                handleInvoiceChange(unpaidInvoices[0].id);
              }
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment #, reference, invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Invoice Settled</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Date & Method</th>
                <th className="py-3 px-4">Reference / Notes</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {p.payment_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {p.customer_name || 'Customer'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{p.payment_date}</div>
                      <div className="text-2xs text-slate-400">{p.payment_method}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-2xs text-slate-700">{p.reference}</div>
                      {p.notes && <div className="text-2xs text-slate-400 truncate max-w-xs">{p.notes}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      +${Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Record Incoming Payment</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Invoice *</label>
                <select
                  required
                  value={payInvoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                >
                  <option value="">Select Unpaid Invoice...</option>
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} · {inv.customer_name} (Due: ${inv.balance_due.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedInvoice && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Customer:</span>
                    <span className="font-semibold text-slate-900">{selectedInvoice.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Invoice Total:</span>
                    <span className="font-mono tabular-nums">${selectedInvoice.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Already Paid:</span>
                    <span className="font-mono tabular-nums">${selectedInvoice.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-indigo-700">
                    <span>Remaining Balance:</span>
                    <span className="font-mono tabular-nums">${selectedInvoice.balance_due.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Amount ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-2xs text-slate-400 mt-0.5 block">Supports partial payments</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Bank Transfer">Bank Transfer / ACH</option>
                    <option value="Credit Card">Credit Card (Stripe/Sim)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Company Cheque</option>
                    <option value="Direct Debit">Direct Debit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Reference / Transaction ID *</label>
                  <input
                    type="text"
                    required
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="WIRE-129048"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Cleared via Silicon Valley Bank"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record & Update Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
