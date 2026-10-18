import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { BookOpenIcon as BookOpen } from "@phosphor-icons/react/BookOpen";
import { CaretRightIcon as CaretRight } from "@phosphor-icons/react/CaretRight";
import { ChatCircleIcon as ChatCircle } from "@phosphor-icons/react/ChatCircle";
import { PaperclipIcon as Paperclip } from "@phosphor-icons/react/Paperclip";
import { ThumbsUpIcon as ThumbsUp } from "@phosphor-icons/react/ThumbsUp";
import { DiscussionAvatar } from "../learning/DiscussionAvatar";
import type { NavigateTo } from "../routing/navigation";
import { DiscussionWorkspaceActionMenu } from "./DiscussionWorkspaceActionMenu";
import { useDiscussionWorkspaceCardLongPress } from "./useDiscussionWorkspaceCardLongPress";
import type { DiscussionWorkspaceCard } from "./discussions-workspace.adapter";
import { useDiscussionWorkspaceCardActions } from "./useDiscussionWorkspaceCardActions";

/** What the row's small label says next to the time, if anything. */
function getKindLabel(card: DiscussionWorkspaceCard): string | null {
  if (card.itemType === "note" || card.kind === "note") return "Note";
  if (card.itemType === "reply") return "Reply";
  if (card.kind === "question" || card.kind === "qna") {
    if (card.status === "solved") return "Q&A · Solved";
    if (card.status === "answered") return "Q&A · Answered";
    return "Q&A";
  }
  return null;
}

export function getDiscussionAttachmentLabel(
  summary: DiscussionWorkspaceCard["attachmentSummary"],
): string | null {
  if (summary.count === 0) return null;
  if (summary.count > 1) return `${summary.count} attachments`;
  if (summary.hasImages && !summary.hasVideos && !summary.hasFiles)
    return "1 image";
  if (summary.hasVideos && !summary.hasImages && !summary.hasFiles)
    return "1 video";
  if (summary.hasFiles && !summary.hasImages && !summary.hasVideos)
    return "1 file";
  return "1 attachment";
}

