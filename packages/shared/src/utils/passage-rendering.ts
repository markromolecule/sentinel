import type { PassageType } from '../types';

const ALLOWED_TAGS = new Set([
    'h2',
    'h3',
    'h4',
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ol',
    'ul',
    'li',
    'a',
    'img',
    'code',
    'pre',
    'blockquote',
]);

const VOID_TAGS = new Set(['br', 'img']);
const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttr(value: string) {
    return escapeHtml(value).replaceAll('`', '&#96;');
}

function isAllowedAbsoluteUrl(value: string) {
    try {
        const parsed = new URL(value);
        return ALLOWED_SCHEMES.has(parsed.protocol);
    } catch {
        return false;
    }
}

function isAllowedImageSrc(value: string) {
    if (value.startsWith('/')) {
        return true;
    }

    return isAllowedAbsoluteUrl(value);
}

function parseAttributes(rawAttributes: string) {
    const attributes: Array<{ name: string; value: string }> = [];
    const attributePattern =
        /([a-zA-Z_:][a-zA-Z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match: RegExpExecArray | null;

    while ((match = attributePattern.exec(rawAttributes)) !== null) {
        attributes.push({
            name: match[1].toLowerCase(),
            value: match[2] ?? match[3] ?? match[4] ?? '',
        });
    }

    return attributes;
}

function sanitizeAllowedTag(tagName: string, rawAttributes: string, selfClosing: boolean) {
    if (!ALLOWED_TAGS.has(tagName)) {
        return null;
    }

    if (VOID_TAGS.has(tagName)) {
        selfClosing = true;
    }

    const attributes = parseAttributes(rawAttributes);

    if (tagName === 'br') {
        return '<br />';
    }

    if (tagName === 'img') {
        const src = attributes.find((attribute) => attribute.name === 'src')?.value ?? '';
        const alt = attributes.find((attribute) => attribute.name === 'alt')?.value ?? '';

        if (!alt.trim() || !isAllowedImageSrc(src)) {
            return '';
        }

        return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
    }

    const serializedAttributes: string[] = [];

    if (tagName === 'a') {
        const href = attributes.find((attribute) => attribute.name === 'href')?.value;
        if (href && isAllowedAbsoluteUrl(href)) {
            serializedAttributes.push(`href="${escapeAttr(href)}"`);
        }

        serializedAttributes.push('rel="noopener noreferrer nofollow"');
    }

    if (tagName === 'code' || tagName === 'pre') {
        const language = attributes.find((attribute) => attribute.name === 'data-language')?.value;
        if (language) {
            serializedAttributes.push(`data-language="${escapeAttr(language)}"`);
        }
    }

    return selfClosing
        ? `<${tagName}${serializedAttributes.length ? ` ${serializedAttributes.join(' ')}` : ''} />`
        : `<${tagName}${serializedAttributes.length ? ` ${serializedAttributes.join(' ')}` : ''}>`;
}

/**
 * Escapes plain passage text and preserves line breaks with <br /> markers.
 */
export function renderPlainPassage(value: string) {
    return escapeHtml(value).replaceAll(/\r?\n/g, '<br />');
}

/**
 * Sanitizes a passage authored as HTML using the shared passage allow-list.
 */
export function sanitizePassageHtml(value: string) {
    const tokenPattern = /<!--[\s\S]*?-->|<\/?[a-zA-Z0-9-]+(?:\s[^<>]*?)?>/g;
    let lastIndex = 0;
    let output = '';
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(value)) !== null) {
        output += escapeHtml(value.slice(lastIndex, match.index));

        const token = match[0];

        if (token.startsWith('<!--')) {
            lastIndex = tokenPattern.lastIndex;
            continue;
        }

        const isClosing = token.startsWith('</');
        const isSelfClosing = token.endsWith('/>');
        const parsed = token.match(/^<\/?\s*([a-zA-Z0-9-]+)\s*([^>]*)>?$/);

        if (!parsed) {
            output += escapeHtml(token);
            lastIndex = tokenPattern.lastIndex;
            continue;
        }

        const tagName = parsed[1].toLowerCase();
        const rawAttributes = parsed[2] ?? '';
        const sanitizedTag = isClosing
            ? ALLOWED_TAGS.has(tagName)
                ? `</${tagName}>`
                : escapeHtml(token)
            : sanitizeAllowedTag(tagName, rawAttributes, isSelfClosing);

        output += sanitizedTag ?? '';
        lastIndex = tokenPattern.lastIndex;
    }

    output += escapeHtml(value.slice(lastIndex));

    return output;
}

export type RenderedPassage = {
    html: string;
    isHtml: boolean;
};

/**
 * Normalizes a question passage into renderable HTML or returns null when empty.
 */
export function renderPassage(args: {
    passageContent?: string | null;
    passageType?: PassageType | null;
    sourceEvidence?: string | null;
    fallbackToSourceEvidence?: boolean;
}): RenderedPassage | null {
    const passageContent = args.passageContent?.trim() ?? '';
    const legacyEvidence = args.sourceEvidence?.trim() ?? '';
    const fallbackToSourceEvidence = args.fallbackToSourceEvidence ?? true;

    if (passageContent) {
        if (args.passageType === 'html') {
            return {
                html: sanitizePassageHtml(passageContent),
                isHtml: true,
            };
        }

        return {
            html: renderPlainPassage(passageContent),
            isHtml: true,
        };
    }

    if (legacyEvidence && fallbackToSourceEvidence) {
        return {
            html: renderPlainPassage(legacyEvidence),
            isHtml: true,
        };
    }

    return null;
}
