'use client';

import React from 'react';
import { WebNotificationDropdown } from '../common/web-notification-dropdown';

const NOTIFICATION_QUERY_KEY = ['notifications', 'instructor-header'] as const;

/**
 * Instructor notification dropdown component that delegates to the shared WebNotificationDropdown.
 */
export function InstructorNotificationDropdown() {
    return <WebNotificationDropdown queryKey={NOTIFICATION_QUERY_KEY} />;
}
