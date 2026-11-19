"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";
import AppIcon from "@/components/AppIcon";

type Role = "driver" | "team_manager" | "admin" | "superuser";

const options = {
  driver: [
    { title: "Driver Area", description: "Manage your driver profile, availability and invitations.", href: "/driver-area" },
    { title: "Find a Team", description: "Find teams that are actively looking for drivers.", href: "/find-a-team" },
    { title: "Register a New Team", description: "Apply to create and manage an endurance racing team.", href: "/register-team" },
    { title: "Inbox", description: "View and reply to your messages.", href: "/messages" },
  ],
  manager: [
    { title: "Driver Area", description: "Manage your driver profile and availability.", href: "/driver-area" },
    { title: "Teams Area", description: "Manage your team, drivers and round registrations.", href: "/teams" },
    { title: "Inbox", description: "View and reply to your messages.", href: "/messages" },
  ],
  admin: [
    { title: "Driver Area", description: "Manage your driver profile and availability.", href: "/driver-area" },
    { title: "Teams Area", description: "Manage your team, drivers and round registrations.", href: "/teams" },
    { title: "Admin Area", description: "Manage the championship and website administration.", href: "/admin" },
    { title: "Inbox", description: "View and reply to your messages.", href: "/messages" },
  ],
};

export default function HomeOptions() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const client = createClient();
    async function load() {
      const { data: { user } } = await client.auth.getUser();
      if (!user) { if (active) { setRole(null); setLoading(false); } return; }
      const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (active) { setRole((profile?.role || "driver") as Role); setLoading(false); }
    }
    void load();
    const { data: { subscription } } = client.auth.onAuthStateChange(() => { void load(); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  if (loading) return <><h1>RC Endurance Series</h1><p className="muted">Loading your home page...</p></>;

  const items = !role ? [] : (role === "admin" || role === "superuser") ? options.admin : role === "team_manager" ? options.manager : options.driver;
  return (
    <div className="publicHomePage">
      <div className="pageHeading">
        <div className="eyebrow">RADIO CONTROL ENDURANCE RACING</div>
        <h1>RC Endurance Series</h1>
        <p className="muted">Your championship hub for drivers, teams and endurance racing.</p>
      </div>

      <Link className="card publicFeatureCard" href="/championship">
        <span className="publicFeatureIcon"><AppIcon name="trophy" size={25} /></span>
        <span className="publicFeatureCopy"><strong>Championship</strong><small>Explore the calendar, regulations and published race results.</small></span>
        <AppIcon name="chevron-right" size={21} />
      </Link>

      {!role ? (
        <section className="card publicWelcomeCard">
          <div><h2>Get involved</h2><p className="muted">Sign in or register to access your driver area and take part in the championship.</p></div>
          <div className="actions"><Link className="btn" href="/register">Register</Link><Link className="btn secondary" href="/login">Login</Link></div>
        </section>
      ) : (
        <section className="publicHomeSection">
          <div className="publicSectionHeading"><h2>Your areas</h2><p className="muted">Quick access to your racing activity and account.</p></div>
          <div className="grid two">
            {items.map((item) => <Link className="card homeOptionCard" href={item.href} key={item.href}><h2>{item.title}</h2><p className="muted">{item.description}</p><span className="homeOptionAction">Open {item.title} <AppIcon name="chevron-right" size={15} /></span></Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
