import { useLayoutEffect, useRef } from "react";
import { ThumbsUpIcon as ThumbsUp } from "@phosphor-icons/react/ThumbsUp";
import { DiscussionRowAction } from "./DiscussionRowAction";

const BURST_PARTICLES = 8;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let likeAudio: AudioContext | null = null;

/**
 * A short, soft rising "pop" for a like, made in the browser so there is no
 * file to fetch. It is quiet, and only follows a press (browsers allow sound
 * after one).
 */
function playLikeSound() {
  try {
    likeAudio ??= new AudioContext();
    const audio = likeAudio;
    if (audio.state === "suspended") void audio.resume();
    const start = audio.currentTime;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.09, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.17);
    gain.connect(audio.destination);
    // A main tone and a softer one an octave up, gliding upwards together.
    for (const [from, to, level] of [
      [480, 900, 1],
      [960, 1800, 0.35],
    ] as const) {
      const tone = audio.createOscillator();
      const toneGain = audio.createGain();
      tone.type = "sine";
      tone.frequency.setValueAtTime(from, start);
      tone.frequency.exponentialRampToValueAtTime(to, start + 0.09);
      toneGain.gain.value = level;
      tone.connect(toneGain).connect(gain);
      tone.start(start);
      tone.stop(start + 0.18);
    }
  } catch {
    // No sound where audio is unavailable; the like itself is unaffected.
  }
}

/** The thumb's lift and a small burst around it, as on YouTube. */
function celebrate(icon: HTMLElement) {
  icon.animate(
    [
      { transform: "scale(1) rotate(0deg)" },
      {
        transform: "scale(1.5) rotate(-22deg) translateY(-2px)",
        offset: 0.35,
      },
      { transform: "scale(0.9) rotate(6deg)", offset: 0.7 },
      { transform: "scale(1) rotate(0deg)" },
    ],
    { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  for (let index = 0; index < BURST_PARTICLES; index += 1) {
    const angle = (index / BURST_PARTICLES) * Math.PI * 2;
    const x = Math.cos(angle) * 12;
    const y = Math.sin(angle) * 12;
    const particle = document.createElement("span");
    particle.className =
      "pointer-events-none absolute top-1/2 left-1/2 size-[3px] rounded-full bg-current";
    icon.append(particle);
    const motion = particle.animate(
      [
        { transform: "translate(-50%, -50%) scale(0)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(1)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(calc(-50% + ${x * 1.45}px), calc(-50% + ${y * 1.45}px)) scale(0)`,
          opacity: 0,
        },
      ],
      { duration: 480, delay: 90, easing: "ease-out", fill: "backwards" },
    );
    motion.onfinish = () => particle.remove();
    motion.oncancel = () => particle.remove();
  }
}

/**
 * The like button of the Discussions page: the count alone (0 included) in
 * a pill. Liking lifts the thumb with a small burst and a soft sound, and
 * the number rolls to its new value. One digit keeps its place; going to
 * two digits widens the pill.
 */
export function DiscussionLikeButton({
  liked,
  count,
  onToggle,
  noun = "",
  iconSize = 15,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  /** What is liked, for assistive technology ("reply"). */
  noun?: string;
  iconSize?: number;
}) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const rollRef = useRef<"up" | "down" | null>(null);
  const shown = Math.max(0, count);

  // The number rolls in from below when it goes up and from above when it
  // goes down, after the press that changed it.
  useLayoutEffect(() => {
    const direction = rollRef.current;
    rollRef.current = null;
    if (!direction || !numberRef.current || prefersReducedMotion()) return;
    numberRef.current.animate(
      [
        {
          transform: `translateY(${direction === "up" ? 70 : -70}%)`,
          opacity: 0,
        },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [shown]);

  const press = () => {
    const willLike = !liked;
    rollRef.current = willLike ? "up" : "down";
    if (willLike) {
      playLikeSound();
      if (iconRef.current && !prefersReducedMotion()) {
        celebrate(iconRef.current);
      }
    }
    onToggle();
  };

  const target = noun ? ` ${noun}` : "";
  return (
    <DiscussionRowAction
      icon={
        <span ref={iconRef} className="relative inline-grid place-items-center">
          <ThumbsUp
            size={iconSize}
            weight={liked ? "fill" : "regular"}
            aria-hidden="true"
          />
        </span>
      }
      label={
        <span className="inline-flex overflow-hidden">
          <span
            ref={numberRef}
            className="inline-block min-w-[1ch] text-center tabular-nums"
          >
            {shown}
          </span>
        </span>
      }
      ariaLabel={`${liked ? "Unlike" : "Like"}${target}, ${shown} ${
        shown === 1 ? "like" : "likes"
      }`}
      pressed={liked}
      onClick={press}
    />
  );
}
