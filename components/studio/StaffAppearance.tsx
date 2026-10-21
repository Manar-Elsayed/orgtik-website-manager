"use client";
import { useEffect, useRef, useState } from "react";
import { useTheme, type SuitePreferences } from "@orgtik/ui";
import { useClientSession } from "@orgtik/ui/auth";
import { useStudio, wmRequest, studioAuthority, type StaffPreferences } from "@/lib/studio";
import { getToken } from "@/lib/session";
import { useRouter } from "@/i18n/routing";
export function useStaffAppearance(pathname:string,locale:string){const session=useClientSession(),router=useRouter(),resource=useStudio<StaffPreferences>(getToken()?"/studio/preferences":null),[,setTheme]=useTheme(),applying=useRef(false),applied=useRef(""),latest=useRef<SuitePreferences>({}),[failed,setFailed]=useState(false),[local,setLocal]=useState<SuitePreferences>();const authority=studioAuthority();const preferences=local||resource.data?.preferences||{};
 useEffect(()=>{if(!resource.data||applied.current===authority)return;latest.current=resource.data.preferences;applying.current=true;if(resource.data.preferences.theme)setTheme(resource.data.preferences.theme);applying.current=false;applied.current=authority;setLocal(undefined);const language=resource.data.preferences.language;if(language&&language!==locale&&["en","ar","de","fr","it"].includes(language))router.replace(pathname,{locale:language});},[resource.data,authority,setTheme,locale,pathname,router]);
 const save=async(patch:SuitePreferences)=>{if(applying.current||Object.entries(patch).every(([key,value])=>latest.current[key as keyof SuitePreferences]===value))return;const bound=studioAuthority();applied.current=bound;try{const value=await wmRequest<SuitePreferences>("/studio/preferences",{method:"PATCH",body:patch,keepalive:true});if(bound===studioAuthority()){latest.current=value;setLocal(value);setFailed(false);}}catch{if(bound===studioAuthority())setFailed(true);throw Error("preferences_failed");}};
 useEffect(()=>{const change=()=>void save({theme:document.documentElement.getAttribute("data-theme")==="dark"?"dark":"light"}).catch(()=>{});window.addEventListener("orgtik:theme",change);return()=>window.removeEventListener("orgtik:theme",change);},[authority,session?.tokens.accessToken]);
 return {preferences,failed,setDensity:(density:"comfortable"|"compact")=>void save({density}).catch(()=>{}),changeLocale:(language:string)=>{void save({language}).then(()=>router.replace(pathname,{locale:language})).catch(()=>{});}};
}
