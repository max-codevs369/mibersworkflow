export type RoleKey = "SUPER_ADMIN" | "ADMIN" | "MEMBER";

export const ROLE_NAME: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MEMBER: "Anggota",
};

export const ROLES = Object.keys(ROLE_NAME) as RoleKey[];

export const isAdminRole = (role?: string | null) => role === "ADMIN" || role === "SUPER_ADMIN";
export const isSuperRole = (role?: string | null) => role === "SUPER_ADMIN";
