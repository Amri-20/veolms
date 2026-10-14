import { Fragment, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import {
  OTP_CODE_LENGTH,
  applyOtpCodeEntry,
  fillOtpCodeFrom,
  type OtpCodeChange,
} from "./otpCodeEntry";

export interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  label: string;
  autoFocus?: boolean;
  /**
   * "login": the login card's larger boxes, split three and three by a
   * dash. Elsewhere (two-factor, settings) the compact row.
   */
  look?: "compact" | "login";
}

const CODE_LENGTH = OTP_CODE_LENGTH;
const FIELD_ID_PREFIX = "auth-otp-digit";
const POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 5];
const NON_DIGITS = /\D/g;

/** The login card's boxes. Font marked important (see LoginCardParts). */
const loginDigitClasses =
  "h-14 w-[clamp(36px,10.5vw,46px)] rounded-xl border border-[color-mix(in_srgb,var(--text)_12%,transparent)] bg-[color-mix(in_srgb,var(--canvas)_45%,var(--surface))] p-0 text-center text-[1.375rem]! font-semibold! text-(--text) tabular-nums caret-(--accent) outline-none transition-[border-color,box-shadow] focus:border-(--accent) focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)] aria-invalid:border-(--danger) disabled:opacity-60";

export function OtpCodeInput({
  describedBy,
  disabled = false,
  invalid = false,
  label,
  autoFocus = false,
  onChange,
  value,
  look = "compact",
}: OtpCodeInputProps) {
  const login = look === "login";
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const moveFocus = (position: number) => {
    inputs.current[position]?.focus();
  };

  const clearDigit = (position: number) => {
    onChange(value.slice(0, position) + value.slice(position + 1));
  };

  const pressKey = (
    event: KeyboardEvent<HTMLInputElement>,
    position: number,
  ) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(position + (event.key === "ArrowLeft" ? -1 : 1));
      return;
    }

    if (event.key !== "Backspace") {
      return;
    }

    event.preventDefault();

    if (value[position] !== undefined) {
      clearDigit(position);
      return;
    }

    if (position > 0) {
      moveFocus(position - 1);
      clearDigit(position - 1);
    }
  };

  const applyChange = (change: OtpCodeChange) => {
    onChange(change.value);
    moveFocus(change.focus);
  };

  const pasteCode = (
    event: ClipboardEvent<HTMLInputElement>,
    position: number,
  ) => {
    const digits = event.clipboardData
      .getData("text")
      .replace(NON_DIGITS, "")
      .slice(0, CODE_LENGTH);

    if (digits === "") {
      return;
    }

    event.preventDefault();
    applyChange(fillOtpCodeFrom(value, position, digits));
  };

  // The boxes have no `maxLength`: with one, the browser cut a code inserted
  // in one go (offered by the keyboard from a text message, or by an input
  // method) down to its first digit before it got here. A box can therefore
  // report several characters; `applyOtpCodeEntry` says what they mean.
  const changeDigit = (
    position: number,
    entry: string,
    caret: number | null,
  ) => {
    const change = applyOtpCodeEntry(value, position, entry, caret);

    if (change) {
      applyChange(change);
    }
  };

  return (
    <div
      className={
        login
          ? "flex items-center justify-center gap-[clamp(5px,1.6vw,8px)]"
          : "auth-otp"
      }
    >
      {POSITIONS.map((position) => {
        const place = position + 1;
        const fieldId = `${FIELD_ID_PREFIX}-${place}`;

        return (
          <Fragment key={position}>
            {login && position === CODE_LENGTH / 2 ? (
              <span
                aria-hidden="true"
                className="mx-0.5 h-0.5 w-2.5 shrink-0 rounded-xs bg-[color-mix(in_srgb,var(--text)_14%,transparent)]"
              />
            ) : null}
            <div className={login ? "min-w-0" : "auth-otp__slot"}>
              <label className="auth-otp__label" htmlFor={fieldId}>
                {`${label} digit ${place} of ${CODE_LENGTH}`}
              </label>
              <input
                ref={(node) => {
                  inputs.current[position] = node;
                }}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                autoFocus={autoFocus && position === 0}
                autoComplete="one-time-code"
                className={login ? loginDigitClasses : "auth-otp__digit"}
                disabled={disabled}
                id={fieldId}
                inputMode="numeric"
                onChange={(event) =>
                  changeDigit(
                    position,
                    event.target.value,
                    event.target.selectionStart,
                  )
                }
                onFocus={(event) => event.target.select()}
                onKeyDown={(event) => pressKey(event, position)}
                onPaste={(event) => pasteCode(event, position)}
                type="text"
                value={value[position] ?? ""}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
