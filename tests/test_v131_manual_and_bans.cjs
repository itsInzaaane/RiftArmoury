'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),vm=require('node:vm'),path=require('path');
const base=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(base,'app.js'),'utf8');
const features=fs.readFileSync(path.join(base,'features-v121.js'),'utf8');
const feed=JSON.parse(fs.readFileSync(path.join(base,'official-updates.json'),'utf8'));
function part(source,start,end){const i=source.indexOf(start),j=source.indexOf(end,i);assert(i>=0&&j>i,`${start} found`);return source.slice(i,j)}
const ctx={console,Date,URL,Set,Map,Number,String,Array,JSON,RegExp,Math,
  localStorage:{getItem(){return null},setItem(){}},
  catalog:[{set:'OGN',setName:'Origins'}],
  normalizeName:x=>String(x).toLowerCase().replace(/[’‘]/g,"'").trim(),
  escapeHtml:x=>String(x),NAV:[],state:{decks:[]},ui:{tab:'banned',banFormat:'standard'},
  fetch:()=>{},document:{getElementById:()=>null}};
vm.createContext(ctx);
vm.runInContext(part(app,'const MANUAL_SET_STORAGE_KEY','let scanner ='),ctx);
assert.equal(vm.runInContext("manualCollectorCode('103','OGN')",ctx),'OGN-103');
assert.equal(vm.runInContext("manualCollectorCode('42a','OGN')",ctx),'OGN-042A');
assert.equal(vm.runInContext("manualCollectorCode('R03a','VEN')",ctx),'VEN-R03A');
assert.equal(vm.runInContext("manualCollectorCode('301*','OGN')",ctx),'OGN-301*');
assert.equal(vm.runInContext("manualCollectorCode('','VEN')",ctx),'');
assert.equal(vm.runInContext("manualCollectorCode('notacode','VEN')",ctx),'');
vm.runInContext(part(app,'const BAN_LIST_VERIFIED','ui.banFormat=\'standard\''),ctx);
assert.equal(vm.runInContext('BAN_DATA.filter(x=>(x.formats||["standard","2v2"]).includes("standard")).length',ctx),22);
assert.equal(vm.runInContext('BAN_DATA.filter(x=>(x.formats||["standard","2v2"]).includes("2v2")).length',ctx),22);
assert.equal(vm.runInContext("!!banStatus('Fight or Flight','standard')",ctx),true);
assert.equal(vm.runInContext("!!banStatus('Fight or Flight','2v2')",ctx),false);
assert.equal(vm.runInContext("!!banStatus('Master Yi, Wuju Bladesman','2v2')",ctx),true);
assert.equal(vm.runInContext("!!banStatus('Master Yi, Wuju Bladesman','standard')",ctx),false);
const featureSlice=part(features,'function officialDate','async function refreshOfficialUpdates');
vm.runInContext("const RIFT_HUB='https://playriftbound.com/en-us/rules-hub/';let officialCache=null;let officialState={};"+featureSlice,ctx);
assert.equal(vm.runInContext(`officialFeedValid(${JSON.stringify(feed)})`,ctx),true);
vm.runInContext(`applyOfficialFeed(${JSON.stringify(feed)})`,ctx);
assert.equal(vm.runInContext('BAN_DATA.filter(x=>x.formats.includes("standard")).length',ctx),22);
assert.equal(vm.runInContext('BAN_DATA.filter(x=>x.formats.includes("2v2")).length',ctx),22);
assert.equal(vm.runInContext("!!banStatus('Fight or Flight','2v2')",ctx),false);
console.log('v1.31 manual-number, exact-format ban and feed tests PASSED');
