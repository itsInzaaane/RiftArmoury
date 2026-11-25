'use strict';
/* RiftArmoury v1.33.1 — automatic card-cost metadata.
 * This file changes NO inventory or deck state, and retains the original data key.
 * Printed card costs are separate from card effect text and physical stock.
 */
(function () {
  const CACHE_KEY='riftarmoury-auto-costs-v1331';
  const MAX_AGE=7*86400000;
  const ENDPOINTS=[
    {url:'https://raw.githubusercontent.com/Dystorted888/riftbound-card-data/main/data/cards.json',name:'Riot gallery snapshot'},
    {url:'https://raw.githubusercontent.com/slimtreble/Riftbound-card-data/main/cards.json',name:'Riot gallery legacy snapshot'}
  ];
  let byCode=new Map(),byName=new Map(),stateName='loading',source='',fetchedAt=0,task=null;
  const clean=s=>normalizeName(String(s||''));
  const code=s=>normalizedCode(typeof s==='string'?s:'');
  const num=value=>{
    if(Number.isInteger(value)&&value>=0&&value<=30)return value;
    if(typeof value!=='string')return null;
    const s=value.trim();if(!s)return null;
    if(/^\d{1,2}$/.test(s))return Number(s);
    const token=s.match(/^\{energy:(\d{1,2})\}$/i);
    return token?Number(token[1]):null;
  };
  function powerNum(value){
    const n=num(value);if(n!==null)return n;
    if(typeof value==='string'){
      const s=value.trim();if(!s)return null;
      // Treat a string made solely of one or more domain Power icons as a cost.
      const tokens=s.match(/\{power:(?:fury|calm|mind|body|chaos|order|any)\}/gi)||[];
      if(tokens.length&&s.replace(/\{power:(?:fury|calm|mind|body|chaos|order|any)\}/gi,'').trim()==='')return tokens.length;
    }
    return null;
  }
  const own=(o,k)=>o&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);
  function values(row){
    const attr=row.attributes&&typeof row.attributes==='object'?row.attributes:{};
    const eRaw=own(attr,'energy')?attr.energy:(own(row,'energy')?row.energy:row.energyCost);
    const pRaw=own(attr,'power')?attr.power:(own(row,'power')?row.power:row.powerCost);
    const energy=num(eRaw);
    let power=powerNum(pRaw);
    // In these data exports, absent/null Power means no printed Power symbols
    // if the main-deck Energy cost is independently known.
    if(power===null&&energy!==null&&(pRaw===null||pRaw===undefined||pRaw===''))power=0;
    return {energy,power};
  }
  function rowName(row){
    if(typeof row.display_name==='string'&&row.display_name.trim())return row.display_name;
    if(typeof row.fullName==='string'&&row.fullName.trim())return row.fullName;
    const main=String(row.name||''),sub=String(row.subtitle||'');
    return sub&&main&&!clean(main).includes(clean(sub))?main+', '+sub:main;
  }
  function rowCode(row){
    const direct=row.public_code||row.code||row.publicCode||row.cardCode||row.card_code;
    return code(direct);
  }
  function addTo(map,key,val){
    if(!key||!val||(val.energy===null&&val.power===null))return;
    if(!map.has(key)){map.set(key,val);return;}
    const old=map.get(key);
    if(!old||old.energy!==val.energy||old.power!==val.power)map.set(key,null); // ambiguous => no guess
  }
  function unpack(data){
    if(Array.isArray(data))return data;
    if(data&&Array.isArray(data.cards))return data.cards;
    if(data&&data.data&&Array.isArray(data.data.cards))return data.data.cards;
    return [];
  }
  function normalizeRows(raw){
    const items=unpack(raw),rows=[];
    for(const row of items){
      if(!row||typeof row!=='object')continue;
      const key=rowCode(row),name=rowName(row),v=values(row);
      if((!key&&!name)||(v.energy===null&&v.power===null))continue;
      rows.push({code:key,name:clean(name),energy:v.energy,power:v.power});
    }
    return rows;
  }
  function rebuild(rows,provider){
    const codeMap=new Map(),nameMap=new Map();
    for(const row of rows){
      const val={energy:row.energy,power:row.power,provider};
      addTo(codeMap,row.code,val);addTo(nameMap,row.name,val);
    }
    byCode=codeMap;byName=nameMap;source=provider;
    return codeMap.size;
  }
  function readCache(){
    try{
      const saved=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(saved&&Array.isArray(saved.rows)&&saved.rows.length>200){
        fetchedAt=Number(saved.at)||0;
        rebuild(saved.rows,String(saved.source||'Cached catalogue'));
        stateName='ready';
      }
    }catch(e){console.warn('Card cost cache unavailable:',e);}
  }
  function localLookup(name,entry){
    const p=entry?.code?eligiblePrintings(entry).find(x=>code(x.code)===code(entry.code)):null;
    const prints=[...(p?[p]:[]),...printingsFor(name)];
    // Don't silently accept a variant with different printed costs.
    const costs=new Map();
    for(const card of prints){
      if(!card)continue;
      const v=values(card);
      if(v.energy===null&&v.power===null)continue;
      costs.set(v.energy+':'+v.power,v);
    }
    if(costs.size!==1)return null;
    return {...[...costs.values()][0],provider:'Loaded card catalogue'};
  }
  function lookup(name,entry){
    if(entry?.code){
      const fixed=byCode.get(code(entry.code));
      if(fixed)return fixed;
      // Explicit code with conflicting sources must not fall back to a name.
      if(byCode.has(code(entry.code)))return null;
    }
    for(const p of (entry?eligiblePrintings(entry):printingsFor(name))){
      if(!p?.code)continue;
      const record=byCode.get(code(p.code));
      if(record)return record;
      if(byCode.has(code(p.code)))return null;
    }
    const mapped=byName.get(clean(name));
    if(mapped)return mapped;
    if(byName.has(clean(name)))return null;
    return localLookup(name,entry);
  }
  async function refresh(force=false){
    if(task)return task;
    if(!force&&byCode.size>200&&fetchedAt&&Date.now()-fetchedAt<MAX_AGE){stateName='ready';return {count:byCode.size,source};}
    stateName='loading';
    const run=async()=>{
      let error=null;
      for(const endpoint of ENDPOINTS){
        const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),13000);
        try{
          const response=await fetch(endpoint.url,{cache:force?'reload':'default',signal:controller.signal});
          if(!response.ok)throw Error('HTTP '+response.status);
          const rows=normalizeRows(await response.json());
          if(rows.length<250)throw Error('Unexpected or incomplete card-cost dataset: '+rows.length);
          const n=rebuild(rows,endpoint.name);
          if(n<180)throw Error('Insufficient collector-code matches: '+n);
          fetchedAt=Date.now();stateName='ready';
          try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:fetchedAt,source,rows}));}
          catch(e){console.warn('Card cost cache could not be saved:',e);}
          render();return {count:n,source};
        }catch(e){error=e;console.warn('Card cost source unavailable:',endpoint.name,e);}
        finally{clearTimeout(timeout);}
      }
      stateName=byCode.size?'ready':'unavailable';render();
      if(force)toast('Could not refresh printed costs. '+(byCode.size?'Using saved costs.':'Check internet connection.'),true);
      return {count:byCode.size,source,error:String(error||'No cost source')};
    };
    task=run().finally(()=>{task=null;});
    return task;
  }
  const api={version:'1.33.1',lookup,refresh,status:()=>({state:stateName,source,count:byCode.size,at:fetchedAt}),parse:normalizeRows,values};
  window.RiftArmouryAutoCosts=api;
  readCache();
  // Populate automatically when the online catalogue is reachable. No inventory writes.
  Promise.resolve().then(()=>refresh(false)).catch(e=>console.warn('Auto cost load issue:',e));
})();
