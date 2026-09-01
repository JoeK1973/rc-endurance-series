"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
};

type Driver = {
  profile_id: string;
  classes: string[] | null;
  experience: string | null;
  endurance_experience: string | null;
  bio: string | null;
  profiles: {
    name: string | null;
    club: string | null;
  } | null;
};

type Availability = {
  driver_id: string;
  round_id: string;
  status: string;
};

export default function DriversPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [roundId, setRoundId] = useState("");
  const [search, setSearch] = useState("");
  const [experience, setExperience] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [
        { data: roundsData, error: roundsError },
        { data: driversData, error: driversError },
        { data: availabilityData, error: availabilityError },
      ] = await Promise.all([
        supabase.from("rounds").select("*").order("event_date"),
        supabase
          .from("drivers")
          .select("profile_id,classes,experience,endurance_experience,bio,profiles(name,club)"),
        supabase.from("driver_availability").select("driver_id,round_id,status"),
      ]);

      if (roundsError || driversError || availabilityError) {
        setMessage(
          roundsError?.message ||
            driversError?.message ||
            availabilityError?.message ||
            "Could not load driver availability."
        );
      }

      const loadedRounds = (roundsData || []) as Round[];
      setRounds(loadedRounds);
      setDrivers((driversData || []) as unknown as Driver[]);
      setAvailability((availabilityData || []) as Availability[]);
      setRoundId(loadedRounds[0]?.id || "");
      setLoading(false);
    }

    load();
  }, []);

  const availableDrivers = useMemo(() => {
    return drivers
      .map((driver) => {
        const driverAvailability = availability.find(
          (item) =>
            item.driver_id === driver.profile_id &&
            item.round_id === roundId
        );

        return {
          ...driver,
          availabilityStatus: driverAvailability?.status || "",
        };
      })
      .filter((driver) => {
        // Only these two statuses make a driver visible to team managers.
        if (
          !["available_to_drive", "reserve"].includes(
            driver.availabilityStatus
          )
        ) {
          return false;
        }

        const name = driver.profiles?.name || "";
        const club = driver.profiles?.club || "";
        const query = search.toLowerCase().trim();

        const matchesSearch =
          !query ||
          name.toLowerCase().includes(query) ||
          club.toLowerCase().includes(query);

        const matchesExperience =
          !experience || driver.experience === experience;

        const matchesStatus =
          !status || driver.availabilityStatus === status;

        return matchesSearch && matchesExperience && matchesStatus;
      });
  }, [drivers, availability, roundId, search, experience, status]);

  if (loading) {
    return (
      <>
        <h1>Drivers Available</h1>
        <div className="card">Loading available drivers...</div>
      </>
    );
  }

  return (
    <>
      <h1>Drivers Available</h1>
      <p className="muted">
        Select a championship round to find drivers who are available to drive
        or available as a reserve.
      </p>

      {message && <div className="notice space">{message}</div>}

      {!rounds.length ? (
        <div className="card space">
          No championship rounds have been published yet.
        </div>
      ) : (
        <>
          <div className="card grid two space">
            <label>
              Round
              <select
                className="input"
                value={roundId}
                onChange={(e) => setRoundId(e.target.value)}
              >
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.name} — {round.event_date}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Search
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Driver name or club"
              />
            </label>

            <label>
              Experience
              <select
                className="input"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="">Any experience</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Experienced">Experienced</option>
                <option value="Expert">Expert</option>
              </select>
            </label>

            <label>
              Availability
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Available to drive or reserve</option>
                <option value="available_to_drive">
                  Available to drive
                </option>
                <option value="reserve">Available as a reserve</option>
              </select>
            </label>
          </div>

          <p className="muted">
            {availableDrivers.length} driver
            {availableDrivers.length === 1 ? "" : "s"} found.
          </p>

          <div className="grid two space">
            {availableDrivers.map((driver) => (
              <div className="card" key={driver.profile_id}>
                <div className="driverCardTop">
                  <div>
                    <h2>{driver.profiles?.name || "Driver"}</h2>
                    <p className="muted">
                      {driver.profiles?.club || "Independent driver"}
                    </p>
                  </div>

                  <span
                    className={`status ${driver.availabilityStatus}`}
                  >
                    {driver.availabilityStatus === "available_to_drive"
                      ? "Available to drive"
                      : "Available as a reserve"}
                  </span>
                </div>

                {driver.experience && (
                  <p>
                    <b>Experience:</b> {driver.experience}
                  </p>
                )}

                {driver.classes && driver.classes.length > 0 && (
                  <p>
                    <b>Classes:</b> {driver.classes.join(", ")}
                  </p>
                )}

                {driver.bio && <p className="muted">{driver.bio}</p>}

                <Link
                  className="btn"
                  href={`/drivers/${driver.profile_id}`}
                >
                  View profile
                </Link>
              </div>
            ))}
          </div>

          {!availableDrivers.length && (
            <div className="card space">
              No drivers match your filters for this round.
            </div>
          )}
        </>
      )}
    </>
  );
}
