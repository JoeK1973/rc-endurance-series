# RC Endurance Series

## Deploy

1. Upload this project to GitHub.
2. In Supabase, run `supabase/schema.sql` in the SQL Editor.
3. In Vercel, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Add the variables to Production, Preview and Development.
5. Redeploy.

## Login and registration

The navigation contains `/login` and `/register`.

For Supabase email confirmation, add your Vercel domain to Supabase:
Authentication → URL Configuration → Redirect URLs.

Add:
`https://YOUR-VERCEL-DOMAIN/login`

Set the Site URL to:
`https://YOUR-VERCEL-DOMAIN`

## First admin

After registering, run:

```sql
update profiles
set role = 'admin'
where email = 'YOUR_EMAIL_ADDRESS';
```

## Existing installations: Admin rounds fix
If you already ran the previous schema, run `supabase/admin-rounds-fix.sql` in Supabase SQL Editor, then set your account role to admin.
