"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Driver = {
  profile_id: string;
  classes: string[] | string | null;
  experience: string | null;
  endurance_experience: string | null;
  bio: string | null;
};

type Profile = {
  id: string;
  name: string | null;
  club: string | null;
};

type Round = {
  id: string;
  name: string;
  event_date?: string | null;
};

export default function DriverProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [roundId, setRoundId] = useState("");
  const [message, setMessage] = useState(
    "We are interested in having you drive for our team."
  );
  const [sending, setSending] = useState(false);
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    async function loadDriver() {
      if (!id) return;

      setLoading(true);
      setErrorMessage("");

      const supabase = createClient();

      const [
        { data: driverData, error: driverError },
        { data: profileData, error: profileError },
        { data: roundsData, error: roundsError },
      ] = await Promise.all([
        supabase
          .from("drivers")
          .select(`
            profile_id,
            classes,
            experience,
            endurance_experience,
            bio
          `)
          .eq("profile_id", id)
          .single(),

        supabase
          .from("profiles")
          .select(`
            id,
            name,
            club
          `)
          .eq("id", id)
          .single(),

        supabase
          .from("rounds")
          .select("id,name,event_date")
          .order("event_date"),
      ]);

      if (driverError) {
        setErrorMessage(driverError.message);
        setLoading(false);
        return;
      }

      if (profileError) {
        setErrorMessage(profileError.message);
        setLoading(false);
        return;
      }

      if (roundsError) {
        setErrorMessage(roundsError.message);
        setLoading(false);
        return;
      }

      setDriver(driverData as Driver);
      setProfile(profileData as Profile);

      const loadedRounds = (roundsData || []) as Round[];
      setRounds(loadedRounds);

      if (loadedRounds.length > 0) {
        setRoundId(loadedRounds[0].id);
      }

      setLoading(false);
    }

    loadDriver();
  }, [id]);

  async function contactDriver(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setContactMessage("");
    setSending(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    if (!roundId) {
      setContactMessage("Please select a championship round.");
      setSending(false);
      return;
    }

    if (!message.trim()) {
      setContactMessage("Please enter a message.");
      setSending(false);
      return;
    }

    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("id,name")
      .eq("manager_id", user.id)
      .limit(1);

    if (teamError) {
      setContactMessage(teamError.message);
      setSending(false);
      return;
    }

    const team = teams?.[0];

    if (!team) {
      setContactMessage(
        "You need to create a team before contacting a driver."
      );
      setSending(false);
      return;
    }

    const {
      data: existingConversation,
      error: conversationSearchError,
    } = await supabase
      .from("conversations")
      .select("id")
      .eq("team_id", team.id)
      .eq("driver_id", id)
      .eq("round_id", roundId)
      .maybeSingle();

    if (conversationSearchError) {
      setContactMessage(conversationSearchError.message);
      setSending(false);
      return;
    }

    let conversationId = existingConversation?.id;

    if (!conversationId) {
      const {
        data: newConversation,
        error: conversationError,
      } = await supabase
        .from("conversations")
        .insert({
          team_id: team.id,
          driver_id: id,
          round_id: roundId,
        })
        .select("id")
        .single();

      if (conversationError) {
        setContactMessage(conversationError.message);
        setSending(false);
        return;
      }

      conversationId = newConversation.id;
    }

    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: message.trim(),
      });

    if (messageError) {
      setContactMessage(messageError.message);
      setSending(false);
      return;
    }

    router.push(`/messages/${conversationId}`);
  }

  if (loading) {
    return (
      <>
        <h1>Driver Profile</h1>

        <div className="card">
          <p className="muted">Loading driver profile...</p>
        </div>
      </>
    );
  }

  if (errorMessage || !driver || !profile) {
    return (
      <>
        <h1>Driver Profile</h1>

        <div className="card">
          <h2>Driver not found</h2>

          {errorMessage && (
            <p className="muted">{errorMessage}</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <h1>{profile.name || "Driver Profile"}</h1>

      <div className="card space">
        <p className="muted">
          {profile.club || "Independent driver"}
        </p>

        {driver.experience && (
          <p>
            <strong>Experience:</strong> {driver.experience}
          </p>
        )}

        {driver.endurance_experience && (
          <p>
            <strong>Endurance experience:</strong>{" "}
            {driver.endurance_experience}
          </p>
        )}

        {driver.classes && (
          <p>
            <strong>Classes:</strong>{" "}
            {Array.isArray(driver.classes)
              ? driver.classes.join(", ")
              : driver.classes}
          </p>
        )}

        {driver.bio && (
          <div className="space">
            <strong>About the driver</strong>
            <p>{driver.bio}</p>
          </div>
        )}
      </div>

      <form onSubmit={contactDriver} className="card space">
        <h2>Contact this driver</h2>

        <p className="muted">
          Start a conversation with this driver about joining
          your team for a championship round.
        </p>

        <label>Championship round</label>

        <select
          className="input"
          value={roundId}
          onChange={(e) => setRoundId(e.target.value)}
          required
        >
          {rounds.length === 0 && (
            <option value="">
              No rounds available
            </option>
          )}

          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.name}
            </option>
          ))}
        </select>

        <label className="space">Message</label>

        <textarea
          className="input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
        />

        <button
          className="btn space"
          type="submit"
          disabled={sending || rounds.length === 0}
        >
          {sending
            ? "Sending..."
            : "Start conversation"}
        </button>

        {contactMessage && (
          <p className="muted">{contactMessage}</p>
        )}
      </form>
    </>
  );
}
