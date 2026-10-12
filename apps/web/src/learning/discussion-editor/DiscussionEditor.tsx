import { lazy, Suspense } from "react";
import type { DiscussionEditorProps } from "./DiscussionEditorImpl";

export type {
  DiscussionEditorController,
  DiscussionEditorProps,
} from "./DiscussionEditorImpl";

const DiscussionEditorImpl = lazy(() =>
  import("./DiscussionEditorImpl").then((module) => ({
    default: module.DiscussionEditorImpl,
  })),
);

export function DiscussionEditor(props: DiscussionEditorProps) {
  return (
    // The editor's code arrives after the composer has opened. Until then
    // its place is held at the size it will have (the caller's minimum
    // height), so the composer does not open short and then grow.
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className={`min-h-0 w-full ${props.className ?? ""}`}
        />
      }
    >
      <DiscussionEditorImpl {...props} />
    </Suspense>
  );
}
