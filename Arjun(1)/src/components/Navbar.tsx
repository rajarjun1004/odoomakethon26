import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Shield, UserCircle, LogOut, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onDataRefreshNeeded: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenAuth, onDataRefreshNeeded }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [switching, setSwitching] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDemoSwitch = async (role: string, email?: string) => {
    setSwitching(true);
    try {
      await switchDemoRole(role, email);
      onDataRefreshNeeded();
    } finally {
      setSwitching(false);
      setMenuOpen(false);
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset database to clean initial demonstration dataset?')) return;
    setResetting(true);
    try {
      await api.resetDemo();
      onDataRefreshNeeded();
    } finally {
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 h-14">
        {/* Zone 1: Wordmark & View Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectTab(user?.role === 'customer' ? 'portal' : 'dashboard')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-indigo-700 transition-colors">
              B
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              Brightloop
            </span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-semibold text-slate-600 capitalize">
            {currentTab === 'dashboard' && 'Finance & Executive Overview'}
            {currentTab === 'subscriptions' && 'Customer Subscriptions'}
            {currentTab === 'billing' && 'Recurring Billing Engine'}
            {currentTab === 'invoices' && 'Invoices & Statements'}
            {currentTab === 'payments' && 'Payment Transactions'}
            {currentTab === 'quotations' && 'Quotations & Proposals'}
            {currentTab === 'products' && 'Product Catalog & Variants'}
            {currentTab === 'plans' && 'Subscription Plans & Rules'}
            {currentTab === 'customers' && 'Customer Directory'}
            {currentTab === 'taxes' && 'Taxes & Discounts'}
            {currentTab === 'staff' && 'Internal Staff Team'}
            {currentTab === 'portal' && 'My Customer Portal'}
          </span>
        </div>

        {/* Zone 2 & 3: Demo Persona Quick Switcher & User Account */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher Strip */}
          <div className="hidden lg:flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs">
            <span className="px-2 text-2xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" /> Demo Role:
            </span>
            <button
              onClick={() => handleDemoSwitch('admin')}
              disabled={switching}
              className={`px-2.5 py-1 text-2xs font-medium rounded-md transition-all ${
                user?.role === 'admin'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => handleDemoSwitch('staff')}
              disabled={switching}
              className={`px-2.5 py-1 text-2xs font-medium rounded-md transition-all ${
                user?.role === 'staff'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff
            </button>
            <button
              onClick={() => handleDemoSwitch('customer', 'sarah.jenkins@acme.com')}
              disabled={switching}
              className={`px-2.5 py-1 text-2xs font-medium rounded-md transition-all ${
                user?.role === 'customer'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold border border-indigo-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer
            </button>
          </div>

          {/* Reset Demo Data (Admin Only) */}
          {user?.role === 'admin' && (
            <button
              onClick={handleResetData}
              disabled={resetting}
              title="Reset sample database to fresh state"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 text-2xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset Data</span>
            </button>
          )}

          {/* User Profile or Sign In */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs text-left"
              >
                <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
                  <div className="text-2xs text-slate-500 uppercase tracking-wider">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                    <p className="text-2xs text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-2xs font-semibold text-indigo-700 bg-indigo-50 rounded">
                      Role: {user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onSelectTab(user.role === 'customer' ? 'portal' : 'dashboard');
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      {user.role === 'customer' ? 'Customer Portal' : 'Finance Dashboard'}
                    </button>
                    {user.role !== 'customer' && (
                      <button
                        onClick={() => {
                          onSelectTab('billing');
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Run Billing Engine
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
