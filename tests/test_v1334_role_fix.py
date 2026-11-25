"""RiftArmoury 1.33.4 new role & art integration checks (synthetic fixture)."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
html=re.sub(r'<script[^>]*>.*?</script>','', (ROOT/'index.html').read_text(),flags=re.S)
html=re.sub(r'<link[^>]*>','',html)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v)},configurable:true});window.fetch=async()=>{throw Error('offline')};}""")
 for f in ['styles.css','features-v121.css','features-v132.css','features-v133.css']:page.add_style_tag(content=(ROOT/f).read_text())
 for f in ['app.js','features-v121.js','features-v132.js','costs-v1331.js','roles-v1333.js','features-v133.js']:page.add_script_tag(content=(ROOT/f).read_text())
 page.evaluate("""() => {
 const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VU0AAAAASUVORK5CYII=';
 const cards=[{id:'leg',name:'Tester, Legend',code:'TST-001',type:'Legend',domains:['Fury','Chaos']},{id:'old',name:'Card Tester',code:'TST-002',type:'Unit',domains:['Fury']},{id:'alt',name:'Card Tester',code:'TST-002a',type:'Unit',domains:['Fury'],isAltArt:true}].map(x=>createMeta({...x,imageUrl:img,set:'TST',setName:'Synthetic'}));catalog.push(...cards);cards.forEach(x=>state.printings[x.id]=x);rebuildIndexes();
 const d=createDeck('A',[{section:'Legend',name:'Tester, Legend',required:1,code:'TST-001'},{section:'MainDeck',name:'Card Tester',required:1,code:'TST-002a'}]);state.stock[keyFor('alt','Normal')]=1;save();ui.tab='workshop';render();
 }""")
 # Source-shaped nested ability text, rich markup fallback, and multi-role match.
 a=page.evaluate("""() => window.RiftArmouryRoles.extract({cards:[{public_code:'TST-002a/999',display_name:'Card Tester',text:{plain:'Draw a card. Deal 2 damage. Target unit gets -2 Might.',rich:'<p>Unrelated rich text</p>'}},{public_code:'TST-003/999',display_name:'Spell Test',text:{rich:'<p>Heal a unit.<br>Move a unit to a battlefield.</p>'}}]})""")
 assert len(a)==2 and 'Draw a card' in a[0]['text'] and 'Move a unit' in a[1]['text'],a
 assert page.evaluate("""() => {window.RiftArmouryRoles.ingest({cards:[{public_code:'TST-002a/999',display_name:'Card Tester',text:{plain:'Draw a card. Deal 2 damage. Target unit gets -2 Might.'}}]});return window.RiftArmouryRoles.details('Card Tester').selected.sort()}""")==['Card Draw','Debuff','Direct Damage']
 page.locator('[data-action="rv133-note"]').first.click()
 assert page.locator('.rv1334-editor-art[data-id="alt"]').count()==1
 assert 'TST-002a' in page.locator('.rv1334-card-identity').inner_text()
 assert page.locator('[data-rv1333-role="Card Draw"]').is_checked()
 # Reindex while editing, without wiping checkbox or note.
 page.locator('[data-rv1333-role="Synergy"]').check()
 page.locator('#rv133-note-text').fill('Unsaved strategy')
 page.evaluate("""() => window.RiftArmouryRoles.ingest([{cardCode:'TST-002a',fullName:'Card Tester',abilityEffective:'Heal a unit.'}])""")
 assert page.locator('[data-rv1333-role="Synergy"]').is_checked()
 assert page.locator('#rv133-note-text').input_value()=='Unsaved strategy'
 assert 'Save your edits' in page.locator('#rv1334-ability-status').inner_text()
 page.locator('.rv1334-editor-art').click()
 assert page.evaluate('ui.modal.type')=='image-preview'
 assert page.evaluate('ui.modal.id')=='alt'
 page.locator('.art-preview-header [data-action="art-preview-close"]').click()
 assert page.evaluate('ui.modal.type')=='rv133-note-editor'
 assert page.locator('[data-rv1333-role="Synergy"]').is_checked()
 assert page.locator('#rv133-note-text').input_value()=='Unsaved strategy'
 page.locator('[data-action="rv133-save-note"]').click()
 assert page.evaluate("window.RiftArmouryRoles.details('Card Tester').selected.includes('Synergy')")
 assert page.evaluate("window.RiftArmouryRoles.details('Card Tester').note.note")=='Unsaved strategy'
 # Test fresh suggestion update when no edit pending (reset before ingestion).
 page.locator('[data-action="rv133-note"]').first.click()
 page.locator('[data-action="rv133-reset-roles"]').click()
 assert page.locator('[data-rv1333-role="Healing"]').is_checked()
 page.evaluate("""() => window.RiftArmouryRoles.ingest([{cardCode:'TST-002a',fullName:'Card Tester',abilityEffective:'Draw three cards.'}])""")
 assert page.locator('[data-rv1333-role="Card Draw"]').is_checked()
 assert not page.locator('[data-rv1333-role="Healing"]').is_checked()
 # Actual refresh from large structured snapshot
 page.evaluate("""() => {const cards=Array.from({length:180},(_,i)=>({public_code:'TST-'+(100+i),display_name:'Other '+i,text:{plain:'Draw a card.'}}));cards.push({public_code:'TST-002a/999',display_name:'Card Tester',text:{plain:'Deal 2 damage.'}});window.fetch=async()=>({ok:true,json:async()=>({cards})});}""")
 page.evaluate("() => window.RiftArmouryRoles.refresh(true)")
 assert page.evaluate('window.RiftArmouryRoles.status().count')>=180
 assert page.evaluate("window.RiftArmouryRoles.details('Card Tester').selected.includes('Direct Damage')")
 result=page.evaluate("""() => ({owned:totalOwned(),stock:JSON.stringify(state.stock),qty:state.decks[0].entries.find(e=>e.name==='Card Tester').required,key:DATA_KEY,v:window.RiftArmoury133.version,v2:window.RiftArmouryRoles.version})""")
 assert result['owned']==1 and result['qty']==1 and result['stock']=='{"alt~~Normal":1}',result
 assert result['key']=='riftvault-local-v1' and result['v']==result['v2']=='1.33.4',result
 assert not errors,errors
 browser.close()
print('PASS v1.33.4 nested abilities, multi-role suggestions, async status, unsaved edit preservation, exact printing artwork, inventory integrity')
