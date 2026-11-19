import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMessages} from '../src/merge.mjs';
const m=(id,text,timestamp=100,sender='Alex')=>({id,sender,text,timestamp});
test('later export merges overlap, preserves older history and sorts new records',()=>{const result=mergeMessages([m(0,'old',10),m(1,'hello',20)],[m(0,'hello',20),m(1,'new',30)]);assert.deepEqual(result.map(m=>m.text),['old','hello','new']);assert.deepEqual(result.map(m=>m.id),[0,1,2]);});
test('identical same-second messages keep maximum multiplicity rather than collapsing repeats',()=>{const old=[m(0,'hi'),m(1,'hi')];assert.equal(mergeMessages(old,[m(0,'hi'),m(1,'hi')]).length,2);assert.equal(mergeMessages(old,[m(0,'hi'),m(1,'hi'),m(2,'hi')]).length,3);});
test('upgrade omitted media to attachments without duplicating or downgrading it',()=>{const old=[m(0,'sticker omitted')],fresh=[m(0,'<attached: 001-STICKER.webp>')];assert.equal(mergeMessages(old,fresh)[0].text,fresh[0].text);assert.equal(mergeMessages(fresh,old)[0].text,fresh[0].text);assert.equal(mergeMessages(old,fresh).length,1);});
test('distinct same-second media and participants remain distinct',()=>{assert.equal(mergeMessages([m(0,'<attached: a.jpg>')],[m(0,'<attached: b.jpg>')]).length,2);assert.equal(mergeMessages([m(0,'hi')],[m(0,'hi',100,'Bea')]).length,2);});
test('importing the same later export repeatedly is idempotent',()=>{const first=[m(0,'old',1),m(1,'hello',2)];const next=[m(0,'hello',2),m(1,'new',3)];const merged=mergeMessages(first,next);assert.deepEqual(mergeMessages(merged,next),merged);});
