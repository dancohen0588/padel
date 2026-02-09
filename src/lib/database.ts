import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? "";

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable");
}

const database = postgres(databaseUrl, { ssl: "require" });

export const getDatabaseClient = () => {
  console.info("[db-debug] getDatabaseClient initialized");
  return database;
};
