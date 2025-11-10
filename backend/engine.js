import crypto from "crypto";

/**
 * XorShift32 PRNG
 * seed: 32-bit unsigned integer
 */
export class XorShift32 {
  constructor(seed) {
    this.x = seed >>> 0;
    if (this.x === 0) this.x = 0xdeadbeef;
  }
  next() {
    let x = this.x;
    x ^= (x << 13) >>> 0;
    x ^= (x >>> 17) >>> 0;
    x ^= (x << 5) >>> 0;
    this.x = x >>> 0;
    return this.x;
  }
  // returns float in [0,1)
  rand() {
    const v = this.next() >>> 0;
    // divide by 2^32
    return (v) / 4294967296;
  }
}

/**
 * Engine class per spec
 * combinedSeed: hex string (sha256)
 * dropColumn: integer 0..12
 */
export class Engine {
  constructor(combinedSeed, dropColumn = 6, rows = 12) {
    this.combinedSeed = String(combinedSeed);
    this.dropColumn = Number(dropColumn);
    this.rows = Number(rows);
    this.pegMap = [];
    this.pegMapHash = null;
    this.path = [];
    this.binIndex = null;
    this.prng = null;
  }

  // seed PRNG from combinedSeed: seed = first 4 bytes big-endian
  _seedFromCombined() {
    // combinedSeed may be hex string; if not, hash it
    let hex = this.combinedSeed;
    if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
      hex = crypto.createHash('sha256').update(String(this.combinedSeed),'utf8').digest('hex');
    }
    // take first 4 bytes (8 hex chars)
    const first8 = hex.slice(0,8);
    const seed = parseInt(first8, 16) >>> 0;
    return seed;
  }

  generate() {
    // init PRNG
    const seed = this._seedFromCombined();
    this.prng = new XorShift32(seed);

    // generate peg map
    this.pegMap = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < r + 1; c++) {
        const v = this.prng.rand();
        // leftBias = 0.5 + (rand()-0.5)*0.2
        const leftBias = 0.5 + (v - 0.5) * 0.2;
        const rounded = Math.round(leftBias * 1e6) / 1e6;
        row.push(rounded);
      }
      this.pegMap.push(row);
    }
    // compute pegMapHash
    const pegJson = JSON.stringify(this.pegMap);
    this.pegMapHash = crypto.createHash('sha256').update(pegJson,'utf8').digest('hex');

    // now run path decisions using the same prng stream
    let pos = 0;
    const adj = (this.dropColumn - Math.floor(this.rows/2)) * 0.01;
    for (let r = 0; r < this.rows; r++) {
      const pegIndex = Math.min(pos, r);
      let biasPrime = this.pegMap[r][pegIndex] + adj;
      if (biasPrime > 1) biasPrime = 1;
      if (biasPrime < 0) biasPrime = 0;
      const rnd = this.prng.rand();
      if (rnd < biasPrime) {
        this.path.push("L");
      } else {
        this.path.push("R");
        pos += 1;
      }
    }
    this.binIndex = pos;
    return {
      pegMap: this.pegMap,
      pegMapHash: this.pegMapHash,
      path: this.path,
      binIndex: this.binIndex
    };
  }
}
