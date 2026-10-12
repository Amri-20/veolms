import assert from "node:assert/strict";
import { test } from "node:test";

import { isOpenFreeCourse, isRestrictedFreeCourse } from "./course-openness.ts";

// Audit finding B2: a free course set to "restricted" was closed to anyone
// without a grant on every read path, but checkout still enrolled anyone who
// asked, and the enrolment was the grant.

const pricingTypes = ["free", "paid", null, undefined];

await test("a free course that is access-restricted cannot be self-enrolled", () => {
  assert.equal(
    isRestrictedFreeCourse({ pricing_type: "free", access_type: "restricted" }),
    true,
  );
});

await test("nor can a restricted course with no pricing row, which checkout would charge nothing for", () => {
  assert.equal(
    isRestrictedFreeCourse({
      pricing_type: undefined,
      access_type: "restricted",
    }),
    true,
  );
  assert.equal(
    isRestrictedFreeCourse({ pricing_type: null, access_type: "restricted" }),
    true,
  );
});

await test("a restricted course that is sold can be bought: buying it is how its grant is obtained", () => {
  assert.equal(
    isRestrictedFreeCourse({ pricing_type: "paid", access_type: "restricted" }),
    false,
  );
});

await test("a course open to everyone, or with no access rule, is never closed to self-enrolment", () => {
  for (const pricing_type of pricingTypes) {
    for (const access_type of ["everyone", null, undefined]) {
      assert.equal(
        isRestrictedFreeCourse({ pricing_type, access_type }),
        false,
        `pricing ${String(pricing_type)}, access ${String(access_type)}`,
      );
    }
  }
});

await test("no course is both open without a grant and closed to self-enrolment", () => {
  for (const pricing_type of pricingTypes) {
    for (const access_type of ["everyone", "restricted", null, undefined]) {
      const course = { pricing_type, access_type };
      assert.equal(
        isOpenFreeCourse(course) && isRestrictedFreeCourse(course),
        false,
        `pricing ${String(pricing_type)}, access ${String(access_type)}`,
      );
    }
  }
});

await test("a restricted free course is closed on both sides: not open to read, not open to enrol", () => {
  const course = { pricing_type: "free", access_type: "restricted" };
  assert.equal(isOpenFreeCourse(course), false);
  assert.equal(isRestrictedFreeCourse(course), true);
});
