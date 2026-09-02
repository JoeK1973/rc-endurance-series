"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MessagesNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUnreadCount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoggedIn(false);
        setUnreadCount(0);
        return;
      }

      setLoggedIn(true);

      const { data: myTeams } = await supabase
        .from("teams")
        .select("id")
        .eq("manager_id", user.id);

      const teamIds = (myTeams || []).map(
        (team: { id: string }) => team.id
      );

      let conversationQuery;

      if (teamIds.length > 0) {
        conversationQuery = supabase
          .from("conversations")
          .select("id")
          .or(
            `driver_id.eq.${user.id},team_id.in.(${teamIds.join(",")})`
          );
      } else {
        conversationQuery = supabase
          .from("conversations")
          .select("id")
          .eq("driver_id", user.id);
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
        return;
      }

      const conversationIds = (conversations || []).map(
        (conversation: { id: string }) => conversation.id
      );

      if (!conversationIds.length) {
        setUnreadCount(0);
        return;
      }

      const {
        count,
        error: messageError,
      } = await supabase
        .from("messages")
        .select("id", {
          count: "exact",
          head: true,
        })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      if (messageError) {
        console.error(
          "Could not count unread messages:",
          messageError.message
        );
        return;
      }

      setUnreadCount(count || 0);
    }

    loadUnreadCount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUnreadCount();
    });

    const channel = supabase
      .channel("messages-nav-unread")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          loadUnreadCount();
        }
      )
      .subscribe();

    const interval = setInterval(
      loadUnreadCount,
      30000
    );

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  if (!loggedIn) {
    return null;
  }

  return (
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
              unreadCount === 1 ? "" : "s"
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
  );
}
