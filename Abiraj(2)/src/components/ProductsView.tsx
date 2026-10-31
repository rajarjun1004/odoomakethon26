import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Product, ProductVariant } from '../types';
import { useAuth } from '../context/AuthContext';
import { Boxes, Plus, Archive, RefreshCw, Check, Tag } from 'lucide-react';

interface ProductsViewProps {
  onDataChanged?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ onDataChanged }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'Software' | 'Add-on' | 'Service' | 'Hardware'>('Software');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState<Array<{ name: string; additional_price: number; sku?: string | null }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts(includeArchived);
      setProducts(data.products);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [includeArchived]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setName('');
    setType('Software');
    setSalesPrice('490');
    setCostPrice('150');
    setNotes('');
    setVariants([
      { name: 'Standard Edition', additional_price: 0, sku: 'STD' },
      { name: 'Odoo Brand (+560)', additional_price: 560, sku: 'ODOO' }
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setType(p.type);
    setSalesPrice(String(p.sales_price));
    setCostPrice(String(p.cost_price));
    setNotes(p.notes || '');
    setVariants(p.variants || []);
    setIsModalOpen(true);
  };

  const addVariantRow = () => {
    setVariants([...variants, { name: '', additional_price: 0, sku: '' }]);
  };

  const updateVariantRow = (index: number, field: string, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
  };

  const removeVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, {
          name,
          type,
          sales_price: Number(salesPrice),
          cost_price: Number(costPrice),
          notes,
          is_archived: editingProduct.is_archived,
          variants
        });
      } else {
        await api.createProduct({
          name,
          type,
          sales_price: Number(salesPrice),
          cost_price: Number(costPrice),
          notes,
          variants
        });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (id: string) => {
    try {
      await api.toggleArchiveProduct(id);
      loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Product Catalog & Variants</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Software tiers, add-ons, support services, and brand variant surcharges (e.g., Odoo brand adds $560)
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600 flex items-center gap-1 cursor-pointer mr-2">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Show Archived</span>
            </label>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => {
          const margin = p.sales_price > 0 ? Math.round(((p.sales_price - p.cost_price) / p.sales_price) * 100) : 0;
          return (
            <div
              key={p.id}
              className={`p-5 bg-white rounded-xl border transition-all shadow-2xs flex flex-col justify-between ${
                p.is_archived ? 'border-slate-300 opacity-60 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-2xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {p.type}
                    </span>
                    <h3 className="mt-2 text-sm font-bold text-slate-900">{p.name}</h3>
                  </div>
                  {p.is_archived ? (
                    <span className="text-2xs font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">Archived</span>
                  ) : null}
                </div>

                <p className="mt-2 text-xs text-slate-600 min-h-[2rem]">{p.notes || 'No description notes.'}</p>

                {/* Pricing Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-2xs">
                  <div>
                    <span className="text-slate-400 block">Sales Price</span>
                    <span className="font-mono font-bold text-slate-900 text-xs tabular-nums">${p.sales_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Unit Cost</span>
                    <span className="font-mono text-slate-600 text-xs tabular-nums">${p.cost_price.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gross Margin</span>
                    <span className="font-mono text-emerald-700 font-semibold text-xs tabular-nums">+{margin}%</span>
                  </div>
                </div>

                {/* Variants List */}
                {p.variants && p.variants.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Configured Variants & Adders:
                    </span>
                    <div className="space-y-1">
                      {p.variants.map((v) => (
                        <div key={v.id || v.name} className="flex justify-between items-center text-2xs bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="text-slate-700 font-medium">{v.name}</span>
                          <span className="font-mono font-semibold text-indigo-700">
                            {v.additional_price > 0 ? `+$${v.additional_price.toFixed(2)}` : 'Included'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-2xs">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="font-semibold text-slate-700 hover:text-slate-900"
                  >
                    Edit Product
                  </button>
                  <button
                    onClick={() => handleToggleArchive(p.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    {p.is_archived ? 'Restore' : 'Archive'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product & Variants' : 'Create New Product'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Brightloop Core Business Suite"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Software">Software</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Service">Service</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Standard Sales Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Internal Cost Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Description</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Full cloud ERP with inventory"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              {/* Dynamic Variants list */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Product Variants & Price Surcharges</span>
                  <button type="button" onClick={addVariantRow} className="text-xs text-indigo-600 font-semibold">
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {variants.map((v, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Variant name (e.g. Odoo Brand)"
                        value={v.name}
                        onChange={(e) => updateVariantRow(idx, 'name', e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded bg-white text-xs"
                      />
                      <div className="flex items-center gap-1 w-36">
                        <span className="text-slate-400">+$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price add"
                          value={v.additional_price}
                          onChange={(e) => updateVariantRow(idx, 'additional_price', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeVariantRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
