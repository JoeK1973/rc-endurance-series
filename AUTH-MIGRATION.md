# Existing-account migration (Option 2)

This migration preserves the existing Supabase user IDs and imports the existing bcrypt password hashes into Firebase Authentication. That means application records such as `profiles`, `drivers`, `teams`, conversations and messages can continue to refer to the same user IDs.

Firebase's Admin SDK supports bulk user import with bcrypt hashes. Supabase Auth stores password hashes in `auth.users.encrypted_password` using bcrypt.

## Before running

1. Create the Firebase project and enable **Email/Password** sign-in.
2. Create Firestore in production/locked mode.
3. Create a Firebase service account and download its JSON key.
4. In Supabase Dashboard, obtain the Postgres connection string from **Connect**. Use the direct database connection or another connection string that can query `auth.users`.
5. Keep the Supabase service-role key, database URL and Firebase service-account JSON private. Do not commit them to GitHub.

## Install

```bash
npm install
```

## Set migration environment variables

Copy `.env.migration.example` to a private environment file or export the variables in your terminal.

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

## Run

```bash
npm run migrate
```

The script:

1. Reads Supabase Auth users directly from `auth.users`.
2. Preserves each Supabase UUID as the Firebase UID.
3. Imports bcrypt password hashes so users keep their existing passwords.
4. Preserves email verification state and basic user metadata.
5. Copies application tables to Firestore while preserving IDs.
6. Uses the preserved IDs for all existing relationships.

## Important limitation

This project currently uses email/password authentication. If the Supabase project also contains users whose only sign-in method is an external provider (Google, Apple, etc.), those provider identities need a separate provider migration. The script does not invent provider credentials.

## Verification

After migration, test with an existing account:

- Sign in with the old email and password.
- Confirm the UID is unchanged.
- Open the driver profile.
- Check availability.
- Check team membership/shortlist.
- Send and receive a message.
- Confirm admin access for the existing admin account.

Only after those tests pass should Supabase be considered for final shutdown.
