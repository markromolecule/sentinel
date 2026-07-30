import PDFDocument from 'pdfkit';
import { PDF_LAYOUT } from './pdf-page-layout';

export interface HeaderConfig {
    logo_visible?: boolean;
    logo_placement?: 'LEFT' | 'RIGHT' | 'CENTER';
    logo_max_size_px?: number;
    title_text?: string;
    title_alignment?: 'LEFT' | 'RIGHT' | 'CENTER';
    subtitle_text?: string | null;
    subtitle_alignment?: 'LEFT' | 'RIGHT' | 'CENTER';
    divider_visible?: boolean;
    divider_color?: string;
    accent_color?: string;
    sentinel_logo_visible?: boolean;
}

/**
 * Renders the header on the current page of the PDF.
 *
 * @param doc PDFKit document instance
 * @param config header configuration
 * @param logoBuffer optional PNG buffer of the institution logo
 * @param sentinelLogoBuffer optional PNG buffer of the Sentinel logo
 */
export function renderPdfHeader(
    doc: typeof PDFDocument,
    config: HeaderConfig,
    logoBuffer?: Buffer | null,
    sentinelLogoBuffer?: Buffer | null,
): void {
    const startY = PDF_LAYOUT.headerY;
    let endY = PDF_LAYOUT.marginTop - 15;

    doc.save();

    // 1. Draw Accent Strip if configured
    if (config.accent_color) {
        doc.rect(0, 0, PDF_LAYOUT.pageWidth, 8).fill(config.accent_color);
    }

    const drawMainLogo = config.logo_visible && logoBuffer;
    const isCenterLogo = drawMainLogo && config.logo_placement === 'CENTER';

    let logoWidth = 50;
    let logoHeight = 30;
    if (config.logo_max_size_px) {
        const sizePt = config.logo_max_size_px * 0.75;
        if (isCenterLogo) {
            logoWidth = Math.min(sizePt, 80);
            logoHeight = Math.min(sizePt * 0.4, 20);
        } else {
            logoWidth = Math.min(sizePt * 1.5, 140);
            logoHeight = Math.min(sizePt, 32);
        }
    }

    let logoX = PDF_LAYOUT.marginLeft;
    let logoY = startY;

    // Draw main institution logo if visible & provided
    if (drawMainLogo && logoBuffer) {
        if (config.logo_placement === 'RIGHT') {
            logoX = PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight - logoWidth;
        } else if (config.logo_placement === 'CENTER') {
            logoX = (PDF_LAYOUT.pageWidth - logoWidth) / 2;
        }
        try {
            doc.image(logoBuffer, logoX, logoY, {
                fit: [logoWidth, logoHeight],
                align:
                    config.logo_placement === 'RIGHT'
                        ? 'right'
                        : config.logo_placement === 'CENTER'
                          ? 'center'
                          : undefined,
                valign: 'center',
            });
        } catch (e) {
            // Fallback: draw box with text if image corrupt
            doc.rect(logoX, logoY, logoWidth, logoHeight)
                .strokeColor(PDF_LAYOUT.colors.border)
                .stroke();
        }
    }

    // Draw Sentinel Co-Branding Logo if visible
    if (config.sentinel_logo_visible && sentinelLogoBuffer) {
        // Position Sentinel logo on the opposite side of the main logo
        let sLogoX = PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight - 60;
        if (drawMainLogo && config.logo_placement === 'RIGHT') {
            sLogoX = PDF_LAYOUT.marginLeft;
        }
        const sLogoY = startY + (isCenterLogo ? 0 : 5);
        try {
            doc.image(sentinelLogoBuffer, sLogoX, sLogoY, {
                fit: [60, 15],
                align: 'right',
                valign: 'center',
            });
        } catch (e) {
            // Silent ignore or simple text
            doc.fontSize(8).fillColor(PDF_LAYOUT.colors.textLight).text('SENTINEL', sLogoX, sLogoY);
        }
    }

    // 2. Draw Title and Subtitle
    const titleText = config.title_text || 'Report';
    const subtitleText = config.subtitle_text || '';

    // Calculate title bounds to avoid overlapping the logo
    let textX = PDF_LAYOUT.marginLeft;
    let textWidth = PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginLeft - PDF_LAYOUT.marginRight;
    let textY = startY + 2;
    let titleFontSize = 13;
    let subtitleFontSize = 9;

    if (drawMainLogo && logoBuffer) {
        if (config.logo_placement === 'LEFT') {
            textX = PDF_LAYOUT.marginLeft + logoWidth + 15;
            textWidth = PDF_LAYOUT.pageWidth - textX - PDF_LAYOUT.marginRight;
        } else if (config.logo_placement === 'RIGHT') {
            textWidth = logoX - PDF_LAYOUT.marginLeft - 15;
        } else if (config.logo_placement === 'CENTER') {
            textY = startY + logoHeight + 2;
            titleFontSize = 11;
            subtitleFontSize = 8;
            endY = PDF_LAYOUT.marginTop - 6;
        }
    }

    doc.fillColor(PDF_LAYOUT.colors.textPrimary);

    // Draw Title
    doc.font(PDF_LAYOUT.fonts.bold).fontSize(titleFontSize);

    const titleAlign = isCenterLogo
        ? 'center'
        : (config.title_alignment?.toLowerCase() as any) || 'left';
    doc.text(titleText, textX, textY, {
        width: textWidth,
        align: titleAlign,
        lineBreak: false,
    });

    // Draw Subtitle if present
    if (subtitleText) {
        doc.font(PDF_LAYOUT.fonts.regular)
            .fontSize(subtitleFontSize)
            .fillColor(PDF_LAYOUT.colors.textSecondary);

        const subtitleAlign = isCenterLogo
            ? 'center'
            : (config.subtitle_alignment?.toLowerCase() as any) || 'left';
        doc.text(subtitleText, textX, textY + titleFontSize + 2, {
            width: textWidth,
            align: subtitleAlign,
            lineBreak: false,
        });
    }

    // 3. Draw Header Divider
    if (config.divider_visible !== false) {
        const divColor = config.divider_color || PDF_LAYOUT.colors.border;
        doc.moveTo(PDF_LAYOUT.marginLeft, endY)
            .lineTo(PDF_LAYOUT.pageWidth - PDF_LAYOUT.marginRight, endY)
            .strokeColor(divColor)
            .lineWidth(0.75)
            .stroke();
    }

    doc.restore();
}
