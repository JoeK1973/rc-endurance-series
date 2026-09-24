"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/firebase/client";

type UserState = { email: string; role: string } | null;

export default function AuthNav() {
  const [state, setState] = useState<UserState>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState(null); setLoading(false); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setState({ email: user.email || "Account", role: profile?.role || "driver" });
      setLoading(false);
    }
    void load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;
  if (!state) return <><Link className="nav" href="/register">Register</Link><Link className="nav" href="/login">Login</Link></>;

  const isTeamManager = ["team_manager", "admin", "superuser"].includes(state.role);
  const isAdmin = ["admin", "superuser"].includes(state.role);

  return (
    <>
      <Link className="nav" href="/driver-area">Driver Area</Link>
      {isTeamManager && <Link className="nav" href="/teams">Team Area</Link>}
      {isAdmin && <Link className="nav" href="/admin">Admin</Link>}
      <button className="linkButton" onClick={async () => { await createClient().auth.signOut(); window.location.href = "/"; }}>Logout</button>
    </>
  );
}
