import { useEffect, useState, type DragEvent } from "react";
import { suspendDragForAltTextSelect } from "../../courses/altDragTextSelect";

/** Marks a drag as a course on its way to being pinned to the home. */
const PIN_COURSE_DRAG_TYPE = "application/x-veolms-pin-course";
const PIN_COURSE_ATTRIBUTE = "data-pin-course-id";

/**
 * What a course card needs to be dragged onto the hero. The drag may start
 * on anything in the card (its picture and its links start drags of their
 * own), so the card is what the pointer is shown carrying.
 */
export function getPinCourseDragProps(courseId: string) {
  return {
    draggable: true,
    [PIN_COURSE_ATTRIBUTE]: courseId,
    // Alt-drag selects the card's text instead of carrying the card.
    onPointerDownCapture: suspendDragForAltTextSelect,
    onDragStart(event: DragEvent<HTMLElement>) {
      const card = event.currentTarget;
      const box = card.getBoundingClientRect();
      event.dataTransfer.setData(PIN_COURSE_DRAG_TYPE, courseId);
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setDragImage(
        card,
        event.clientX - box.left,
        event.clientY - box.top,
      );
    },
  };
}

/** The course a drop carries, when it is one of the learner's cards. */
export function readPinCourseDrop(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.getData(PIN_COURSE_DRAG_TYPE) || null;
}

/** The id of the course card being dragged right now, if one is. */
export function useDraggedPinCourseId() {
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const start = (event: globalThis.DragEvent) => {
      const card =
        event.target instanceof Element
          ? event.target.closest(`[${PIN_COURSE_ATTRIBUTE}]`)
          : null;
      setCourseId(card?.getAttribute(PIN_COURSE_ATTRIBUTE) ?? null);
    };
    const end = () => setCourseId(null);
    document.addEventListener("dragstart", start);
    document.addEventListener("dragend", end);
    document.addEventListener("drop", end);
    return () => {
      document.removeEventListener("dragstart", start);
      document.removeEventListener("dragend", end);
      document.removeEventListener("drop", end);
    };
  }, []);

  return courseId;
}
