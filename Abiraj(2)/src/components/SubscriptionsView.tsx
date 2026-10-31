import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Subscription, Customer, SubscriptionPlan, Product, TaxRule, DiscountRule } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  Eye,
  Pause,
  Play,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface SubscriptionsViewProps {
  onOpenCreateModal?: () => void;
  onSelectTab: (tab: string) => void;
  onDataChanged?: () => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ onSelectTab, onDataChanged }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form reference data for creation
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);

  // Create form state
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formPlanId, setFormPlanId] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formDiscountId, setFormDiscountId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<Array<{
    product_id: string;
    variant_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getSubscriptions();
      setSubscriptions(data.subscriptions);

      const [cData, pData, prData, tData, dData] = await Promise.all([
        api.getCustomers(),
        api.getPlans(),
        api.getProducts(),
        api.getTaxes(),
        api.getDiscounts()
      ]);
      setCustomers(cData.customers);
      setPlans(pData.plans);
      setProducts(prData.products);
      setTaxes(tData.taxes);
      setDiscounts(dData.discounts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Filter subscriptions
  const filteredSubs = subscriptions.filter((s) => {
    const matchesSearch =
      s.subscription_number.toLowerCase().includes(search.toLowerCase()) ||
      s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Action handlers
  const handlePause = async (id: string) => {
    if (!window.confirm('Pause this active subscription?')) return;
    try {
      await api.pauseSubscription(id);
      await loadData();
      if (selectedSub?.id === id) {
        setSelectedSub({ ...selectedSub, status: 'Paused' });
      }
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.resumeSubscription(id);
      await loadData();
      if (selectedSub?.id === id) {
        setSelectedSub({ ...selectedSub, status: 'Active' });
      }
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRenew = async (id: string) => {
    try {
      const res = await api.renewSubscription(id);
      alert(`Subscription renewed! New expiration date: ${res.new_expiry_date}`);
      await loadData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEarlyClose = async (id: string) => {
    if (!window.confirm('Close this subscription early? Customer billing will terminate.')) return;
    try {
      await api.closeSubscription(id);
      await loadData();
      if (selectedSub?.id === id) {
        setSelectedSub({ ...selectedSub, status: 'Closed' });
      }
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateSubscriptionStatus(id, newStatus);
      await loadData();
      if (selectedSub?.id === id) {
        setSelectedSub({ ...selectedSub, status: newStatus as any });
      }
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Initialize line items when plan changes
  const handlePlanSelect = (planId: string) => {
    setFormPlanId(planId);
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan && products.length > 0) {
      if (formItems.length === 0) {
        const primaryProd = products.find((p) => p.type === 'Software') || products[0];
        const defaultTax = taxes.find((t) => t.is_default)?.rate || 0;
        setFormItems([
          {
            product_id: primaryProd.id,
            variant_id: primaryProd.variants?.[0]?.id || '',
            description: primaryProd.name,
            quantity: selectedPlan.min_quantity || 1,
            unit_price: primaryProd.sales_price,
            tax_rate: defaultTax
          }
        ]);
      } else if (formItems[0].quantity < (selectedPlan.min_quantity || 1)) {
        const updated = [...formItems];
        updated[0] = { ...updated[0], quantity: selectedPlan.min_quantity || 1 };
        setFormItems(updated);
      }
    }
  };

  const addItemRow = () => {
    if (products.length === 0) return;
    const prod = products[0];
    const defaultTax = taxes.find((t) => t.is_default)?.rate || 0;
    setFormItems([
      ...formItems,
      {
        product_id: prod.id,
        variant_id: prod.variants?.[0]?.id || '',
        description: prod.name,
        quantity: 1,
        unit_price: prod.sales_price,
        tax_rate: defaultTax
      }
    ]);
  };

  const updateItemRow = (index: number, field: string, val: any) => {
    const updated = [...formItems];
    const row = { ...updated[index], [field]: val };

    if (field === 'product_id') {
      const prod = products.find((p) => p.id === val);
      if (prod) {
        row.description = prod.name;
        row.unit_price = prod.sales_price;
        row.variant_id = prod.variants?.[0]?.id || '';
      }
    } else if (field === 'variant_id') {
      const prod = products.find((p) => p.id === row.product_id);
      const variant = prod?.variants.find((v) => v.id === val);
      if (prod && variant) {
        row.description = `${prod.name} (${variant.name})`;
        row.unit_price = prod.sales_price + variant.additional_price;
      }
    }

    updated[index] = row;
    setFormItems(updated);
  };

  const removeItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Calculations for creation
  const formSubtotal = formItems.reduce((acc, it) => acc + Number(it.quantity) * Number(it.unit_price), 0);
  const formTax = formItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.unit_price) * Number(it.tax_rate)) / 100, 0);

  let formDiscount = 0;
  if (formDiscountId) {
    const d = discounts.find((disc) => disc.id === formDiscountId);
    if (d) {
      if (d.type === 'percentage') {
        formDiscount = (formSubtotal * d.value) / 100;
      } else {
        formDiscount = Math.min(d.value, formSubtotal);
      }
    }
  }
  const formTotal = Math.max(0, formSubtotal - formDiscount + formTax);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustomerId = isCustomer ? (user?.customer_id || formCustomerId || 'self') : formCustomerId;
    if (!targetCustomerId || !formPlanId) {
      alert('Please select a subscription plan.');
      return;
    }

    let finalItems = [...formItems];
    if (finalItems.length === 0) {
      const plan = plans.find((p) => p.id === formPlanId);
      const primaryProd = products.find((p) => p.type === 'Software') || products[0];
      if (primaryProd) {
        const defaultTax = taxes.find((t) => t.is_default)?.rate || 0;
        finalItems = [
          {
            product_id: primaryProd.id,
            variant_id: primaryProd.variants?.[0]?.id || '',
            description: primaryProd.name,
            quantity: plan?.min_quantity || 1,
            unit_price: primaryProd.sales_price,
            tax_rate: defaultTax
          }
        ];
      }
    }

    if (finalItems.length === 0) {
      alert('Please add at least one product line.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await api.createSubscription({
        customer_id: targetCustomerId,
        plan_id: formPlanId,
        start_date: formStartDate,
        expiry_date: formExpiryDate || null,
        payment_terms: formPaymentTerms,
        discount_id: formDiscountId || null,
        notes: formNotes,
        items: finalItems,
        initial_status: 'Active'
      });
      setIsCreateOpen(false);
      await loadData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isCustomer ? 'My Subscriptions' : 'Subscription Contracts'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full lifecycle tracking: Draft, Quotation, Confirmed, Active, Paused, and Closed states
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (plans.length > 0) handlePlanSelect(plans[0].id);
              if (customers.length > 0) setFormCustomerId(customers[0].id);
              else if (user?.customer_id) setFormCustomerId(user.customer_id);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCustomer ? 'Subscribe to a Plan' : 'Create Subscription'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Interactive Segmented Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 overflow-x-auto w-full sm:w-auto">
          {['All', 'Active', 'Confirmed', 'Paused', 'Draft', 'Closed'].map((tab) => (
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

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search number, customer, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Subscription #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Plan & Cadence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Next Billing Date</th>
                <th className="py-3 px-4 text-right">Recurring Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.length > 0 ? (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {sub.subscription_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{sub.customer_name}</div>
                      <div className="text-2xs text-slate-400">{sub.customer_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{sub.plan_name}</div>
                      <div className="text-2xs text-slate-500 capitalize">{sub.billing_cadence}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 text-2xs font-bold rounded-md ${
                        sub.status === 'Active'
                          ? 'text-emerald-800 bg-emerald-100'
                          : sub.status === 'Paused'
                          ? 'text-amber-800 bg-amber-100'
                          : sub.status === 'Confirmed'
                          ? 'text-blue-800 bg-blue-100'
                          : sub.status === 'Closed'
                          ? 'text-slate-600 bg-slate-100'
                          : 'text-indigo-800 bg-indigo-100'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      {sub.next_billing_date}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ${Number(sub.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSub(sub)}
                          title="View Subscription Details"
                          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!isCustomer && sub.status === 'Active' && sub.allow_pause !== 0 && (
                          <button
                            onClick={() => handlePause(sub.id)}
                            title="Pause Subscription"
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {!isCustomer && sub.status === 'Paused' && (
                          <button
                            onClick={() => handleResume(sub.id)}
                            title="Resume Subscription"
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                    No subscriptions matching the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-mono">
                  {selectedSub.subscription_number}
                </h2>
                <p className="text-2xs text-slate-500">
                  {selectedSub.customer_name} · {selectedSub.plan_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Lifecycle & Status Switcher for Staff/Admin */}
              {!isCustomer && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1.5">
                    Lifecycle State Progression:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Draft', 'Quotation', 'Confirmed', 'Active', 'Paused', 'Closed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(selectedSub.id, st)}
                        className={`px-2.5 py-1 text-2xs font-semibold rounded-md border transition-all ${
                          selectedSub.status === st
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Cadence</span>
                  <span className="font-semibold text-slate-900 capitalize">{selectedSub.billing_cadence}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Next Billing</span>
                  <span className="font-mono font-semibold text-indigo-700">{selectedSub.next_billing_date}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Start Date</span>
                  <span className="font-mono text-slate-800">{selectedSub.start_date}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs text-slate-500 block">Expiry Date</span>
                  <span className="font-mono text-slate-800">{selectedSub.expiry_date || 'Ongoing'}</span>
                </div>
              </div>

              {/* Line items */}
              <div>
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
                  Configured Product Lines & Add-ons
                </span>
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Tax</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSub.items && selectedSub.items.length > 0 ? (
                      selectedSub.items.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <span className="font-medium text-slate-900">{it.description}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono tabular-nums">{it.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">${Number(it.unit_price).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">{Number(it.tax_rate).toFixed(0)}%</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                            ${Number(it.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-slate-400">
                          Standard plan recurring line
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Lifecycle Actions */}
              <div className="pt-2 flex flex-wrap gap-2 border-t border-slate-200">
                {selectedSub.status === 'Active' && selectedSub.allow_pause !== 0 && (
                  <button
                    onClick={() => handlePause(selectedSub.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    Pause Subscription
                  </button>
                )}
                {selectedSub.status === 'Paused' && (
                  <button
                    onClick={() => handleResume(selectedSub.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    Resume Active Billing
                  </button>
                )}
                {selectedSub.allow_renew !== 0 && selectedSub.status !== 'Closed' && (
                  <button
                    onClick={() => handleRenew(selectedSub.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Renew Contract
                  </button>
                )}
                {selectedSub.allow_early_close !== 0 && selectedSub.status !== 'Closed' && (
                  <button
                    onClick={() => handleEarlyClose(selectedSub.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Close Early
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUBSCRIPTION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {isCustomer ? 'Subscribe to Brightloop Plan & Add-ons' : 'Create New Subscription Contract'}
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isCustomer ? 'Subscriber Account' : 'Customer Account *'}
                  </label>
                  {isCustomer ? (
                    <div className="px-3 py-2 text-xs bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-semibold">
                      {user?.customer_name || user?.name} ({user?.email})
                    </div>
                  ) : (
                    <select
                      required
                      value={formCustomerId}
                      onChange={(e) => setFormCustomerId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Customer...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subscription Plan *</label>
                  <select
                    required
                    value={formPlanId}
                    onChange={(e) => handlePlanSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Plan...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${p.base_cost}/{p.billing_cadence})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contract Expiry (Optional)</label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>

              {/* Product Lines Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Product Lines & Variant Charges
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => {
                    const prod = products.find((p) => p.id === item.product_id);
                    return (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-12 gap-2 items-center text-xs">
                        {/* Product selection */}
                        <div className="col-span-4">
                          <label className="text-2xs text-slate-500 block mb-0.5">Product</label>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItemRow(idx, 'product_id', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Variant selection */}
                        <div className="col-span-3">
                          <label className="text-2xs text-slate-500 block mb-0.5">Variant (e.g. Odoo)</label>
                          <select
                            value={item.variant_id}
                            onChange={(e) => updateItemRow(idx, 'variant_id', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="">Base / Standard</option>
                            {prod?.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.name} (+${v.additional_price})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Qty */}
                        <div className="col-span-2">
                          <label className="text-2xs text-slate-500 block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-2">
                          <label className="text-2xs text-slate-500 block mb-0.5">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemRow(idx, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                        </div>

                        {/* Delete row */}
                        <div className="col-span-1 text-right pt-4">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount selection */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Discount Code (Optional)</label>
                  <select
                    value={formDiscountId}
                    onChange={(e) => setFormDiscountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">No Discount</option>
                    {discounts.filter((d) => d.is_active).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code} ({d.type === 'percentage' ? `${d.value}% off` : `$${d.value} off`})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Internal Contract Notes</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Approved by Sales Dir."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Calculations Summary */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                <div className="space-x-3 text-slate-600">
                  <span>Subtotal: <strong className="font-mono tabular-nums">${formSubtotal.toFixed(2)}</strong></span>
                  {formDiscount > 0 && <span className="text-emerald-700 font-semibold">Discount: -${formDiscount.toFixed(2)}</span>}
                  <span>Tax: <strong className="font-mono tabular-nums">${formTax.toFixed(2)}</strong></span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Recurring Amount: <span className="font-mono tabular-nums font-bold text-indigo-700">${formTotal.toFixed(2)}</span>
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
                  disabled={createSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {createSubmitting ? 'Creating...' : 'Confirm & Launch Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
