# Master Data, Settings & Marketplace Integrations Flow

## Overview

This document explains, in plain language, how ONE ERP handles the "foundational" parts of the system: the master records everyone else's transactions point to (customers, suppliers, products, warehouses...), the settings that control who can do what (roles, permissions, approval workflows), multi-currency support, and connections to external marketplaces (TikTok Shop, Shopee, Lazada, Blibli). It also documents where the current implementation is solid and where it still has real gaps, based on a direct read of the backend and frontend code.

## Use Case: Setting Up Master Data (Customers, Suppliers, Products, Warehouses)

A staff member goes to **Master Data** and creates/edits/deletes records for Customers, Suppliers, Salesmen, Warehouses, Products, Categories & Units, Pricing Terms, and Shipping Methods. Each of these pages now talks to real backend endpoints (Create/Read/Update/Delete), including several that only got their Edit/Delete wiring added recently (Warehouses, Categories, Units, Pricing Terms).

What this means in practice: when you edit a Customer's address or a Product's price, that change is saved to the database and immediately visible everywhere that record is referenced.

**Gap to know about:** deleting a master record does **not** check whether it is in use. A Customer or Product that already has Sales Orders against it, or a Supplier that already has Purchase Orders against it, can still be deleted with a single click and no warning. The delete button on the Customer, Supplier, and Product pages calls straight through to the database delete with no "is this referenced elsewhere?" check first. Existing Sales/Purchase Orders that reference the deleted record are not updated or blocked — they simply keep the ID of a record that no longer exists, which will show up as blank/broken names on any order history, report, or invoice that looks that record up later.

## Use Case: Role-Based Access Control (RBAC) Setup

An administrator goes to **Settings > Roles** and **Settings > Permissions** to define roles (e.g. "Warehouse Staff", "Finance") and decide which modules each role can view or edit, then assigns a role to each user in **Settings > Users**.

This is a real, enforced security control, not just a UI. Every API request passes through a global permission check before it reaches the actual business logic. If a user has been assigned a custom role and that role has no permission entry for the module being accessed, the request is rejected. Users who haven't been assigned any custom role yet keep working as before (this makes the rollout safe — nothing breaks for existing accounts until an admin deliberately locks a role down), and the original "admin" account always keeps full access as a safety net so a company can never lock itself out entirely.

**Gap to know about:** if the permission check cannot look up the user's account (e.g. a database hiccup), it currently lets the request through rather than blocking it, favoring uptime over a hard lockout. This is a deliberate trade-off but worth knowing.

## Use Case: Purchase Order Approval Workflow

When Procurement staff raise a Purchase Order that requires sign-off, submitting it moves the PO into "pending approval" and hands it to the Approval Workflow module, which routes it to the right approver(s) based on the configured workflow. Approving or rejecting the PO in the Approval Workflow screen updates the PO's own status accordingly (approved POs move forward, rejected ones return to the requester).

This connection is real and functioning end-to-end for Purchase Orders specifically: the procurement code actively calls into the approval module to submit, approve, and reject requests, and the PO's status changes as a direct result.

**Gap to know about:** the Approval Workflow module is only wired into Purchase Orders today. Sales Orders and other documents that might reasonably need sign-off (e.g. large discounts, high-value sales) do not call the approval module at all — the feature exists but is single-purpose so far, not a general-purpose approval layer.

## Use Case: Connecting a Marketplace (TikTok Shop / Shopee / Lazada / Blibli)

An admin goes to **Settings > Integrations**, connects a marketplace account (OAuth for TikTok Shop/Shopee/Lazada, API keys for Blibli), and can then trigger a sync to pull in recent orders from that channel.

The sync genuinely calls each marketplace's real API, fetches recent orders, and creates a corresponding Sales Order in ONE ERP for each new marketplace order (it also checks for and skips orders it has already synced, so re-running a sync is safe).

**Gap to know about — this is the most significant one found:** the Sales Order created from a marketplace sync only carries the order number, buyer name, total amount, status, and payment status. It does **not** include order line items (which products, which quantities), and it does not call the inventory/stock deduction logic that a normal, manually-created Sales Order goes through. In other words, syncing a TikTok Shop or Shopee order today records that a sale happened and its total value, but it does not reduce on-hand stock for the products actually sold, and there's no way to see what was sold from the order record itself. A warehouse relying on ONE ERP's stock counts would see them silently drift out of sync with reality as marketplace orders come in.

## Use Case: Multi-Currency Sales Order

A salesperson creates a Sales Order in a foreign currency (e.g. USD) for an export customer. The system looks up the exchange rate in effect on the order date and stores both the original foreign-currency amount and the converted base-currency (IDR) amount on the order, so reporting in the company's home currency stays accurate regardless of what currency each order was raised in.

This works correctly for Sales Orders.

**Gap to know about:** multi-currency support has not been extended to Procurement/Purchase Orders. A Purchase Order raised against a foreign-currency supplier has no currency conversion logic at all — the feature exists in the Currency module and is fully wired into Sales, but Procurement was never connected to it. Any company importing from overseas suppliers would need this before the currency feature could be considered complete.

## Known Gaps / Recommendations

1. **No referential integrity on master data deletes.** Deleting a Customer, Supplier, or Product currently succeeds even if it's referenced by existing Sales Orders or Purchase Orders, leaving those orders pointing at a record that no longer exists. Recommend adding an "in use" check before delete (block the delete, or offer an archive/deactivate alternative instead of a hard delete).
2. **RBAC fails open on lookup errors.** If the system can't resolve a user's account during a permission check, it currently lets the request through rather than denying it. Acceptable for uptime, but worth a conscious decision rather than a silent default.
3. **Approval workflow is Purchase-Order-only.** The approval engine is generic in design but only actually invoked by Procurement today. Sales Orders and other documents that might need sign-off bypass it entirely.
4. **Marketplace sync doesn't touch inventory.** This is the biggest functional gap: marketplace orders (TikTok Shop, Shopee, Lazada, Blibli) create a Sales Order shell with a total amount but no line items and no stock deduction, so on-hand inventory does not reflect marketplace sales. This should be fixed before marketplace sales volume is trusted for stock planning.
5. **Multi-currency is Sales-only.** Purchase Orders from foreign-currency suppliers get no currency conversion, unlike Sales Orders. This is a partial feature, not a company-wide multi-currency capability.
