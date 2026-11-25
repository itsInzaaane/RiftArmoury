"""v1.33.1 offline browser tests for automatic Energy and Power data, no real inventory."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S)
html=re.sub(r'<link[^>]*>','',html)
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda exc:errors.append(str(exc)))
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => {
  const data={};window.__fakeLocal=data;
  Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});
  window.fetch=async()=>{throw Error('offline test')};
 }''')
 for style in ('styles.css','features-v121.css','features-v132.css','features-v133.css'):
  page.add_style_tag(content=(ROOT/style).read_text())
 for script in ('app.js','features-v121.js','features-v132.js','costs-v1331.js','features-v133.js'):
  page.add_script_tag(content=(ROOT/script).read_text())
 assert not errors,errors
 data=page.evaluate('''() => {
  const seed=[
    {id:'x-legend',code:'TST-001',name:'Demo, Hero',type:'Legend',domains:['Fury','Chaos']},
    {id:'x-fury',code:'TST-002',name:'Fury Tester',type:'Unit',domains:['Fury']},
    {id:'x-spell',code:'TST-003',name:'Spell Tester',type:'Spell',domains:['Chaos']},
    {id:'x-side',code:'TST-004',name:'Sideboard Tester',type:'Unit',domains:['Fury']},
    {id:'x-missing',code:'TST-005',name:'Unknown Tester',type:'Unit',domains:['Fury']}
  ].map(c=>createMeta({...c,set:'TST',setName:'Synthetic'}));
  catalog.push(...seed);rebuildIndexes();
  const d=createDeck('Cost Test',[
    {section:'Legend',name:'Demo, Hero',required:1,code:''},
    {section:'MainDeck',name:'Fury Tester',required:2,code:''},
    {section:'MainDeck',name:'Spell Tester',required:1,code:''},
    {section:'MainDeck',name:'Unknown Tester',required:1,code:''},
    {section:'Sideboard',name:'Sideboard Tester',required:9,code:''}
  ]);
  const all=[...Array.from({length:300},(_,i)=>({id:'abc-'+i,public_code:'ABC-'+String(i).padStart(3,'0')+'/300',display_name:'Dummy '+i,type:'Unit',attributes:{energy:i%9,power:i%3}})),
    {id:'tst-002',public_code:'TST-002/999',display_name:'Fury Tester',type:'Unit',attributes:{energy:2,power:1}},
    {id:'tst-003',public_code:'TST-003/999',display_name:'Spell Tester',type:'Spell',attributes:{energy:0,power:null}},
    {id:'tst-004',public_code:'TST-004/999',display_name:'Sideboard Tester',type:'Unit',attributes:{energy:8,power:3}}];
  window.fetch=async url=>{if(String(url).includes('Dystorted888'))return {ok:true,json:async()=>({cards:all})};throw Error('fixture only')};
  ui.tab='workshop';render();return {id:d.id};
 }''')
 result=page.evaluate('''async () => await window.RiftArmouryAutoCosts.refresh(true)''')
 assert result['count']>=300,result
 assert page.evaluate('Boolean(window.__fakeLocal["riftarmoury-auto-costs-v1331"])'), 'Cost catalogue should be cached independently of ownership'
 values=page.evaluate('''() => {
   const d=state.decks[0];return {
    energy:window.RiftArmoury133.costData(d),power:window.RiftArmoury133.costData(d,'power'),
    zero:window.RiftArmoury133.costInfo('Spell Tester','energy'),
    noPower:window.RiftArmoury133.costInfo('Spell Tester','power'),
    unknown:window.RiftArmoury133.costInfo('Unknown Tester','energy'),
    inventoryKey:DATA_KEY,cacheCount:window.RiftArmouryAutoCosts.status().count,
    owned:totalOwned()
   }
 }''')
 assert values['energy']['known']==3,values
 assert values['energy']['unknown']==1,values
 assert values['energy']['automatic']==3,values
 assert values['energy']['bins'][0]==1 and values['energy']['bins'][2]==2,values
 assert values['power']['bins'][0]==1 and values['power']['bins'][1]==2,values
 assert values['power']['unknown']==1,values
 assert values['zero']['value']==0 and values['zero']['source']=='auto',values
 assert values['noPower']['value']==0,values
 assert values['unknown']['value'] is None,values
 assert values['inventoryKey']=='riftvault-local-v1'
 assert values['owned']==0
 assert page.locator('.rv133-bars').count()==2
 assert page.locator('.rv133-auto-cost-pill').count()==0 # no modal
 assert '3 known' in page.locator('.rv133-panels').inner_text()
 page.locator('[data-action="rv133-note"]').first.click()
 assert page.locator('.rv133-auto-cost-pill').count()==1
 assert page.locator('#rv133-note-energy').count()==0 # cost entry unnecessary for verified card
 page.locator('[data-action="rv133-cancel"]').click()
 assert not errors,errors
 browser.close()
print('PASS: automatic cost fetching; exact code match; zero Energy and zero Power; unknown distinct from zero; sideboard excluded; no owned-data writes; mobile chart; no manual entry for verified cards')
