import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.round.create({
    data: {
      status: "revealed",
      nonce: 42,
      commitHex:
        "bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34",
      serverSeed:
        "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc",
      clientSeed: "candidate-hello",
      combinedSeed:
        "e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0",
      pegMapHash:
        "21296c4b32a9cf0993d6988835d5a109d3337791239f411384794251c51e7784",
      rows: 12,
      dropColumn: 6,
      binIndex: 6,
      payoutMultiplier: 1.5,
      betCents: 100,
      pathJson: ["L", "R", "L", "R", "L"],
      revealedAt: new Date(),
    },
  });
  console.log("✅ Inserted reference round for verification.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
