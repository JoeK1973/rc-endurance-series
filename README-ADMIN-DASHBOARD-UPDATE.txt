RC ENDURANCE SERIES — ADMIN DASHBOARD UPDATE

This is a merge/update ZIP, not a complete standalone project.

Files included:
- components/AppIcon.tsx                 Shared lightweight SVG icon component
- components/AdminTabs.tsx               Grouped admin navigation
- components/AdminDashboard.tsx          New admin landing dashboard
- app/admin/page.tsx                     Admin dashboard route
- app/admin/rounds/page.tsx              Existing rounds manager at its new route

Navigation groups:
1. Championship: Rounds, Results, Regulations
2. People & Teams: Drivers, Teams, Team Applications, Bodyshell Approvals
3. Operations: Registrations & Payments
4. System: Administrators, Settings

INSTALLATION
1. Extract this ZIP into the root of your existing project.
2. Allow the included files to overwrite existing files when prompted.
3. Run: npm run build
4. Deploy to Vercel.

IMPORTANT
- The old /admin rounds screen becomes the new dashboard.
- Round management is now at /admin/rounds.
- Existing data and database structures are not changed.
- All other existing admin pages retain their current routes and functionality.
- This update does not yet apply the site-wide dashboard redesign to Driver Area,
  Teams Area, Home or Championship. Those are subsequent stages.
