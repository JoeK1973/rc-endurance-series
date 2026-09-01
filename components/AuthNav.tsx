"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type AuthState = {
  role: string;
  email: string;
} | null;

export default function AuthNav() {
  const [state, setState] = useState<AuthState>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setState({
        email: user.email || "Account",
        role: profile?.role || "driver",
      });

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return null;
  }

  if (!state) {
    return (
      <>
        <Link className="nav" href="/login">
          Login
        </Link>

        <Link className="nav" href="/register">
          Register
        </Link>
      </>
    );
  }

  return (
    <>
      <Link className="nav" href="/driver-area">
        Driver Area
      </Link>

      <Link className="nav" href="/messages">
        Messages
      </Link>

      {(state.role === "team_manager" ||
        state.role === "admin") && (
        <Link className="nav" href="/teams">
          Team Area
        </Link>
      )}

      {state.role === "admin" && (
        <Link className="nav" href="/admin">
          Admin
        </Link>
      )}

      <button
        className="linkButton"
        onClick={async () => {
          await createClient().auth.signOut();
          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </>
  );
}
