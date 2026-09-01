"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type Availability = {
  driver_id: string;
  round_id: string;
  status: string;
};

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDrivers() {
      setLoading(true);
      setMessage("");

      const supabase = createClient();

      const [
        { data: driversData, error: driversError },
        { data: profilesData, error: profilesError },
        { data: availabilityData, error: availabilityError },
      ] = await Promise.all([
        supabase
          .from("drivers")
          .select(`
            profile_id,
            classes,
            experience,
            endurance_experience,
            bio
          `),

        supabase
          .from("profiles")
          .select(`
            id,
            name,
            club
          `),

        supabase
          .from("driver_availability")
          .select(`
            driver_id,
            round_id,
            status
          `),
      ]);

      if (driversError) {
        setMessage(`Unable to load drivers: ${driversError.message}`);
        setLoading(false);
        return;
      }

      if (profilesError) {
        setMessage(`Unable to load driver profiles: ${profilesError.message}`);
        setLoading(false);
        return;
      }

      if (availabilityError) {
        setMessage(
          `Unable to load driver availability: ${availabilityError.message}`
        );
        setLoading(false);
        return;
      }

      setDrivers((driversData || []) as Driver[]);
      setProfiles((profilesData || []) as Profile[]);
      setAvailability((availabilityData || []) as Availability[]);
      setLoading(false);
    }

    loadDrivers();
  }, []);

  const getProfile = (profileId: string) => {
    return profiles.find((profile) => profile.id === profileId);
  };

  const getDriverAvailability = (profileId: string) => {
    return availability.filter(
      (item) => item.driver_id === profileId
    );
  };

  const hasAvailableToDrive = (profileId: string) => {
    return getDriverAvailability(profileId).some(
      (item) =>
        item.status === "available_to_drive" ||
        item.status === "looking_for_team"
    );
  };

  const hasReserveAvailability = (profileId: string) => {
    return getDriverAvailability(profileId).some(
      (item) =>
        item.status === "available_as_reserve" ||
        item.status === "available_reserve" ||
        item.status === "reserve"
    );
  };

  const availableDrivers = drivers.filter((driver) => {
    return (
      hasAvailableToDrive(driver.profile_id) ||
      hasReserveAvailability(driver.profile_id)
    );
  });

  if (loading) {
    return (
      <>
        <h1>Find a Driver</h1>

        <div className="card">
          <p className="muted">Loading drivers...</p>
        </div>
      </>
    );
  }

  if (message) {
    return (
      <>
        <h1>Find a Driver</h1>

        <div className="card">
          <h2>Unable to load drivers</h2>
          <p className="muted">{message}</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Find a Driver</h1>

      <p className="muted">
        Search drivers who are available to drive or available as a reserve.
      </p>

      {availableDrivers.length === 0 ? (
        <div className="card space">
          <h2>No drivers currently available</h2>

          <p className="muted">
            No drivers have currently marked themselves as available to drive
            or available as a reserve.
          </p>
        </div>
      ) : (
        <div className="grid two space">
          {availableDrivers.map((driver) => {
            const profile = getProfile(driver.profile_id);

            const availableToDrive = hasAvailableToDrive(
              driver.profile_id
            );

            const availableAsReserve = hasReserveAvailability(
              driver.profile_id
            );

            return (
              <div className="card space" key={driver.profile_id}>
                <h2>{profile?.name || "Unnamed Driver"}</h2>

                <p className="muted">
                  {profile?.club || "Independent driver"}
                </p>

                {driver.experience && (
                  <p>
                    <strong>Experience:</strong> {driver.experience}
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

                {driver.endurance_experience && (
                  <p className="muted">
                    {driver.endurance_experience}
                  </p>
                )}

                <div className="statusList">
                  {availableToDrive && (
                    <span className="status available_to_drive">
                      Available to drive
                    </span>
                  )}

                  {availableAsReserve && (
                    <span className="status available_as_reserve">
                      Available as a reserve
                    </span>
                  )}
                </div>

                <Link
                  className="btn space"
                  href={`/drivers/${driver.profile_id}`}
                >
                  View profile
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
