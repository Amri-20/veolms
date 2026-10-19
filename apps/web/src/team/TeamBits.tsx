import { DotsThreeVerticalIcon as DotsThreeVertical } from "@phosphor-icons/react/DotsThreeVertical";
import { MagnifyingGlassIcon as MagnifyingGlass } from "@phosphor-icons/react/MagnifyingGlass";
import type { Icon } from "@phosphor-icons/react";
import type { TeamMemberRole } from "@veolms/contracts";
import { useState, type ReactNode } from "react";
import { ResponsiveAvatar } from "../components/ResponsiveAvatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { initials, roleLabel } from "./teamFormat";

/** Small shared pieces of the Team page. */

export function RoleChips({
  roles,
  empty = "No team role",
}: {
  roles: readonly Pick<TeamMemberRole, "id" | "name">[];
  empty?: string;
}) {
  if (roles.length === 0) {
    return <span className="text-xs text-(--muted)">{empty}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <span
          key={role.id}
          className="inline-flex items-center rounded-md border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface))] px-1.5 py-0.5 text-xs font-medium text-(--text)"
        >
          {roleLabel(role.name)}
        </span>
      ))}
    </span>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "neutral" | "accent" | "success" | "warning" | "danger";
  children: ReactNode;
}) {
  const tones = {
    neutral: "text-(--muted) bg-(--hover)",
    accent: "text-(--accent) bg-(--accent)/10",
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/12",
    danger: "text-rose-500 bg-rose-500/10",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function PersonAvatar({
  name,
  email,
  avatarUrl,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  return avatarUrl ? (
    <ResponsiveAvatar
      src={avatarUrl}
      alt=""
      sizes="36px"
      width={36}
      height={36}
      className="size-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent)/12 text-xs font-bold text-(--accent)"
    >
      {initials(name, email)}
    </span>
  );
}

export interface RowMenuItem {
  label: string;
  icon: Icon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** The "⋮" menu at the end of a row. */
export function RowMenu({
  label,
  items,
}: {
  label: string;
  items: readonly RowMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        title="Actions"
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-(--muted) transition-colors hover:bg-(--hover) hover:text-(--text) data-popup-open:bg-(--hover)"
      >
        <DotsThreeVertical size={18} weight="bold" />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-48 p-1.5">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0" role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-(--hover) disabled:cursor-default disabled:opacity-50 ${item.danger ? "text-rose-500" : "text-(--text)"}`}
              >
                <item.icon size={16} weight="bold" aria-hidden="true" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center">
      <span className="sr-only">{label}</span>
      <MagnifyingGlass
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 text-(--muted)"
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} pl-9`}
      />
    </label>
  );
}

export const inputClassName =
  "h-10 w-full min-w-0 rounded-lg border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-(--surface) px-3 text-sm text-(--text) placeholder:text-(--muted) focus:border-(--accent) focus:outline-none";

export const secondaryButtonClassName =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-(--surface) px-4 text-sm font-semibold text-(--text) transition-colors hover:bg-(--hover) disabled:pointer-events-none disabled:opacity-55";

export function EmptyState({
  icon: IconComponent,
  title,
  children,
}: {
  icon: Icon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-(--accent)/10 text-(--accent)">
        <IconComponent size={22} weight="duotone" />
      </span>
      <p className="text-sm font-semibold text-(--text)">{title}</p>
      {children ? (
        <div className="max-w-sm text-sm text-(--muted)">{children}</div>
      ) : null}
    </div>
  );
}

/** A slide-over's scrolling body and its sticky footer. */
export function PanelBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
  );
}

export function PanelFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[color-mix(in_srgb,var(--text)_12%,transparent)] p-4 sm:px-6">
      {children}
    </div>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-(--text)"
      >
        {children}
      </label>
      {hint ? <p className="mt-0.5 text-xs text-(--muted)">{hint}</p> : null}
    </div>
  );
}
