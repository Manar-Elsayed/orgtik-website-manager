const { test }=require('node:test');
const assert=require('node:assert/strict');
const { cleanRules, matches, preview }=require('./segments');
test('segment rules combine canonical CRM fields and actual simulated delivery receipts', async()=>{
  const contacts=[{id:'a',name:'A',email:'a@test',source:'website',type:'person',status:'qualified',stageId:'qualified',tags:['Agency','Priority'],consent:{state:'granted'}},{id:'b',name:'B',source:'import',status:'new',stageId:'new',tags:['Agency']}];
  const rules=cleanRules({tags:['agency'],stageId:'qualified',qualifiedOnly:true,engagement:'delivered_mock'});
  assert.equal(matches(contacts[0],rules,new Set(['a'])),true);assert.equal(matches(contacts[1],rules,new Set(['a'])),false);
  assert.throws(()=>cleanRules({fakeOpens:true}),{code:'invalid_segment_rules'});
  const result=await preview({ctx:{crmDirectory:{current:async()=>({workspaceId:'fixture',contacts})}},db:{campaigns:[{projectId:1,crmDeliveries:[{mode:'local_mock',eligible:[{contactId:'a'}]}]}],audiences:[]},project:{id:1},rules});
  assert.equal(result.total,1);assert.equal(result.contacts[0].id,'a');assert.equal(result.simulatedEngagement,true);
  await assert.rejects(()=>preview({ctx:{},db:{},project:{id:1},rules:{}}),{code:'crm_connection_required'});
});
