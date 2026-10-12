import { useRef } from "react";
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
}

const CODE_LENGTH = OTP_CODE_LENGTH;
const FIELD_ID_PREFIX = "auth-otp-digit";
const POSITIONS: readonly number[] = [0, 1, 2, 3, 4, 5];
const NON_DIGITS = /\D/g;

export function OtpCodeInput({
  describedBy,
  disabled = false,
  invalid = false,
  label,
  autoFocus = false,
  onChange,
  value,
}: OtpCodeInputProps) {
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
    <div className="auth-otp">
      {POSITIONS.map((position) => {
        const place = position + 1;
        const fieldId = `${FIELD_ID_PREFIX}-${place}`;

        return (
          <div className="auth-otp__slot" key={position}>
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
              className="auth-otp__digit"
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
        );
      })}
    </div>
  );
}
