-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "commitHex" CHAR(64) NOT NULL,
    "serverSeed" VARCHAR(128),
    "clientSeed" VARCHAR(128),
    "combinedSeed" CHAR(64),
    "pegMapHash" CHAR(64),
    "rows" INTEGER,
    "dropColumn" INTEGER,
    "binIndex" INTEGER,
    "payoutMultiplier" DOUBLE PRECISION,
    "betCents" INTEGER,
    "pathJson" JSONB,
    "revealedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Round_commitHex_idx" ON "Round"("commitHex");

-- CreateIndex
CREATE INDEX "Round_combinedSeed_idx" ON "Round"("combinedSeed");

-- CreateIndex
CREATE INDEX "Round_createdAt_idx" ON "Round"("createdAt");
