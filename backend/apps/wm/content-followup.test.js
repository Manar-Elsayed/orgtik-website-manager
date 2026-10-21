const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makeStore}=require('./content');
const {DEPARTMENTS,blankContent}=require('./defaults');
const who={key:'editor'}, approver={key:'approver'}, all={can:()=>true};
const make=()=>makeStore(()=> '2026-10-05T10:00:00.000Z');

test('new legal documents start private, copy wording without approval history, and validate their addresses',()=>{
 const s=make(),template=s.entries.get('lg_privacy'),before=structuredClone(template);
 const e=s.create('legalDocument',who,{name:'Cookie policy',slug:'cookie-policy'}).entry;
 assert.equal(e.type,'legalDocument');assert.equal(e.live,null);assert.equal(e.workflow.state,'draft');assert.equal(e.workflow.visibility,'not_on_site');
 assert.deepEqual(e.legalVersions,[]);assert.equal(e.draft.versionLabel,'1.0');assert.equal(e.draft.effectiveFrom,null);assert.deepEqual(e.draft.locales.en,{name:'Cookie policy',summary:'',sections:[]});
 const copy=s.create('legalDocument',who,{name:'Privacy copy',slug:'privacy-copy',from:template.id}).entry;
 assert.deepEqual(copy.draft.locales.en.sections,template.live.locales.en.sections);assert.equal(copy.draft.versionLabel,'1.0');assert.equal(copy.draft.effectiveFrom,null);assert.deepEqual(copy.legalVersions,[]);assert.deepEqual(template,before);
 for(const slug of ['privacy','cookie-policy','partners','sitemap','index'])assert.equal(s.create('legalDocument',who,{name:'Duplicate',slug}).errors['slug.en'],'slug_taken');
 assert.equal(s.create('legalDocument',who,{name:'Missing address',slug:''}).errors['slug.en'],'required');
 assert.equal(s.create('legalDocument',who,{name:'Bad address',slug:'not/a/slug'}).errors['slug.en'],'slug_format');
 const restored=make();restored.importState(s.exportState());assert.deepEqual(restored.detail(restored.entries.get(e.id)),s.detail(e));
 assert.ok(s.remove(e,who).ok);assert.equal(s.entries.has(e.id),false);
});

test('new legal documents require separate legal approval and retain immutable published versions',()=>{
 const s=make(),e=s.create('legalDocument',who,{name:'Additional terms',slug:'additional-terms'}).entry;
 const fields={summary:'Local flow fixture',sections:[{heading:'Scope',body:'Test wording'}]};
 assert.ok(s.save(e,who,{locale:'en',fields},all).entry);assert.ok(s.transition(e,who,'submit',all).entry);
 assert.equal(s.transition(e,approver,'approve',{can:p=>p!=='legal:approve'}).required,'legal:approve');
 assert.equal(s.transition(e,{...who,roles:['wm_admin']},'approve',all).code,'four_eyes');
 assert.ok(s.transition(e,approver,'approve',all).entry);
 assert.equal(s.transition(e,approver,'publish',all).fieldErrors.effectiveFrom,'required');assert.equal(e.live,null);
 assert.ok(s.save(e,who,{neutral:{effectiveFrom:'2026-10-05'}},all).entry);
 for(const action of ['submit','approve','publish'])assert.ok(s.transition(e,action==='submit'?who:approver,action,all).entry);
 assert.equal(e.workflow.visibility,'live');assert.equal(e.legalVersions.length,1);const published=structuredClone(e.legalVersions[0]);
 assert.equal(s.remove(e,who).code,'published_before');
 assert.ok(s.save(e,who,{locale:'en',fields:{summary:'Revised wording'}},all).entry);assert.deepEqual(e.legalVersions[0],published);assert.equal(e.live.locales.en.summary,'Local flow fixture');
 for(const action of ['submit','approve'])assert.ok(s.transition(e,action==='submit'?who:approver,action,all).entry);
 assert.equal(s.transition(e,approver,'publish',all).fieldErrors.versionLabel,'version_exists');
 assert.ok(s.save(e,who,{neutral:{versionLabel:'1.1'}},all).entry);
 for(const action of ['submit','approve','publish'])assert.ok(s.transition(e,action==='submit'?who:approver,action,all).entry);
 assert.equal(e.legalVersions.length,2);assert.deepEqual(e.legalVersions[1],published);assert.equal(e.live.locales.en.summary,'Revised wording');
});

