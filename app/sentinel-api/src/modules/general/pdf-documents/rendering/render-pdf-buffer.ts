import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { PDF_LAYOUT } from './pdf-page-layout';
import { renderPdfHeader, HeaderConfig } from './pdf-header-renderer';
import { renderPdfFooter, FooterConfig } from './pdf-footer-renderer';

let cachedSentinelLogo: Buffer | null = null;

/**
 * Loads the Sentinel co-branding logo and converts it to a PNG buffer on the fly.
 * Uses sharp for robust SVG rendering.
 *
 * @returns PNG logo buffer or null if load fails
 */
export async function getSentinelLogoBuffer(): Promise<Buffer | null> {
    if (cachedSentinelLogo) return cachedSentinelLogo;
    try {
        const svgPath = path.join(__dirname, 'assets/sentinel-logo.svg');
        if (!fs.existsSync(svgPath)) {
            return null;
        }
        const svg = await fs.promises.readFile(svgPath);
        cachedSentinelLogo = await sharp(svg).png().toBuffer();
        return cachedSentinelLogo;
    } catch (e) {
        return null;
    }
}

/**
 * Compiles a deterministic PDF buffer. First generates all document body content
 * using the bodyRenderer callback, then switch-pages in a second pass to stamp
 * headers, footers, and page numbers.
 *
 * @param headerConfig header layout parameters
 * @param footerConfig footer layout parameters
 * @param logoBuffer optional PNG buffer of the institution logo
 * @param bodyRenderer function to draw the main content of the PDF
 * @returns binary PDF document buffer
 */
export async function renderPdfDocumentBuffer(
    headerConfig: HeaderConfig,
    footerConfig: FooterConfig,
    logoBuffer: Buffer | null,
    bodyRenderer: (doc: typeof PDFDocument) => void | Promise<void>,
): Promise<Buffer> {
    // 1. Initialize PDFKit document with bufferedPages enabled
    const doc = new PDFDocument({
        size: 'A4',
        margins: {
            top: PDF_LAYOUT.marginTop,
            bottom: PDF_LAYOUT.marginBottom,
            left: PDF_LAYOUT.marginLeft,
            right: PDF_LAYOUT.marginRight,
        },
        bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const promise = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        doc.on('error', reject);
    });

    // 2. Execute body renderer callback
    await bodyRenderer(doc);

    // 3. Resolve Sentinel Logo buffer if co-branding is enabled
    const sentinelLogo = headerConfig.sentinel_logo_visible ? await getSentinelLogoBuffer() : null;

    // 4. Second Pass: Apply headers and footers on each buffered page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        
        // Temporarily clear margins to prevent auto-page wrapping during header/footer stamping
        const oldMargins = doc.page.margins;
        doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
        
        try {
            renderPdfHeader(doc, headerConfig, logoBuffer, sentinelLogo);
            renderPdfFooter(doc, footerConfig, i + 1 - range.start, range.count);
        } finally {
            doc.page.margins = oldMargins;
        }
    }

    // 5. Finalize the document
    doc.end();

    return promise;
}
