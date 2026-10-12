import type { EnrolledCourse } from "@veolms/contracts";
import { useEffect, useMemo, useState } from "react";
import type { NavigateTo } from "../../routing/navigation";
import { getCoursePlayerPath } from "../../learning/coursePlayerNavigation";
import { useCourses } from "../../services/courses";
import { useLearningSummary } from "../../services/learning-goals";
import { useLearningProgressResumeContext } from "../../services/learning-progress";
import {
  adaptEnrolledCourseToLearningCourse,
  type LearningCourse,
} from "../../StudentPages";
import {
  GuestHomeCourseSection,
  type GuestHomeCourseCardActions,
} from "../guest/GuestHomeCourseSection";
import { GUEST_HOME_COURSES_PER_SECTION } from "../guestHomeLimits";
import { getHomeTimeGreeting } from "../homeGreeting";
import { LearnerCoursesSection } from "./LearnerCoursesSection";
import {
  LearnerCoursesSubtitle,
  rememberLearnerStarted,
} from "./learnerCoursesSubtitle";
import { LearnerGoalScreen } from "./LearnerGoalScreen";
import { LearnerHeroPinDrop } from "./LearnerHeroPinDrop";
import { LearnerHomeHero } from "./LearnerHomeHero";
import {
  LearnerCoursesSkeleton,
  LearnerResumeRowSkeleton,
  learnerHomeBodyClasses,
  learnerHomePageClasses,
} from "./LearnerHomeSkeleton";
import { LearnerResumeRow } from "./LearnerResumeRow";
import { useDraggedPinCourseId } from "./pinCourseDrag";
import { pinHomeCourse, usePinnedHomeCourseId } from "./pinnedHomeCourse";
import {
  getEnrolledCourseKey,
  planLearnerHome,
  selectCoursesToExplore,
} from "./learnerHomePlan";
import "../guest/guest-home-shell.css";

/**
 * A learner with this many courses or more has enough of their own on the
 * page; with fewer, a row of courses they have not enrolled in fills it out.
 */
const EXPLORE_BELOW_ENROLLED_COUNT = 3;

const NO_COURSES: readonly EnrolledCourse[] = [];

const getCoursePlayerHref = (course: EnrolledCourse) =>
  `/learn/${encodeURIComponent(getEnrolledCourseKey(course))}`;

/**
 * The home of a learner who is enrolled in at least one course: the hero
 * leads with the course to carry on with (or to start, when nothing has
 * been started yet) and shows their learning goals on the laptop in the
 * picture; their other courses follow.
 *
 * It is on the page before the courses are known. Until then the picture,
 * the date, the greeting, the quote and the list's heading are all there,
 * and only the course's row and the cards are placeholders; they give way
 * in place when the courses arrive, and nothing else is drawn again.
 */
