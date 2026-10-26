import type { Permission } from "./permissions.ts";

export interface PermissionCatalogueEntry {
  key: Permission;
  label: string;
  help: string;
  /** Keys this one cannot work without. Ticking it ticks these too. */
  implies: readonly Permission[];
}

export interface PermissionCatalogueGroup {
  area: string;
  label: string;
  entries: readonly PermissionCatalogueEntry[];
}

function entry(
  key: Permission,
  label: string,
  help: string,
  implies: readonly Permission[] = [],
): PermissionCatalogueEntry {
  return { key, label, help, implies };
}

/**
 * Every permission, grouped the way the role editor shows them. Each key
 * belongs to exactly one group (checked by a test).
 */
export const permissionCatalogue: readonly PermissionCatalogueGroup[] = [
  {
    area: "courses",
    label: "Courses",
    entries: [
      entry(
        "course.read",
        "View courses",
        "See courses in the staff workspace, drafts included.",
      ),
      entry(
        "course.preview",
        "Preview courses",
        "Open a draft course as a learner would see it.",
        ["course.read"],
      ),
      entry("course.create", "Create courses", "Start new courses.", [
        "course.read",
      ]),
      entry(
        "course.details.update",
        "Edit course details",
        "Change title, description, level and category.",
        ["course.read"],
      ),
      entry(
        "course.thumbnail.update",
        "Change course thumbnails",
        "Upload or replace a course's cover image.",
        ["course.read"],
      ),
      entry(
        "course.pricing.update",
        "Change course pricing",
        "Set prices, discounts and free access.",
        ["course.read"],
      ),
      entry(
        "course.curriculum.update",
        "Edit curriculum",
        "Add, move and remove sections.",
        ["course.read"],
      ),
      entry(
        "course.publish",
        "Publish courses",
        "Make a course visible to learners.",
        ["course.read"],
      ),
      entry(
        "course.unpublish",
        "Unpublish courses",
        "Hide a published course from learners.",
        ["course.read"],
      ),
      entry(
        "course.archive",
        "Archive courses",
        "Retire a course without deleting it.",
        ["course.read"],
      ),
      entry("course.delete", "Delete courses", "Move a course to the bin.", [
        "course.read",
      ]),
      entry(
        "course.restore",
        "Restore deleted courses",
        "Bring a course back from the bin.",
        ["course.read"],
      ),
    ],
  },
  {
    area: "lessons",
    label: "Lessons",
    entries: [
      entry(
        "lesson.read",
        "View lessons",
        "See every lesson, drafts included.",
        ["course.read"],
      ),
      entry("lesson.create", "Create lessons", "Add lessons to a course.", [
        "lesson.read",
      ]),
      entry(
        "lesson.details.update",
        "Edit lesson details",
        "Change a lesson's title and description.",
        ["lesson.read"],
      ),
      entry(
        "lesson.content.update",
        "Edit lesson content",
        "Write and change a lesson's text.",
        ["lesson.read"],
      ),
      entry(
        "lesson.video.update",
        "Change lesson videos",
        "Upload or replace a lesson's video.",
        ["lesson.read"],
      ),
      entry(
        "lesson.video.import_youtube",
        "Import lesson videos from YouTube",
        "Download a YouTube video the academy owns into a lesson.",
        ["lesson.video.update"],
      ),
      entry(
        "lesson.thumbnail.update",
        "Change lesson thumbnails",
        "Upload or replace a lesson's image.",
        ["lesson.read"],
      ),
      entry(
        "lesson.reorder",
        "Reorder lessons",
        "Move lessons within and between sections.",
        ["lesson.read"],
      ),
      entry(
        "lesson.publish",
        "Publish lessons",
        "Make a lesson visible to learners.",
        ["lesson.read"],
      ),
      entry(
        "lesson.delete",
        "Delete lessons",
        "Remove lessons from a course.",
        ["lesson.read"],
      ),
    ],
  },
  {
    area: "quizzes",
    label: "Quizzes",
    entries: [
      entry("quiz.read", "View quizzes", "See quizzes and their questions."),
      entry("quiz.create", "Create quizzes", "Add new quizzes.", ["quiz.read"]),
      entry(
        "quiz.settings.update",
        "Edit quiz settings",
        "Change time limits, attempts and pricing.",
        ["quiz.read"],
      ),
      entry(
        "quiz.questions.manage",
        "Manage questions",
        "Add, edit and remove quiz questions.",
        ["quiz.read"],
      ),
      entry(
        "quiz.publish",
        "Publish quizzes",
        "Make a quiz available to learners.",
        ["quiz.read"],
      ),
      entry("quiz.delete", "Delete quizzes", "Remove quizzes.", ["quiz.read"]),
    ],
  },
  {
    area: "assignments",
    label: "Assignments and grading",
    entries: [
      entry(
        "assignment.read",
        "View assignments",
        "See assignments and their instructions.",
      ),
      entry("assignment.create", "Create assignments", "Add new assignments.", [
        "assignment.read",
      ]),
      entry(
        "assignment.update",
        "Edit assignments",
        "Change an assignment's instructions and settings.",
        ["assignment.read"],
      ),
      entry(
        "assignment.publish",
        "Publish assignments",
        "Make an assignment available to learners.",
        ["assignment.read"],
      ),
      entry("assignment.delete", "Delete assignments", "Remove assignments.", [
        "assignment.read",
      ]),
      entry(
        "submission.read",
        "View submissions",
        "See learners' quiz attempts and assignment work.",
      ),
      entry(
        "submission.grade",
        "Grade submissions",
        "Score and give feedback on submissions.",
        ["submission.read"],
      ),
      entry(
        "submission.grade.override",
        "Override grades",
        "Change a grade someone else gave.",
        ["submission.grade"],
      ),
    ],
  },
  {
    area: "students",
    label: "Students",
    entries: [
      entry(
        "student.read",
        "View students",
        "Open the Students list and each student's details.",
      ),
      entry(
        "student.contact.update",
        "Edit student contact details",
        "Change a student's email or phone.",
        ["student.read"],
      ),
      entry(
        "student.access.manage",
        "Manage course access",
        "Grant or remove a student's access to courses.",
        ["student.read"],
      ),
      entry(
        "enrollment.read",
        "View enrollments",
        "See who is enrolled in which course.",
      ),
      entry(
        "enrollment.create",
        "Enroll students",
        "Add a student to a course.",
        ["enrollment.read"],
      ),
      entry(
        "enrollment.cancel",
        "Cancel enrollments",
        "Remove a student from a course.",
        ["enrollment.read"],
      ),
    ],
  },
  {
    area: "discussions",
    label: "Discussions",
    entries: [
      entry(
        "discussion.read",
        "View discussions",
        "Read every discussion, hidden posts included.",
      ),
      entry(
        "discussion.moderate",
        "Moderate discussions",
        "Hide, restore and delete posts, and handle reports.",
        ["discussion.read"],
      ),
    ],
  },
  {
    area: "certificates",
    label: "Certificates",
    entries: [
      entry(
        "certificate.issue",
        "Issue certificates",
        "Award a certificate to a learner.",
      ),
      entry(
        "certificate.revoke",
        "Revoke certificates",
        "Withdraw a certificate already issued.",
      ),
    ],
  },
  {
    area: "orders",
    label: "Orders and payments",
    entries: [
      entry(
        "billing.read",
        "View orders",
        "Open the Orders list, invoices and payment details.",
      ),
      entry(
        "billing.manage",
        "Manage orders",
        "Issue refunds and change orders.",
        ["billing.read"],
      ),
      entry(
        "refund.review",
        "Review refund requests",
        "Approve or reject refunds learners ask for.",
        ["billing.read"],
      ),
      entry(
        "payment.manual.verify",
        "Verify manual payments",
        "Confirm bank transfers and other offline payments.",
        ["billing.read"],
      ),
      entry(
        "payment.gateway.manage",
        "Manage payment gateway",
        "Connect and configure the payment provider.",
      ),
      entry(
        "bundle.manage",
        "Manage bundles",
        "Create and edit course bundles.",
        ["course.read"],
      ),
    ],
  },
  {
    area: "coupons",
    label: "Coupons",
    entries: [
      entry("coupon.read", "View coupons", "Open the Coupons list."),
      entry("coupon.manage", "Manage coupons", "Create and edit coupons.", [
        "coupon.read",
      ]),
      entry("coupon.delete", "Delete coupons", "Remove coupons.", [
        "coupon.read",
      ]),
    ],
  },
  {
    area: "analytics",
    label: "Analytics",
    entries: [
      entry(
        "analytics.course.read",
        "View course analytics",
        "See learner progress and engagement.",
      ),
      entry(
        "analytics.revenue.read",
        "View revenue analytics",
        "See sales and revenue reports.",
      ),
    ],
  },
  {
    area: "platform",
    label: "Platform",
    entries: [
      entry(
        "category.manage",
        "Manage categories",
        "Create, rename and remove course categories.",
      ),
      entry(
        "platform.settings.read",
        "View platform settings",
        "Open the Platform page.",
      ),
      entry(
        "platform.settings.update",
        "Change platform settings",
        "Change security, invoice and other platform settings.",
        ["platform.settings.read"],
      ),
      entry(
        "platform.branding.update",
        "Change branding",
        "Change the academy's name, logo and colours.",
        ["platform.settings.read"],
      ),
      entry(
        "platform.homepage.update",
        "Edit home page",
        "Change what the public home page shows.",
        ["platform.settings.read"],
      ),
    ],
  },
  {
    area: "team",
    label: "Team",
    entries: [
      entry("team.read", "View team", "See team members and invitations."),
      entry(
        "team.invite",
        "Invite people",
        "Invite or add people to the team by email.",
        ["team.read", "role.read"],
      ),
      entry("team.update", "Edit team members", "Change a member's details.", [
        "team.read",
      ]),
      entry(
        "team.remove",
        "Remove team members",
        "Take someone off the team.",
        ["team.read"],
      ),
      entry("role.read", "View roles", "See roles and what each one allows."),
      entry(
        "role.create",
        "Create roles",
        "Build new roles from permissions.",
        ["role.read"],
      ),
      entry(
        "role.update",
        "Edit roles",
        "Change a custom role's permissions.",
        ["role.read"],
      ),
      entry(
        "role.delete",
        "Delete roles",
        "Remove custom roles nobody holds.",
        ["role.read"],
      ),
      entry(
        "role.assign",
        "Assign roles",
        "Give or take away a member's roles.",
        ["role.read", "team.read"],
      ),
    ],
  },
];

const entriesByKey = new Map<Permission, PermissionCatalogueEntry>(
  permissionCatalogue.flatMap((group) =>
    group.entries.map((item) => [item.key, item] as const),
  ),
);

export function getPermissionCatalogueEntry(
  key: Permission,
): PermissionCatalogueEntry | undefined {
  return entriesByKey.get(key);
}

/** The keys plus everything they imply, followed transitively. */
export function withImpliedPermissions(
  keys: Iterable<Permission>,
): Set<Permission> {
  const result = new Set<Permission>();
  const pending = [...keys];
  while (pending.length > 0) {
    const key = pending.pop()!;
    if (result.has(key)) continue;
    result.add(key);
    pending.push(...(entriesByKey.get(key)?.implies ?? []));
  }
  return result;
}
