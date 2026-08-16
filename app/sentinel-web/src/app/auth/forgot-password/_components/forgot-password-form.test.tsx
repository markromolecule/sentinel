import { render, screen, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { ForgotPasswordForm } from './forgot-password-form';
import { useForm } from 'react-hook-form';
import React from 'react';

function TestForgotPasswordForm({ errors = {} }: { errors?: any }) {
    const form = useForm({
        defaultValues: {
            email: '',
        },
    });
    // Inject errors manually for testing
    React.useEffect(() => {
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([key, val]: [any, any]) => {
                form.setError(key, val);
            });
        }
    }, [errors]);

    return (
        <ForgotPasswordForm
            form={form}
            authError={null}
            isLoading={false}
            onSubmit={vi.fn()}
        />
    );
}

afterEach(() => {
    cleanup();
});

describe('ForgotPasswordForm', () => {
    it('renders the email input field and submit button', () => {
        render(<TestForgotPasswordForm />);
        
        const emailInput = screen.getByPlaceholderText('doe@example.com');
        expect(emailInput).toBeTruthy();
        expect(emailInput.getAttribute('type')).toBe('email');

        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
        expect(submitButton).toBeTruthy();
    });

    it('displays validation errors when present', () => {
        render(<TestForgotPasswordForm errors={{ email: { message: 'Invalid email address' } }} />);
        
        const errorMessage = screen.getByText('Invalid email address');
        expect(errorMessage).toBeTruthy();
    });
});
