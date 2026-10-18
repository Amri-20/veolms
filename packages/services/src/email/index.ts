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
  type EmailContent,
  type OtpVerificationInput,
} from "./email.templates.ts";
