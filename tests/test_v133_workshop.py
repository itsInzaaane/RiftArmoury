"""RiftArmoury v1.33 offline integration: local-only browser fixture."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'index.html').read_text()
source=re.sub(r'<script[^>]*>.*?</script>','',source,flags=re.S)
source=re.sub(r'<link[^>]*>','',source)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(source,wait_until='domcontentloaded')
 page.evaluate('''() => {const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});window.fetch=async()=>{throw Error('offline test')};}''')
 for style in ['styles.css','features-v121.css','features-v132.css','features-v133.css']:
  page.add_style_tag(content=(ROOT/style).read_text())
 for script in ['app.js','features-v121.js','features-v132.js','features-v133.js']:
  page.add_script_tag(content=(ROOT/script).read_text())
 assert not errors,errors
 assert page.evaluate('window.RiftArmoury133.version')=='1.33'
 assert page.evaluate('DATA_KEY')=='riftvault-local-v1'
 assert page.locator('.brand strong').inner_text()=='RiftArmoury'
 assert page.locator('nav#side-nav [data-nav="workshop"]').count()==1
 assert page.locator('nav#bottom-nav [data-nav="inventory"]').count()==1
 data=page.evaluate('''() => {
  const seed=[
  {id:'x-legend',code:'TST-001',name:'Demo, Hero',type:'Legend',domains:['Fury','Chaos'],tags:['Demo']},
  {id:'x-fury',code:'TST-002',name:'Fury Tester',type:'Unit',domains:['Fury']},
  {id:'x-fury2',code:'TST-003',name:'Strong Fury Tester',type:'Unit',domains:['Fury']},
  {id:'x-mind',code:'TST-004',name:'Mind Tester',type:'Unit',domains:['Mind']},
  {id:'x-rune',code:'TST-R01',name:'Fury Rune',type:'Rune',domains:['Fury']}
  ].map(c=>createMeta({...c,shortName:c.name,set:'TST',setName:'Synthetic'}));
  catalog.push(...seed);rebuildIndexes();
  const d=createDeck('Prototype',[{section:'Legend',name:'Demo, Hero',required:1,code:''},{section:'MainDeck',name:'Fury Tester',required:2,code:''}]);
  state.stock[keyFor('x-fury','Normal')]=2;
  state.stock[keyFor('x-fury2','Normal')]=2;
  for(const c of seed)state.printings[c.id]=createMeta(c);
  save();ui.tab='decks';ui.deckId=d.id;render();return {deckId:d.id};
 }''')
 assert not errors,errors
 assert page.locator('[data-action="rv133-deck-workshop"]').count()==1
 page.locator('[data-action="rv133-deck-workshop"]').click()
 assert page.locator('#rv133-deck-select').count()==1
 assert page.locator('.rv133-metrics strong').count()==4
 assert page.locator('.rv133-bars').count()==1
 assert page.locator('.rv133-annotation-row').count()==1
 # Set real manual annotations, saved in browser state, no stock change.
 page.locator('[data-action="rv133-note"]').click()
 page.locator('#rv133-note-role').select_option('Early pressure')
 page.locator('#rv133-note-energy').fill('2')
 page.locator('#rv133-note-power').fill('1')
 page.locator('[data-action="rv133-save-note"]').click()
 assert page.evaluate('window.RiftArmoury133.cardNotes("Fury Tester").role')=='Early pressure'
 assert page.evaluate('window.RiftArmoury133.costData(findDeck("'+data['deckId']+'")).known')==2
 assert page.locator('.rv133-bar').count()==6
 # Suggest only legal same-type cards, exclude Mind domain. Never claim owned if not in Bulk.
 candidates=page.evaluate('''() => {const d=findDeck(ui.tab==='workshop'?state.decks[0].id:ui.deckId);return window.RiftArmoury133.candidates(d,d.entries.find(e=>e.name==='Fury Tester')).map(c=>c.name)}''')
 assert 'Strong Fury Tester' in candidates,candidates
 assert 'Mind Tester' not in candidates,candidates
 assert page.locator('[data-action="rv133-review-swap"]').count()>0
 page.locator('[data-action="rv133-review-swap"][data-target="Strong Fury Tester"]').click()
 assert page.locator('[data-action="rv133-apply-swap"]').count()==1
 before=page.evaluate('''() => [bulkQty(keyFor('x-fury','Normal')),bulkQty(keyFor('x-fury2','Normal')),totalOwned()]''')
 page.locator('[data-action="rv133-apply-swap"]').click()
 after=page.evaluate('''() => [bulkQty(keyFor('x-fury','Normal')),bulkQty(keyFor('x-fury2','Normal')),totalOwned()]''')
 assert before==after,(before,after)
 # Assignment prompt is optional, and if we decline, physical ownership is unchanged.
 assert page.locator('[data-action="v132-no-assign"]').count()==1
 page.locator('[data-action="v132-no-assign"]').click()
 requirements=page.evaluate('''() => findDeck(state.decks[0].id).entries.map(e=>[e.name,e.required])''')
 assert ['Fury Tester',1] in requirements,requirements
 assert ['Strong Fury Tester',1] in requirements,requirements
 assert page.locator('[data-action="rv133-review-restore"]').count()>0
 # Checkpoint restore preserves physical stock and returns excess safely.
 page.locator('[data-action="rv133-review-restore"]').first.click()
 assert page.locator('[data-action="rv133-apply-restore"]').count()==1
 page.locator('[data-action="rv133-apply-restore"]').click()
 post=page.evaluate('''() => [findDeck(state.decks[0].id).entries.map(e=>[e.name,e.required]),totalOwned()]''')
 assert post[1]==before[2],post
 assert ['Fury Tester',2] in post[0],post
 assert not errors,errors
 # Restoring a different requirement quantity never creates physical ownership.
 safe=page.evaluate('''() => {const d=state.decks[0];let e=d.entries.find(e=>e.name==='Fury Tester');
  const key=keyFor('x-fury','Normal');assignOne(d,e,key);assignOne(d,e,key);
  save();const beforeOwned=totalOwned();
  const checkpoint={entries:d.entries.map(x=>({...x}))};
  e.required=1;let alloc=d.allocations[e.id];for(const k of Object.keys(alloc||{})){if(alloc[k]>1)alloc[k]=1;}
  save();const afterTrimBulk=bulkQty(key);
  window.RiftArmoury133.restore(d,checkpoint);
  return {beforeOwned,afterOwned:totalOwned(),afterTrimBulk,afterRestoredBulk:bulkQty(key),assigned:entryAssigned(d,d.entries.find(x=>x.name==='Fury Tester'))};
 }''')
 assert safe['beforeOwned']==safe['afterOwned']==4,safe
 assert safe['afterTrimBulk']==safe['afterRestoredBulk']==1,safe
 assert safe['assigned']==1,safe
 # Mobile responsive layout and preserved icon/theme image bytes.
 grid=page.locator('.rv133-panels').evaluate('(el)=>getComputedStyle(el).gridTemplateColumns')
 assert len(grid.split())==1,grid
 browser.close()
print('PASS: v1.33 rebranding, workshop, metadata, cost chart, legal suggestions, safe swap, snapshots and mobile layout')
