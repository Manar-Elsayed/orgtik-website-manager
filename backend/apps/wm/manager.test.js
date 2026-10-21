const {test}=require('node:test');
const assert=require('node:assert/strict');
const {makeStore}=require('./content');
const {makeOps}=require('./ops');
const {config,sourceIds,savePageDraft,orderOf}=require('./manager');
const now=()=> '2026-10-11T09:00:00.000Z';
test('packaged manager configuration matches the editor schema',()=>{
 assert.deepEqual(config,require('../../../lib/manager-pages.json'));
});
test('manager runtime loads and saves drafts without the frontend checkout',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'wm-manager-runtime-'));
 try {
  const folder=path.join(root,'wm');
  fs.cpSync(__dirname,folder,{recursive:true,filter:file=>!file.includes(path.sep+'uploads')&&!file.endsWith('.test.js')});
  const {makeStore: packagedStore}=require(path.join(folder,'content.js'));
  const manager=require(path.join(folder,'manager.js')),store=packagedStore(now),source=store.entries.get('st_about');
  const result=manager.savePageDraft(store,'pg_about',[{id:source.id,version:source.workflow.version,patches:[{locale:'en',fields:{b3:{...source.live.locales.en.b3,s5:'Packaged purpose'}}}]}],{key:'admin'},now);
  assert.ok(result.data);assert.equal(store.entries.get(source.id).draft.locales.en.b3.s5,'Packaged purpose');
 } finally {
  const relative=path.relative(os.tmpdir(),root);assert.ok(relative.startsWith('wm-manager-runtime-')&&!relative.includes(path.sep));
  fs.rmSync(root,{recursive:true,force:true});
 }
});
test('page hero sources map to existing canonical fields',()=>{
 const store=makeStore(now);
 for(const [id,page] of Object.entries(config))for(const section of Object.values(page.fields??{}))for(const field of section.fields){
  const entry=store.entries.get(field.record);assert.ok(entry,`${id}: ${field.record}`);
  const [block,slot]=field.path.split('.');assert.ok(entry.live.locales.en[block]?.[slot]!==undefined || field.initial,`${field.record}:${field.path}`);
 }
 assert.ok(config.pg_software.editor.includes('demo'));assert.ok(config.pg_services.editor.includes('stories'));assert.ok(config.pg_about.editor.includes('capabilities'));
});
test('page editors expose rendered detail and state copy without reviving removed components',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const cases={pg_services:['stories','approach'],pg_software:['demo','section-1','section-2'],pg_work:['gallery','hero'],pg_about:['capabilities'],pg_insights:['article','hero']};
 for(const [id,sections]of Object.entries(cases))for(const section of sections)assert.ok(config[id].editor.includes(section),`${id}:${section}`);
 assert.equal(config.pg_insights.headerOnly,undefined,'actual search/filter/empty states remain editable');
 assert.deepEqual(config.pg_software.groups['section-1'],['section-1','planSteps'],'heading and steps remain in one website section');
 assert.ok(!config.pg_about.editor.includes('capabilityRoutes'),'unused capPanels source is not exposed as a visible catalogue');
 const website=path.resolve(__dirname,'../../../apps/website/landing-directions/src/reference');
 for(const [file,needle]of [['Services.jsx','(v.bento || []).map'],['Software.jsx','(v.steps || []).map'],['About.jsx','pg_about|capabilities|h2'],['Work.jsx','pg_work|gallery|h2'],['Insights.jsx','pg_insights|article|div-2']])assert.ok(fs.readFileSync(path.join(website,file),'utf8').includes(needle),`${file}: rendered canonical source`);
});
test('newly exposed page fields save existing canonical values as drafts only',()=>{
 for(const [id,section,value]of [['pg_about','capabilities',{'input@placeholder':'Find a capability'}],['pg_services','stories',[{title:'Clear first step',body:'Use {c} with context.',icon:'ph-flag'}]],['pg_software','planSteps',[{title:'Choose clearly',body:'Select the useful systems.'}]],['pg_work','gallery',{'image-slot@placeholder':'Project gallery image'}],['pg_insights','articles',{'input@placeholder':'Find an article'}]]){
  const store=makeStore(now),entry=store.entries.get(id),before=JSON.stringify(entry.live);
  const original=entry.live.locales.en[section];
  const fields={[section]:Array.isArray(value)?original.map((item,index)=>index===0?{...item,...value[0]}:item):{...original,...value}};
  const result=savePageDraft(store,id,[{id,version:entry.workflow.version,patches:[{locale:'en',fields}]}],{key:'admin'},now);
  assert.ok(result.data,`${id}:${section} accepts existing canonical field: ${JSON.stringify(result)}`);
  assert.deepEqual(store.entries.get(id).draft.locales.en[section],fields[section]);
  assert.equal(JSON.stringify(store.entries.get(id).live),before,'published copy stays unchanged');
 }
});
test('supplemental Contact and account fields retain existing page sections and canonical sources',()=>{
 const store=makeStore(now);
 assert.deepEqual(config.pg_contact.editor,['hero','rotation-words']);
 assert.deepEqual(config.pg_signIn.editor,['intro','signin']);
 assert.deepEqual(sourceIds('pg_signIn'),['st_signIn']);
 assert.deepEqual(new Set(sourceIds('pg_contact')),new Set(['st_shared','st_contact']));
 assert.deepEqual(config.pg_contact.supplemental.hero.fields.map(field=>field.path),['b1.s2','b1.s3','b1.s4']);
 assert.equal(config.pg_signIn.supplemental.signin.fields.length,11);
 for(const id of ['pg_contact','pg_signIn'])for(const section of Object.values(config[id].supplemental))for(const field of section.fields){
  const entry=store.entries.get(field.record),[block,slot]=field.path.split('.');
  assert.ok(entry?.live.locales.en[block]?.[slot]!==undefined,`${id}: ${field.record}.${field.path}`);
 }
});
test('supplemental Contact heading and account mode copy save atomically as drafts',()=>{
 for(const [id,sourceId,section,field,block,slot] of [['pg_contact','st_contact','hero','p','b1','s2'],['pg_signIn','st_signIn','signin','input@placeholder-2','b2','s3']]){
  const store=makeStore(now),page=store.entries.get(id),source=store.entries.get(sourceId);
  const before=JSON.stringify([...store.entries].map(([key,entry])=>[key,entry.live]));
  const commands=[{id,version:page.workflow.version,patches:[{locale:'en',fields:{[section]:{...page.live.locales.en[section],[field]:'Revised page field'}}}]},{id:sourceId,version:source.workflow.version,patches:[{locale:'en',fields:{[block]:{...source.live.locales.en[block],[slot]:'Revised website heading'}}}]}];
  const stale=savePageDraft(store,id,[commands[0],{...commands[1],version:source.workflow.version+1}],{key:'admin'},now);
  assert.equal(stale.status,412);assert.ok(!store.entries.get(id).draft);
  const result=savePageDraft(store,id,commands,{key:'admin'},now);
  assert.ok(result.data,`${id}: supplemental source accepted`);
  assert.equal(store.entries.get(id).draft.locales.en[section][field],'Revised page field');
  assert.equal(store.entries.get(sourceId).draft.locales.en[block][slot],'Revised website heading');
  assert.equal(JSON.stringify([...store.entries].map(([key,entry])=>[key,entry.live])),before);
 }
});
test('saving page and shared hero fields is atomic and draft-only',()=>{
 const store=makeStore(now),home=store.entries.get('pg_about'),source=store.entries.get('st_about'),before=JSON.stringify([...store.entries].map(([id,e])=>[id,e.live]));
 const result=savePageDraft(store,home.id,[{id:home.id,version:home.workflow.version,patches:[{locale:'en',fields:{hero:{...home.live.locales.en.hero,button1Href:'/contact'}}}]},{id:source.id,version:source.workflow.version,patches:[{locale:'en',fields:{b3:{...source.live.locales.en.b3,s5:'Our purpose'}}}]}],{key:'admin'},now);
 assert.ok(result.data);assert.equal(store.entries.get('st_about').draft.locales.en.b3.s5,'Our purpose');assert.equal(JSON.stringify([...store.entries].map(([id,e])=>[id,e.live])),before);
});
test('stale or unrelated source rejects the entire page save',()=>{
 for(const unrelated of [false,true]){const store=makeStore(now),home=store.entries.get('pg_about'),before=store.exportState();
 const result=savePageDraft(store,home.id,[{id:home.id,version:home.workflow.version,patches:[{locale:'en',fields:{hero:{button1Href:'/contact'}}}]},{id:unrelated?'pg_services':'st_about',version:0,patches:[{locale:'en',fields:{}}]}],{key:'admin'},now);
 assert.equal(result.status,unrelated?422:412);assert.deepEqual(store.exportState(),before);}
});
test('manager order survives persistence without changing published order or content',()=>{
 const store=makeStore(now),before=JSON.stringify([...store.entries].map(([id,e])=>[id,e.order,e.live]));
 const initial=orderOf(store,'service');store.managerOrders.service=[...initial.ids].reverse();assert.notEqual(orderOf(store,'service').version,initial.version);
 const restored=makeStore(now);restored.importState(store.exportState());assert.deepEqual(orderOf(restored,'service').ids,[...initial.ids].reverse());assert.equal(JSON.stringify([...store.entries].map(([id,e])=>[id,e.order,e.live])),before);
});
test('invalid persisted manager preferences are rejected before restoration',()=>{
 for(const preferences of [{managerOrders:{service:['sv_01','sv_01']}},{contentLocales:['en','xx']}]){
  const store=makeStore(now),before=store.exportState();
  assert.throws(()=>store.importState({...before,...preferences}));assert.deepEqual(store.exportState(),before);
 }
});
test('a new private language survives reload and can save translation drafts',()=>{
 const store=makeStore(now),ops=makeOps({store,now}),site=ops.site;
 const result=ops.updateSite({key:'admin'},{locales:[...site.locales,{code:'es',enabled:true,public:false}]},()=>true);
 assert.ok(result.site);assert.ok(store.LOCALES.includes('es'));
 const restored=makeStore(now);restored.importState(store.exportState());const nextOps=makeOps({store:restored,now});nextOps.importState(ops.exportState());assert.ok(restored.LOCALES.includes('es'));
 const source=restored.entries.get('st_about');assert.ok(!restored.save(source,{key:'admin'},{locale:'es',fields:source.live.locales.en},{can:()=>true}).errors);
});
