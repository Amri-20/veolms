/**
 * What a change to one box of the sign-in code means for the whole code.
 *
 * The code is a string of up to `OTP_CODE_LENGTH` digits and each box shows
 * one of them. The boxes used to be limited to one character, so the
 * browser cut a code inserted in one go (a code from a text message offered
 * by the keyboard, some input methods) down to its first digit before this
 * could spread it across the boxes. Without the limit a box can report more
 * than one character, and what it reports depends on whether the digit it
 * already held was selected (replaced) or not (kept, with the new text
 * beside it). The cases with one reading are read that way:
 *
 * - one digit: that digit, in this box;
 * - the held digit and one other: the other was typed beside it, and
 *   replaces it, as it would have with the held digit selected;
 * - a whole code: the code, whichever box it arrived in;
 * - a whole code beside the held digit: the code.
 *
 * Anything else that holds several digits is laid out from this box on, as
 * a paste is. Characters that are not digits are never used.
 */
export const OTP_CODE_LENGTH = 6;

const NON_DIGITS = /\D/g;

export interface OtpCodeChange {
  /** The code after the change. */
  value: string;
  /** The box to focus next; one past the last box means "leave it". */
  focus: number;
}

/** Lays several digits out from a box on; a whole code replaces everything. */
export function fillOtpCodeFrom(
  previous: string,
  position: number,
  digits: string,
): OtpCodeChange {
  const value =
    digits.length === OTP_CODE_LENGTH
      ? digits
      : (previous.slice(0, position) + digits).slice(0, OTP_CODE_LENGTH);

  return { value, focus: Math.min(value.length, OTP_CODE_LENGTH - 1) };
}

/**
 * `entry` is the text the box at `position` now reports. Returns `null` when
 * it changes nothing (no digit in it, or nothing but the digit already held
 * and characters that are not digits).
 *
 * `caret` is where the box's caret is after the change, when known. It is
 * only needed to tell which end of a whole code the held digit is on when
 * the code starts and ends with that digit: text goes in at the caret, so a
 * caret short of the end means the held digit comes last.
 */
export function applyOtpCodeEntry(
  previous: string,
  position: number,
  entry: string,
  caret?: number | null,
): OtpCodeChange | null {
  const held = previous[position];
  let digits = entry.replace(NON_DIGITS, "");

  if (digits === "") {
    return null;
  }

  if (held !== undefined) {
    if (digits === held && entry.length > 1) {
      return null;
    }

    if (digits.length === 2 && digits.includes(held)) {
      digits = digits.replace(held, "");
    } else if (digits.length === OTP_CODE_LENGTH + 1) {
      const heldComesLast =
        caret !== undefined && caret !== null && caret < entry.length;
      if (heldComesLast && digits.endsWith(held)) digits = digits.slice(0, -1);
      else if (digits.startsWith(held)) digits = digits.slice(1);
      else if (digits.endsWith(held)) digits = digits.slice(0, -1);
    }
  }

  digits = digits.slice(0, OTP_CODE_LENGTH);

  if (digits.length > 1) {
    return fillOtpCodeFrom(previous, position, digits);
  }

  return {
    value: (
      previous.slice(0, position) +
      digits +
      previous.slice(position + 1)
    ).slice(0, OTP_CODE_LENGTH),
    focus: position + 1,
  };
}
