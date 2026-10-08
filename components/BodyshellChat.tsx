"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/firebase/client";
import { uploadImageToImageKit } from "@/lib/imagekit";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  message_type?: "text" | "image";
  image_url?: string | null;
  thumbnail_url?: string | null;
  image_name?: string | null;
};

type Props = {
  teamId: string;
  teamName: string;
  managerId: string;
  isAdmin: boolean;
  approvedLiveryUrl?: string | null;
  onApproved?: () => void;
};

export default function BodyshellChat({
  teamId,
  teamName,
  managerId,
  isAdmin,
  approvedLiveryUrl,
  onApproved,
}: Props) {
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    setError("");

    const client = createClient();
    const {
      data: { user },
    } = await client.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const existingResult = await client
      .from("conversations")
      .select("*")
      .eq("id", `bodyshell_${teamId}`)
      .maybeSingle();

    if (existingResult.error) {
      setError(existingResult.error.message);
      setLoading(false);
      return;
    }

    let conversation = existingResult.data;

    if (!conversation) {
      const result = await client
        .from("conversations")
        .upsert(
          {
            id: `bodyshell_${teamId}`,
            conversation_type: "bodyshell",
            driver_id: managerId,
            team_id: teamId,
            round_id: null,
            manager_id: managerId,
          },
          { onConflict: "id" }
        )
        .select("*")
        .single();

      if (result.error || !result.data) {
        setError(
          result.error?.message ||
            "Could not create the bodyshell conversation."
        );
        setLoading(false);
        return;
      }

      conversation = result.data;
    }

    if (
      conversation.conversation_type &&
      conversation.conversation_type !== "bodyshell"
    ) {
      setError("This conversation is not a bodyshell conversation.");
      setLoading(false);
      return;
    }

    setConversationId(conversation.id);

    const messageResult = await client
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (messageResult.error) {
      setError(messageResult.error.message);
      setLoading(false);
      return;
    }

    const loaded = (messageResult.data || []) as Message[];
    setMessages(loaded);

    const unread = loaded.filter(
      (message) => message.sender_id !== user.id && !message.read_at
    );

    await Promise.all(
      unread.map((message) =>
        client
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("id", message.id)
      )
    );

    setLoading(false);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50
    );
  }

  useEffect(() => {
    load();
  }, [teamId]);

  useEffect(() => {
    if (!conversationId) return;

    const client = createClient();
    const channel = client
      .channel(`bodyshell-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const incoming = payload.new as Message;

          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current;
            }
            return [...current, incoming];
          });

          if (userId && incoming.sender_id !== userId) {
            await client
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id);
          }

          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            20
          );
        }
      )
      .subscribe();

    return () => client.removeChannel(channel);
  }, [conversationId, teamId, userId]);

  async function send() {
    if (sending || !userId || !conversationId) return;

    const text = body.trim();
    if (!text && files.length === 0) return;

    setSending(true);
    setError("");

    const client = createClient();

    try {
      if (text) {
        const result = await client
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            body: text,
            message_type: "text",
          })
          .select("*")
          .single();

        if (result.error) throw result.error;
        if (result.data) {
          setMessages((current) => {
            const next = result.data as Message;
            return current.some((message) => message.id === next.id)
              ? current
              : [...current, next];
          });
        }
      }

      for (const file of files) {
        const upload = await uploadImageToImageKit(file, teamId);

        const result = await client
          .from("messages")
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            body: "",
            message_type: "image",
            image_url: upload.url,
            thumbnail_url: upload.thumbnailUrl,
            image_name: upload.fileName,
          })
          .select("*")
          .single();

        if (result.error) throw result.error;
        if (result.data) {
          setMessages((current) => {
            const next = result.data as Message;
            return current.some((message) => message.id === next.id)
              ? current
              : [...current, next];
          });
        }
      }

      setBody("");
      setFiles([]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        20
      );
    } catch (sendError: any) {
      setError(sendError?.message || "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  async function approveLatest() {
    if (!isAdmin || approving) return;

    const latestImage = [...messages]
      .reverse()
      .find((message) => !!message.image_url);

    if (!latestImage?.image_url) {
      setError("There is no submitted bodyshell image to approve.");
      return;
    }

    setApproving(true);
    setError("");

    const client = createClient();
    const result = await client
      .from("teams")
      .update({
        livery_status: "approved",
        approved_livery_url: latestImage.image_url,
        approved_livery_thumbnail_url:
          latestImage.thumbnail_url || latestImage.image_url,
        approved_livery_message_id: latestImage.id,
        livery_approved_at: new Date().toISOString(),
      })
      .eq("id", teamId);

    if (result.error) {
      setError(result.error.message);
    } else {
      onApproved?.();
    }

    setApproving(false);
  }

  if (loading) {
    return <div className="card">Loading bodyshell chat...</div>;
  }

  return (
    <div className="space">
      {error && <div className="notice">{error}</div>}

      <div className="card">
        <h2>{teamName} — Bodyshell</h2>
        <p className="muted">
          Discuss the bodyshell with the championship admins. All previous
          submissions remain in the conversation.
        </p>

        {approvedLiveryUrl ? (
          <div className="space">
            <h3>Agreed Livery</h3>
            <a href={approvedLiveryUrl} target="_blank" rel="noreferrer">
              <img
                src={approvedLiveryUrl}
                alt="Agreed team livery"
                style={{
                  maxWidth: "100%",
                  width: 300,
                  height: "auto",
                  borderRadius: 8,
                  display: "block",
                }}
              />
            </a>
          </div>
        ) : (
          <p className="muted">No bodyshell approved yet.</p>
        )}
      </div>

      <div className="card messageThread">
        {!messages.length && (
          <p className="muted">
            No messages yet. Start the bodyshell discussion below.
          </p>
        )}

        {messages.map((message) => (
          <div
            className={`messageBubble ${
              message.sender_id === userId ? "mine" : "theirs"
            }`}
            key={message.id}
          >
            {message.body && <div>{message.body}</div>}

            {message.image_url && (
              <a
                href={message.image_url}
                target="_blank"
                rel="noreferrer"
                className="bodyshellImageLink"
              >
                <img
                  src={message.thumbnail_url || message.image_url}
                  alt={message.image_name || "Submitted image"}
                  style={{
                    width: 300,
                    maxWidth: "100%",
                    height: "auto",
                    borderRadius: 8,
                    display: "block",
                    marginTop: message.body ? 8 : 0,
                  }}
                />
              </a>
            )}

            {message.image_name && (
              <small>{message.image_name}</small>
            )}

            <small>
              {new Date(message.created_at).toLocaleString()}
            </small>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      <div className="card">
        <label>
          Message
          <textarea
            className="input textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Ask a question or explain your bodyshell revision..."
            disabled={sending}
          />
        </label>

        <label className="space">
          Images
          <input
            className="input"
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            disabled={sending}
            onChange={(event) =>
              setFiles(Array.from(event.target.files || []))
            }
          />
        </label>

        {files.length > 0 && (
          <p className="muted">
            {files.length} image{files.length === 1 ? "" : "s"} selected.
          </p>
        )}

        <div className="actionRow">
          <button
            className="btn"
            disabled={sending || (!body.trim() && files.length === 0)}
            onClick={send}
          >
            {sending ? "Sending..." : "Send"}
          </button>

          {isAdmin && (
            <button
              className="btn secondary"
              disabled={
                approving ||
                !messages.some((message) => !!message.image_url)
              }
              onClick={approveLatest}
            >
              {approving ? "Approving..." : "Approve latest bodyshell"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
