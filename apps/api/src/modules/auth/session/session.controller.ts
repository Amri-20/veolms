import type { SessionParams } from "@veolms/contracts";
import type { FastifyRequest } from "fastify";

import {
  SESSION_IP_ADDRESS_MAX_LENGTH,
  SESSION_USER_AGENT_MAX_LENGTH,
} from "../shared/auth.constants.ts";
import type { AuthContext } from "../shared/auth.context.ts";

export function createSessionController(context: AuthContext) {
  const { sessionService } = context;

  async function list(request: FastifyRequest) {
    const currentSessionId = request.session!.id;
    const sessions = await sessionService.listSessions(request.user!.id);

    // Sessions stored before these details were bounded on write can still
    // hold longer values; one such row must not fail the whole list.
    return sessions.map((session) => ({
      id: session.id,
      ipAddress:
        session.ip_address?.slice(0, SESSION_IP_ADDRESS_MAX_LENGTH) ?? null,
      userAgent:
        session.user_agent?.slice(0, SESSION_USER_AGENT_MAX_LENGTH) ?? null,
      isCurrent: session.id === currentSessionId,
      lastUsedAt: session.last_used_at.toISOString(),
    }));
  }

  async function revoke(request: FastifyRequest<{ Params: SessionParams }>) {
    await sessionService.revokeSession(request.user!.id, request.params.id);
    return { message: "Session revoked" };
  }

  async function revokeAll(request: FastifyRequest) {
    await sessionService.revokeOtherSessions(
      request.user!.id,
      request.session!.id,
    );
    return { message: "All other sessions revoked" };
  }

  return { list, revoke, revokeAll };
}

export type SessionController = ReturnType<typeof createSessionController>;
