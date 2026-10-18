import { z } from "zod";

export const MAX_DISCUSSION_ATTACHMENT_DIMENSION = 16_384;

const optionalAttachmentDimensionSchema = z
  .number()
  .int()
  .positive()
  .max(MAX_DISCUSSION_ATTACHMENT_DIMENSION)
  .nullable()
  .optional();

export const attachmentDimensionsSchema = z
  .object({
    width: optionalAttachmentDimensionSchema,
    height: optionalAttachmentDimensionSchema,
  })
  .superRefine((value, context) => {
    const hasWidth = value.width !== undefined && value.width !== null;
    const hasHeight = value.height !== undefined && value.height !== null;
    if (hasWidth !== hasHeight) {
      context.addIssue({
        code: "custom",
        message: "Width and height must be supplied together.",
        path: [hasWidth ? "height" : "width"],
      });
    }
  });
export type AttachmentDimensions = z.infer<typeof attachmentDimensionsSchema>;

export const attachmentKindSchema = z.enum([
  "image",
  "screenshot",
  "code",
  "document",
]);
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;

export const attachmentTargetTypeSchema = z.enum(["thread", "reply", "note"]);
export type AttachmentTargetType = z.infer<typeof attachmentTargetTypeSchema>;

export const attachmentStatusSchema = z.enum([
  "uploading",
  "ready",
  "rejected",
  "deleted",
]);
export type AttachmentStatus = z.infer<typeof attachmentStatusSchema>;

/**
 * What the uploader gets back once a file is stored: enough to render the
 * attachment and to link it to a thread, reply or note by id. Storage keys,
 * ownership and link targets stay server-side.
 */
export const uploadedAttachmentSchema = z.object({
  id: z.uuid(),
  kind: attachmentKindSchema,
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  width: optionalAttachmentDimensionSchema,
  height: optionalAttachmentDimensionSchema,
});
export type UploadedAttachment = z.infer<typeof uploadedAttachmentSchema>;

export const initiateAttachmentUploadRequestSchema = z
  .object({
    courseId: z.uuid(),
    lessonId: z.uuid(),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    fileSize: z.number().int().positive().max(50_000_000),
    kind: attachmentKindSchema.optional(),
    width: optionalAttachmentDimensionSchema,
    height: optionalAttachmentDimensionSchema,
  })
  .superRefine((value, context) => {
    const result = attachmentDimensionsSchema.safeParse(value);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        });
      }
    }
  });
export type InitiateAttachmentUploadRequest = z.infer<
  typeof initiateAttachmentUploadRequestSchema
>;

export const initiateAttachmentUploadResponseSchema = z.object({
  attachmentId: z.uuid(),
  uploadUrl: z.url(),
});
export type InitiateAttachmentUploadResponse = z.infer<
  typeof initiateAttachmentUploadResponseSchema
>;

export const completeAttachmentUploadRequestSchema = z.object({
  attachmentId: z.uuid(),
});
export type CompleteAttachmentUploadRequest = z.infer<
  typeof completeAttachmentUploadRequestSchema
>;

export const learningUploadResponseSchema = z.object({
  id: z.uuid(),
  url: z.string().min(1),
  fileName: z.string().min(1),
  kind: attachmentKindSchema,
  mediaType: z.enum(["image", "video", "code", "document"]),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  status: attachmentStatusSchema,
  width: optionalAttachmentDimensionSchema,
  height: optionalAttachmentDimensionSchema,
});
export type LearningUploadResponse = z.infer<
  typeof learningUploadResponseSchema
>;

const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const TLD_PATTERN = /^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9]+)$/;
const DOMAIN_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

/**
 * Validates whether a hostname is a fully formed public domain name or valid IP.
 * Rejects single-label hosts like "ss", incomplete domains without TLD, or invalid characters.
 */
export function isValidPreviewHost(host: string): boolean {
  if (!host) return false;
  const cleanHost = host
    .toLowerCase()
    .trim()
    .replace(/^\.+|\.+$/g, "");
  if (!cleanHost) return false;

  if (IPV4_PATTERN.test(cleanHost)) {
    return true;
  }

  if (!cleanHost.includes(".")) {
    return false;
  }

  const parts = cleanHost.split(".");
  if (parts.length < 2) return false;

  // A hostname starting with "www." must have at least domain and TLD: www.<domain>.<tld>
  if (parts[0] === "www" && parts.length < 3) {
    return false;
  }

  const tld = parts[parts.length - 1];
  if (!tld || !TLD_PATTERN.test(tld)) {
    return false;
  }

  for (let i = 0; i < parts.length - 1; i++) {
    const label = parts[i];
    if (!label || !DOMAIN_LABEL_PATTERN.test(label)) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizes a URL input string by prepending https:// if it lacks a protocol.
 */
export function normalizePreviewUrl(urlString: string): string {
  if (!urlString || typeof urlString !== "string") return "";
  const trimmed = urlString.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ||
    /^(mailto|javascript|data):/i.test(trimmed)
  ) {
    return trimmed;
  }
  if (/^\/\//.test(trimmed)) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
}

/**
 * Validates whether a URL string is an HTTP/HTTPS URL with a fully formed domain or valid IP.
 */
export function isValidPreviewUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== "string") return false;
  const normalized = normalizePreviewUrl(urlString);
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return isValidPreviewHost(parsed.hostname);
  } catch {
    return false;
  }
}

export const linkPreviewQuerySchema = z.object({
  url: z
    .string()
    .transform(normalizePreviewUrl)
    .pipe(
      z.string().url().refine(isValidPreviewUrl, {
        message:
          "URL must contain a valid domain name with a supported top-level domain",
      }),
    ),
});
export type LinkPreviewQuery = z.infer<typeof linkPreviewQuerySchema>;

/** @deprecated Use linkPreviewQuerySchema */
export const createLinkPreviewRequestSchema = linkPreviewQuerySchema;
/** @deprecated Use LinkPreviewQuery */
export type CreateLinkPreviewRequest = LinkPreviewQuery;

export const linkPreviewResponseSchema = z.object({
  url: z.string().url(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  siteName: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});
export type LinkPreviewResponse = z.infer<typeof linkPreviewResponseSchema>;
