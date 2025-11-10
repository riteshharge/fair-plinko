/**
 * Test vector from the assignment PDF
 */
import crypto from "crypto";
import assert from "assert";
import { Engine } from "../engine.js";

function sha256hex(s){ return crypto.createHash('sha256').update(String(s),'utf8').digest('hex'); }

const serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc";
const nonce = "42";
const clientSeed = "candidate-hello";

const expectedCommit = "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34";
const expectedCombined = "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0";

const commit = sha256hex(`${serverSeed}:${nonce}`);
const combined = sha256hex(`${serverSeed}:${clientSeed}:${nonce}`);
console.log("commit:",commit);
console.log("combined:",combined);
assert.strictEqual(commit, expectedCommit, "commit mismatch");
assert.strictEqual(combined, expectedCombined, "combined mismatch");

// seed PRNG as spec: first 4 bytes big-endian
const e = new Engine(combined, 6, 12);
e.generate();

// check binIndex is 6
assert.strictEqual(e.binIndex, 6, "binIndex mismatch for center drop");

// optional: check first 5 rand() sequence by reseeding PRNG manually
function seedFromCombined(hex){
  const first8 = hex.slice(0,8);
  return parseInt(first8,16) >>> 0;
}
const seed = seedFromCombined(combined);
import { XorShift32 } from "../engine.js";
const prng = new XorShift32(seed);
const rands = [];
for(let i=0;i<5;i++) rands.push(prng.rand());
console.log("first5:", rands.map(x=>x.toFixed(10)).join(", "));
const expectedFirst5 = [0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297];
for(let i=0;i<5;i++){
  const a = Number(rands[i].toFixed(10));
  const b = Number(expectedFirst5[i].toFixed(10));
  assert(Math.abs(a-b) < 1e-9, `rand[${i}] mismatch: got ${a}, expected ${b}`);
}
console.log("✓ Test vector passed.");
