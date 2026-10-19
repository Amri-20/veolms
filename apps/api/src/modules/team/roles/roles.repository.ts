import { sql } from "kysely";
import type { DatabaseExecutor as Executor } from "@veolms/database";

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permissions: string[];
  member_count: number;
}

/** Every role except student, which is not a team role. */
export async function listTeamRoles(
  database: Executor,
  roleId?: string,
): Promise<RoleRow[]> {
  return await database
    .selectFrom("roles as r")
    .select([
      "r.id",
      "r.name",
      "r.description",
      "r.is_system",
      sql<string[]>`coalesce((
        select array_agg(p.permission_key order by p.permission_key)
        from role_permissions rp
        join permissions p on p.id = rp.permission_id
        where rp.role_id = r.id and rp.effect = 'allow'
      ), '{}')`.as("permissions"),
      sql<number>`(
        select count(distinct ra.user_id)::int
        from role_assignments ra
        join users u on u.id = ra.user_id and u.is_deleted = false
        where ra.role_id = r.id
          and ra.scope_type = 'platform'
          and (ra.expires_at is null or ra.expires_at > now())
      )`.as("member_count"),
    ])
    .where("r.name", "<>", "student")
    .$if(Boolean(roleId), (qb) => qb.where("r.id", "=", roleId!))
    .orderBy("r.is_system", "desc")
    .orderBy("r.name")
    .execute();
}

export async function isRoleNameTaken(
  database: Executor,
  name: string,
  exceptRoleId?: string,
): Promise<boolean> {
  const row = await database
    .selectFrom("roles")
    .select("id")
    .where(sql<boolean>`lower(name) = lower(${name.trim()})`)
    .$if(Boolean(exceptRoleId), (qb) => qb.where("id", "<>", exceptRoleId!))
    .executeTakeFirst();
  return Boolean(row);
}

export async function insertRole(
  database: Executor,
  role: { id: string; name: string; description: string | null },
): Promise<void> {
  await database
    .insertInto("roles")
    .values({
      id: role.id,
      name: role.name,
      description: role.description,
      is_system: false,
    })
    .execute();
}

export async function updateRole(
  database: Executor,
  roleId: string,
  changes: { name: string; description: string | null },
): Promise<void> {
  await database
    .updateTable("roles")
    .set({ ...changes, updated_at: new Date() })
    .where("id", "=", roleId)
    .execute();
}

export async function replaceRolePermissions(
  database: Executor,
  roleId: string,
  permissionKeys: readonly string[],
): Promise<void> {
  await database
    .deleteFrom("role_permissions")
    .where("role_id", "=", roleId)
    .execute();
  if (permissionKeys.length === 0) return;
  await database
    .insertInto("role_permissions")
    .columns(["role_id", "permission_id", "effect"])
    .expression((eb) =>
      eb
        .selectFrom("permissions")
        .select([
          sql<string>`${roleId}::uuid`.as("role_id"),
          "id",
          sql<"allow">`'allow'`.as("effect"),
        ])
        .where("permission_key", "in", permissionKeys),
    )
    .execute();
}

/** People holding the role plus open invitations that would grant it. */
export async function countRoleUsage(
  database: Executor,
  roleId: string,
): Promise<number> {
  const row = await database
    .selectNoFrom([
      sql<number>`(
        (select count(*) from role_assignments where role_id = ${roleId}::uuid)
        + (select count(*) from team_invitation_roles tir
           join team_invitations ti on ti.id = tir.invitation_id
           where tir.role_id = ${roleId}::uuid
             and ti.accepted_at is null and ti.revoked_at is null
             and ti.expires_at > now())
      )::int`.as("usage"),
    ])
    .executeTakeFirstOrThrow();
  return row.usage;
}

export async function deleteRole(
  database: Executor,
  roleId: string,
): Promise<void> {
  // Closed invitations may still name the role; they keep their history
  // without it.
  await database
    .deleteFrom("team_invitation_roles")
    .where("role_id", "=", roleId)
    .execute();
  await database.deleteFrom("roles").where("id", "=", roleId).execute();
}
