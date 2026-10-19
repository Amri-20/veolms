import type { Database } from "@veolms/database";
import {
  teamMemberAddedEmail,
  type EmailService,
} from "@veolms/services/email";
import type { FastifyBaseLogger } from "fastify";
import type { Kysely } from "kysely";
import { config } from "../../../config.ts";
import { createAcademyBrandService } from "../../academy/academy-brand.service.ts";
import { findUserDisplayName } from "../members/members.repository.ts";

/**
 * Team emails go out after the change has committed. A failed send is
 * logged and never fails the request: the change already applies.
 */
export function createTeamMailer({
  database,
  email,
  log,
}: {
  database: Kysely<Database>;
  email: EmailService;
  log: FastifyBaseLogger;
}) {
  const brandService = createAcademyBrandService({ database });

  async function memberAdded(input: {
    to: string;
    addedByUserId: string;
    roleNames: readonly string[];
  }): Promise<boolean> {
    try {
      const [brand, addedByName] = await Promise.all([
        brandService.getBrand(),
        findUserDisplayName(database, input.addedByUserId),
      ]);
      const result = await email.send(
        input.to,
        teamMemberAddedEmail({
          academyName: brand.name,
          logoUrl: brand.logoUrl,
          addedByName,
          roleNames: input.roleNames,
          openUrl: config.WEB_URL,
        }),
      );
      return result.status !== "failed";
    } catch (error) {
      log.warn({ err: error }, "Team member email was not sent");
      return false;
    }
  }

  return { memberAdded };
}

export type TeamMailer = ReturnType<typeof createTeamMailer>;
