import { deterministicEngine, sha256 } from "../src/utils/engine.js";

test("PRNG reproducibility", () => {
  const result = deterministicEngine({
    rows: 12,
    serverSeed:
      "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc",
    clientSeed: "candidate-hello",
    nonce: "42",
    dropColumn: 6,
  });

  expect(result.commitHex).toBe(
    "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34"
  );
  expect(result.combinedSeed).toBe(
    "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0"
  );
  expect(result.binIndex).toBe(6);
});
