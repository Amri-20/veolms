import { useEffect, useRef } from "react";

/**
 * "Reply" on a Discussions row asks the side panel to take the learner to
 * its reply box. The panel may not be showing that discussion yet (it opens
 * with the press, or is a phone sheet still on its way), so the request
 * waits here until the panel with that discussion picks it up.
 */
let pendingDiscussionId: string | null = null;
const requests = new EventTarget();

export function requestDiscussionReplyFocus(discussionId: string) {
  pendingDiscussionId = discussionId;
  requests.dispatchEvent(new Event("request"));
}

/**
 * Calls `onRequest` when a reply to `discussionId` is asked for, once, and
 * only while `ready` (the reply box is on screen): a request made before
 * that waits for it.
 */
export function useDiscussionReplyFocus(
  discussionId: string,
  ready: boolean,
  onRequest: () => void,
) {
  const onRequestRef = useRef(onRequest);
  useEffect(() => {
    onRequestRef.current = onRequest;
  });
  useEffect(() => {
    if (!ready) return undefined;
    const take = () => {
      if (pendingDiscussionId !== discussionId) return;
      pendingDiscussionId = null;
      onRequestRef.current();
    };
    // Asked for before this panel was showing the discussion.
    take();
    requests.addEventListener("request", take);
    return () => requests.removeEventListener("request", take);
  }, [discussionId, ready]);
}
