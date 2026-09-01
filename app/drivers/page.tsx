import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DriversPage() {
  const supabase = await createClient();

  const [
    { data: roundsData },
    { data: driversData, error: driversError },
    { data: availabilityData },
  ] = await Promise.all([
    supabase
      .from("rounds")
      .select("*")
      .order("event_date"),

    supabase
      .from("drivers")
      .select(`
        profile_id,
        classes,
        experience,
        endurance_experience,
        bio,
        profiles!drivers_profile_id_fkey (
          name,
          club
        )
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
    return (
      <>
        <h1>Drivers</h1>

        <div className="card">
          <h2>Unable to load drivers</h2>
          <p className="muted">{driversError.message}</p>
        </div>
      </>
    );
  }

  const rounds = roundsData || [];
  const drivers = driversData || [];
  const availability = availabilityData || [];

  const availableDrivers = drivers.filter((driver: any) => {
    return availability.some(
      (item: any) =>
        item.driver_id === driver.profile_id &&
        [
          "available_to_drive",
          "available_reserve",
          "looking_for_team",
          "reserve",
        ].includes(item.status)
    );
  });

  return (
    <>
      <h1>Find a Driver</h1>

      <p className="muted">
        Search drivers who have marked themselves as available to drive or
        available as a reserve.
      </p>

      {rounds.length === 0 ? (
        <div className="card space">
          <p>No championship rounds have been added yet.</p>
        </div>
      ) : null}

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
          {availableDrivers.map((driver: any) => {
            const profile = Array.isArray(driver.profiles)
              ? driver.profiles[0]
              : driver.profiles;

            const driverAvailability = availability.filter(
              (item: any) => item.driver_id === driver.profile_id
            );

            const availableToDrive = driverAvailability.some(
              (item: any) =>
                item.status === "available_to_drive" ||
                item.status === "looking_for_team"
            );

            const availableAsReserve = driverAvailability.some(
              (item: any) =>
                item.status === "available_reserve" ||
                item.status === "reserve"
            );

            return (
              <div className="card" key={driver.profile_id}>
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

                <div className="space">
                  {availableToDrive && (
                    <span className="status available_to_drive">
                      Available to drive
                    </span>
                  )}

                  {availableAsReserve && (
                    <span className="status available_reserve">
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
