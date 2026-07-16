-- SB-029: industry / vertical tags for library browse facets
ALTER TABLE "library_templates" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
