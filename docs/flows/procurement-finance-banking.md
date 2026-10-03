# Procurement, Finance & Banking domain

Audit of the backend (`one-backend/internal/modules/{procurement,finance,banking,supplier}`, plus `internal/foundation/payment`) and the matching frontend surface (`one-frontend/app/(dashboard)/{procurement,finance,banking}`, `lib/api/{procurement,finance,banking}.ts`). All four backend modules are tenant-scoped Fiber modules (`router.Group(..., protected, tenantCtx)`) with their own GORM tables, auto-migrated per tenant schema via `tenantMgr.RegisterSchema`, and each seeds sample data on first migration.

## Module map

| Module | Backend package | Routes prefix | Frontend pages |
|---|---|---|---|
| Supplier | `modules/supplier` | `/suppliers` | `app/(dashboard)/master-data/suppliers` |
| Procurement | `modules/procurement` | `/procurement` | `app/(dashboard)/procurement/*` |
| Finance | `modules/finance` | `/finance` | `app/(dashboard)/finance/*` |
| Banking | `modules/banking` | `/banking` | `app/(dashboard)/banking/*` |
| Payment gateway | `foundation/payment` (Xendit) | n/a (used by billing, not by these modules directly) | — |

Each module follows the same clean-architecture layout: `domain/entity.go` (GORM models + repository interface), `application/{dto,usecase}.go` (business rules), `infrastructure/repository.go` (GORM implementation), `delivery/http/{handler,routes}.go` (Fiber handlers), `module.go` (wiring + migration + seed).

Procurement and finance deliberately do **not** import each other's domain packages — e.g. `purchaseInvoiceStatus` in procurement is a local copy of the same aging logic as finance's `paymentStatus`, kept duplicated on purpose "so the two can evolve independently" (see comment in `procurement/application/usecase.go:549`). Banking reads finance's journal lines only through a loose, FK-less projection (`domain.JournalLineCandidate`), not a real join.

## Supplier (master data)

`internal/modules/supplier` — `Supplier` entity (table `suppliers`): code, name, contact, category, status (Active/Inactive). Plain CRUD use case (`Create/GetByID/List/Update/Delete`) with a uniqueness check against `GetByCode` on create/update. Referenced by ID (with a denormalized name snapshot) from procurement's `PurchaseOrder`, `PurchaseInvoice`, `PurchaseDownPayment`, `PurchaseReturn`, and from finance's `Payable`.

Routes: `POST/GET /suppliers`, `GET/PUT/DELETE /suppliers/:id`.

Frontend: `app/(dashboard)/master-data/suppliers/page.tsx`.

## Procurement (`/procurement`)

Documents, in order of the procure-to-pay flow:

1. **Purchase Request (PR)** — `procurement_purchase_requests` + lines. Internal request to buy, not yet tied to a supplier or price. Status machine: `draft → submitted → approved|rejected`, driven by `transitionPurchaseRequest` (a generic guard: only transitions from an allowed source status set). Routes: `POST /procurement/requests`, `.../:id/submit`, `.../:id/approve`, `.../:id/reject`.

2. **Purchase Order (PO)** — `procurement_purchase_orders` + lines. Created either standalone or `purchaseRequestId`-linked; if linked, the source PR must be `approved` and is flipped to `converted`. Validates every line has a product, positive quantity and unit price; computes `totalAmount` server-side. Order number format `PO-YYYYMM-####`.
   - **Approval routing**: after create, procurement calls into the separate `approval` module (`approvalUC.SubmitDocument`) with document type/amount. If a matching approval workflow exists, the PO is parked at `pending_approval` instead of being left directly approvable; `ApprovePurchaseOrder`/`RejectPurchaseOrder` then drive the approval module's step (`ApproveStep`/`RejectStep`) and only flip the PO to `approved`/`rejected` once that workflow resolves. If no workflow matches (or the approval module isn't wired), the PO stays `draft` and can be approved directly by calling `ApprovePurchaseOrder` (only from `draft`/`submitted`).
   - `CancelPurchaseOrder` is blocked once a PO is `completed` or already `cancelled`.
   - Routes: `POST /procurement/orders`, `GET /procurement/orders(/:id)`, `.../:id/approve`, `.../:id/reject`, `.../:id/cancel`.

3. **Goods Receipt (GR)** — `procurement_goods_receipts` + lines, recording partial or full delivery against a PO. Requires the PO to be already approved (rejects `draft`/`cancelled` POs). Each line is validated against the matching PO line: product must exist on the PO, and `QuantityReceived` cannot exceed the PO line's remaining quantity (`ordered - already received`). On success it increments `PurchaseOrderLine.QuantityReceived` and recomputes the PO's status: `completed` if every line is fully received, `partially_received` if some but not all, otherwise unchanged. `ReceivedBy` is always set server-side from the authenticated caller, never trusted from the client (see comment on `GoodsReceipt.ReceivedBy`). Receipt number format `GR-YYYYMM-####`. Routes: `POST /procurement/receipts`, `GET /procurement/receipts(/:id)` (no update/delete — receipts are immutable once posted).