export function LearnerHome({
  enrolledCourses: knownCourses,
  sessionPending = false,
  learnerName,
  courseCardActions,
  onOpenCourse,
  onNavigatePage,
}: {
  /** The learner's courses, once they are known. */
  enrolledCourses: readonly EnrolledCourse[] | undefined;
  /**
   * The session has not answered yet, so nothing of the learner's own may be
   * asked for.
   */
  sessionPending?: boolean;
  /** The learner's display name; it may be empty. */
  learnerName: string;
  /** What the cards of courses to explore need from the page shell. */
  courseCardActions: GuestHomeCourseCardActions;
  onOpenCourse: (course: LearningCourse) => void;
  onNavigatePage: NavigateTo;
}) {
  const enrolledCourses = knownCourses ?? NO_COURSES;
  const pinnedCourseId = usePinnedHomeCourseId();
  const draggedCourseId = useDraggedPinCourseId();
  const plan = useMemo(
    () => planLearnerHome(enrolledCourses, pinnedCourseId),
    [enrolledCourses, pinnedCourseId],
  );
  const heroCourse = plan?.heroCourse;
  const heroCourseKey = heroCourse ? getEnrolledCourseKey(heroCourse) : "";

  const resumeQuery = useLearningProgressResumeContext(heroCourseKey, {
    enabled: Boolean(heroCourse),
  });
  // A course that has just taken the lead must not show the lesson of the
  // one before it while its own is on the way.
  const resumeContext =
    resumeQuery.data && resumeQuery.data.courseId === heroCourse?.courseId
      ? resumeQuery.data
      : null;

  const summaryQuery = useLearningSummary({ enabled: !sessionPending });

  const showExplore =
    Boolean(knownCourses) &&
    enrolledCourses.length < EXPLORE_BELOW_ENROLLED_COUNT;
  const publishedQuery = useCourses({ enabled: showExplore });
  const coursesToExplore = useMemo(
    () =>
      selectCoursesToExplore(
        publishedQuery.data?.courses ?? [],
        enrolledCourses,
      ).slice(0, GUEST_HOME_COURSES_PER_SECTION),
    [enrolledCourses, publishedQuery.data?.courses],
  );

  // The clock is read once, when the page opens: the page is only ever
  // rendered in the browser, for a learner who is signed in.
  const [timeGreeting] = useState(() =>
    getHomeTimeGreeting(new Date().getHours()),
  );
  const firstName = learnerName.trim().split(/\s+/u)[0] ?? "";

  const coursesKnown = Boolean(knownCourses);
  const anythingStarted = enrolledCourses.some(
    (course) => (course.progress ?? 0) > 0,
  );
  useEffect(() => {
    if (coursesKnown) rememberLearnerStarted(anythingStarted);
  }, [anythingStarted, coursesKnown]);

  const laptopScreen = (
    <LearnerGoalScreen
      summary={summaryQuery.data}
      isLoading={sessionPending || summaryQuery.isLoading}
      onSetGoal={() => onNavigatePage("/settings/learning")}
    />
  );

  if (!knownCourses) {
    return (
      <div className={learnerHomePageClasses}>
        <LearnerHomeHero
          timeGreeting={timeGreeting}
          firstName={firstName}
          namePending={sessionPending}
          resumeRow={<LearnerResumeRowSkeleton />}
          laptopScreen={laptopScreen}
        />
        <div className={learnerHomeBodyClasses}>
          <LearnerCoursesSkeleton />
        </div>
      </div>
    );
  }

  if (!plan || !heroCourse) return null;

  const openCourse = (course: EnrolledCourse) =>
    onOpenCourse(adaptEnrolledCourseToLearningCourse(course));
  // The hero's card names the lesson to carry on with, so that is the one
  // it opens. Opening the course without naming a lesson lands on whichever
  // one this browser last remembered, or the first on a new device. A
  // finished course has no lesson to carry on with and is opened as a whole.
  const heroLesson =
    plan.intent === "review" ? null : resumeContext?.resumeLesson;
  const heroLessonPath =
    resumeContext && heroLesson
      ? getCoursePlayerPath(resumeContext.courseSlug, heroLesson.lessonNumber)
      : null;
  const nothingStarted = !anythingStarted;
  // The pinned course takes the hero's place at the top of the page, so the
  // learner is taken there to see it happen.
  const pinCourse = (course: EnrolledCourse) => {
    pinHomeCourse(course.courseId);
    document.getElementById("learner-home-hero-title")?.scrollIntoView({
      block: "center",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div className={learnerHomePageClasses}>
      <LearnerHomeHero
        timeGreeting={timeGreeting}
        firstName={firstName}
        namePending={false}
        resumeRow={
          <LearnerResumeRow
            course={heroCourse}
            intent={plan.intent}
            resume={{
              context: resumeContext,
              isLoading: resumeQuery.isLoading,
            }}
            pinned={plan.heroPinned}
            onUnpin={() => pinHomeCourse(null)}
            onNavigatePage={onNavigatePage}
            href={heroLessonPath ?? getCoursePlayerHref(heroCourse)}
            onOpen={() =>
              heroLessonPath
                ? onNavigatePage(heroLessonPath)
                : openCourse(heroCourse)
            }
            // A course card dragged from the list below is pinned by
            // dropping it on the hero's own course card.
            pinDrop={
              draggedCourseId ? (
                <LearnerHeroPinDrop onPin={pinHomeCourse} />
              ) : null
            }
          />
        }
        laptopScreen={laptopScreen}
      />

      <div className={learnerHomeBodyClasses}>
        <LearnerCoursesSection
          courses={plan.courses}
          subtitle={<LearnerCoursesSubtitle started={!nothingStarted} />}
          courseMenu={courseCardActions.courseMenu}
          setCourseMenu={courseCardActions.setCourseMenu}
          getCourseHref={getCoursePlayerHref}
          onOpenCourse={openCourse}
          pinnedCourseId={plan.heroPinned ? heroCourse.courseId : null}
          onPinCourse={pinCourse}
          onUnpinCourse={() => pinHomeCourse(null)}
          onNavigatePage={onNavigatePage}
        />

        {showExplore &&
        (publishedQuery.isLoading ||
          publishedQuery.isError ||
          coursesToExplore.length > 0) ? (
          <GuestHomeCourseSection
            id="learner-home-explore-courses"
            title="Explore More Courses"
            subtitle="Find what you want to learn next."
            courses={coursesToExplore}
            viewAllHref="/courses/not-enrolled"
            cardActions={courseCardActions}
            isLoading={publishedQuery.isLoading}
            // A failed load used to be passed on as "no error", and the
            // section was left out altogether: nothing said the courses had
            // failed to load and the retry below could never be reached.
            isError={publishedQuery.isError && coursesToExplore.length === 0}
            onRetry={() => void publishedQuery.refetch()}
            onNavigatePage={onNavigatePage}
          />
        ) : null}
      </div>
    </div>
  );
}
