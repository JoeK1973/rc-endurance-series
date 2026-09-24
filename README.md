# RC Endurance Series

Next.js application for the RC Endurance Series driver/team marketplace.

## Backend

This version uses:

- Firebase Authentication
- Cloud Firestore
- Firebase Security Rules
- Vercel for Next.js hosting (recommended for the current project)

Supabase is no longer required at runtime.

## Local setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env.local` and enter the Firebase Web App configuration.

```text
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Enable **Email/Password** authentication in Firebase Authentication and create a Firestore database.

## Firebase rules

Deploy the included `firestore.rules` with the Firebase CLI:

```bash
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules
```

## First admin

Register the first account, then in Firebase Console edit:

```text
profiles/<YOUR_FIREBASE_UID>
```

and set:

```text
role = admin
```

The Firestore rules use this role for round administration.

## Existing Supabase data

See `FIREBASE-MIGRATION.md`.

The included migration script copies the current application data from Supabase to Firestore. It does not automatically copy passwords. Do not delete the old Supabase project until the Firebase version has been tested.

## Vercel

Add the six `NEXT_PUBLIC_FIREBASE_*` variables to the Vercel project and redeploy.

You do not need to move the Next.js hosting to Firebase just because the database/auth backend has moved.

## Team registration and administrator setup

Users can apply to register a team from the homepage. Applications are reviewed in **Admin → Manage Teams**. Approval atomically creates the team and grants the applicant the `team_manager` role.

The `superuser` role is above `admin`. Superusers have all admin permissions and can promote existing registered users to `admin` or remove admin permission in **Admin → Manage Admins**.

### One-time superuser bootstrap

The first superuser must be assigned manually in the Firebase Console. After the intended account has registered and its `profiles/{uid}` document exists, change that profile's `role` field to:

```text
superuser
```

Do not create a second superuser unless you deliberately want more than one account with that permission.
