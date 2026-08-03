ALTER TABLE public.subject_classifications
ADD COLUMN IF NOT EXISTS year_levels smallint[] NOT NULL DEFAULT '{}'::smallint[];