test('review category changes persist as drafts and publish through the existing workflow',()=>{
 const s=make(),e=s.entries.get('rv_01'),live=structuredClone(e.live);
 assert.ok(s.save(e,who,{neutral:{category:'software'}},all).entry);
 assert.equal(e.draft.category,'software');assert.deepEqual(e.live,live);
 const restored=make();restored.importState(s.exportState());assert.equal(restored.entries.get(e.id).draft.category,'software');
 assert.ok(s.transition(e,who,'submit',all).entry);
 assert.ok(s.transition(e,approver,'approve',all).entry);
 assert.ok(s.transition(e,approver,'publish',all).entry);
 assert.equal(e.live.category,'software');assert.equal(e.draft,null);
 const version=e.workflow.version;
 assert.equal(s.save(e,who,{neutral:{category:'other'}},all).errors.category,'invalid');
 assert.equal(e.workflow.version,version);assert.equal(e.live.category,'software');
 assert.equal(s.create('review',who,{name:'Category fixture'}).entry.draft.category,'services');
});
test('review page selections preserve legacy links, persist and publish multiple targets, and clear completely',()=>{
 const s=make(),e=s.entries.get('rv_01'),live=structuredClone(e.live);
 const ids=['serviceFamily','service','softwareModule'].map(type=>[...s.entries.values()].find(row=>row.type===type).id);
 assert.ok(s.save(e,who,{neutral:{relatedEntry:ids[0]}},all).entry);
 assert.deepEqual(e.draft.relatedEntries,[ids[0]]);
 assert.ok(s.save(e,who,{neutral:{relatedEntries:ids}},all).entry);
 assert.deepEqual(e.draft.relatedEntries,ids);assert.equal(e.draft.relatedEntry,ids[0]);assert.deepEqual(e.live,live);
 const restored=make();restored.importState(s.exportState());assert.deepEqual(restored.entries.get(e.id).draft.relatedEntries,ids);
 for(const action of ['submit','approve','publish']) assert.ok(s.transition(e,action==='submit'?who:approver,action,all).entry);
 assert.deepEqual(e.live.relatedEntries,ids);assert.equal(e.draft,null);
 assert.ok(s.save(e,who,{neutral:{relatedEntries:[]}},all).entry);
 assert.deepEqual(e.draft.relatedEntries,[]);assert.equal(e.draft.relatedEntry,'');assert.deepEqual(e.live.relatedEntries,ids);
 assert.deepEqual(s.create('review',who,{name:'Pages fixture'}).entry.draft.relatedEntries,[]);
});

test('review page selections reject invalid, duplicate and non-catalog targets without altering the entry',()=>{
 const s=make(),e=s.entries.get('rv_01'),before=structuredClone(e);
 for(const value of ['sm_01',null,['unknown'],['sm_01','sm_01'],['pg_home'],[7]]){
  assert.equal(s.save(e,who,{neutral:{relatedEntries:value}},all).errors.relatedEntries,'invalid');
  assert.deepEqual(e,before);
 }
});

