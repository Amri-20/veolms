import { ArrowsInLineVertical } from "@phosphor-icons/react/ArrowsInLineVertical";
import { ArrowsOutLineVertical } from "@phosphor-icons/react/ArrowsOutLineVertical";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { Circle } from "@phosphor-icons/react/Circle";
import { FileText } from "@phosphor-icons/react/FileText";
import { PlayCircle } from "@phosphor-icons/react/PlayCircle";
import { Question } from "@phosphor-icons/react/Question";
import type { CourseSection } from "../../learning/courseContent";
import { formatDuration } from "../courseAdapter";
import { VirtualizedLessonList } from "../curriculum/VirtualizedLessonList";

const NO_PINNED_LESSONS: ReadonlySet<string> = new Set();
const getOverviewLessonKey = (lesson: CourseSection["lessons"][number]) =>
  String(lesson[0]);

const hairline = "border-[color-mix(in_srgb,var(--text)_8%,transparent)]";

function parseDurationLabel(label: string): number {
  const hours = Number(label.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(label.match(/(\d+)m/)?.[1] ?? 0);
  return hours * 3600 + minutes * 60;
}

interface CurriculumSectionRowProps {
  section: CourseSection;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelectLesson?: (lessonNumber: number) => void;
  shouldVirtualizeLessons?: boolean;
  isReadOnlyPreview?: boolean;
  isPaidCourse?: boolean;
}

/**
 * One section: a row across the card that opens its lessons underneath.
 * `data-fixed-radius` keeps the rows square; the radius preference rounds
 * every list item and button on this page otherwise, and these run edge to
 * edge inside the card.
 */
function CurriculumSectionRow({
  section,
  index,
  isOpen,
  onToggle,
  onSelectLesson,
  shouldVirtualizeLessons = false,
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

  return (
    <div role="listitem" data-fixed-radius>
      <button
        id={buttonId}
        type="button"
        data-fixed-radius
        className="flex min-h-15 w-full cursor-pointer items-center gap-3.5 border-0 bg-transparent px-4 py-3 text-left text-(--text) transition-colors duration-140 hover:bg-(--hover) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--accent) @2xl/curriculum:px-6"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-(--accent) text-[0.84rem] font-bold text-(--on-accent,#ffffff)"
          aria-hidden="true"
        >
          {index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 @xl/curriculum:flex-row @xl/curriculum:items-center @xl/curriculum:gap-4">
          <span className="min-w-0 flex-1 text-[0.95rem] font-semibold">
            {section.title}
          </span>
          <span className="shrink-0 text-[0.82rem] font-normal text-(--muted)">
            {lessonCount} Lesson{lessonCount === 1 ? "" : "s"}
            {durationLabel ? ` • ${durationLabel}` : ""}
          </span>
        </span>
        <span
          className={`inline-flex shrink-0 items-center justify-center text-(--muted) transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <CaretDown size={17} weight="bold" />
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        className={`grid motion-reduce:transition-none ${
          isOpen
            ? "visible grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity,visibility] duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "invisible grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity,visibility] duration-250 ease-[cubic-bezier(0,1,0,1)]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t ${hairline} bg-[color-mix(in_srgb,var(--surface)_95%,var(--text))] py-1`}
          >
            {section.lessons.length > 0 ? (
              isOpen ? (
                <VirtualizedLessonList
                  items={section.lessons}
                  forceVirtualized={shouldVirtualizeLessons}
                  estimatedItemSize={46}
                  itemGap={0}
                  overscan={14}
                  getItemKey={getOverviewLessonKey}
                  pinnedItemIds={NO_PINNED_LESSONS}
                  renderItem={([
                    number,
                    title,
                    duration,
                    status,
                    isPreview,
                    contentType,
                  ]) => {
                    const isDoc = contentType === "document";
                    const isQuiz = contentType === "quiz";
                    return (
                      <button
                        type="button"
                        data-fixed-radius
                        className={`group/lesson flex min-h-11.5 w-full items-center gap-3 border-0 bg-transparent py-1.5 pr-4 pl-5 text-left text-[0.85rem] text-(--text-secondary) transition-colors duration-140 @2xl/curriculum:pr-6 @2xl/curriculum:pl-16.5 ${
                          isReadOnlyPreview
                            ? "cursor-default opacity-85 hover:bg-transparent hover:text-(--text-secondary)"
                            : "cursor-pointer hover:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none focus-visible:ring-inset"
                        }`}
                        key={number}
                        disabled={isReadOnlyPreview}
                        onClick={() => {
                          if (isReadOnlyPreview) return;
                          onSelectLesson?.(number);
                        }}
                      >
                        {/* The row is named by what it shows, with the lesson
                            number added for screen readers. A separate
                            aria-label used to replace the visible text with
                            wording of its own ("Lesson 1: Title, 12:30"),
                            which voice control cannot match to what is on
                            screen and which left the "Free" badge out. */}
                        <span className="sr-only">{`Lesson ${number}: `}</span>
                        <span
                          className={`inline-flex w-5 shrink-0 items-center justify-center text-(--muted) transition-colors duration-140 ${
                            isReadOnlyPreview
                              ? ""
                              : "group-hover/lesson:text-(--accent)"
                          }`}
                          aria-hidden="true"
                        >
                          {isDoc ? (
                            <FileText size={16} weight="regular" />
                          ) : isQuiz ? (
                            <Question size={16} weight="regular" />
                          ) : (
                            <PlayCircle size={16} weight="regular" />
                          )}
                        </span>

                        <span className="min-w-0 flex-1 overflow-hidden text-[0.85rem] text-ellipsis whitespace-nowrap text-(--text-secondary)">
                          {title}
                        </span>

                        {duration ? (
                          <span className="w-11.25 shrink-0 text-right text-[0.78rem] text-(--muted)">
                            {duration}
                          </span>
                        ) : null}

                        {/* Free preview badge: only on a paid course, for a
                            lesson marked as a free preview. */}
                        {isPaidCourse && isPreview ? (
                          <span
                            className="inline-flex shrink-0 items-center rounded-[5px] border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-1.5 py-0.5 text-[0.7rem] leading-none font-bold text-(--accent)"
                            aria-label="Free preview"
                          >
                            Free
                          </span>
                        ) : null}

                        {status === "done" ? (
                          <span
                            className="inline-flex shrink-0 items-center justify-center"
                            aria-hidden="true"
                          >
                            <CheckCircle
                              size={16}
                              weight="fill"
                              className="text-[#10b981]"
                            />
                          </span>
                        ) : status === "todo" ? (
                          <span
                            className="inline-flex shrink-0 items-center justify-center"
                            aria-hidden="true"
                          >
                            <Circle size={16} className="text-(--muted)" />
                          </span>
                        ) : null}
                      </button>
                    );
                  }}
                />
              ) : null
            ) : (
              <div className="px-4 py-3 text-[0.82rem] text-(--muted) italic @2xl/curriculum:pl-16.5">
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
  courseSections: CourseSection[];
  openSections: Set<number>;
  onToggleSection: (index: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelectLesson?: (lessonNumber: number) => void;
  isReadOnlyPreview?: boolean;
  isPaidCourse?: boolean;
}

export function CourseOverviewCurriculum({
  sectionCount,
  lessonCount,
  courseSections,
  openSections,
  onToggleSection,
  onExpandAll,
  onCollapseAll,
  onSelectLesson,
  isReadOnlyPreview = false,
  isPaidCourse = false,
}: CourseOverviewCurriculumProps) {
  const allSectionsExpanded =
    courseSections.length > 0 && openSections.size === courseSections.length;
  const ToggleAllIcon = allSectionsExpanded
    ? ArrowsInLineVertical
    : ArrowsOutLineVertical;

  return (
    <section
      className="@container/curriculum overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-(--surface) shadow-(--card-shadow)"
      aria-labelledby="cov-curriculum-heading"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4.5 @2xl/curriculum:px-6">
        <div className="min-w-0">
          <h2
            id="cov-curriculum-heading"
            className="m-0 text-[1.24rem] font-bold tracking-[-0.015em] text-(--text)"
          >
            Course curriculum
          </h2>
          <p className="m-0 mt-1.5 text-[0.86rem] text-(--muted)">
            {sectionCount} Section{sectionCount === 1 ? "" : "s"} &bull;{" "}
            {lessonCount} Lesson{lessonCount === 1 ? "" : "s"}
          </p>
        </div>
        {courseSections.length > 0 ? (
          <button
            type="button"
            className="inline-flex h-9.5 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-transparent px-3 text-[0.88rem] font-semibold text-(--accent-ink,var(--accent)) transition-colors duration-140 hover:bg-(--hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
            onClick={allSectionsExpanded ? onCollapseAll : onExpandAll}
          >
            <span>{allSectionsExpanded ? "Collapse all" : "Expand all"}</span>
            <ToggleAllIcon size={17} weight="bold" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {courseSections.length === 0 ? (
        <div
          className={`border-t ${hairline} p-8 text-center text-[0.88rem] text-(--muted) italic`}
        >
          No sections added yet
        </div>
      ) : (
        <div
          className={`flex flex-col divide-y border-t ${hairline} divide-[color-mix(in_srgb,var(--text)_8%,transparent)]`}
          role="list"
        >
          {courseSections.map((section, index) => (
            <CurriculumSectionRow
              key={section.id}
              section={section}
              index={index}
              isOpen={openSections.has(index)}
              onToggle={() => onToggleSection(index)}
              onSelectLesson={onSelectLesson}
              shouldVirtualizeLessons={lessonCount >= 80}
              isReadOnlyPreview={isReadOnlyPreview}
              isPaidCourse={isPaidCourse}
            />
          ))}
        </div>
      )}
    </section>
  );
}
