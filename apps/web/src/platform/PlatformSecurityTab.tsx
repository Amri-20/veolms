import { DeviceMobileIcon as DeviceMobile } from "@phosphor-icons/react/DeviceMobile";
import { FingerprintIcon as Fingerprint } from "@phosphor-icons/react/Fingerprint";
import { IdentificationCardIcon as IdentificationCard } from "@phosphor-icons/react/IdentificationCard";
import { ShieldCheckIcon as ShieldCheck } from "@phosphor-icons/react/ShieldCheck";
import { ShieldSlashIcon as ShieldSlash } from "@phosphor-icons/react/ShieldSlash";
import { UserGearIcon as UserGear } from "@phosphor-icons/react/UserGear";
import { useState } from "react";
import {
  SettingRow,
  SettingsToggle,
  StatusNote,
} from "../settings/SettingsControls";
import { ConfirmActionModal } from "../shell/ConfirmActionModal";
import { PlatformSettingsStatus } from "./PlatformSettingsStatus";
import { usePlatformSettingsEditor } from "./usePlatformSettingsEditor";

// The rows' controls drop under their text on a phone, as in Settings >
// Privacy & Security.
const ROW_CLASS =
  "max-[480px]:[grid-template-columns:2rem_minmax(0,1fr)] max-[480px]:[&_.settings-row__control]:col-start-2";

/**
 * The academy's sign-in and enrolment rules for students. Admins and
 * instructors always sign in with a second step; that is not a setting.
 */
export function PlatformSecurityTab({
  setNotice,
}: {
  setNotice?: (message: string) => void;
}) {
  const { query, settings, save } = usePlatformSettingsEditor(setNotice);
  const [confirmingTwoFactorOff, setConfirmingTwoFactorOff] = useState(false);

  if (!settings) {
    return (
      <PlatformSettingsStatus
        isError={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { studentTwoFactorEnabled, requireVerifiedPhoneForEnrollment } =
    settings.security;

  const setStudentTwoFactor = (enabled: boolean) =>
    save(
      { security: { studentTwoFactorEnabled: enabled } },
      enabled
        ? "Students can use two-factor sign-in again."
        : "Two-factor sign-in is off for students.",
    );

  return (
    <div className="settings-content">
      <ConfirmActionModal
        id="platform-student-two-factor-off"
        isOpen={confirmingTwoFactorOff}
        onClose={() => setConfirmingTwoFactorOff(false)}
        onConfirm={() => {
          setConfirmingTwoFactorOff(false);
          setStudentTwoFactor(false);
        }}
        icon={ShieldSlash}
        tone="danger"
        emphasis="cancel"
        title="Turn off two-factor sign-in for students?"
        description="Students will sign in with their code or Google account alone, even those who set up an authenticator app or a passkey. Their setup is kept and asked for again if you turn this back on."
        cancelLabel="Keep it on"
        confirmLabel="Turn off"
        pendingLabel="Turning off…"
      />

      <header className="settings-detail__header">
        <div>
          <h2>Security</h2>
          <p>How students sign in, and what they need before they enrol.</p>
        </div>
      </header>

      <section
        className="settings-section"
        aria-labelledby="platform-sign-in-heading"
      >
        <header className="settings-section__heading mb-3">
          <Fingerprint size={20} weight="duotone" />
          <div>
            <h3 id="platform-sign-in-heading">Two-factor sign-in</h3>
            <p>
              A second step after the sign-in code: an authenticator app or a
              passkey.
            </p>
          </div>
        </header>
        <div className="settings-row-list">
          <SettingRow
            className={ROW_CLASS}
            icon={ShieldCheck}
            label="Students"
            note={
              studentTwoFactorEnabled
                ? "Students can turn it on in Settings > Privacy & Security, and are asked for it each time they sign in."
                : "Off: students are never asked for a second step and cannot turn it on."
            }
          >
            <SettingsToggle
              checked={studentTwoFactorEnabled}
              label="Two-factor sign-in for students"
              onChange={(enabled) => {
                if (enabled) setStudentTwoFactor(true);
                else setConfirmingTwoFactorOff(true);
              }}
            />
          </SettingRow>
          <SettingRow
            className={ROW_CLASS}
            icon={UserGear}
            label="Admins and instructors"
            note="Always sign in with a second step, to protect courses, payments and student records."
          >
            <StatusNote>Always on</StatusNote>
          </SettingRow>
        </div>
      </section>

      <section
        className="settings-section"
        aria-labelledby="platform-enrolment-heading"
      >
        <header className="settings-section__heading mb-3">
          <IdentificationCard size={20} weight="duotone" />
          <div>
            <h3 id="platform-enrolment-heading">Enrolment</h3>
            <p>What a student confirms before they can join a course.</p>
          </div>
        </header>
        <div className="settings-row-list">
          <SettingRow
            className={ROW_CLASS}
            icon={DeviceMobile}
            label="Verified mobile number"
            note="Students confirm their mobile number with a text message code before they enrol in any course, free or paid."
          >
            <SettingsToggle
              checked={requireVerifiedPhoneForEnrollment}
              label="Require a verified mobile number to enrol"
              onChange={(required) =>
                save(
                  {
                    security: { requireVerifiedPhoneForEnrollment: required },
                  },
                  required
                    ? "Students now verify their mobile number to enrol."
                    : "Students can enrol without a verified mobile number.",
                )
              }
            />
          </SettingRow>
        </div>
      </section>
    </div>
  );
}
