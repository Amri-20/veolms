# What is left after the audit: checklist

Updated 14 Oct 2026, after the fifth round. The full record is `docs/AUDIT_RECONCILIATION_2026-10-11.md`, sections 19 to 24. This file is the short list to work from. Tick a box when it is done.

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

## Done in the fourth round (13 Oct)

- [x] Refunding one item of a bundle acts on what was sold, also when the bundle was edited later.
- [x] Approving a learner's refund request on a bank-transfer order takes the transfer reference in the same step. API only: see section D.
- [x] Staff who cannot reject a transfer request see "Ask an admin to reject this request." instead of a button that refuses.
- [x] `level: "all_levels"` on the direct course update clears the level.
- [x] Local file store: two uploads with one name no longer lose the file.
- [x] Purchase History filters and searches on the server, over all purchases (F2).
- [x] The tab title shows the course and the lesson (F17).
- [x] Analytics trend label shows the right day (F18).
- [x] No extra request after sign-out (A6).
- [x] No wasted request after a quiz is handed in (F8).
- [x] A moderator's delete removes the reply's mentions (B5c).
- [x] The whole app was run in a browser against a local API. Wrong addresses, the restricted course, the amount box, sign-up at phone size, free enrolment, Purchase History, the staff refund notice, the bank-transfer refund dialog and the Reject button were seen working.

## Done in the fifth round (14 Oct)

- [x] The wishlist is saved on the account, not only in the browser (F10). A guest's saved courses move to the account at sign-in.
- [x] Signed-out API callers are told to sign in before they are told what is wrong with the request (B9).
- [x] The direct course update refuses a stale version (B8).
- [x] Fewer wasted requests on a locked lesson (F7).
- [x] A guest on the Enrolled tab is asked to log in (F13).
- [x] One search shortcut hook instead of five copies (F11).
- [x] The quiz countdown redraws only itself each second (P3).
- [x] Accent text passes the contrast check on all 16 palettes, light and dark (X2).
- [x] Unused `axios` removed (R5).
- [x] Video player lint findings fixed; the rules are back on.
- [x] Lint warnings down from 31 to 23.
- [x] Checked, no change needed: notifications already stop polling in a hidden tab; the two unused payment statuses harm nothing (C10.4).
- [x] Razorpay test mode: orders are created, bad signatures are refused, a refused refund leaves the order paid.

## A. Right after each push

Pushing `dev` deploys the API and the web together.

- [ ] Confirm the deploy finished and these four migrations ran: `20261013100000-shorten-legacy-user-names`, `20261013110000-lowercase-user-emails`, `20261013120000-create-order-item-courses` and `20261014100000-create-wishlist-items`.
- [ ] Run the count file on the production database. It only counts, and writes nothing:

  ```bash
  psql "$PRODUCTION_DATABASE_URL" -x -f docs/audit-pre-push-checks.sql
  ```

- [ ] If check 5 shows any accounts sharing an email in different letter case, send me the numbers. I will report on them and not merge anything.
- [ ] Check the server's `TRUST_PROXY` value (section 18 of the report says which value fits which setup).
- [ ] Check that every address people sign in from is in `WEB_URL` or `CORS_ORIGINS`.

## B. Try these on staging or a real device

The first, third and ninth were seen in a local browser run in the fourth round. They are worth one more look on staging. The rest could not be tried from here.

