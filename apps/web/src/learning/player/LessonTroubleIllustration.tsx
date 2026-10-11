/**
 * The picture that goes with "Something went wrong" in the lesson player: a
 * little screen that has come unplugged and is taking it badly (crossed
 * eyes, a wobbly mouth, a bent aerial), its plug lying beside it with a
 * spark or two. It is drawn in the page's accent with the player's white,
 * so it belongs to whichever theme is on.
 */
export function LessonTroubleIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 176 124"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* A soft glow under the screen, so it does not float on black. */}
      <ellipse
        cx="84"
        cy="112"
        rx="58"
        ry="7"
        fill="var(--accent)"
        opacity="0.22"
      />

      {/* The aerial, bent. */}
      <path
        d="M70 20 58 6M92 20l10-9 9 4"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="57" cy="5" r="3" fill="#fcd34d" />
      <circle cx="112" cy="15" r="3" fill="#fcd34d" />

      {/* The set and its screen. */}
      <rect
        x="26"
        y="20"
        width="116"
        height="74"
        rx="14"
        fill="#0b1224"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="3"
      />
      <rect
        x="35"
        y="29"
        width="98"
        height="56"
        rx="8"
        fill="var(--accent)"
        opacity="0.26"
      />
      {/* Lines of static across the screen. */}
      <path
        d="M41 38h30M83 38h44M41 77h52M103 77h24"
        stroke="var(--accent)"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Its face. */}
      <path
        d="m60 45 10 10m0-10L60 55M98 45l10 10m0-10L98 55"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M66 69c4-5 8-5 12 0s8 5 12 0 8-5 12 0"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Feet. */}
      <path
        d="M56 94v9M112 94v9M46 104h20M102 104h20"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* The lead that came out, its plug, and what it is doing about it. */}
      <path
        d="M142 70c12 0 16 10 10 20-4 7-2 12 4 14"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect
        x="154"
        y="99"
        width="14"
        height="11"
        rx="3"
        transform="rotate(18 161 104.5)"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <path
        d="m167 100 5-2M168.5 106l5 1"
        stroke="currentColor"
        strokeOpacity="0.9"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="m160 86 2-7M168 90l6-5M150 88l-4-6"
        stroke="#fcd34d"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
