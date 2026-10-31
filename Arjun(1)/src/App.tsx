import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { FinanceDashboard } from './components/FinanceDashboard';
import { SubscriptionsView } from './components/SubscriptionsView';
import { BillingEngineView } from './components/BillingEngineView';
import { InvoicesView } from './components/InvoicesView';
import { PaymentsView } from './components/PaymentsView';
import { QuotationsView } from './components/QuotationsView';
import { ProductsView } from './components/ProductsView';
import { PlansView } from './components/PlansView';
import { CustomersView } from './components/CustomersView';
import { TaxesDiscountsView } from './components/TaxesDiscountsView';
import { StaffManagementView } from './components/StaffManagementView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { AuthModal } from './components/AuthModal';
import { Invoice } from './types';
import { ShieldCheck, Info } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, isLoading, switchDemoRole } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  // If customer logs in, switch default view to customer portal and refresh all state
  React.useEffect(() => {
    if (user?.role === 'customer' && currentTab === 'dashboard') {
      setCurrentTab('portal');
    } else if (user?.role !== 'customer' && currentTab === 'portal') {
      setCurrentTab('dashboard');
    }
    setDataVersion((v) => v + 1);
  }, [user]);

  const handleRefresh = () => {
    setDataVersion((v) => v + 1);
  };

  const handleOpenRecordPayment = (inv: Invoice) => {
    setInvoiceToPay(inv);
    setCurrentTab('payments');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-500 font-mono">
        Initializing Brightloop Subscription Platform...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Demo Context Banner for Professor / Reviewer */}
      <div className="bg-indigo-900 text-indigo-100 px-4 py-1.5 text-2xs flex items-center justify-between no-print border-b border-indigo-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
          <span className="font-semibold text-white">Brightloop College Assignment Demo Mode:</span>
          <span className="hidden sm:inline text-indigo-200">
            Persistent SQLite database with real recurring billing engine, duplicate invoice prevention & RBAC
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-indigo-300">Active Persona:</span>
          <span className="font-bold font-mono text-white bg-indigo-800/80 px-2 py-0.5 rounded">
            {user ? `${user.name} (${user.role.toUpperCase()})` : 'Guest'}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAuth={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onDataRefreshNeeded={handleRefresh}
      />

      {!user ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl mx-auto shadow-xs">
              B
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Welcome to Brightloop</h1>
              <p className="text-xs text-slate-500 mt-1">
                Unified Subscription Management & Recurring Billing Platform
              </p>
            </div>

            <div className="space-y-2 text-left">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block">
                Select Persona for Live Demonstration:
              </span>
              <button
                onClick={() => switchDemoRole('admin')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between text-xs transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-900">Brightloop Admin</div>
                  <div className="text-2xs text-slate-500">Full system control, products, plans & finance reports</div>
                </div>
                <span className="text-indigo-600 font-semibold text-xs">Enter →</span>
              </button>
              <button
                onClick={() => switchDemoRole('staff')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between text-xs transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-900">Operations Staff</div>
                  <div className="text-2xs text-slate-500">Day-to-day quotations, invoices & payment logging</div>
                </div>
                <span className="text-indigo-600 font-semibold text-xs">Enter →</span>
              </button>
              <button
                onClick={() => switchDemoRole('customer', 'sarah.jenkins@acme.com')}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center justify-between text-xs transition-colors group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-indigo-900">Customer (Acme Corp)</div>
                  <div className="text-2xs text-slate-500">Customer portal: my subscriptions & printable statements</div>
                </div>
                <span className="text-indigo-600 font-semibold text-xs">Enter →</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-xs">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                Custom Sign In
              </button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex w-full">
          {/* Left Sidebar */}
          <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

          {/* Content Viewport */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
            {currentTab === 'dashboard' && (
              <FinanceDashboard
                key={dataVersion}
                onSelectTab={setCurrentTab}
                onOpenCreateSub={() => setCurrentTab('subscriptions')}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'subscriptions' && (
              <SubscriptionsView
                key={dataVersion}
                onSelectTab={setCurrentTab}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'billing' && (
              <BillingEngineView
                key={dataVersion}
                onSelectTab={setCurrentTab}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'invoices' && (
              <InvoicesView
                key={dataVersion}
                onOpenRecordPayment={handleOpenRecordPayment}
                onSelectTab={setCurrentTab}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                key={dataVersion}
                initialInvoiceToPay={invoiceToPay}
                onClearInitialInvoice={() => setInvoiceToPay(null)}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'quotations' && (
              <QuotationsView
                key={dataVersion}
                onSelectTab={setCurrentTab}
                onDataChanged={handleRefresh}
              />
            )}

            {currentTab === 'products' && (
              <ProductsView key={dataVersion} onDataChanged={handleRefresh} />
            )}

            {currentTab === 'plans' && (
              <PlansView key={dataVersion} onDataChanged={handleRefresh} />
            )}

            {currentTab === 'customers' && (
              <CustomersView key={dataVersion} onDataChanged={handleRefresh} />
            )}

            {currentTab === 'taxes' && (
              <TaxesDiscountsView key={dataVersion} onDataChanged={handleRefresh} />
            )}

            {currentTab === 'staff' && (
              <StaffManagementView key={dataVersion} onDataChanged={handleRefresh} />
            )}

            {currentTab === 'portal' && (
              <CustomerPortalView
                key={dataVersion}
                onSelectTab={setCurrentTab}
                onDataChanged={handleRefresh}
              />
            )}
          </main>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
