import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Quotation, QuotationTemplate, Customer, SubscriptionPlan, Product, TaxRule, DiscountRule } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  FileSignature,
  Plus,
  ArrowRight,
  CheckCircle,
  Copy,
  Clock,
  Sparkles,
  Search,
  Layers
} from 'lucide-react';

interface QuotationsViewProps {
  onSelectTab: (tab: string) => void;
  onDataChanged?: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({ onSelectTab, onDataChanged }) => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';

  const [activeSubTab, setActiveSubTab] = useState<'quotes' | 'templates'>('quotes');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Quote Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);

  const [formCustomerId, setFormCustomerId] = useState('');
  const [formPlanId, setFormPlanId] = useState('');
  const [formValidDays, setFormValidDays] = useState('30');
  const [formPaymentTerms, setFormPaymentTerms] = useState('Net 30');
  const [formDiscountId, setFormDiscountId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qData = await api.getQuotations();
      setQuotations(qData.quotations);

      if (!isCustomer) {
        const [tData, cData, pData, prData, txData, dData] = await Promise.all([
          api.getQuotationTemplates(),
          api.getCustomers(),
          api.getPlans(),
          api.getProducts(),
          api.getTaxes(),
          api.getDiscounts()
        ]);
        setTemplates(tData.templates);
        setCustomers(cData.customers);
        setPlans(pData.plans);
        setProducts(prData.products);
        setTaxes(txData.taxes);
        setDiscounts(dData.discounts);
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

  const handleApplyTemplate = (tmpl: QuotationTemplate) => {
    setFormPlanId(tmpl.plan_id);
    setFormValidDays(String(tmpl.validity_days));
    if (tmpl.terms) setFormNotes(tmpl.terms);
    try {
      const parsedItems = JSON.parse(tmpl.items_json);
      setFormItems(parsedItems.map((it: any) => {
        const p = products.find((prod) => prod.id === it.product_id);
        return {
          ...it,
          description: p ? p.name : 'Product Line'
        };
      }));
    } catch {
      // ignore
    }
  };

  const handleConvert = async (quote: Quotation) => {
    if (!window.confirm(`Convert Quotation ${quote.quote_number} into an active subscription?`)) return;
    try {
      const res = await api.convertQuotation(quote.id);
      alert(`Successfully converted quote into subscription: ${res.subscription_number}!`);
      await loadData();
      onDataChanged?.();
      onSelectTab('subscriptions');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCustomerId || !formPlanId || formItems.length === 0) {
      alert('Please select customer, plan and add items.');
      return;
    }
    setSubmitting(true);
    try {
      const d = new Date();
      d.setDate(d.getDate() + Number(formValidDays));
      const validUntil = d.toISOString().split('T')[0];

      await api.createQuotation({
        customer_id: formCustomerId,
        plan_id: formPlanId,
        valid_until: validUntil,
        payment_terms: formPaymentTerms,
        discount_id: formDiscountId || null,
        notes: formNotes,
        items: formItems
      });
      setIsCreateOpen(false);
      await loadData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
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

  const filteredQuotes = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.quote_number.toLowerCase().includes(s) ||
      q.customer_name.toLowerCase().includes(s) ||
      q.plan_name.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isCustomer ? 'Proposals & Quotations' : 'Quotations & Proposal Templates'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configure deals, apply validity windows, and convert approved quotes into active subscriptions with 1 click
          </p>
        </div>

        {!isCustomer && (
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-100 rounded-lg border border-slate-200 flex text-xs">
              <button
                onClick={() => setActiveSubTab('quotes')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  activeSubTab === 'quotes' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Quotations
              </button>
              <button
                onClick={() => setActiveSubTab('templates')}
                className={`px-3 py-1 font-semibold rounded-md transition-all ${
                  activeSubTab === 'templates' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Templates ({templates.length})
              </button>
            </div>

            <button
              onClick={() => {
                if (templates.length > 0) handleApplyTemplate(templates[0]);
                if (customers.length > 0) setFormCustomerId(customers[0].id);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Quotation</span>
            </button>
          </div>
        )}
      </div>

      {activeSubTab === 'quotes' ? (
        <>
          {/* Search */}
          <div className="flex items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search quote #, customer, plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Quotations Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Total Proposal</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.length > 0 ? (
                    filteredQuotes.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                          {q.quote_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{q.customer_name}</div>
                          <div className="text-2xs text-slate-400">{q.customer_email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {q.plan_name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {q.valid_until}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-2xs font-bold rounded-md ${
                            q.status === 'Converted'
                              ? 'text-emerald-800 bg-emerald-100'
                              : q.status === 'Sent'
                              ? 'text-blue-800 bg-blue-100'
                              : 'text-slate-700 bg-slate-100'
                          }`}>
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                          ${Number(q.total_amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCustomer && q.status !== 'Converted' && (
                            <button
                              onClick={() => handleConvert(q)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-2xs"
                            >
                              <span>Convert to Subscription</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                          {q.status === 'Converted' && (
                            <span className="text-2xs text-emerald-700 font-semibold font-mono">
                              Converted ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        No quotations created yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* TEMPLATES TAB */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{tmpl.name}</h3>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Plan: <span className="font-semibold text-slate-700">{tmpl.plan_name}</span> · Valid {tmpl.validity_days} days
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleApplyTemplate(tmpl);
                    if (customers.length > 0) setFormCustomerId(customers[0].id);
                    setIsCreateOpen(true);
                  }}
                  className="px-2.5 py-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-colors"
                >
                  Use Template
                </button>
              </div>

              {tmpl.terms && (
                <p className="text-2xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                  {tmpl.terms}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* CREATE QUOTATION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Prepare Quotation Proposal</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Customer *</label>
                  <select
                    required
                    value={formCustomerId}
                    onChange={(e) => setFormCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Plan *</label>
                  <select
                    required
                    value={formPlanId}
                    onChange={(e) => setFormPlanId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select plan...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.billing_cadence})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={formValidDays}
                    onChange={(e) => setFormValidDays(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-700">Proposal Lines</span>
                  <button type="button" onClick={addItemRow} className="text-xs text-indigo-600 font-semibold">
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs">
                      <span className="flex-1 font-medium">{item.description}</span>
                      <span className="text-slate-500">Qty: {item.quantity}</span>
                      <span className="font-mono font-semibold">${Number(item.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
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
                  {submitting ? 'Generating...' : 'Save & Issue Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
