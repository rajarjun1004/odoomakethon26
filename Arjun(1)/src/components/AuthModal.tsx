import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { X, Check, AlertCircle, KeyRound, Mail, User, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'reset';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register, switchDemoRole } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(initialMode);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot / Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [simulatedMail, setSimulatedMail] = useState<{ to: string; subject: string; body: string; token: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password requirements calculation
  const targetPwd = mode === 'register' ? regPassword : newPassword;
  const hasMinLength = targetPwd.length > 8;
  const hasUpper = /[A-Z]/.test(targetPwd);
  const hasLower = /[a-z]/.test(targetPwd);
  const hasSpecial = /[^a-zA-Z0-9]/.test(targetPwd);
  const isPwdCompliant = hasMinLength && hasUpper && hasLower && hasSpecial;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwdCompliant) {
      setError('Password does not satisfy the security requirements.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        companyName: regCompany,
        phone: regPhone
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotEmail);
      if (res.token) {
        setSimulatedMail({
          to: forgotEmail,
          subject: 'Brightloop Password Reset',
          body: `Use reset token: ${res.token}`,
          token: res.token
        });
        setResetToken(res.token);
      }
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Error processing request.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPwdCompliant) {
      setError('New password must satisfy security requirements.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: string) => {
    setLoading(true);
    try {
      await switchDemoRole(role);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {mode === 'login' && 'Sign in to Brightloop'}
              {mode === 'register' && 'Create your Brightloop Account'}
              {mode === 'forgot' && 'Reset your password'}
              {mode === 'reset' && 'Choose a new password'}
            </h2>
            <p className="text-xs text-slate-500">Subscription & Recurring Billing Platform</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Fast Login Shortcuts */}
        {mode === 'login' && (
          <div className="px-6 py-3 bg-indigo-50/70 border-b border-indigo-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-2xs font-semibold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Demo Quick Sign-in:
              </span>
              <span className="text-2xs text-indigo-700">1-click login</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100/50 transition-colors shadow-2xs"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('staff')}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100/50 transition-colors shadow-2xs"
              >
                Staff Rep
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('customer')}
                className="px-2 py-1 text-xs font-medium text-slate-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100/50 transition-colors shadow-2xs"
              >
                Customer
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-800">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@brightloop.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <div className="pt-2 text-center text-xs text-slate-500">
                New business?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-indigo-600 font-semibold hover:text-indigo-800"
                >
                  Create customer account
                </button>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Contact Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company / Org</label>
                  <input
                    type="text"
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    placeholder="Apex Retail Inc."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Work Email Address *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="elena@apexretail.shop"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 9 chars, Upper, Lower & Symbol"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {/* Password Criteria Checklist based on PDF specification */}
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-2xs space-y-1">
                  <span className="font-semibold text-slate-600 block">Password Requirements (Project PDF):</span>
                  <div className="flex items-center gap-1.5">
                    <span className={hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasMinLength ? '✓' : '○'}
                    </span>
                    <span className={hasMinLength ? 'text-slate-700' : 'text-slate-500'}>More than 8 characters (at least 9)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasUpper ? '✓' : '○'}
                    </span>
                    <span className={hasUpper ? 'text-slate-700' : 'text-slate-500'}>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasLower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasLower ? '✓' : '○'}
                    </span>
                    <span className={hasLower ? 'text-slate-700' : 'text-slate-500'}>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasSpecial ? '✓' : '○'}
                    </span>
                    <span className={hasSpecial ? 'text-slate-700' : 'text-slate-500'}>At least one special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPwdCompliant}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40"
              >
                {loading ? 'Creating account...' : 'Create Customer Account'}
              </button>

              <div className="pt-1 text-center text-xs text-slate-500">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-indigo-600 font-semibold hover:text-indigo-800"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter your registered email address. We will generate a secure reset token immediately for demonstration.
              </p>
              <form onSubmit={handleForgot} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registered Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="sarah.jenkins@acme.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
                >
                  {loading ? 'Generating...' : 'Send Reset Link'}
                </button>
              </form>

              {simulatedMail && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <div className="font-semibold flex items-center gap-1 text-amber-950 mb-1">
                    <Mail className="w-3.5 h-3.5 text-amber-700" /> Simulated Dispatch to {simulatedMail.to}:
                  </div>
                  <p className="font-mono text-2xs bg-white p-2 rounded border border-amber-200 select-all mb-2">
                    Token: {simulatedMail.token}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-full py-1.5 px-3 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200 transition-colors"
                  >
                    Proceed with this Token →
                  </button>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}

          {/* RESET PASSWORD CONFIRM FORM */}
          {mode === 'reset' && (
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Reset Token</label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 9 chars with Upper, Lower, Symbol"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                {/* Password Criteria Checklist */}
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-2xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={hasMinLength ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasMinLength ? '✓' : '○'}
                    </span>
                    <span className={hasMinLength ? 'text-slate-700' : 'text-slate-500'}>More than 8 characters (at least 9)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasUpper ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasUpper ? '✓' : '○'}
                    </span>
                    <span className={hasUpper ? 'text-slate-700' : 'text-slate-500'}>At least one uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasLower ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasLower ? '✓' : '○'}
                    </span>
                    <span className={hasLower ? 'text-slate-700' : 'text-slate-500'}>At least one lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasSpecial ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                      {hasSpecial ? '✓' : '○'}
                    </span>
                    <span className={hasSpecial ? 'text-slate-700' : 'text-slate-500'}>At least one special character</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPwdCompliant}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-40"
              >
                {loading ? 'Saving...' : 'Update Password & Return to Login'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  ← Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
