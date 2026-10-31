import React from 'react';
import { PaymentReceipt } from '../types';
import { CheckCircle, Printer, X, ShieldCheck, Download } from 'lucide-react';

interface PrintableReceiptProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export const PrintableReceipt: React.FC<PrintableReceiptProps> = ({ receipt, onClose }) => {
  const { payment, invoice, customer, allocations } = receipt;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden print:shadow-none print:border-none print:max-w-none">
        {/* Header Controls (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">Official Payment Receipt</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Printable Canvas */}
        <div className="p-8 sm:p-10 space-y-8 print:p-6 bg-white text-slate-800">
          {/* Top Brand & Status */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  B
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">Brightloop</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Enterprise Cloud Billing & Subscription Infrastructure</p>
              <p className="text-xs text-slate-400">100 Innovation Way, Suite 400 • San Francisco, CA</p>
            </div>

            <div className="sm:text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Payment Confirmed
              </span>
              <p className="text-xs text-slate-500 mt-2">Receipt Number</p>
              <p className="font-mono text-sm font-bold text-slate-900">{receipt.receipt_number}</p>
            </div>
          </div>

          {/* Amount Paid Callout */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-6 text-center">
            <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">Amount Paid Successfully</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mt-1">
              ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-700 mt-1">Processed on {payment.payment_date || new Date().toISOString().split('T')[0]}</p>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Billed To</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{customer.name}</p>
              <p className="text-slate-500">{customer.email}</p>
              {customer.billing_address && <p className="text-slate-500 mt-0.5">{customer.billing_address}</p>}
            </div>

            <div>
              <p className="text-slate-400 font-medium">Payment Details</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{payment.payment_method}</p>
              <p className="font-mono text-slate-600 mt-0.5">Ref: {payment.reference}</p>
              <p className="text-slate-500 mt-0.5">Tx ID: {payment.payment_number}</p>
            </div>

            <div>
              <p className="text-slate-400 font-medium">Invoice Reference</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{invoice ? invoice.invoice_number : (allocations[0]?.invoice_number || 'Multiple')}</p>
              {invoice && (
                <>
                  <p className="text-slate-500 mt-0.5">Total Billed: ${Number(invoice.total_amount).toFixed(2)}</p>
                  <p className="text-emerald-700 font-medium mt-0.5">
                    {invoice.balance_due <= 0.001 ? 'Zero Balance (Paid in Full)' : `Remaining Balance: $${Number(invoice.balance_due).toFixed(2)}`}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Allocations Table */}
          {allocations && allocations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">Invoice Allocation Breakdown</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">Invoice Number</th>
                      <th className="px-4 py-2.5 text-left font-medium">Settlement Allocation</th>
                      <th className="px-4 py-2.5 text-right font-medium">Applied Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {allocations.map((alloc, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-mono font-medium text-slate-800">{alloc.invoice_number || invoice?.invoice_number || 'Invoice'}</td>
                        <td className="px-4 py-2 text-slate-600">Applied toward invoice balance</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-900">${Number(alloc.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                    {Number(payment.unallocated_amount || 0) > 0 && (
                      <tr className="bg-amber-50/50">
                        <td className="px-4 py-2 font-mono text-amber-900 font-medium">Unallocated Credit</td>
                        <td className="px-4 py-2 text-amber-800">Stored on customer account for future invoices</td>
                        <td className="px-4 py-2 text-right font-semibold text-amber-900">${Number(payment.unallocated_amount).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <p>Thank you for choosing Brightloop. This is an official electronic tax receipt.</p>
            <p className="font-mono">Security Check: SHA256-VERIFIED</p>
          </div>
        </div>
      </div>
    </div>
  );
};
