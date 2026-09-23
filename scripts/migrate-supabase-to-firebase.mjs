import admin from "firebase-admin";
import pg from "pg";
import fs from "fs";

const { Client } = pg;

/*
 * Load migration-specific environment variables.
 *
 * These live in .env.migration.local and are deliberately kept
 * separate from the normal Next.js environment.
 */
const migrationEnv = ".env.migration.local";

if (fs.existsSync(migrationEnv)) {
  const lines = fs.readFileSync(migrationEnv, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const equals = trimmed.indexOf("=");

    if (equals === -1) continue;

    const key = trimmed.slice(0, equals).trim();
    const value = trimmed.slice(equals + 1).trim();

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const dryRun = process.argv.includes("--dry-run");

console.log("");
console.log("======================================");
console.log(" RC Endurance Series Migration");
console.log("======================================");
console.log("");

if (dryRun) {
  console.log("DRY RUN MODE");
  console.log("No Firebase data will be written.");
} else {
  console.log("LIVE MIGRATION MODE");
  console.log("Firebase data WILL be written.");
}

console.log("");

const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
  "FIREBASE_SERVICE_ACCOUNT_PATH",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in .env.migration.local`);
  }
}

if (!fs.existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
  throw new Error(
    `Firebase service account file not found:\n${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}`
  );
}

const serviceAccount = JSON.parse(
  fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");

const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
};

async function fetchTable(table) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?select=*`,
    { headers }
  );

  if (response.status === 404) {
    console.warn(`Skipping ${table}: table not found.`);
    return [];
  }

  if (!response.ok) {
    throw new Error(
      `${table}: ${response.status} ${await response.text()}`
    );
  }

  return response.json();
}

const tables = [
  "profiles",
  "drivers",
  "rounds",
  "driver_availability",
  "teams",
  "team_drivers",
  "team_shortlist",
  "conversations",
  "messages",
  "team_driver_requests",
];

console.log("Reading application data from Supabase...");
console.log("");

const rows = {};

for (const table of tables) {
  rows[table] = await fetchTable(table);
}

const teamsById = new Map(
  rows.teams.map((team) => [team.id, team])
);

for (const conversation of rows.conversations) {
  conversation.manager_id ||= 
    teamsById.get(conversation.team_id)?.manager_id || null;
}

for (const request of rows.team_driver_requests) {
  request.manager_id ||= 
    teamsById.get(request.team_id)?.manager_id || null;
}

/*
 * Read Supabase Auth users directly from PostgreSQL.
 */

console.log("Reading Supabase Auth users...");

const dbUrl = new URL(process.env.SUPABASE_DB_URL);

console.log(
  `Connecting to Supabase PostgreSQL at ${dbUrl.hostname}:${dbUrl.port || "5432"}...`
);

const pgClient = new Client({
  connectionString: dbUrl.toString(),
  ssl: {
    rejectUnauthorized: false,
  },
});

await pgClient.connect();

const authResult = await pgClient.query(`
  select
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  from auth.users
  where email is not null
  order by id
`);

await pgClient.end();

const authUsers = authResult.rows;

console.log("");
console.log("======================================");
console.log(" Migration Preview");
console.log("======================================");
console.log("");

console.log(`Supabase Auth users:       ${authUsers.length}`);

const bcryptUsers = authUsers.filter(
  (user) =>
    user.encrypted_password &&
    /^\$2[aby]\$\d{2}\$/.test(user.encrypted_password)
);

const nonBcryptUsers = authUsers.filter(
  (user) =>
    user.encrypted_password &&
    !/^\$2[aby]\$\d{2}\$/.test(user.encrypted_password)
);

console.log(`Users with bcrypt hashes:  ${bcryptUsers.length}`);
console.log(`Users needing attention:   ${nonBcryptUsers.length}`);

console.log("");

for (const table of tables) {
  console.log(
    `${table.padEnd(26)} ${rows[table].length}`
  );
}

console.log("");

/*
 * Show users that may require attention.
 */

if (nonBcryptUsers.length) {
  console.log("Users with non-bcrypt password hashes:");
  console.log("");

  for (const user of nonBcryptUsers) {
    console.log(
      `  ${user.email} (${user.id})`
    );
  }

  console.log("");
}

/*
 * Check that important relationships look sane.
 */

console.log("Relationship checks:");
console.log("");

const driverIds = new Set(
  rows.drivers.map((driver) => driver.profile_id)
);

const profileIds = new Set(
  rows.profiles.map((profile) => profile.id)
);

const teamIds = new Set(
  rows.teams.map((team) => team.id)
);

let orphanDrivers = 0;
let orphanTeamDrivers = 0;
let orphanAvailability = 0;

for (const driver of rows.drivers) {
  if (!profileIds.has(driver.profile_id)) {
    orphanDrivers++;
  }
}

for (const membership of rows.team_drivers) {
  if (!teamIds.has(membership.team_id)) {
    orphanTeamDrivers++;
  }

  if (!driverIds.has(membership.driver_id)) {
    orphanTeamDrivers++;
  }
}

for (const availability of rows.driver_availability) {
  if (!driverIds.has(availability.driver_id)) {
    orphanAvailability++;
  }
}

