-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "view" TEXT NOT NULL,
    "defaultState" JSONB NOT NULL,
    "states" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Widget_userId_createdAt_idx" ON "Widget"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
