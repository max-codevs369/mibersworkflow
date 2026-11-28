CREATE TABLE "NotificationSound" (
    "kind" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'audio/wav',
    "size" INTEGER NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSound_pkey" PRIMARY KEY ("kind")
);
