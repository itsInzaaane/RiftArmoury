"""v1.33.2: Deck Workshop card preview is independent from Edit tags/Review.
All fixture cards are synthetic. Offline test, no personal inventory required.
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'index.html').read_text()
html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S)
html=re.sub(r'<link[^>]*>','',html)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errs=[]
    page.on('pageerror', lambda exc:errs.append(str(exc)))
    page.set_content(html, wait_until='domcontentloaded')
    page.evaluate("""() => {
      const data={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=String(v),removeItem:k=>delete data[k]},configurable:true});
      window.fetch=async()=>{throw Error('Offline fixture')};
    }""")
    for style in ('styles.css','features-v121.css','features-v132.css','features-v133.css'):
        page.add_style_tag(content=(ROOT/style).read_text())
    for script in ('app.js','features-v121.js','features-v132.js','costs-v1331.js','roles-v1333.js','features-v133.js'):
        page.add_script_tag(content=(ROOT/script).read_text())
    assert not errs, errs
    data=page.evaluate("""() => {
      const img='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/VU0AAAAASUVORK5CYII=';
      const cards=[
        {id:'demo-legend',code:'TST-001',name:'Demo, Hero',shortName:'Demo, Hero',type:'Legend',domains:['Fury','Chaos']},
        {id:'demo-old',code:'TST-002',name:'Fury Tester',type:'Unit',domains:['Fury']},
        {id:'demo-new',code:'TST-003',name:'Strong Fury Tester',type:'Unit',domains:['Fury']},
        {id:'demo-two',code:'TST-004',name:'Other Fury Tester',type:'Unit',domains:['Fury']},
        {id:'demo-illegal',code:'TST-005',name:'Mind Tester',type:'Unit',domains:['Mind']}
      ].map(c=>createMeta({...c,imageUrl:img,set:'TST',setName:'Synthetic'}));
      catalog.push(...cards);rebuildIndexes();
      const d=createDeck('Preview Test',[
        {section:'Legend',name:'Demo, Hero',required:1,code:''},
        {section:'MainDeck',name:'Fury Tester',required:2,code:''}
      ]);
      state.stock[keyFor('demo-old','Normal')]=2;
      state.stock[keyFor('demo-new','Normal')]=1;
      save();ui.tab='workshop';render();
      return {deckId:d.id,before:totalOwned(),stock:JSON.stringify(state.stock),entryQty:d.entries.find(e=>e.name==='Fury Tester').required};
    }""")
    assert page.locator('.rv133-annotation-row').count()==1
    card=page.locator('.rv133-annotation-row [data-action="image-preview"]')
    assert card.count()==1
    assert 'Fury Tester' in card.get_attribute('aria-label')
    assert page.locator('.rv133-annotation-row [data-action="rv133-note"]').count()==1
    # Tapping a card opens existing full-card viewer, NOT the tag editor.
    card.click()
    assert page.evaluate('ui.modal?.type')=='image-preview'
    assert page.evaluate('ui.modal?.id')=='demo-old'
    assert page.locator('.art-preview-dialog').count()==1
    assert 'TST-002' in page.locator('.art-preview-header').inner_text()
    assert page.locator('[data-rv1333-role]').count()==0
    assert page.locator('[data-action="art-preview-zoom"]').count()==1
    # Close via X, same workshop remains visible.
    page.locator('.art-preview-header [data-action="art-preview-close"]').click()
    page.wait_for_function('ui.modal===null')
    assert page.locator('.rv133-annotation-row').count()==1
    assert page.locator('[data-rv1333-role]').count()==0
    # Button for Edit Tags opens that editor and not an image preview.
    page.locator('.rv133-annotation-row [data-action="rv133-note"]').click()
    assert page.evaluate('ui.modal?.type')=='rv133-note-editor'
    assert page.locator('[data-rv1333-role]').count()==27
    assert page.locator('.art-preview-dialog').count()==0
    page.locator('[data-action="rv133-cancel"]').click()
    # Tapping a candidate opens artwork; Review opens swap dialog separately.
    cand=page.locator('.rv133-candidate [data-action="image-preview"][data-id="demo-new"]')
    assert cand.count()==1
    cand.click()
    assert page.evaluate('ui.modal?.type')=='image-preview'
    assert page.evaluate('ui.modal?.id')=='demo-new'
    page.locator('.art-preview-header [data-action="art-preview-close"]').click()
    page.wait_for_function('ui.modal===null')
    page.locator('.rv133-candidate [data-action="rv133-review-swap"][data-target="Strong Fury Tester"]').click()
    assert page.evaluate('ui.modal?.type')=='rv133-swap-review'
    page.locator('[data-action="rv133-cancel"]').click()
    # Filtering dynamically re-renders card previews, too.
    page.locator('#rv133-query').fill('Other Fury')
    assert page.locator('.rv133-candidate [data-action="image-preview"]').count()==1
    page.locator('.rv133-candidate [data-action="image-preview"]').click()
    assert page.evaluate('ui.modal?.id')=='demo-two'
    # Phone Back key goes from card image to the workshop (not exit).
    page.evaluate('history.back()')
    page.wait_for_function("ui.modal===null && ui.tab==='workshop'")
    # Keyboard: Enter on focused card opens its art again.
    page.locator('.rv133-annotation-row [data-action="image-preview"]').focus()
    page.keyboard.press('Enter')
    assert page.evaluate('ui.modal?.type')=='image-preview'
    page.locator('.art-preview-header [data-action="art-preview-close"]').click()
    page.wait_for_function('ui.modal===null')
    after=page.evaluate("""() => ({
      owned:totalOwned(),stock:JSON.stringify(state.stock),
      quantity:findDeck(state.decks[0].id).entries.find(e=>e.name==='Fury Tester').required,
      notes:Object.keys(state.cardInsights||{}).length,tab:ui.tab,version:window.RiftArmoury133.version,
      dataKey:DATA_KEY
    })""")
    assert after['owned']==data['before'],(data,after)
    assert after['stock']==data['stock'],(data,after)
    assert after['quantity']==data['entryQty']==2,(data,after)
    assert after['notes']==0,after
    assert after['tab']=='workshop',after
    assert after['dataKey']=='riftvault-local-v1',after
    assert after['version']=='1.33.4',after
    assert not errs,errs
    browser.close()
print('PASS: full card art preview, independent Edit tags and Review, live-filtered candidates, mobile Back, keyboard, no ownership/deck changes')
