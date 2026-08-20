


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."action_type" AS ENUM (
    'INFO',
    'WARNING',
    'ERROR',
    'SUCCESS'
);


ALTER TYPE "public"."action_type" OWNER TO "postgres";


CREATE TYPE "public"."announcement_status" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'SCHEDULED',
    'ARCHIVED'
);


ALTER TYPE "public"."announcement_status" OWNER TO "postgres";


CREATE TYPE "public"."exam_difficulty" AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
);


ALTER TYPE "public"."exam_difficulty" OWNER TO "postgres";


CREATE TYPE "public"."exam_status" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED',
    'SCHEDULED',
    'AVAILABLE',
    'COMPLETED',
    'IN_PROGRESS',
    'UPCOMING',
    'ACTIVE'
);


ALTER TYPE "public"."exam_status" OWNER TO "postgres";


CREATE TYPE "public"."incident_severity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


ALTER TYPE "public"."incident_severity" OWNER TO "postgres";


CREATE TYPE "public"."incident_type" AS ENUM (
    'FACE_NOT_VISIBLE',
    'MULTIPLE_FACES',
    'TAB_SWITCH',
    'AUDIO_DETECTED',
    'SUSPICIOUS_MOVEMENT',
    'SCREENSHOT',
    'SCREEN_RECORD',
    'GAZE'
);


ALTER TYPE "public"."incident_type" OWNER TO "postgres";


CREATE TYPE "public"."message_status" AS ENUM (
    'SENT',
    'DELIVERED',
    'READ'
);


ALTER TYPE "public"."message_status" OWNER TO "postgres";


CREATE TYPE "public"."proctor_assignment_status" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED',
    'ACTIVE',
    'COMPLETED',
    'SCHEDULED'
);


ALTER TYPE "public"."proctor_assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."question_type" AS ENUM (
    'MULTIPLE_CHOICE',
    'IDENTIFICATION',
    'ESSAY',
    'ENUMERATION',
    'TRUE_FALSE'
);


ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."trend_direction" AS ENUM (
    'UP',
    'DOWN',
    'NEUTRAL'
);


ALTER TYPE "public"."trend_direction" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
            DECLARE
                meta jsonb;
            BEGIN
                meta := NEW.raw_user_meta_data;
                
                INSERT INTO public.user_profiles (user_id, first_name, last_name, avatar_url)
                VALUES (
                    NEW.id,
                    COALESCE(
                        meta->>'first_name', 
                        meta->>'given_name', 
                        split_part(meta->>'full_name', ' ', 1),
                        split_part(meta->>'name', ' ', 1)
                    ),
                    COALESCE(
                        meta->>'last_name', 
                        meta->>'family_name', 
                        split_part(meta->>'full_name', ' ', 2),
                        split_part(meta->>'name', ' ', 2)
                    ),
                    COALESCE(
                        meta->>'avatar_url',
                        meta->>'picture'
                    )
                );
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_exam_questions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_exam_questions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analytics_reports" (
    "report_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "type" character varying(50) NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "format" character varying(10) DEFAULT 'pdf'::character varying,
    "status" character varying(20) DEFAULT 'READY'::character varying,
    "file_url" "text",
    "created_by" "uuid"
);


