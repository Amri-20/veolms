import { useState } from "react";
import { BellSimpleIcon as BellSimple } from "@phosphor-icons/react/BellSimple";
import { BookmarkSimpleIcon as BookmarkSimple } from "@phosphor-icons/react/BookmarkSimple";
import { CopySimpleIcon as CopySimple } from "@phosphor-icons/react/CopySimple";
import { EyeSlashIcon as EyeSlash } from "@phosphor-icons/react/EyeSlash";
import { PlayIcon as Play } from "@phosphor-icons/react/Play";
import { LinkSimpleIcon as LinkSimple } from "@phosphor-icons/react/LinkSimple";
import { TrashIcon as Trash } from "@phosphor-icons/react/Trash";
import { CourseActionMenu, MenuAction, MenuDivider } from "../courses";
import type { NavigateTo } from "../routing/navigation";
import type { DiscussionWorkspaceCard } from "./discussions-workspace.adapter";
import { useDiscussionWorkspaceCardActions } from "./useDiscussionWorkspaceCardActions";

interface DiscussionWorkspaceActionMenuProps {
  card: DiscussionWorkspaceCard;
  destination: string | null;
  setNotice?: (message: string) => void;
  /** Given, the menu starts with "Open in course". */
  onNavigatePage?: NavigateTo;
}

export function DiscussionWorkspaceActionMenu({
  card,
  destination,
  setNotice,
  onNavigatePage,
}: DiscussionWorkspaceActionMenuProps) {
  const [open, setOpen] = useState(false);
  const actions = useDiscussionWorkspaceCardActions({
    card,
    destination,
    setNotice,
  });

  const sourceLabel = actions.isNote ? "note" : "discussion";

  return (
    <CourseActionMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) actions.resetDelete();
      }}
      dismissOnScroll
      ariaLabel={`More actions for ${sourceLabel}`}
      menuLabel={`${actions.isNote ? "Note" : "Discussion"} actions`}
      className="relative z-20 ml-auto shrink-0"
      triggerClassName="size-9"
      triggerVisualClassName="size-7"
    >
      {onNavigatePage && destination && (
        <MenuAction
          Icon={Play}
          label="Open in course"
          onClick={() => onNavigatePage(destination, { exact: true })}
        />
      )}
      {actions.canCopyLink && (
        <MenuAction
          Icon={LinkSimple}
          label="Copy link"
          onClick={() => {
            void actions.copyLink();
          }}
        />
      )}
      {actions.canBookmark && (
        <MenuAction
          Icon={BookmarkSimple}
          label={actions.bookmarkLabel}
          onClick={actions.bookmark}
        />
      )}
      {actions.canFollow && (
        <MenuAction
          Icon={BellSimple}
          label={actions.followLabel}
          onClick={actions.follow}
        />
      )}
      {actions.canCopyText && (
        <MenuAction
          Icon={CopySimple}
          label="Copy text"
          onClick={() => {
            void actions.copyText();
          }}
        />
      )}
      {(actions.canHide || actions.canDelete) && <MenuDivider />}
      {actions.canHide && (
        <MenuAction
          Icon={EyeSlash}
          label={actions.hideLabel}
          onClick={actions.hide}
        />
      )}
      {actions.canDelete && (
        <>
          <MenuAction
            Icon={Trash}
            label={actions.deleteLabel}
            destructive
            // The first press only asks for confirmation, so the menu stays.
            stayOpenMs={actions.confirmingDelete ? undefined : 4000}
            onClick={actions.deleteItem}
          />
        </>
      )}
    </CourseActionMenu>
  );
}
