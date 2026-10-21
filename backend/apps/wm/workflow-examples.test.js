const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makeStore} = require('./content');
const {makeLibrary} = require('./library');
const {publicIdea, moderateComment} = require('./ideas');
const {mediaExamples} = require('./seed/workflow-examples');
const now = () => '2026-10-15T08:00:00.000Z';
const clone = value => JSON.parse(JSON.stringify(value));
function demo() { const store=makeStore(now,{demo:true});store.ensureDemo();return store; }

test('workflow examples cover categories, multiple tags and real moderation states without exposing private comments',()=>{
  const store=demo(),categories=new Set([...store.ideas.values()].map(row=>row.category));
  for(const category of ['new_project','product_idea','service_improvement','hosting_support'])assert.ok(categories.has(category));
  assert.deepEqual(store.ideas.get('sample-dark-mode').tags,['SaaS products','Workspace','Accessibility']);
  const idea=store.ideas.get('workspace-guide');
  assert.deepEqual(idea.discussion.map(row=>row.status),['approved','pending','hidden']);
  const projection=publicIdea(idea);
  assert.equal(projection.discussion.length,1);assert.equal(projection.comments,idea.comments+1);
  assert.ok(!JSON.stringify(projection).includes('@wm-demo.example.test'));
  assert.ok(!JSON.stringify(projection).includes('Contains a private support reference'));
  assert.ok(!projection.discussion.some(row=>row.id.includes('pending')||row.id.includes('hidden')));
  for(const id of ['idea_demo_declined','idea_demo_hidden','idea_demo_merged']){const closed=store.ideas.get(id);assert.equal(closed.comments,0);assert.equal(closed.discussion,undefined);assert.equal(closed.commentPreview,undefined);}
  const pending=idea.discussion.find(row=>row.status==='pending');
  assert.ok(moderateComment(idea,pending.id,pending.version,'approve',undefined,'admin',now()).comment);
  assert.equal(publicIdea(idea).discussion.length,2);
  const saved=store.exportState();store.importState(saved);store.ensureDemo();assert.deepEqual(store.exportState(),saved);
});

test('all three display choices have separate private synthetic case studies and never alter the five website projects',()=>{
  const base=makeStore(now),store=demo();
  for(const id of ['cs_01','cs_02','cs_03','cs_04','cs_05'])assert.deepEqual(store.entries.get(id).live,base.entries.get(id).live);
  for(const mode of ['card','sample','approved']){
    const row=store.entries.get('cs_demo_display_'+mode),content=row.draft;
    assert.equal(row.live,null);assert.equal(row.workflow.visibility,'not_on_site');assert.equal(row.workflow.state,'draft');
    assert.equal(content.narrativePublished,mode==='approved');assert.equal(content.sampleNarrativePublished,mode==='sample');
    assert.equal(content.provenance.figures,mode==='approved'?'approved':'sample');
    assert.equal(content.seo.en.robots,'noindex');assert.equal(content.seo.en.inSitemap,false);
    assert.deepEqual(row.versions[0].content,content);assert.equal(Object.keys(content.locales).length,5);
    assert.deepEqual(content.locales.en.results.metrics,[]);assert.match(content.locales.en.summary,/fictional|no client results/);
    const result=store.save(row,{key:'admin'},{locale:'en',fields:{summary:content.locales.en.summary}},{can:()=>true});assert.ok(result.entry,JSON.stringify(result));
  }
});

