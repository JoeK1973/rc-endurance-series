"use client";

import { useState } from "react";
import { createClient } from "@/lib/firebase/client";

export default function AuthForm({
  mode,
}: {
  mode: "login" | "register";
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(formData: FormData) {
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      window.location.href = "/";
      return;
    }

    const name = String(formData.get("name") || "").trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Account creation failed. Please try again.");
      setLoading(false);
      return;
    }

    setMessage(
      data.session
        ? "Registration successful. You are now logged in."
        : "Registration successful. Please check your email and confirm your account."
    );

    setLoading(false);
  }

  async function signInWithGoogle() {
    setMessage("");
    setGoogleLoading(true);

    try {
      const client = createClient();

      const { error } = await client.auth.signInWithGoogle();

      if (error) {
        setMessage(error.message);
        setGoogleLoading(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Google sign-in failed. Please try again."
      );
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <form action={submit} className="card">
      <button
        className="btn"
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
      >
        {googleLoading ? "Signing in with Google..." : "Continue with Google"}
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "18px 0",
        }}
      >
        <div
          style={{
            height: "1px",
            flex: 1,
            background: "var(--border)",
          }}
        />

        <span className="muted">or</span>

        <div
          style={{
            height: "1px",
            flex: 1,
            background: "var(--border)",
          }}
        />
      </div>

      {mode === "register" && (
        <label>
          Name
          <input
            className="input"
            name="name"
            required
            disabled={busy}
          />
        </label>
      )}

      <label>
        Email address
        <input
          className="input"
          name="email"
          type="email"
          required
          disabled={busy}
        />
      </label>

      <label>
        Password
        <input
          className="input"
          name="password"
          type="password"
          minLength={6}
          required
          disabled={busy}
        />
      </label>

      <button
        className="btn space"
        type="submit"
        disabled={busy}
      >
        {loading
          ? mode === "login"
            ? "Logging in..."
            : "Creating account..."
          : mode === "login"
          ? "Login"
          : "Create account"}
      </button>

      {message && <p className="space">{message}</p>}
    </form>
  );
}