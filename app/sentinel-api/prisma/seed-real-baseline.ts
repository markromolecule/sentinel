import 'dotenv/config';

import { DEFAULT_AUDIO_ANOMALY_CONFIG, SUPPORT_EMAIL } from '@sentinel/shared';
import { prisma } from '@sentinel/db';
import { getSupabaseAdmin } from '../src/lib/supabase-admin';

const SUPPORT_ACCOUNT_EMAIL = process.env.SUPPORT_ACCOUNT_EMAIL || SUPPORT_EMAIL;
const SUPPORT_ACCOUNT_PASSWORD = process.env.SUPPORT_ACCOUNT_PASSWORD;
const DRY_RUN = process.env.SEED_REAL_BASELINE_DRY_RUN === 'true';

const SUPPORT_METADATA = {
    first_name: 'Sentinel',
    last_name: 'Support',
    role: 'support',
};

function requireSupportPassword() {
    if (!SUPPORT_ACCOUNT_PASSWORD) {
        throw new Error(
            'Missing SUPPORT_ACCOUNT_PASSWORD. Add it to app/sentinel-api/.env before running the real baseline seed.',
        );
    }

    return SUPPORT_ACCOUNT_PASSWORD;
}

async function ensureSystemRoles() {
    const defaultRoles = [
        {
            role_name: 'support',
            slug: 'support',
            domain_scope: ['support'],
            is_active: true,
            assignable_by: ['support'],
            description: 'Platform support administrative role.',
        },
        {
            role_name: 'superadmin',
            slug: 'superadmin',
            domain_scope: ['core'],
            is_active: true,
            assignable_by: ['support'],
            description: 'Global system administrator.',
        },
        {
            role_name: 'admin',
            slug: 'admin',
            domain_scope: ['core', 'app'],
            is_active: true,
            assignable_by: ['support', 'superadmin'],
            description: 'Tenant or institution administrator.',
        },
        {
            role_name: 'instructor',
            slug: 'instructor',
            domain_scope: ['app'],
            is_active: true,
            assignable_by: ['support', 'superadmin', 'admin'],
            description: 'Academic instructor or lecturer.',
        },
        {
            role_name: 'student',
            slug: 'student',
            domain_scope: ['app'],
            is_active: true,
            assignable_by: ['support', 'superadmin', 'admin'],
            description: 'Student learner account.',
        },
    ];

    let supportRoleId: number | null = null;

    for (const role of defaultRoles) {
        const seededRole = await prisma.roles.upsert({
            where: { role_name: role.role_name },
            update: {
                slug: role.slug,
                domain_scope: role.domain_scope,
                is_active: role.is_active,
                assignable_by: role.assignable_by,
                description: role.description,
                is_system: true,
                updated_at: new Date(),
            },
            create: {
                ...role,
                is_system: true,
            },
        });

        if (role.role_name === 'support') {
            supportRoleId = seededRole.role_id;
        }
    }

    if (!supportRoleId) {
        throw new Error('Support role was not created.');
    }

    return { supportRoleId };
}

async function ensureSupportAccount(supportRoleId: number) {
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
        throw new Error(
            'Supabase Admin client is not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
        );
    }

    const existingAuthUser = await prisma.users.findFirst({
        where: { email: SUPPORT_ACCOUNT_EMAIL },
        select: { id: true },
    });

    let supportUserId = existingAuthUser?.id;

    if (!supportUserId) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: SUPPORT_ACCOUNT_EMAIL,
            password: requireSupportPassword(),
            email_confirm: true,
            user_metadata: SUPPORT_METADATA,
            app_metadata: { role: 'support' },
        });

        if (error || !data?.user) {
            throw new Error(error?.message || 'Failed to create support auth user.');
        }

        supportUserId = data.user.id;
    } else {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(supportUserId, {
            email: SUPPORT_ACCOUNT_EMAIL,
            password: requireSupportPassword(),
            email_confirm: true,
            user_metadata: SUPPORT_METADATA,
            app_metadata: { role: 'support' },
        });

        if (error) {
            throw new Error(error.message || 'Failed to update support auth user.');
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.user_roles.deleteMany({
            where: { user_id: supportUserId },
        });

        await tx.user_roles.create({
            data: {
                user_id: supportUserId!,
                role_id: supportRoleId,
            },
        });

        await tx.user_profiles.upsert({
            where: { user_id: supportUserId! },
            update: {
                first_name: SUPPORT_METADATA.first_name,
                last_name: SUPPORT_METADATA.last_name,
                institution_id: null,
                department_id: null,
                course_id: null,
                status: 'ACTIVE',
                updated_at: new Date(),
            },
            create: {
                user_id: supportUserId!,
                first_name: SUPPORT_METADATA.first_name,
                last_name: SUPPORT_METADATA.last_name,
                institution_id: null,
                department_id: null,
                course_id: null,
                status: 'ACTIVE',
            },
        });

        await tx.students.deleteMany({
            where: { user_id: supportUserId },
        });

        await tx.instructors.deleteMany({
            where: { user_id: supportUserId },
        });
    });

    return supportUserId;
}

