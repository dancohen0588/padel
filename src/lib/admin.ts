export const getAdminToken = () => process.env.ADMIN_TOKEN ?? "";

export const assertAdminToken = (token: string | null) => {
  const adminToken = getAdminToken();
  if (!adminToken) {
    throw new Error("ADMIN_TOKEN is not configured");
  }
  if (!token || token !== adminToken) {
    throw new Error("Unauthorized");
  }
};

export const getAdminGuardMigrationNote = () =>
  "Migration prévue: remplacer le token par un guard session/JWT + table admins (user_id) et helper lib/auth/isAdmin.ts.";
