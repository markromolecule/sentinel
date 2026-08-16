'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    type User,
    type Session,
    type AuthChangeEvent,
    type RealtimeChannel,
} from '@supabase/supabase-js';

export type SentinelSupabaseClient = {
    auth: {
        getSession: () => Promise<{ data: { session: Session | null } }>;
        onAuthStateChange: (
            callback: (event: AuthChangeEvent, session: Session | null) => void,
        ) => {
            data: {
                subscription: {
                    unsubscribe: () => void;
                };
            };
        };
        setSession: (session: {
            access_token: string;
            refresh_token: string;
        }) => Promise<{ error: Error | null } | { data?: unknown; error: Error | null }>;
        signInWithOAuth: (...args: any[]) => Promise<any>;
        resetPasswordForEmail: (
            email: string,
            options?: { redirectTo?: string },
        ) => Promise<{ data: {} | null; error: any }>;
        signOut: (
            ...args: any[]
        ) => Promise<{ error: Error | null } | { data?: unknown; error: Error | null }>;
        updateUser: (...args: any[]) => Promise<any>;
    };
    channel: (name: string, opts?: any) => RealtimeChannel;
    removeChannel: (channel: RealtimeChannel) => Promise<unknown> | unknown;
};

type SupabaseAuthClient = SentinelSupabaseClient;

type AuthContextType = {
    user: User | null;
    session: Session | null;
    token: string | null;
    isLoading: boolean;
    supabase: SupabaseAuthClient | null;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    token: null,
    isLoading: true,
    supabase: null,
});

export const AuthProvider = ({
    children,
    supabase,
}: {
    children: React.ReactNode;
    supabase: SupabaseAuthClient;
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                const {
                    data: { session: initialSession },
                } = await supabase.auth.getSession();
                if (isMounted) {
                    setSession(initialSession);
                    setUser(initialSession?.user ?? null);
                    setToken(initialSession?.access_token ?? null);
                }
            } catch (error) {
                console.error('AuthProvider: Failed to get session:', error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        initAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, currentSession: Session | null) => {
                if (isMounted) {
                    setSession(currentSession);
                    setUser(currentSession?.user ?? null);
                    setToken(currentSession?.access_token ?? null);
                    setIsLoading(false);
                }
            },
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <AuthContext.Provider value={{ user, session, token, isLoading, supabase }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
