import ChampionshipTabs from "@/components/ChampionshipTabs";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ChampionshipPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: rounds, error } = await supabase
    .from("rounds")
    .select("*")
    .order("event_date", { ascending: true });

  return (
    <>
      <h1>Championship</h1>

      <ChampionshipTabs />

      <div className="space">
        {error ? (
          <div className="card">
            <p>Could not load championship rounds.</p>
            <p className="muted">{error.message}</p>
          </div>
        ) : !rounds || rounds.length === 0 ? (
          <div className="card">
            No rounds have been published yet.
          </div>
        ) : (
          rounds.map((round) => (
            <div className="card space" key={round.id}>
              <h2>{round.name}</h2>

              <p className="muted">
                {round.event_date}
                {round.venue ? ` · ${round.venue}` : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
