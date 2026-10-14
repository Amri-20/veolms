import { z } from "zod";

/**
 * The academy's name and logo as its emails and pages present them. Set
 * during setup and changed later by an administrator.
 */
export const academyBrandResponseSchema = z.object({
  name: z.string().max(255).meta({ example: "ProCodrr" }),
  logoUrl: z
    .string()
    .nullable()
    .meta({ example: "https://www.procodrr.dev/static/email-logo.png" }),
});

export const updateAcademyBrandRequestSchema = z.object({
  name: z.string().trim().min(1, "Enter the academy's name").max(255),
  /**
   * A public https address. Mail apps load the logo from it, and most block
   * plain http images.
   */
  logoUrl: z
    .url({
      protocol: /^https$/,
      message: "Enter a public https:// address for the logo",
    })
    .max(2000)
    .nullable(),
});

export type AcademyBrandResponse = z.output<typeof academyBrandResponseSchema>;
export type UpdateAcademyBrandRequest = z.input<
  typeof updateAcademyBrandRequestSchema
>;
