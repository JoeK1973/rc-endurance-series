"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MessagesPage() {
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [items,setItems]=useState<any[]>([]);

  useEffect(()=>{(async()=>{
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){location.href="/login";return;}

    const {data:myTeams,error:teamError}=await s.from("teams").select("id").eq("manager_id",user.id);
    if(teamError){setError(teamError.message);setLoading(false);return;}
    const teamIds=(myTeams||[]).map((x:any)=>x.id);

    let query=s.from("conversations").select("*").eq("driver_id",user.id);
    if(teamIds.length) query=query.or(`driver_id.eq.${user.id},team_id.in.(${teamIds.join(",")})`);
    const {data:conversations,error:conversationError}=await query.order("created_at",{ascending:false});
    if(conversationError){setError(conversationError.message);setLoading(false);return;}

    const ids=(conversations||[]).map((x:any)=>x.id);
    const [{data:teams},{data:profiles},{data:rounds},{data:messages}]=await Promise.all([
      s.from("teams").select("id,name"),
      s.from("profiles").select("id,name"),
      s.from("rounds").select("id,name,event_date"),
      ids.length?s.from("messages").select("*").in("conversation_id",ids).order("created_at",{ascending:false}):Promise.resolve({data:[]})
    ]);

    const teamMap:any={};(teams||[]).forEach((x:any)=>teamMap[x.id]=x);
    const profileMap:any={};(profiles||[]).forEach((x:any)=>profileMap[x.id]=x);
    const roundMap:any={};(rounds||[]).forEach((x:any)=>roundMap[x.id]=x);
    const latest:any={};(messages||[]).forEach((x:any)=>{if(!latest[x.conversation_id])latest[x.conversation_id]=x;});

    setItems((conversations||[]).map((c:any)=>{
      const last=latest[c.id];
      const isDriver=c.driver_id===user.id;
      return {
        ...c,
        title:isDriver?(teamMap[c.team_id]?.name||"Team"):(profileMap[c.driver_id]?.name||"Driver"),
        round:roundMap[c.round_id]?.name||"Championship round",
        preview:last?.body||"No messages yet",
        updated:last?.created_at||c.created_at,
        unread:last && last.sender_id!==user.id && !last.read_at
      };
    }).sort((a:any,b:any)=>new Date(b.updated).getTime()-new Date(a.updated).getTime()));
    setLoading(false);
  })()},[]);

  if(loading)return <><h1>Messages</h1><div className="card">Loading conversations...</div></>;
  if(error)return <><h1>Messages</h1><div className="notice">{error}</div></>;

  return <div>
    <h1>Messages</h1>
    <p className="muted">Your conversations with teams and drivers.</p>
    {!items.length?<div className="card space"><h2>No conversations yet</h2><p className="muted">When a team manager contacts a driver, the conversation will appear here.</p></div>:
    <div className="messageInbox space">
      <div className="conversationList">
        {items.map(c=><Link href={`/messages/${c.id}`} className="conversationItem" key={c.id}>
          <div className="conversationTitle">{c.title}{c.unread&&<span className="unreadDot"/>}</div>
          <div className="conversationRound">{c.round}</div>
          <div className="conversationPreview">{c.preview}</div>
          <div className="conversationDate">{new Date(c.updated).toLocaleString()}</div>
        </Link>)}
      </div>
      <div className="messageEmpty card"><h2>Select a conversation</h2><p className="muted">Choose a conversation from the left to read and reply.</p></div>
    </div>}
  </div>;
}