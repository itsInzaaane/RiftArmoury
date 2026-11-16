'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=src.indexOf('// Keep Rune artwork strict');
const end=src.indexOf('function fmt(',start);
assert(start>0&&end>start,'Rune verification code block exists');
const code=src.slice(start,end);
const uuid='aaaabbbb-1111-2222-3333-444455556666';
const normalUrl='https://images.rifthunt.com/cards/exact-ven-r03a-normal.webp?v=abc';
const largeUrl='https://images.rifthunt.com/cards/exact-ven-r03a-large.webp?v=abc';
const rune={id:'rh-mind-venda',printingId:uuid,code:'VEN-R03a',publicCode:'VEN-R03a',name:'Mind Rune',type:'Rune',isAltArt:true,imageUrl:'https://old-images.example.com/mind-rune-normal.png'};
let fetchCalls=[];
let response={id:uuid,printing_id:uuid,set:'ven',collector_number:'r03a',type:'rune',variant:'alternate',images:{normal:normalUrl,large:largeUrl}};
let renderCalls=0;
const backing=new Map();
const context={
  normalizedCode:str=>String(str||'').toUpperCase().replace(/\/\d+.*/,'').replace(/[^A-Z0-9*]/g,''),
  normalizeName:str=>String(str||'').trim().toLowerCase(),
  isBasicRuneName:name=>/Rune$/.test(String(name||'')),
  isOvernumberedPrinting:()=>false,isSignaturePrinting:()=>false,
  escapeHtml:s=>String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;'),
  verifiedRuneArt:new Map(),pendingRuneArt:new Map(),state:{artworkOverrides:{}},
  RUNE_ALT_ART_CACHE_KEY:'test-verified-art',
  localStorage:{setItem:(key,v)=>backing.set(key,v),getItem:key=>backing.get(key)||null},
  fetch:async (url)=>{fetchCalls.push(url);return {ok:true,json:async()=>response};},
  ui:{tab:'none',modal:null},render:()=>{renderCalls++},
  console:{warn:()=>{}},Date,Number,String,Map,Set,Object,Array,Math,Promise,
};
vm.createContext(context);
vm.runInContext(code,context);
const run=str=>vm.runInContext(str,context);
(async()=>{
  context.rune=rune;
  assert.equal(run('isAlternateRunePrinting(rune)'),true);
  assert.equal(run('runeArtworkUrl(rune)'),'', 'unverified alternate cannot fall back to normal art');
  const first=run('cardArt(rune)');
  assert.match(first,/Alt art/);assert.doesNotMatch(first,/old-images/);
  assert.equal(run('runeArtworkUrl({...rune,code:"VEN-R03",isAltArt:false})'),'https://old-images.example.com/mind-rune-normal.png','base card not affected');
  const [url,url2]=await Promise.all([run('verifyAlternateRuneArtwork(rune)'),run('verifyAlternateRuneArtwork(rune)')]);
  assert.equal(url,normalUrl);assert.equal(url2,normalUrl);
  assert.equal(fetchCalls.length,1,'same printing fetched once');
  assert(fetchCalls[0].endsWith('/cards/'+uuid));
  assert.match(run('cardArt(rune)'),/exact-ven-r03a-normal/);
  assert(!run('cardArt(rune)').includes('old-images'));
  assert.equal(run('runeArtworkUrl(rune,"large")'),largeUrl);
  assert(backing.get('test-verified-art').includes('VENR03A'));
  const other={...rune,code:'VEN-R03a',printingId:'bbbbbbbb-1111-2222-3333-444455556666'};
  context.other=other;
  response={...response,collector_number:'r03',id:other.printingId,printing_id:other.printingId};
  assert.equal(await run('verifyAlternateRuneArtwork(other)'),'', 'incorrect returned collector rejected');
  assert.match(run('cardArt(other)'),/not verified/);
  context.unknown={...rune,printingId:''};
  assert.equal(await run('verifyAlternateRuneArtwork(unknown)'),'', 'missing UUID cannot borrow art');
  assert.match(run('cardArt(unknown)'),/not verified/);
  assert(fetchCalls.length===2);
  assert.equal(renderCalls,0,'off-screen results need not rerender');
  console.log('PASS: exact VEN-R03a verification, normal-art refusal, finish-independent print ID, duplicate fetch, mismatch rejection, missing UUID');
})().catch(error=>{console.error(error);process.exitCode=1;});