ALTER TABLE "public"."analytics_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcements" (
    "announcement_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "content" "text" NOT NULL,
    "target_audience" "text"[],
    "status" "public"."announcement_status" DEFAULT 'DRAFT'::"public"."announcement_status",
    "published_at" timestamp with time zone,
    "author_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "log_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "resource_type" character varying(50),
    "resource_id" character varying(100),
    "details" "jsonb",
    "ip_address" character varying(45),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_groups" (
    "class_group_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_id" "uuid",
    "section_id" "uuid",
    "term_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_roles" (
    "class_group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_id" smallint NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."class_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "conversation_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" character varying(20) DEFAULT 'DIRECT'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_subjects" (
    "course_id" "uuid" NOT NULL,
    "subject_id" "uuid" NOT NULL,
    "year_level" smallint,
    "semester" character varying(20)
);


ALTER TABLE "public"."course_subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "course_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(20) NOT NULL,
    "title" character varying(255) NOT NULL,
    "department_id" "uuid",
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "department_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department_name" character varying(100) NOT NULL,
    "department_code" "text",
    "created_at" "date",
    "created_by" "text"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrollments" (
    "enrollment_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_group_id" "uuid",
    "student_id" "uuid",
    "enrolled_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_attempts" (
    "attempt_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid",
    "student_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "score" integer,
    "total_score" integer,
    "status" "public"."exam_status" DEFAULT 'IN_PROGRESS'::"public"."exam_status",
    "time_spent_minutes" integer DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_configurations" (
    "config_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid",
    "max_reconnect_attempts" integer DEFAULT 3,
    "strict_mode" boolean DEFAULT true,
    "camera_required" boolean DEFAULT true,
    "mic_required" boolean DEFAULT true,
    "screen_lock" boolean DEFAULT true,
    "auto_submit_timeout_minutes" integer DEFAULT 5,
    "allowed_devices" "text"[],
    "ai_rules" "jsonb" DEFAULT '{"gaze_tracking": true, "tab_switching": true, "face_detection": true, "audio_detection": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_configurations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exam_questions" (
    "question_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "question_type" "public"."question_type" NOT NULL,
    "content" "jsonb" NOT NULL,
    "points" integer DEFAULT 1 NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exam_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exams" (
    "exam_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" character varying(255) NOT NULL,
    "subject_id" "uuid",
    "description" "text",
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "question_count" integer DEFAULT 0,
    "passing_score" integer DEFAULT 0,
    "difficulty" "public"."exam_difficulty" DEFAULT 'MEDIUM'::"public"."exam_difficulty",
    "scheduled_date" timestamp with time zone,
    "status" "public"."exam_status" DEFAULT 'DRAFT'::"public"."exam_status",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."exams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flagged_incidents" (
    "incident_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid",
    "incident_type" "public"."incident_type" NOT NULL,
    "severity" "public"."incident_severity" DEFAULT 'MEDIUM'::"public"."incident_severity",
    "details" "text",
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "evidence_url" "text",
    "status" character varying(20) DEFAULT 'PENDING'::character varying
);


ALTER TABLE "public"."flagged_incidents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."institutions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "code" character varying(50),
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."institutions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "message_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "status" "public"."message_status" DEFAULT 'SENT'::"public"."message_status",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proctor_assignments" (
    "assignment_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "exam_id" "uuid",
    "proctor_id" "uuid",
    "scheduled_at" timestamp with time zone,
    "status" "public"."proctor_assignment_status" DEFAULT 'SCHEDULED'::"public"."proctor_assignment_status",
    "assigned_students_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."proctor_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "role_id" smallint NOT NULL,
    "role_name" character varying(50) NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


ALTER TABLE "public"."roles" ALTER COLUMN "role_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_role_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sections" (
    "section_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_name" character varying(50) NOT NULL,
    "year_level" smallint,
    "department_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sections_year_level_check" CHECK ((("year_level" >= 1) AND ("year_level" <= 6)))
);


ALTER TABLE "public"."sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "student_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "student_number" character varying(50) NOT NULL,
    "department_id" "uuid",
    "institution_id" "uuid"
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "subject_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject_code" character varying(50) NOT NULL,
    "subject_title" character varying(255) NOT NULL,
    "department_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."terms" (
    "term_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "academic_year" character varying(20) NOT NULL,
    "semester" character varying(20) NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."terms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "avatar_url" "text",
    "status" "public"."user_status" DEFAULT 'ACTIVE'::"public"."user_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role_id" smallint NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."analytics_reports"
    ADD CONSTRAINT "analytics_reports_pkey" PRIMARY KEY ("report_id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id");



ALTER TABLE ONLY "public"."class_groups"
    ADD CONSTRAINT "class_groups_pkey" PRIMARY KEY ("class_group_id");



ALTER TABLE ONLY "public"."class_groups"
    ADD CONSTRAINT "class_groups_subject_id_section_id_term_id_key" UNIQUE ("subject_id", "section_id", "term_id");



ALTER TABLE ONLY "public"."class_roles"
    ADD CONSTRAINT "class_roles_pkey" PRIMARY KEY ("class_group_id", "user_id", "role_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id");



ALTER TABLE ONLY "public"."course_subjects"
    ADD CONSTRAINT "course_subjects_pkey" PRIMARY KEY ("course_id", "subject_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("course_id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_department_name_key" UNIQUE ("department_name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_class_group_id_student_id_key" UNIQUE ("class_group_id", "student_id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_pkey" PRIMARY KEY ("enrollment_id");



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("attempt_id");



ALTER TABLE ONLY "public"."exam_configurations"
    ADD CONSTRAINT "exam_configurations_exam_id_key" UNIQUE ("exam_id");



ALTER TABLE ONLY "public"."exam_configurations"
    ADD CONSTRAINT "exam_configurations_pkey" PRIMARY KEY ("config_id");



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("question_id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("exam_id");



ALTER TABLE ONLY "public"."flagged_incidents"
    ADD CONSTRAINT "flagged_incidents_pkey" PRIMARY KEY ("incident_id");



ALTER TABLE ONLY "public"."institutions"
    ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."proctor_assignments"
    ADD CONSTRAINT "proctor_assignments_exam_id_proctor_id_key" UNIQUE ("exam_id", "proctor_id");



ALTER TABLE ONLY "public"."proctor_assignments"
    ADD CONSTRAINT "proctor_assignments_pkey" PRIMARY KEY ("assignment_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("role_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_role_name_key" UNIQUE ("role_name");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_pkey" PRIMARY KEY ("section_id");



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_section_name_year_level_department_id_key" UNIQUE ("section_name", "year_level", "department_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_student_number_key" UNIQUE ("student_number");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("subject_id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_subject_code_key" UNIQUE ("subject_code");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_academic_year_semester_key" UNIQUE ("academic_year", "semester");



ALTER TABLE ONLY "public"."terms"
    ADD CONSTRAINT "terms_pkey" PRIMARY KEY ("term_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id");



CREATE UNIQUE INDEX "institutions_name_key" ON "public"."institutions" USING "btree" ("name");



CREATE UNIQUE INDEX "one_active_term" ON "public"."terms" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE OR REPLACE TRIGGER "update_announcements_updated_at" BEFORE UPDATE ON "public"."announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_exam_questions_updated_at" BEFORE UPDATE ON "public"."exam_questions" FOR EACH ROW EXECUTE FUNCTION "public"."update_exam_questions_updated_at"();



CREATE OR REPLACE TRIGGER "update_exams_updated_at" BEFORE UPDATE ON "public"."exams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analytics_reports"
    ADD CONSTRAINT "analytics_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."class_groups"
    ADD CONSTRAINT "class_groups_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("section_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_groups"
    ADD CONSTRAINT "class_groups_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("subject_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_groups"
    ADD CONSTRAINT "class_groups_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("term_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_roles"
    ADD CONSTRAINT "class_roles_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("class_group_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_roles"
    ADD CONSTRAINT "class_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id");



ALTER TABLE ONLY "public"."class_roles"
    ADD CONSTRAINT "class_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_subjects"
    ADD CONSTRAINT "course_subjects_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("course_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_subjects"
    ADD CONSTRAINT "course_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("subject_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id");



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_class_group_id_fkey" FOREIGN KEY ("class_group_id") REFERENCES "public"."class_groups"("class_group_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."enrollments"
    ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("exam_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_attempts"
    ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_configurations"
    ADD CONSTRAINT "exam_configurations_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("exam_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_questions"
    ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("exam_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("subject_id");



ALTER TABLE ONLY "public"."flagged_incidents"
    ADD CONSTRAINT "flagged_incidents_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("attempt_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("conversation_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."proctor_assignments"
    ADD CONSTRAINT "proctor_assignments_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("exam_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proctor_assignments"
    ADD CONSTRAINT "proctor_assignments_proctor_id_fkey" FOREIGN KEY ("proctor_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sections"
    ADD CONSTRAINT "sections_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("role_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view announcements" ON "public"."announcements" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view courses" ON "public"."courses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view departments" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view exam questions" ON "public"."exam_questions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view exams" ON "public"."exams" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view messages involved in" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "cp"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Authenticated users can view sections" ON "public"."sections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view subjects" ON "public"."subjects" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view terms" ON "public"."terms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can create their own student record" ON "public"."students" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own student record" ON "public"."students" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."analytics_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."institutions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_configurations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exam_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flagged_incidents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proctor_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."terms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT ALL ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";
GRANT ALL ON SCHEMA "public" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "public" TO "supabase_admin";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_auth_admin";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "supabase_admin";



GRANT ALL ON FUNCTION "public"."update_exam_questions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_exam_questions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_exam_questions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics_reports" TO "anon";
GRANT ALL ON TABLE "public"."analytics_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics_reports" TO "service_role";



GRANT ALL ON TABLE "public"."announcements" TO "anon";
GRANT ALL ON TABLE "public"."announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."announcements" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."class_groups" TO "anon";
GRANT ALL ON TABLE "public"."class_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."class_groups" TO "service_role";
GRANT ALL ON TABLE "public"."class_groups" TO "supabase_admin";
GRANT ALL ON TABLE "public"."class_groups" TO "dashboard_user";



GRANT ALL ON TABLE "public"."class_roles" TO "anon";
GRANT ALL ON TABLE "public"."class_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."class_roles" TO "service_role";
GRANT ALL ON TABLE "public"."class_roles" TO "supabase_admin";
GRANT ALL ON TABLE "public"."class_roles" TO "dashboard_user";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."course_subjects" TO "anon";
GRANT ALL ON TABLE "public"."course_subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."course_subjects" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";
GRANT ALL ON TABLE "public"."departments" TO "supabase_admin";
GRANT ALL ON TABLE "public"."departments" TO "dashboard_user";



GRANT ALL ON TABLE "public"."enrollments" TO "anon";
GRANT ALL ON TABLE "public"."enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."enrollments" TO "service_role";
GRANT ALL ON TABLE "public"."enrollments" TO "supabase_admin";
GRANT ALL ON TABLE "public"."enrollments" TO "dashboard_user";



GRANT ALL ON TABLE "public"."exam_attempts" TO "anon";
GRANT ALL ON TABLE "public"."exam_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."exam_configurations" TO "anon";
GRANT ALL ON TABLE "public"."exam_configurations" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_configurations" TO "service_role";



GRANT ALL ON TABLE "public"."exam_questions" TO "anon";
GRANT ALL ON TABLE "public"."exam_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."exam_questions" TO "service_role";



GRANT ALL ON TABLE "public"."exams" TO "anon";
GRANT ALL ON TABLE "public"."exams" TO "authenticated";
GRANT ALL ON TABLE "public"."exams" TO "service_role";



GRANT ALL ON TABLE "public"."flagged_incidents" TO "anon";
GRANT ALL ON TABLE "public"."flagged_incidents" TO "authenticated";
GRANT ALL ON TABLE "public"."flagged_incidents" TO "service_role";



GRANT ALL ON TABLE "public"."institutions" TO "anon";
GRANT ALL ON TABLE "public"."institutions" TO "authenticated";
GRANT ALL ON TABLE "public"."institutions" TO "service_role";
GRANT ALL ON TABLE "public"."institutions" TO "supabase_admin";
GRANT ALL ON TABLE "public"."institutions" TO "dashboard_user";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."proctor_assignments" TO "anon";
GRANT ALL ON TABLE "public"."proctor_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."proctor_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";
GRANT ALL ON TABLE "public"."roles" TO "supabase_admin";
GRANT ALL ON TABLE "public"."roles" TO "dashboard_user";



GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "service_role";
GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "supabase_admin";
GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "public"."roles_role_id_seq" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."sections" TO "anon";
GRANT ALL ON TABLE "public"."sections" TO "authenticated";
GRANT ALL ON TABLE "public"."sections" TO "service_role";
GRANT ALL ON TABLE "public"."sections" TO "supabase_admin";
GRANT ALL ON TABLE "public"."sections" TO "dashboard_user";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";
GRANT ALL ON TABLE "public"."students" TO "supabase_admin";
GRANT ALL ON TABLE "public"."students" TO "dashboard_user";



GRANT ALL ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "authenticated";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";
GRANT ALL ON TABLE "public"."subjects" TO "supabase_admin";
GRANT ALL ON TABLE "public"."subjects" TO "dashboard_user";



GRANT ALL ON TABLE "public"."terms" TO "anon";
GRANT ALL ON TABLE "public"."terms" TO "authenticated";
GRANT ALL ON TABLE "public"."terms" TO "service_role";
GRANT ALL ON TABLE "public"."terms" TO "supabase_admin";
GRANT ALL ON TABLE "public"."terms" TO "dashboard_user";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";
GRANT ALL ON TABLE "public"."user_profiles" TO "supabase_admin";
GRANT ALL ON TABLE "public"."user_profiles" TO "dashboard_user";
GRANT ALL ON TABLE "public"."user_profiles" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";
GRANT ALL ON TABLE "public"."user_roles" TO "supabase_admin";
GRANT ALL ON TABLE "public"."user_roles" TO "dashboard_user";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


