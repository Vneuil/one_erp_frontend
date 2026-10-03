# Sales, CRM & POS Flow

## Overview

This domain covers how ONE ERP turns a prospective customer into a paid, fulfilled sale. It spans four backend modules — `sales` (quotations, orders, deliveries, invoices, down payments, returns), `crm` (leads and pipeline deals), `pos` (point-of-sale checkout), and `commission` (salesperson payout calculation) — plus a standalone `contracts` module for customer/vendor agreements. The pieces are only loosely wired together: Sales Orders are the hub that both manual sales and POS checkouts feed into, and inventory is deducted whenever an order carries real line items and a warehouse. Everything upstream of the Sales Order (leads, pipeline deals, quotations) and downstream of it in places (invoices, commissions, contracts) is largely **not** connected by code — those links are manual, human-driven steps today, not system automation.

## Use Case: Capture and Qualify a Lead

**Actors:** Sales Rep, Sales Admin
**Trigger:** A new prospect comes in via WhatsApp, web form, or referral.

**Steps:**
1. Rep creates a Lead at `/crm/leads` with name, company, contact info, segment, source, estimated value, and an assigned PIC (defaults to a hardcoded name if left blank).
2. Rep updates the Lead's status as it progresses (`New → Contacted → Qualified → Proposal → ...`) via the status field.

**System behavior:** A `Lead` row is created/updated. Nothing else happens automatically — there is no lifecycle trigger, no linkage to a Deal, Quotation, or Sales Order.

**Related pages:** `/crm/leads`

## Use Case: Run a Deal Through the Pipeline

**Actors:** Sales Rep, Sales Manager

**Trigger:** A qualified opportunity needs to be tracked toward close.

**Steps:**
1. A `Deal` is created directly at `/crm/pipeline` (title, customer, value, PIC, expected closing date) — **not** by converting a Lead; Leads and Deals are separate records with no code path linking them.
2. The rep drags/moves the Deal through stages: `discovery → quotation → negotiation → won/lost`.
3. On `won`, probability is set to 100%; on `lost`, a reason can be recorded.

**System behavior:** Only the Deal's `stage` and `probability` fields change. Marking a Deal "won" does **not** create a Sales Order, Quotation, or any other downstream record — closing a deal in the pipeline is purely a CRM bookkeeping action with no ERP-side effect.

**Related pages:** `/crm/pipeline`

## Use Case: Issue a Quotation

**Actors:** Sales Rep

**Trigger:** A customer (optionally tied to a Lead via `leadId`) requests pricing.

**Steps:**
1. Rep creates a Quotation at `/sales/quotations` with customer name, line items (description, unit, qty, unit price), and a validity date.
2. The backend validates and rounds every line, computes the total, and sets status to `Sent`.

**System behavior:** A `Quotation` record is created, optionally linked to a `LeadID`. **There is no "Convert to Sales Order" action anywhere in the backend or frontend** — a Quotation never automatically becomes an Order. If a deal is won and a quotation was sent, staff must manually re-key a brand-new Sales Order; none of the quotation's line items, pricing, or customer data carry over.

**Related pages:** `/sales/quotations`

## Use Case: Create a Manual Sales Order (with Stock Deduction)

**Actors:** Sales Admin

**Trigger:** A confirmed deal or walk-in order needs to be recorded.

**Steps:**
1. Admin creates a Sales Order at `/sales/sales-orders` with customer, channel, currency, and (optionally) real product line items plus a warehouse.
2. Backend converts the order's currency to base currency via the Currency module.

**System behavior:**
- If line items and a warehouse are supplied, the backend first checks availability for **every** line before creating anything — if any line is short on stock, the whole order is rejected (no partial order, no partial deduction).
- Only after the order is persisted does it deduct stock per line via `inventory.AdjustStock` (reason "Sales Order", reference = order number). If deduction fails partway, the order still exists but the error surfaces (order created but stock not fully deducted) — this is a known best-effort gap, not a two-phase commit.
- If no line items/warehouse are supplied (the common case for orders entered without a formal cart), **no stock is touched at all** — the order is purely a revenue record.

