import 'dotenv/config';
import { prisma } from '@sentinel/db';

async function main() {
    console.log('--- INSTITUTIONS ---');
    const institutions = await prisma.institutions.findMany();
    for (const inst of institutions) {
        console.log(
            `ID: ${inst.id} | Name: ${inst.name} | Code: ${inst.code} | Kind: ${inst.institution_kind} | CreatedBy: ${inst.created_by}`,
        );
    }

    console.log('\n--- DEPARTMENTS ---');
    const departments = await prisma.departments.findMany();
    for (const dept of departments) {
        console.log(
            `ID: ${dept.department_id} | Name: ${dept.department_name} | Code: ${dept.department_code} | InstitutionID: ${dept.institution_id} | CreatedBy: ${dept.created_by}`,
        );
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
