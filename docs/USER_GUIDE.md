# ONE ERP — User Guide

A step-by-step guide to using ONE ERP, organized by business area. This guide covers *how to use* each feature. For a more technical explanation of what happens behind the scenes in each flow (including known limitations), see the companion documents in [`docs/flows/`](./flows/).

> 📸 Screenshot placeholders are marked like this throughout the guide: `[Screenshot: description of what to capture]`. Replace them with real screenshots before distributing this guide externally.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Master Data Setup](#2-master-data-setup)
3. [Sales & CRM](#3-sales--crm)
4. [Point of Sale (POS)](#4-point-of-sale-pos)
5. [Procurement](#5-procurement)
6. [Finance & Banking](#6-finance--banking)
7. [Inventory & Warehouse](#7-inventory--warehouse)
8. [Manufacturing](#8-manufacturing)
9. [Human Resources (HR)](#9-human-resources-hr)
10. [Projects & Learning (LMS)](#10-projects--learning-lms)
11. [Settings, Roles & Marketplace Integrations](#11-settings-roles--marketplace-integrations)

---

## 1. Getting Started

### 1.1 Logging In

1. Go to `https://one.divine.co.id/login`.
2. Enter your registered email and password.
3. Click **Masuk / Login**.

> `[Screenshot: Login page with email/password fields]`

If your company has more than one business unit (tenant), you may be prompted to select one after logging in.

### 1.2 The Dashboard

After logging in, you land on the **Dashboard** (`/dashboard`), which shows:
- Key metrics: total order value, open sales orders, low-stock alerts, unpaid invoices.
- A **Quick Operations** panel with shortcuts to common actions.
- A list of recent Sales Orders.

> `[Screenshot: Dashboard with KPI cards and Quick Operations panel]`

Use the left sidebar to navigate between modules (Sales, Procurement, Inventory, Finance, HR, etc.).

---

## 2. Master Data Setup

Before recording any real transactions, set up your reference data. This lives under **Master Data** in the sidebar.

### 2.1 Customers, Suppliers, Salesmen

1. Go to **Master Data > Customers** (or Suppliers, or Salesmen).
2. Click **Add** and fill in the required fields (code, name, contact info).
3. Click **Save**.
4. To edit, click the **Edit** (pencil) icon on any row. To remove, click **Delete** and confirm.

> `[Screenshot: Customers list with Add/Edit/Delete actions visible]`

> ⚠️ **Note:** Deleting a Customer, Supplier, or Product does not check whether it is already used on an existing order — deleting a record that's in use will leave that order referencing a record that no longer exists. Prefer deactivating (if a status field is available) over deleting once a record has real transaction history.

### 2.2 Products & Warehouses

1. Go to **Master Data > Products** to create your product catalog (SKU, name, category, unit, cost/selling price, and an initial stock figure).
2. Go to **Master Data > Warehouses** to define each physical location that holds stock.
3. Go to **Master Data > Categories & Units** to manage product categories and units of measure.

> `[Screenshot: Product creation form]`
> `[Screenshot: Warehouse list]`

> ℹ️ The "Stock" figure you enter when creating a product is a starting quantity used only until that product is first counted into a specific warehouse (see [§7.1](#71-checking-stock-levels)) — after that, per-warehouse stock levels are the real source of truth.

### 2.3 Pricing Terms & Shipping Methods

Go to **Master Data > Pricing Terms** and **Master Data > Shipping Methods** to define payment terms, customer types, tax rates, and delivery couriers used elsewhere in Sales and Procurement forms.

---

## 3. Sales & CRM

### 3.1 Capturing a Lead

1. Go to **CRM > Leads**.
2. Click **Add Lead**, fill in name, company, contact info, segment, source, and estimated value.
3. Update the Lead's status as it progresses (New → Contacted → Qualified → Proposal...).

> `[Screenshot: Leads list with status column]`

> ⚠️ Leads and Pipeline Deals are separate records — there is no automatic conversion from a Lead into a Deal. If a lead becomes a real opportunity, create a new Deal manually in the Pipeline (see §3.2).

### 3.2 Managing the Sales Pipeline

1. Go to **CRM > Pipeline**.
2. Click **Add Deal**, enter title, customer, value, PIC, and expected closing date.
3. Drag the deal card between stage columns (Discovery → Quotation → Negotiation → Won/Lost) as it progresses.

> `[Screenshot: Kanban-style pipeline board with deal cards]`

> ⚠️ Marking a deal "Won" is a bookkeeping action only — it does not automatically create a Sales Order. You'll still need to create the Sales Order yourself (§3.4).

### 3.3 Issuing a Quotation

1. Go to **Sales > Quotations**.
2. Click **Create Quotation**, select or type the customer, add line items (product, quantity, unit price), and set a validity date.
3. Save — the quotation is marked **Sent**.

> `[Screenshot: Quotation creation form with line items]`

> ⚠️ There is currently no "Convert to Sales Order" button. If a customer accepts a quotation, re-enter the order manually as a new Sales Order (§3.4) — the quotation's line items don't carry over automatically.

### 3.4 Creating a Sales Order

1. Go to **Sales > Sales Orders**.
2. Click **Create Sales Order**.
3. Enter the customer name.
4. Select a **Destination Warehouse** (required if you want stock to be deducted).
5. Add line items: pick a product from the dropdown, enter quantity, and click **Tambah / Add**. Repeat for each item.
6. Optionally toggle **PPN 11%** and enter a discount percentage — the total updates automatically.
7. Click **Create Order**.

> `[Screenshot: Create Sales Order dialog with warehouse dropdown, item picker, and PPN/discount toggle]`

**What happens behind the scenes:** the system checks that every line item has enough stock in the selected warehouse *before* creating anything. If any item is short, the whole order is rejected — nothing is partially created. Once the order is saved, stock is deducted for each line.

> ℹ️ If you don't select a warehouse or add line items, the order is still created as a revenue record, but no stock is touched.

### 3.5 Delivery, Invoicing & Payment

1. Go to **Sales > Deliveries** to record that an order has been shipped (reference the order by its order number).
2. Go to **Sales > Invoices** to bill the customer — enter customer name and amount.
3. Record payments against the invoice as they come in; the invoice status updates automatically (Pending → Partial → Paid, or Overdue if past due date).

> `[Screenshot: Invoice detail with payment history and status badge]`

> ⚠️ Invoices are not currently linked to a specific Sales Order or Delivery record — double-check the amount and customer manually before invoicing, since the system won't block invoicing an order that hasn't been delivered yet.

### 3.6 Down Payments

Go to **Sales > Down Payments** to record an advance payment against a specific Sales Order. The system validates that the order exists.

> ⚠️ A recorded down payment does not automatically reduce what's still owed on the related invoice — track this manually when reconciling the final invoice payment.

### 3.7 Processing a Sales Return

1. Go to **Sales > Returns**.
2. Select the originating **Delivery**.
3. Enter the returned line items and reason.
4. Save.

> `[Screenshot: Sales Return form with delivery selector]`

> ⚠️ Recording a return does not automatically adjust inventory or the original invoice — follow up with a manual stock adjustment (§7.1) and invoice/credit note if needed.

### 3.8 Commissions

Go to **Commissions** to view, approve, and mark sales commission records as paid. Commission rules (flat % or tiered) are configured via settings.

> ⚠️ Commission amounts are entered against a sales order number and amount, but not automatically pulled from the real order — verify figures against the actual Sales Order before approving.

### 3.9 Contracts

Go to **Contracts** to record and track customer/vendor agreements (value, term dates, payment terms, renewal reminders). This is a standalone record-keeping tool — it does not automatically link to Sales Orders or Invoices.

---

## 4. Point of Sale (POS)

1. Go to **POS**.
2. Products load automatically from your catalog. Tap a product to add it to the cart (the system shows live stock and prevents adding more than what's available).
3. Select the **Warehouse** the sale is coming from (defaults to your first configured warehouse).
4. Optionally enter a customer phone number to award loyalty points.
5. Choose a payment method and click **Checkout**.

> `[Screenshot: POS screen with product grid, cart, and checkout button]`

**What happens:** stock is checked and deducted for every cart item (same all-or-nothing logic as a Sales Order), a real Sales Order is created behind the scenes (so the sale shows up in Sales Order reports too), and loyalty points are awarded if a phone number was given.

Go to **POS > Transactions** to view past POS sales, and **POS > Loyalty** to manage the loyalty program.

---

## 5. Procurement

The procure-to-pay chain: **Purchase Request → Purchase Order → Goods Receipt → Purchase Invoice → Payment**.

### 5.1 Submitting a Purchase Request (PR)

1. Go to **Procurement > Purchase Requests**.
2. Click **Submit Purchase Request**.
3. **Department** and **Requested By** are filled in automatically from your logged-in profile (locked, not editable) — Department comes from your HR employee record.
4. Set the **Required Date**.
5. Add item(s): pick a product, enter quantity, optionally add a note, click **Tambah / Add**.
6. Submit.

> `[Screenshot: Submit Purchase Request dialog showing locked Department/Requested By fields and item picker]`

The PR then needs to be **submitted** and **approved** (by someone with the right permission) before it can become a Purchase Order.

### 5.2 Creating a Purchase Order (PO)

1. Go to **Procurement > Purchase Orders**.
2. Click **Create Purchase Order**.
3. **Optional:** select an approved Purchase Request from the **"Dari Purchase Request"** dropdown — this automatically fills in the line items (products and quantities) from that PR, priced at each product's current cost price. You can still adjust prices before submitting.
4. Select the **Vendor/Supplier**.
5. Set the **Expected Delivery** date.
6. If you didn't select a PR, add line items manually the same way as a Sales Order.
7. Click **Create PO**.

> `[Screenshot: Create Purchase Order dialog with "Dari Purchase Request" dropdown and auto-filled item table]`

If your company has an approval workflow configured, the PO enters **Pending Approval** and must be approved before proceeding. Otherwise it's immediately approvable.

### 5.3 Receiving Goods

1. Go to **Procurement > Receipts**.
2. Click **Receive Inbound Shipment**.
3. Select the **PO Reference** from the dropdown (only POs with items still outstanding are listed) — Vendor/Supplier fills in automatically.
4. Select the **Destination Warehouse**.
5. **Received By** is locked to your logged-in name automatically.
6. Submit — the receipt's line items are automatically computed from the PO's remaining quantities.

> `[Screenshot: Receive Inbound Shipment dialog with PO dropdown, warehouse dropdown, and locked Received By field]`

The system blocks receiving more than what remains on the PO, and automatically marks the PO **Partially Received** or **Completed** depending on whether everything was received.

> ⚠️ Receiving goods here does **not** currently increase your inventory stock levels automatically — if your warehouse team needs the stock count updated, do a manual stock adjustment (§7.1) or a Stock Opname to reconcile.

### 5.4 Purchase Invoices, Down Payments & Returns

- Go to **Procurement > Purchase Invoices** to record a vendor bill and its payments.
- Go to **Procurement > Down Payments** to record an advance paid to a supplier against a PO.
- Go to **Procurement > Purchase Returns** to record goods sent back to a supplier (references the original Goods Receipt).

> `[Screenshot: Purchase Invoice list with payment status]`

---

## 6. Finance & Banking

### 6.1 Chart of Accounts

Go to **Finance > Accounts** to view/manage your chart of accounts (Assets, Liabilities, Equity, Revenue, Expense), organized hierarchically.

### 6.2 Journal Entries

1. Go to **Finance > Journal Entries**.
2. Click **New Entry**, add at least two lines (each line is either a debit or a credit, never both), and make sure total debits equal total credits.
3. Save as **draft**, then click **Post** once it's ready — posted entries are locked and cannot be edited.
4. To correct a posted entry, use **Reverse** — this creates a new, already-posted entry that exactly undoes the original (never edit a posted entry directly).

> `[Screenshot: Journal Entry form with debit/credit line items and Post/Reverse buttons]`

### 6.3 Payables & Receivables

- **Finance > Payables**: vendor bills you owe money on. Record payments; status updates automatically (Pending → Partial/Overdue → Paid). View the **Aging Report** to see what's overdue and by how long.
- **Finance > Receivables**: the customer-invoice mirror of the above.

> ℹ️ These are separate from Procurement's Purchase Invoices and Sales' Invoices by design — recording a payment on one does not automatically create a matching Journal Entry. If your accountant needs the books to reflect a payment, post the corresponding Journal Entry manually.

### 6.4 Petty Cash

Go to **Finance > Petty Cash** to manage branch cash funds and record in/out transactions against them.

### 6.5 Budgets

Go to **Finance > Budgets** to set an allocated budget per department/account/period, and compare it against actual spend (calculated automatically from posted Journal Entries).

### 6.6 Financial Reports

Go to **Finance > Reports** for **Trial Balance**, **Profit & Loss**, **Balance Sheet**, and **Cash Flow** — all computed live from posted journal data.

> `[Screenshot: Profit & Loss report screen]`

### 6.7 Banking & Reconciliation

1. Go to **Banking > Accounts** to manage your company's bank accounts, optionally linking each to a Chart-of-Accounts ledger account.
2. Import a bank statement (CSV) via the account's statement import action — this updates the account's balance immediately.
3. Go to **Banking > Reconciliation** and click **Auto Reconcile** to automatically match statement lines against posted journal entries (matched within ±3 days and the same amount). Use **Manual Match** for anything the automatic match missed.

> `[Screenshot: Bank Reconciliation screen showing matched/unmatched statement lines]`

---

## 7. Inventory & Warehouse

### 7.1 Checking Stock Levels

Go to **Inventory > Stock** to see current on-hand quantity per product per warehouse. Go to **Inventory > Stock Movements** for the full audit trail of every stock change (sales, receipts, transfers, adjustments) with before/after balances.

### 7.2 Stock Opname (Physical Count)

1. Go to **Inventory > Stock Opname**.
2. Click **Start New Audit**, select a warehouse — the system pre-fills every product's current recorded quantity.
3. Enter the actual counted quantity for each line.
4. **Finalize** — the system updates stock to match your counts and logs the variance as an audit trail entry.

> `[Screenshot: Stock Opname count sheet with system qty vs counted qty columns]`

### 7.3 Inter-Warehouse Transfers

1. Go to **Inventory > Transfers**.
2. Create a transfer: product, quantity, source warehouse, destination warehouse.
3. Complete the transfer once the physical goods have moved — stock is deducted from the source and added to the destination in one step (so it can never "disappear" between the two).

> `[Screenshot: Transfer creation form]`

### 7.4 Picking, Packing & Shipping (Warehouse Operations)

For fulfilling Sales Orders:

1. **Warehouse > Picking** — create a pick wave against outstanding order lines, then mark it complete (this is where stock is actually deducted for the sale).
2. **Warehouse > Packing** — mark picked items as packed once boxed.
3. **Warehouse > Shipping** — dispatch the shipment.

> `[Screenshot: Picking screen showing a pick list tied to real Sales Order lines]`

---

## 8. Manufacturing

### 8.1 Bill of Materials (BOM)

Go to **Manufacturing > BOM** to define, for each finished-good product, the list of raw materials and quantities needed to make one unit.

> `[Screenshot: BOM editor showing finished good and raw material list]`

### 8.2 Production Orders

1. Go to **Manufacturing > Production Orders**.
2. Create an order for a finished good and a planned quantity (referencing its BOM).
3. Complete a production batch once the work is done — the system checks enough raw material stock exists, then consumes the raw materials and produces the finished good into inventory in one step.

> `[Screenshot: Production Order detail with Complete Batch action]`

Go to **Manufacturing > Dashboard** for a summary view of active BOMs, production status, and schedules.

> ⚠️ There is currently no way to cancel a Production Order once created — if a batch needs to be abandoned, leave it incomplete rather than trying to "cancel" it (no stock is touched until a batch is actually completed).

---

## 9. Human Resources (HR)

### 9.1 Employees

Go to **HRM > Employees** to maintain your employee roster (name, NIP/employee ID, department, role, base salary, etc.).

### 9.2 Attendance

Go to **HRM > Attendance** — employees clock in/out here, correctly tied to their real employee record.

> `[Screenshot: Attendance clock-in screen]`

### 9.3 Leave Requests

1. Go to **HRM > Leaves**.
2. Submit a request with type, dates, and reason.
3. A manager approves or rejects it.

> ⚠️ There is currently no leave balance/quota enforcement — approving a request does not check against any annual entitlement. Track leave balances manually outside the system for now, or review requests carefully before approving.

### 9.4 Payroll

Go to **HRM > Payroll** to create and calculate payroll entries per period.

> ⚠️ Base salary and deduction figures on a payroll entry are entered manually — they are not automatically pulled from the Employee record or from active Cooperative loan deductions. Double-check both against the Employee module and the Cooperative module before finalizing a payroll run.

### 9.5 Cooperative Loans

Go to **HRM > Cooperative** to record an employee loan; the system calculates the monthly deduction automatically.

> ⚠️ This monthly deduction does **not** automatically flow into Payroll — you'll need to manually enter the same figure when processing that employee's payroll (see §9.4).

### 9.6 Reimbursements

Go to **HRM > Reimbursements** to submit and process expense claims. This workflow is fully gated: a claim can only be marked **Paid** after it has been **Approved** — the system will not let you skip the approval step.

> `[Screenshot: Reimbursement claim list with status pipeline]`

### 9.7 KPI

Go to **HRM > KPI** to record and review employee performance evaluations per period.

### 9.8 Recruitment

Go to **Recruitment** to post job vacancies, track candidates through hiring stages, and mark a candidate as hired.

> ⚠️ Hiring a candidate here does not automatically create an Employee record — after hiring, manually add the person as a new Employee (§9.1) to get them into Attendance, Payroll, and the rest of HR.

---

## 10. Projects & Learning (LMS)

### 10.1 Project Kanban Board

Go to **Projects > Kanban** to manage tasks for a project on a drag-and-drop board (To Do → In Progress → Review → Done).

> `[Screenshot: Kanban board with task cards across columns]`

> ⚠️ Moving a task to "Done" does not automatically update the parent Project's progress percentage — that field is edited manually on the Project itself.

### 10.2 Service Tickets

Go to **Projects > Tickets** to log and track client-facing service/support tickets tied to a project.

### 10.3 Timesheets

Go to **Projects > Timesheet** to start/stop a timer against a project and task, then save the logged time entry.

> ⚠️ Logged hours do not automatically feed into the project's Actual Cost figure — that's tracked separately and updated manually if needed.

### 10.4 Learning Management (LMS)

Go to **LMS** to browse training courses, enroll employees, and mark course completions.

> `[Screenshot: LMS course catalog with enroll button]`

> ⚠️ Course completions are not currently reflected on an employee's HR profile — LMS is a standalone training log today.

---

## 11. Settings, Roles & Marketplace Integrations

### 11.1 Company & Users

Go to **Settings > Company** to manage company profile details, and **Settings > Users** to invite/manage user accounts.

### 11.2 Roles & Permissions

1. Go to **Settings > Roles** to define a role (e.g. "Warehouse Staff").
2. Go to **Settings > Permissions** to set which modules that role can view/edit.
3. Assign the role to a user in **Settings > Users**.

> `[Screenshot: Permissions matrix showing modules vs. access level per role]`

This is a real, enforced security control — a user assigned a role with no permission for a module will be blocked from that module's API, not just hidden from the menu.

### 11.3 Approval Workflows

Go to **Settings > Approval Workflows** to configure sign-off routing. Today, this is actively used by **Purchase Orders** — submitting a PO that matches a configured workflow routes it for approval automatically. It is not yet used by Sales Orders or other document types.

### 11.4 Currencies

Go to **Settings > Currencies** to manage exchange rates. This is used by **Sales Orders** when a customer is billed in a foreign currency — the order's original and base-currency (IDR) amounts are both stored automatically.

> ⚠️ Multi-currency is not yet available for Procurement/Purchase Orders.

### 11.5 Marketplace Integrations

1. Go to **Settings > Integration**.
2. Click **Connect** on TikTok Shop, Shopee, Lazada, or Blibli and follow the authorization steps (Blibli uses API keys instead of a redirect login).
3. Once connected, click **Sync Now** to pull in recent orders from that channel — they appear as Sales Orders.

> `[Screenshot: Integration settings page with Connect/Sync buttons per marketplace]`

> ⚠️ **Important:** orders synced from a marketplace do **not** reduce your inventory stock levels (unlike a manually created Sales Order or a POS sale) — they only record that a sale happened and its total value. If you sell meaningful volume through a connected marketplace, reconcile your stock counts manually (via Stock Opname, §7.2) until this is addressed, since your recorded stock will otherwise drift from reality.

### 11.6 Activity Log

Go to **Settings > Activity Log** to review a history of who did what, when — useful for audits and troubleshooting.

---

## Appendix: Where to Find the Technical Details

This guide focuses on *how* to use each screen. For an honest, code-level explanation of what's fully connected end-to-end versus what still requires manual double-checking, see:

- [`docs/flows/sales-crm-pos.md`](./flows/sales-crm-pos.md)
- [`docs/flows/procurement-finance-banking.md`](./flows/procurement-finance-banking.md)
- [`docs/flows/inventory-warehouse-manufacturing.md`](./flows/inventory-warehouse-manufacturing.md)
- [`docs/flows/hr-projects-lms.md`](./flows/hr-projects-lms.md)
- [`docs/flows/master-data-settings-marketplace.md`](./flows/master-data-settings-marketplace.md)

Every "⚠️" callout in this guide corresponds to a documented gap in one of the files above.
