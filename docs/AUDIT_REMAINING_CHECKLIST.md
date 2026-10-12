# What is left after the audit: checklist

Written 13 Oct 2026, after everything was merged into `dev`. The full record is `docs/AUDIT_RECONCILIATION_2026-10-11.md`, section 19. This file is the short list to work from. Tick a box when it is done.

## A. Right after the push

Pushing `dev` deploys the API by itself. The web is deployed by hand.

- [ ] Watch the API deploy finish, and confirm these two migrations ran: `20261013100000-shorten-legacy-user-names` and `20261013110000-lowercase-user-emails`.
- [ ] Deploy the web from `dev`.
- [ ] Run the count file on the production database. It only counts, and writes nothing:

  ```bash
  psql "$PRODUCTION_DATABASE_URL" -x -f docs/audit-pre-push-checks.sql
  ```

- [ ] Check the server's `TRUST_PROXY` value (section 18 says which value fits which setup).
- [ ] Check that every address people sign in from is in `WEB_URL` or `CORS_ORIGINS`.

## B. Try these on staging or a real device

None of this could be tried from here.

- [ ] Course price card in the real app: type `199.50`, `50`, `-100`, `1e5`, `abc`. Then apply a coupon and change the amount.
- [ ] Sign in with a code that arrives by SMS, on an iPhone and on an Android phone.
- [ ] Open `/orders/abc`, `/courses/a/b/c` and `/settings/privacy` while signed in. Each should say "not found".
- [ ] End a session from another device, then sign in as a different account on the same tab.
- [ ] One test-mode purchase with Razorpay: a declined attempt, then a successful one, then a refund.
- [ ] Verify a manual payment, then also complete the gateway payment for the same order. Check that the extra payment is recorded.
- [ ] Sign in with Google and with GitHub using one email address written in different letter case. It should be one account.
- [ ] Run the upload clean-up once against real storage before turning it on.

## C. Decisions only you can make

- [ ] **Downloads (S3).** Should the "allow downloads" setting on a course be enforced? It is stored today and does nothing.
- [ ] **Archived courses (B1).** Should people who bought a course keep access after it is archived?
- [ ] **Removed quiz (B6a).** When a quiz is deleted, its lesson becomes a video lesson with no video. Unpublish the lesson, block the delete, or something else?
- [ ] **Sale price 0 (B7).** Should a sale price of 0 make a paid course free without asking?
- [ ] **Per-creator payment gateways (C4).** Build it, or remove the endpoints?
- [ ] **Dashboard numbers (F5).** Which definition of progress and of net revenue is the official one?
- [ ] **Restricted courses (B2).** A free restricted course can no longer be self-enrolled. Should a restricted course that is sold, or one inside a bundle, be closed too?
- [ ] **Upload clean-up (S16).** Turn it on? Set `DISCUSSION_UPLOAD_PURGE_INTERVAL_HOURS=24`. It is off by default.
- [ ] **API tests.** `apps/api` has a `test` script again (37 tests). Keep it?

## D. Bugs still open

Most important first.

- [ ] **A buyer can pay twice for one course.** If they change the amount and pay both the old and the new gateway order, both are taken. It shows as two paid orders. Nothing warns anyone.
- [ ] **No screen shows extra payments.** A gateway payment that arrives after a manual payment is recorded in the database, but staff can only find it in the logs or with a query.
- [ ] **A creator cannot remove a course's category.** The page says it was removed; the server keeps it.
- [ ] **Restricted free course still shows "Enroll for Free".** Clicking it shows a refusal. Hiding the button needs one new field from the API.
- [ ] **Accounts that share an email in different letter case.** They were left alone. Someone has to choose which one is real.
- [ ] **Profile page shows the old phone number for about 10 seconds** after a number is confirmed.
- [ ] **Manual payment and gateway payment at the same instant.** The manual check can fail with a database error. The order still ends up paid once.
- [ ] **Quiz payment that fails to verify** always shows the same general message.
- [ ] **A one-word wrong address** (like `/abcde`) shows "This profile is unavailable" instead of "not found".
- [ ] **Quiz draft and last-opened lesson** are remembered per browser, not per account.
- [ ] **Upload leftovers.** A renamed file can be left in storage; the daily upload limit can be passed by a fast burst.
- [ ] **Existing usernames under 3 letters** cannot open their profile page.
- [ ] **Coupon errors.** Any duplicate is reported as "code already exists".

## E. Put off because it needs a browser or new API work

- [ ] **A2.** Login page shows nothing while it checks the session.
- [ ] **A6.** One extra request after sign-out.
- [ ] **F2.** Purchase History filters only the purchases already loaded.
- [ ] **F7, F8.** Wasted requests on a locked lesson and after a quiz is submitted.
- [ ] **F10.** Wishlist is saved in the browser only.
- [ ] **F11.** Six copies of the Ctrl+K shortcut code.
- [ ] **F13, F14.** Guest edge cases; a filter that sometimes resets.
- [ ] **F17.** Page titles and share tags.
- [ ] **F18.** Analytics trend label shows the wrong day near midnight.
- [ ] **B5c.** A moderator's delete leaves mentions behind.
- [ ] **B8, B9.** Direct course update skips version checks; validation runs before permission checks.
- [ ] **C10.4.** Two payment statuses that nothing ever sets.
- [ ] **P1.** Course overview sends every lesson description. Needs three releases to change safely.
- [ ] **P2.** Stylesheet loading. Needs Lighthouse on a production build.
- [ ] **P3.** Notifications poll every 30 seconds; quiz timer redraws every second.
- [ ] **X2.** Accent text contrast across the 16 colour palettes.
- [ ] **R1 to R5.** Very large files, direct imports, inline styles, queries inside services, unused `axios`.

## F. Code quality

- [ ] **Video player lint.** Two React rules are switched off for `packages/video-player` instead of fixing 7 places. Fixing them changes playback code and needs a browser.
- [ ] **31 lint warnings** remain. `pnpm lint` passes with 0 errors.
- [ ] **No full browser run of the app.** The web build reads the root `.env`, so it was never built here. A build that reads a safe env file would allow real browser tests.
- [ ] **Memory regression suite.** `apps/web/AGENTS.md` asks for one before every web commit. It does not exist.