test('blank draft summaries omit invalid thumbnails without changing retained drafts, images or deletions',()=>{
  const store=demo();
  for(const mode of ['card','sample','approved']){
    const row=store.entries.get('cs_demo_display_'+mode),before=clone(row);
    assert.equal(store.summary(row).image,undefined);
    assert.deepEqual(row,before,'projection cannot rewrite the retained mock example');
    assert.deepEqual(store.detail(row).content.image,{src:'',alt:{}},'the editable blank image field remains available');
  }
  const article=store.create('article',{key:'admin'},{name:'A new draft',slug:'a-new-draft'}).entry;
  assert.ok(article);assert.equal(store.summary(article).image,undefined);
  article.draft.image.src='  ';const empty=clone(article);assert.equal(store.summary(article).image,undefined);assert.deepEqual(article,empty);
  const edited=store.entries.get('cs_demo_display_card');
  const saved=store.save(edited,{key:'admin'},{locale:'en',image:{src:'brand-tablet.webp',alt:{en:'My retained image'}}},{can:()=>true});assert.ok(saved.entry,JSON.stringify(saved));
  const retained=clone(edited);assert.deepEqual(store.summary(edited).image,edited.draft.image);assert.deepEqual(edited,retained);
  assert.deepEqual(store.summary(store.entries.get('cs_01')).image,store.entries.get('cs_01').draft?.image??store.entries.get('cs_01').live.image);
  store.remove(store.entries.get('cs_demo_display_sample'),{key:'admin'});
  const snapshot=store.exportState(),restored=demo();restored.importState(snapshot);
  assert.deepEqual(restored.exportState(),snapshot);assert.ok(!restored.entries.has('cs_demo_display_sample'));assert.deepEqual(restored.entries.get(edited.id),retained);
});

test('migration upgrades only untouched mock ideas and preserves edited, real, deleted and already-moderated data',()=>{
  const store=makeStore(now,{demo:true});
  require('./seed/demo-states').contentExamples({entries:store.entries,audit:store.audit,ideas:store.ideas,now});
  const edited=store.ideas.get('sample-dark-mode');Object.assign(edited,{version:2,title:'My edited sample',category:null,tags:['Keep my tags']});
  const real={...clone(edited),id:'real-visitor',sample:false,version:1};store.ideas.set(real.id,real);
  const pending=store.ideas.get('workspace-guide');pending.discussion=[];
  const beforeEdited=clone(edited),beforeReal=clone(real),legacy=store.exportState();legacy.demoVersion=4;
  const restored=makeStore(now,{demo:true});restored.importState(legacy);
  assert.deepEqual(restored.ideas.get(edited.id),beforeEdited);assert.deepEqual(restored.ideas.get(real.id),beforeReal);
  assert.deepEqual(restored.ideas.get(pending.id).discussion,[]);
  assert.equal(restored.ideas.get('continuity-view').category,'hosting_support');
  assert.ok(restored.entries.has('cs_demo_display_card'));
  const saved=restored.exportState();saved.entries=saved.entries.filter(([id])=>id!=='cs_demo_display_card');
  restored.importState(saved);assert.ok(!restored.entries.has('cs_demo_display_card'));
  const noDemo=makeStore(now);noDemo.importState(legacy);assert.ok(!noDemo.entries.has('cs_demo_display_card'));
});

test('media examples separate description and translations, preserve bytes/references, and never replace edited rights or metadata',()=>{
  const store=makeStore(now),lib=makeLibrary({seed:store.seed,store,now,demo:false}),original=clone(lib.media.get('md_01'));
  mediaExamples(lib.media);const card=lib.media.get('md_01');
  assert.equal(Object.keys(card.alt).length,5);assert.equal(Object.keys(card.caption).length,5);assert.notEqual(card.caption.en,card.alt.en);
  assert.deepEqual(card.tags,['Brand identity','Print','Sample project']);
  for(const field of ['id','file','bytes','width','height','focal','templateUses'])assert.deepEqual(card[field],original[field]);
  const stable=clone(card);mediaExamples(lib.media);assert.deepEqual(card,stable);
  const edited=new Map([['md_01',{...clone(original),version:2,caption:{en:'Saved description'}}]]);const before=clone([...edited]);mediaExamples(edited);assert.deepEqual([...edited],before);
  const rights=new Map([['md_01',{...clone(original),rights:{...original.rights,status:'licensed',holder:'Keep holder'}}]]);const beforeRights=clone([...rights]);mediaExamples(rights);assert.deepEqual([...rights],beforeRights);
  const legacy=lib.exportState();legacy.data.demoVersion=1;legacy.data.media=[['md_01',original]];
  const migrated=makeLibrary({seed:store.seed,store,now,demo:true});migrated.importState(legacy);assert.equal(Object.keys(migrated.media.get('md_01').caption).length,5);
  const saved=migrated.exportState();migrated.importState(saved);assert.deepEqual(migrated.exportState(),saved);
});