/** Small text buttons under a post: Like, Reply. */
export function DiscussionRowAction({
  icon,
  label,
  pressed,
  onClick,
  ariaLabel,
}: {
  icon: ReactNode;
  label: ReactNode;
  pressed?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-(--accent) ${
        pressed
          ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-(--accent)"
          : "text-(--muted) hover:bg-(--hover) hover:text-(--text)"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * One discussion on the Discussions page: a flat row in a list split by thin
 * lines. Pressing it opens the discussion beside the list; its course and
 * lesson, and its menu, lead to the lesson itself.
 */
export function DiscussionWorkspaceRow({
  card,
  destination,
  selected,
  onOpen,
  menu,
  setNotice,
  onLongPressHandlers,
}: {
  card: DiscussionWorkspaceCard;
  destination: string | null;
  selected: boolean;
  onOpen: (card: DiscussionWorkspaceCard) => void;
  /** The three-dot menu, already built for this card. */
  menu?: ReactNode;
  setNotice?: (message: string) => void;
  /** Touch long-press, which opens the phone action sheet. */
  onLongPressHandlers?: Record<string, unknown>;
}) {
  const actions = useDiscussionWorkspaceCardActions({
    card,
    destination,
    setNotice,
  });
  const kindLabel = getKindLabel(card);
  const attachmentLabel = getDiscussionAttachmentLabel(card.attachmentSummary);
  const text = card.excerpt || card.title || "";
  const isNote = card.itemType === "note" || card.kind === "note";
  const username = card.authorUsername.replace(/^@+/, "");

  const open = (event: MouseEvent<HTMLElement>) => {
    // Selecting text in a row must not open it.
    if (window.getSelection()?.toString()) return;
    if ((event.target as HTMLElement).closest("a,button,[role=menu]")) return;
    onOpen(card);
  };
  const openFromKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onOpen(card);
  };

  return (
    <article
      {...onLongPressHandlers}
      aria-current={selected ? "true" : undefined}
      className={`group/row relative flex cursor-pointer gap-4 rounded-2xl px-4 py-5 transition-colors after:pointer-events-none after:absolute after:inset-x-4 after:-bottom-px after:h-px after:bg-[color-mix(in_srgb,var(--text)_8%,transparent)] after:content-[""] ${
        selected
          ? "bg-[color-mix(in_srgb,var(--text)_5%,transparent)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--text)_10%,transparent)]"
          : "hover:bg-[color-mix(in_srgb,var(--text)_3.5%,transparent)]"
      }`}
      onClick={open}
    >
      <DiscussionAvatar
        src={card.avatar || null}
        className="size-10 shrink-0 rounded-full object-cover"
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div
          className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 ${menu ? "pr-10" : ""}`}
        >
          {/* The row's own keyboard target: the name opens it. */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(card);
            }}
            onKeyDown={openFromKey}
            className="rounded text-[0.9375rem] font-bold text-(--text) focus-visible:outline-2 focus-visible:outline-(--accent)"
            aria-label={`Open ${isNote ? "note" : "discussion"} by ${
              card.isOwn ? "you" : card.author
            }`}
          >
            {card.isOwn ? "You" : card.author}
          </button>
          {username && (
            <span className="text-[0.8125rem] text-(--muted)">@{username}</span>
          )}
          <span className="text-[0.8125rem] text-(--muted)" aria-hidden="true">
            ·
          </span>
          <time className="text-[0.8125rem] text-(--muted)">
            {card.activity}
          </time>
          {kindLabel && (
            <span className="self-center rounded-md bg-[color-mix(in_srgb,var(--text)_7%,transparent)] px-1.5 py-0.5 text-[0.6875rem] font-bold tracking-wide text-(--muted) uppercase">
              {kindLabel}
            </span>
          )}
        </div>

        {card.itemType === "reply" && card.parentThreadTitle && (
          <p className="m-0 truncate text-[0.8125rem] text-(--muted)">
            In reply to “{card.parentThreadTitle}”
          </p>
        )}

        {text && (
          <p className="m-0 line-clamp-4 max-w-180 text-base leading-relaxed wrap-anywhere text-(--text) select-text">
            {text}
          </p>
        )}

        {attachmentLabel && (
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-(--muted)">
            <Paperclip size={15} aria-hidden="true" />
            {attachmentLabel}
          </span>
        )}

        {(card.course || card.lesson) && (
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <BookOpen
              size={15}
              className="shrink-0 text-(--accent)"
              aria-hidden="true"
            />
            <span className="truncate font-bold text-(--accent)">
              {card.course}
            </span>
            {card.lesson && (
              <>
                <CaretRight
                  size={12}
                  weight="bold"
                  className="shrink-0 text-(--muted) opacity-60"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-(--muted)">
                  {card.lesson}
                </span>
              </>
            )}
          </div>
        )}

        <div className="-ml-2.5 flex items-center gap-1">
          {actions.canLike && (
            <DiscussionRowAction
              icon={
                <ThumbsUp
                  size={15}
                  weight={card.isLiked ? "fill" : "regular"}
                  aria-hidden="true"
                />
              }
              label={card.likes > 0 ? card.likes : "Like"}
              ariaLabel={`${card.isLiked ? "Unlike" : "Like"}${
                card.likes > 0 ? `, ${card.likes} likes` : ""
              }`}
              pressed={Boolean(card.isLiked)}
              onClick={actions.like}
            />
          )}
          {!isNote && (
            <DiscussionRowAction
              icon={<ChatCircle size={15} aria-hidden="true" />}
              label={
                card.replies > 0
                  ? `${card.replies} ${card.replies === 1 ? "reply" : "replies"}`
                  : "Reply"
              }
              onClick={() => onOpen(card)}
            />
          )}
        </div>
      </div>

      {menu && (
        <div className="absolute top-4 right-3 opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
          {menu}
        </div>
      )}
    </article>
  );
}

/**
 * A row as the list draws it: with its three-dot menu where there is a
 * pointer, and a long press that opens the action sheet on touch screens.
 */
export function DiscussionWorkspaceListRow({
  card,
  destination,
  selected,
  onOpen,
  onNavigatePage,
  showActions,
  onRequestMobileActions,
  setNotice,
}: {
  card: DiscussionWorkspaceCard;
  destination: string | null;
  selected: boolean;
  onOpen: (card: DiscussionWorkspaceCard) => void;
  onNavigatePage?: NavigateTo;
  showActions: boolean;
  onRequestMobileActions?: (
    card: DiscussionWorkspaceCard,
    destination: string | null,
  ) => void;
  setNotice?: (message: string) => void;
}) {
  const { isPressed: _isPressed, ...longPressHandlers } =
    useDiscussionWorkspaceCardLongPress({
      enabled: Boolean(onRequestMobileActions),
      onLongPress: () => onRequestMobileActions?.(card, destination),
    });

  return (
    <DiscussionWorkspaceRow
      card={card}
      destination={destination}
      selected={selected}
      onOpen={onOpen}
      setNotice={setNotice}
      onLongPressHandlers={longPressHandlers}
      menu={
        showActions ? (
          <DiscussionWorkspaceActionMenu
            card={card}
            destination={destination}
            setNotice={setNotice}
            onNavigatePage={onNavigatePage}
          />
        ) : undefined
      }
    />
  );
}