console.log(
  `Driver records without profile: ${orphanDrivers}`
);

console.log(
  `Team-driver relationship issues: ${orphanTeamDrivers}`
);

console.log(
  `Availability records without driver: ${orphanAvailability}`
);

console.log("");

/*
 * DRY RUN STOPS HERE.
 *
 * Nothing has been written to Firebase.
 */

if (dryRun) {
  console.log("======================================");
  console.log(" DRY RUN COMPLETE");
  console.log("======================================");
  console.log("");
  console.log("No Firebase users were imported.");
  console.log("No Firestore documents were written.");
  console.log("");
  console.log("Review the numbers above before running");
  console.log("the real migration.");
  console.log("");

  process.exit(0);
}

/*
 * LIVE MIGRATION
 *
 * This section only runs without --dry-run.
 */

console.log("Starting LIVE Firebase migration...");
console.log("");

const imported = [];
const skipped = [];

const migrationSummary = {
  authImported: 0,
  firestoreWritten: 0,
  firestoreByTable: {},
};

/*
 * Import Auth users while preserving their existing Supabase UID
 * and bcrypt password hash.
 */

for (let i = 0; i < authUsers.length; i += 1000) {
  const chunk = authUsers.slice(i, i + 1000);

  const records = [];

  for (const user of chunk) {
    const record = {
      uid: String(user.id),
      email: user.email,
      emailVerified: Boolean(user.email_confirmed_at),
      disabled: false,

      ...(user.phone
        ? { phoneNumber: user.phone }
        : {}),

      ...(user.raw_user_meta_data?.name
        ? { displayName: user.raw_user_meta_data.name }
        : {}),
    };

    if (user.encrypted_password) {
      if (!/^\$2[aby]\$\d{2}\$/.test(user.encrypted_password)) {
        skipped.push({
          uid: user.id,
          email: user.email,
          reason: "password hash is not bcrypt",
        });

        continue;
      }

      record.passwordHash = Buffer.from(
        user.encrypted_password,
        "utf8"
      );
    }

    records.push(record);
  }

  if (!records.length) continue;

  const result = await auth.importUsers(records, {
    hash: {
      algorithm: "BCRYPT",
    },
  });

  const failedIndexes = new Set();

  for (const error of result.errors) {
    const failed = records[error.index];

    failedIndexes.add(error.index);

    skipped.push({
      uid: failed?.uid,
      email: failed?.email,
      reason:
        error.error?.message ||
        String(error.error),
    });
  }

records.forEach((record, index) => {
  if (!failedIndexes.has(index)) {
    imported.push(record.uid);
    migrationSummary.authImported++;
  }
});
}

/*
 * Copy application data to Firestore.
 */

function idFor(table, row) {
  if (table === "drivers") {
    return row.profile_id;
  }

  if (table === "driver_availability") {
    return `${row.driver_id}_${row.round_id}`;
  }

  if (table === "team_drivers") {
    return `${row.team_id}_${row.driver_id}_${row.round_id}`;
  }

  if (table === "team_shortlist") {
    return `${row.manager_id}_${row.driver_id}`;
  }

  return row.id;
}

function clean(row) {
  return Object.fromEntries(
    Object.entries(row).map(
      ([key, value]) => [
        key,
        value === undefined ? null : value,
      ]
    )
  );
}

let batch = db.batch();
let count = 0;

async function write(table, row) {
  const id = idFor(table, row);

  if (!id) {
    console.warn(
      `Skipping ${table} row with no usable ID:`,
      row
    );
    return;
  }

  const data = clean(row);

  delete data.__typename;

  batch.set(
    db.collection(table).doc(String(id)),
    data,
    { merge: true }
  );

  count++;
  
  migrationSummary.firestoreWritten++;
migrationSummary.firestoreByTable[table] =
  (migrationSummary.firestoreByTable[table] || 0) + 1;

  if (count >= 450) {
    await batch.commit();

    batch = db.batch();
    count = 0;
  }
}

for (const table of tables) {
  for (const row of rows[table]) {
    await write(table, row);
  }
}

if (count) {
  await batch.commit();
}

console.log("");
console.log("======================================");
console.log(" Migration complete");
console.log("======================================");
console.log("");

console.log(
  `Auth users imported: ${imported.length}`
);

console.log(
  `Auth users skipped/failed: ${skipped.length}`
);

for (const table of tables) {
  console.log(
    `${table}: ${rows[table].length}`
  );
}

if (skipped.length) {
  console.log("");
  console.log("Auth users needing attention:");

  for (const item of skipped) {
    console.log(JSON.stringify(item));
  }
}

console.log("");
console.log("Migration verification summary:");
console.log("");
console.log(`Auth users imported: ${migrationSummary.authImported}`);
console.log(
  `Firestore documents written: ${migrationSummary.firestoreWritten}`
);

for (const [table, total] of Object.entries(
  migrationSummary.firestoreByTable
)) {
  console.log(`${table}: ${total}`);
}

console.log("");
console.log(
  "IMPORTANT: Do not delete the Supabase project until all migrated accounts and workflows have been tested."
);