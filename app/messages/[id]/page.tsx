"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ConversationPage({params}:{params:Promise<{id:string}>}) {
  const {id}=use(params);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const [title,setTitle]=useState("Conversation"),[subtitle,setSubtitle]=useState("");
  const [userId,setUserId]=useState(""),[messages,setMessages]=useState<any[]>([]);
  const [body,setBody]=useState(""),[sending,setSending]=useState(false);
  const bottomRef=useRef<HTMLDivElement>(null);

  async function load(){
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){location.href="/login";return;}
    setUserId(user.id);
    const {data:c,error:cError}=await s.from("conversations").select("*").eq("id",id).maybeSingle();
    if(cError||!c){setError(cError?.message||"Conversation not found.");setLoading(false);return;}

    const {data:myTeams}=await s.from("teams").select("id").eq("manager_id",user.id);
    const teamIds=(myTeams||[]).map((x:any)=>x.id);
    if(c.driver_id!==user.id&&!teamIds.includes(c.team_id)){setError("You do not have access to this conversation.");setLoading(false);return;}

    const [{data:team},{data:profile},{data:round},{data:rows,error:mError}]=await Promise.all([
      s.from("teams").select("name").eq("id",c.team_id).maybeSingle(),
      s.from("profiles").select("name").eq("id",c.driver_id).maybeSingle(),
      s.from("rounds").select("name").eq("id",c.round_id).maybeSingle(),
      s.from("messages").select("*").eq("conversation_id",id).order("created_at",{ascending:true})
    ]);
    if(mError)setError(mError.message);
    setTitle(c.driver_id===user.id?(team?.name||"Team"):(profile?.name||"Driver"));
    setSubtitle(round?.name||"Championship round");
    setMessages(rows||[]);
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),50);

    const unread=(rows||[]).filter((m:any)=>m.sender_id!==user.id&&!m.read_at).map((m:any)=>m.id);
    if(unread.length)await s.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);
  }
  useEffect(()=>{load()},[id]);

  async function send(){
    const text=body.trim();if(!text||sending)return;
    setSending(true);setError("");
    const s=createClient();
    const {data,error}=await s.from("messages").insert({conversation_id:id,sender_id:userId,body:text}).select().single();
    if(error)setError(error.message);else if(data){setMessages(x=>[...x,data]);setBody("");setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),20);}
    setSending(false);
  }

  if(loading)return <><h1>Messages</h1><div className="card">Loading conversation...</div></>;
  if(error)return <><h1>Messages</h1><div className="notice">{error}</div><Link className="btn space" href="/messages">Back to messages</Link></>;

  return <div>
    <Link className="muted" href="/messages">← Back to messages</Link>
    <div className="messageHeader"><h1>{title}</h1><p className="muted">{subtitle}</p></div>
    <div className="card messageThread">
      {!messages.length&&<p className="muted">No messages yet.</p>}
      {messages.map(m=><div className={`messageBubble ${m.sender_id===userId?"mine":"theirs"}`} key={m.id}>
        <div>{m.body}</div><small>{new Date(m.created_at).toLocaleString()}</small>
      </div>)}
      <div ref={bottomRef}/>
    </div>
    <div className="card space">
      <textarea className="input textarea" value={body} onChange={e=>setBody(e.target.value)} placeholder="Type a message..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
      <button className="btn space" disabled={sending||!body.trim()} onClick={send}>{sending?"Sending...":"Send message"}</button>
    </div>
  </div>;
}