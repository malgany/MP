-- Add optional columns for raw file storage and metadata
ALTER TABLE "Widget" ADD COLUMN IF NOT EXISTS "raw" TEXT;
ALTER TABLE "Widget" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE "Widget" ADD COLUMN IF NOT EXISTS "fileExt" TEXT;