- [ ] Course price card in the real app: type `199.50`, `50`, `-100`, `1e5`, `abc`. Then apply a coupon and change the amount.
- [ ] Sign in with a code that arrives by SMS, on an iPhone and on an Android phone.
- [ ] Open `/orders/abc`, `/courses/a/b/c`, `/settings/privacy` and `/abcde`, signed in and signed out. Each should say "not found".
- [ ] End a session from another device, then sign in as a different account on the same tab.
- [ ] One test-mode purchase with Razorpay in a normal browser: a declined attempt, then a successful one, then a refund. This could not be done from here: Razorpay's checkout screen does not draw in the browser I use.
- [ ] Look at the accent text colour on a few themes, light and dark. It was changed by calculation, not by eye.
- [ ] Play a video: play, pause, seek, open the quality menu, watch the buffering spinner. The player code was changed to satisfy the linter.
- [ ] Take a timed quiz to the end and let the time run out.
- [ ] Save a course to the wishlist as a guest, sign in, and see it on the account.
- [ ] Verify a manual payment, then also complete the gateway payment for the same order. It should appear in the refund notice on the Orders page.
- [ ] Change the amount on a course, pay the old and the new gateway order. Both should appear as one "paid twice" entry.
- [ ] Open a lesson whose quiz was deleted. It should say it has no video, and get its tick.
- [ ] Open a restricted free course as a learner. No enrol button.
- [ ] Refund an order that was paid by bank transfer: the dialog should ask for the transfer reference, and the order should become Refunded.
- [ ] Buy a course, then a bundle that contains it. It should appear in the refund notice.
- [ ] Sign in with Google and with GitHub using one email address written in different letter case. It should be one account.
- [ ] Run the upload clean-up once against real storage before turning it on.

## C. Decisions only you can make

- [ ] **Blank login page while the session is checked (A2).** A fix is written and held back, because `apps/web/AGENTS.md` says to leave the initial loading unchanged. Apply it?
- [ ] **A filter that resets (F14).** Is this the bug: on Courses, a creator picks "Draft", opens the editor, comes back, and the filter is "All" again?
- [ ] **A screen for refund requests.** Skipped for now by your decision. The API is ready.
- [ ] **Downloads (S3).** Should the "allow downloads" setting on a course be enforced? It is stored today and does nothing.
- [ ] **Archived courses (B1).** Should people who bought a course keep access after it is archived?
- [ ] **Sale price 0 (B7).** Should a sale price of 0 make a paid course free without asking?
- [ ] **Per-creator payment gateways (C4).** Build it, or remove the endpoints?
- [ ] **Dashboard numbers (F5).** Which definition of progress and of net revenue is the official one?
- [ ] **Upload clean-up (S16).** Turn it on? Set `DISCUSSION_UPLOAD_PURGE_INTERVAL_HOURS=24`. It is off by default.
- [ ] **API tests.** `apps/api` has a `test` script again (103 tests). Keep it?

## D. Bugs still open

Four of the seven from the last round are fixed. These are left.

- [ ] **A buyer can still pay twice.** Cannot be fixed in code: the gateway cannot withdraw an order it already gave the buyer. It is flagged for staff.
- [ ] **Bundle orders paid before 13 Oct** are not compared course by course. Cannot be fixed: what they contained when sold was never recorded.
- [ ] **Accounts that share an email in different letter case.** Waiting for the count from check 5 on production. I have no production access, so I need the output or a dump file.
- [ ] **Refund requests have no staff screen in the web.** Approving one works through the API only. See section C.

## E. Put off because it needs a browser or new API work

What is left of phase 4.

- [ ] **F17, the rest.** Share tags still do not follow the course.
- [ ] **F11, the rest.** The Notifications page keeps its own copy of the shortcut. Ctrl+K on a Mac does nothing on Courses and Discussions.
- [ ] **P1.** Course overview sends every lesson description. Needs three releases to change safely.
- [ ] **P2.** Stylesheet loading. Needs Lighthouse on a production build.
- [ ] **R1 to R4.** Very large files, direct imports, inline styles, queries inside services. Large refactors; not started.

## F. Code quality

What is left of phase 5.

- [ ] **23 lint warnings** remain. They need a behaviour change or come from a library notice. `pnpm lint` passes with 0 errors.
- [ ] **Production build of the web.** It reads the root `.env`, so it was never built here. The dev server was used instead.
- [ ] **Memory regression suite.** `apps/web/AGENTS.md` asks for one before every web commit. It does not exist.
