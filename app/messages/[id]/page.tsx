"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string;
  driver_id: string;
  team_id: string;
  round_id: string | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("Conversation");
  const [subtitle, setSubtitle] = useState("");

  const [userId, setUserId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    setError("");

    const { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (conversationError || !conversation) {
      setError(
        conversationError?.message ||
          "Conversation not found."
      );
      setLoading(false);
      return;
    }

    const c = conversation as Conversation;

    /*
     * Find every team managed by this user.
     * This is what allows a team manager to access
     * conversations belonging to their team.
     */
    const { data: myTeams, error: teamsError } =
      await supabase
        .from("teams")
        .select("id")
        .eq("manager_id", user.id);

    if (teamsError) {
      setError(teamsError.message);
      setLoading(false);
      return;
    }

    const teamIds = (myTeams || []).map(
      (team: { id: string }) => team.id
    );

    const isDriver = c.driver_id === user.id;

    const isTeamManager = teamIds.includes(
      c.team_id
    );

    if (!isDriver && !isTeamManager) {
      setError(
        "You do not have access to this conversation."
      );
      setLoading(false);
      return;
    }

    const [
      { data: team },
      { data: profile },
      { data: round },
      { data: messageRows, error: messagesError },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("name")
        .eq("id", c.team_id)
        .maybeSingle(),

      supabase
        .from("profiles")
        .select("name")
        .eq("id", c.driver_id)
        .maybeSingle(),

      c.round_id
        ? supabase
            .from("rounds")
            .select("name")
            .eq("id", c.round_id)
            .maybeSingle()
        : Promise.resolve({
            data: null,
            error: null,
          }),

      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (messagesError) {
      setError(messagesError.message);
      setLoading(false);
      return;
    }

    setTitle(
      isDriver
        ? team?.name || "Team"
        : profile?.name || "Driver"
    );

    setSubtitle(
      round?.name || "Championship conversation"
    );

    const loadedMessages =
      (messageRows || []) as Message[];

    setMessages(loadedMessages);

    /*
     * Mark messages from the other participant
     * as read when this conversation is opened.
     */
    const unreadIds = loadedMessages
      .filter(
        (message) =>
          message.sender_id !== user.id &&
          !message.read_at
      )
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      await supabase
        .from("messages")
        .update({
          read_at: new Date().toISOString(),
        })
        .in("id", unreadIds);
    }

    setLoading(false);

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  }

  useEffect(() => {
    load();
  }, [id]);

  /*
   * Listen for replies while the conversation
   * is currently open.
   */
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        async (payload) => {
          const newMessage =
            payload.new as Message;

          setMessages((current) => {
            if (
              current.some(
                (message) =>
                  message.id === newMessage.id
              )
            ) {
              return current;
            }

            return [
              ...current,
              newMessage,
            ];
          });

          /*
           * If the message was sent by the other
           * participant, mark it as read because
           * this conversation is currently open.
           */
          if (
            userId &&
            newMessage.sender_id !== userId
          ) {
            await supabase
              .from("messages")
              .update({
                read_at: new Date().toISOString(),
              })
              .eq("id", newMessage.id);
          }

          setTimeout(() => {
            bottomRef.current?.scrollIntoView({
              behavior: "smooth",
            });
          }, 20);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, userId]);

  async function send() {
    const text = body.trim();

    if (!text || sending || !userId) {
      return;
    }

    setSending(true);
    setError("");

    const supabase = createClient();

    const { data, error: sendError } =
      await supabase
        .from("messages")
        .insert({
          conversation_id: id,
          sender_id: userId,
          body: text,
        })
        .select()
        .single();

    if (sendError) {
      setError(sendError.message);
      setSending(false);
      return;
    }

    /*
     * Add immediately so the sender sees
     * their message without waiting for Realtime.
     */
    if (data) {
      const newMessage = data as Message;

      setMessages((current) => {
        if (
          current.some(
            (message) =>
              message.id === newMessage.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          newMessage,
        ];
      });

      setBody("");

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 20);
    }

    setSending(false);
  }

  if (loading) {
    return (
      <>
        <h1>Messages</h1>

        <div className="card">
          Loading conversation...
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

        <Link
          className="btn space"
          href="/messages"
        >
          Back to messages
        </Link>
      </>
    );
  }

  return (
    <div>
      <Link
        className="muted"
        href="/messages"
      >
        ← Back to messages
      </Link>

      <div className="messageHeader">
        <h1>{title}</h1>

        <p className="muted">
          {subtitle}
        </p>
      </div>

      <div className="card messageThread">
        {!messages.length && (
          <p className="muted">
            No messages yet.
          </p>
        )}

        {messages.map((message) => (
          <div
            className={`messageBubble ${
              message.sender_id === userId
                ? "mine"
                : "theirs"
            }`}
            key={message.id}
          >
            <div>
              {message.body}
            </div>

            <small>
              {new Date(
                message.created_at
              ).toLocaleString()}
            </small>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="card space">
        <textarea
          className="input textarea"
          value={body}
          onChange={(event) =>
            setBody(event.target.value)
          }
          placeholder="Type a message..."
          disabled={sending}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              send();
            }
          }}
        />

        <button
          className="btn space"
          disabled={
            sending || !body.trim()
          }
          onClick={send}
        >
          {sending
            ? "Sending..."
            : "Send message"}
        </button>
      </div>
    </div>
  );
}
