-- Pre-push checks 3 and 4. Counts only: no row, name, email or number is
-- returned. Run inside a read-only transaction, so nothing can be written
-- even by mistake.
begin transaction read only;

-- ---------------------------------------------------------------- check 3
-- Free courses set to "restricted", and learners using them without a grant.
-- After the B2 change such learners lose the course's quizzes and its lesson
-- discussions. The course's creator and administrators are not affected and
-- are left out.
with restricted_free as (
  select c.id, c.creator_id
  from courses c
  join course_pricing p on p.course_id = c.id and p.pricing_type = 'free'
  join course_access_rules r on r.course_id = c.id and r.access_type = 'restricted'
  where c.deleted_at is null and c.status = 'published'
),
admins as (
  select ur.user_id
  from user_roles ur
  join roles ro on ro.id = ur.role_id
  where lower(ro.name) = 'admin'
),
ungranted as (
  -- (user, course) pairs with no grant that is active today
  select u.id as user_id, rf.id as course_id
  from restricted_free rf
  join users u on u.is_deleted = false and u.id <> rf.creator_id
  where u.id not in (select user_id from admins)
    and not exists (
      select 1 from access_grants g
      where g.user_id = u.id and g.course_id = rf.id
        and g.status = 'active'
        and (g.valid_until is null or g.valid_until > now())
    )
)
select
  (select count(*) from restricted_free) as restricted_free_courses,
  (select count(distinct x.user_id) from ungranted x
     join quiz_assignments qa on qa.course_id = x.course_id
     join quiz_attempts t on t.assignment_id = qa.id and t.user_id = x.user_id
  ) as learners_with_quiz_attempts_no_grant,
  (select count(distinct x.user_id) from ungranted x
     join quiz_assignments qa on qa.course_id = x.course_id
     join quiz_attempts t on t.assignment_id = qa.id and t.user_id = x.user_id
    where t.created_at > now() - interval '30 days'
  ) as of_those_active_in_last_30_days,
  (select count(distinct x.user_id) from ungranted x
     join enrollments e on e.user_id = x.user_id and e.course_id = x.course_id and e.status = 'active'
  ) as learners_enrolled_no_grant,
  (select count(distinct x.user_id) from ungranted x
     join learning_progress lp on lp.user_id = x.user_id and lp.course_id = x.course_id
  ) as learners_with_progress_no_grant,
  (select count(distinct x.user_id) from ungranted x
     join learning_threads th on th.user_id = x.user_id and th.course_id = x.course_id
  ) as learners_who_posted_no_grant;

-- ---------------------------------------------------------------- check 4
-- Accounts whose phone number was never confirmed. Phone sign-in is refused
-- only for those that also have a confirmed email (they sign in by email and
-- confirm the number from their profile). An account with no confirmed email
-- keeps phone sign-in: the number is its only way in.
select
  count(*) filter (where phone_no is not null and phone_verified_at is not null) as phone_confirmed,
  count(*) filter (where phone_no is not null and phone_verified_at is null) as phone_never_confirmed,
  count(*) filter (where phone_no is not null and phone_verified_at is null and email_verified_at is not null) as will_lose_phone_sign_in_keep_email,
  count(*) filter (where phone_no is not null and phone_verified_at is null and email_verified_at is null) as keep_phone_sign_in_no_confirmed_email
from users
where is_deleted = false;

rollback;
