"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "dashboard" | "find" | "team" | "shortlist";

type Round = {
  id: string;
  name: string;
  event_date: string;
  venue: string | null;
};

type Profile = {
  id: string;
  name: string | null;
  club: string | null;
};

type Driver = {
  profile_id: string;
  classes: string[] | null;
  experience: string | null;
  bio: string | null;
};

type Availability = {
  driver_id: string;
  round_id: string;
  status: string;
};

type TeamDriver = {
  driver_id: string;
  round_id: string;
};

type TeamDriverRequest = {
  id: string;
  team_id: string;
  driver_id: string;
  round_id: string;
  message: string | null;
  status: "pending" | "accepted" | "declined";
};

export default function TeamsArea({
  initialTab = "dashboard",
}: {
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [userId, setUserId] = useState("");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamClub, setTeamClub] = useState("");

  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundId, setRoundId] = useState("");

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [teamDrivers, setTeamDrivers] = useState<TeamDriver[]>([]);
  const [teamRequests, setTeamRequests] = useState<TeamDriverRequest[]>([]);

  const [shortlist, setShortlist] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    setLoading(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const [
      { data: teamData },
      { data: roundsData },
      { data: driversData },
      { data: profilesData },
      { data: availabilityData },
      { data: teamDriversData },
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id,name,club")
        .eq("manager_id", user.id)
        .maybeSingle(),

      supabase
        .from("rounds")
        .select("*")
        .order("event_date"),

      supabase
        .from("drivers")
        .select("profile_id,classes,experience,bio"),

      supabase
        .from("profiles")
        .select("id,name,club"),

      supabase
        .from("driver_availability")
        .select("driver_id,round_id,status"),

      supabase
        .from("team_drivers")
        .select("driver_id,round_id"),
    ]);

    const loadedRounds = (roundsData || []) as Round[];

    const profileMap: Record<string, Profile> = {};

    ((profilesData || []) as Profile[]).forEach((profile) => {
      profileMap[profile.id] = profile;
    });

    setProfiles(profileMap);
    setRounds(loadedRounds);
    setRoundId((current) => current || loadedRounds[0]?.id || "");

    setDrivers((driversData || []) as Driver[]);
    setAvailability((availabilityData || []) as Availability[]);
    setTeamDrivers((teamDriversData || []) as TeamDriver[]);

    if (teamData) {
      setTeamId(teamData.id);
      setTeamName(teamData.name || "");
      setTeamClub(teamData.club || "");

      const { data: requestsData } = await supabase
        .from("team_driver_requests")
        .select("id,team_id,driver_id,round_id,message,status")
        .eq("team_id", teamData.id);

      setTeamRequests(
        (requestsData || []) as TeamDriverRequest[]
      );
    } else {
      setTeamId(null);
      setTeamRequests([]);
    }

    const { data: shortlistData } = await supabase
      .from("team_shortlist")
      .select("driver_id")
      .eq("manager_id", user.id);

    if (shortlistData) {
      setShortlist(shortlistData.map((item) => item.driver_id));
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const driverCards = useMemo(() => {
    return drivers
      .map((driver) => {
        const profile = profiles[driver.profile_id];

        const availabilityEntry = availability.find(
          (item) =>
            item.driver_id === driver.profile_id &&
            item.round_id === roundId
        );

        return {
          ...driver,
          profile,
          status: availabilityEntry?.status || "",
        };
      })
      .filter((driver) => {
        const search = query.toLowerCase().trim();

        const matches =
          search === "" ||
          (driver.profile?.name || "")
            .toLowerCase()
            .includes(search) ||
          (driver.profile?.club || "")
            .toLowerCase()
            .includes(search);

        const isAvailable = [
          "available_to_drive",
          "reserve",
        ].includes(driver.status);

        return (
          isAvailable &&
          matches &&
          (!statusFilter ||
            driver.status === statusFilter)
        );
      });
  }, [
    drivers,
    profiles,
    availability,
    roundId,
    query,
    statusFilter,
  ]);

  const selectedTeamDrivers = useMemo(() => {
    return teamDrivers
      .filter((driver) => driver.round_id === roundId)
      .map((driver) => driver.driver_id);
  }, [teamDrivers, roundId]);

  const pendingRequests = useMemo(() => {
    return teamRequests.filter(
      (request) =>
        request.round_id === roundId &&
        request.status === "pending"
    );
  }, [teamRequests, roundId]);

  function getPendingRequest(driverId: string) {
    return pendingRequests.find(
      (request) => request.driver_id === driverId
    );
  }

  async function saveTeam(e: React.FormEvent) {
    e.preventDefault();

    if (!userId) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    let error: any = null;
    let id = teamId;

    if (teamId) {
      const result = await supabase
        .from("teams")
        .update({
          name: teamName,
          club: teamClub || null,
        })
        .eq("id", teamId);

      error = result.error;
    } else {
      const result = await supabase
        .from("teams")
        .insert({
          name: teamName,
          club: teamClub || null,
          manager_id: userId,
        })
        .select("id")
        .single();

      error = result.error;
      id = result.data?.id || null;
    }

    if (!error && id) {
      setTeamId(id);

      await supabase
        .from("profiles")
        .update({
          role: "team_manager",
        })
        .eq("id", userId);

      setMessage("Team saved successfully.");
    } else {
      setMessage(
        error?.message || "Could not save team."
      );
    }

    setSaving(false);
  }

  async function inviteDriver(driverId: string) {
    if (!teamId || !roundId) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("team_driver_requests")
      .upsert(
        {
          team_id: teamId,
          driver_id: driverId,
          round_id: roundId,
          message:
            "We would like to invite you to join our team for this championship round.",
          status: "pending",
        },
        {
          onConflict: "team_id,driver_id,round_id",
        }
      )
      .select("id,team_id,driver_id,round_id,message,status")
      .single();

    if (error) {
      setMessage(error.message);
    } else if (data) {
      setTeamRequests((current) => [
        ...current.filter(
          (request) =>
            !(
              request.driver_id === driverId &&
              request.round_id === roundId
            )
        ),
        data as TeamDriverRequest,
      ]);

      setMessage(
        "Team invitation sent. The driver must accept before being added to your team."
      );
    }

    setSaving(false);
  }

  async function cancelInvitation(requestId: string) {
    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("team_driver_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      setMessage(error.message);
    } else {
      setTeamRequests((current) =>
        current.filter(
          (request) => request.id !== requestId
        )
      );

      setMessage("Team invitation cancelled.");
    }

    setSaving(false);
  }

  async function removeDriver(driverId: string) {
    if (!teamId || !roundId) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("team_drivers")
      .delete()
      .eq("team_id", teamId)
      .eq("driver_id", driverId)
      .eq("round_id", roundId);

    if (error) {
      setMessage(error.message);
    } else {
      setTeamDrivers((current) =>
        current.filter(
          (driver) =>
            !(
              driver.driver_id === driverId &&
              driver.round_id === roundId
            )
        )
      );

      setMessage("Driver removed from the team.");
    }

    setSaving(false);
  }

  async function toggleShortlist(driverId: string) {
    if (!userId) return;

    const supabase = createClient();

    setMessage("");

    if (shortlist.includes(driverId)) {
      const { error } = await supabase
        .from("team_shortlist")
        .delete()
        .eq("manager_id", userId)
        .eq("driver_id", driverId);

      if (error) {
        setMessage(error.message);
        return;
      }

      setShortlist((current) =>
        current.filter((id) => id !== driverId)
      );
    } else {
      const { error } = await supabase
        .from("team_shortlist")
        .upsert(
          {
            manager_id: userId,
            driver_id: driverId,
          },
          {
            onConflict: "manager_id,driver_id",
          }
        );

      if (error) {
        setMessage(error.message);
        return;
      }

      setShortlist((current) => [
        ...current,
        driverId,
      ]);
    }
  }

  const tabs: [Tab, string][] = [
    ["dashboard", "Dashboard"],
    ["find", "Find a Driver"],
    ["team", "My Team"],
    ["shortlist", "My Shortlist"],
  ];

  if (loading) {
    return (
      <div>
        <h1>Teams</h1>

        <div className="card">
          Loading team area...
        </div>
      </div>
    );
  }

  const RoundSelect = () =>
    rounds.length ? (
      <select
        className="input teamRound"
        value={roundId}
        onChange={(e) => setRoundId(e.target.value)}
      >
        {rounds.map((round) => (
          <option
            key={round.id}
            value={round.id}
          >
            {round.name} — {round.event_date}
          </option>
        ))}
      </select>
    ) : (
      <p className="muted">
        No rounds have been published yet.
      </p>
    );

  const DriverCard = ({ d }: { d: any }) => {
    const isAdded = selectedTeamDrivers.includes(
      d.profile_id
    );

    const pendingRequest = getPendingRequest(
      d.profile_id
    );

    return (
      <div className="card teamDriverCard">
        <div className="driverCardTop">
          <div>
            <h2>
              {d.profile?.name || "Driver"}
            </h2>

            <p className="muted">
              {d.profile?.club ||
                "Independent driver"}
            </p>
          </div>

          <span
            className={`status ${d.status}`}
          >
            {d.status === "reserve"
              ? "Available as a reserve"
              : "Available to drive"}
          </span>
        </div>

        {d.experience && (
          <p>
            <b>Experience:</b> {d.experience}
          </p>
        )}

        {d.classes?.length > 0 && (
          <p>
            <b>Classes:</b>{" "}
            {d.classes.join(", ")}
          </p>
        )}

        <div className="actionRow">
          <Link
            className="btn small"
            href={`/drivers/${d.profile_id}`}
          >
            View profile
          </Link>

          <button
            className="btn secondary small"
            onClick={() =>
              toggleShortlist(d.profile_id)
            }
          >
            {shortlist.includes(d.profile_id)
              ? "Remove shortlist"
              : "Shortlist"}
          </button>

          {teamId && (
            <>
              {isAdded ? (
                <button
                  className="btn small"
                  disabled
                >
                  Added to team
                </button>
              ) : pendingRequest ? (
                <button
                  className="btn secondary small"
                  disabled
                >
                  Invitation pending
                </button>
              ) : (
                <button
                  className="btn small"
                  disabled={saving}
                  onClick={() =>
                    inviteDriver(d.profile_id)
                  }
                >
                  Invite to team
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1>Teams</h1>

      <div className="driverTabs">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            className={`driverTab ${
              tab === id ? "active" : ""
            }`}
            onClick={() => {
              setTab(id);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {message && (
        <div className="notice space">
          {message}
        </div>
      )}

      {tab === "dashboard" && (
        <div className="grid two space">
          <div className="card teamDashboardCard">
            <h2>Find a Driver</h2>

            <p className="muted">
              Search live driver availability by
              championship round and find drivers
              available to drive or act as a reserve.
            </p>

            <button
              className="btn"
              onClick={() => setTab("find")}
            >
              Search drivers
            </button>
          </div>

          <div className="card teamDashboardCard">
            <h2>My Team</h2>

            <p className="muted">
              Create your endurance racing team and
              manage your driver lineup for every
              championship round.
            </p>

            <button
              className="btn"
              onClick={() => setTab("team")}
            >
              Manage team
            </button>
          </div>
        </div>
      )}

      {tab === "find" && (
        <div className="space">
          <div className="card grid two">
            <label>
              Championship round
              <RoundSelect />
            </label>

            <label>
              Search drivers

              <input
                className="input"
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                placeholder="Driver name or club"
              />
            </label>

            <label>
              Availability

              <select
                className="input"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="">
                  Available to drive or reserve
                </option>

                <option value="available_to_drive">
                  Available to drive
                </option>

                <option value="reserve">
                  Available as a reserve
                </option>
              </select>
            </label>
          </div>

          <p className="muted space">
            {driverCards.length} driver
            {driverCards.length === 1
              ? ""
              : "s"}{" "}
            available for this round.
          </p>

          <div className="grid two space">
            {driverCards.map((driver) => (
              <DriverCard
                key={driver.profile_id}
                d={driver}
              />
            ))}
          </div>

          {!driverCards.length && (
            <div className="card space">
              No available drivers match your search.
            </div>
          )}
        </div>
      )}

      {tab === "team" && (
        <div className="space">
          <form
            className="card"
            onSubmit={saveTeam}
          >
            <h2>
              {teamId
                ? "Team details"
                : "Create your team"}
            </h2>

            <label>
              Team name

              <input
                className="input"
                required
                value={teamName}
                onChange={(e) =>
                  setTeamName(e.target.value)
                }
                placeholder="Team name"
              />
            </label>

            <label>
              Club

              <input
                className="input"
                value={teamClub}
                onChange={(e) =>
                  setTeamClub(e.target.value)
                }
                placeholder="Optional club name"
              />
            </label>

            <button
              className="btn space"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : teamId
                ? "Save changes"
                : "Create team"}
            </button>
          </form>

          {teamId && (
            <>
              <div className="card space">
                <h2>Round lineup</h2>

                <RoundSelect />

                <div className="space">
                  {selectedTeamDrivers.length ===
                  0 ? (
                    <p className="muted">
                      No drivers have been confirmed
                      for this round yet.
                    </p>
                  ) : (
                    selectedTeamDrivers.map(
                      (driverId) => {
                        const driver = drivers.find(
                          (item) =>
                            item.profile_id ===
                            driverId
                        );

                        const profile =
                          profiles[driverId];

                        return (
                          <div
                            className="roundRow"
                            key={driverId}
                          >
                            <div>
                              <b>
                                {profile?.name ||
                                  "Driver"}
                              </b>

                              <br />

                              <span className="muted">
                                {profile?.club ||
                                  "Independent driver"}

                                {driver?.experience
                                  ? ` · ${driver.experience}`
                                  : ""}
                              </span>
                            </div>

                            <button
                              className="btn danger small"
                              disabled={saving}
                              onClick={() =>
                                removeDriver(
                                  driverId
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              <div className="card space">
                <h2>Pending invitations</h2>

                <RoundSelect />

                <div className="space">
                  {pendingRequests.length ===
                  0 ? (
                    <p className="muted">
                      You have no pending invitations
                      for this round.
                    </p>
                  ) : (
                    pendingRequests.map(
                      (request) => {
                        const profile =
                          profiles[request.driver_id];

                        return (
                          <div
                            className="roundRow"
                            key={request.id}
                          >
                            <div>
                              <b>
                                {profile?.name ||
                                  "Driver"}
                              </b>

                              <br />

                              <span className="muted">
                                Invitation pending
                              </span>
                            </div>

                            <button
                              className="btn danger small"
                              disabled={saving}
                              onClick={() =>
                                cancelInvitation(
                                  request.id
                                )
                              }
                            >
                              Cancel invitation
                            </button>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "shortlist" && (
        <div className="space">
          <div className="card">
            <h2>My Shortlist</h2>

            <p className="muted">
              Save drivers here so you can quickly
              find them again.
            </p>
          </div>

          <div className="grid two space">
            {shortlist.map((driverId) => {
              const driver = drivers.find(
                (item) =>
                  item.profile_id === driverId
              );

              if (!driver) return null;

              const profile = profiles[driverId];

              return (
                <div
                  className="card"
                  key={driverId}
                >
                  <h2>
                    {profile?.name || "Driver"}
                  </h2>

                  <p className="muted">
                    {profile?.club ||
                      "Independent driver"}
                  </p>

                  <div className="actionRow">
                    <Link
                      className="btn small"
                      href={`/drivers/${driverId}`}
                    >
                      View profile
                    </Link>

                    <button
                      className="btn danger small"
                      onClick={() =>
                        toggleShortlist(driverId)
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!shortlist.length && (
            <div className="card space">
              Your shortlist is empty.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
