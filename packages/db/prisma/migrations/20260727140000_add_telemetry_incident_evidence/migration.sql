-- CreateEnum
CREATE TYPE "public"."telemetry_incident_evidence_state" AS ENUM (
    'PENDING_UPLOAD',
    'AVAILABLE',
    'DELETE_PENDING',
    'DELETED',
    'FAILED',
    'EXPIRED'
);

-- CreateEnum
CREATE TYPE "public"."telemetry_incident_evidence_deletion_reason" AS ENUM (
    'INSTRUCTOR_REVIEW',
    'RETENTION_EXPIRED',
    'ATTEMPT_DELETED',
    'STALE_PENDING_UPLOAD',
    'TELEMETRY_UNLINKED',
    'OBJECT_MISSING'
);

-- CreateTable
CREATE TABLE "public"."telemetry_incident_evidence" (
    "evidence_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attempt_id" UUID NOT NULL,
    "incident_id" UUID,
    "institution_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" "public"."incident_type" NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storage_bucket" VARCHAR(100),
    "storage_path" VARCHAR(255),
    "mime_type" VARCHAR(50) NOT NULL,
    "declared_size_bytes" INTEGER NOT NULL,
    "size_bytes" INTEGER,
    "sha256" VARCHAR(64),
    "state" "public"."telemetry_incident_evidence_state" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    "deletion_reason" "public"."telemetry_incident_evidence_deletion_reason",
    "failure_code" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_incident_evidence_pkey" PRIMARY KEY ("evidence_id"),
    CONSTRAINT "telemetry_incident_evidence_attempt_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "telemetry_incident_evidence_incident_fkey" FOREIGN KEY ("incident_id") REFERENCES "public"."flagged_incidents"("incident_id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "telemetry_incident_evidence_institution_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "telemetry_incident_evidence_student_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "telemetry_incident_evidence_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "telemetry_incident_evidence_declared_size_positive" CHECK ("declared_size_bytes" > 0),
    CONSTRAINT "telemetry_incident_evidence_size_positive" CHECK ("size_bytes" IS NULL OR "size_bytes" > 0),
    CONSTRAINT "telemetry_incident_evidence_terminal_state_check" CHECK (
        (
            "state" IN ('DELETED', 'EXPIRED')
            AND "deleted_at" IS NOT NULL
            AND "deletion_reason" IS NOT NULL
        )
        OR (
            "state" NOT IN ('DELETED', 'EXPIRED')
        )
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_incident_evidence_attempt_event_unique" ON "public"."telemetry_incident_evidence"("attempt_id", "event_id");

-- CreateIndex
CREATE INDEX "telemetry_incident_evidence_incident_state_captured_idx" ON "public"."telemetry_incident_evidence"("incident_id", "state", "captured_at");

-- CreateIndex
CREATE INDEX "telemetry_incident_evidence_state_expires_idx" ON "public"."telemetry_incident_evidence"("state", "expires_at");

-- CreateIndex
CREATE INDEX "telemetry_incident_evidence_institution_created_idx" ON "public"."telemetry_incident_evidence"("institution_id", "created_at");

-- CreateIndex
CREATE INDEX "telemetry_incident_evidence_attempt_type_created_idx" ON "public"."telemetry_incident_evidence"("attempt_id", "event_type", "created_at");

-- Enable RLS
ALTER TABLE "public"."telemetry_incident_evidence" ENABLE ROW LEVEL SECURITY;
