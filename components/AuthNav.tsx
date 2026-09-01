"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {createClient} from "@/lib/supabase/client";
export default function AuthNav(){
 const[state,setState]=useState<{role:string}|null>(null);
 useEffect(()=>{const s=createClient();const load=async()=>{const{data:{user}}=await s.auth.getUser();if(!user){setState(null);return;}const{data:p}=await s.from("profiles").select("role").eq("id",user.id).maybeSingle();setState({role:p?.role||"driver"});};load();const{data}=s.auth.onAuthStateChange(()=>load());return()=>data.subscription.unsubscribe()},[]);
 if(!state)return <><Link className="nav" href="/login">Login</Link><Link className="nav" href="/register">Register</Link></>;
 return <><Link className="nav" href="/driver-area">Driver Area</Link><Link className="nav" href="/messages">Messages</Link>{state.role==="admin"&&<Link className="nav" href="/admin">Admin</Link>}<button className="linkButton" onClick={async()=>{await createClient().auth.signOut();location.href="/"}}>Logout</button></>;
}