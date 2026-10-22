import { DeviceMobileIcon as DeviceMobile } from "@phosphor-icons/react/DeviceMobile";
import { FingerprintIcon as Fingerprint } from "@phosphor-icons/react/Fingerprint";
import { IdentificationCardIcon as IdentificationCard } from "@phosphor-icons/react/IdentificationCard";
import { UserGearIcon as UserGear } from "@phosphor-icons/react/UserGear";
import {
  SettingRow,
  SettingsToggle,
  StatusNote,
} from "../settings/SettingsControls";
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

  if (!settings) {
    return (
      <PlatformSettingsStatus
        isError={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { requireVerifiedPhoneForEnrollment } = settings.security;

  return (
    <div className="settings-content">
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
              A second step after the sign-in code, an authenticator app or a
              passkey, for the academy&rsquo;s team. Students sign in without
              one.
            </p>
          </div>
        </header>
        <div className="settings-row-list">
          <SettingRow
            className={ROW_CLASS}
            icon={UserGear}
            label="Admins, instructors and team members"
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
