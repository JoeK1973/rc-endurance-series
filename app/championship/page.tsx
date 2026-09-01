import ChampionshipTabs from "@/components/ChampionshipTabs";
import { createClient } from "@supabase/supabase-js";

export default async function ChampionshipPage() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: rounds } = await s
    .from("rounds")
    .select("*")
    .order("event_date");

  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />
      <div className="space">
        {!rounds?.length ? (
          <div className="card">No rounds have been published yet.</div>
        ) : (
          rounds.map((r) => (
            <div className="card space" key={r.id}>
              <h2>{r.name}</h2>
              <p className="muted">
                {r.event_date}{r.venue ? " · " + r.venue : ""}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}
