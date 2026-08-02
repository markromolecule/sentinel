import 'dotenv/config';

import { prisma } from '@sentinel/db';
import { getSupabaseAdmin } from '../src/lib/supabase-admin';

const SUPPORT_ACCOUNT_EMAIL = process.env.SUPPORT_ACCOUNT_EMAIL || 'support@sentinelph.tech';
const ALLOW_DESTRUCTIVE_SEED = process.env.ALLOW_DESTRUCTIVE_SEED === 'true';
const DELETE_AUTH_USERS = process.env.DELETE_AUTH_USERS === 'true';

const OPERATIONAL_TABLES = [
    'livekit_webhook_events',
    'live_inspection_leases',
    'telemetry_incident_evidence',
    'flagged_incidents',
    'exam_attempt_lifecycle_events',
    'exam_feedbacks',
    'exam_lobby_admissions',
    'exam_remediation_schedules',
    'exam_answer_key_exports',
    'exam_report_exports',
    'analytics_reports',
    'exam_section_assignments',
    'exam_assigned_sections',
    'exam_shares',
    'proctor_assignments',
    'exam_attempts',
    'exams',
    'question_bank_collection_shares',
    'question_bank_collections',
    'question_bank_questions',
    'essay_rubric_versions',
    'messages',
    'conversation_participants',
    'conversations',
    'notifications',
    'announcements',
    'calendar_events',
    'audit_logs',
    'institution_pdf_branding',
    'pdf_templates',
    'enrollment_requests',
    'enrollments',
    'classroom_instructor_assignments',
    'class_roles',
    'class_groups',
    'subject_classification_subjects',
    'subject_classification_courses',
    'subject_offering_departments',
    'subject_offering_courses',
    'subject_offering_sections',
    'subject_offering_year_levels',
    'subject_departments',
    'subject_sections',
    'subject_classifications',
    'subject_offerings',
    'instructor_subject_requests',
    'instructor_subjects',
    'student_whitelist',
    'students',
    'instructors',
    'rooms',
    'sections',
    'courses',
    'departments',
    'subjects',
    'terms',
    'user_profiles',
    'user_roles',
    'institutions',
];

function assertCleanupAllowed() {
    if (!ALLOW_DESTRUCTIVE_SEED) {
        throw new Error(
            'Refusing to clean seed data. Set ALLOW_DESTRUCTIVE_SEED=true to run this destructive cleanup.',
        );
    }

    if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing to run destructive seed cleanup while NODE_ENV=production.');
    }
}

async function deleteNonSupportAuthUsers() {
    if (!DELETE_AUTH_USERS) {
        console.log(
            'Skipping Supabase Auth user deletion. Set DELETE_AUTH_USERS=true to enable it.',
        );
        return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
        throw new Error(
            'Supabase Admin client is not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
    }

    let page = 1;
    const perPage = 100;
    let deletedCount = 0;

    while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
        });

        if (error) {
            throw new Error(error.message || 'Failed to list Supabase Auth users.');
        }

        const users = data.users ?? [];
        for (const user of users) {
            if (user.email?.toLowerCase() === SUPPORT_ACCOUNT_EMAIL.toLowerCase()) {
                continue;
            }

            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
            if (deleteError) {
                throw new Error(
                    deleteError.message || `Failed to delete Supabase Auth user ${user.id}.`,
                );
            }
            deletedCount += 1;
        }

        if (users.length < perPage) {
            break;
        }

        page += 1;
    }

    console.log(`Deleted ${deletedCount} non-support Supabase Auth user(s).`);
}

async function cleanupSeedData() {
    assertCleanupAllowed();

    const tableList = OPERATIONAL_TABLES.map((table) => `"public"."${table}"`).join(', ');

    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
    console.log(`Cleaned ${OPERATIONAL_TABLES.length} operational table(s).`);

    await deleteNonSupportAuthUsers();
}

cleanupSeedData()
    .catch((error) => {
        console.error('Seed data cleanup failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
