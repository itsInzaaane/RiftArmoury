'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const first=src.indexOf('// v1.31: Artwork choices for a Rune'),last=src.indexOf('// Artwork verification screen:',first);
assert(first>0&&last>first);
const target={id:'ven-alt',code:'VEN-R03a',name:'Mind Rune',type:'Rune',set:'VEN',setName:'Vendetta',isAltArt:true,printingId:'uuid-1'};
const otherAlt={id:'ogn-alt',code:'OGN-089a',name:'Mind Rune',type:'Rune',set:'OGN',setName:'Origins',isAltArt:true,printingId:'uuid-2'};
const regular={id:'ven-normal',code:'VEN-R03',name:'Mind Rune',type:'Rune',set:'VEN',setName:'Vendetta',isAltArt:false,imageUrl:'https://example.com/regular.jpg'};
const unrelated={id:'calm-alt',code:'VEN-R02a',name:'Calm Rune',type:'Rune',set:'VEN',setName:'Vendetta',isAltArt:true,imageUrl:'https://example.com/wrong.jpg'};
const verified=new Map([['VEN-R03a','https://example.com/exact.jpg'],['OGN-089a','https://example.com/ogn.jpg']]);
const context={
 allPrintings:new Map([[target.id,target],[otherAlt.id,otherAlt],[regular.id,regular],[unrelated.id,unrelated]]),
 state:{printings:{'copy':{...regular,id:'duplicate'}}},ui:{artCandidate:null},
 normalizeName:(s)=>String(s||'').toLowerCase().trim(),normalizedCode:(s)=>String(s||'').toUpperCase().replace(/[^A-Z0-9*]/g,''),
 isBasicRuneName:(name)=>/ Rune$/.test(name||''),isAlternateRunePrinting:(p)=>!!p.isAltArt,
 manualArtFor:()=>null,getVerifiedRuneArt:(p)=>verified.has(p.code)?{large:verified.get(p.code),normal:verified.get(p.code)}:null,
 runeArtworkUrl:(p)=>p.imageUrl||'',escapeHtml:(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'),
};
vm.createContext(context);vm.runInContext(src.slice(first,last),context);
context.target=target;
const run=(expression)=>vm.runInContext(expression,context);
assert.equal(run('linkedRuneArtworkChoices(target).length'),3,'exact Rune + 2 distinct linked printings');
assert.equal(run('linkedRuneArtworkChoices(target)[0].code'),'VEN-R03a','exact printing recommended first');
const markup=run('renderRuneArtworkChoices(target)');
assert.match(markup,/Recommended artwork/);assert.match(markup,/VEN-R03a/);assert.match(markup,/OGN-089a/);assert.match(markup,/VEN-R03/);
assert.doesNotMatch(markup,/VEN-R02a/,'Unrelated Calm Rune must not be suggested');
assert.match(markup,/https:\/\/example.com\/exact.jpg/);
assert.match(markup,/Other Mind Rune artwork/);
assert.match(markup,/rv-rune-art-option-photo[\s\S]*<img/, 'alternate artwork options must show card pictures');
context.ui.artCandidate={kind:'linked',src:'https://example.com/ogn.jpg',linkedCode:'OGN-089a'};
const compared=run('renderRuneArtworkChoices(target)');
assert.match(compared,/Compare artwork side by side/);
assert.match(compared,/Selected alternative/);
assert.match(compared,/VEN-R03a · exact printing/);
assert.match(compared,/OGN-089a/);
context.ui.artCandidate=null;
verified.delete('VEN-R03a');
const unknown=run('renderRuneArtworkChoices(target)');
assert.match(unknown,/Exact printing artwork not verified yet/);
assert.doesNotMatch(unknown,/https:\/\/example.com\/regular.jpg[\s\S]*Recommended/,'regular art must never be recommended as unverified alternate');
assert.equal(run('renderRuneArtworkChoices({...target,type:"Champion",name:"Jinx"})'),'','non-runes should not show Rune variant browser');
console.log('PASS: recommended exact VEN-R03a, linked Mind Rune printings, no Calm Rune, no normal fallback, no duplicate images');
