import { ProfileLink } from "../../profiles/ProfileLink";
import { usePublicProfile } from "../../services/auth";

/**
 * An "@name" in a post. Only a member who exists is marked (and opens their
 * profile); any other "@word" reads as the plain text it is. Each name is
 * looked up once and kept for a few minutes (usePublicProfile), and until
 * the answer comes the text stays plain.
 */
export function MentionLink({ username }: { username: string }) {
  const profile = usePublicProfile(username);
  if (!profile.data) return <>@{username}</>;
  return (
    <ProfileLink
      username={username}
      variant="name"
      className="inline-flex items-center rounded bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-1 py-0.5 font-medium text-(--accent) no-underline hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] hover:no-underline"
    >
      <span data-mention={username}>@{username}</span>
    </ProfileLink>
  );
}