test('translations preserve approved figures and the enabled narrative',()=>{
 const s=make(),e=s.entries.get('cs_01');s.approveFigures(e,approver);
 s.save(e,approver,{neutral:{narrativePublished:true}},all);
 const fields=structuredClone(e.draft.locales.en);fields.highlight.label='Übersetztes Ergebnis';
 assert.ok(s.save(e,who,{locale:'de',fields},all).entry);
 assert.equal(e.draft.provenance.figures,'approved');assert.equal(e.draft.narrativePublished,true);
 fields.highlight.label='Bearbeitet';assert.ok(s.save(e,who,{locale:'de',fields},all).entry);
 assert.equal(e.draft.provenance.figures,'approved');assert.equal(e.draft.narrativePublished,true);
});
test('blank dates follow the supplied mock clock',()=>{
 const s=makeStore(()=> '2031-02-03T10:00:00.000Z');
 assert.equal(s.create('article',who,{name:'Dated article',slug:'dated-article'}).entry.draft.publishedOn,'2031-02-03');
 assert.equal(s.create('roadmapItem',who,{name:'Dated roadmap'}).entry.draft.year,'2031');
});
test('merged ideas retain their comment counts and sample threads',()=>{
 const s=make();const source=[...s.ideas.values()].find(x=>['pending','open'].includes(x.status));
 const target=[...s.ideas.values()].find(x=>x.id!==source.id&&s.VISIBLE.includes(x.status));
 source.comments=2;source.commentPreview=[{id:'merge-comment',author:'Sample',body:'Discussion'}];
 const count=target.comments;assert.ok(s.moderate(source,approver,'merge',{into:target.id}).idea);
 assert.equal(target.comments,count+2);assert.ok(target.commentPreview.some(x=>x.id==='merge-comment'));
});
test('publication and scheduling require a lead image for articles and cases',()=>{
 const s=make();for(const type of ['article','caseStudy']){
 const e=s.create(type,who,{name:'No image',slug:`no-image-${type.toLowerCase()}`,department:'design'}).entry;
 e.workflow.state='approved';assert.equal(s.transition(e,approver,'publish',all).fieldErrors['image.src'],'required');
 assert.equal(s.transition(e,approver,'schedule',{...all,publishAt:'2026-10-06T10:00:00Z'}).fieldErrors['image.src'],'required');
 }
});
for(const department of DEPARTMENTS)test(`blank ${department} case can be created without a template`,()=>{
 const store=make();for(const [id,e] of store.entries)if(e.type==='caseStudy')store.entries.delete(id);
 const {entry,errors}=store.create('caseStudy',who,{name:'Blank case',slug:`blank-${department}`,department});
 assert.equal(errors,undefined);assert.equal(entry.department,department);assert.equal(entry.format,store.entries.get('gl_caseFormats').live.locales.en.formats[department]);
 assert.deepEqual(entry.draft.locales.en, {...blankContent('caseStudy',department).locales.en,name:'Blank case'});
 assert.equal(entry.draft.narrativePublished,false);assert.equal(entry.live,null);
});
test('blank articles and roadmap items need no template; case department is required',()=>{
 const s=make();for(const [id,e] of s.entries)if(['article','roadmapItem','caseStudy'].includes(e.type))s.entries.delete(id);
 assert.ok(s.create('article',who,{name:'Article',slug:'blank-article'}).entry);
 assert.ok(s.create('roadmapItem',who,{name:'Milestone'}).entry);
 assert.equal(s.create('caseStudy',who,{name:'Case',slug:'case'}).errors.department,'required');
});
test('explicit copy retains department and resets narrative and approval',()=>{
 const s=make(), template=s.entries.get('cs_01');template.live.provenance.figures='approved';template.live.narrativePublished=true;
 const e=s.create('caseStudy',who,{name:'Copy',slug:'copy',from:'cs_01',department:'hosting'}).entry;
 assert.equal(e.department,template.department);assert.equal(e.draft.provenance.figures,'sample');assert.equal(e.draft.narrativePublished,false);
});
test('narrative edits require an approver and approved figures',()=>{
 const s=make(),e=s.entries.get('cs_01');
 assert.equal(s.save(e,who,{neutral:{narrativePublished:true}},{can:()=>false}).required,'content:approve');
 assert.equal(s.save(e,approver,{neutral:{narrativePublished:true}},all).errors.narrativePublished,'narrative_needs_approved_figures');
 s.approveFigures(e,approver);assert.ok(s.save(e,approver,{neutral:{narrativePublished:true}},all).entry);
});
test('changing approved figures revokes approval before validation and preserves live content',()=>{
 const s=make(),e=s.entries.get('cs_01');e.live.provenance.figures='approved';e.live.narrativePublished=true;e.live.sampleNarrativePublished=false;
 const live=JSON.stringify(e.live);
 assert.ok(s.save(e,who,{locale:'en',fields:{highlight:{value:'12',label:'Edited'}}},all).entry);
 assert.equal(e.draft.provenance.figures,'sample');assert.equal(e.draft.narrativePublished,false);assert.equal(JSON.stringify(e.live),live);
 assert.equal(e.draft.provenance.approvedBy,undefined);
});
test('invalid restored, published and scheduled sample narratives are rejected',()=>{
 const s=make(),e=s.entries.get('cs_01');const bad=structuredClone(e.live);bad.narrativePublished=true;
 e.versions.push({version:42,content:bad});assert.equal(s.restore(e,approver,42,all).fieldErrors.narrativePublished,'narrative_needs_approved_figures');
 e.draft=bad;e.workflow.state='approved';assert.equal(s.transition(e,approver,'publish',all).status,422);
 assert.equal(s.transition(e,approver,'schedule',{...all,publishAt:'2026-10-06T10:00:00Z'}).status,422);
 e.workflow.state='scheduled';e.workflow.publishAt='2026-10-05T09:00:00Z';const live=JSON.stringify(e.live);s.tick();assert.equal(JSON.stringify(e.live),live);assert.equal(e.workflow.state,'approved');assert.equal(e.workflow.publishAt,null);assert.equal(s.audit[0].action,'schedule_failed');
});
test('restore cannot change narrative permission through history',()=>{
 const s=make(),e=s.entries.get('cs_01');const approved=structuredClone(e.live);approved.provenance.figures='approved';approved.narrativePublished=true;e.versions.push({version:42,content:approved});
 assert.equal(s.restore(e,who,42,{can:()=>false}).required,'content:approve');
});
test('test-card placeholders cannot be removed or replaced by editable figures',()=>{
 const s=make(),e=s.entries.get('gl_commerce');const fields=structuredClone(e.live.locales.en);const key='paymentDetails-intro';
 assert.ok(fields[key].p.includes('{0}'));fields[key].p=fields[key].p.replace('{0}','9999');
 assert.equal(s.save(e,who,{locale:'en',fields},all).errors['locales.en.paymentDetails-intro.p'],'marks_changed');
});

