# What is left after the audit: checklist

Updated 13 Oct 2026, after the third round. The full record is `docs/AUDIT_RECONCILIATION_2026-10-11.md`, sections 19 to 22. This file is the short list to work from. Tick a box when it is done.

## Done in phases 1 to 3 (13 Oct)

- [x] Staff can see payments that need a manual refund, at the top of the Orders page: extra gateway payments, and courses paid for twice.
- [x] A manual payment and a gateway payment arriving together no longer fail with a database error.
- [x] A quiz payment that fails to verify now waits and tells the buyer not to pay again.
- [x] A restricted free course no longer shows "Enroll for Free". It says enrollment is by invitation.
- [x] A creator can remove a course's category.
- [x] A lesson whose quiz was deleted says "This lesson has no video" and can be completed.
- [x] Profile changes (name, photo, phone, email) show at once.
- [x] Upload limits hold when many files arrive together.
- [x] A wrong one-word address says "Page not found", also for signed-out visitors.
- [x] Quiz drafts and the last-opened lesson stay with their own account.
- [x] Coupon errors name the right problem.
- [x] Short usernames: no code needed. The account can pick a longer one in Settings today.

## Done in the open-bug round (13 Oct)

- [x] A course with a lesson that has no video can be published, and published again.
- [x] When a lesson gets its first video, its "complete" tick is cleared for everyone, so it has to be watched.
- [x] A bank transfer reported for an order the gateway already paid is on the staff refund list, with a Reject button.
- [x] Course level can be cleared.
- [x] Catalogue cards say "View Course", not "Enroll Now", on a restricted free course.
- [x] Signed-out `/auth` says "Page not found".
- [x] Two files sent to one upload slot no longer leave an untracked file.
- [x] Settings tells an account when its username is too short for a profile page.
- [x] Checked, no change needed: a quiz stays when a lesson becomes a video lesson, and a lesson can have both.

## Done in the third round (13 Oct)

- [x] Staff can record a refund they made outside the platform, for an order paid by bank transfer. Full or partial. The buyer is told and gets a credit note.
- [x] Learners who passed a lesson's quiz keep their tick when the lesson gets a video later.
- [x] The same bundle paid twice is on the staff refund list.
- [x] A course bought directly and again inside a bundle is on the staff refund list.
- [x] A bank transfer reported for a cancelled or failed order is on the staff refund list.
- [x] The catalogue card shows the true progress percent.

## A. Right after each push

Pushing `dev` deploys the API and the web together.

- [ ] Confirm the deploy finished and these three migrations ran: `20261013100000-shorten-legacy-user-names`, `20261013110000-lowercase-user-emails` and `20261013120000-create-order-item-courses`.
- [ ] Run the count file on the production database. It only counts, and writes nothing:

  ```bash
  psql "$PRODUCTION_DATABASE_URL" -x -f docs/audit-pre-push-checks.sql
  ```

- [ ] If check 5 shows any accounts sharing an email in different letter case, send me the numbers. I will report on them and not merge anything.
- [ ] Check the server's `TRUST_PROXY` value (section 18 of the report says which value fits which setup).
- [ ] Check that every address people sign in from is in `WEB_URL` or `CORS_ORIGINS`.

## B. Try these on staging or a real device

None of this could be tried from here.

- [ ] Course price card in the real app: type `199.50`, `50`, `-100`, `1e5`, `abc`. Then apply a coupon and change the amount.
- [ ] Sign in with a code that arrives by SMS, on an iPhone and on an Android phone.
- [ ] Open `/orders/abc`, `/courses/a/b/c`, `/settings/privacy` and `/abcde`, signed in and signed out. Each should say "not found".
- [ ] End a session from another device, then sign in as a different account on the same tab.
- [ ] One test-mode purchase with Razorpay: a declined attempt, then a successful one, then a refund.
- [ ] Verify a manual payment, then also complete the gateway payment for the same order. It should appear in the refund notice on the Orders page.
- [ ] Change the amount on a course, pay the old and the new gateway order. Both should appear as one "paid twice" entry.
- [ ] Open a lesson whose quiz was deleted. It should say it has no video, and get its tick.
- [ ] Open a restricted free course as a learner. No enrol button.
- [ ] Refund an order that was paid by bank transfer: the dialog should ask for the transfer reference, and the order should become Refunded.
- [ ] Buy a course, then a bundle that contains it. It should appear in the refund notice.
- [ ] Sign in with Google and with GitHub using one email address written in different letter case. It should be one account.
- [ ] Run the upload clean-up once against real storage before turning it on.

## C. Decisions only you can make

- [ ] **Downloads (S3).** Should the "allow downloads" setting on a course be enforced? It is stored today and does nothing.
- [ ] **Archived courses (B1).** Should people who bought a course keep access after it is archived?
- [ ] **Sale price 0 (B7).** Should a sale price of 0 make a paid course free without asking?
- [ ] **Per-creator payment gateways (C4).** Build it, or remove the endpoints?
- [ ] **Dashboard numbers (F5).** Which definition of progress and of net revenue is the official one?
- [ ] **Upload clean-up (S16).** Turn it on? Set `DISCUSSION_UPLOAD_PURGE_INTERVAL_HOURS=24`. It is off by default.
- [ ] **API tests.** `apps/api` has a `test` script again (94 tests). Keep it?
- [ ] **A learner's own refund request on a bank-transfer order.** Approving it is still refused; staff use Refund Order instead. Should approving it also ask for the transfer reference?

## D. Bugs still open

Most important first.

- [ ] **A buyer can still pay twice.** The old gateway order cannot be withdrawn. It is flagged for staff; nothing can stop it.
- [ ] **Refunding one item of a bundle that was edited after the sale** acts on the bundle's contents today, not as sold. The new record makes a fix possible.
- [ ] **Bundle orders paid before 13 Oct** are not compared course by course. What they contained when sold was never recorded.
- [ ] **Accounts that share an email in different letter case** were left alone. Wait for the count from check 5.
- [ ] **`level: "all_levels"` on the direct course update** does not clear the level. The web does not use that endpoint.
- [ ] **Local file store only:** two uploads with the same name at once can lose the file. Real storage is not affected.
- [ ] **The Reject button needs the admin role**, but staff with billing access can see the row. They get a refusal message.

## E. Put off because it needs a browser or new API work

Phase 4. Waiting for a safe way to run the web app in a browser.

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

Phase 5.

- [ ] **Video player lint.** Two React rules are switched off for `packages/video-player` instead of fixing 7 places. Fixing them changes playback code and needs a browser.
- [ ] **31 lint warnings** remain. `pnpm lint` passes with 0 errors.
- [ ] **No full browser run of the app.** The web build reads the root `.env`, so it was never built here. Single screens were tried on standalone pages instead.
- [ ] **Memory regression suite.** `apps/web/AGENTS.md` asks for one before every web commit. It does not exist.
