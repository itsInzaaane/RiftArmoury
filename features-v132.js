'use strict';
/* RiftVault v1.32 — integrated deck builder and Android navigation.
 * This extension uses the existing v1.31 deck.entries, deck.allocations,
 * state.stock, addRequirement(), and assignOne(); NO data-key migrations. */
(function(){
const V132_DOMAINS=new Set(['fury','chaos','mind','body','calm','order']);
const v132State={query:'',filter:'legal',section:'MainDeck',qty:1};
const v132Text=x=>String(x??'').trim();
const v132Norm=x=>normalizeName(v132Text(x));
function v132Domains(card){
 const quote=card?priceRecord(card):null;
 const raw=Array.isArray(quote?.domains)&&quote.domains.length?quote.domains:card?.domains;
 return (Array.isArray(raw)?raw:[]).map(x=>String(x).trim().toLowerCase()).filter(x=>V132_DOMAINS.has(x));
}
function v132Tags(card){
 const data=card?priceRecord(card):null;
 return (Array.isArray(data?.tags)&&data.tags.length?data.tags:card?.tags||[]).map(v132Norm).filter(Boolean);
}
function v132LegendInfo(deck){
 const entry=deck?.entries.find(e=>e.section==='Legend');
 if(!entry)return null;
 const card=eligiblePrintings(entry).find(p=>v132Norm(p.type)==='legend')||printingsFor(entry.name).find(p=>v132Norm(p.type)==='legend')||printingsFor(entry.name)[0];
 const domains=v132Domains(card);
 const hero=v132Norm(entry.name).split(',')[0];
 return {entry,card,domains,hero,tags:v132Tags(card)};
}
function v132Section(card){
 const t=v132Norm(card?.type);
 if(t==='legend')return 'Legend';
 if(t==='rune')return 'Runes';
 if(t==='battlefield')return 'Battlefields';
 return 'MainDeck';
}
function v132Signature(card){return /signature/.test(v132Norm(card?.supertype||priceRecord(card)?.supertype)) || !!card?.isSignature && /signature/.test(v132Norm(card?.supertype));}
function v132Champion(card){return /champion/.test(v132Norm(card?.supertype||priceRecord(card)?.supertype))||['champion','champion unit'].includes(v132Norm(card?.type));}
function v132MatchesChampion(card,legend){
 const tags=v132Tags(card);
 return !!legend?.hero&&(v132Norm(card?.name).split(',')[0]===legend.hero||tags.includes(legend.hero));
}
function v132Count(deck,sections){return deck.entries.filter(e=>sections.includes(e.section)).reduce((n,e)=>n+Math.max(0,Number(e.required)||0),0);}
function v132Names(deck,name){const norm=v132Norm(name);return deck.entries.filter(e=>['Champion','MainDeck','Sideboard'].includes(e.section)&&v132Norm(requirementName(e))===norm).reduce((n,e)=>n+Math.max(0,Number(e.required)||0),0);}
function v132Status(deck,card,section,quantity=1){
 const reason=[];const label=v132Text(card?.name);const qty=Number(quantity);
 if(!deck||!card||!label||!Number.isInteger(qty)||qty<1||qty>99)return {ok:false,reasons:['Select a valid card and a quantity between 1 and 99.']};
 const type=v132Norm(card.type),legend=v132LegendInfo(deck),domains=v132Domains(card);
 const legendOnly=section==='Legend';
 if(!SECTIONS.includes(section))reason.push('Select a valid deck section.');
 if(!legend&&!legendOnly)reason.push('Choose a Legend first to determine legal domains.');
 if(legend&&!legendOnly){
  if(!legend.domains.length)reason.push('Legend domain information is unavailable. Refresh the card catalogue before adding cards.');
  else if(domains.some(d=>!legend.domains.includes(d)))reason.push('Outside Legend domains: '+domains.filter(d=>!legend.domains.includes(d)).join(', ')+'.');
 }
 if(banStatus(label,ui.banFormat==='2v2'?'2v2':'standard'))reason.push('Banned in the currently selected Constructed format.');
 if(legendOnly){
  if(type!=='legend')reason.push('Only a Legend belongs in the Legend slot.');
  if(v132Count(deck,['Legend'])+qty>1)reason.push('The deck already has a Legend. Edit the existing Legend to change it.');
 }else if(section==='Champion'){
  if(!v132Champion(card))reason.push('Chosen Champion must be a Champion Unit.');
  if(legend&&!v132MatchesChampion(card,legend))reason.push('Chosen Champion must match your Legend champion tag.');
  if(v132Count(deck,['Champion'])+qty>1)reason.push('Only one Chosen Champion can be selected.');
 }else if(section==='MainDeck'||section==='Sideboard'){
  if(!['unit','champion unit','spell','gear'].includes(type))reason.push('Only Units, Spells and Gear belong in '+SECTION_LABEL[section]+'.');
  if(section==='Sideboard'&&v132Count(deck,['Sideboard'])+qty>10)reason.push('Sideboard maximum is 10 cards.');
 }else if(section==='Runes'){
  if(type!=='rune')reason.push('Only Rune cards belong in the Rune deck.');
  if(v132Count(deck,['Runes'])+qty>12)reason.push('The Rune deck cannot exceed 12 cards.');
 }else if(section==='Battlefields'){
  if(type!=='battlefield')reason.push('Only Battlefields belong in the Battlefield slot.');
  if(v132Count(deck,['Battlefields'])+qty>3)reason.push('Only 3 Battlefields are permitted.');
  if(qty!==1||deck.entries.some(e=>e.section==='Battlefields'&&v132Norm(requirementName(e))===v132Norm(label)))reason.push('Battlefields must have different names, one copy each.');
 }
 if(['MainDeck','Champion','Sideboard'].includes(section)){
  if(v132Names(deck,label)+qty>3&&v132Norm(label)!=='spiderling')reason.push('Maximum 3 copies of the same name across Main Deck, Champion and Sideboard.');
  if(v132Signature(card)){
   if(legend&&!v132MatchesChampion(card,legend))reason.push('Signature card does not match the Legend champion tag.');
   const signatures=deck.entries.filter(e=>['MainDeck','Champion','Sideboard'].includes(e.section)).reduce((s,e)=>{
    const p=printingsFor(requirementName(e))[0];return s+(v132Signature(p)?Number(e.required||0):0);
   },0);
   if(signatures+qty>3)reason.push('Maximum 3 Signature cards total.');
  }
 }
 return {ok:reason.length===0,reasons:reason,domains,legend};
}
function v132CandidateGroups(deck){
 const q=v132Norm(v132State.query);
 const candidates=getNamesForSearch().filter(g=>{
  const c=g.defaultPrint;
  if(!c)return false;
  if(q&&!v132Norm(g.name).includes(q)&&!g.printings.some(p=>normalizedCode(p.code).includes(normalizedCode(q))))return false;
  return true;
 });
 return candidates.map(g=>{
  const section=v132State.section;
  const card=g.printings.find(p=>v132Norm(p.type)==='legend'&&section==='Legend')||g.defaultPrint;
  const validation=v132Status(deck,card,section,Math.max(1,Number(v132State.qty)||1));
  const bulk=stockForName(g.name,true);
  return {...g,card,validation,bulk};
 }).filter(g=>v132State.filter==='all'||g.validation.ok&&(v132State.filter==='legal'||g.bulk>0))
 .sort((a,b)=>Number(b.bulk>0)-Number(a.bulk>0)||a.name.localeCompare(b.name));
}
function v132ChoicesHtml(deck){
 const rows=v132CandidateGroups(deck),visible=rows.slice(0,72);
 return `<div class="v132-result-count">${rows.length} matching cards${rows.length>72?' · first 72 shown':''}</div>`+
 (visible.length?`<div class="v132-card-results">${visible.map(row=>{
  const {card,validation,bulk}=row;
  const reason=validation.reasons.join(' ');
  return `<div class="v132-result ${validation.ok?'':'v132-illegal'}"><div class="v132-mini-art">${cardArt(card)}</div><div class="v132-result-main"><strong>${escapeHtml(row.name)}</strong><small>${escapeHtml(card.type||'Card')} · ${escapeHtml(v132Domains(card).join(' / ')||'Domainless / unknown')} · ${bulk} in Bulk</small><small class="${validation.ok?'v132-legal-note':'v132-reason'}">${validation.ok?'✓ Compatible with selected Legend and section':escapeHtml(reason)}</small></div><button class="btn btn-small ${validation.ok?'btn-primary':'btn-ghost'}" data-action="v132-add-select" data-name="${escapeHtml(row.name)}" ${validation.ok?'':'disabled'}>＋ Add</button></div>`;
 }).join('')}</div>`:`<div class="v132-no-results">No matching cards. Try another search, section or filter.${!v132LegendInfo(deck)&&v132State.section!=='Legend'?' Select a Legend first.':''}</div>`);
}
function v132BuilderHtml(deck){
 const legend=v132LegendInfo(deck),label=legend?(legend.domains.length?legend.domains.map(x=>x.toUpperCase()).join(' + '):'Domain data unavailable'):'No Legend yet';
 const sectionSelect=SECTIONS.map(s=>`<option value="${s}" ${s===v132State.section?'selected':''}>${escapeHtml(SECTION_LABEL[s])}</option>`).join('');
 return `<p class="muted small">Cards are added to your decklist first. Physical copies remain in Bulk unless you confirm an assignment.</p><div class="v132-legend-line"><strong>Legend identity</strong><span>${escapeHtml(legend?.entry.name||'Select a Legend to begin')} · ${escapeHtml(label)}</span></div>
 <div class="v132-builder-controls"><label class="form-field"><span>Deck section</span><select class="select" id="v132-section">${sectionSelect}</select></label><label class="form-field"><span>Quantity</span><input class="input" id="v132-qty" type="number" inputmode="numeric" min="1" max="99" value="${v132State.qty}"></label></div>
 <label class="form-field"><span>Search card catalogue</span><input class="input" id="v132-query" placeholder="Card name or collector code" value="${escapeHtml(v132State.query)}" autocomplete="off"></label>
 <div class="v132-filter-row" role="group" aria-label="Card filter">${[['legal','Legal cards'],['owned','Owned cards'],['all','All cards']].map(([k,t])=>`<button data-action="v132-filter" data-filter="${k}" class="btn btn-small ${v132State.filter===k?'btn-primary':'btn-ghost'}" aria-pressed="${v132State.filter===k}">${t}</button>`).join('')}</div><div id="v132-results">${v132ChoicesHtml(deck)}</div>
 <p class="muted micro">Legality is based on loaded card metadata and the selected Constructed ban list; special card effects and tournament rulings may require manual verification.</p>`;
}
function v132AssignOptions(deck,entry,max){
 const keys=ownedKeysByName(entry.name,entry.code,entry.section).filter(key=>bulkQty(key)>0);
 let remaining=Math.min(max,Math.max(0,entry.required-entryAssigned(deck,entry)));
 return keys.map(key=>{
  const p=getMeta(unpackKey(key).id),available=bulkQty(key),chosen=Math.min(remaining,available);remaining-=chosen;
  return `<div class="v132-stock-row"><div class="v132-mini-art">${cardArt(p)}</div><div class="v132-result-main"><strong>${escapeHtml(p.code||p.id)}</strong><small>${escapeHtml(p.setName||p.set)} · ${escapeHtml(unpackKey(key).finish)}${p.isAltArt?' · Alternate artwork':''}</small><small>${available} available in Bulk</small></div><label class="v132-stock-count"><span>Assign</span><input class="input v132-assign-qty" type="number" inputmode="numeric" min="0" max="${Math.min(available,max)}" value="${chosen}" data-stock-key="${escapeHtml(key)}"></label></div>`;
 }).join('');
}
function v132SectionStats(deck){
 return SECTIONS.map(section=>{
  const entries=deck.entries.filter(e=>e.section===section),required=entries.reduce((sum,e)=>sum+Number(e.required||0),0),assigned=entries.reduce((sum,e)=>sum+entryAssigned(deck,e),0);
  const over=required>({Legend:1,Champion:1,Battlefields:3,Runes:12,Sideboard:10}[section]??Infinity);
  return `<div class="v132-section-stat ${over?'v132-over-limit':''}"><span>${escapeHtml(SECTION_LABEL[section])}</span><strong>${assigned} / ${required}</strong><small>${required===0?'Empty':assigned>=required?'Assigned':'Need '+Math.max(0,required-assigned)}</small></div>`;
 }).join('');
}
const renderDeckDetailBeforeV132=renderDeckDetail;
renderDeckDetail=function(deck){
 let html=renderDeckDetailBeforeV132(deck);
 html=html.replaceAll('data-action="open-add-card"','data-action="v132-add-open"').replaceAll('＋ Add required card','＋ Add cards');
 html=html.replace('<div class="stats deck-kpis">',`<section class="v132-section-overview"><div class="row-between wrap"><div><div class="eyebrow">DECK PROGRESS</div><h3>Assigned / required by section</h3></div><button class="btn btn-primary btn-small" data-action="v132-add-open">＋ Add Cards</button></div><div class="v132-section-grid">${v132SectionStats(deck)}</div></section><div class="stats deck-kpis">`);
 for(const section of SECTIONS){
  const rows=deck.entries.filter(e=>e.section===section);
  if(!rows.length)continue;
  const assigned=rows.reduce((t,e)=>t+entryAssigned(deck,e),0),required=rows.reduce((t,e)=>t+Number(e.required||0),0);
  const mark=`${escapeHtml(SECTION_LABEL[section])} <span class="subtle" style="float:right">${required} cards</span>`;
  html=html.replace(mark,`${escapeHtml(SECTION_LABEL[section])} <span class="v132-section-header-count">${assigned} / ${required} assigned</span>`);
 }
 return html;
};
const deckLegalReviewBeforeV132=deckLegalReview;
deckLegalReview=function(deck){
 const original=deckLegalReviewBeforeV132(deck),issues=[...original.issues],notes=[...original.notes];
 const legend=v132LegendInfo(deck);
 if(legend?.domains.length){
  for(const e of deck.entries){if(e.section==='Legend')continue;
   const card=printingsFor(requirementName(e))[0];
   if(!card)continue;
   const outside=v132Domains(card).filter(d=>!legend.domains.includes(d));
   if(outside.length)issues.push(`${requirementName(e)} requires outside domain(s): ${outside.join(', ')}`);
   if(e.section==='Champion'&&!v132MatchesChampion(card,legend))issues.push(`${requirementName(e)} does not match Legend champion tag.`);
  }
 }else if(legend)notes.push('v1.32: Legend domain metadata unavailable; refresh catalogue for domain validation.');
 return {...original,issues:[...new Set(issues)],notes:[...new Set(notes)]};
};
const renderModalBeforeV132=renderModal;
renderModal=function(){
 if(ui.modal?.type==='v132-deck-builder'){
  const deck=findDeck(ui.modal.deckId),root=document.getElementById('modal-root');
  if(!deck){closeModal();return;}
  root.innerHTML=modalShell('Add cards to deck',deck.name,v132BuilderHtml(deck),'<button class="btn btn-ghost" data-action="v132-close">Done</button>',true);
 }else if(ui.modal?.type==='v132-assign-prompt'){
  const modal=ui.modal,deck=findDeck(modal.deckId),entry=deck?.entries.find(e=>e.id===modal.entryId);
  if(!deck||!entry){closeModal();return;}
  const free=Math.max(0,entry.required-entryAssigned(deck,entry));const available=entryBulk(entry);const max=Math.min(free,available,modal.newQty);
  document.getElementById('modal-root').innerHTML=modalShell('Copies available in Bulk',`${deck.name} · ${entry.name}`,`<p class="muted small">Added <strong>${modal.newQty}</strong> to your decklist. You have <strong>${available}</strong> physical copies available in Bulk. Assign now, or leave them in Bulk for later.</p><div class="v132-stock-choices">${v132AssignOptions(deck,entry,max)}</div><p class="muted micro">Select quantities for each printing / finish (up to ${max} total). Copies not assigned remain as unfulfilled deck requirements. Your total owned stock will not increase.</p>`,`<button class="btn btn-ghost" data-action="v132-no-assign">No, later</button><button class="btn btn-primary" data-action="v132-yes-assign">Yes, assign</button>`,true);
 }else renderModalBeforeV132();
 v132TrackRoute();
};
// Intercept ONLY new v1.32 controls before legacy delegated handlers.
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-action]');if(!button)return;
 const action=button.dataset.action;
 if(!action.startsWith('v132-'))return;
 event.preventDefault();event.stopImmediatePropagation();
 const deck=ui.deckId&&findDeck(ui.deckId);
 if(action==='v132-add-open'){
  if(!deck){toast('Open a deck first.',true);return;}
  Object.assign(v132State,{query:'',filter:'legal',section:v132LegendInfo(deck)?'MainDeck':'Legend',qty:1});
  showModal('v132-deck-builder',{deckId:deck.id});return;
 }
 if(action==='v132-filter'){
  v132State.filter=['legal','owned','all'].includes(button.dataset.filter)?button.dataset.filter:'legal';renderModal();return;
 }
 if(action==='v132-close'||action==='v132-no-assign'){
  closeModal();render();return;
 }
 if(action==='v132-add-select'){
  if(ui.modal?.type!=='v132-deck-builder')return;
  const active=findDeck(ui.modal.deckId),group=getNamesForSearch().find(g=>v132Norm(g.name)===v132Norm(button.dataset.name));
  if(!active||!group)return;
  const meta=group.defaultPrint,qty=Number(v132State.qty),section=v132State.section;
  const result=v132Status(active,meta,section,qty);
  if(!result.ok){toast(result.reasons.join(' '),true);renderModal();return;}
  const existing=active.entries.find(e=>e.section===section&&v132Norm(e.name)===v132Norm(group.name)&&!e.code);
  if(!addRequirement(active,section,group.name,qty)){toast('Unable to add this card.',true);return;}
  const entry=existing||active.entries.find(e=>e.section===section&&v132Norm(e.name)===v132Norm(group.name)&&!e.code);
  if(entry && entryBulk(entry)>0 && entryAssigned(active,entry)<entry.required){
   showModal('v132-assign-prompt',{deckId:active.id,entryId:entry.id,newQty:qty});
  }else{closeModal();render();toast(qty+' × '+group.name+' added to your decklist. No copies available in Bulk.');}
  return;
 }
 if(action==='v132-yes-assign'){
  const m=ui.modal;if(m?.type!=='v132-assign-prompt')return;
  const active=findDeck(m.deckId),entry=active?.entries.find(e=>e.id===m.entryId);
  if(!active||!entry)return;
  const inputs=[...document.querySelectorAll('.v132-assign-qty')];
  const selections=inputs.map(el=>({key:el.dataset.stockKey,qty:Number(el.value)}));
  if(selections.some(row=>!Number.isInteger(row.qty)||row.qty<0||row.qty>bulkQty(row.key))){toast('Choose a valid quantity no greater than Bulk availability.',true);return;}
  const total=selections.reduce((n,row)=>n+row.qty,0);
  if(total>m.newQty||total>entry.required-entryAssigned(active,entry)){toast('That selection exceeds the newly added, unassigned deck requirement.',true);return;}
  let moved=0;
  for(const row of selections)for(let j=0;j<row.qty;j++){
   if(bulkQty(row.key)<1)break;
   if(assignOne(active,entry,row.key))moved++;
  }
  if(moved){logActivity(`Assigned ${moved} × ${entry.name} from Bulk to ${active.name}`,null,'assign');save();}
  closeModal();render();toast(moved?`${moved} physical ${moved===1?'copy':'copies'} assigned; remaining deck requirements stay unassigned.`:'Card added to decklist; no physical copies moved.');return;
 }
},true);
document.addEventListener('input',event=>{
 const e=event.target;
 if(e?.id==='v132-query'){
  v132State.query=e.value;
  const wrapper=document.getElementById('v132-results'),deck=findDeck(ui.modal?.deckId);
  if(wrapper&&deck)wrapper.innerHTML=v132ChoicesHtml(deck);
 }else if(e?.id==='v132-qty'){
  const n=Number(e.value);v132State.qty=Number.isInteger(n)?n:0;
  const wrapper=document.getElementById('v132-results'),deck=findDeck(ui.modal?.deckId);
  if(wrapper&&deck)wrapper.innerHTML=v132ChoicesHtml(deck);
 }
},true);
document.addEventListener('change',event=>{
 if(event.target?.id==='v132-section'){
  v132State.section=event.target.value;renderModal();
 }
},true);

