# What is left after the audit: checklist

Updated 14 Oct 2026, after the owner's decisions round. The full record is `docs/AUDIT_RECONCILIATION_2026-10-11.md`, sections 19 to 29. This file is the short list to work from. Tick a box when it is done.

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

## Done in the sixth round (14 Oct)

- [x] The login page shows its frame and a loading card while the session is checked (A2).
- [x] The Courses filter stays where it was after the course editor (F14).
- [x] Razorpay test purchase done by the owner: declined, successful, refund. All worked.
- [x] Production counts run by the owner: all zero.

## Done in the seventh round (14 Oct)

- [x] The lesson page reads a lesson's description from its own request (P1, steps 1 and 2). A switch is ready to shrink the course overview.
- [x] Queries moved out of services into repositories, with identical responses on 608 requests (R4).
- [x] The course page has share tags that follow the course (F17).
- [x] Notifications uses the shared search shortcut; Ctrl+K and Cmd+K both work outside text fields (F11).
- [x] Lint warnings down from 23 to 12.

## Done in the double-payment round (14 Oct)

- [x] The amount or coupon cannot be changed while a checkout for that purchase may still be open.
- [x] Two overlapping purchases (a course and a bundle that holds it) cannot both be open.
- [x] A bundle is refused if the buyer owns any of its courses.
- [x] A reported bank transfer closes Pay for that purchase until staff answer; an open checkout closes transfer reporting.
- [x] Two requests at the same instant give one open order.
- [x] The payment window closes itself after 10 minutes.

## Done after the independent review (14 Oct)

- [x] Three reviewers read everything from rounds 4 to 8. No high-severity bug. Twelve findings fixed (section 28).
- [x] A late "payment failed" notice no longer blocks the buyer for another 12 minutes.
- [x] Two requests at the same instant can no longer leave two payable gateway orders.
- [x] Refunding only the quiz item of an order removes the quiz pass.
- [x] Quick wishlist clicks no longer undo each other.

## Done in the owner's decisions round (14 Oct)

- [x] An extra payment is refunded to the buyer automatically.
- [x] Free enrolment is instant.
- [x] A bank transfer can be reported at once, withdrawn by the buyer, and stops blocking after 7 days.
- [x] Archived courses: students keep access; nobody can buy them.
- [x] A sale price of 0 makes the course free.
- [x] The low-risk observations from section 26.2.
- [x] Text lessons wait for their text, so the overview switch is safe.
- [x] Share previews can carry the page address.
- [x] Staging checks of section B: confirmed working by the owner.

## A. Right after each push

Pushing `dev` deploys the API and the web together.

- [ ] Confirm the deploy finished and migration `20261015100000-manual-payment-withdrawn` ran, as well as these four: `20261013100000-shorten-legacy-user-names`, `20261013110000-lowercase-user-emails`, `20261013120000-create-order-item-courses` and `20261014100000-create-wishlist-items`.
- [x] Run the count file on the production database. Done by the owner on 14 Oct: every count is 0. It only counts, and writes nothing:

  ```bash
  psql "$PRODUCTION_DATABASE_URL" -x -f docs/audit-pre-push-checks.sql
  ```

- [x] Check 5 (accounts sharing an email in different letter case): 0 found. Nothing to merge.
- [ ] **One release after this one:** set `COURSE_OVERVIEW_LESSON_DESCRIPTIONS=false` on the API. Text lessons are now safe with it.
- [ ] Set `VITE_SITE_URL` (for example `https://dev.veolms.org`) in the environment of the build that deploys the web. The course overview shrinks to about a sixth for a long course. Do it only after the web from this release is live.
- [ ] Check the server's `TRUST_PROXY` value (section 18 of the report says which value fits which setup).
- [ ] Check that every address people sign in from is in `WEB_URL` or `CORS_ORIGINS`.

## B. Try these on staging or a real device

The first, third and ninth were seen in a local browser run in the fourth round. They are worth one more look on staging. The rest could not be tried from here.

- [ ] Course price card in the real app: type `199.50`, `50`, `-100`, `1e5`, `abc`. Then apply a coupon and change the amount.
- [ ] Sign in with a code that arrives by SMS, on an iPhone and on an Android phone.
- [ ] Open `/orders/abc`, `/courses/a/b/c`, `/settings/privacy` and `/abcde`, signed in and signed out. Each should say "not found".
- [ ] End a session from another device, then sign in as a different account on the same tab.
- [x] One test-mode purchase with Razorpay in a normal browser: a declined attempt, then a successful one, then a refund. Done by the owner on 14 Oct.
- [ ] Open `/login` in a private window after the deploy. It should show the page frame with a loading card, not a blank page.
- [ ] Look at the accent text colour on a few themes, light and dark. It was changed by calculation, not by eye.
- [ ] Play a video: play, pause, seek, open the quality menu, watch the buffering spinner. The player code was changed to satisfy the linter.
- [ ] Take a timed quiz to the end and let the time run out.
- [ ] Press Pay, close the payment window, change the amount and press Pay again. It should say a payment was already started and when to try again.
- [ ] Leave the Razorpay window open for 10 minutes. It should close itself.
- [ ] Own a course, then try to buy a bundle that holds it. It should be refused and name the course.
- [ ] Share a course overview link in WhatsApp or Slack. The preview should show the course title, description and picture.
- [ ] Open a lesson. Its description should show as before.
- [ ] Post a note, a question and a reply; edit and remove one of your own. The code behind these was moved, not changed.
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

- [ ] **Five payment rules that may be too strict** (section 28.1): no bank transfer in the first 12 minutes of an order; no free enrolment for 12 minutes after a dismissed support payment; a pending transfer blocks the buyer until staff answer; a bundle is refused for a course held free or by grant; one transfer reference per refund across all orders. Keep, or relax which?
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

- [ ] **A buyer can still pay twice in three rare cases** (section 27): a UPI request approved after 12 minutes or an old tab, a double capture by the provider, and two different accounts. Every door the app controls is now closed. These are flagged for staff. Only automatic refunds would cover them.
- [ ] **Bundle orders paid before 13 Oct** are not compared course by course. Cannot be fixed: what they contained when sold was never recorded.
- [x] **Accounts that share an email in different letter case.** Closed on 14 Oct: the production count is 0.
- [ ] **Refund requests have no staff screen in the web.** Approving one works through the API only. See section C.

## E. Put off because it needs a browser or new API work

What is left of phase 4.

- [ ] **P2.** Stylesheet loading. Needs Lighthouse on a production build, which I do not make here.
- [ ] **F17, last part.** The prerendered course page has no `og:url` or canonical link. Needs a build variable with the site address.
- [ ] **R1, R2.** Very large files and direct imports. Large refactors with no behaviour to gain. I will start only when you say so.
- [ ] **R3.** Inline styles. The web rules say not to migrate styles unrelated to a task.

## F. Code quality

What is left of phase 5.

- [ ] **12 lint warnings** remain: 5 library notices and 7 that need a behaviour change. `pnpm lint` passes with 0 errors.
- [ ] **15 queries still outside repositories:** the reminder worker, the OTP locks, the health ping, commerce and courses.
- [ ] **Four things noticed while moving queries**, listed in section 26.2 of the report. Not fixed; they need your call.
- [ ] **Production build of the web.** It reads the root `.env`, so it was never built here. The dev server was used instead.
- [ ] **Memory regression suite.** `apps/web/AGENTS.md` asks for one before every web commit. It does not exist.
