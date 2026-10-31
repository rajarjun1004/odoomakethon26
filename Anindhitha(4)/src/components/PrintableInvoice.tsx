import React from 'react';
import { Invoice } from '../types';
import { Printer, X, Download } from 'lucide-react';

interface PrintableInvoiceProps {
  invoice: Invoice;
  onClose: () => void;
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center p-4 sm:p-6 print:p-0 print:bg-white">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:rounded-none">
        {/* Header Action Bar - Hidden in Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">Print Preview</span>
            <span className="text-xs text-slate-500">· {invoice.invoice_number}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Body */}
        <div className="p-8 sm:p-12 text-slate-900 print:p-4">
          {/* Top Brand & Metadata Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                  B
                </div>
                <span className="text-2xl font-bold tracking-tight text-slate-900">Brightloop</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Brightloop Software Systems Inc.<br />
                100 Innovation Way, Suite 500<br />
                San Francisco, CA 94105<br />
                billing@brightloop.com · tax ID: US-44829104
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">INVOICE</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-indigo-700">{invoice.invoice_number}</p>
              <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                <div><span className="text-slate-400">Issue Date:</span> {invoice.issue_date}</div>
                <div><span className="text-slate-400">Due Date:</span> <span className="font-semibold text-slate-800">{invoice.due_date}</span></div>
                <div><span className="text-slate-400">Terms:</span> {invoice.payment_terms || 'Due on Receipt'}</div>
                {invoice.subscription_number && (
                  <div><span className="text-slate-400">Subscription:</span> {invoice.subscription_number}</div>
                )}
              </div>
            </div>
          </div>

          {/* Bill To & Status Banner */}
          <div className="grid grid-cols-2 gap-8 py-8 border-b border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Billed To</span>
              <h3 className="mt-1 text-base font-semibold text-slate-900">{invoice.customer_name}</h3>
              <div className="mt-1 text-xs text-slate-600 space-y-0.5">
                <div>{invoice.customer_email}</div>
                {invoice.customer_phone && <div>{invoice.customer_phone}</div>}
                {invoice.customer_address && <div className="max-w-xs">{invoice.customer_address}</div>}
                {invoice.customer_tax_id && <div>Tax ID: {invoice.customer_tax_id}</div>}
              </div>
            </div>

            <div className="flex flex-col items-end justify-center">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment Status</span>
                <div className="mt-1">
                  {invoice.status === 'Paid' ? (
                    <span className="inline-block px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-md">
                      PAID IN FULL
                    </span>
                  ) : invoice.is_overdue ? (
                    <span className="inline-block px-3 py-1 text-xs font-bold text-rose-800 bg-rose-100 rounded-md">
                      OVERDUE (${invoice.balance_due.toFixed(2)})
                    </span>
                  ) : invoice.status === 'Confirmed' ? (
                    <span className="inline-block px-3 py-1 text-xs font-bold text-amber-800 bg-amber-100 rounded-md">
                      UNPAID / CONFIRMED
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 text-xs font-bold text-slate-700 bg-slate-100 rounded-md">
                      {invoice.status.toUpperCase()}
                    </span>
                  )}
                </div>
                {invoice.period_start && invoice.period_end && (
                  <p className="mt-2 text-xs text-slate-500">
                    Billing Period: {invoice.period_start} to {invoice.period_end}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-8">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center w-16">Qty</th>
                  <th className="py-2 text-right w-24">Unit Price</th>
                  <th className="py-2 text-right w-20">Tax</th>
                  <th className="py-2 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, idx) => (
                    <tr key={idx} className="text-slate-700">
                      <td className="py-3 pr-2">
                        <div className="font-medium text-slate-900">{item.description}</div>
                      </td>
                      <td className="py-3 text-center tabular-nums">{item.quantity}</td>
                      <td className="py-3 text-right tabular-nums font-mono">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-3 text-right tabular-nums font-mono">{Number(item.tax_rate).toFixed(1)}%</td>
                      <td className="py-3 text-right tabular-nums font-mono font-semibold text-slate-900">
                        ${Number(item.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Standard recurring subscription charges
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Calculations Breakdown */}
            <div className="mt-6 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">${Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount Applied</span>
                    <span className="font-mono tabular-nums">-${Number(invoice.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Applicable Taxes</span>
                  <span className="font-mono tabular-nums">${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-300 text-sm font-bold text-slate-900">
                  <span>Total Due</span>
                  <span className="font-mono tabular-nums">${Number(invoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span className="font-mono tabular-nums">${Number(invoice.paid_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold text-indigo-700">
                  <span>Balance Due</span>
                  <span className="font-mono tabular-nums">${Number(invoice.balance_due).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History if any */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="pt-6 border-t border-slate-200 text-xs">
              <span className="font-semibold text-slate-700 uppercase tracking-wider">Recorded Payments</span>
              <div className="mt-2 divide-y divide-slate-100">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="py-1.5 flex justify-between text-slate-600">
                    <div>
                      <span className="font-mono font-medium text-slate-800">{p.payment_number}</span>
                      <span className="mx-1 text-slate-300">·</span>
                      <span>{p.payment_date}</span>
                      <span className="mx-1 text-slate-300">·</span>
                      <span>{p.payment_method}</span>
                      <span className="text-slate-400"> ({p.reference})</span>
                    </div>
                    <span className="font-mono font-semibold text-emerald-600">+${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Terms & Wire instructions */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-2xs text-slate-400 space-y-1">
            <p><strong>Payment Instructions:</strong> Direct wire/ACH transfers to Silicon Valley Bank, Account: 082910344, Routing: 121000358.</p>
            <p>Questions? Contact Brightloop Support at billing@brightloop.com. Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
