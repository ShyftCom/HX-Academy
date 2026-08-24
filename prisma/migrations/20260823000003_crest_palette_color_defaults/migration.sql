-- Crest palette rebrand: the two content-colour defaults still handed out the
-- retired sky-blue (#3996D6). Any category or pathway level created without an
-- explicit colour would have come back blue on an otherwise ink/crimson site.
--
-- Existing rows were remapped separately by scripts/rebrand-website-colors.ts;
-- this only moves the default for rows created from here on.
ALTER TABLE "programme_categories" ALTER COLUMN "colorTag" SET DEFAULT '#A32F33';
ALTER TABLE "pathway_levels" ALTER COLUMN "color" SET DEFAULT '#A32F33';
