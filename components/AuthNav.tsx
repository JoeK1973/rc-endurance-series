"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UserState = {
  id: string;
  email: string;
  role: string;
} | null;

export default function AuthNav() {
  const [state, setState] = useState<UserState>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function loadUnreadCount(userId: string) {
      /*
        Count messages sent TO the logged-in user
        that have not been read yet.
      */
      const { count, error } = await supabase
        .from("messages")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("recipient_id", userId)
        .eq("is_read", false);

      if (!error) {
        setUnreadCount(count || 0);
      }
    }

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState(null);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setState({
        id: user.id,
        email: user.email || "Account",
        role: profile?.role || "driver",
      });

      await loadUnreadCount(user.id);

      setLoading(false);
    }

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
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
        <Link className="nav" href="/register">
          Register
        </Link>

        <Link className="nav" href="/login">
          Login
        </Link>
      </>
    );
  }

  const isTeamManager =
    state.role === "team_manager" ||
    state.role === "admin";

  const isAdmin = state.role === "admin";

  return (
    <>
      <Link className="nav" href="/driver-area">
        Driver Area
      </Link>

      {isTeamManager && (
        <Link className="nav" href="/teams">
          Team Area
        </Link>
      )}

      {/* MESSAGES ICON */}
      <Link
        className="messageIconButton"
        href="/messages"
        aria-label="Messages"
        title={
          unreadCount > 0
            ? `${unreadCount} unread message${
                unreadCount === 1 ? "" : "s"
              }`
            : "Messages"
        }
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Z" />

          <path d="m4 6 8 6 8-6" />
        </svg>

        {unreadCount > 0 && (
          <span className="unreadBadge">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </Link>

      {isAdmin && (
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
