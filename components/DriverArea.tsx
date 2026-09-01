"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Tab = "dashboard" | "profile" | "availability" | "requests";
type Round = { id:string; name:string; event_date:string; venue:string|null };
type Availability = { round_id:string; status:string };

const statuses = [
  ["have_team", "Have a team"],
  ["available_to_drive", "Available to drive"],
  ["reserve", "Available as a reserve"],
  ["unavailable", "Not available"],
] as const;

export default function DriverArea(){
  const [tab,setTab]=useState<Tab>("dashboard");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [userId,setUserId]=useState<string|null>(null);
  const [profile,setProfile]=useState({name:"",club:""});
  const [driver,setDriver]=useState({classes:"",experience:"",endurance_experience:"",bio:""});
  const [rounds,setRounds]=useState<Round[]>([]);
  const [availability,setAvailability]=useState<Availability[]>([]);
  const [conversations,setConversations]=useState<any[]>([]);

  async function load(){
    setLoading(true);setNotice("");
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){window.location.href="/login";return;}
    setUserId(user.id);

    const [{data:p},{data:d},{data:r},{data:a},{data:c}] = await Promise.all([
      s.from("profiles").select("name,club").eq("id",user.id).maybeSingle(),
      s.from("drivers").select("classes,experience,endurance_experience,bio").eq("profile_id",user.id).maybeSingle(),
      s.from("rounds").select("*").order("event_date"),
      s.from("driver_availability").select("round_id,status").eq("driver_id",user.id),
      s.from("conversations").select("id,round_id,created_at,teams(name),rounds(name)").eq("driver_id",user.id).order("created_at",{ascending:false}),
    ]);

    if(p)setProfile({name:p.name||"",club:p.club||""});
    else setProfile({name:user.user_metadata?.name||"",club:""});
    if(d)setDriver({classes:(d.classes||[]).join(", "),experience:d.experience||"",endurance_experience:d.endurance_experience||"",bio:d.bio||""});
    setRounds(r||[]);setAvailability(a||[]);setConversations(c||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function saveProfile(e:React.FormEvent){
    e.preventDefault();if(!userId)return;
    setSaving(true);setNotice("");
    const s=createClient();
    const classes=driver.classes.split(",").map(x=>x.trim()).filter(Boolean);
    const {error:pError}=await s.from("profiles").upsert({id:userId,name:profile.name,club:profile.club},{onConflict:"id"});
    if(pError){setNotice(pError.message);setSaving(false);return;}
    const {error:dError}=await s.from("drivers").upsert({
      profile_id:userId,classes,experience:driver.experience||null,
      endurance_experience:driver.endurance_experience||null,bio:driver.bio||null
    },{onConflict:"profile_id"});
    setSaving(false);setNotice(dError?dError.message:"Driver profile saved successfully.");
  }

  async function setStatus(roundId:string,status:string){
    if(!userId)return;
    setSaving(true);setNotice("");
    const s=createClient();
    const {error}=await s.from("driver_availability").upsert(
      {driver_id:userId,round_id:roundId,status},
      {onConflict:"driver_id,round_id"}
    );
    setSaving(false);
    if(error){setNotice(`Could not save availability: ${error.message}`);return;}
    setAvailability(prev=>{
      const rest=prev.filter(x=>x.round_id!==roundId);
      return [...rest,{round_id:roundId,status}];
    });
    setNotice("Availability updated.");
  }

  const availableCount = availability.filter(
  x =>
    x.status === "available_to_drive" ||
    x.status === "reserve"
).length;
  
  const upcoming=useMemo(()=>rounds.filter(r=>new Date(r.event_date+"T23:59:59")>=new Date()),[rounds]);

  if(loading)return <div className="card"><h2>Loading your driver area...</h2></div>;

  const TabButton=({id,label}:{id:Tab;label:string})=><button className={`driverTab ${tab===id?"active":""}`} onClick={()=>{setTab(id);setNotice("")}}>{label}</button>;

  return <div>
    <h1>Driver Area</h1>
    <div className="driverTabs">
      <TabButton id="dashboard" label="Dashboard"/>
      <TabButton id="profile" label="My Profile"/>
      <TabButton id="availability" label="My Availability"/>
      <TabButton id="requests" label="Contact Requests"/>
    </div>

    {notice&&<div className="notice space">{notice}</div>}

    {tab==="dashboard"&&<div className="space">
      <div className="grid two">
        <div className="card"><h2>Welcome, {profile.name||"Driver"}</h2><p className="muted">Keep your profile and round availability up to date so team managers can find you.</p></div>
        <div className="card"><h2>Your status</h2><p><b>{availableCount}</b> round{availableCount===1?"":"s"} marked available</p><p><b>{conversations.length}</b> team conversation{conversations.length===1?"":"s"}</p></div>
      </div>
      <div className="card space"><h2>Quick actions</h2><div className="actionRow">
        <button className="btn" onClick={()=>setTab("profile")}>Edit my profile</button>
        <button className="btn" onClick={()=>setTab("availability")}>Set availability</button>
        <button className="btn" onClick={()=>setTab("requests")}>View contact requests</button>
      </div></div>
      <div className="card space"><h2>Upcoming rounds</h2>
        {!upcoming.length?<p className="muted">No upcoming rounds have been added yet.</p>:upcoming.slice(0,5).map(r=>{
          const a=availability.find(x=>x.round_id===r.id);
          return <div className="roundRow" key={r.id}><div><b>{r.name}</b><br/><span className="muted">{r.event_date}{r.venue?` · ${r.venue}`:""}</span></div><span className={`status ${a?.status||"none"}`}>{statuses.find(x=>x[0]===a?.status)?.[1]||"Not set"}</span></div>
        })}
      </div>
    </div>}

    {tab==="profile"&&<form className="card space" onSubmit={saveProfile}>
      <h2>My Driver Profile</h2><p className="muted">This information is shown to team managers when they view your driver profile.</p>
      <label>Display name<input className="input" required value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
      <label>Club<input className="input" value={profile.club} onChange={e=>setProfile({...profile,club:e.target.value})} placeholder="Your RC club"/></label>
      <label>Classes<input className="input" value={driver.classes} onChange={e=>setDriver({...driver,classes:e.target.value})} placeholder="e.g. Touring Car, GT12"/></label>
      <label>Racing experience<select className="input" value={driver.experience} onChange={e=>setDriver({...driver,experience:e.target.value})}><option value="">Select experience</option><option>Beginner</option><option>Intermediate</option><option>Experienced</option><option>Expert</option></select></label>
      <label>Endurance experience<textarea className="input textarea" value={driver.endurance_experience} onChange={e=>setDriver({...driver,endurance_experience:e.target.value})} placeholder="Previous endurance races, roles or experience"/></label>
      <label>About me<textarea className="input textarea" value={driver.bio} onChange={e=>setDriver({...driver,bio:e.target.value})} placeholder="Tell teams about yourself, your strengths and what you are looking for."/></label>
      <button className="btn space" disabled={saving}>{saving?"Saving...":"Save profile"}</button>
    </form>}

    {tab==="availability"&&<div className="card space">
      <h2>Manage your racing availability</h2><p className="muted">Choose your status for each championship round. Drivers marked as looking for a team or reserve can be found by team managers.</p>
      {!rounds.length?<p className="muted">No rounds have been added yet.</p>:rounds.map(r=>{
        const current=availability.find(x=>x.round_id===r.id)?.status||"";
        return <div className="availabilityRow" key={r.id}><div><b>{r.name}</b><br/><span className="muted">{r.event_date}{r.venue?` · ${r.venue}`:""}</span></div>
          <select className="input availabilitySelect" value={current} disabled={saving} onChange={e=>setStatus(r.id,e.target.value)}>
            <option value="">Not set</option>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      })}
    </div>}

    {tab==="requests"&&<div className="card space">
      <h2>Contact Requests</h2><p className="muted">Team managers who contact you through the app will appear here.</p>
      {!conversations.length?<p className="muted">You have no team conversations yet.</p>:conversations.map(c=>{
        const team=Array.isArray(c.teams)?c.teams[0]:c.teams;
        const round=Array.isArray(c.rounds)?c.rounds[0]:c.rounds;
        return <div className="roundRow" key={c.id}><div><b>{team?.name||"Team"}</b><br/><span className="muted">{round?.name||"Championship round"} · {new Date(c.created_at).toLocaleDateString()}</span></div><a className="btn small" href="/messages">Open message</a></div>
      })}
    </div>}
  </div>
}
