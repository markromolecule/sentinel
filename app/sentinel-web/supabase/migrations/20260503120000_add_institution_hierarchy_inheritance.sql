DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'institution_kind'
            AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.institution_kind AS ENUM ('STANDALONE', 'PARENT', 'CHILD');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'inheritance_status'
            AND n.nspname = 'public'
    ) THEN
        CREATE TYPE public.inheritance_status AS ENUM ('LOCAL', 'OVERRIDDEN', 'HIDDEN');
    END IF;
END
$$;

ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS parent_institution_id uuid,
    ADD COLUMN IF NOT EXISTS institution_kind public.institution_kind NOT NULL DEFAULT 'STANDALONE';

CREATE INDEX IF NOT EXISTS institutions_parent_institution_id_idx
    ON public.institutions(parent_institution_id);

CREATE INDEX IF NOT EXISTS institutions_institution_kind_idx
    ON public.institutions(institution_kind);

DO $$
BEGIN
    ALTER TABLE public.institutions
        ADD CONSTRAINT institutions_parent_institution_id_fkey
        FOREIGN KEY (parent_institution_id) REFERENCES public.institutions(id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.departments
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.terms
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.subjects
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.sections
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.subject_classifications
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

ALTER TABLE public.subject_offerings
    ADD COLUMN IF NOT EXISTS source_record_id uuid,
    ADD COLUMN IF NOT EXISTS inheritance_status public.inheritance_status DEFAULT 'LOCAL',
    ADD COLUMN IF NOT EXISTS overridden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS overridden_by uuid,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid;

CREATE TABLE IF NOT EXISTS public.institution_naming_conventions (
    institution_naming_convention_id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    section_code_format varchar(120),
    course_id_format varchar(120),
    room_code_format varchar(120),
    naming_rules jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamp with time zone,
    updated_by uuid,
    CONSTRAINT institution_naming_conventions_pkey PRIMARY KEY (institution_naming_convention_id),
    CONSTRAINT institution_naming_conventions_institution_id_key UNIQUE (institution_id)
);

CREATE INDEX IF NOT EXISTS institution_naming_conventions_institution_id_idx
    ON public.institution_naming_conventions(institution_id);

ALTER TABLE public.institution_naming_conventions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    ALTER TABLE public.institution_naming_conventions
        ADD CONSTRAINT institution_naming_conventions_institution_id_fkey
        FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

CREATE INDEX IF NOT EXISTS departments_institution_id_source_record_id_idx ON public.departments(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS courses_institution_id_source_record_id_idx ON public.courses(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS rooms_institution_id_source_record_id_idx ON public.rooms(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS terms_institution_id_source_record_id_idx ON public.terms(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS subjects_institution_id_source_record_id_idx ON public.subjects(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS sections_institution_id_source_record_id_idx ON public.sections(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS subject_classifications_institution_id_source_record_id_idx ON public.subject_classifications(institution_id, source_record_id);
CREATE INDEX IF NOT EXISTS subject_offerings_institution_id_source_record_id_idx ON public.subject_offerings(institution_id, source_record_id);

CREATE UNIQUE INDEX IF NOT EXISTS departments_institution_source_record_key
    ON public.departments(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS courses_institution_source_record_key
    ON public.courses(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS rooms_institution_source_record_key
    ON public.rooms(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS terms_institution_source_record_key
    ON public.terms(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subjects_institution_source_record_key
    ON public.subjects(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sections_institution_source_record_key
    ON public.sections(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subject_classifications_institution_source_record_key
    ON public.subject_classifications(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS subject_offerings_institution_source_record_key
    ON public.subject_offerings(institution_id, source_record_id)
    WHERE source_record_id IS NOT NULL;

DO $$
BEGIN
    ALTER TABLE public.departments
        ADD CONSTRAINT departments_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.departments(department_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.courses
        ADD CONSTRAINT courses_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.courses(course_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.rooms
        ADD CONSTRAINT rooms_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.rooms(room_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.terms
        ADD CONSTRAINT terms_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.terms(term_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.subjects
        ADD CONSTRAINT subjects_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.subjects(subject_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.sections
        ADD CONSTRAINT sections_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.sections(section_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.subject_classifications
        ADD CONSTRAINT subject_classifications_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.subject_classifications(subject_classification_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
    ALTER TABLE public.subject_offerings
        ADD CONSTRAINT subject_offerings_source_record_id_fkey
        FOREIGN KEY (source_record_id) REFERENCES public.subject_offerings(subject_offering_id)
        ON DELETE SET NULL
        ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END
$$;
