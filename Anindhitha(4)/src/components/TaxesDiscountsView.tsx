import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TaxRule, DiscountRule, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { Percent, Tag, Plus, Check, Calendar, Shield } from 'lucide-react';

interface TaxesDiscountsViewProps {
  onDataChanged?: () => void;
}

export const TaxesDiscountsView: React.FC<TaxesDiscountsViewProps> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'discounts' | 'taxes'>('discounts');
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Discount Modal
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('percentage');
  const [value, setValue] = useState('20');
  const [minSpend, setMinSpend] = useState('0');
  const [minQty, setMinQty] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('50');
  const [appliesToProduct, setAppliesToProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Tax Modal
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState('20');
  const [taxIsDefault, setTaxIsDefault] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, dData, pData] = await Promise.all([
        api.getTaxes(),
        api.getDiscounts(),
        api.getProducts()
      ]);
      setTaxes(tData.taxes);
      setDiscounts(dData.discounts);
      setProducts(pData.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createDiscount({
        code,
        type: discountType,
        value: Number(value),
        min_purchase_amount: Number(minSpend),
        min_quantity: Number(minQty),
        start_date: startDate || null,
        end_date: endDate || null,
        usage_limit: Number(usageLimit),
        applies_to_product_id: appliesToProduct || null
      });
      setIsDiscountModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createTax({
        name: taxName,
        rate: Number(taxRate),
        is_default: taxIsDefault,
        is_active: true
      });
      setIsTaxModalOpen(false);
      loadData();
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Taxes & Promotional Discounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin configuration for automated tax calculations and rule-based customer discounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="p-1 bg-slate-100 rounded-lg border border-slate-200 flex text-xs">
            <button
              onClick={() => setActiveTab('discounts')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                activeTab === 'discounts' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Discount Rules ({discounts.length})
            </button>
            <button
              onClick={() => setActiveTab('taxes')}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                activeTab === 'taxes' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Tax Rules ({taxes.length})
            </button>
          </div>

          {isAdmin && activeTab === 'discounts' && (
            <button
              onClick={() => {
                setCode('SUMMER20');
                setValue('20');
                setIsDiscountModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Discount</span>
            </button>
          )}

          {isAdmin && activeTab === 'taxes' && (
            <button
              onClick={() => {
                setTaxName('State Tax');
                setTaxRate('7.5');
                setIsTaxModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tax Rule</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'discounts' ? (
        /* DISCOUNTS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {discounts.map((d) => {
            const isExhausted = d.usage_limit > 0 && d.times_used >= d.usage_limit;
            return (
              <div
                key={d.id}
                className={`p-5 bg-white rounded-xl border transition-all shadow-2xs flex flex-col justify-between ${
                  isExhausted ? 'border-slate-300 opacity-60 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {d.code}
                    </span>
                    <span className="text-2xs font-semibold text-slate-500 uppercase">
                      {d.type === 'percentage' ? `${d.value}% Off` : `$${d.value} Off`}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target:</span>
                      <span className="font-medium text-slate-900">
                        {d.product_name ? `${d.product_name}` : 'Entire Subscription'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Spend:</span>
                      <span className="font-mono tabular-nums">${d.min_purchase_amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Qty:</span>
                      <span className="font-mono tabular-nums">{d.min_quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Usage Limit:</span>
                      <span className="font-mono tabular-nums">
                        {d.times_used} / {d.usage_limit > 0 ? d.usage_limit : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                  <span>Valid: {d.start_date || 'Any'} to {d.end_date || 'Ongoing'}</span>
                  {isExhausted && <span className="font-bold text-rose-600">Exhausted</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TAXES VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Tax Rule Name</th>
                <th className="py-3 px-4">Rate (%)</th>
                <th className="py-3 px-4">Default Rule</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taxes.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{t.name}</td>
                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-indigo-700">{t.rate}%</td>
                  <td className="py-3 px-4">
                    {t.is_default ? (
                      <span className="text-2xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        Default System Tax
                      </span>
                    ) : (
                      <span className="text-slate-400 text-2xs">Manual selection</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-2xs font-semibold text-emerald-700">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE DISCOUNT MODAL */}
      {isDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Create Discount Rule</h2>
              <button onClick={() => setIsDiscountModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateDiscount} className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ENTERPRISE20"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Discount Type *</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Dollar ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Value ({discountType === 'percentage' ? '%' : '$'}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Spend ($)</label>
                  <input
                    type="number"
                    value={minSpend}
                    onChange={(e) => setMinSpend(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Usage Limit</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="0 = unlimited"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Applicable Scope</label>
                <select
                  value={appliesToProduct}
                  onChange={(e) => setAppliesToProduct(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Apply to Whole Subscription / Invoice</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>Only to: {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Create Discount Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TAX MODAL */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add Tax Rule</h2>
              <button onClick={() => setIsTaxModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateTax} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tax Name *</label>
                <input
                  type="text"
                  required
                  value={taxName}
                  onChange={(e) => setTaxName(e.target.value)}
                  placeholder="Sales Tax"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={taxIsDefault}
                  onChange={(e) => setTaxIsDefault(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Set as default tax rule for new invoices</span>
              </label>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTaxModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Add Tax'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
