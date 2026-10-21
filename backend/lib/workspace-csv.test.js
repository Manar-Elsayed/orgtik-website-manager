const { test }=require('node:test');
const assert=require('node:assert/strict');
const { csvCell, csv }=require('./csv');
test('spreadsheet exports quote Unicode, delimiters and formula-like text while retaining numbers',()=>{
  for(const value of ['=SUM(1,2)',' +1','\t@CMD','\uFEFF-2'])assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell(-2),'"-2"');assert.equal(csvCell('Mona, "منى"'),'"Mona, ""منى"""');
  assert.equal(csv([['name','amount'],['منى',-2]]),'"name","amount"\r\n"منى","-2"\r\n');
});
