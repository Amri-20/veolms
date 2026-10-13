# What is left after the audit: checklist

Updated 13 Oct 2026, after phases 1 to 3. The full record is `docs/AUDIT_RECONCILIATION_2026-10-11.md`, sections 19 and 20. This file is the short list to work from. Tick a box when it is done.

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

## A. Right after each push

Pushing `dev` deploys the API and the web together.

- [ ] Confirm the deploy finished and these two migrations ran: `20261013100000-shorten-legacy-user-names` and `20261013110000-lowercase-user-emails`.
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
- [ ] Sign in with Google and with GitHub using one email address written in different letter case. It should be one account.
- [ ] Run the upload clean-up once against real storage before turning it on.

## C. Decisions only you can make

- [ ] **Downloads (S3).** Should the "allow downloads" setting on a course be enforced? It is stored today and does nothing.
- [ ] **Archived courses (B1).** Should people who bought a course keep access after it is archived?
- [ ] **Sale price 0 (B7).** Should a sale price of 0 make a paid course free without asking?
- [ ] **Per-creator payment gateways (C4).** Build it, or remove the endpoints?
- [ ] **Dashboard numbers (F5).** Which definition of progress and of net revenue is the official one?
- [ ] **Upload clean-up (S16).** Turn it on? Set `DISCUSSION_UPLOAD_PURGE_INTERVAL_HOURS=24`. It is off by default.
- [ ] **API tests.** `apps/api` has a `test` script again (62 tests). Keep it?
- [ ] **Publishing a course that has a lesson with no video.** Publish is refused for such a course today. A course already published keeps working, but cannot be unpublished and published again. Allow it?
- [ ] **Changing a quiz lesson into a video lesson.** The quiz stays attached and the lesson still offers it. Should the change also remove the quiz?

## D. Bugs still open

Most important first.

- [ ] **A buyer can still pay twice.** The old gateway order cannot be withdrawn. It is now flagged for staff, but nothing stops it.
- [ ] **Manual payment refused because the gateway payment landed first.** The manual request stays pending and the buyer's bank transfer is not on the refund list.
- [ ] **Two orders both paid by manual transfer** for one course are listed, but cannot be refunded in the app.
- [ ] **Bundles are not compared** when looking for a course paid twice.
- [ ] **Course level cannot be cleared.** Same fault the category had.
- [ ] **Catalogue card still says "Enroll Now"** on a restricted free course. Its page is correct. The card needs one more field from the API.
- [ ] **Accounts that share an email in different letter case** were left alone. Wait for the count from check 5.
- [ ] **A lesson opened while it had no video stays "complete"** if a video is attached later.
- [ ] **Signed-out `/auth`** still goes to the home page instead of "not found".
- [ ] **Upload leftovers.** A file refused for being too large can leave its first copy in storage until the clean-up runs.
- [ ] **No hint in Settings** for an account whose username is too short to open its profile.

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
