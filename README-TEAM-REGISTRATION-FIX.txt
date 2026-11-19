# RC Endurance Series — Team Registration Fix

This is an overlay/update ZIP for the existing `rc-endurance-series` project, not a complete copy of the repository.

## Apply it

1. Download the current project from GitHub (`Code` → `Download ZIP`) or open your local project folder.
2. Extract this ZIP into the **root of the existing project**, keeping the folder structure and allowing files to be overwritten.
3. Check that the new `app/api/...` folders are merged into the existing `app` folder.
4. Run `npm install` if needed, then `npm run build`.
5. Deploy the updated project to Vercel.
6. In Firebase Console → Firestore Database → Rules, publish the included `firestore.rules`.

## What changes

- Team applications are submitted and read through authenticated server routes using Firebase Admin.
- Drivers can submit one pending application at a time. A rejected applicant can apply again.
- Admin navigation gains a **Team Applications** page.
- Admins can approve or reject applications and add an optional note.
- Approval creates the team, changes the applicant's profile role to `team_manager`, and uses the application document ID as the team ID. This preserves the convention used by the existing team deletion endpoint.
- Direct client access to `team_applications` is denied by Firestore rules; the server routes perform the permission checks.

## Required deployment configuration

The existing `FIREBASE_SERVICE_ACCOUNT_JSON` server environment variable must already be configured in Vercel, as required by the project's existing Firebase Admin routes.

## Important

This ZIP does not include the rest of the repository, `node_modules`, environment files, Firebase credentials, or the public image assets. It is intended to be extracted over your existing project, not deployed on its own.

After deployment, test with a normal driver account:
1. Submit a new team application.
2. Sign in as an admin and open Admin → Team Applications.
3. Approve the application.
4. Sign back in as the applicant and confirm the Team Area is available.
