/**
 * Where a drag of the course content's gutter puts the width it has reached.
 *
 * The page's own width lives on the document (`--learning-curriculum-width`),
 * where every element inherits it, so changing it there re-styles the whole
 * page. Done on every frame of a drag, that was most of each frame's work and
 * the drag could not keep up with the pointer. A drag therefore leaves the
 * document's value alone and writes the width onto the few elements that are
 * sized from it, as properties that are not inherited (they are registered in
 * learning-split-layout.css, which also says how each element uses them).
 * Each write then re-styles those elements and nothing else.
 */
const DRAG_WIDTH_PROPERTY = "--learning-curriculum-drag-width";
const DRAG_CONTENT_WIDTH_PROPERTY = "--learning-curriculum-drag-content-width";
/**
 * On the shell and its frame for as long as a drag has a width on them: the
 * stylesheet asks them whether the edge is being dragged, and without this
 * has to look through the whole page for the answer each time it does.
 */
const DRAGGING_ATTRIBUTE = "data-learning-split-dragging";

export interface CurriculumDragWidth {
  /** How wide the course content is while the pointer is held. */
  previewWidth: number;
  /** The width its content is laid out at; never under the minimum. */
  expandedWidth: number;
}

/**
 * The elements sized from the course content's width: the shell (whose
 * overlay is the content's shadow), the frame that is the lesson card, the
 * lesson, and the content's own pane. Then the content inside that pane.
 * Looked up child by child, so a move of the pointer does not search the
 * lesson for them.
 */
function findSized(workspace: HTMLElement) {
  const lesson = workspace.querySelector<HTMLElement>(
    ":scope > .learning-workspace__main",
  );
  const pane =
    lesson?.querySelector<HTMLElement>(
      ":scope > .learning-workspace__curriculum-clip",
    ) ?? null;
  return {
    byWidth: [
      workspace.closest<HTMLElement>(".courses-app"),
      workspace.closest<HTMLElement>(".courses-main-frame"),
      lesson,
      pane,
    ],
    content:
      pane?.querySelector<HTMLElement>(
        ".learning-curriculum__viewport > .learning-curriculum",
      ) ?? null,
  };
}

export function applyCurriculumDragWidth(
  workspace: HTMLElement,
  { previewWidth, expandedWidth }: CurriculumDragWidth,
) {
  const { byWidth, content } = findSized(workspace);
  const width = `${previewWidth}px`;
  const [shell, frame] = byWidth;
  for (const element of [shell, frame]) {
    if (element && !element.hasAttribute(DRAGGING_ATTRIBUTE)) {
      element.setAttribute(DRAGGING_ATTRIBUTE, "");
    }
  }
  for (const element of byWidth) {
    element?.style.setProperty(DRAG_WIDTH_PROPERTY, width);
  }
  content?.style.setProperty(DRAG_CONTENT_WIDTH_PROPERTY, `${expandedWidth}px`);
}

/** Hands the width back to the document's own value. */
export function clearCurriculumDragWidth(workspace: HTMLElement) {
  const { byWidth, content } = findSized(workspace);
  for (const element of byWidth) {
    element?.style.removeProperty(DRAG_WIDTH_PROPERTY);
    element?.removeAttribute(DRAGGING_ATTRIBUTE);
  }
  content?.style.removeProperty(DRAG_CONTENT_WIDTH_PROPERTY);
}
