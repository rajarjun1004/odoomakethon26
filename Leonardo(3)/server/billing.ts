import { db } from './db.ts';
import crypto from 'crypto';

export interface BillingRunResult {
  runId: string;
  runDate: string;
  evaluatedCount: number;
  createdInvoicesCount: number;
  totalBilledAmount: number;
  createdInvoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    amount: number;
  }>;
  skippedCount: number;
  logs: string[];
}

export function computeNextDate(currentDateStr: string, cadence: string): string {
  const d = new Date(currentDateStr + 'T00:00:00Z');
  if (cadence === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (cadence === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (cadence === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
  } else if (cadence === 'yearly') {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
  } else {
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

export function computePeriodEnd(startDateStr: string, cadence: string): string {
  const nextDateStr = computeNextDate(startDateStr, cadence);
  const nextDate = new Date(nextDateStr + 'T00:00:00Z');
  nextDate.setUTCDate(nextDate.getUTCDate() - 1);
  return nextDate.toISOString().split('T')[0];
}

export function computeDueDate(issueDateStr: string, terms: string): string {
  const d = new Date(issueDateStr + 'T00:00:00Z');
  if (terms === 'Net 15') {
    d.setUTCDate(d.getUTCDate() + 15);
  } else if (terms === 'Net 30') {
    d.setUTCDate(d.getUTCDate() + 30);
  } else if (terms === 'Net 60') {
    d.setUTCDate(d.getUTCDate() + 60);
  } else {
    // Due on Receipt or custom immediate
    return issueDateStr;
  }
  return d.toISOString().split('T')[0];
}

export function getNextInvoiceNumber(): string {
  const currentYear = new Date().getUTCFullYear();
  const prefix = `INV-${currentYear}-`;
  const lastInvoice = db.prepare(
    "SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1"
  ).get(`${prefix}%`) as { invoice_number: string } | undefined;

  let nextSeq = 1;
  if (lastInvoice && lastInvoice.invoice_number) {
    const parts = lastInvoice.invoice_number.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    }
  }
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}

export function runBillingEngine(asOfDateInput?: string): BillingRunResult {
  const asOfDate = asOfDateInput || new Date().toISOString().split('T')[0];
  const logs: string[] = [];
  logs.push(`[${new Date().toISOString()}] Starting billing run for reference date: ${asOfDate}`);

  // Fetch all active subscriptions where next_billing_date <= asOfDate
  const activeSubs = db.prepare(`
    SELECT s.*, c.name as customer_name, c.email as customer_email,
           p.name as plan_name, p.auto_close_on_end
    FROM subscriptions s
    JOIN customers c ON s.customer_id = c.id
    JOIN subscription_plans p ON s.plan_id = p.id
    WHERE s.status = 'Active' AND s.next_billing_date <= ?
    ORDER BY s.next_billing_date ASC
  `).all(asOfDate) as any[];

  logs.push(`Identified ${activeSubs.length} active subscription(s) due for billing.`);

  let createdInvoicesCount = 0;
  let skippedCount = 0;
  let totalBilledAmount = 0;
  const createdInvoices: BillingRunResult['createdInvoices'] = [];

  const runId = `run_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // Execute in transaction
  const executeBilling = db.transaction(() => {
    for (const sub of activeSubs) {
      const periodStart = sub.next_billing_date;
      const periodEnd = computePeriodEnd(periodStart, sub.billing_cadence);

      // Check for duplicate invoice in this billing cycle for this subscription
      const existingInv = db.prepare(`
        SELECT id, invoice_number FROM invoices
        WHERE subscription_id = ? AND period_start = ?
      `).get(sub.id, periodStart) as { id: string; invoice_number: string } | undefined;

      if (existingInv) {
        logs.push(`Subscription ${sub.subscription_number} already has invoice ${existingInv.invoice_number} for period start ${periodStart}. Skipping to prevent duplicate.`);
        skippedCount++;
        continue;
      }

      // Fetch items for subscription
      const items = db.prepare(`
        SELECT * FROM subscription_items WHERE subscription_id = ?
      `).all(sub.id) as any[];

      if (items.length === 0) {
        logs.push(`Subscription ${sub.subscription_number} has no line items. Skipping.`);
        skippedCount++;
        continue;
      }

      let subtotal = 0;
      let totalTax = 0;
      let totalQuantity = 0;

      for (const item of items) {
        subtotal += Number(item.amount);
        totalQuantity += Number(item.quantity);
        const itemTax = (Number(item.amount) * (Number(item.tax_rate) || 0)) / 100;
        totalTax += itemTax;
      }

      // Evaluate discount rule if present
      let discountAmount = 0;
      if (sub.discount_id) {
        const discount = db.prepare(`
          SELECT * FROM discounts WHERE id = ? AND is_active = 1
        `).get(sub.discount_id) as any;

        if (discount) {
          const isDateValid = (!discount.start_date || asOfDate >= discount.start_date) &&
                              (!discount.end_date || asOfDate <= discount.end_date);
          const isLimitValid = discount.usage_limit === 0 || discount.times_used < discount.usage_limit;
          const isMinSpendValid = subtotal >= (discount.min_purchase_amount || 0);
          const isMinQtyValid = totalQuantity >= (discount.min_quantity || 0);

          if (isDateValid && isLimitValid && isMinSpendValid && isMinQtyValid) {
            if (discount.type === 'percentage') {
              discountAmount = (subtotal * discount.value) / 100;
            } else {
              discountAmount = Math.min(discount.value, subtotal);
            }
            // Update discount times_used
            db.prepare(`UPDATE discounts SET times_used = times_used + 1 WHERE id = ?`).run(discount.id);
            logs.push(`Applied discount ${discount.code} (-$${discountAmount.toFixed(2)}) to sub ${sub.subscription_number}.`);
          } else {
            logs.push(`Discount ${discount.code} does not meet eligibility criteria for sub ${sub.subscription_number}.`);
          }
        }
      }

      const invoiceTotal = Math.max(0, subtotal - discountAmount + totalTax);
      const invoiceId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const invoiceNumber = getNextInvoiceNumber();
      const issueDate = asOfDate;
      const dueDate = computeDueDate(issueDate, sub.payment_terms || 'Due on Receipt');

      // Insert Invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, subscription_id, customer_id, period_start, period_end,
          issue_date, due_date, status, subtotal, discount_amount, tax_amount,
          total_amount, paid_amount, balance_due, payment_terms, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId,
        invoiceNumber,
        sub.id,
        sub.customer_id,
        periodStart,
        periodEnd,
        issueDate,
        dueDate,
        'Confirmed', // Ready for payment
        subtotal,
        discountAmount,
        totalTax,
        invoiceTotal,
        0,
        invoiceTotal,
        sub.payment_terms || 'Due on Receipt',
        `Automated recurring billing for ${sub.plan_name} (${periodStart} to ${periodEnd}).`,
        new Date().toISOString()
      );

      // Insert invoice items
      for (const item of items) {
        db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, product_id, variant_id, description, quantity, unit_price, tax_rate, amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `invitem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          invoiceId,
          item.product_id,
          item.variant_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate,
          item.amount
        );
      }

      // Advance subscription billing dates
      const nextBillingDate = computeNextDate(periodStart, sub.billing_cadence);
      let newStatus = sub.status;

      // Check if plan has auto_close_on_end and subscription has expired
      if (sub.auto_close_on_end && sub.expiry_date && nextBillingDate > sub.expiry_date) {
        newStatus = 'Closed';
        logs.push(`Subscription ${sub.subscription_number} reached expiry date (${sub.expiry_date}). Marked as Closed.`);
      }

      db.prepare(`
        UPDATE subscriptions
        SET last_billed_date = ?, next_billing_date = ?, status = ?
        WHERE id = ?
      `).run(periodStart, nextBillingDate, newStatus, sub.id);

      createdInvoicesCount++;
      totalBilledAmount += invoiceTotal;
      createdInvoices.push({
        invoiceId,
        invoiceNumber,
        customerName: sub.customer_name,
        amount: invoiceTotal
      });

      logs.push(`Generated invoice ${invoiceNumber} for ${sub.customer_name} ($${invoiceTotal.toFixed(2)}). Next billing date advanced to ${nextBillingDate}.`);
    }

    // Record billing run log
    db.prepare(`
      INSERT INTO billing_runs (id, run_date, subscriptions_evaluated, invoices_created, total_billed_amount, status, logs, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      runId,
      asOfDate,
      activeSubs.length,
      createdInvoicesCount,
      totalBilledAmount,
      'Completed',
      JSON.stringify(logs),
      new Date().toISOString()
    );
  });

  try {
    executeBilling();
    logs.push(`Billing run completed successfully. Created ${createdInvoicesCount} invoices totaling $${totalBilledAmount.toFixed(2)}.`);
  } catch (err: any) {
    logs.push(`ERROR during billing run: ${err.message}`);
    // Log failure record
    try {
      db.prepare(`
        INSERT INTO billing_runs (id, run_date, subscriptions_evaluated, invoices_created, total_billed_amount, status, logs, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(runId, asOfDate, activeSubs.length, 0, 0, 'Failed', JSON.stringify(logs), new Date().toISOString());
    } catch {
      // Ignore fallback log error
    }
    throw err;
  }

  return {
    runId,
    runDate: asOfDate,
    evaluatedCount: activeSubs.length,
    createdInvoicesCount,
    totalBilledAmount,
    createdInvoices,
    skippedCount,
    logs
  };
}
