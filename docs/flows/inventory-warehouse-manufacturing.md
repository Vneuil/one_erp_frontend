# Inventory, Warehouse & Manufacturing Flow

## Overview

This document explains, in plain language, how stock is tracked and moved through the ONE ERP system — from receiving goods into a warehouse, through counting and transferring stock, picking/packing/shipping customer orders, and converting raw materials into finished goods on the shop floor.

The short version: the core money-path logic (stock levels, transfers, physical counts, pick/pack/ship, and manufacturing consumption/production) is real, database-backed, and protected by transactions so a mid-operation failure won't leave stock in a half-updated state. There are, however, a few gaps worth knowing about — most notably that deleting a Product does not check whether it still has stock history, and a manufacturing batch's inventory update and its order-status update are not covered by a single transaction.

## Use Case: Receiving Stock into a Warehouse

When new stock arrives (a purchase delivery, a manual correction, etc.), it is recorded as a **Stock Adjustment** against a specific product and a specific warehouse. The system:

1. Looks up the existing stock level row for that product+warehouse pair.
2. If none exists yet, and this product has never been counted into *any* warehouse before, it seeds the new warehouse's starting quantity from the product's original catalog "Stock" figure (a compatibility bridge for products created before per-warehouse tracking existed) — so this warehouse doesn't start at a false zero. Once a warehouse claims that starting figure, later warehouses correctly start from zero so the number isn't double-counted.
3. Adds the adjustment quantity to the stock level and rejects the change if it would drive stock negative.
4. Writes an audit-trail "Stock Movement" record (in/out/adjustment) alongside the updated balance.

Every warehouse's stock is tracked as its own row (a `StockLevel` per product+warehouse pair), not as one shared number — this is what makes multi-warehouse operations possible.

## Use Case: Stock Opname (Physical Count Reconciliation)

A Stock Opname is a physical inventory count used to catch shrinkage, damage, or data-entry errors:

1. A count sheet is created for a warehouse, pre-filled with the system's current recorded quantities for each product.
2. Staff enter the actual counted quantity for each line.
3. On finalization, for every line where the counted quantity differs from the system quantity, the system sets the stock level to the counted quantity and writes an "adjustment" movement recording the variance, all in a single all-or-nothing transaction — either every variance is reconciled and the opname is marked complete, or none of it is (a mid-process failure cannot leave some products corrected and others not).

## Use Case: Inter-Warehouse Transfer

Moving stock from one warehouse to another is modeled as a two-sided transaction:

1. A transfer request is created specifying product, quantity, source warehouse, and destination warehouse (status: pending).
2. On completion, the system checks that the source warehouse actually has enough available stock, then — inside one database transaction — decrements the source warehouse's stock level (with a "transfer out" movement) and increments the destination warehouse's stock level (with a "transfer in" movement), then marks the transfer completed.

Because both sides happen in a single transaction, there is no window where stock could be deducted from the source but never arrive at the destination (or vice versa) — a failure at any point rolls the whole operation back.

## Use Case: Pick, Pack & Ship a Sales Order

This is a real operational workflow, not a disconnected simulation:

1. **Picking**: A pick wave is created against real Sales Order lines. Completing the pick wave runs inside a transaction that decrements each picked product's warehouse stock level and writes a "Picked for shipment" stock movement — this is where inventory is actually deducted for the sale.
2. **Packing**: A packing session is opened against the picked items and marked complete once everything is boxed. This is a status transition; no further inventory changes happen here since stock was already deducted at the pick step.
3. **Shipping**: The shipment is dispatched, updating its status and (via linked references) the originating Sales Order's delivery state.

All three screens (Picking, Packing, Shipping) call the real backend APIs rather than displaying fabricated data.

## Use Case: Manufacturing — BOM to Finished Goods

Turning raw materials into a finished product follows the Bill of Materials (BOM):

1. A Production Order is created for a finished-good product and a planned quantity, referencing that product's BOM (its list of required raw materials and quantities per unit).
2. Completing a production batch:
   - Validates that enough raw material stock exists.
   - Inside one transaction, decrements the stock level of every BOM raw material consumed (with a "Manufacturing consumption" movement) and increments the stock level of the finished good produced (with a "Manufacturing production" movement).
   - Separately, the production batch record and the order's completed-quantity/status are then updated in their own transaction.
3. Because there is no way in the current code to cancel or fail an in-progress production order, an order that never reaches "complete" simply never touches inventory — materials are only consumed at the point of a successful batch completion.

## Known Gaps / Recommendations

- **Product delete does not check for existing stock history.** Deleting a Warehouse is correctly blocked if any stock level records reference it, but deleting a Product performs a direct database delete with no equivalent check. Deleting a product that has stock levels, movement history, transfers, opname lines, or a BOM referencing it will leave orphaned records pointing at a product that no longer exists. Recommendation: add the same "block delete if referenced" check used for warehouses.
- **Manufacturing batch completion is split across two transactions.** The inventory consumption/production step is atomic on its own, but the follow-up update to the production batch record and order status is a separate transaction. If that second step fails after the first succeeds, inventory will have already been adjusted even though the order doesn't reflect completion — an inconsistent (though recoverable-by-investigation) state. Recommendation: wrap both steps in a single transaction, or add compensating logic/alerting for this specific failure window.
- **No cancel/fail path exists for Production Orders.** A "cancelled" status is defined in the data model, but there is no code path to actually cancel an order. This is safe (it can't accidentally consume inventory), but it also means a production order stuck due to a real-world problem (spoiled batch, equipment failure) currently has no way to be closed out cleanly.
- **Minor frontend leftovers, not functional bugs**: `bom/page.tsx` and `production-orders/page.tsx` (Manufacturing) and `picking/page.tsx`/`packing/page.tsx` (Warehouse) still contain unused, hardcoded mock-data arrays (`mockBOMs`, `mockMOs`, `mockPickLists`, `mockPackingOrders`) left over from earlier scaffolding. They are not rendered or wired to anything — the pages use the real backend APIs — but they should be deleted for code cleanliness.
- **BOM creation form can submit a placeholder product reference.** In `bom/page.tsx`, creating a BOM falls back to `crypto.randomUUID()` for the product ID if none was actually selected in the form (`productId || crypto.randomUUID()`), which would silently create a BOM pointing at a random, nonexistent product if the product picker isn't properly wired before submission. Recommendation: make product selection a required, validated field and remove the random-UUID fallback.
- **The `Product.Stock` legacy fallback is a one-time bridge, not a permanent dual source of truth.** It correctly stops applying once any warehouse has claimed a product's stock, avoiding double-counting — this was the bug fixed earlier this session, and it now behaves coherently. Longer-term, the flat `Stock` field on the Product Catalog record should probably be retired or clearly marked read-only/derived, since the real source of truth is the per-warehouse `StockLevel` table.
