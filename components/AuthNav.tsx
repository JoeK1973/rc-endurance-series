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
       * Find teams managed by this user.
       * This allows team managers to see conversations
       * involving their teams.
       */
      const { data: myTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("manager_id", userId);

      const teamIds = (myTeams || []).map(
        (team: any) => team.id
      );

      /*
       * Find conversations involving this user.
       *
       * A user can be:
       * - the driver in a conversation
       * - the manager of the team in a conversation
       */
      let conversationQuery = supabase
        .from("conversations")
        .select("id, driver_id, team_id")
        .eq("driver_id", userId);

      if (teamIds.length > 0) {
        conversationQuery = supabase
          .from("conversations")
          .select("id, driver_id, team_id")
          .or(
            `driver_id.eq.${userId},team_id.in.(${teamIds.join(",")})`
          );
      }

      const {
        data: conversations,
        error: conversationError,
      } = await conversationQuery;

      if (conversationError) {
        console.error(
          "Could not load conversations:",
          conversationError.message
        );

        setUnreadCount(0);
        return;
      }

      const conversationIds = (conversations || []).map(
        (conversation: any) => conversation.id
      );

      if (!conversationIds.length) {
        setUnreadCount(0);
        return;
      }

      /*
       * Count messages that:
       *
       * 1. Belong to one of the user's conversations
       * 2. Were NOT sent by the logged-in user
       * 3. Have not been read yet
       */
      const {
        count,
        error: messageError,
      } = await supabase
        .from("messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .in(
          "conversation_id",
          conversationIds
        )
        .neq("sender_id", userId)
        .is("read_at", null);

      if (messageError) {
        console.error(
          "Could not count unread messages:",
          messageError.message
        );

        setUnreadCount(0);
        return;
      }

      setUnreadCount(count || 0);
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

      const {
        data: profile,
      } = await supabase
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

    /*
     * Reload when authentication changes.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    /*
     * Listen for new messages in real time.
     *
     * When a new message is received, reload the
     * unread count.
     */
    const channel = supabase
      .channel("unread-message-count")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            await loadUnreadCount(user.id);
          }
        }
      )
      .subscribe();

    /*
     * Also refresh occasionally in case Realtime
     * is not enabled for the messages table.
     */
    const interval = setInterval(
      async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await loadUnreadCount(user.id);
        }
      },
      30000
    );

    return () => {
      subscription.unsubscribe();

      supabase.removeChannel(channel);

      clearInterval(interval);
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

  const isAdmin =
    state.role === "admin";

  return (
    <>
      <Link
        className="nav"
        href="/driver-area"
      >
        Driver Area
      </Link>

      {isTeamManager && (
        <Link
          className="nav"
          href="/teams"
        >
          Team Area
        </Link>
      )}

      {/* MESSAGES ICON */}

      <Link
        className="messageIconButton"
        href="/messages"
        aria-label={
          unreadCount > 0
            ? `Messages - ${unreadCount} unread`
            : "Messages"
        }
        title={
          unreadCount > 0
            ? `${unreadCount} unread message${
                unreadCount === 1
                  ? ""
                  : "s"
              }`
            : "Messages"
        }
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
          />

          <path d="M3 7l9 6 9-6" />
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
        <Link
          className="nav"
          href="/admin"
        >
          Admin
        </Link>
      )}

      <button
        className="linkButton"
        onClick={async () => {
          await createClient()
            .auth
            .signOut();

          window.location.href = "/";
        }}
      >
        Logout
      </button>
    </>
  );
}
