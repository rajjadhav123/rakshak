// Regression tests for utils/ids.js — run with:
//   node utils/__tests__/ids.test.js
// Plain Node, no test framework: this project has none, and adding
// one just for this felt like more than the ask. Exits 1 on any
// failure, 0 if everything passes, so it's usable as a CI step later
// without needing anything else.
const mongoose = require('mongoose');
const { getId, idsEqual } = require('../ids');

let failures = 0;
function check(label, condition) {
  const pass = !!condition;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}`);
  if (!pass) failures++;
}

const id1 = new mongoose.Types.ObjectId();
const id2 = new mongoose.Types.ObjectId();

check('two raw ObjectIds, same value -> equal', idsEqual(id1, new mongoose.Types.ObjectId(id1.toString())));
check('two raw ObjectIds, different value -> not equal', idsEqual(id1, id2) === false);
check('raw ObjectId vs its own hex string -> equal', idsEqual(id1, id1.toString()));
check('populated-like object {_id} vs matching raw ObjectId -> equal', idsEqual({ _id: id1, name: 'X' }, id1));
check('populated-like object {_id} vs non-matching raw ObjectId -> not equal', idsEqual({ _id: id1, name: 'X' }, id2) === false);
check('both sides populated-like, matching -> equal', idsEqual({ _id: id1 }, { _id: id1 }));
check('null vs anything -> not equal (never a false positive)', idsEqual(null, id1) === false);
check('undefined vs anything -> not equal', idsEqual(undefined, id1) === false);
check('null vs null -> not equal (two "nothing"s are never treated as the same someone)', idsEqual(null, null) === false);
check('empty object (no _id) treated as itself, not equal to a real id', idsEqual({}, id1) === false);
check('getId on a raw id returns itself', getId(id1) === id1);
check('getId on {_id} returns the _id', getId({ _id: id1 }) === id1);
check('getId on a plain string returns itself unchanged', getId('abc123') === 'abc123');

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
