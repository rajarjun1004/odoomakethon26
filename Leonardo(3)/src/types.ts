export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  customer_id: string | null;
  customer_name?: string | null;
  created_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  billing_address: string | null;
  tax_id: string | null;
  notes: string | null;
  created_at: string;
  active_subscriptions_count?: number;
  total_paid?: number;
  outstanding_balance?: number;
}

export interface ProductVariant {
  id: string;
  product_id?: string;
  name: string;
  additional_price: number;
  sku?: string | null;
}

export interface Product {
  id: string;
  name: string;
  type: 'Software' | 'Add-on' | 'Service' | 'Hardware';
  sales_price: number;
  cost_price: number;
  notes: string | null;
  is_archived: number;
  created_at: string;
  variants: ProductVariant[];
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billing_cadence: 'daily' | 'weekly' | 'monthly' | 'yearly';
  base_cost: number;
  min_quantity: number;
  valid_from: string | null;
  valid_until: string | null;
  auto_close_on_end: number;
  allow_early_close: number;
  allow_pause: number;
  allow_renew: number;
  is_active: number;
  created_at: string;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  plan_id: string;
  plan_name?: string;
  billing_cadence?: string;
  validity_days: number;
  terms: string | null;
  items_json: string;
  created_at: string;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  is_default: number;
  is_active: number;
}

export interface DiscountRule {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  min_purchase_amount: number;
  min_quantity: number;
  start_date: string | null;
  end_date: string | null;
  usage_limit: number;
  times_used: number;
  applies_to_product_id: string | null;
  product_name?: string | null;
  is_active: number;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string;
  variant_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  product_name?: string;
  variant_name?: string;
}

export interface Quotation {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  billing_cadence: string;
  issue_date: string;
  valid_until: string;
  payment_terms: string;
  discount_id: string | null;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted';
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  converted_subscription_id?: string | null;
  created_at: string;
  items?: QuotationItem[];
}

export interface SubscriptionItem {
  id: string;
  subscription_id: string;
  product_id: string;
  variant_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  product_name?: string;
  variant_name?: string;
}

export interface Subscription {
  id: string;
  subscription_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  plan_id: string;
  plan_name: string;
  start_date: string;
  expiry_date: string | null;
  next_billing_date: string;
  last_billed_date: string | null;
  billing_cadence: 'daily' | 'weekly' | 'monthly' | 'yearly';
  payment_terms: string;
  discount_id: string | null;
  status: 'Draft' | 'Quotation' | 'Confirmed' | 'Active' | 'Paused' | 'Closed';
  notes: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  allow_pause?: number;
  allow_early_close?: number;
  allow_renew?: number;
  auto_close_on_end?: number;
  created_at: string;
  items?: SubscriptionItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  variant_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string | null;
  subscription_number?: string | null;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  customer_tax_id?: string | null;
  period_start: string | null;
  period_end: string | null;
  issue_date: string;
  due_date: string;
  status: 'Draft' | 'Confirmed' | 'Paid' | 'Cancelled';
  is_overdue?: boolean;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  invoice_number?: string;
  amount: number;
  created_at: string;
}

export interface PaymentMethod {
  id: string;
  customer_id: string;
  type: 'card' | 'bank_account' | 'upi';
  provider: string;
  brand: string | null;
  last4: string;
  exp_month?: number | null;
  exp_year?: number | null;
  holder_name?: string | null;
  is_default: number;
  created_at: string;
}

export interface PaymentGatewaySetting {
  id: string;
  name: string;
  type: 'card' | 'upi' | 'bank_account' | 'offline';
  enabled: boolean;
  mode: 'test' | 'live';
  currency: string;
  fee_percent: number;
  fee_fixed: number;
  publishable_key?: string;
  secret_key_configured?: boolean;
  vpa_merchant?: string;
  merchant_id?: string;
  beneficiary?: string;
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  swift_bic?: string;
  payee?: string;
  address?: string;
  supports_refunds: boolean;
}

export interface PaymentDunningSetting {
  auto_retry: boolean;
  max_retries: number;
  retry_interval_days: number;
  grace_period_days: number;
  late_fee_percent: number;
  auto_send_receipt: boolean;
  statement_descriptor: string;
}

export interface PaymentReceipt {
  receipt_number: string;
  payment: Payment;
  invoice: Invoice;
  customer: {
    id: string;
    name: string;
    email: string;
    billing_address?: string | null;
  };
  allocations: PaymentAllocation[];
}

export interface Payment {
  id: string;
  payment_number: string;
  invoice_id: string;
  invoice_number?: string;
  invoice_total?: number;
  customer_id: string;
  customer_name?: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string | null;
  status: 'Successful' | 'Refunded' | 'Partially Refunded' | 'Failed';
  refunded_amount?: number;
  refund_reason?: string | null;
  unallocated_amount?: number;
  recorded_by?: string;
  gateway?: string;
  allocations?: PaymentAllocation[];
  created_at: string;
}

export interface BillingRunRecord {
  id: string;
  run_date: string;
  subscriptions_evaluated: number;
  invoices_created: number;
  total_billed_amount: number;
  status: string;
  logs: string[];
  created_at: string;
}

export interface FinanceStats {
  activeSubCount: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  outstandingBalance: number;
  overdueCount: number;
  overdueAmount: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  upcomingBilling: Array<{
    id: string;
    subscription_number: string;
    next_billing_date: string;
    total_amount: number;
    billing_cadence: string;
    customer_name: string;
  }>;
}
