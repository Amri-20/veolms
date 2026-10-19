export {
  createEmailService,
  type EmailAttachment,
  type EmailDeliveryResult,
  type EmailSendOptions,
  type EmailService,
  type EmailServiceOptions,
  type EmailTransportConfig,
} from "./email.service.ts";
export {
  deactivatedAccountSignInEmail,
  escapeHtml,
  otpVerificationEmail,
  teamMemberAddedEmail,
  type EmailContent,
  type OtpVerificationInput,
  type TeamMemberAddedInput,
} from "./email.templates.ts";
