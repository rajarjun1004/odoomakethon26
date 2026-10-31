import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Customer, Subscription, Invoice, Payment } from '../types';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Search, Eye, Mail, Phone, MapPin, DollarSign, Repeat, FileText } from 'lucide-react';

interface CustomersViewProps {
  onDataChanged?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(search);
      setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search, user]);

  const handleOpenDetail = async (id: string) => {
    setIsDetailLoading(true);
    try {
      const data = await api.getCustomerDetail(id);
      setSelectedCustomer(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createCustomer({
        name,
        contact_name: contactName,
        email,
        phone,
        billing_address: billingAddress,
        tax_id: taxId,
        notes
      });
      setIsCreateOpen(false);
      setName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setBillingAddress('');
      setTaxId('');
      setNotes('');
      await loadCustomers();
      onDataChanged?.();
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Customer Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Accounts ledger, contact profiles, contracted subscriptions, and cumulative revenue
          </p>
        </div>

        {!isCustomer && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search company, contact, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Company / Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Email & Phone</th>
                <th className="py-3 px-4 text-center">Active Subs</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length > 0 ? (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      {c.tax_id && <div className="text-2xs font-mono text-slate-400">Tax ID: {c.tax_id}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {c.contact_name || 'Primary Contact'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{c.email}</div>
                      {c.phone && <div className="text-2xs text-slate-400">{c.phone}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-800">
                      {c.active_subscriptions_count || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                      ${Number(c.total_paid || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      <span className={Number(c.outstanding_balance) > 0 ? 'text-amber-700' : 'text-slate-400'}>
                        ${Number(c.outstanding_balance || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(c.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Ledger</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL WITH FULL LEDGER */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedCustomer.customer.name}</h2>
                <p className="text-2xs text-slate-500">
                  {selectedCustomer.customer.email} · {selectedCustomer.customer.phone || 'No phone'}
                </p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              {/* Billing Address Card */}
              {selectedCustomer.customer.billing_address && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{selectedCustomer.customer.billing_address}</span>
                </div>
              )}

              {/* Customer Subscriptions */}
              <div>
                <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-2xs mb-2">
                  Subscriptions ({selectedCustomer.subscriptions.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedCustomer.subscriptions.map((s: Subscription) => (
                    <div key={s.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-mono font-semibold text-indigo-700">{s.subscription_number}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="font-medium text-slate-800">{s.plan_name}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-500">Next bill: {s.next_billing_date}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">${s.total_amount.toFixed(2)}</span>
                        <span className="ml-2 px-2 py-0.5 text-2xs font-bold rounded bg-slate-100 text-slate-700">
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Invoices */}
              <div>
                <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-2xs mb-2">
                  Invoices ({selectedCustomer.invoices.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedCustomer.invoices.map((inv: Invoice) => (
                    <div key={inv.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-mono font-semibold text-slate-900">{inv.invoice_number}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-500">Due: {inv.due_date}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-900">${inv.total_amount.toFixed(2)}</span>
                        <span className={`ml-2 px-2 py-0.5 text-2xs font-bold rounded ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payments */}
              <div>
                <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-2xs mb-2">
                  Recorded Payments ({selectedCustomer.payments.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedCustomer.payments.map((p: Payment) => (
                    <div key={p.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                      <div>
                        <span className="font-mono font-semibold text-indigo-700">{p.payment_number}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-600">{p.payment_date} ({p.payment_method})</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700">+${p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Customer Account</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Global Inc."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="100 Enterprise Way, San Francisco, CA"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tax ID / VAT</label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="US-94281726"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enterprise tier client"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
