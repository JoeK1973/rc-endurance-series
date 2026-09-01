import { createClient } from "@/lib/supabase/server";
import StartConversation from "@/components/StartConversation";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DriverProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: driver, error: driverError },
    { data: rounds },
  ] = await Promise.all([
    supabase
      .from("drivers")
      .select(
        "profile_id,experience,bio,classes,endurance_experience,profiles(name,club)"
      )
      .eq("profile_id", id)
      .maybeSingle(),
    supabase.from("rounds").select("*").order("event_date"),
  ]);

  if (driverError || !driver) {
    return (
      <div className="card">
        <h1>Driver not found</h1>
        <p className="muted">
          {driverError?.message || "This driver profile could not be loaded."}
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
        rounds={rounds || []}
      />
    </>
  );
}
