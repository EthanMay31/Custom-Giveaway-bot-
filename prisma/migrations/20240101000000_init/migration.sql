-- CreateTable
CREATE TABLE "Giveaway" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "winnersCount" INTEGER NOT NULL,
    "actualWinnerIds" TEXT[],
    "entries" TEXT[],
    "duration" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "ping" BOOLEAN NOT NULL DEFAULT false,
    "ended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Giveaway_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Giveaway_messageId_key" ON "Giveaway"("messageId");

-- CreateIndex
CREATE INDEX "Giveaway_guildId_idx" ON "Giveaway"("guildId");

-- CreateIndex
CREATE INDEX "Giveaway_ended_idx" ON "Giveaway"("ended");

-- CreateIndex
CREATE INDEX "Giveaway_endsAt_idx" ON "Giveaway"("endsAt");

-- CreateIndex
CREATE INDEX "Giveaway_guildId_ended_idx" ON "Giveaway"("guildId", "ended");
