import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { FileText } from "@phosphor-icons/react/FileText";
import { PencilSimple } from "@phosphor-icons/react/PencilSimple";
import { PlayCircle } from "@phosphor-icons/react/PlayCircle";
import { Question } from "@phosphor-icons/react/Question";
import { useDeferredValue, useState } from "react";
import type { CourseSection } from "../../learning/courseContent";
import { formatDuration } from "../courseAdapter";
import { useContinuousLessonNumbering } from "../../learning/useContinuousLessonNumbering";
import {
  bandHeaderClasses,
  bandLinkClasses,
  bandSubtitleClasses,
  bandTitleClasses,
  overviewCardClasses,
  overviewCardPaddingClasses,
} from "./overviewStyles";

/** A lesson row's height: one line of title in a row 42px tall. */
const LESSON_ROW_HEIGHT = 42;

function parseDurationLabel(label: string): number {
  const hours = Number(label.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(label.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 3600 + minutes * 60;
}

interface CurriculumSectionRowProps {
  section: CourseSection;
  index: number;
  isOpen: boolean;
  /**
   * False when every section was opened or shut at once: two dozen panels
   * growing together lay the whole page out again on every frame, so they
   * change in one step instead.
   */
  animate: boolean;
  onToggle: () => void;
  onSelectLesson?: (lessonNumber: number) => void;
  isReadOnlyPreview?: boolean;
  isPaidCourse?: boolean;
}

/**
 * One section of the outline: its numbered title and facts on a row that
 * opens its lessons underneath. The row has no box of its own; under the
 * pointer it lights up as a rounded strip. The lessons start at the same
 * left edge as the title. Sections are parted by hairlines.
 */
function CurriculumSectionRow({
  section,
  index,
  isOpen,
  animate,
  onToggle,
  onSelectLesson,
  isReadOnlyPreview = false,
  isPaidCourse = false,
}: CurriculumSectionRowProps) {
  const panelId = `cov-section-panel-${section.id}`;
  const buttonId = `cov-section-toggle-${section.id}`;
  const lessonCount = section.lessons.length;
  const durationSeconds = section.lessons.reduce(
    (total, lesson) => total + parseDurationLabel(lesson[2]),
    0,
  );
  const durationLabel =
    durationSeconds > 0 ? formatDuration(durationSeconds) : "";
  const doneCount = section.lessons.filter(
    (lesson) => lesson[3] === "done",
  ).length;
  const sectionDone = lessonCount > 0 && doneCount === lessonCount;
  // The section opens at once, at its full height, and its lessons are
  // drawn straight after as lower-priority work: the click is answered in
  // the next frame however many sections open with it ("Expand all" opens
  // them all).
  //
  // Every lesson of an open section is in the page: no virtual list, and
  // nothing held back until the section is near the screen. Both left gaps
  // while scrolling, when the page moved faster than the rows could be put
  // back. A course's lessons are single-line rows (hundreds, not tens of
  // thousands), which a browser scrolls without help. What keeps a fully
  // expanded course cheap is `content-visibility` on each section's list
  // (see below): the browser itself skips the layout and painting of the
  // lists that are off screen, and does them, within the same frame, when
  // they come into view.
  const lessonsShown = useDeferredValue(isOpen) && isOpen;
  // The learning page's numbering: every section starts again at 1, or the
  // lessons are numbered straight through the course when the learner has
  // chosen that. A lesson's own number is its place in the course.
  const continuousLessonNumbering = useContinuousLessonNumbering();
  const lessonNumberBase = continuousLessonNumbering
    ? 0
    : (section.lessons[0]?.[0] ?? 1) - 1;

  return (
    <div role="listitem" data-fixed-radius>
      <button
        id={buttonId}
        type="button"
        className="group/section -mx-3 flex w-[calc(100%+1.5rem)] cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-3 py-3.5 text-left text-(--text) transition-colors duration-140 hover:bg-(--hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent)"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 @xl/curriculum:flex-row @xl/curriculum:items-baseline @xl/curriculum:gap-4">
          <span className="min-w-0 flex-1 text-[0.98rem] leading-snug font-semibold">
            {index + 1}. {section.title}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.82rem] font-normal text-(--muted) tabular-nums">
            {sectionDone ? (
              <CheckCircle
                size={15}
                weight="fill"
                className="text-emerald-500"
                aria-label="All lessons done"
              />
            ) : doneCount > 0 ? (
              <span>
                {doneCount}/{lessonCount} done
              </span>
            ) : (
              <span>
                {lessonCount} Lesson{lessonCount === 1 ? "" : "s"}
              </span>
            )}
            {durationLabel ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{durationLabel}</span>
              </>
            ) : null}
          </span>
        </span>
        <span
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-(--muted) transition-[transform,background-color,color] duration-200 ease-out group-hover/section:text-(--text) motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <CaretDown size={16} weight="bold" />
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        className={`grid motion-reduce:transition-none ${
          animate
            ? "transition-[grid-template-rows,opacity,visibility]"
            : "transition-none"
        } ${
          isOpen
            ? "visible grid-rows-[1fr] opacity-100 duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "invisible grid-rows-[0fr] opacity-0 duration-250 ease-[cubic-bezier(0,1,0,1)]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {/* Each lesson is a rounded row with room on both sides, kept
              inside the column: this box clips anything that bleeds out. */}
          <div
            className="mb-2 [content-visibility:auto]"
            // The lessons' room is held before they are drawn, while the
            // section shuts after they are gone, and while the browser
            // skips the list off screen (`contain-intrinsic-size` is the
            // height it assumes for a list it has not laid out).
            style={{
              minHeight: lessonCount * LESSON_ROW_HEIGHT,
              containIntrinsicSize: `auto ${lessonCount * LESSON_ROW_HEIGHT}px`,
            }}
          >
            {section.lessons.length > 0 ? (
              lessonsShown ? (
                section.lessons.map(
                  ([
                    number,
                    title,
                    duration,
                    status,
                    isPreview,
                    contentType,
                  ]) => {
                    const isDoc = contentType === "document";
                    const isQuiz = contentType === "quiz";
                    const isDone = status === "done";
                    return (
                      <button
                        type="button"
                        data-fixed-radius
                        className={`group/lesson flex min-h-10.5 w-full items-center gap-3 rounded-xl border-0 bg-transparent px-3 py-1.5 text-left text-[0.88rem] transition-colors duration-140 ${
                          isDone ? "text-(--muted)" : "text-(--text-secondary)"
                        } ${
                          isReadOnlyPreview
                            ? "cursor-default"
                            : "cursor-pointer hover:bg-(--hover) hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none focus-visible:ring-inset"
                        }`}
                        key={number}
                        disabled={isReadOnlyPreview}
                        onClick={() => {
                          if (isReadOnlyPreview) return;
                          onSelectLesson?.(number);
                        }}
                      >
                        <span
                          className={`inline-flex w-5 shrink-0 items-center justify-start transition-colors duration-140 ${
                            isDone
                              ? "text-emerald-500"
                              : isReadOnlyPreview
                                ? "text-(--muted)"
                                : "text-(--muted) group-hover/lesson:text-(--accent)"
                          }`}
                          aria-hidden="true"
                        >
                          {isDone ? (
                            <CheckCircle size={17} weight="fill" />
                          ) : isDoc ? (
                            <FileText size={17} weight="regular" />
                          ) : isQuiz ? (
                            <Question size={17} weight="regular" />
                          ) : (
                            <PlayCircle size={17} weight="regular" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {/* Numbered as on the learning page. */}
                          {number - lessonNumberBase}. {title}
                        </span>

                        {/* Free preview: only on a paid course, for a lesson
                            marked as one. */}
                        {isPaidCourse && isPreview ? (
                          <span
                            className="inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2 py-0.5 text-[0.7rem] leading-none font-bold text-(--accent-ink,var(--accent))"
                            aria-label="Free preview"
                          >
                            Free
                          </span>
                        ) : null}

                        {isDone ? (
                          <span className="sr-only">, done</span>
                        ) : null}

                        {duration ? (
                          <span className="w-11.25 shrink-0 text-right text-[0.78rem] text-(--muted) tabular-nums">
                            {duration}
                          </span>
                        ) : null}
                      </button>
                    );
                  },
                )
              ) : null
            ) : (
              <div className="px-3 py-2 text-[0.84rem] text-(--muted) italic">
                No lessons added yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CourseOverviewCurriculumProps {
  sectionCount: number;
  lessonCount: number;
  duration?: string;
  courseSections: CourseSection[];
  openSections: Set<number>;
  onToggleSection: (index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectLesson?: (lessonNumber: number) => void;
  isReadOnlyPreview?: boolean;
  isPaidCourse?: boolean;
  /** For someone who manages the course: opens the curriculum editor. */
  onEdit?: () => void;
}

export function CourseOverviewCurriculum({
  sectionCount,
  lessonCount,
  duration,
  courseSections,
  openSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onSelectLesson,
  isReadOnlyPreview = false,
  isPaidCourse = false,
  onEdit,
}: CourseOverviewCurriculumProps) {
  const allSectionsExpanded =
    courseSections.length > 0 && openSections.size === courseSections.length;
  // Whether the last change was to every section at once (see `animate`).
  const [changedTogether, setChangedTogether] = useState(false);

  return (
    <section
      className={`@container/curriculum ${overviewCardClasses} ${overviewCardPaddingClasses}`}
      aria-labelledby="cov-curriculum-heading"
      data-fixed-radius
    >
      <div className={bandHeaderClasses}>
        <div className="min-w-0">
          <h2 id="cov-curriculum-heading" className={bandTitleClasses}>
            Curriculum
          </h2>
          <p className={bandSubtitleClasses}>
            {sectionCount} section{sectionCount === 1 ? "" : "s"} &middot;{" "}
            {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
            {duration ? <> &middot; {duration}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-5">
          {onEdit ? (
            <button type="button" className={bandLinkClasses} onClick={onEdit}>
              <PencilSimple size={15} weight="bold" aria-hidden="true" />
              <span>Edit curriculum</span>
            </button>
          ) : null}
          {courseSections.length > 0 ? (
            <button
              type="button"
              className={bandLinkClasses}
              onClick={() => {
                setChangedTogether(true);
                if (allSectionsExpanded) onCollapseAll();
                else onExpandAll();
              }}
            >
              {allSectionsExpanded ? "Collapse all" : "Expand all"}
            </button>
          ) : null}
        </div>
      </div>

      {courseSections.length === 0 ? (
        <div className="mt-2 py-10 text-center text-[0.9rem] text-(--muted)">
          No sections added yet
        </div>
      ) : (
        <div
          className="mt-2 flex flex-col divide-y divide-[color-mix(in_srgb,var(--text)_9%,transparent)]"
          role="list"
        >
          {courseSections.map((section, index) => (
            <CurriculumSectionRow
              key={section.id}
              section={section}
              index={index}
              isOpen={openSections.has(index)}
              animate={!changedTogether}
              onToggle={() => {
                setChangedTogether(false);
                onToggleSection(index);
              }}
              onSelectLesson={onSelectLesson}
              isReadOnlyPreview={isReadOnlyPreview}
              isPaidCourse={isPaidCourse}
            />
          ))}
        </div>
      )}
    </section>
  );
}
