import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { LoginForm } from './login-form';
import React from 'react';
import { useForm } from 'react-hook-form';

function TestLoginForm() {
    const form = useForm({
        defaultValues: {
            email: '',
            password: '',
            remember: false,
        },
    });
    return <LoginForm form={form} authError={null} isLoading={false} onSubmit={vi.fn()} />;
}

// Mock ResizeObserver for Radix UI components in JSDOM
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

afterEach(() => {
    cleanup();
});

describe('LoginForm on sentinel-core', () => {
    it('renders the login form password input as password type initially', () => {
        render(<TestLoginForm />);
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        expect(passwordInput.getAttribute('type')).toBe('password');
    });

    it('renders the Remember Me checkbox and label', () => {
        render(<TestLoginForm />);
        const rememberCheckbox = screen.getByRole('checkbox', { name: /Remember me/i });
        expect(rememberCheckbox).toBeTruthy();
    });

    it('toggles password visibility when the toggle button is clicked', () => {
        render(<TestLoginForm />);
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        expect(passwordInput.getAttribute('type')).toBe('password');

        const toggleButton = screen.getByLabelText('Toggle password visibility');
        expect(toggleButton).toBeTruthy();

        // Click to show password
        fireEvent.click(toggleButton);
        expect(passwordInput.getAttribute('type')).toBe('text');

        // Click to hide password
        fireEvent.click(toggleButton);
        expect(passwordInput.getAttribute('type')).toBe('password');
    });
});