/* Navigation state is session-only. Back restores the previous tab/deck/modal.
 * Only actual navigation changes push history, not rerenders or stock edits. */
const v132History={started:false,restoring:false,currentKey:'',currentRoute:null,stack:[],index:0};
function v132Route(){
 const modal=ui.modal&&{...ui.modal};
 // Transient verification state is kept by the live UI, not navigation history.
 return {tab:ui.tab,deckId:ui.tab==='decks'?ui.deckId:null,modal};
}
function v132RouteKey(route){return JSON.stringify([route.tab,route.deckId,route.modal?.type||'',route.modal?.id||'',route.modal?.entryId||'',route.modal?.deckId||'',route.modal?.printingId||'']);}
function v132TrackRoute(){
 if(v132History.restoring)return;
 const route=v132Route(),key=v132RouteKey(route);
 if(!v132History.started){
  v132History.started=true;v132History.currentKey=key;v132History.currentRoute=route;
  v132History.stack=[{key,route}];v132History.index=0;
  try{history.replaceState({riftvaultV132:true,idx:0,route},'');}catch(e){}
  return;
 }
 if(key===v132History.currentKey)return;
 // The allocation prompt replaces the add-cards picker in the SAME workflow.
 // Keeping it in the same browser-history slot means Back from the prompt
 // returns to the deck, not to an obsolete picker or duplicate screen.
 if(v132History.currentRoute?.modal?.type==='v132-deck-builder'&&route.modal?.type==='v132-assign-prompt'&&route.tab===v132History.currentRoute.tab&&route.deckId===v132History.currentRoute.deckId){
  v132History.currentKey=key;v132History.currentRoute=route;
  v132History.stack[v132History.index]={key,route};
  try{history.replaceState({riftvaultV132:true,idx:v132History.index,route},'');}catch(e){}
  return;
 }
 const previous=v132History.stack[v132History.index-1];
 if(previous?.key===key){
  // The user navigated to the immediate previous app screen via an on-screen
  // back/close button. Reuse the entry rather than inserting a duplicate.
  v132History.currentKey=key;v132History.currentRoute=route;
  history.back();return;
 }
 const idx=v132History.index+1;
 v132History.stack=v132History.stack.slice(0,idx);
 v132History.stack.push({key,route});v132History.index=idx;
 v132History.currentKey=key;v132History.currentRoute=route;
 try{history.pushState({riftvaultV132:true,idx,route},'');}catch(e){}
}
const v132RenderBeforeNav=render;
render=function(){const r=v132RenderBeforeNav();v132TrackRoute();return r;};
window.addEventListener('popstate',event=>{
 const next=event.state;
 if(!next?.riftvaultV132||!next.route)return;
 const route=next.route;
 v132History.restoring=true;
 try{
  if(ui.tab==='scan'&&route.tab!=='scan'&&(scanner.running||scanner.starting))stopScanner();
  ui.tab=route.tab;
  ui.deckId=route.tab==='decks'&&findDeck(route.deckId)?route.deckId:null;
  ui.modal=route.modal||null;
  v132History.index=next.idx;
  v132History.currentKey=v132RouteKey(route);
  v132History.currentRoute=route;
  render();
  window.scrollTo(0,0);
 }finally{v132History.restoring=false;}
});
// Patch legacy rune-count editor to prevent incompatible Rune types from being
// saved when the Legend's domains are available. Imported historical decks
// remain untouched, but the deck legality review flags any conflicts.
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action="save-rune-counts"]');if(!b)return;
 const deck=ui.deckId&&findDeck(ui.deckId),legend=v132LegendInfo(deck);
 if(!legend?.domains.length)return;
 const illegal=[...document.querySelectorAll('[data-rune-name]')].filter(input=>Number(input.value)>0&&!legend.domains.includes(v132Norm(input.dataset.runeName).replace(/ rune$/,'')));
 if(illegal.length){event.preventDefault();event.stopImmediatePropagation();toast('Rune type not permitted by your Legend: '+illegal.map(e=>e.dataset.runeName).join(', '),true);}
},true);
// Initialize history once the v1.31 app has loaded; no synthetic history entry.
v132TrackRoute();
window.RiftVault132={version:'1.32',status:v132Status,legendInfo:v132LegendInfo,domains:v132Domains,sectionStats:v132SectionStats};
})();