async function ensureBaselineInstitutions(supportUserId: string) {
    const now = new Date();

    const parent = await prisma.institutions.upsert({
        where: { name: 'National University' },
        update: {
            code: 'NU',
            parent_institution_id: null,
            institution_kind: 'PARENT',
            updated_by: supportUserId,
            updated_at: now,
        },
        create: {
            name: 'National University',
            code: 'NU',
            parent_institution_id: null,
            institution_kind: 'PARENT',
            created_by: supportUserId,
            updated_by: supportUserId,
            updated_at: now,
        },
    });

    const branch = await prisma.institutions.upsert({
        where: { name: 'National University - Dasmariñas' },
        update: {
            code: 'NUD',
            parent_institution_id: parent.id,
            institution_kind: 'CHILD',
            updated_by: supportUserId,
            updated_at: now,
        },
        create: {
            name: 'National University - Dasmariñas',
            code: 'NUD',
            parent_institution_id: parent.id,
            institution_kind: 'CHILD',
            created_by: supportUserId,
            updated_by: supportUserId,
            updated_at: now,
        },
    });

    return { parent, branch };
}

async function ensureAudioSettings(supportUserId: string) {
    await prisma.system_settings.upsert({
        where: { setting_key: 'audio_anomaly_config' },
        update: {
            category: 'audio',
            description: 'Global audio anomaly detection calibration for student exam monitoring.',
            setting_value: {
                ...DEFAULT_AUDIO_ANOMALY_CONFIG,
                thresholds: { ...DEFAULT_AUDIO_ANOMALY_CONFIG.thresholds },
                enabledAnomalyTypes: [...DEFAULT_AUDIO_ANOMALY_CONFIG.enabledAnomalyTypes],
            } as any,
            updated_by: supportUserId,
            updated_at: new Date(),
        },
        create: {
            category: 'audio',
            setting_key: 'audio_anomaly_config',
            description: 'Global audio anomaly detection calibration for student exam monitoring.',
            setting_value: {
                ...DEFAULT_AUDIO_ANOMALY_CONFIG,
                thresholds: { ...DEFAULT_AUDIO_ANOMALY_CONFIG.thresholds },
                enabledAnomalyTypes: [...DEFAULT_AUDIO_ANOMALY_CONFIG.enabledAnomalyTypes],
            } as any,
            updated_by: supportUserId,
            updated_at: new Date(),
        },
    });
}

async function seedRealBaseline() {
    if (DRY_RUN) {
        requireSupportPassword();
        console.log('Real baseline seed dry run passed.');
        console.log(`Support account email: ${SUPPORT_ACCOUNT_EMAIL}`);
        console.log('Parent institution: National University');
        console.log('Branch institution: National University - Dasmariñas');
        return;
    }

    const { supportRoleId } = await ensureSystemRoles();
    const supportUserId = await ensureSupportAccount(supportRoleId);
    const { parent, branch } = await ensureBaselineInstitutions(supportUserId);

    await ensureAudioSettings(supportUserId);

    console.log(`Support account ready: ${SUPPORT_ACCOUNT_EMAIL}`);
    console.log(`Parent institution ready: ${parent.name} (${parent.id})`);
    console.log(`Branch institution ready: ${branch.name} (${branch.id})`);
}

seedRealBaseline()
    .catch((error) => {
        console.error('Real baseline seed failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
