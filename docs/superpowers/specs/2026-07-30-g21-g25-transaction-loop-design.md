# G21–G25 Transaction Loop Design

## Goal

Deliver the first testable buyer transaction loop: server-authoritative checkout
quotes, atomic order creation, sandbox payment, buyer/merchant/platform order
workflows, and automatic expiry handling. Each Harness group remains a separate
commit and can be accepted independently.

## Constraints and explicit defaults

- The first release uses free shipping (`CNY 0.00`). Quotes and order snapshots
  still contain shipping amounts so a later shipping-rule provider can replace
  the default without changing the contract.
- No Redis, external queue, or real payment provider is introduced. Durable
  database tables provide payment event and job persistence.
- Money is persisted as Prisma `Decimal` and exposed as two-decimal strings.
- The browser never supplies an authoritative total.
- Checkout requires an authenticated `CUSTOMER`.
- Payment facts are changed only by the payment service/provider event flow.
- Existing user work and `packages/ui/dist-docs/` are outside this scope.

## G21: server-authoritative checkout quote

`CheckoutModule` loads the authenticated user's selected cart items together
with current SKU, product, store, merchant, and inventory state. It returns
store groups with item subtotal, shipping, discount, payable amount, and
per-item invalid reasons. Coupon pricing is recalculated by the promotion
domain. Address is a typed request snapshot; this phase validates required
recipient, phone, and address fields without introducing a reusable address
book.

A quote is persisted for ten minutes with a monotonically named contract
version (`g21.v1`) and an unguessable token. The API also returns an HMAC
signature over quote id, user id, version, expiry, and total. A quote request
does not reserve inventory. Order submission must re-read every relevant fact,
compare it with the quote snapshot, reject expired/tampered/stale quotes, and
never trust client totals.

## G22: atomic order creation

`OrderModule` owns master orders, merchant child orders, immutable order item
snapshots, state events, and read/cancel/confirm operations. One serializable
Prisma transaction:

1. consumes an unexpired quote for the same customer;
2. repeats address, store, price, purchase-limit, inventory, and coupon checks;
3. creates an unpredictable public order number and merchant child orders;
4. reserves inventory using the existing conditional inventory update;
5. redeems the selected coupon through `PromotionService`;
6. creates one pending payment intent covering the master order;
7. marks the quote consumed and removes ordered cart items.

`Idempotency-Key` is required and unique per customer operation. Reusing the
same key with the same request returns the existing order; changing the request
under the same key returns a conflict. State transitions use the shared order
transition table and append an event. Buyer reads are owner-scoped, merchant
reads are merchant-scoped, and platform reads require platform roles.

## G23: sandbox payment

`PaymentProvider` defines `create`, `query`, `close`, `refund`, and
`verifyWebhook`. `SandboxPaymentProvider` creates deterministic provider ids
and HMAC-verifies raw webhook bodies. `PaymentService` archives every raw event
with a unique provider event id before applying it, checks amount and currency,
and treats duplicate or stale events idempotently. A successful payment moves
the payment intent to `SUCCEEDED`, commits inventory reservations, and moves
the order from `PENDING_PAYMENT` to `PAID` in one transaction.

The storefront payment route can start or recover the existing payment intent,
display processing/success/failure/cancelled states, and poll query state.
Refresh uses the persisted payment intent and does not create another charge.
The sandbox exposes an authenticated simulation endpoint for local acceptance
testing; production environments must not enable it.

## G24: order user interfaces

Storefront adds checkout, payment, order list, and order detail pages. Buyers
can continue payment, cancel an unpaid order, confirm receipt of a shipped
order, and see the reserved after-sale entry point. The account navigation
links to real order data.

Admin replaces the fake order board with API-backed filters and detail views.
Merchant users see only orders belonging to their merchant, with minimal buyer
contact disclosure, can append internal notes, and can request a durable CSV
export job. Platform users can inspect cross-store orders and exceptions.
Neither merchant staff nor ordinary platform operators can edit payment facts.

## G25: durable jobs and commerce observability

`JobsModule` persists jobs, attempt count, next run time, lease, failure
message, and dead-letter time. A lightweight in-process poller claims due jobs
using conditional updates. `CLOSE_EXPIRED_ORDER` closes the pending provider
payment, transitions the order to `CLOSED`, and releases active inventory
reservations in one idempotent transaction. Retries use bounded exponential
backoff; exhausted jobs become dead letters.

Admin platform users can view failed jobs. Only `PLATFORM_ADMIN` can replay a
dead letter. Commerce metrics cover quote success/failure, order success,
inventory lock failure, payment success/failure, webhook backlog, due jobs, and
dead letters. Alert output exposes explicit threshold states without leaking
buyer or payment details.

## Error handling

Domain failures use stable API error codes. Transaction conflicts and stale
quotes return `409`; invalid input returns `400`; unauthenticated and
out-of-domain access return `401/403/404` as appropriate. Provider events are
archived before state application and retain a sanitized failure reason.
Retryable job failures never partially release inventory or partially close an
order.

## Verification and acceptance evidence

- Deterministic domain and service tests use the existing `node:test` runner.
- Prisma schema validation/generation and API tests/build cover backend changes.
- Shared typecheck covers each contract increment.
- Storefront and admin builds cover UI integration.
- The final cross-package typecheck/build records actual results.
- `docs/testing/G21-G25-ACCEPTANCE.md` maps each Harness item to API/UI steps,
  expected results, and automated evidence.

