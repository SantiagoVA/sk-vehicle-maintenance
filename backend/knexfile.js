/**
 * Knex config. One codebase, two possible databases, picked entirely by
 * environment variables (see .env.example):
 *
 *   DATABASE_CLIENT=sqlite3  + DATABASE_URL=./data/bookings.sqlite3   (local dev)
 *   DATABASE_CLIENT=pg       + DATABASE_URL=postgres://...            (cloud)
 *
 * No code changes are needed to move from one to the other — just the
 * .env values. Run `npm run migrate` after switching to create the
 * `bookings` table in the new database.
 */
require("dotenv").config();

const client = process.env.DATABASE_CLIENT || "better-sqlite3";

const base = {
  client,
  migrations: {
    directory: "./src/migrations",
    tableName: "knex_migrations",
  },
};

if (client === "better-sqlite3" || client === "sqlite3") {
  module.exports = {
    ...base,
    connection: { filename: process.env.DATABASE_URL || "./data/bookings.sqlite3" },
    useNullAsDefault: true,
  };
} else {
  // Postgres (or any other client — connectionString works the same way
  // for mysql2, etc. if you ever want to switch again).
  module.exports = {
    ...base,
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    },
  };
}
