
import { createSupabaseServerClient } from '@/data/supabase/server';
import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';
    const origin = config.appUrl;

    if (code) {
        const supabase = await createSupabaseServerClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Check User Role and Redirection Logic
            const { data: { user } } = await supabase.auth.getUser();
            const role = user?.user_metadata?.role || 'student';

            if (role === 'student') {
                // Check if student record exists
                const { data: studentData } = await supabase
                    .from('students')
                    .select('student_id')
                    .eq('user_id', user?.id)
                    .single();

                if (studentData) {
                    return NextResponse.redirect(`${origin}/student`);
                } else {
                    return NextResponse.redirect(`${origin}/onboarding`);
                }
            } else if (role === 'proctor') {
                return NextResponse.redirect(`${origin}/proctor`);
            }

            // Default Fallback
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
