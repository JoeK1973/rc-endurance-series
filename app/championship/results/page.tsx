import ChampionshipTabs from "@/components/ChampionshipTabs";

export default function ResultsPage() {
  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />
      <div className="card space">
        <h2>Results</h2>
        <p className="muted">
          Round and championship results will appear here.
        </p>
      </div>
    </>
  );
}