4. **Purchase Invoice** — `procurement_purchase_invoices`, the vendor's bill, optionally linked to a PO (for the PO number lookup only — no line-level three-way match against the GR is enforced in code). Created with status `unpaid`; number format `PINV-YYYYMM-####` if not supplied. `RecordInvoicePayment` adds to `PaidAmount` (capped so it can never exceed `TotalAmount`) and recomputes status via `purchaseInvoiceStatus` (`unpaid → partial/overdue → paid`, "overdue" only applies once due date has passed and nothing further is owed as "unpaid due" vs already partially paid). Routes: `POST /procurement/invoices`, `GET /procurement/invoices(/:id)`, `POST /procurement/invoices/:id/payments`.

5. **Purchase Down Payment (DP)** — `procurement_purchase_down_payments`, an advance paid to a supplier against a specific PO, independent of/prior to the final invoice. Tracks `Amount` vs `AppliedAmount`; `RemainingAmount` is derived in the response DTO, not stored. Status `unapplied | partially_applied | applied`. Routes: `POST /procurement/down-payments`, `GET /procurement/down-payments`.

6. **Purchase Return** — `procurement_purchase_returns` + lines, a return of previously received goods (references a `GoodsReceiptID`) back to a supplier, e.g. damaged/wrong items. Status `draft | completed`. Routes: `POST /procurement/returns`, `GET /procurement/returns(/:id)`.

Frontend pages mirror these 1:1: `procurement/purchase-requests`, `procurement/purchase-orders`, `procurement/receipts`, `procurement/purchase-invoices`, `procurement/down-payments`, `procurement/purchase-returns`, all driven through `lib/api/procurement.ts`.

## Finance (`/finance`)

Core GL plus AP/AR/petty-cash/budget on top of it:

- **Chart of Accounts** (`finance_accounts`) — hierarchical (`ParentID` self-reference), `Type` (asset/liability/equity/revenue/expense, used by reports below), `IsActive` flag. `accountBalance` sums an account's posted debits/credits to compute a running balance (used by budget "actual" and reports). Routes: `POST/GET /finance/accounts`, `GET/PUT /finance/accounts/:id`.

- **Journal Entry** (`finance_journal_entries` + `finance_journal_lines`) — the double-entry ledger. `CreateJournalEntry` requires ≥2 lines, each line exactly one of debit/credit (never both, never negative), and total debits must equal total credits at creation time — created as `draft`. `PostJournalEntry` re-validates the balance and flips to `posted`; posting an already-posted entry is rejected (409 conflict). **Posted entries are immutable** — the only correction path is `ReverseJournalEntry`, which mechanically swaps every line's debit/credit, tags the memo/`SourceDoc` back to the original entry number (`<original>-REV`), and inserts the reversal already `posted` (skips the draft step). Entry number format `JE-YYYYMM-####`. Routes: `POST /finance/journal-entries`, `GET .../(:id)`, `POST .../:id/post`, `POST .../:id/reverse`.

