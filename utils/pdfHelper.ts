/**
 * PDF generation helper using html2canvas-pro + jsPDF.
 *
 * html2canvas-pro is a fork of html2canvas that adds support for
 * modern CSS color functions: oklch(), lab(), lch(), oklab() —
 * which Tailwind CSS v4 uses by default.
 */
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export interface PdfOptions {
    /** DOM element ID to render */
    elementId: string;
    /** Output filename (should end with .pdf) */
    filename: string;
    /** Margin in mm — number or [top, right, bottom, left] */
    margin?: number | number[];
}

/**
 * Generate and download a PDF from a DOM element.
 * Returns a promise that resolves when the download is triggered.
 */
export async function downloadPdf(opts: PdfOptions): Promise<void> {
    const element = document.getElementById(opts.elementId);
    if (!element) {
        throw new Error(`Element #${opts.elementId} not found`);
    }

    // 1. Render the element to a canvas using html2canvas-pro (oklch-safe)
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
    });

    // 2. Convert to image data
    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // 3. Compute dimensions for A4
    const margin = opts.margin ?? 0;
    let mt = 0, mr = 0, mb = 0, ml = 0;
    if (typeof margin === 'number') {
        mt = mr = mb = ml = margin;
    } else if (Array.isArray(margin)) {
        [mt = 0, mr = 0, mb = 0, ml = 0] = margin;
    }

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const usableW = pageW - ml - mr;
    const usableH = pageH - mt - mb;

    // Scale image to fit the usable width
    const imgW = usableW;
    const imgH = (canvas.height * usableW) / canvas.width;

    // If the image fits on one page, just add it
    if (imgH <= usableH) {
        pdf.addImage(imgData, 'JPEG', ml, mt, imgW, imgH);
    } else {
        // Multi-page: slice the canvas into page-sized chunks
        let remainingH = imgH;
        let srcY = 0;
        let pageIdx = 0;

        while (remainingH > 0) {
            if (pageIdx > 0) pdf.addPage();

            const sliceH = Math.min(usableH, remainingH);
            // Calculate the source slice from the original canvas
            const srcSliceH = (sliceH / imgH) * canvas.height;

            // Create a temp canvas for this slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.ceil(srcSliceH);
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(
                    canvas,
                    0, srcY, canvas.width, srcSliceH,    // source rect
                    0, 0, canvas.width, srcSliceH         // dest rect
                );
            }

            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
            pdf.addImage(sliceData, 'JPEG', ml, mt, imgW, sliceH);

            srcY += srcSliceH;
            remainingH -= sliceH;
            pageIdx++;
        }
    }

    // 4. Download
    pdf.save(opts.filename);
}
