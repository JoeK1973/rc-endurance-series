"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string;
  driver_id: string;
  team_id: string;
  round_id: string | null;
  created_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

type Team = {
  id: string;
  name: string;
};

type Profile = {
  id: string;
  name: string;
};

type Round = {
  id: string;
  name: string;
  event_date: string;
};

type ConversationItem = Conversation & {
  title: string;
  round: string;
  preview: string;
  updated: string;
  unread: boolean;
};

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ConversationItem[]>([]);

  async function loadMessages() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    /*
     * Find every team managed by this user.
     */
    const { data: myTeams, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .eq("manager_id", user.id);

    if (teamError) {
      setError(teamError.message);
      setLoading(false);
      return;
    }

    const teamIds = (myTeams || []).map(
      (team: { id: string }) => team.id
    );

    /*
     * Get conversations where:
     *
     * 1. The logged-in user is the driver
     * OR
     * 2. The conversation belongs to a team
     *    managed by the logged-in user
     */
    let conversationQuery;

    if (teamIds.length > 0) {
      conversationQuery = supabase
        .from("conversations")
        .select("*")
        .or(
          `driver_id.eq.${user.id},team_id.in.(${teamIds.join(",")})`
        )
        .order("created_at", {
          ascending: false,
        });
    } else {
      conversationQuery = supabase
        .from("conversations")
        .select("*")
        .eq("driver_id", user.id)
        .order("created_at", {
          ascending: false,
        });
    }

    const {
      data: conversationRows,
      error: conversationError,
    } = await conversationQuery;

    if (conversationError) {
      setError(conversationError.message);
      setLoading(false);
      return;
    }

    const conversations =
      (conversationRows || []) as Conversation[];

    if (!conversations.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const conversationIds = conversations.map(
      (conversation) => conversation.id
    );

    /*
     * Load all related data.
     */
    const [
      { data: teams, error: teamsError },
      { data: profiles, error: profilesError },
      { data: rounds, error: roundsError },
      { data: messageRows, error: messagesError },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id,name"),

      supabase
        .from("profiles")
        .select("id,name"),

      supabase
        .from("rounds")
        .select("id,name,event_date"),

      supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (teamsError) {
      setError(teamsError.message);
      setLoading(false);
      return;
    }

    if (profilesError) {
      setError(profilesError.message);
      setLoading(false);
      return;
    }

    if (roundsError) {
      setError(roundsError.message);
      setLoading(false);
      return;
    }

    if (messagesError) {
      setError(messagesError.message);
      setLoading(false);
      return;
    }

    const teamMap: Record<string, Team> = {};

    (teams || []).forEach((team: Team) => {
      teamMap[team.id] = team;
    });

    const profileMap: Record<string, Profile> = {};

    (profiles || []).forEach((profile: Profile) => {
      profileMap[profile.id] = profile;
    });

    const roundMap: Record<string, Round> = {};

    (rounds || []).forEach((round: Round) => {
      roundMap[round.id] = round;
    });

    const messages =
      (messageRows || []) as Message[];

    /*
     * Group messages by conversation.
     *
     * They are already sorted newest first,
     * so the first message we encounter is
     * the latest message in that conversation.
     */
    const messagesByConversation: Record<
      string,
      Message[]
    > = {};

    messages.forEach((message) => {
      if (!messagesByConversation[message.conversation_id]) {
        messagesByConversation[
          message.conversation_id
        ] = [];
      }

      messagesByConversation[
        message.conversation_id
      ].push(message);
    });

    const inboxItems: ConversationItem[] =
      conversations.map((conversation) => {
        const conversationMessages =
          messagesByConversation[
            conversation.id
          ] || [];

        /*
         * Because messages are newest first,
         * index 0 is the latest message.
         */
        const latestMessage =
          conversationMessages[0];

        /*
         * Check ALL messages, not just the latest one.
         *
         * This means a conversation remains marked
         * unread until the user opens it and the
         * incoming messages are marked as read.
         */
        const hasUnread = conversationMessages.some(
          (message) =>
            message.sender_id !== user.id &&
            !message.read_at
        );

        const isDriver =
          conversation.driver_id === user.id;

        return {
          ...conversation,

          /*
           * Drivers see the team name.
           * Team managers see the driver name.
           */
          title: isDriver
            ? teamMap[conversation.team_id]?.name ||
              "Team"
            : profileMap[
                conversation.driver_id
              ]?.name || "Driver",

          round: conversation.round_id
            ? roundMap[
                conversation.round_id
              ]?.name || "Championship round"
            : "Championship conversation",

          preview:
            latestMessage?.body ||
            "No messages yet",

          updated:
            latestMessage?.created_at ||
            conversation.created_at,

          unread: hasUnread,
        };
      });

    /*
     * Put the most recently active conversation first.
     */
    inboxItems.sort(
      (a, b) =>
        new Date(b.updated).getTime() -
        new Date(a.updated).getTime()
    );

    setItems(inboxItems);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  if (loading) {
    return (
      <>
        <h1>Messages</h1>

        <div className="card">
          Loading conversations...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <h1>Messages</h1>

        <div className="notice">
          {error}
        </div>

        <button
          className="btn space"
          onClick={loadMessages}
        >
          Try again
        </button>
      </>
    );
  }

  return (
    <div>
      <h1>Messages</h1>

      <p className="muted">
        Your conversations with teams and drivers.
      </p>

      {!items.length ? (
        <div className="card space">
          <h2>No conversations yet</h2>

          <p className="muted">
            When a team manager contacts a driver,
            the conversation will appear here.
          </p>
        </div>
      ) : (
        <div className="messageInbox space">
          <div className="conversationList">
            {items.map((conversation) => (
              <Link
                href={`/messages/${conversation.id}`}
                className={`conversationItem ${
                  conversation.unread
                    ? "hasUnread"
                    : ""
                }`}
                key={conversation.id}
              >
                <div className="conversationTop">
                  <div className="conversationTitle">
                    {conversation.title}

                    {conversation.unread && (
                      <span
                        className="unreadDot"
                        aria-label="Unread messages"
                      />
                    )}
                  </div>

                  <div className="conversationDate">
                    {new Date(
                      conversation.updated
                    ).toLocaleString()}
                  </div>
                </div>

                <div className="conversationRound">
                  {conversation.round}
                </div>

                <div className="conversationPreview">
                  {conversation.preview}
                </div>
              </Link>
            ))}
          </div>

          <div className="messageEmpty card">
            <h2>Select a conversation</h2>

            <p className="muted">
              Choose a conversation from the left
              to read and reply.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
