import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const database = postgres(databaseUrl, {
  ssl: "require",
  prepare: false,  // désactive les prepared statements (compatibilité Supabase)
  max: 10,
});

export const getDatabaseClient = () => {
  return database;
};