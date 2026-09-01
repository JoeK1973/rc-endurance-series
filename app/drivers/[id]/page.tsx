"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Contact from "@/components/Contact";
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

export default function DriverProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const [driver, setDriver] = useState<Driver | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
          .select("*")
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
      setRounds(roundsData || []);
      setLoading(false);
    }

    loadDriver();
  }, [id]);

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

      <Contact
        driverId={driver.profile_id}
        rounds={rounds}
      />
    </>
  );
}
