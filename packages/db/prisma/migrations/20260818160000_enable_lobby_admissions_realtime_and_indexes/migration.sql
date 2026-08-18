-- Migration: Enable Lobby Admissions Realtime & Composite Indexes
-- Created At: 2026-08-18T16:00:00Z
-- Description: Sets up composite indexes, replica identity full, row level security, and registers exam_lobby_admissions in the supabase_realtime publication.

-- ─── 1. REPLICA IDENTITY FULL (Required for Supabase Realtime updates) ─────────
ALTER TABLE "public"."exam_lobby_admissions" REPLICA IDENTITY FULL;

-- ─── 2. COMPOSITE INDEXES (Optimize lobby queue filtering and sorting) ──────────
CREATE INDEX IF NOT EXISTS "exam_lobby_admissions_exam_status_idx"
ON "public"."exam_lobby_admissions" ("exam_id", "status", "checked_in_at" ASC);

-- ─── 3. ROW LEVEL SECURITY (Enable security controls) ──────────────────────────
ALTER TABLE "public"."exam_lobby_admissions" ENABLE ROW LEVEL SECURITY;

-- ─── 4. SELECT POLICIES (Enforce exam participant and instructor boundary) ───────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'public.exam_lobby_admissions'::regclass 
          AND polname = 'exam_lobby_admissions_select_policy'
    ) THEN
        CREATE POLICY "exam_lobby_admissions_select_policy"
        ON "public"."exam_lobby_admissions"
        FOR SELECT
        TO authenticated
        USING (
            -- Student reading their own admission record
            EXISTS (
                SELECT 1 FROM "public"."students" s
                WHERE s.student_id = exam_lobby_admissions.student_id
                  AND s.user_id = auth.uid()
            )
            -- OR Instructor / Creator reading admissions for their exam
            OR EXISTS (
                SELECT 1 FROM "public"."exams" e
                WHERE e.exam_id = exam_lobby_admissions.exam_id
                  AND (
                      e.created_by = auth.uid()
                      OR EXISTS (
                          SELECT 1 FROM "public"."exam_assignees" ea
                          WHERE ea.exam_id = e.exam_id
                            AND ea.user_id = auth.uid()
                            AND ea.status = 'ACCEPTED'
                      )
                  )
            )
            -- OR Institutional Admins / Staff
            OR EXISTS (
                SELECT 1 FROM "public"."user_roles" ur
                JOIN "public"."roles" r ON ur.role_id = r.role_id
                WHERE ur.user_id = auth.uid()
                  AND r.role_slug IN ('superadmin', 'admin', 'institution_admin', 'instructor')
            )
        );
    END IF;
END
$$;

-- ─── 5. SUPABASE REALTIME PUBLICATION REGISTRATION ────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'exam_lobby_admissions'
    ) THEN
        IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE "public"."exam_lobby_admissions";
        END IF;
    END IF;
END
$$;
