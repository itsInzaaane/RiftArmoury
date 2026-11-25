"""RiftArmoury v1.33.3 complete multi-tag integration test with synthetic cards."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'index.html').read_text()
raw=re.sub(r'<script[^>]*>.*?</script>','',raw,flags=re.S)
raw=re.sub(r'<link[^>]*>','',raw)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(raw,wait_until='domcontentloaded')
 page.evaluate("""() => {const d={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>d[k]??null,setItem:(k,v)=>d[k]=String(v),removeItem:k=>delete d[k]},configurable:true});window.fetch=async()=>{throw Error('offline')};} """)
 for x in ['styles.css','features-v121.css','features-v132.css','features-v133.css']:page.add_style_tag(content=(ROOT/x).read_text())
 for x in ['app.js','features-v121.js','features-v132.js','costs-v1331.js','roles-v1333.js','features-v133.js']:page.add_script_tag(content=(ROOT/x).read_text())
 assert not errors,errors
 data=page.evaluate("""() => {
 const names=[{id:'legend',name:'Demo, Hero',code:'TST-001',type:'Legend',domains:['Fury','Chaos']},
 {id:'fury',name:'Fury Tester',code:'TST-002',type:'Unit',domains:['Fury']},
 {id:'better',name:'Strong Fury Tester',code:'TST-003',type:'Unit',domains:['Fury']},
 {id:'mind',name:'Mind Tester',code:'TST-004',type:'Unit',domains:['Mind']}];
 catalog.push(...names.map(x=>createMeta({...x,set:'TST',setName:'Synthetic',imageUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VU0AAAAASUVORK5CYII='})));for(const c of catalog)state.printings[c.id]=createMeta(c);rebuildIndexes();
 window.RiftArmouryRoles.ingest([
 {cardCode:'TST-002',fullName:'Fury Tester',abilityEffective:'Draw a card. Deal 2 damage to target unit. Target enemy unit gets -2 Might.'},
 {cardCode:'TST-003',fullName:'Strong Fury Tester',abilityEffective:'Heal a friendly unit. Move a friendly unit to a battlefield. Ready a rune.'},
 {cardCode:'TST-004',fullName:'Mind Tester',abilityEffective:'This unit has no special ability.'}
 ]);
 const d=createDeck('Test Deck',[{section:'Legend',name:'Demo, Hero',required:1,code:''},{section:'MainDeck',name:'Fury Tester',required:2,code:''}]);
 state.stock[keyFor('fury','Normal')]=2;state.stock[keyFor('better','Normal')]=1;save();
 return {before:totalOwned(),stock:JSON.stringify(state.stock),deck:d.id,entry:d.entries.find(e=>e.name==='Fury Tester').required};
 }""")
 assert page.evaluate('window.RiftArmouryRoles.roles.length')==27
 assert page.evaluate("window.RiftArmouryRoles.roles.includes('Finisher')") is False
 assert page.evaluate("window.RiftArmouryRoles.roles.includes('Late Game')")
 assert page.evaluate("window.RiftArmouryRoles.roles.includes('Debuff')")
 assert page.evaluate("window.RiftArmouryRoles.details('Fury Tester').selected.sort()") == sorted(['Card Draw','Direct Damage','Debuff'])
 assert page.evaluate("window.RiftArmouryRoles.details('Strong Fury Tester').selected.sort()") == sorted(['Healing','Movement / Repositioning','Power Support','Ramp / Acceleration'])
 assert page.evaluate("window.RiftArmouryRoles.details('Mind Tester').selected.length")==0
 # Empty or unrelated card description may not be inferred from energy/type.
 assert page.evaluate("window.RiftArmouryRoles.ingest([{cardCode:'TST-002',fullName:'Fury Tester',abilityEffective:'Spend 6 Energy to play this unit.'}])")==1
 assert page.evaluate("window.RiftArmouryRoles.details('Fury Tester').selected.length")==0
 # Restore multi-effect snapshot.
 page.evaluate("""() => window.RiftArmouryRoles.ingest([{cardCode:'TST-002',fullName:'Fury Tester',abilityEffective:'Draw a card. Deal 2 damage to target unit. Target enemy unit gets -2 Might.'}])""")
 page.evaluate("ui.inventoryBrowseOwned=true;ui.tab='inventory';render()")
 assert page.locator('[data-action="card-detail"]').count()>=1
 page.locator('[data-action="card-detail"][data-name="Fury Tester"]').click()
 assert page.evaluate('ui.modal.type')=='printing-detail'
 assert page.locator('.rv1333-inventory-roles [data-action="rv133-edit-from-detail"]').count()==1
 assert page.locator('.rv1333-inventory-roles .rv1333-tag').count()==3
 page.locator('.rv1333-inventory-roles [data-action="rv133-edit-from-detail"]').click()
 assert page.evaluate('ui.modal.type')=='rv133-note-editor'
 assert page.locator('[data-rv1333-role]').count()==27
 assert page.locator('[data-rv1333-role="Card Draw"]').is_checked()
 assert page.locator('[data-rv1333-role="Debuff"]').is_checked()
 page.locator('[data-rv1333-role="Debuff"]').uncheck()
 page.locator('[data-rv1333-role="Synergy"]').check()
 page.locator('#rv133-note-text').fill('Useful for a Fury plan')
 page.locator('[data-action="rv133-save-note"]').click()
 assert page.evaluate('ui.modal.type')=='printing-detail'
 tags=page.locator('.rv1333-inventory-roles .rv1333-tag').all_inner_texts()
 assert set(tags)=={'Card Draw','Direct Damage','Synergy'},tags
 assert page.evaluate("window.RiftArmouryRoles.details('Fury Tester').note.note")=='Useful for a Fury plan'
 page.locator('[data-action="close-modal"]').last.click()
 page.evaluate("ui.tab='workshop';render()")
 assert page.locator('.rv133-annotation-row').count()==1
 assert 'Synergy' in page.locator('.rv133-annotation-row').inner_text()
 # card preview still opens full artwork and not tag editor
 page.locator('.rv133-annotation-row [data-action="image-preview"]').click()
 assert page.evaluate('ui.modal.type')=='image-preview'
 page.locator('.art-preview-header [data-action="art-preview-close"]').click()
 page.locator('.rv133-annotation-row [data-action="rv133-note"]').click()
 assert page.locator('[data-rv1333-role="Synergy"]').is_checked()
 assert not page.locator('[data-rv1333-role="Debuff"]').is_checked()
 page.locator('[data-action="rv133-reset-roles"]').click()
 assert page.locator('[data-rv1333-role="Debuff"]').is_checked()
 assert not page.locator('[data-rv1333-role="Synergy"]').is_checked()
 page.locator('[data-action="rv133-cancel"]').click()
 # Legacy saved role auto-converts Finisher -> Late Game without deleting notes
 page.evaluate("""() => {state.cardInsights[normalizeName('Fury Tester')]={role:'Finisher',note:'Historic note',energy:4};save()}""")
 assert page.evaluate("window.RiftArmouryRoles.details('Fury Tester').selected.includes('Late Game')")
 assert page.evaluate("window.RiftArmoury133.costInfo('Fury Tester','energy').value")==4
 assert page.evaluate("window.RiftArmouryRoles.details('Fury Tester').note.note")=='Historic note'
 # Ratio counts per role means 3 roles x 2 copies => 6 counted tags, but stock unchanged.
 page.evaluate("ui.tab='workshop';render()")
 counts=page.evaluate("() => window.RiftArmoury133.roleData(findDeck(state.decks[0].id))")
 assert any(k=='Late Game' and q==2 for k,q in counts),counts
 after=page.evaluate("""() => ({total:totalOwned(),stock:JSON.stringify(state.stock),qty:state.decks[0].entries.find(e=>e.name==='Fury Tester').required,key:DATA_KEY,version:window.RiftArmoury133.version,tagCount:window.RiftArmouryRoles.roles.length})""")
 assert after['total']==data['before'] and after['stock']==data['stock'] and after['qty']==data['entry']==2,(after,data)
 assert after['key']=='riftvault-local-v1' and after['version']=='1.33.3'
 assert after['tagCount']==27
 assert not errors, errors
 browser.close()
print('PASS v1.33.3: 27 tags, automatic multi-role suggestions, shared inventory/workshop editor, override/reset, legacy migration, card preview, stock integrity')