**Related pages:** `/sales/sales-orders`

## Use Case: POS Checkout (with Stock Deduction and Sales Order + Loyalty Sync)

**Actors:** Cashier

**Trigger:** A walk-in customer buys products at a POS terminal.

**Steps:**
1. Cashier scans/adds cart lines and takes payment at `/pos`.
2. Backend checks stock availability for every cart line up front (same check-then-commit pattern as manual orders) before creating anything.

**System behavior:**
- A real `SalesOrder` is created behind every POS transaction (channel `"POS"`, status `Completed`, `PaymentStatus: Paid`) — so POS sales show up correctly in Sales Order lists and revenue reporting, not just in a separate POS log.
- Stock is deducted per line (reason "POS Sale").
- If a customer phone number is given, loyalty points are earned as a bonus side-effect; failure to earn points does **not** block or roll back the sale.
- A `POSTransaction` record is created referencing the generated Sales Order's ID and number.

**Related pages:** `/pos`, `/sales/sales-orders`

## Use Case: Deliver, Invoice, and Get Paid on a Sales Order

**Actors:** Warehouse/Logistics, Finance

**Trigger:** A confirmed Sales Order needs to be fulfilled and collected on.

**Steps:**
1. A Delivery is created at `/sales/deliveries`, referencing the order only by its **order number string** (`SONumber`), not a real foreign key to the Sales Order's ID.
2. An Invoice is created at `/sales/invoices` with customer name and total amount.
3. Payments are recorded against the invoice; paid amount accumulates and status is derived (`pending/partial/paid/overdue`).

