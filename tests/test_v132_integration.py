"""RiftVault v1.32 offline integration checks (requires Python Playwright + Chromium).
This test uses an in-memory browser fixture; it NEVER connects to a live inventory.
Run from project root: python tests/test_v132_integration.py
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
source=(ROOT/'index.html').read_text()
source=re.sub(r'<script[^>]*>.*?</script>', '',source,flags=re.S)
source=re.sub(r'<link[^>]*>', '',source)

with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(source,wait_until='domcontentloaded')
 page.evaluate('''() => {const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});window.fetch=async()=>{throw Error('offline test')};}''')
 for style in ['styles.css','features-v121.css','features-v132.css']:
  page.add_style_tag(content=(ROOT/style).read_text())
 for script in ['app.js','features-v121.js','features-v132.js']:
  page.add_script_tag(content=(ROOT/script).read_text())
 assert page.evaluate('window.RiftVault132.version')=='1.32'
 assert not errors,errors
 data=page.evaluate('''() => {
  const seed=[
   {id:'test-legend',code:'TST-001',name:'Demo, Hero',shortName:'Demo, Hero',type:'Legend',domains:['Fury','Chaos'],tags:['Demo']},
   {id:'test-fury',code:'TST-002',name:'Fury Tester',type:'Unit',domains:['Fury']},
   {id:'test-neutral',code:'TST-003',name:'Neutral Tester',type:'Unit',domains:[]},
   {id:'test-mind',code:'TST-004',name:'Mind Tester',type:'Unit',domains:['Mind']},
   {id:'test-dual',code:'TST-005',name:'Dual Tester',type:'Unit',domains:['Fury','Mind']},
   {id:'test-champ',code:'TST-006',name:'Demo, Champion',type:'Unit',supertype:'Champion',domains:['Fury'],tags:['Demo']},
   {id:'test-rune',code:'TST-R01',name:'Fury Rune',type:'Rune',domains:['Fury']},
   {id:'test-banned',code:'TST-010',name:'Fight or Flight',type:'Spell',domains:['Fury']}
  ].map(c=>createMeta({...c,set:'TST',setName:'Synthetic Test'}));
  catalog.push(...seed);rebuildIndexes();
  const d=createDeck('Test Deck',[{section:'Legend',name:'Demo, Hero',required:1,code:''}]);
  state.stock[keyFor('test-fury','Normal')]=2;
  state.stock[keyFor('test-neutral','Normal')]=1;
  for(const c of seed)state.printings[c.id]=createMeta(c);
  save();ui.tab='decks';ui.deckId=d.id;render();return {deckId:d.id};
 }''')
 assert page.evaluate('window.RiftVault132.status(findDeck(ui.deckId),getMeta("test-fury"),"MainDeck",1).ok')
 assert page.evaluate('window.RiftVault132.status(findDeck(ui.deckId),getMeta("test-neutral"),"MainDeck",1).ok')
 for code in ['test-mind','test-dual']:
  res=page.evaluate('(id)=>window.RiftVault132.status(findDeck(ui.deckId),getMeta(id),"MainDeck",1)',code)
  assert not res['ok'] and any('Outside Legend domains' in r for r in res['reasons']),res
 assert not page.evaluate('window.RiftVault132.status(findDeck(ui.deckId),getMeta("test-banned"),"MainDeck",1).ok')
 assert page.locator('.v132-section-stat').count()==6
 # Add 3, with only 2 physical Bulk copies; no automatic allocation.
 page.locator('[data-action="v132-add-open"]').first.click()
 page.locator('#v132-query').fill('Fury Tester')
 page.locator('#v132-qty').fill('3')
 page.locator('#v132-results [data-action="v132-add-select"]').click()
 before=page.evaluate('''() => {let d=findDeck(ui.deckId),e=d.entries.find(x=>x.name==='Fury Tester');return [e.required,entryAssigned(d,e),bulkQty(keyFor('test-fury','Normal')),ownedQty(keyFor('test-fury','Normal'))];}''')
 assert before==[3,0,2,2],before
 assert page.locator('.v132-assign-qty').input_value()=='2'
 page.locator('[data-action="v132-yes-assign"]').click()
 after=page.evaluate('''() => {let d=findDeck(ui.deckId),e=d.entries.find(x=>x.name==='Fury Tester');return [e.required,entryAssigned(d,e),bulkQty(keyFor('test-fury','Normal')),ownedQty(keyFor('test-fury','Normal'))];}''')
 assert after==[3,2,0,2],after
 # Explicitly decline bulk allocation on next card.
 page.locator('[data-action="v132-add-open"]').first.click()
 page.locator('#v132-query').fill('Neutral Tester')
 page.locator('#v132-results [data-action="v132-add-select"]').click()
 assert page.locator('[data-action="v132-no-assign"]').count()==1
 page.locator('[data-action="v132-no-assign"]').click()
 unchanged=page.evaluate('''() => {let d=findDeck(ui.deckId),e=d.entries.find(x=>x.name==='Neutral Tester');return [e.required,entryAssigned(d,e),bulkQty(keyFor('test-neutral','Normal'))];}''')
 assert unchanged==[1,0,1],unchanged
 # All cards explains disallowed cards and keeps their Add button disabled.
 page.locator('[data-action="v132-add-open"]').first.click()
 page.locator('[data-action="v132-filter"][data-filter="all"]').click()
 page.locator('#v132-query').fill('Mind Tester')
 assert 'Outside Legend domains' in page.locator('#v132-results').inner_text()
 assert page.locator('#v132-results [data-action="v132-add-select"]').is_disabled()
 # Back closes modal rather than exiting the app; repeated redraws don't add entries.
 before_idx=page.evaluate('history.state.idx')
 page.go_back(timeout=5000)
 page.wait_for_timeout(150)
 assert page.evaluate('ui.modal') is None
 assert page.evaluate('ui.deckId')==data['deckId']
 idx=page.evaluate('history.state.idx')
 page.evaluate('render();render();render();')
 assert page.evaluate('history.state.idx')==idx
 # CSS regression: 17 mobile printings have full card tiles and scrolling.
 css=page.evaluate('''() => {const e=document.createElement('div');e.className='rv-rune-art-options';
  for(let i=0;i<17;i++){let b=document.createElement('button');b.className='rv-rune-art-option';b.innerHTML='<span class="rv-rune-art-option-photo"><img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" /></span><strong>VEN-R03a</strong>';e.appendChild(b)}
  document.querySelector('#modal-root').appendChild(e);
  const css=getComputedStyle(e),first=e.firstElementChild;
  return {tileHeight:first.getBoundingClientRect().height,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,columns:css.gridTemplateColumns.split(' ').length};}''')
 assert css['tileHeight']>175 and css['scrollHeight']>css['clientHeight'] and css['columns']==2,css
 assert not errors,errors
 print('PASS: app load; Legend domains; legal/illegal cards; bans; deck requirements; opt-in Bulk allocation; Android Back; no history duplication; 17 Rune tiles')
 browser.close()
