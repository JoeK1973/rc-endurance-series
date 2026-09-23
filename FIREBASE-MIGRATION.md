# Supabase → Firebase migration

This version of RC Endurance Series uses **Firebase Authentication + Cloud Firestore** in the browser. The old Supabase runtime dependencies and client are no longer used.

## Why this changes the project

Supabase's Free Plan can pause low-activity projects after a 7-day period. Firebase does not use that same inactivity-pausing model. Firebase's Spark plan currently provides a no-cost Firestore allowance of 50,000 reads/day, 20,000 writes/day, 20,000 deletes/day and 1 GiB stored data. Quotas still apply, so usage should be monitored.

## Firebase setup

1. Create a Firebase project.
2. Add a **Web App** to the project.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Create **Cloud Firestore**.
5. Deploy `firestore.rules`.
6. Copy the Web App configuration into `.env.local` using `.env.example`.
7. Keep the Firebase web configuration in the client app; do **not** put a Firebase Admin service-account key in `.env.local` or commit it.

Example:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Firestore collections

The migration maps the current relational model to these collections:

- `profiles/{userId}`
- `drivers/{userId}`
- `rounds/{roundId}`
- `driver_availability/{driverId_roundId}`
- `teams/{teamId}`
- `team_drivers/{teamId_driverId_roundId}`
- `team_shortlist/{managerId_driverId}`
- `team_driver_requests/{requestId}`
- `conversations/{conversationId}`
- `messages/{messageId}`

Conversation documents also carry `manager_id`. This makes secure Firestore queries possible without looking up the manager through a relational join.

## Existing Supabase data

The project includes:

`scripts/migrate-supabase-to-firebase.mjs`

It copies the current application tables through the Supabase REST API and writes them to Firestore. It also adds `manager_id` to conversations and team-driver requests from the corresponding team.

Set these environment variables **only in your local migration shell**:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Then run:

```bash
node scripts/migrate-supabase-to-firebase.mjs
```

The Supabase service-role key and Firebase service-account JSON are secrets. Never put either into `NEXT_PUBLIC_*` variables, GitHub, or browser code.

### Authentication migration

The script intentionally does **not** copy passwords. Firebase Authentication does not accept the Supabase password records through this simple data-copy process.

For this application, the clean first migration is:

- migrate the application data;
- have users register/login through Firebase;
- if existing user IDs must be preserved, use a dedicated Firebase Auth password-hash migration rather than inventing new IDs.

If preserving existing user IDs is important, stop before deleting Supabase and handle Auth migration separately.

## Admin account

Firestore rules allow round administration only to a profile whose `role` is `admin`.

After the first Firebase account is registered, set that user's profile document:

```text
profiles/<YOUR_FIREBASE_UID>
role = admin
```

Do this from the Firebase console or a trusted server-side/admin script. Do not expose service-account credentials in the browser.

## Hosting

The application can remain on Vercel. Firebase is being used for Authentication and Firestore; there is no requirement to move the Next.js hosting at the same time.

## Important implementation note

The Firebase client includes a small compatibility layer so the existing application screens can continue using the familiar `from(...).select(...).eq(...).insert(...)` style while the actual storage is Firestore. This keeps the migration focused on the backend rather than rewriting every screen at once.

The compatibility layer also replaces Supabase Realtime for the message thread with a Firestore `onSnapshot` listener.