**System behavior and gaps:**
- **Invoices are not linked to a Sales Order or Delivery at all** — `CreateInvoiceDTO`/`Invoice` has no `OrderID`, `DeliveryID`, or `SONumber` field. Nothing stops staff from invoicing a customer for an amount unrelated to any real order, and nothing prevents invoicing before delivery (there is no status gate).
- Deliveries reference the order by a free-text `SONumber`, which is never validated against an actual order — a delivery can be created for an order number that doesn't exist.
- Payment recording does correctly cap `PaidAmount` at `TotalAmount` (overpayment is rejected), and status derivation is sound.
- **Down payments** (`/sales/down-payments`) do correctly validate against a real `SalesOrderID` (404 if the order doesn't exist) and default the customer name from the order. However, a Down Payment's `Status` stays `"unapplied"` forever — there is no code path that applies a down payment to an invoice's paid amount, so recording a DP does not actually reduce what's still owed on the invoice.

**Related pages:** `/sales/deliveries`, `/sales/invoices`, `/sales/down-payments`

## Use Case: Process a Sales Return

**Actors:** Warehouse, Customer Service

**Trigger:** A customer returns goods from a completed delivery.

**Steps:**
1. Staff creates a return at `/sales/returns`, selecting the originating Delivery and entering returned line items.

**System behavior and gaps:**
- The backend does correctly require a real `DeliveryID` and looks it up (404 if missing), and pulls the customer name from that delivery.
- **The frontend return-line items still use `crypto.randomUUID()` as the `productId`** (`app/(dashboard)/sales/returns/page.tsx:63`) instead of a real product ID selected from the delivery/order — this is the same fake-FK pattern that was fixed elsewhere this session, but it remains here. As a result, returns cannot be reliably tied to real inventory items.
- Sales returns do **not** adjust inventory or the original invoice/payment at all — creating a return has no effect on stock levels or outstanding balances.

**Related pages:** `/sales/returns`

## Use Case: Calculate and Pay Sales Commission

**Actors:** Finance/Payroll

**Trigger:** End of a sales period (monthly).

**Steps:**
1. A Commission Rule (flat % or tiered) is defined via the API (`/commissions` rules — no dedicated rule-management UI found).
2. A Commission Record is calculated from a salesperson name, a sales order amount, and a rule ID, then transitions `pending → approved → paid`.

**System behavior and gaps:**
- Calculation logic is sound (flat rate or matching tier), and status transitions are correctly guarded (can't approve a non-pending record, can't pay a non-approved one).
- **The link to real sales data is superficial.** `CreateCommissionRecordDTO` takes a free-text `SalesOrderNumber` and a manually entered `SalesOrderAmount` — it does not look up an actual `SalesOrder` by ID or pull its real total. Nothing prevents creating a commission record for a sales order number that doesn't exist or for an amount that doesn't match the real order.
- The frontend Commissions page (`/commissions`) has no visible "create record" form wired to real orders — it primarily lists/approves/pays records that were seeded or created directly via API. In practice, commission amounts are effectively hand-entered, not derived automatically from closed Sales Orders.

**Related pages:** `/commissions`

## Use Case: Manage a Customer/Vendor Contract

**Actors:** Legal/Finance, Account Manager

**Trigger:** A recurring supply or service agreement needs to be tracked.

**Steps:**
1. Contract created at `/contracts` with party type (customer/vendor), value, start/end dates, payment terms.
2. Status moves `draft → active → expired/terminated/renewed`; `RenewContract` and `ListExpiringSoon` support renewal workflows.

**System behavior and gaps:**
- Contracts are entirely standalone — the `Contract` entity has no reference to Sales Orders, Deals, or Invoices. A contract's `ContractValue` does not derive from, or feed into, any actual sales activity; it's a manually maintained record with no automation connecting it to the rest of this domain.

**Related pages:** `/contracts`

## Known Gaps / Recommendations

- **No Quotation → Sales Order conversion.** Quotations are a dead end; there is no "Convert to Order" action in the backend (`SalesUseCase` has no such method) or frontend. Recommend adding a conversion endpoint that carries over customer, lines, and pricing.
- **No Lead → Deal and no Deal(won) → Sales Order automation.** CRM Leads and Pipeline Deals are fully independent record types with independent seed data; nothing links a won Deal to an actual Sales Order. This means pipeline revenue ("Total Won") is disconnected from real recognized sales revenue.
- **Invoices have no order/delivery reference.** `Invoice` carries only customer name and amount — no `SalesOrderID`, `DeliveryID`, or `SONumber`. It is currently possible to invoice a customer for an order that was never created, was never delivered, or doesn't match a real order's total. Recommend adding a required order reference and a status gate requiring delivery before invoicing.
- **Deliveries reference orders by free-text string only.** `Delivery.SONumber` is not validated against any real `SalesOrder`; a delivery can point at a nonexistent order. Recommend switching to a validated `SalesOrderID` foreign key, mirroring how Down Payments already do this correctly.
- **Down payments never apply to invoices.** `SalesDownPayment.Status` is set to `"unapplied"` on creation and there is no code path that ever changes it or reduces an invoice's outstanding balance. The feature currently only records that a DP was received, not that it offset anything.
- **Sales Returns still use a fake product ID.** `app/(dashboard)/sales/returns/page.tsx` calls `crypto.randomUUID()` for each return line's `productId` instead of using a real product from the originating delivery/order — the same anti-pattern fixed elsewhere in the codebase this session remains here. Returns also don't adjust inventory or invoice balances.
- **Commission records are not derived from real sales data.** Commission calculation takes a manually entered sales order number and amount rather than looking up an actual `SalesOrder`, so payout figures can drift from what was actually sold and aren't guaranteed to correspond to a real, existing order.
- **Contracts are fully disconnected** from Sales Orders, Deals, and Invoices — useful as a standalone record-keeping tool today, but not as an integrated part of the deal-to-cash flow.
- **What does work correctly end-to-end:** stock availability checking before commit (both Sales Orders and POS), atomic all-or-nothing stock deduction ordering, POS-to-Sales-Order-to-Loyalty integration, invoice payment amount capping (no overpayment), invoice status derivation (pending/partial/paid/overdue), and Down Payment's validated link to a real Sales Order.
