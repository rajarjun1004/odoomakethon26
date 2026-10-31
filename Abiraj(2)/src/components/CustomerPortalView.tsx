import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Subscription, Invoice, Payment, SubscriptionPlan, Product, PaymentMethod, PaymentReceipt } from '../types';
import { useAuth } from '../context/AuthContext';
import { PrintableInvoice } from './PrintableInvoice';
import { PrintableReceipt } from './PrintableReceipt';
import {
  UserCircle,
  Repeat,
  FileText,
  CreditCard,
  Printer,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle,
  Pause,
  Play,
  RotateCw,
  Plus,
  Sliders,
  Check,
  X,
  Trash2,
  Star,
  ShieldCheck,
  Wallet,
  ArrowRight
} from 'lucide-react';

interface CustomerPortalViewProps {
  onSelectTab: (tab: string) => void;
  onDataChanged?: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({ onSelectTab, onDataChanged }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [receiptToPrint, setReceiptToPrint] = useState<PaymentReceipt | null>(null);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const [activeSubForAddons, setActiveSubForAddons] = useState<Subscription | null>(null);
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [isAddMethodOpen, setIsAddMethodOpen] = useState(false);

  // Subscribe modal form
  const [subPlanId, setSubPlanId] = useState('');
  const [subStartDate, setSubStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [subPaymentTerms, setSubPaymentTerms] = useState('Net 30');
  const [subVariantId, setSubVariantId] = useState('');
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [submittingSub, setSubmittingSub] = useState(false);

  // Pay invoice modal form
  const [payTypeChoice, setPayTypeChoice] = useState<'saved' | 'card' | 'upi' | 'wire'>('saved');
  const [paySelectedMethodId, setPaySelectedMethodId] = useState('');
  const [payIsPartial, setPayIsPartial] = useState(false);
  const [payCustomAmount, setPayCustomAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // New card / payment method fields in checkout
  const [cardLast4, setCardLast4] = useState('4242');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('2028');
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [saveCardCheck, setSaveCardCheck] = useState(true);
  const [upiVpa, setUpiVpa] = useState('');

  // Add Payment Method Modal Form
  const [newMethodType, setNewMethodType] = useState<'card' | 'bank_account' | 'upi'>('card');
  const [newMethodBrand, setNewMethodBrand] = useState('Visa');
  const [newMethodLast4, setNewMethodLast4] = useState('');
  const [newMethodExpMonth, setNewMethodExpMonth] = useState('12');
  const [newMethodExpYear, setNewMethodExpYear] = useState('2028');
  const [newMethodHolder, setNewMethodHolder] = useState(user?.name || '');
  const [newMethodIsDefault, setNewMethodIsDefault] = useState(false);
  const [submittingNewMethod, setSubmittingNewMethod] = useState(false);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [sData, iData, pData, plData, prData, pmData] = await Promise.all([
        api.getSubscriptions(),
        api.getInvoices(),
        api.getPayments(),
        api.getPlans(),
        api.getProducts(),
        api.getPaymentMethods()
      ]);
      setSubscriptions(sData.subscriptions);
      setInvoices(iData.invoices);
      setPayments(pData.payments);
      setPlans(plData.plans);
      setProducts(prData.products);
      setPaymentMethods(pmData.payment_methods);

      if (pmData.payment_methods.length > 0) {
        const defaultMethod = pmData.payment_methods.find((m) => m.is_default) || pmData.payment_methods[0];
        setPaySelectedMethodId(defaultMethod.id);
        setPayTypeChoice('saved');
      } else {
        setPayTypeChoice('card');
      }

      if (plData.plans.length > 0 && !subPlanId) {
        setSubPlanId(plData.plans[0].id);
      }
    } catch (err) {
      console.error('Failed to load customer portal ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [user]);

  const handlePrint = async (invId: string) => {
    try {
      const data = await api.getInvoiceDetail(invId);
      setViewInvoice(data.invoice);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePause = async (subId: string) => {
    if (!window.confirm('Pause your subscription? You will not be billed while paused.')) return;
    try {
      await api.pauseSubscription(subId);
      await loadPortalData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResume = async (subId: string) => {
    try {
      await api.resumeSubscription(subId);
      await loadPortalData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRenew = async (subId: string) => {
    try {
      const res = await api.renewSubscription(subId);
      alert(`Subscription renewed! New contract expiration: ${res.new_expiry_date}`);
      await loadPortalData();
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add-on toggle handler
  const handleToggleAddon = async (productId: string, isCurrentlyActive: boolean) => {
    if (!activeSubForAddons) return;
    try {
      await api.toggleSubscriptionAddon(activeSubForAddons.id, {
        product_id: productId,
        action: isCurrentlyActive ? 'remove' : 'add'
      });
      // Refresh
      const sData = await api.getSubscriptions();
      setSubscriptions(sData.subscriptions);
      const updated = sData.subscriptions.find((s) => s.id === activeSubForAddons.id);
      if (updated) {
        setActiveSubForAddons(updated);
      }
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Direct Customer Subscription Creation
  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePlanId = subPlanId || (plans.length > 0 ? plans[0].id : '');
    if (!effectivePlanId) {
      alert('Please select a subscription plan.');
      return;
    }
    setSubmittingSub(true);
    try {
      const plan = plans.find((p) => p.id === effectivePlanId) || plans[0];
      const coreProduct = products.find((p) => p.type === 'Software') || products[0];

      let unitPrice = coreProduct?.sales_price || plan?.base_cost || 490;
      let variantName = '';
      if (subVariantId && coreProduct && coreProduct.variants) {
        const v = coreProduct.variants.find((vr) => vr.id === subVariantId);
        if (v) {
          unitPrice += v.additional_price;
          variantName = ` (${v.name})`;
        }
      }

      const items = [
        {
          product_id: coreProduct?.id || (products.length > 0 ? products[0].id : 'prod_software'),
          variant_id: subVariantId || null,
          description: coreProduct ? `${coreProduct.name}${variantName}` : (plan?.name || 'Software Subscription'),
          quantity: plan?.min_quantity || 1,
          unit_price: unitPrice,
          tax_rate: 20
        }
      ];

      // Add any selected add-ons
      for (const addonId of selectedAddonIds) {
        const addProd = products.find((p) => p.id === addonId);
        if (addProd) {
          items.push({
            product_id: addProd.id,
            variant_id: null,
            description: addProd.name,
            quantity: 1,
            unit_price: addProd.sales_price,
            tax_rate: 20
          });
        }
      }

      await api.createSubscription({
        customer_id: user?.customer_id || '',
        plan_id: effectivePlanId,
        start_date: subStartDate,
        payment_terms: subPaymentTerms,
        notes: 'Online self-service subscription created via Customer Portal.',
        items,
        initial_status: 'Active'
      });

      setIsSubscribeOpen(false);
      setSelectedAddonIds([]);
      await loadPortalData();
      onDataChanged?.();
      alert('Congratulations! Your Brightloop subscription is now active. Your first billing invoice has been generated below.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingSub(false);
    }
  };

  // Direct Customer Invoice Payment
  const handleOpenPayModal = (inv: Invoice) => {
    setInvoiceToPay(inv);
    setPayIsPartial(false);
    setPayCustomAmount(inv.balance_due.toFixed(2));
    setPayReference(`AUTH-${Date.now().toString().slice(-6)}`);
    setPayNotes(`Online customer settlement for ${inv.invoice_number}`);
    if (paymentMethods.length > 0) {
      const def = paymentMethods.find((m) => m.is_default) || paymentMethods[0];
      setPaySelectedMethodId(def.id);
      setPayTypeChoice('saved');
    } else {
      setPayTypeChoice('card');
    }
  };

  const handlePayInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceToPay) return;

    const amountToPay = payIsPartial ? Number(payCustomAmount) : Number(invoiceToPay.balance_due);
    if (!amountToPay || amountToPay <= 0) {
      alert('Please specify a valid payment amount greater than zero.');
      return;
    }
    if (amountToPay > invoiceToPay.balance_due + 0.001) {
      alert(`Payment amount ($${amountToPay.toFixed(2)}) cannot exceed the invoice balance due ($${invoiceToPay.balance_due.toFixed(2)}).`);
      return;
    }

    let methodLabel = 'Credit Card';
    let cardPayload: any = {};

    if (payTypeChoice === 'saved') {
      const m = paymentMethods.find((pm) => pm.id === paySelectedMethodId);
      if (m) {
        methodLabel = `${m.brand || 'Card'} ending in ${m.last4}`;
      } else {
        methodLabel = 'Saved Payment Method';
      }
    } else if (payTypeChoice === 'card') {
      methodLabel = `${cardBrand} Card (ending in ${cardLast4})`;
      cardPayload = {
        save_payment_method: saveCardCheck,
        card_brand: cardBrand,
        card_last4: cardLast4,
        card_exp_month: Number(cardExpMonth),
        card_exp_year: Number(cardExpYear),
        card_holder: cardHolder
      };
    } else if (payTypeChoice === 'upi') {
      methodLabel = `UPI Instant Pay (${upiVpa || 'VPA'})`;
    } else if (payTypeChoice === 'wire') {
      methodLabel = 'Corporate Bank Wire / ACH';
    }

    setSubmittingPayment(true);
    try {
      const res = await api.recordPayment({
        invoice_id: invoiceToPay.id,
        amount: amountToPay,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: methodLabel,
        reference: payReference || `AUTH-${Date.now()}`,
        notes: payNotes,
        ...cardPayload
      });

      setInvoiceToPay(null);
      await loadPortalData();
      onDataChanged?.();

      if (res.receipt) {
        setReceiptToPrint(res.receipt);
      } else {
        alert(`Payment of $${amountToPay.toFixed(2)} recorded successfully.`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await api.getPaymentReceipt(paymentId);
      if (res.receipt) {
        setReceiptToPrint(res.receipt);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddPaymentMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethodLast4) {
      alert('Please specify the last 4 digits or identifier.');
      return;
    }

    setSubmittingNewMethod(true);
    try {
      await api.addPaymentMethod({
        type: newMethodType,
        brand: newMethodType === 'card' ? newMethodBrand : newMethodType === 'upi' ? 'UPI' : 'Bank ACH',
        last4: newMethodLast4,
        exp_month: newMethodType === 'card' ? Number(newMethodExpMonth) : undefined,
        exp_year: newMethodType === 'card' ? Number(newMethodExpYear) : undefined,
        holder_name: newMethodHolder || user?.name,
        is_default: newMethodIsDefault
      });
      setIsAddMethodOpen(false);
      setNewMethodLast4('');
      await loadPortalData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingNewMethod(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this payment method?')) return;
    try {
      await api.deletePaymentMethod(id);
      await loadPortalData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSetDefaultPaymentMethod = async (id: string) => {
    try {
      await api.setDefaultPaymentMethod(id);
      await loadPortalData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const activeSubs = subscriptions.filter((s) => s.status === 'Active');
  const unpaidInvoices = invoices.filter((i) => i.balance_due > 0 && i.status !== 'Cancelled');
  const totalBalanceDue = unpaidInvoices.reduce((acc, i) => acc + i.balance_due, 0);

  // Available add-ons for switching
  const addonProducts = products.filter((p) => p.type === 'Add-on' || p.type === 'Service');
  const coreProducts = products.filter((p) => p.type === 'Software');

  return (
    <div className="space-y-6">
      {viewInvoice && (
        <PrintableInvoice invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}

      {/* Customer Welcome Header */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Welcome back, {user?.customer_name || user?.name}
              </h1>
              <p className="text-xs text-slate-500">
                Customer Account: {user?.email} · Self-service subscription & billing portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-2xs text-slate-400 block">Active Subscriptions</span>
              <span className="font-mono text-base font-bold text-slate-900 tabular-nums">{activeSubs.length}</span>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="text-2xs text-slate-400 block">Current Balance Due</span>
              <span className={`font-mono text-base font-bold tabular-nums ${totalBalanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ${totalBalanceDue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Subscriptions Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-indigo-600" />
            <span>My Active Subscriptions</span>
          </h2>
          <button
            onClick={() => setIsSubscribeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Subscribe to a Plan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub) => {
              const activeItemProductIds = (sub.items || []).map((it) => it.product_id);
              return (
                <div key={sub.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-semibold text-indigo-700 block">
                        {sub.subscription_number}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{sub.plan_name}</h3>
                      <p className="text-2xs text-slate-500 capitalize">Billed {sub.billing_cadence}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 text-2xs font-bold rounded-md ${
                      sub.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'Paused'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-2xs text-slate-400 block">Next Billing Date</span>
                      <span className="font-mono font-semibold text-indigo-700">{sub.next_billing_date}</span>
                    </div>
                    <div>
                      <span className="text-2xs text-slate-400 block">Recurring Total</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        ${Number(sub.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Subscribed items list */}
                  {sub.items && sub.items.length > 0 && (
                    <div className="text-2xs text-slate-600 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-400 uppercase tracking-wider block">
                          Included Products & Add-ons:
                        </span>
                        <button
                          onClick={() => setActiveSubForAddons(sub)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Switch Add-ons</span>
                        </button>
                      </div>
                      {sub.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50/60 px-2 py-1 rounded">
                          <span>{it.quantity}x {it.description}</span>
                          <span className="font-mono font-medium">${Number(it.amount).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customer self-service actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs">
                    <div className="flex items-center gap-3">
                      {sub.status === 'Active' && sub.allow_pause !== 0 && (
                        <button
                          onClick={() => handlePause(sub.id)}
                          className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      )}
                      {sub.status === 'Paused' && (
                        <button
                          onClick={() => handleResume(sub.id)}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-900"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      )}
                      {sub.allow_renew !== 0 && sub.status !== 'Closed' && (
                        <button
                          onClick={() => handleRenew(sub.id)}
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Renew</span>
                        </button>
                      )}
                    </div>
                    <span className="text-slate-400">Terms: {sub.payment_terms}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 bg-white rounded-xl border border-slate-200 col-span-2 text-center text-xs text-slate-500 space-y-3">
              <p>You have not subscribed to any Brightloop software plans yet.</p>
              <button
                onClick={() => setIsSubscribeOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Browse Plans & Subscribe Now →</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoices & Statements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Invoices & Statements</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{invoices.length} invoices</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Issue Date</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Balance Due</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length > 0 ? (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-700">{inv.invoice_number}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{inv.issue_date}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{inv.due_date}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 text-2xs font-bold rounded ${
                      inv.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inv.is_overdue
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {inv.is_overdue ? 'Overdue' : inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                    ${inv.total_amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                    <span className={inv.balance_due > 0 ? 'text-amber-700' : 'text-slate-400'}>
                      ${inv.balance_due.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handlePrint(inv.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      {inv.balance_due > 0 && inv.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleOpenPayModal(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-2xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Online</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                  No invoices issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Receipts History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-slate-900">Settled Payment Receipts</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">{payments.length} settled</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Receipt #</th>
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Method & Ref</th>
              <th className="py-3 px-4 text-right">Amount Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-700">{p.payment_number}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{p.invoice_number}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{p.payment_date}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span>{p.payment_method}</span>
                    <span className="text-2xs text-slate-400 ml-1">({p.reference})</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    +${Number(p.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                  No payment transactions recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Subscribe to a Plan */}
      {isSubscribeOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Subscribe to Brightloop</h3>
                <p className="text-xs text-slate-500">Choose your software plan and optional add-ons</p>
              </div>
              <button onClick={() => setIsSubscribeOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubscribeSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Plan Choice */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Select Subscription Plan *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plans.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => setSubPlanId(pl.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        subPlanId === pl.id
                          ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{pl.name}</div>
                      <div className="text-indigo-600 font-mono font-bold text-sm mt-0.5">
                        ${pl.base_cost} <span className="text-2xs font-normal text-slate-500">/{pl.billing_cadence}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Suite Variant */}
              {coreProducts.length > 0 && coreProducts[0].variants?.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Software Edition / Variant
                  </label>
                  <select
                    value={subVariantId}
                    onChange={(e) => setSubVariantId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Standard Edition</option>
                    {coreProducts[0].variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (+${v.additional_price})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Add-ons */}
              {addonProducts.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Optional Add-ons (Switchable at any time)
                  </label>
                  <div className="space-y-2">
                    {addonProducts.map((addon) => {
                      const isSelected = selectedAddonIds.includes(addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                            } else {
                              setSelectedAddonIds([...selectedAddonIds, addon.id]);
                            }
                          }}
                          className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900">{addon.name}</div>
                            <div className="text-2xs text-slate-500">{addon.notes}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700">
                              +${addon.sales_price}
                            </span>
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                              isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Terms & Start Date */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={subStartDate}
                    onChange={(e) => setSubStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Terms</label>
                  <select
                    value={subPaymentTerms}
                    onChange={(e) => setSubPaymentTerms(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubscribeOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSub}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  {submittingSub ? 'Activating Subscription...' : 'Confirm & Activate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Switch Add-ons on and off (PDF Requirement) */}
      {activeSubForAddons && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Switch Add-ons</h3>
                <p className="text-xs text-slate-500">
                  {activeSubForAddons.subscription_number} · {activeSubForAddons.plan_name}
                </p>
              </div>
              <button onClick={() => setActiveSubForAddons(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Turn add-on capabilities on or off. Changes will be reflected automatically on your next billing invoice.
              </p>

              <div className="space-y-3">
                {addonProducts.map((addon) => {
                  const isCurrentlyActive = (activeSubForAddons.items || []).some(
                    (it) => it.product_id === addon.id
                  );
                  return (
                    <div
                      key={addon.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{addon.name}</div>
                        <div className="text-2xs text-slate-500">{addon.notes}</div>
                        <div className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">
                          +${addon.sales_price} / billing cycle
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleAddon(addon.id, isCurrentlyActive)}
                        className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-colors ${
                          isCurrentlyActive
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                        }`}
                      >
                        {isCurrentlyActive ? 'Turn Off' : 'Turn On'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSubForAddons(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Pay Invoice Online */}
      {invoiceToPay && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Pay Outstanding Invoice</h3>
                <p className="text-xs font-mono text-indigo-600">{invoiceToPay.invoice_number}</p>
              </div>
              <button onClick={() => setInvoiceToPay(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayInvoiceSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-center">
                <span className="text-2xs text-indigo-600 block uppercase tracking-wider font-semibold">
                  Amount to Settle
                </span>
                <span className="font-mono text-2xl font-bold text-indigo-950">
                  ${Number(invoiceToPay.balance_due).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Credit Card (Visa / Mastercard)">Credit Card (Visa / Mastercard)</option>
                  <option value="ACH Direct Debit">ACH Direct Debit</option>
                  <option value="Corporate Wire Transfer">Corporate Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Authorization Reference</label>
                <input
                  type="text"
                  required
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceToPay(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                >
                  {submittingPayment ? 'Processing Settlement...' : `Pay $${Number(invoiceToPay.balance_due).toFixed(2)} Now`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
