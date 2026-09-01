"use client";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";

type Round={id:string;name:string;event_date:string;venue:string|null};

export default function AdminRounds(){
 const [rounds,setRounds]=useState<Round[]>([]);
 const [name,setName]=useState("");
 const [date,setDate]=useState("");
 const [venue,setVenue]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 const load=async()=>{const s=createClient();const{data,error}=await s.from("rounds").select("*").order("event_date");if(error)setMessage(error.message);setRounds(data||[])};
 useEffect(()=>{load()},[]);
 function clear(){setName("");setDate("");setVenue("");setEditing(null)}
 async function save(e:React.FormEvent){
  e.preventDefault();setMessage("");
  const s=createClient();
  const values={name,event_date:date,venue:venue||null};
  const q=editing?s.from("rounds").update(values).eq("id",editing):s.from("rounds").insert(values);
  const{error}=await q;
  if(error){setMessage(error.message);return}
  setMessage(editing?"Round updated.":"Round added.");clear();load();
 }
 async function remove(id:string){
  if(!confirm("Delete this round?"))return;
  const{error}=await createClient().from("rounds").delete().eq("id",id);
  setMessage(error?error.message:"Round deleted.");load();
 }
 function edit(r:Round){setEditing(r.id);setName(r.name);setDate(r.event_date);setVenue(r.venue||"");window.scrollTo({top:0,behavior:"smooth"})}
 return <div className="space">
  <form className="card" onSubmit={save}>
   <h2>{editing?"Edit round":"Add a round"}</h2>
   <label>Round name<input className="input" required value={name} onChange={e=>setName(e.target.value)} placeholder="Round 4 – Summer Endurance"/></label>
   <label>Date<input className="input" required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
   <label>Venue<input className="input" value={venue} onChange={e=>setVenue(e.target.value)} placeholder="Club or venue"/></label>
   <button className="btn space" type="submit">{editing?"Save changes":"Add round"}</button>
   {editing&&<button type="button" className="btn secondary space" onClick={clear}>Cancel</button>}
   {message&&<p className="space">{message}</p>}
  </form>
  <div className="card space"><h2>Existing rounds</h2>
   {!rounds.length?<p className="muted">No rounds have been added yet.</p>:rounds.map(r=><div className="roundRow" key={r.id}><div><b>{r.name}</b><br/><span className="muted">{r.event_date}{r.venue?" · "+r.venue:""}</span></div><div><button className="btn small" onClick={()=>edit(r)}>Edit</button><button className="btn danger small" onClick={()=>remove(r.id)}>Delete</button></div></div>)}
  </div>
 </div>
}