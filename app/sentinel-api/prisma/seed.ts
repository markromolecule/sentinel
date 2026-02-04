
import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { createClient } from '@supabase/supabase-js';

console.log("Database URL:", process.env.DATABASE_URL);


const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables. Please check your .env file.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    await prisma.$connect();
    console.log('Starting seed...');

    // 1. Seed Roles
    const roles = [
        { role_id: 1, role_name: 'admin' },
        { role_id: 2, role_name: 'proctor' },
        { role_id: 3, role_name: 'student' },
    ];

    for (const role of roles) {
        await prisma.roles.upsert({
            where: { role_id: role.role_id },
            update: { role_name: role.role_name },
            create: role,
        });
    }
    console.log('Roles seeded.');

    // 2. Seed Departments
    const departments = [
        { name: 'School of Arts, Sciences, and Education', code: 'SASE' },
        { name: 'School of Engineering, Computing, and Architecture', code: 'SECA' },
        { name: 'Senior High School', code: 'SHS' },
        { name: 'School of Business, Management, and Accountancy', code: 'SBMA' },
    ];

    for (const dept of departments) {
        const existing = await prisma.departments.findFirst({
            where: { department_name: dept.name }
        });
        
        if (!existing) {
            await prisma.departments.create({
                data: {
                    department_name: dept.name,
                    department_code: dept.code,
                    created_at: new Date()
                }
            });
        }
    }
    console.log('Departments seeded.');

    // 3. Create Admin User
    const adminEmail = 'admin@sentinel.com';
    const adminPassword = 'password123';

    // Check if user already exists in Supabase Auth (best effort via sign up)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
    });

    if (authError) {
        if (authError.message === 'User already registered') {
            console.log(`User ${adminEmail} already exists.`);
        } else {
            console.error('Error creating admin user:', authError.message);
        }
    } else if (authData.user) {
        console.log(`Created user ${adminEmail} with ID: ${authData.user.id}`);
        
        // Confirm User Email (DB Direct Update)
        try {
            await prisma.users.update({
                where: { id: authData.user.id },
                data: { 
                    email_confirmed_at: new Date(),
                    confirmation_token: null, // Clear token
                    role: 'admin' // Update the role column in auth.users if it exists and is used
                }
            });
            console.log('Admin email confirmed.');

            // Upgrade to Admin Role (User Roles Table)
            // Ensure connection in user_roles
            await prisma.user_roles.upsert({
                where: { 
                    user_id_role_id: {
                        user_id: authData.user.id,
                        role_id: 1 // Admin
                    }
                },
                update: {},
                create: {
                    user_id: authData.user.id,
                    role_id: 1
                }
            });
             console.log('Admin role assigned.');

        } catch (dbError) {
            console.error('Error updating admin user in DB:', dbError);
        }
    }

    // 4. Create Proctor User (Optional)
    const proctorEmail = 'proctor@sentinel.com';
    const proctorPassword = 'password123';

    const { data: procData, error: procError } = await supabase.auth.signUp({
        email: proctorEmail,
        password: proctorPassword,
    });

    if (procError) {
         if (procError.message === 'User already registered') {
            console.log(`User ${proctorEmail} already exists.`);
        } else {
            console.error('Error creating proctor user:', procError.message);
        }
    } else if (procData.user) {
         console.log(`Created user ${proctorEmail}`);
         try {
             await prisma.users.update({
                where: { id: procData.user.id },
                data: { email_confirmed_at: new Date() }
            });
            
            await prisma.user_roles.upsert({
                where: { 
                    user_id_role_id: {
                        user_id: procData.user.id,
                        role_id: 2 // Proctor
                    }
                },
                update: {},
                create: {
                    user_id: procData.user.id,
                    role_id: 2
                }
            });
            console.log('Proctor role assigned.');
         } catch (e) {
             console.error('Error setting proctor role:', e);
         }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
