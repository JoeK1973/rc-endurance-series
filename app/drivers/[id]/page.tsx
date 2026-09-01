"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StartConversation from "@/components/StartConversation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function DriverProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const [driver, setDriver] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [
        { data: driverData, error: driverError },
        { data: roundsData, error: roundsError },
      ] = await Promise.all([
        supabase
          .from("drivers")
          .select(
            "profile_id,experience,bio,classes,endurance_experience,profiles!drivers_profile_id_fkey(name,club)"
          )
          .eq("profile_id", id)
          .maybeSingle(),
        supabase
          .from("rounds")
          .select("*")
          .order("event_date"),
      ]);

      if (driverError) {
        setError(driverError.message);
      } else if (!driverData) {
        setError("Driver not found.");
      } else {
        setDriver(driverData);
      }

      if (roundsError) {
        setError((current) => current || roundsError.message);
      }

      setRounds(roundsData || []);
      setLoading(false);
    }

    load();
  }, [id]);

  if (loading) {
    return <div className="card">Loading driver profile...</div>;
  }

  if (error || !driver) {
    return (
      <div className="card">
        <h1>Driver not found</h1>
        <p className="muted">
          {error || "This driver profile could not be loaded."}
        </p>
      </div>
    );
  }

  const profile = Array.isArray(driver.profiles)
    ? driver.profiles[0]
    : driver.profiles;

  return (
    <>
      <h1>{profile?.name || "Driver"}</h1>

      <div className="card space">
        <p className="muted">
          {profile?.club || "Independent driver"}
        </p>

        {driver.experience && (
          <p>
            <b>Racing experience:</b> {driver.experience}
          </p>
        )}

        {Array.isArray(driver.classes) && driver.classes.length > 0 && (
          <p>
            <b>Classes:</b> {driver.classes.join(", ")}
          </p>
        )}

        {driver.endurance_experience && (
          <>
            <h2>Endurance experience</h2>
            <p>{driver.endurance_experience}</p>
          </>
        )}

        {driver.bio && (
          <>
            <h2>About</h2>
            <p>{driver.bio}</p>
          </>
        )}
      </div>

      <StartConversation
        driverId={driver.profile_id}
        rounds={rounds}
      />
    </>
  );
}
