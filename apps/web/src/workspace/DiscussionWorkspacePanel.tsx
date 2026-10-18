import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { ArrowSquareOutIcon as ArrowSquareOut } from "@phosphor-icons/react/ArrowSquareOut";
import { ThumbsUpIcon as ThumbsUp } from "@phosphor-icons/react/ThumbsUp";
import { XIcon as X } from "@phosphor-icons/react/X";
import type { LearningReply } from "@veolms/contracts";
import { DiscussionAvatar } from "../learning/DiscussionAvatar";
import type { NavigateTo } from "../routing/navigation";
import { getApplicationScrollElement } from "../shell/applicationScroll";
import { useCurrentUser } from "../services/auth";
import {
  learningInteractionKeys,
  learningInteractionsService,
  useCreateReply,
  useNoteDetails,
  useThreadDetails,
  useThreadReplies,
} from "../services/learning-interactions";
import { DiscussionWorkspaceActionMenu } from "./DiscussionWorkspaceActionMenu";
import { DiscussionRowAction } from "./DiscussionWorkspaceRow";
import type { DiscussionWorkspaceCard } from "./discussions-workspace.adapter";

const DiscussionMarkdown = lazy(() =>
  import("../learning/discussion-editor/DiscussionMarkdown").then((module) => ({
    default: module.DiscussionMarkdown,
  })),
);

function formatPostTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function RoleBadge({ role }: { role?: string }) {
  if (role !== "Instructor" && role !== "Admin") return null;
  return (
    <span className="rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wide text-(--accent) uppercase">
      {role}
    </span>
  );
}

function PostBody({ content, label }: { content: string; label: string }) {
  return (
    <Suspense
      fallback={
        <p className="m-0 text-base leading-relaxed whitespace-pre-wrap text-(--text)">
          {content}
        </p>
      }
    >
      <DiscussionMarkdown
        content={{ format: "markdown", markdown: content, plainText: content }}
        label={label}
        className="text-base leading-relaxed wrap-anywhere text-(--text)"
      />
    </Suspense>
  );
}

function PanelReply({
  reply,
  onLike,
}: {
  reply: LearningReply;
  onLike: (reply: LearningReply) => void;
}) {
  return (
    <article className="flex gap-3 pl-5">
      <DiscussionAvatar
        src={reply.author.avatarUrl ?? null}
        className="size-8 shrink-0 rounded-full object-cover"
        width={32}
        height={32}
        loading="lazy"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.9rem] font-bold text-(--text)">
            {reply.isOwn ? "You" : reply.author.displayName}
          </span>
          <RoleBadge role={reply.author.role} />
          <time className="text-[0.8125rem] text-(--muted)">
            {formatPostTime(reply.createdAt)}
          </time>
        </div>
        <PostBody content={reply.content} label="Reply" />
        <div className="-ml-2.5">
          <DiscussionRowAction
            icon={
              <ThumbsUp
                size={14}
                weight={reply.isLiked ? "fill" : "regular"}
                aria-hidden="true"
              />
            }
            label={reply.likesCount > 0 ? reply.likesCount : "Like"}
            ariaLabel={reply.isLiked ? "Unlike reply" : "Like reply"}
            pressed={Boolean(reply.isLiked)}
            onClick={() => onLike(reply)}
          />
        </div>
      </div>
    </article>
  );
}

/**
 * Where the panel stands on a wide screen: along the right edge of the app's
 * scrolling frame, as tall as the frame, whatever the page scrolls. The frame
 * sits inside the shell's padding, so neither the window nor a sticky column
 * gives that box; it is measured.
 */
