import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Repeat,
  Zap,
  FileText,
  CreditCard,
  FileSignature,
  Boxes,
  Layers,
  Users,
  Percent,
  UserCheck,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'admin';

  const adminStaffNav = [
    { id: 'dashboard', label: 'Finance Overview', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'billing', label: 'Billing Engine', icon: Zap },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'quotations', label: 'Quotations', icon: FileSignature },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products & Variants', icon: Boxes },
    { id: 'plans', label: 'Subscription Plans', icon: Layers },
    { id: 'taxes', label: 'Taxes & Discounts', icon: Percent },
    ...(role === 'admin' ? [{ id: 'staff', label: 'Internal Staff', icon: UserCheck }] : [])
  ];

  const customerNav = [
    { id: 'portal', label: 'My Portal', icon: UserCircle },
    { id: 'subscriptions', label: 'My Subscriptions', icon: Repeat },
    { id: 'invoices', label: 'My Invoices', icon: FileText },
    { id: 'payments', label: 'Payment Receipts', icon: CreditCard }
  ];

  const navItems = role === 'customer' ? customerNav : adminStaffNav;

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between py-4 px-3 min-h-[calc(100vh-3.5rem)] no-print">
      <div className="space-y-6">
        {/* Navigation Section */}
        <div>
          <div className="px-3 pb-2 text-2xs font-bold text-slate-400 uppercase tracking-wider">
            {role === 'customer' ? 'Customer Self-Service' : 'Workspace'}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Role Privileges Card */}
        <div className="px-3 py-3 bg-slate-50 rounded-lg border border-slate-200 text-2xs text-slate-500 space-y-1">
          <div className="flex items-center justify-between font-semibold text-slate-700">
            <span>Logged in role:</span>
            <span className="uppercase text-indigo-600 font-bold">{role}</span>
          </div>
          <p className="text-slate-500">
            {role === 'admin' && 'Full system control: products, plans, tax/discounts, staff accounts & financials.'}
            {role === 'staff' && 'Operations view: prepare quotes, confirm subscriptions, issue invoices & log payments.'}
            {role === 'customer' && 'Customer portal: view only your personal subscriptions, invoices & pay history.'}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 text-2xs text-slate-400 border-t border-slate-100 pt-3">
        <p>Brightloop System v2026.1</p>
        <p className="mt-0.5">SQLite Persistence Active</p>
      </div>
    </aside>
  );
};