test('imported sample stories retain sample provenance and need separate approval permission',()=>{
 const s=make(),e=s.entries.get('cs_01');assert.equal(e.live.sampleNarrativePublished,true);assert.equal(e.live.narrativePublished,false);assert.equal(e.live.provenance.figures,'sample');
 assert.equal(s.save(e,who,{neutral:{sampleNarrativePublished:false}},{can:()=>false}).required,'content:approve');
 assert.ok(s.save(e,approver,{neutral:{sampleNarrativePublished:false}},all).entry);
 assert.ok(s.save(e,approver,{neutral:{sampleNarrativePublished:true}},all).entry);
 assert.equal(s.save(e,approver,{neutral:{narrativePublished:true}},all).errors.narrativePublished,'narrative_needs_approved_figures');
 const copied=s.create('caseStudy',who,{name:'Sample copy',slug:'sample-copy',from:e.id}).entry;assert.equal(copied.draft.sampleNarrativePublished,false);
});

test('figure approval disables the sample story until an approved narrative is enabled',()=>{
 const s=make(),e=s.entries.get('cs_01');s.approveFigures(e,approver);assert.equal(e.draft.sampleNarrativePublished,false);assert.equal(e.live.sampleNarrativePublished,true);
 assert.equal(s.save(e,approver,{neutral:{sampleNarrativePublished:true}},all).errors.sampleNarrativePublished,'sample_narrative_needs_sample_figures');
 assert.ok(s.save(e,approver,{neutral:{narrativePublished:true}},all).entry);
});

test('sample-story restore, publish and schedule enforce permission and provenance',()=>{
 const s=make(),e=s.entries.get('cs_01');const bad=structuredClone(e.live);bad.provenance.figures='approved';e.versions.push({version:42,content:bad});
 assert.equal(s.restore(e,approver,42,all).fieldErrors.sampleNarrativePublished,'sample_narrative_needs_sample_figures');
 e.draft=bad;e.workflow.state='approved';assert.equal(s.transition(e,approver,'publish',all).status,422);assert.equal(s.transition(e,approver,'schedule',{...all,publishAt:'2026-10-07T10:00:00Z'}).status,422);
 e.workflow.state='scheduled';e.workflow.publishAt='2026-10-05T09:00:00Z';const live=JSON.stringify(e.live);s.tick();assert.equal(JSON.stringify(e.live),live);
 e.draft=structuredClone(e.live);e.draft.sampleNarrativePublished=false;const restored=structuredClone(e.live);e.versions.push({version:43,content:restored});assert.equal(s.restore(e,who,43,{can:()=>false}).required,'content:approve');
});
