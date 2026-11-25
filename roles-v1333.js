 'use strict';
/* RiftArmoury v1.33.3: multiple evidence-backed roles; one shared record per card name.
 * Never changes physical stock. Remote catalogue contains public card information only.
 * Rules-based suggestions are NOT authoritative card rulings or trained AI. */
(function(){
 const GROUPS=[
 {name:'Offensive & Threats',roles:['Early Pressure','Midgame Threat','Late Game','Aggro Support','Direct Damage','Combat Buff']},
 {name:'Card Advantage & Combos',roles:['Card Draw','Recursion','Synergy','Combo Enabler','Combo Payoff']},
 {name:'Interaction & Survival',roles:['Removal','Defence','Counterplay','Healing','Protection','Disruption','Debuff']},
 {name:'Resources & Tempo',roles:['Resource Support','Ramp / Acceleration','Cost Reduction','Power Support','Tempo']},
 {name:'Battlefield & Utility',roles:['Unit Generation','Battlefield Control','Movement / Repositioning','Utility']}
 ];
 const ROLES=GROUPS.flatMap(g=>g.roles);
 const OLD_ROLE={ 'Early pressure':'Early Pressure','Card draw':'Card Draw','Removal':'Removal','Defence':'Defence','Finisher':'Late Game','Resource support':'Resource Support','Synergy':'Synergy','Utility':'Utility'};
 const RULES=[
  ['Card Draw',/\bdraw\s+(?:(?:up to|an additional|another|a|one|two|three|\d+)\s+)?cards?\b/i],
  ['Recursion',/(?:return|put)\b.{0,75}\b(?:from (?:your |the )?(?:trash|discard|graveyard)|from (?:your |the )?discard pile)\b/i],
  ['Removal',/\b(?:kill|banish|destroy|defeat)\s+(?:target|an?|the|up to|all|each|enemy|opposing)\b/i],
  ['Direct Damage',/\bdeal(?:s)?\s+(?:\d+|x|that much|this much)\s+damage\b/i],
  ['Combat Buff',/(?:\+\s*\d+\s*might|(?:gain|gets?|give|grant|gains)\b.{0,42}(?:\+\s*\d+\s*might|additional might|bonus might))/i],
  ['Debuff',/(?:-\s*\d+\s*might|lose[s]?\s+\d+\s+might|reduce\b.{0,35}\bmight|can't attack|cannot attack|stun(?:ned)?\b)/i],
  ['Healing',/\b(?:heal|heals|healing|restore\b.{0,32}\bhealth|recover\b.{0,32}\bhealth)\b/i],
  ['Protection',/(?:\bshield\b|\bbarrier\b|can't be targeted|cannot be targeted|prevent\b.{0,40}\bdamage|\binvulnerable\b)/i],
  ['Cost Reduction',/(?:costs?\s+\d+\s+less|(?:reduce|reduces|lower)\b.{0,48}\bcost|without paying (?:its|the) cost)/i],
  ['Power Support',/(?:\bready\b.{0,36}\brunes?\b|\b(?:generate|gain|add)\b.{0,30}\bpower\b)/i],
  ['Ramp / Acceleration',/(?:\bplay\b.{0,30}\badditional rune\b|\bready\b.{0,30}\brunes?\b|\baccelerat(?:e|ion)\b)/i],
  ['Unit Generation',/(?:\b(?:summon|spawn|create)\b.{0,40}\b(?:unit|units|token|tokens)\b|\b(?:unit|units)\b.{0,30}\b(?:token|tokens)\b)/i],
  ['Movement / Repositioning',/(?:\bmove\b.{0,55}\b(?:unit|units|battlefield|location)\b|\b(?:reposition|relocate)\b.{0,40}\b(?:unit|units)\b)/i],
  ['Counterplay',/(?:\bcounter\b.{0,35}\b(?:spell|ability)\b|\b(?:negate|cancel)\b.{0,30}\b(?:spell|ability)\b)/i],
  ['Disruption',/(?:\bopponent\b.{0,35}\b(?:discard|can't play|cannot play|loses)\b|\b(?:enemy|opposing)\b.{0,35}\bcan't\b)/i],
 ];
 const STORE='riftarmoury-role-text-v1333',STALE=7*86400000;
 const SOURCES=[
  {name:'Riot-gallery community export',url:'https://raw.githubusercontent.com/Dystorted888/riftbound-card-data/main/data/cards.json'},
  {name:'Community card and errata export',url:'https://github.com/LouisCourrian/riftbound-cards/releases/latest/download/cards.json'}
 ];
 const norm=s=>normalizeName(String(s||''));
 const code=s=>normalizedCode(String(s||''));
 const safe=s=>escapeHtml(String(s??''));
 let rows=[],byCode=new Map(),byName=new Map(),status='loading',source='',updated=0,working=null;
 function entryName(row){return String(row.fullName||row.display_name||((row.name&&row.subtitle)?row.name+', '+row.subtitle:row.name)||'').trim();}
 function entryCode(row){return code(row.public_code||row.cardCode||row.card_code||row.publicCode||row.code||'');}
 function abilityText(row){
  const attr=row.attributes&&typeof row.attributes==='object'?row.attributes:{};
  const options=[row.abilityEffective,row.abilityCorrected,row.rulesText,row.rules_text,row.abilityText,row.cardText,row.description,row.abilityOriginal,row.ability,row.text,row.effect,attr.abilityEffective,attr.ability,attr.rulesText,attr.text];
  for(const x of options){if(typeof x==='string'&&x.trim().length>=3)return x.trim().slice(0,3000);}
  if(Array.isArray(row.abilities))return row.abilities.map(x=>typeof x==='string'?x:(x&&typeof x==='object'?x.text||x.description||x.effect||'':'')).filter(Boolean).join(' ').slice(0,3000);
  return '';
 }
 function extract(data){const all=Array.isArray(data)?data:Array.isArray(data?.cards)?data.cards:Array.isArray(data?.data?.cards)?data.data.cards:Array.isArray(data?.data)?data.data:[];
  return all.filter(r=>r&&typeof r==='object').map(r=>({name:norm(entryName(r)),code:entryCode(r),text:abilityText(r),type:String(r.cardType||r.type||'')})).filter(r=>(r.name||r.code)&&r.text);
 }
 function indexRows(items){const codes=new Map(),names=new Map();
  const add=(map,key,r)=>{if(!key)return;if(!map.has(key)){map.set(key,r);return;}const old=map.get(key);if(old&&old.text!==r.text)map.set(key,null);};
  for(const r of items){add(codes,r.code,r);add(names,r.name,r);}rows=items;byCode=codes;byName=names;
 }
 function fromLocal(name,entry){const candidates=entry?.code?eligiblePrintings(entry):printingsFor(name);const texts=new Set();let found=null;
  for(const p of candidates){const txt=abilityText(p);if(txt){texts.add(txt);found={name:norm(name),code:code(p.code),text:txt,type:p.type};}}
  return texts.size===1?found:null;
 }
 function lookup(name,entry){if(entry?.code){const fixed=byCode.get(code(entry.code));if(fixed)return fixed;if(byCode.has(code(entry.code)))return null;}
  const prints=entry?eligiblePrintings(entry):printingsFor(name);
  for(const p of prints){const fixed=byCode.get(code(p.code));if(fixed)return fixed;if(byCode.has(code(p.code)))return null;}
  const direct=byName.get(norm(name));if(direct)return direct;if(byName.has(norm(name)))return null;
  return fromLocal(name,entry);
 }
 function matches(text){if(!text)return [];const matched=[];
  for(const [role,pattern] of RULES){const m=pattern.exec(text);if(m)matched.push({role,confidence:'High',evidence:m[0].slice(0,110),kind:'Printed card effect'});}
  return matched;
 }
 function suggested(name,entry){const record=lookup(name,entry);return record?matches(record.text):[];}
 function insight(name){const data=state.cardInsights||{};return data[norm(name)]||{};}
 function normaliseStored(arr){return Array.isArray(arr)?[...new Set(arr.filter(x=>ROLES.includes(x)))]:[];}
 function legacyRole(note){return OLD_ROLE[note.role]|| (ROLES.includes(note.role)?note.role:null);}
 function details(name,entry){const note=insight(name),automatic=suggested(name,entry),suggestions=automatic.map(x=>x.role),removed=normaliseStored(note.roleOverrides?.remove),added=normaliseStored(note.roleOverrides?.add);
  const selected=new Set([...suggestions,...added].filter(x=>!removed.includes(x)));
  // Backward compatibility: v1.33 had one manually selected role. Keep that choice.
  const old=legacyRole(note);if(old&&!note.roleOverrides)selected.add(old);
  return {selected:[...selected],automatic,source:lookup(name,entry)?.text?'verified-text':'unknown',notes:note.note||'',note};
 }
 function saveSelection(name,chosen,noteText,extras={}){const key=norm(name),old=insight(name),suggestions=suggested(name).map(x=>x.role),want=normaliseStored(chosen);
  const add=want.filter(x=>!suggestions.includes(x)),remove=suggestions.filter(x=>!want.includes(x));
  (state.cardInsights||(state.cardInsights={}))[key]={...old,...extras,role:null,roles:want,roleOverrides:{add,remove},note:String(noteText??old.note??'').slice(0,500),roleEditedAt:new Date().toISOString()};
  save();return details(name);
 }
 function reset(name){const key=norm(name),old=insight(name);(state.cardInsights||(state.cardInsights={}))[key]={...old,role:null,roles:[],roleOverrides:{add:[],remove:[]},roleEditedAt:null};save();return details(name);}
 function cardsForRoles(name){return details(name).selected;}
 function renderBadges(name,entry){const d=details(name,entry);return d.selected.length?`<span class="rv1333-tags">${d.selected.map(r=>`<span class="rv1333-tag">${safe(r)}</span>`).join('')}</span>`:'<span class="muted micro">No roles identified</span>';}
 function readCache(){try{const obj=JSON.parse(localStorage.getItem(STORE)||'null');if(obj?.rows&&Array.isArray(obj.rows)){indexRows(obj.rows);source=String(obj.source||'Cached card text');updated=Number(obj.updated)||0;status='ready';}}catch(e){console.warn('Role cache not available',e);}}
 async function refresh(force=false){if(working)return working;if(!force&&rows.length>200&&Date.now()-updated<STALE){status='ready';return {count:rows.length,source};}
  status='loading';working=(async()=>{for(const item of SOURCES){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
   try{const response=await fetch(item.url,{cache:force?'reload':'default',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);
    const fetched=extract(await response.json());if(fetched.length<150)throw Error('Incomplete card-text snapshot: '+fetched.length);
    indexRows(fetched);source=item.name;status='ready';updated=Date.now();try{localStorage.setItem(STORE,JSON.stringify({rows,source,updated}));}catch(e){console.warn('Card role cache full',e);}render();return {count:rows.length,source};
   }catch(e){console.warn('Role text source unavailable:',item.name,e);}finally{clearTimeout(timer);}
  }status=rows.length?'ready':'unavailable';render();return {count:rows.length,source};})().finally(()=>{working=null;});return working;
 }
 function ingest(data){const parsed=extract(data);indexRows(parsed);source='Injected dataset';status='ready';updated=Date.now();return parsed.length;}
 window.RiftArmouryRoles={version:'1.33.3',groups:GROUPS,roles:ROLES,lookup,suggested,details,saveSelection,reset,renderBadges,refresh,status:()=>({status,source,count:rows.length,updated}),ingest,extract};
 readCache();Promise.resolve().then(()=>refresh(false)).catch(e=>console.warn('Role loading issue',e));
})();