- **Payables (AP)** (`finance_payables`) — a vendor bill independent of procurement's own `PurchaseInvoice` model (no shared table; only a loose `SupplierID` reference, no FK to procurement's PO/PI). `RecordPayablePayment` caps payment at the outstanding balance and recomputes status via `paymentStatus` (same shape as procurement's local copy: pending → partial/overdue → paid). `APAgingReport` buckets every payable's outstanding balance by days-past-due via the shared generic `buildAgingReport[T]` helper. Routes: `POST/GET /finance/payables`, `GET /finance/payables/aging`, `GET /finance/payables/:id`, `POST /finance/payables/:id/payments`.

- **Receivables (AR)** (`finance_receivables`) — the customer-invoice mirror of payables; same payment/aging mechanics via `ARAgingReport`. Routes: `POST/GET /finance/receivables`, `GET /finance/receivables/aging`, `GET /finance/receivables/:id`, `POST /finance/receivables/:id/payments`.

- **Petty cash** (`finance_petty_cash_funds` + `finance_petty_cash_transactions`) — an imprest fund per branch with `MaxFloat`/`CurrentBalance` and a status label (e.g. "Sufficient"); transactions are `in`/`out` movements with `ApprovalStatus` (defaults `approved` — no separate approval workflow wired here, unlike procurement POs). `summarizePettyCash` derives "spent this month" and "last replenished" from the transaction history. Routes: `POST/GET /finance/petty-cash`, `POST/GET /finance/petty-cash/:id/transactions`.

- **Budgets** (`finance_budgets`) — allocated amount per department/account-category/period; `budgetActual` computes actual spend by summing posted journal activity on the linked `AccountID` (via `accountBalance`) for comparison against `AllocatedBudget`. Routes: `POST/GET /finance/budgets`.

- **Reports**, all read-only aggregations over posted journal lines: `TrialBalance` (as-of date, debit/credit per account), `ProfitAndLoss` (revenue/expense accounts, date range), `BalanceSheet` (asset/liability/equity, as-of date), `CashFlow` (date range). Routes under `/finance/reports/{trial-balance,profit-loss,balance-sheet,cash-flow}`.

Frontend pages: `finance/accounts`, `finance/journal-entries`, `finance/payables`, `finance/receivables`, `finance/petty-cash`, `finance/budgets`, `finance/reports`, via `lib/api/finance.ts`.

## Banking (`/banking`)

- **Bank Account** (`banking_bank_accounts`) — company bank account with `CurrentBalance` and an optional `LinkedGLAccountID` pointing at a finance Chart-of-Accounts row (loose reference, not a real FK — same cross-module convention as procurement/finance). Routes: `POST/GET /banking/accounts`, `GET /banking/accounts/:id`.

- **Statement import** — `ImportStatementLines` bulk-inserts `banking_bank_statement_lines` (positive amount = inflow/credit, negative = outflow/debit; zero-amount lines rejected) and immediately adjusts the bank account's `CurrentBalance` by the imported delta — i.e. importing a statement is treated as ground truth for the balance, independent of reconciliation. Route: `POST /banking/accounts/:id/statement-lines/import`; list via `GET /banking/accounts/:id/statement-lines`.

- **Reconciliation** — matches statement lines against posted journal lines on the bank account's `LinkedGLAccountID`:
  - `AutoReconcile` requires a linked GL account (400 if missing), pulls all unreconciled statement lines and all candidate journal lines on that GL account, and for each statement line calls `findBestCandidate`: expected GL amount is the statement amount itself for inflows (must match a candidate's `Debit`) or its negation for outflows (must match a candidate's `Credit`), the candidate must be unused so far in this run, and its date must fall within ±3 days of the statement line's date. First matching candidate wins (not best-fit by smallest date delta). Matches are recorded on the statement line (`IsReconciled`, `ReconciledAt`, `MatchedJournalLineID`); a `ReconcileSummaryDTO{MatchedCount, UnreconciledCount}` is returned. Route: `POST /banking/accounts/:id/reconcile`.
  - `ManualMatch` lets a user force-pair one already-known statement line + journal line (rejects if the statement line is already reconciled), no amount/date check applied. Route: `POST /banking/statement-lines/:id/match`.

Frontend pages: `banking/accounts`, `banking/reconciliation`, via `lib/api/banking.ts`.

## Payment gateway (Xendit) — foundation, not part of these modules' domain flow

`internal/foundation/payment/xendit.go` is a standalone abstraction for creating a hosted invoice (QRIS/VA/e-wallet) via Xendit's `/v2/invoices` API, used elsewhere for billing/subscription checkout — it is not called from procurement, finance, or banking use cases (no code path in those three modules constructs a `payment.Client`). `NewClient` returns a `noopClient` when `XENDIT_SECRET_KEY` is unset, which always errors rather than faking success — worth knowing if any future work wires procurement/finance payments through it, since today `RecordInvoicePayment` / `RecordPayablePayment` / `RecordReceivablePayment` are purely internal ledger updates with no external gateway call.

## Cross-module coupling summary

- **Supplier → Procurement/Finance**: referenced by UUID + denormalized name snapshot (`SupplierName`), no FK enforcement, read via each module's own repository.
- **Procurement → Approval module**: PO creation optionally routes through `modules/approval` (`SubmitDocument`/`ApproveStep`/`RejectStep`) when a matching workflow is configured; this is the only real cross-module orchestration found in this audit (a genuine import of another module's application package, not a loose ID reference).
- **Procurement ↔ Finance**: intentionally decoupled — `PurchaseInvoice` (procurement) and `Payable` (finance) are separate tables with duplicated status-derivation logic, by design (see comment cited above). There is no automatic posting of a procurement `PurchaseInvoice` or `RecordInvoicePayment` into a finance `JournalEntry` in the current code — journal entries for purchases would have to be created manually via `/finance/journal-entries`.
- **Banking → Finance**: read-only, FK-less projection (`JournalLineCandidate`) of `finance_journal_lines`, used solely to match against imported bank statement lines.
- **Petty cash approval**: transactions default to `ApprovalStatus: "approved"` with no workflow — unlike POs, there's no wiring to the `approval` module for petty cash disbursements.

## Verification notes

This audit is based on static reading of the Go source (entities, use cases, routes) and the mirrored frontend route/API-client structure; it does not include running the backend test suite or exercising the endpoints. Line-level citations above point at `internal/modules/{procurement,finance,banking,supplier}/{domain,application}/*.go` and the corresponding `delivery/http/routes.go` files for anyone verifying specific behavior.