function usePanelFrameBox(): CSSProperties | undefined {
  const [box, setBox] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const frame = getApplicationScrollElement();
    if (!frame) return;
    const measure = () => {
      const rect = frame.getBoundingClientRect();
      setBox({
        "--panel-top": `${rect.top}px`,
        "--panel-right": `${Math.max(0, window.innerWidth - rect.right)}px`,
        "--panel-height": `${rect.height}px`,
      } as CSSProperties);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return box;
}

/**
 * The discussion opened from the Discussions page, beside the list: the post
 * in full, its replies and a box to reply. "Open in course" takes it to the
 * lesson, where the comment is highlighted.
 */
export function DiscussionWorkspacePanel({
  card,
  destination,
  onClose,
  onNavigatePage,
  setNotice,
}: {
  card: DiscussionWorkspaceCard;
  destination: string | null;
  onClose: () => void;
  onNavigatePage?: NavigateTo;
  setNotice?: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const isNote = card.itemType === "note" || card.kind === "note";
  // A reply or mention opens the discussion it belongs to.
  const threadId = isNote
    ? undefined
    : card.itemType === "reply"
      ? (card.parentThreadId ?? undefined)
      : card.id;
  const thread = useThreadDetails(threadId);
  const note = useNoteDetails(isNote ? card.id : undefined);
  const replies = useThreadReplies(threadId);
  const createReply = useCreateReply(threadId);
  const [draft, setDraft] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameBox = usePanelFrameBox();

  const kindName = isNote
    ? "Note"
    : thread.data?.kind === "question" || card.kind === "question"
      ? "Q&A"
      : "Comment";
  const replyList = replies.data?.pages.flatMap((page) => page.replies) ?? [];
  const post = isNote ? note.data : thread.data;
  const author = thread.data?.author;
  const authorName = isNote
    ? card.isOwn
      ? "You"
      : card.author
    : thread.data?.isOwn
      ? "You"
      : (author?.displayName ?? card.author);

  // Keyboard users land in the panel when it opens and leave it with Escape.
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [card.id]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const refreshReplies = () => {
    if (!threadId) return;
    void queryClient.invalidateQueries({
      queryKey: learningInteractionKeys.threadReplies(threadId),
    });
  };

  const likeReply = (reply: LearningReply) => {
    void learningInteractionsService
      .toggleLike({ targetType: "reply", targetId: reply.id })
      .then(refreshReplies)
      .catch(() => setNotice?.("Couldn't update like"));
  };

  const submitReply = () => {
    const content = draft.trim();
    if (!content || !threadId || createReply.isPending) return;
    createReply.mutate(
      { content },
      {
        onSuccess: () => {
          setDraft("");
          refreshReplies();
          // The reply count on the list's row and the lesson's lists.
          void queryClient.invalidateQueries({
            queryKey: learningInteractionKeys.all,
            refetchType: "none",
          });
          void queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[1] === "discussions-workspace",
          });
        },
        onError: () => setNotice?.("Couldn't post your reply"),
      },
    );
  };

  const firstName = (authorName ?? "").split(" ")[0];

  return (
    <aside
      aria-label={`${kindName} details`}
      style={frameBox}
      className="fixed z-60 flex flex-col bg-(--surface) max-lg:inset-0 max-lg:z-150 lg:top-(--panel-top) lg:right-(--panel-right) lg:h-(--panel-height) lg:w-110 lg:rounded-r-[inherit] lg:border-l lg:border-[color-mix(in_srgb,var(--text)_9%,transparent)]"
    >
      <header className="flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--text)_9%,transparent)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-9 place-items-center rounded-lg text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text) focus-visible:outline-2 focus-visible:outline-(--accent)"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <span className="text-sm font-bold text-(--muted)">{kindName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {destination && onNavigatePage && (
            <a
              href={destination}
              onClick={(event) => {
                event.preventDefault();
                onNavigatePage(destination, { exact: true });
              }}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--text)_7%,transparent)] px-3 text-[0.84rem] font-bold text-(--text) transition-colors hover:bg-[color-mix(in_srgb,var(--text)_11%,transparent)] focus-visible:outline-2 focus-visible:outline-(--accent)"
            >
              Open in course
              <ArrowSquareOut size={14} weight="bold" aria-hidden="true" />
            </a>
          )}
          <DiscussionWorkspaceActionMenu
            card={card}
            destination={destination}
            setNotice={setNotice}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {(card.course || card.lesson) && (
          <div className="flex flex-col gap-1 border-b border-[color-mix(in_srgb,var(--text)_9%,transparent)] px-5 py-4">
            {card.course && (
              <span className="text-[0.8125rem] font-bold text-(--accent)">
                {card.course}
              </span>
            )}
            {card.lesson && (
              <span className="text-base leading-snug font-bold text-(--text)">
                {card.lesson}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-5 p-5">
          <article className="flex gap-3">
            <DiscussionAvatar
              src={
                (isNote ? card.avatar : author?.avatarUrl) ||
                card.avatar ||
                null
              }
              className="size-10 shrink-0 rounded-full object-cover"
              width={40}
              height={40}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.9375rem] font-bold text-(--text)">
                  {authorName}
                </span>
                <RoleBadge role={author?.role} />
                <time className="text-[0.8125rem] text-(--muted)">
                  {post ? formatPostTime(post.createdAt) : card.activity}
                </time>
              </div>
              {post?.title && (
                <h2 className="m-0 text-base font-bold text-(--text)">
                  {post.title}
                </h2>
              )}
              <PostBody
                content={post?.content ?? card.content}
                label={kindName}
              />
            </div>
          </article>

          {!isNote && (
            <>
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold tracking-wider text-(--muted) uppercase">
                  {replies.isLoading
                    ? "Replies"
                    : replyList.length === 0
                      ? "No replies yet"
                      : `${replyList.length} ${replyList.length === 1 ? "reply" : "replies"}`}
                </span>
                <div
                  className="h-px flex-1 bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"
                  aria-hidden="true"
                />
              </div>
              {replyList.map((reply) => (
                <PanelReply key={reply.id} reply={reply} onLike={likeReply} />
              ))}
              {replies.hasNextPage && (
                <button
                  type="button"
                  onClick={() => void replies.fetchNextPage()}
                  disabled={replies.isFetchingNextPage}
                  className="self-start rounded-lg px-3 py-2 text-sm font-bold text-(--accent) hover:bg-(--hover)"
                >
                  {replies.isFetchingNextPage
                    ? "Loading…"
                    : "Show more replies"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!isNote && threadId && !thread.data?.isLocked && (
        <form
          className="border-t border-[color-mix(in_srgb,var(--text)_9%,transparent)] px-5 pt-4 pb-[max(20px,var(--app-safe-area-bottom,0px))]"
          onSubmit={(event) => {
            event.preventDefault();
            submitReply();
          }}
        >
          <label htmlFor="discussion-panel-reply" className="sr-only">
            Write a reply
          </label>
          <div className="flex items-start gap-3">
            <DiscussionAvatar
              src={currentUser?.avatarDataUrl ?? null}
              className="mt-1.5 size-8 shrink-0 rounded-full object-cover"
              width={32}
              height={32}
            />
            <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-[color-mix(in_srgb,var(--text)_9%,transparent)] bg-(--surface-strong,var(--surface)) focus-within:border-(--accent)">
              <textarea
                id="discussion-panel-reply"
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    submitReply();
                  }
                }}
                placeholder={
                  firstName ? `Reply to ${firstName}…` : "Write a reply…"
                }
                className="resize-none border-0 bg-transparent px-3.5 pt-3 pb-1 text-[0.9375rem] leading-normal text-(--text) outline-0 placeholder:text-(--muted)"
              />
              <div className="flex justify-end px-2 pt-1.5 pb-2">
                <button
                  type="submit"
                  disabled={!draft.trim() || createReply.isPending}
                  className="inline-flex h-8.5 items-center gap-2 rounded-lg bg-(--accent) px-3.5 text-[0.84rem] font-extrabold text-(--on-accent) transition-opacity disabled:opacity-40"
                >
                  {createReply.isPending ? "Posting…" : "Reply"}
                  <ArrowRight size={14} weight="bold" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </aside>
  );
}
