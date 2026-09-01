"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Tab = "dashboard" | "find" | "team" | "shortlist";
type Round = { id:string; name:string; event_date:string; venue:string|null };
type Profile = { id:string; name:string|null; club:string|null };
type Driver = { profile_id:string; classes:string[]|null; experience:string|null; bio:string|null };
type Availability = { driver_id:string; round_id:string; status:string };
type TeamDriver = { driver_id:string; round_id:string };

export default function TeamsArea({ initialTab="dashboard" }:{initialTab?:Tab}) {
  const [tab,setTab]=useState<Tab>(initialTab);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [userId,setUserId]=useState("");
  const [teamId,setTeamId]=useState<string|null>(null);
  const [teamName,setTeamName]=useState("");
  const [teamClub,setTeamClub]=useState("");
  const [rounds,setRounds]=useState<Round[]>([]);
  const [roundId,setRoundId]=useState("");
  const [drivers,setDrivers]=useState<Driver[]>([]);
  const [profiles,setProfiles]=useState<Record<string,Profile>>({});
  const [availability,setAvailability]=useState<Availability[]>([]);
  const [teamDrivers,setTeamDrivers]=useState<TeamDriver[]>([]);
  const [shortlist,setShortlist]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [statusFilter,setStatusFilter]=useState("");

  async function load(){
    setLoading(true);
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){window.location.href="/login";return;}
    setUserId(user.id);

    const [{data:t},{data:r},{data:d},{data:p},{data:a},{data:td}] = await Promise.all([
      s.from("teams").select("id,name,club").eq("manager_id",user.id).maybeSingle(),
      s.from("rounds").select("*").order("event_date"),
      s.from("drivers").select("profile_id,classes,experience,bio"),
      s.from("profiles").select("id,name,club"),
      s.from("driver_availability").select("driver_id,round_id,status"),
      s.from("team_drivers").select("driver_id,round_id"),
    ]);

    const rr=(r||[]) as Round[];
    const map:Record<string,Profile>={};
    ((p||[]) as Profile[]).forEach(x=>map[x.id]=x);
    setProfiles(map);setRounds(rr);setRoundId(current=>current||rr[0]?.id||"");
    setDrivers((d||[]) as Driver[]);setAvailability((a||[]) as Availability[]);
    setTeamDrivers((td||[]) as TeamDriver[]);
    if(t){setTeamId(t.id);setTeamName(t.name||"");setTeamClub(t.club||"");}

    const {data:sl}=await s.from("team_shortlist").select("driver_id").eq("manager_id",user.id);
    if(sl)setShortlist(sl.map(x=>x.driver_id));
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  const driverCards=useMemo(()=>drivers.map(d=>{
    const p=profiles[d.profile_id];
    const a=availability.find(x=>x.driver_id===d.profile_id&&x.round_id===roundId);
    return {...d,profile:p,status:a?.status||""};
  }).filter(d=>{
    const q=query.toLowerCase().trim();
    const matches=q===""||(d.profile?.name||"").toLowerCase().includes(q)||(d.profile?.club||"").toLowerCase().includes(q);
    const available=["available_to_drive","reserve"].includes(d.status);
    return available&&matches&&(!statusFilter||d.status===statusFilter);
  }),[drivers,profiles,availability,roundId,query,statusFilter]);

  const selectedTeamDrivers=useMemo(()=>teamDrivers.filter(x=>x.round_id===roundId).map(x=>x.driver_id),[teamDrivers,roundId]);

  async function saveTeam(e:React.FormEvent){
    e.preventDefault();if(!userId)return;
    setSaving(true);setMessage("");
    const s=createClient();
    let error:any=null, id=teamId;
    if(teamId){
      const x=await s.from("teams").update({name:teamName,club:teamClub||null}).eq("id",teamId);error=x.error;
    }else{
      const x=await s.from("teams").insert({name:teamName,club:teamClub||null,manager_id:userId}).select("id").single();
      error=x.error;id=x.data?.id||null;
    }
    if(!error&&id){setTeamId(id);await s.from("profiles").update({role:"team_manager"}).eq("id",userId);setMessage("Team saved successfully.");}
    else setMessage(error?.message||"Could not save team.");
    setSaving(false);
  }

  async function addDriver(driverId:string){
    if(!teamId||!roundId)return;
    setSaving(true);setMessage("");
    const s=createClient();
    const {error}=await s.from("team_drivers").upsert({team_id:teamId,driver_id:driverId,round_id:roundId},{onConflict:"team_id,driver_id,round_id"});
    if(error)setMessage(error.message);
    else {setTeamDrivers(x=>[...x.filter(v=>!(v.driver_id===driverId&&v.round_id===roundId)),{driver_id:driverId,round_id:roundId}]);setMessage("Driver added to the team for this round.");}
    setSaving(false);
  }

  async function removeDriver(driverId:string){
    if(!teamId||!roundId)return;
    setSaving(true);const s=createClient();
    const {error}=await s.from("team_drivers").delete().eq("team_id",teamId).eq("driver_id",driverId).eq("round_id",roundId);
    if(error)setMessage(error.message);
    else setTeamDrivers(x=>x.filter(v=>!(v.driver_id===driverId&&v.round_id===roundId)));
    setSaving(false);
  }

  async function toggleShortlist(driverId:string){
    if(!userId)return;
    const s=createClient();setMessage("");
    if(shortlist.includes(driverId)){
      const {error}=await s.from("team_shortlist").delete().eq("manager_id",userId).eq("driver_id",driverId);
      if(error){setMessage(error.message);return;}setShortlist(x=>x.filter(id=>id!==driverId));
    }else{
      const {error}=await s.from("team_shortlist").upsert({manager_id:userId,driver_id:driverId},{onConflict:"manager_id,driver_id"});
      if(error){setMessage(error.message);return;}setShortlist(x=>[...x,driverId]);
    }
  }

  const tabs:[Tab,string][]=[["dashboard","Dashboard"],["find","Find a Driver"],["team","My Team"],["shortlist","My Shortlist"]];
  if(loading)return <div><h1>Teams</h1><div className="card">Loading team area...</div></div>;

  const RoundSelect=()=>rounds.length?<select className="input teamRound" value={roundId} onChange={e=>setRoundId(e.target.value)}>{rounds.map(r=><option key={r.id} value={r.id}>{r.name} — {r.event_date}</option>)}</select>:<p className="muted">No rounds have been published yet.</p>;

  const DriverCard=({d}:{d:any})=><div className="card teamDriverCard">
    <div className="driverCardTop"><div><h2>{d.profile?.name||"Driver"}</h2><p className="muted">{d.profile?.club||"Independent driver"}</p></div><span className={`status ${d.status}`}>{d.status==="reserve"?"Available as a reserve":"Available to drive"}</span></div>
    {d.experience&&<p><b>Experience:</b> {d.experience}</p>}
    {d.classes?.length>0&&<p><b>Classes:</b> {d.classes.join(", ")}</p>}
    <div className="actionRow"><Link className="btn small" href={`/drivers/${d.profile_id}`}>View profile</Link>
    <button className="btn secondary small" onClick={()=>toggleShortlist(d.profile_id)}>{shortlist.includes(d.profile_id)?"Remove shortlist":"Shortlist"}</button>
    {teamId&&<button className="btn small" disabled={saving||selectedTeamDrivers.includes(d.profile_id)} onClick={()=>addDriver(d.profile_id)}>{selectedTeamDrivers.includes(d.profile_id)?"Added to team":"Add to team"}</button>}</div>
  </div>;

  return <div>
    <h1>Teams</h1>
    <div className="driverTabs">{tabs.map(([id,label])=><button key={id} className={`driverTab ${tab===id?"active":""}`} onClick={()=>{setTab(id);setMessage("")}}>{label}</button>)}</div>
    {message&&<div className="notice space">{message}</div>}

    {tab==="dashboard"&&<div className="grid two space">
      <div className="card teamDashboardCard"><h2>Find a Driver</h2><p className="muted">Search live driver availability by championship round and find drivers available to drive or act as a reserve.</p><button className="btn" onClick={()=>setTab("find")}>Search drivers</button></div>
      <div className="card teamDashboardCard"><h2>My Team</h2><p className="muted">Create your endurance racing team and manage your driver lineup for every championship round.</p><button className="btn" onClick={()=>setTab("team")}>Manage team</button></div>
    </div>}

    {tab==="find"&&<div className="space"><div className="card grid two">
      <label>Championship round<RoundSelect/></label>
      <label>Search drivers<input className="input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Driver name or club"/></label>
      <label>Availability<select className="input" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Available to drive or reserve</option><option value="available_to_drive">Available to drive</option><option value="reserve">Available as a reserve</option></select></label>
    </div><p className="muted space">{driverCards.length} driver{driverCards.length===1?"":"s"} available for this round.</p>
    <div className="grid two space">{driverCards.map(d=><DriverCard key={d.profile_id} d={d}/>)}</div>{!driverCards.length&&<div className="card space">No available drivers match your search.</div>}</div>}

    {tab==="team"&&<div className="space">
      <form className="card" onSubmit={saveTeam}><h2>{teamId?"Team details":"Create your team"}</h2>
        <label>Team name<input className="input" required value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder="Team name"/></label>
        <label>Club<input className="input" value={teamClub} onChange={e=>setTeamClub(e.target.value)} placeholder="Optional club name"/></label>
        <button className="btn space" disabled={saving}>{saving?"Saving...":teamId?"Save changes":"Create team"}</button>
      </form>
      {teamId&&<div className="card space"><h2>Round lineup</h2><RoundSelect/>
        <div className="space">{selectedTeamDrivers.length===0?<p className="muted">No drivers have been added for this round yet. Use Find a Driver to build your lineup.</p>:selectedTeamDrivers.map(id=>{const d=drivers.find(x=>x.profile_id===id);const p=profiles[id];return <div className="roundRow" key={id}><div><b>{p?.name||"Driver"}</b><br/><span className="muted">{p?.club||"Independent driver"}{d?.experience?` · ${d.experience}`:""}</span></div><button className="btn danger small" disabled={saving} onClick={()=>removeDriver(id)}>Remove</button></div>})}</div>
      </div>}
    </div>}

    {tab==="shortlist"&&<div className="space"><div className="card"><h2>My Shortlist</h2><p className="muted">Save drivers here so you can quickly find them again.</p></div>
      <div className="grid two space">{shortlist.map(id=>{const d=drivers.find(x=>x.profile_id===id);if(!d)return null;const p=profiles[id];return <div className="card" key={id}><h2>{p?.name||"Driver"}</h2><p className="muted">{p?.club||"Independent driver"}</p><div className="actionRow"><Link className="btn small" href={`/drivers/${id}`}>View profile</Link><button className="btn danger small" onClick={()=>toggleShortlist(id)}>Remove</button></div></div>})}</div>
      {!shortlist.length&&<div className="card space">Your shortlist is empty.</div>}
    </div>}
  </div>;
}