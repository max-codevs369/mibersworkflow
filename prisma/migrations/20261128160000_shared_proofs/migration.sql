CREATE TABLE "SharedProof" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedProof_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SharedProof_userId_idx" ON "SharedProof"("userId");

CREATE INDEX "SharedProof_expiresAt_idx" ON "SharedProof"("expiresAt");
