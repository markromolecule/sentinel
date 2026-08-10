/**
 * Extracts a two-character initials string from a user's name or email.
 *
 * @param firstName User's first name.
 * @param lastName User's last name.
 * @param email User's email address.
 */
export function getUserAvatarInitials(
    firstName?: string | null,
    lastName?: string | null,
    email?: string | null
): string {
    const fName = firstName?.trim() || '';
    const lName = lastName?.trim() || '';

    if (fName || lName) {
        const firstInitial = fName ? fName[0] : '';
        const lastInitial = lName ? lName[0] : '';
        return `${firstInitial}${lastInitial}`.toUpperCase();
    }

    if (email) {
        const parts = email.split('@')[0].split(/[._-]/);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }

    return 'U';
}

/**
 * Intercepts Dicebear SVG avatar URLs and converts them to PNG.
 * React Native does not natively support rendering SVG files using <Image />.
 *
 * @param url The avatar URL to process.
 */
export function resolveAvatarUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    if (url.includes('api.dicebear.com') && url.includes('/svg')) {
        return url.replace('/svg', '/png');
    }
    return url;
}
