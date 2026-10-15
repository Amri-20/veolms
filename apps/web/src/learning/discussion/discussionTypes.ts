import React from "react";
import type { InteractionCapabilities } from "../discussionFeed";
import type {
  DiscussionDraft,
  DiscussionEntryKind,
  DiscussionVisibility,
} from "../discussion-editor/types";

export interface DiscussionProps {
  persistenceKey: string;
  courseSlug?: string;
  courseId?: string;
  lessonId?: string;
  mobileLessonHeader?: React.ReactNode;
  mobileBottomNavigation?: boolean;
  mobileBottomNavigationHidden?: boolean;
  lessonDescription?: string | null;
  isLessonDescriptionLoading?: boolean;
  interactionCapabilities?: InteractionCapabilities;
  isInteractionCapabilitiesLoading?: boolean;
  lessonContentAccess: LessonContentAccessState;
  lessonContentAccessReason?: "login" | "access" | null;
  /** Resolved by LearningWorkspace; Discussion must not recalculate access. */
  canParticipate?: boolean;
  participationState?: LessonParticipationState;
  participationActionLabel?: string;
  onParticipationAction?: () => void;
  isThreadDeepLinkReady?: boolean;
  noteDeepLinkId?: string | null;
  onSeekToTimestamp?: (seconds: number) => void;
}

export type LessonContentAccessState = "pending" | "granted" | "denied";
export type LessonParticipationState = "pending" | "granted" | "denied";

export interface EditingEntry {
  id: string | number;
  draft: DiscussionDraft;
  entryKind: DiscussionEntryKind;
  visibility: DiscussionVisibility;
}

export interface OpenDiscussionThread {
  id: string | number;
  focusComposer: boolean;
}
