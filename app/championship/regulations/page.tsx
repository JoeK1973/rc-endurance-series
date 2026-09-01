import ChampionshipTabs from "@/components/ChampionshipTabs";

export default function RegulationsPage() {
  return (
    <>
      <h1>Championship</h1>
      <ChampionshipTabs />
      <div className="card space">
        <h2>Regulations</h2>
        <p className="muted">
          Championship regulations will be published here by the series administrator.
        </p>
      </div>
    </>
  );
}
