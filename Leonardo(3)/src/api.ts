import {
  User,
  Customer,
  Product,
  SubscriptionPlan,
  QuotationTemplate,
  Quotation,
  Subscription,
  Invoice,
  Payment,
  PaymentMethod,
  PaymentGatewaySetting,
  PaymentDunningSetting,
  PaymentReceipt,
  TaxRule,
  DiscountRule,
  BillingRunRecord,
  FinanceStats
} from './types';

const TOKEN_KEY = 'brightloop_session_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errorMsg = `Request failed: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setStoredToken(data.token);
    return data;
  },

  async register(payload: {
    name: string;
    email: string;
    password: string;
    companyName?: string;
    phone?: string;
    billingAddress?: string;
  }): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async forgotPassword(email: string): Promise<{
    message: string;
    token: string | null;
    resetLink?: string;
    simulatedEmail?: { to: string; subject: string; body: string };
  }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  },

  async addStaffMember(payload: { name: string; email: string; password: string }): Promise<{ success: boolean; user: any }> {
    return request('/api/auth/users/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getUsers(): Promise<{ users: User[] }> {
    return request<{ users: User[] }>('/api/auth/users');
  },

  async switchDemoUser(role?: string, email?: string): Promise<{ token: string; user: User }> {
    const data = await request<{ token: string; user: User }>('/api/auth/switch-demo', {
      method: 'POST',
      body: JSON.stringify({ role, email })
    });
    setStoredToken(data.token);
    return data;
  },

  // Products
  async getProducts(includeArchived = false): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>(`/api/products?includeArchived=${includeArchived}`);
  },

  async createProduct(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateProduct(id: string, payload: any): Promise<{ success: boolean }> {
    return request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async toggleArchiveProduct(id: string): Promise<{ success: boolean }> {
    return request(`/api/products/${id}/toggle-archive`, { method: 'POST' });
  },

  // Plans
  async getPlans(): Promise<{ plans: SubscriptionPlan[] }> {
    return request<{ plans: SubscriptionPlan[] }>('/api/plans');
  },

  async createPlan(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/plans', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updatePlan(id: string, payload: any): Promise<{ success: boolean }> {
    return request(`/api/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Customers
  async getCustomers(search?: string): Promise<{ customers: Customer[] }> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<{ customers: Customer[] }>(`/api/customers${q}`);
  },

  async getCustomerDetail(id: string): Promise<{
    customer: Customer;
    subscriptions: Subscription[];
    invoices: Invoice[];
    payments: Payment[];
  }> {
    return request(`/api/customers/${id}/detail`);
  },

  async createCustomer(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateCustomer(id: string, payload: any): Promise<{ success: boolean }> {
    return request(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Quotation Templates
  async getQuotationTemplates(): Promise<{ templates: QuotationTemplate[] }> {
    return request<{ templates: QuotationTemplate[] }>('/api/quotation-templates');
  },

  async createQuotationTemplate(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/quotation-templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deleteQuotationTemplate(id: string): Promise<{ success: boolean }> {
    return request(`/api/quotation-templates/${id}`, { method: 'DELETE' });
  },

  // Quotations
  async getQuotations(): Promise<{ quotations: Quotation[] }> {
    return request<{ quotations: Quotation[] }>('/api/quotations');
  },

  async createQuotation(payload: any): Promise<{ success: boolean; id: string; quote_number: string }> {
    return request('/api/quotations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async convertQuotation(id: string): Promise<{ success: boolean; subscription_id: string; subscription_number: string }> {
    return request(`/api/quotations/${id}/convert`, { method: 'POST' });
  },

  // Subscriptions
  async getSubscriptions(): Promise<{ subscriptions: Subscription[] }> {
    return request<{ subscriptions: Subscription[] }>('/api/subscriptions');
  },

  async createSubscription(payload: any): Promise<{ success: boolean; id: string; subscription_number: string }> {
    return request('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateSubscriptionStatus(id: string, status: string): Promise<{ success: boolean; status: string }> {
    return request(`/api/subscriptions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
  },

  async pauseSubscription(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/subscriptions/${id}/pause`, { method: 'POST' });
  },

  async resumeSubscription(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/subscriptions/${id}/resume`, { method: 'POST' });
  },

  async renewSubscription(id: string): Promise<{ success: boolean; new_expiry_date: string }> {
    return request(`/api/subscriptions/${id}/renew`, { method: 'POST' });
  },

  async closeSubscription(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/subscriptions/${id}/close`, { method: 'POST' });
  },

  async toggleSubscriptionAddon(id: string, payload: {
    product_id: string;
    variant_id?: string;
    action: 'add' | 'remove';
  }): Promise<{ success: boolean; message: string }> {
    return request(`/api/subscriptions/${id}/toggle-addon`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Invoices
  async getInvoices(): Promise<{ invoices: Invoice[] }> {
    return request<{ invoices: Invoice[] }>('/api/invoices');
  },

  async getInvoiceDetail(id: string): Promise<{ invoice: Invoice; items: any[]; payments: Payment[] }> {
    return request(`/api/invoices/${id}`);
  },

  async confirmInvoice(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/invoices/${id}/confirm`, { method: 'POST' });
  },

  async cancelInvoice(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/invoices/${id}/cancel`, { method: 'POST' });
  },

  async sendInvoice(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/invoices/${id}/send`, { method: 'POST' });
  },

  // Payments & Role-Based Billing Ops
  async getPayments(): Promise<{ payments: Payment[] }> {
    return request<{ payments: Payment[] }>('/api/payments');
  },

  async recordPayment(payload: {
    invoice_id: string;
    amount: number;
    payment_date?: string;
    payment_method: string;
    reference: string;
    notes?: string;
    save_payment_method?: boolean;
    card_last4?: string;
    card_brand?: string;
    card_exp_month?: number;
    card_exp_year?: number;
    card_holder?: string;
  }): Promise<{ success: boolean; payment_number: string; payment_id: string; receipt?: PaymentReceipt }> {
    return request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getPaymentReceipt(id: string): Promise<{ receipt: PaymentReceipt }> {
    return request(`/api/payments/receipt/${id}`);
  },

  // Payment Methods (Saved cards / accounts)
  async getPaymentMethods(customerId?: string): Promise<{ payment_methods: PaymentMethod[] }> {
    const url = customerId ? `/api/payment-methods?customer_id=${encodeURIComponent(customerId)}` : '/api/payment-methods';
    return request<{ payment_methods: PaymentMethod[] }>(url);
  },

  async addPaymentMethod(payload: {
    type: 'card' | 'bank_account' | 'upi';
    provider?: string;
    brand?: string;
    last4: string;
    exp_month?: number;
    exp_year?: number;
    holder_name?: string;
    is_default?: boolean;
    customer_id?: string;
  }): Promise<{ success: boolean; id: string; is_default: number }> {
    return request('/api/payment-methods', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async deletePaymentMethod(id: string): Promise<{ success: boolean }> {
    return request(`/api/payment-methods/${id}`, { method: 'DELETE' });
  },

  async setDefaultPaymentMethod(id: string): Promise<{ success: boolean }> {
    return request(`/api/payment-methods/${id}/default`, { method: 'PATCH' });
  },

  // Staff Manual Payment Recording & Multi-Invoice Reconciliation
  async recordManualPayment(payload: {
    customer_id: string;
    amount: number;
    payment_method: string;
    reference: string;
    payment_date?: string;
    notes?: string;
    allocations?: Array<{ invoice_id: string; amount: number }>;
    auto_match?: boolean;
  }): Promise<{
    success: boolean;
    payment_number: string;
    payment_id: string;
    allocated_count: number;
    allocated_amount: number;
    unallocated_amount: number;
    allocations: any[];
  }> {
    return request('/api/payments/record-manual', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async reconcilePayment(id: string, allocations: Array<{ invoice_id: string; amount: number }>): Promise<{
    success: boolean;
    allocated_amount: number;
  }> {
    return request(`/api/payments/${id}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ allocations })
    });
  },

  // Admin Payment Settings & Gateway Configuration
  async getAdminPaymentSettings(): Promise<{ gateways: PaymentGatewaySetting[]; dunning: PaymentDunningSetting }> {
    return request('/api/admin/payment-settings');
  },

  async updateAdminPaymentSettings(payload: {
    gateways?: PaymentGatewaySetting[];
    dunning?: Partial<PaymentDunningSetting>;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Admin Refund Processing
  async issueRefund(id: string, refund_amount?: number, reason?: string): Promise<{
    success: boolean;
    message: string;
    status: string;
    refunded_amount: number;
  }> {
    return request(`/api/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ refund_amount, reason })
    });
  },

  async getAdminTransactionOverview(): Promise<{
    total_count: number;
    total_volume: number;
    total_refunded: number;
    net_volume: number;
    total_unallocated: number;
    successful_count: number;
    refunded_count: number;
    estimated_fees: number;
    gateway_distribution: Array<{ gateway: string; count: number; volume: number }>;
  }> {
    return request('/api/admin/transactions/overview');
  },

  // Taxes & Discounts
  async getTaxes(): Promise<{ taxes: TaxRule[] }> {
    return request<{ taxes: TaxRule[] }>('/api/taxes');
  },

  async createTax(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/taxes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateTax(id: string, payload: any): Promise<{ success: boolean }> {
    return request(`/api/taxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async getDiscounts(): Promise<{ discounts: DiscountRule[] }> {
    return request<{ discounts: DiscountRule[] }>('/api/discounts');
  },

  async createDiscount(payload: any): Promise<{ success: boolean; id: string }> {
    return request('/api/discounts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateDiscount(id: string, payload: any): Promise<{ success: boolean }> {
    return request(`/api/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  // Billing Engine
  async runBilling(asOfDate?: string): Promise<any> {
    return request('/api/billing/run', {
      method: 'POST',
      body: JSON.stringify({ asOfDate })
    });
  },

  async getBillingHistory(): Promise<{ history: BillingRunRecord[] }> {
    return request<{ history: BillingRunRecord[] }>('/api/billing/history');
  },

  // Finance Dashboard
  async getFinanceStats(): Promise<FinanceStats> {
    return request<FinanceStats>('/api/finance/stats');
  },

  // Reset demo
  async resetDemo(): Promise<{ success: boolean; message: string }> {
    return request('/api/debug/reset-seed', { method: 'POST' });
  }
};
