'use strict';
/* RiftArmoury v1.33 — local-first Deck Workshop.
 * Kept separate from v1.32 to preserve all existing inventory and scanner logic.
 * NO automatic AI, no external upload, no new storage key. */
(function () {
  const ROLES = ['Unclassified','Early pressure','Card draw','Removal','Defence','Finisher','Resource support','Synergy','Utility'];
  const MAIN_SECTIONS = new Set(['MainDeck','Champion','Sideboard']);
  const ws = {deckId:null,fromId:'',query:'',onlyBulk:false};
  const norm = s=>normalizeName(String(s||''));
  const safe = s=>escapeHtml(String(s??''));
  const copy = obj=>JSON.parse(JSON.stringify(obj));
  const insights = ()=>state.cardInsights||(state.cardInsights={});
  const historyStore = ()=>state.deckHistory||(state.deckHistory={});
  const noteFor = name=>insights()[norm(name)]||{};
  function physicalType(card){return norm(card?.type||'Unknown');}
  function cardForEntry(entry){
    const opts=eligiblePrintings(entry);
    return opts.find(p=>!p.isAltArt&&!p.isVariant)||opts[0]||printingsFor(requirementName(entry))[0]||null;
  }
  function roleName(name){const r=noteFor(name).role;return ROLES.includes(r)?r:'Unclassified';}
  function costNumber(value){return (value!==null&&value!==''&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=20)?Number(value):null;}
  function costInfo(name,field,entry=null){
    const auto=window.RiftArmouryAutoCosts?.lookup(name,entry);
    if(auto&&auto[field]!==null&&auto[field]!==undefined)
      return {value:auto[field],source:'auto',provider:auto.provider};
    // Old v1.33 manual annotations remain a clearly identified fallback only.
    const old=costNumber(noteFor(name)[field]);
    return old===null?{value:null,source:'unknown',provider:''}:{value:old,source:'manual',provider:'Legacy note'};
  }
  function costFor(name,field,entry=null){return costInfo(name,field,entry).value;}
  function deckRows(deck){return deck.entries.filter(e=>MAIN_SECTIONS.has(e.section));}
  function fingerprint(rows){return JSON.stringify(rows.map(e=>({id:e.id,section:e.section,name:e.name,code:e.code||'',required:Number(e.required||0)})));}
  function snapshotRows(rows){return rows.map(e=>({id:e.id,section:e.section,name:e.name,code:e.code||'',required:Math.max(0,Number(e.required)||0)}));}
  let baseline=new Map();let lastState=state;
  function seedBaseline(){baseline=new Map(state.decks.map(d=>[d.id,{hash:fingerprint(d.entries),entries:snapshotRows(d.entries)}]));lastState=state;}
  seedBaseline();
  function addSnapshot(deck,entries,label){
    const array=historyStore()[deck.id]||(historyStore()[deck.id]=[]);
    const hash=fingerprint(entries);
    if(array[0]&&fingerprint(array[0].entries)===hash)return false;
    array.unshift({id:uid(),at:new Date().toISOString(),label:String(label||'Deck checkpoint').slice(0,70),entries:snapshotRows(entries)});
    if(array.length>15)array.length=15;
    return true;
  }
  // On any ordinary save (including old v1.32 editing paths), record the prior
  // requirement list, not physical stock. Never duplicate ownership or allocations.
  const oldSave=save;
  save=function(){
    if(state!==lastState)seedBaseline();
    for(const deck of state.decks){
      const next=fingerprint(deck.entries),prior=baseline.get(deck.id);
      if(prior&&next!==prior.hash)addSnapshot(deck,prior.entries,'Before deck edit');
      baseline.set(deck.id,{hash:next,entries:snapshotRows(deck.entries)});
    }
    for(const id of [...baseline.keys()])if(!state.decks.some(d=>d.id===id))baseline.delete(id);
    return oldSave();
  };
  function selectedDeck(){return findDeck(ws.deckId)||state.decks[0]||null;}
  function chooseDeckId(){const d=selectedDeck();if(d)ws.deckId=d.id;return d;}
  function legendLabel(deck){
    const l=window.RiftVault132?.legendInfo(deck);
    return l?`${l.entry.name} · ${l.domains.length?l.domains.map(x=>x.toUpperCase()).join(' + '):'Unknown domains'}`:'No Legend selected';
  }
  function sectionTotals(deck){
    return SECTIONS.map(s=>({section:s,required:deck.entries.filter(e=>e.section===s).reduce((n,e)=>n+Math.max(0,Number(e.required)||0),0)}));
  }
  function costData(deck,field='energy'){
    const bins=field==='power'?[0,0,0,0,0]:[0,0,0,0,0,0];
    let known=0,unknown=0,weighted=0,automatic=0,manual=0;
    // Only the playable deck (including chosen champion) goes into the resource curve.
    // Sideboard costs are visible in card notes, but don't skew the main-deck chart.
    for(const entry of deck.entries.filter(e=>e.section==='MainDeck'||e.section==='Champion')){
      const qty=Math.max(0,Number(entry.required)||0),info=costInfo(requirementName(entry),field,entry),cost=info.value;
      if(cost===null){unknown+=qty;continue;}
      bins[Math.min(bins.length-1,cost)]+=qty;known+=qty;weighted+=qty*cost;
      if(info.source==='auto')automatic+=qty;else manual+=qty;
    }
    return {bins,known,unknown,automatic,manual,average:known?weighted/known:null};
  }
  function roleData(deck){
    const counts=new Map();for(const e of deckRows(deck))counts.set(roleName(requirementName(e)),(counts.get(roleName(requirementName(e)))||0)+Math.max(0,Number(e.required)||0));
    return [...counts.entries()].sort((a,b)=>b[1]-a[1]);
  }
  function miniCostChart(title,result,labels){
    const {bins,known,unknown,automatic,manual,average}=result,max=Math.max(1,...bins);
    return `<div class="rv133-summary-line"><span>${safe(title)}</span><strong>${known} known · ${unknown} unknown</strong></div>
    <div class="rv133-bars" style="grid-template-columns:repeat(${bins.length},minmax(0,1fr))" aria-label="${safe(title)} histogram">${bins.map((n,i)=>`<div class="rv133-bar-wrap"><span>${n||'–'}</span><div class="rv133-bar-track"><div class="rv133-bar" style="height:${n?Math.max(8,100*n/max):0}%"></div></div><small>${labels[i]}</small></div>`).join('')}</div>
    <p class="muted micro">${average===null?'Awaiting cost data.':'Average '+safe(title)+': '+average.toFixed(2)+'.'} ${automatic} automatically identified${manual?' · '+manual+' older manual notes':''}. ${unknown?'Missing data is excluded, not counted as zero.':''}</p>`;
  }
  function costChart(deck){
    const status=window.RiftArmouryAutoCosts?.status()||{state:'loading',count:0};
    const stateLabel=status.state==='loading'?'Looking up printed costs…':status.state==='ready'?'Catalogue costs loaded':status.count?'Using cached printed costs':'Cost catalogue unavailable';
    return `<div class="rv133-curve-status"><span>${safe(stateLabel)}${status.source?' · '+safe(status.source):''}</span><button class="btn btn-small btn-ghost" data-action="rv133-refresh-costs" ${status.state==='loading'?'disabled':''}>↻ Refresh</button></div>
    ${miniCostChart('Energy cost',costData(deck,'energy'),['0','1','2','3','4','5+'])}
    <div class="rv133-curve-separator"></div>
    ${miniCostChart('Power requirement',costData(deck,'power'),['0','1','2','3','4+'])}
    <p class="muted micro">Printed costs are loaded automatically from card catalogues and cached on this device. No cost entry is required. Sideboard cards are not included in these curves.</p>`;
  }
  function roleChart(deck){
    const rows=roleData(deck),max=Math.max(1,...rows.map(x=>x[1]));
    return `<div class="rv133-summary-line"><span>Card roles</span><strong>${rows.reduce((n,x)=>n+x[1],0)} copies</strong></div>${rows.length?rows.map(([role,count])=>`<div class="rv133-role-row"><span>${safe(role)}</span><div class="rv133-role-track"><span style="width:${Math.max(4,100*count/max)}%"></span></div><strong>${count}</strong></div>`).join(''):'<p class="muted small">No cards in main deck yet.</p>'}<p class="muted micro">Roles are your own annotations. Unclassified cards are not automatically treated as draw, removal or finishers.</p>`;
  }
  function overviewMetrics(deck){
    const c=costData(deck),unclassified=roleData(deck).find(([role])=>role==='Unclassified')?.[1]||0;
    const plan=deckAvailabilityPlan(deck); const issues=deckLegalReview(deck).issues;
    return `<div class="rv133-metrics"><div><span>Main + Champion</span><strong>${sectionTotals(deck).filter(e=>['MainDeck','Champion'].includes(e.section)).reduce((t,e)=>t+e.required,0)}</strong></div><div><span>Energy data missing</span><strong>${c.unknown}</strong></div><div><span>Unclassified</span><strong>${unclassified}</strong></div><div><span>Missing after Bulk</span><strong>${plan.short}</strong></div></div><div class="rv133-integrity"><strong>${issues.length?'⚠ '+issues.length+' legality checks need attention':'✓ Existing basic legality checks passed'}</strong><span>Suggestions are only candidates. Check official rules before competitive play.</span></div>`;
  }
  function entryRows(deck){
    const rows=deckRows(deck);
    return `<div class="rv133-annotation-list">${rows.map(e=>{
      const p=cardForEntry(e),note=noteFor(requirementName(e));
      const energy=costInfo(requirementName(e),'energy',e),power=costInfo(requirementName(e),'power',e);
      const label=energy.source==='auto'||power.source==='auto'?'Auto':energy.source==='manual'||power.source==='manual'?'Manual fallback':'Not found';
      return `<div class="rv133-annotation-row"><span class="rv133-small-art">${cardArt(p||{})}</span><div class="rv133-annotation-info"><strong>${safe(requirementName(e))}</strong><small>${safe(SECTION_LABEL[e.section])} · ×${Number(e.required)||0} · ${safe(roleName(requirementName(e)))}</small><small>Energy ${energy.value??'Unknown'} · Power ${power.value??'Unknown'} · ${safe(label)}${note.note?' · '+safe(note.note):''}</small></div><button class="btn btn-small btn-ghost" data-action="rv133-note" data-name="${safe(requirementName(e))}">Edit tags</button></div>`;
    }).join('')||'<p class="muted small">Add Main Deck cards to annotate roles and costs.</p>'}</div>`;
  }
  function candidateEvaluation(deck,source,candidate){
    const ghost={...deck,entries:deck.entries.map(e=>({...e,required:Number(e.required)}))};
    const ghostSource=ghost.entries.find(e=>e.id===source.id);
    if(ghostSource){ghostSource.required-=1;if(ghostSource.required===0)ghost.entries=ghost.entries.filter(e=>e!==ghostSource);}
    const validation=window.RiftVault132.status(ghost,candidate,source.section,1);
    return validation;
  }
  function candidateList(deck,source){
    if(!source)return [];
    const reference=cardForEntry(source),sourceType=physicalType(reference),sourceRole=roleName(requirementName(source)),sourceCost=costFor(requirementName(source),'energy'),query=norm(ws.query);
    return getNamesForSearch().map(g=>{
      const card=g.defaultPrint;if(!card||norm(g.name)===norm(requirementName(source)))return null;
      if(query&&!norm(g.name).includes(query)&&!g.printings.some(p=>normalizedCode(p.code).includes(normalizedCode(query))))return null;
      if(physicalType(card)!==sourceType)return null;
      const valid=candidateEvaluation(deck,source,card);if(!valid.ok)return null;
      const bulk=stockForName(g.name,true);if(ws.onlyBulk&&!bulk)return null;
      const role=roleName(g.name),cost=costFor(g.name,'energy');let score=0;const why=[];
      if(sourceRole!=='Unclassified'&&role===sourceRole){score+=50;why.push('Same recorded role');}
      if(sourceRole==='Unclassified'||role==='Unclassified')why.push('Role comparison unavailable');
      score+=15;why.push('Same card type');
      if(bulk>0){score+=25+Math.min(5,bulk);why.push(`${bulk} ${bulk===1?'copy':'copies'} free in Bulk`);}
      if(sourceCost!==null&&cost!==null){let delta=Math.abs(cost-sourceCost);score+=Math.max(0,12-4*delta);if(delta===0)why.push('Same printed Energy cost');}
      return {name:g.name,card,bulk,role,cost,score,why};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  }
  function swapOptions(deck){
    return deckRows(deck).filter(e=>['MainDeck','Sideboard'].includes(e.section)).map(e=>`<option value="${safe(e.id)}" ${e.id===ws.fromId?'selected':''}>${safe(e.name)} (${safe(SECTION_LABEL[e.section])}) ×${e.required}</option>`).join('');
  }
  function swapView(deck){
    const options=deckRows(deck).filter(e=>['MainDeck','Sideboard'].includes(e.section));
    if(!options.length)return '<div class="rv133-empty-note">Add Main Deck or Sideboard cards first. Smart substitutions will use those as the starting point.</div>';
    let source=options.find(e=>e.id===ws.fromId)||options[0];ws.fromId=source.id;
    const candidates=candidateList(deck,source).slice(0,36),role=roleName(requirementName(source));
    return `<div class="rv133-swap-tools"><label class="form-field"><span>Card to replace (1 copy)</span><select class="select" id="rv133-source">${swapOptions(deck)}</select></label><label class="form-field"><span>Search legal replacements</span><input class="input" id="rv133-query" autocomplete="off" value="${safe(ws.query)}" placeholder="Card name or collector code"></label><label class="rv133-check"><input id="rv133-bulk" type="checkbox" ${ws.onlyBulk?'checked':''}> Available in Bulk only</label></div>
    <p class="muted small">Comparing against <strong>${safe(requirementName(source))}</strong> (${safe(role)}). Candidates are legal after removing one required copy from this section. Roles use your notes; costs are loaded automatically when available.</p>
    <div id="rv133-candidates"><div class="rv133-candidate-list">${candidates.map(c=>`<div class="rv133-candidate"><span class="rv133-small-art">${cardArt(c.card)}</span><div class="rv133-candidate-info"><strong>${safe(c.name)}</strong><small>${safe(c.role)} · Energy ${c.cost===null?'Unknown':c.cost} · Bulk ${c.bulk}</small><small>${safe(c.why.join(' · '))}</small></div><button class="btn btn-small btn-primary" data-action="rv133-review-swap" data-target="${safe(c.name)}">Review</button></div>`).join('')||'<div class="rv133-empty-note">No matching legal candidates. Try clearing the Bulk filter, choosing a different source, or refreshing the card catalogue.</div>'}</div></div>
    <p class="muted micro">Ranking is deterministic, not AI-generated. No gameplay simulation or win-rate claims. Proposed changes always require confirmation.</p>`;
  }
  function historyList(deck){
    const list=historyStore()[deck.id]||[];
    return `<div class="row-between wrap"><h3>Deck version history</h3><button class="btn btn-primary btn-small" data-action="rv133-checkpoint">Save checkpoint</button></div>
    <p class="muted small">Automatic checkpoints are saved before requirement changes. Snapshots store decklists only, not additional owned cards.</p>
    ${list.length?list.slice(0,15).map((item,i)=>`<div class="rv133-history-row"><div><strong>${safe(item.label)}</strong><small>${safe(new Date(item.at).toLocaleString())} · ${item.entries.reduce((a,e)=>a+Number(e.required||0),0)} requirements · ${item.entries.length} card rows</small></div><button class="btn btn-small btn-ghost" data-action="rv133-review-restore" data-snapshot="${safe(item.id)}">Review restore</button></div>`).join(''):'<p class="muted small">No saved checkpoints yet. Use “Save checkpoint” or edit the deck to create a restore point.</p>'}`;
  }
  function renderDeckWorkshop(){
    const deck=chooseDeckId();
    return `<div class="row-between wrap mb24"><div><div class="eyebrow">RIFTARMOURY · DECK TOOLS</div><h2>Deck Workshop</h2><p class="muted small">Local-first deck analysis, automatically populated resource curves, role notes and safe decklist revisions.</p></div><button class="btn btn-primary" data-action="rv133-new-deck">＋ Start new deck</button></div>
    ${!state.decks.length?'<div class="panel rv133-empty-note"><h3>No decks yet</h3><p>Create an empty deck, select your Legend, and add cards from the legal card catalogue.</p><button class="btn btn-primary" data-action="rv133-new-deck">Create first deck</button></div>':`<div class="panel mb18"><div class="row-between wrap"><label class="form-field rv133-deck-picker"><span>Analyse saved deck</span><select class="select" id="rv133-deck-select">${state.decks.map(d=>`<option value="${safe(d.id)}" ${d.id===deck.id?'selected':''}>${safe(d.name)}</option>`).join('')}</select></label><button class="btn btn-ghost" data-action="rv133-open-deck">Open decklist ↗</button></div><p class="muted small">${safe(legendLabel(deck))}</p></div>
    ${overviewMetrics(deck)}<div class="rv133-panels"><section class="panel"><h3>Resource curve</h3>${costChart(deck)}</section><section class="panel"><h3>Card roles</h3>${roleChart(deck)}</section></div>
    <section class="panel mb18"><div class="row-between wrap"><h3>Card roles and cost notes</h3><span class="muted micro">Auto costs · Optional strategy notes</span></div>${entryRows(deck)}</section>
    <section class="panel mb18"><div class="row-between wrap"><h3>Smart card substitutions</h3><span class="pill">Legend-aware</span></div>${swapView(deck)}</section>
    <section class="panel mb18 rv133-history">${historyList(deck)}</section>`}`;
  }
  function noteDialog(name){
    const note=noteFor(name),role=roleName(name),energy=costInfo(name,'energy'),power=costInfo(name,'power');
    const auto=energy.source==='auto'||power.source==='auto';
    return modalShell('Card analysis notes',name,`<p class="muted small">Printed Energy and Power are looked up automatically. You only need to record optional strategic notes or card roles.</p>
    <div class="rv133-auto-cost-pill"><strong>⚡ Energy ${energy.value??'Unknown'} · ◆ Power ${power.value??'Unknown'}</strong><small>${auto?'Automatically matched to card data':energy.source==='manual'||power.source==='manual'?'Older manually recorded fallback':'Waiting for catalogue values'}</small></div>
    <label class="form-field"><span>Strategic role (optional)</span><select class="select" id="rv133-note-role">${ROLES.map(r=>`<option value="${safe(r)}" ${r===role?'selected':''}>${safe(r)}</option>`).join('')}</select></label>
    ${!auto?`<details class="rv133-manual-fallback"><summary>Fallback only: enter printed costs if catalogue unavailable</summary><div class="rv133-note-costs"><label class="form-field"><span>Energy</span><input class="input" type="number" min="0" max="20" id="rv133-note-energy" value="${costNumber(note.energy)??''}" placeholder="Unknown"></label><label class="form-field"><span>Power</span><input class="input" type="number" min="0" max="20" id="rv133-note-power" value="${costNumber(note.power)??''}" placeholder="Unknown"></label></div></details>`:''}
    <label class="form-field"><span>Card strategy note</span><textarea class="input" id="rv133-note-text" rows="3" maxlength="500" placeholder="How does this card help your strategy?">${safe(note.note||'')}</textarea></label>`,
    '<button class="btn btn-ghost" data-action="rv133-cancel">Cancel</button><button class="btn btn-primary" data-action="rv133-save-note">Save notes</button>',true);
  }
  function swapDialog(deck,source,target){
    const n=entryAssigned(deck,source),after=source.required-1;
    const returns=Math.max(0,n-after);
    const available=stockForName(target,true);
    return modalShell('Review proposed swap',deck.name,`<div class="rv133-review-box"><div><small>Remove from requirements</small><strong>− 1 × ${safe(requirementName(source))}</strong></div><div><small>Add to requirements</small><strong>+ 1 × ${safe(target)}</strong></div></div>
    <p class="muted small">${returns?`This would return ${returns} allocated ${returns===1?'copy':'copies'} of the removed card to Bulk.`:'No existing physical allocations need to be returned.'} Your total owned card count does not change.</p>
    <p class="muted small">${available?`${available} physical ${available===1?'copy is':'copies are'} already available in Bulk. After applying this swap, RiftArmoury can offer to allocate a copy.`:'The replacement is not currently available in Bulk; it will remain an unassigned deck requirement.'}</p><p class="muted micro">Check the card's printed rules before applying. This swaps one decklist requirement, not the physical ownership record.</p>`,
    '<button class="btn btn-ghost" data-action="rv133-cancel">Cancel</button><button class="btn btn-primary" data-action="rv133-apply-swap">Apply 1-card swap</button>',true);
  }
  function restoreDialog(deck,snapshot){
    const targetEntries=snapshot.entries||[],currentEntries=deck.entries;
    const matching=currentEntries.filter(e=>targetEntries.some(x=>x.section===e.section&&norm(x.name)===norm(e.name)&&normalizedCode(x.code)===normalizedCode(e.code)));
    const preserving=matching.reduce((n,e)=>n+Math.min(entryAssigned(deck,e),targetEntries.find(x=>x.section===e.section&&norm(x.name)===norm(e.name)&&normalizedCode(x.code)===normalizedCode(e.code)).required),0);
    const total=Object.values(deck.allocations||{}).reduce((s,row)=>s+Object.values(row).reduce((a,n)=>a+Number(n||0),0),0);
    const returned=Math.max(0,total-preserving);
    const curCount=currentEntries.reduce((a,e)=>a+Number(e.required||0),0),newCount=targetEntries.reduce((a,e)=>a+Number(e.required||0),0);
    return modalShell('Review deck restore',deck.name,`<div class="rv133-review-box"><div><small>Current deck requirements</small><strong>${curCount} cards · ${currentEntries.length} rows</strong></div><div><small>Restore selected checkpoint</small><strong>${newCount} cards · ${targetEntries.length} rows</strong></div></div><p class="muted small"><strong>${returned} currently allocated physical ${returned===1?'copy':'copies'}</strong> would be returned to Bulk because the older requirements cannot hold them. Compatible assigned copies are preserved where possible.</p><p class="muted small">No stock is created or deleted, and other decks stay unchanged. A new checkpoint is saved for the current requirements before restoring.</p>`,
    '<button class="btn btn-ghost" data-action="rv133-cancel">Cancel</button><button class="btn btn-primary" data-action="rv133-apply-restore">Restore deck requirements</button>',true);
  }
  function restoreRequirements(deck,snapshot){
    const allocations={};const used=new Set();
    const result=snapshot.entries.map(entry=>{
      const existing=deck.entries.find(e=>!used.has(e.id)&&e.section===entry.section&&norm(e.name)===norm(entry.name)&&normalizedCode(e.code)===normalizedCode(entry.code));
      if(existing)used.add(existing.id);
      const id=existing?.id||uid(),required=Math.max(0,Number(entry.required)||0);
      if(existing){let remaining=required;const row={};for(const [key,quantity] of Object.entries(deck.allocations?.[existing.id]||{})){
        if(remaining<=0)break;const q=Math.min(remaining,Math.max(0,Number(quantity)||0));if(q){row[key]=q;remaining-=q;}
      }if(Object.keys(row).length)allocations[id]=row;}
      return {id,section:entry.section,name:entry.name,code:entry.code||'',required};
    });
    deck.entries=result;deck.allocations=allocations;save();
  }
  const originalRenderDecks=renderDecks;
  renderDecks=function(){
    if(ui.deckId)return originalRenderDecks();
    return `<div class="rv133-workshop-banner"><div><div class="eyebrow">NEW · DECK WORKSHOP</div><strong>Build smarter decks with your collection</strong><span>Cost charts, role notes, legal substitutions and version history.</span></div><button class="btn btn-primary" data-action="rv133-open-workshop">Open Workshop ↗</button></div>`+originalRenderDecks();
  };
  const originalDeckDetail=renderDeckDetail;
  renderDeckDetail=function(deck){
    let h=originalDeckDetail(deck);
    const needle='data-action="rename-deck"';
    const action=`<button class="btn btn-primary btn-small" data-action="rv133-deck-workshop">◈ Deck Workshop</button>`;
    h=h.replace(`<button class="btn btn-ghost btn-small" ${needle}`,action+`<button class="btn btn-ghost btn-small" ${needle}`);
    return h;
  };
  NAV.splice(NAV.findIndex(x=>x.id==='inventory')+1,0,{id:'workshop',icon:'◈',name:'Deck Workshop'});
  const originalRender=render;
  render=function(){const r=originalRender();if(ui.tab==='workshop')document.getElementById('main').innerHTML=renderDeckWorkshop();return r;};
  const originalModal=renderModal;
  renderModal=function(){
    if(ui.modal?.type==='rv133-note-editor')document.getElementById('modal-root').innerHTML=noteDialog(ui.modal.name);
    else if(ui.modal?.type==='rv133-swap-review'){
      const d=findDeck(ui.modal.deckId),e=d?.entries.find(x=>x.id===ui.modal.fromId);
      if(!d||!e){ui.modal=null;return originalModal();}
      document.getElementById('modal-root').innerHTML=swapDialog(d,e,ui.modal.target);
    }else if(ui.modal?.type==='rv133-restore-review'){
      const d=findDeck(ui.modal.deckId),snapshot=(historyStore()[d?.id]||[]).find(x=>x.id===ui.modal.snapshotId);
      if(!d||!snapshot){ui.modal=null;return originalModal();}
      document.getElementById('modal-root').innerHTML=restoreDialog(d,snapshot);
    }else originalModal();
  };
  function goWorkshop(deckId){
    if(deckId)ws.deckId=deckId;else if(ui.deckId)ws.deckId=ui.deckId;
    ui.tab='workshop';ui.deckId=null;ui.modal=null;ws.query='';ws.fromId='';ws.onlyBulk=false;
    if(scanner.running||scanner.starting)stopScanner();render();window.scrollTo(0,0);
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('[data-action]');if(!btn||!btn.dataset.action?.startsWith('rv133-'))return;
    e.preventDefault();e.stopImmediatePropagation();
    const action=btn.dataset.action,deck=selectedDeck();
    if(action==='rv133-refresh-costs'){
      window.RiftArmouryAutoCosts?.refresh(true).then(()=>render()).catch(()=>render());return;
    }
    if(action==='rv133-open-workshop'||action==='rv133-deck-workshop'){goWorkshop(ui.deckId||deck?.id);return;}
    if(action==='rv133-new-deck'){
      const name=prompt('New deck name','Untitled deck');if(name===null)return;
      const d=createDeck(name.trim().slice(0,80)||'Untitled deck');ui.tab='decks';ui.deckId=d.id;render();toast('Deck created. Add your Legend, then choose legal cards.');return;
    }
    if(action==='rv133-open-deck'){if(deck){ui.tab='decks';ui.deckId=deck.id;render();}return;}
    if(!deck){toast('Choose a deck first.',true);return;}
    if(action==='rv133-note'){showModal('rv133-note-editor',{name:btn.dataset.name,deckId:deck.id});return;}
    if(action==='rv133-save-note'){
      const m=ui.modal;if(m?.type!=='rv133-note-editor')return;
      const role=document.getElementById('rv133-note-role')?.value;
      const rawEnergy=document.getElementById('rv133-note-energy')?.value,rawPower=document.getElementById('rv133-note-power')?.value;
      const current=noteFor(m.name);
      const energy=rawEnergy===undefined?costNumber(current.energy):costNumber(rawEnergy);
      const power=rawPower===undefined?costNumber(current.power):costNumber(rawPower);
      if((rawEnergy!==undefined&&rawEnergy!==''&&energy===null)||(rawPower!==undefined&&rawPower!==''&&power===null)||!ROLES.includes(role)){toast('Use a valid role and optional fallback costs from 0–20.',true);return;}
      const note=String(document.getElementById('rv133-note-text')?.value||'').slice(0,500);
      insights()[norm(m.name)]={...current,role,energy,power,note};save();closeModal();render();toast('Card role and notes saved; catalogue costs are automatic.');return;
    }
    if(action==='rv133-checkpoint'){addSnapshot(deck,deck.entries,'Manual checkpoint');save();render();toast('Decklist checkpoint saved.');return;}
    if(action==='rv133-review-swap'){
      const source=deck.entries.find(x=>x.id===ws.fromId);const candidate=getNamesForSearch().find(x=>norm(x.name)===norm(btn.dataset.target));
      if(!source||!candidate||!candidateEvaluation(deck,source,candidate.defaultPrint).ok){toast('That replacement is no longer legal for this deck.',true);render();return;}
      showModal('rv133-swap-review',{deckId:deck.id,fromId:source.id,target:candidate.name});return;
    }
    if(action==='rv133-apply-swap'){
      const m=ui.modal,d=findDeck(m?.deckId),entry=d?.entries.find(x=>x.id===m?.fromId),candidate=getNamesForSearch().find(x=>norm(x.name)===norm(m?.target));
      if(!d||!entry||!candidate||!['MainDeck','Sideboard'].includes(entry.section)||!candidateEvaluation(d,entry,candidate.defaultPrint).ok){toast('Deck changed; review this replacement again.',true);closeModal();render();return;}
      const before=entry.required,assigned=entryAssigned(d,entry),section=entry.section;
      const existing=d.entries.find(x=>x.section===section&&norm(x.name)===norm(candidate.name)&&!x.code);
      if(existing)existing.required+=1;else d.entries.push({id:uid(),name:candidate.name,section,required:1,code:''});
      if(before===1){d.entries=d.entries.filter(x=>x.id!==entry.id);delete d.allocations[entry.id];}
      else{entry.required-=1;if(assigned>entry.required){let excess=assigned-entry.required;const a=d.allocations[entry.id]||{};for(const key of Object.keys(a)){const drop=Math.min(excess,Number(a[key]||0));a[key]-=drop;if(a[key]<=0)delete a[key];excess-=drop;if(!excess)break;}}}
      save();const replacement=d.entries.find(x=>x.section===section&&norm(x.name)===norm(candidate.name));
      const available=replacement?entryBulk(replacement):0;
      if(available>0&&replacement&&entryAssigned(d,replacement)<replacement.required){showModal('v132-assign-prompt',{deckId:d.id,entryId:replacement.id,newQty:1});}
      else {closeModal();render();toast('Decklist requirement swapped. No physical cards moved into the new slot.');}
      return;
    }
    if(action==='rv133-review-restore'){
      const snap=(historyStore()[deck.id]||[]).find(x=>x.id===btn.dataset.snapshot);if(!snap)return;
      showModal('rv133-restore-review',{deckId:deck.id,snapshotId:snap.id});return;
    }
    if(action==='rv133-apply-restore'){
      const m=ui.modal,d=findDeck(m?.deckId),snap=(historyStore()[d?.id]||[]).find(x=>x.id===m?.snapshotId);
      if(!d||!snap)return;
      addSnapshot(d,d.entries,'Before restore');restoreRequirements(d,snap);closeModal();render();toast('Previous decklist requirements restored. Compatible physical assignments preserved; excess returned to Bulk.');return;
    }
    if(action==='rv133-cancel'){closeModal();return;}
  },true);
  document.addEventListener('change',event=>{
    if(event.target?.id==='rv133-deck-select'){ws.deckId=event.target.value;ws.fromId='';ws.query='';render();}
    else if(event.target?.id==='rv133-source'){ws.fromId=event.target.value;ws.query='';render();}
    else if(event.target?.id==='rv133-bulk'){ws.onlyBulk=!!event.target.checked;render();}
  },true);
  document.addEventListener('input',event=>{
    if(event.target?.id==='rv133-query'){
      ws.query=event.target.value;
      const deck=selectedDeck(),source=deck?.entries.find(e=>e.id===ws.fromId),area=document.getElementById('rv133-candidates');
      if(area&&deck&&source){
        const rows=candidateList(deck,source).slice(0,36);
        area.innerHTML=`<div class="rv133-candidate-list">${rows.map(c=>`<div class="rv133-candidate"><span class="rv133-small-art">${cardArt(c.card)}</span><div class="rv133-candidate-info"><strong>${safe(c.name)}</strong><small>${safe(c.role)} · Energy ${c.cost===null?'Unknown':c.cost} · Bulk ${c.bulk}</small><small>${safe(c.why.join(' · '))}</small></div><button class="btn btn-small btn-primary" data-action="rv133-review-swap" data-target="${safe(c.name)}">Review</button></div>`).join('')||'<div class="rv133-empty-note">No matching legal cards.</div>'}</div>`;
      }
    }
  },true);
  // Expose read-only analysis helpers for offline tests and future v1.34 engine.
  window.RiftArmoury133={version:'1.33.1',roles:ROLES,cardNotes:noteFor,costData,costInfo,roleData,candidates:candidateList,restore:restoreRequirements,snapshot:(d,label)=>addSnapshot(d,d.entries,label),fingerprint};
  render();
})();
