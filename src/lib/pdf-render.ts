import { definePDFJSModule, getDocumentProxy, renderPageAsImage } from 'unpdf';

let pdfjsModuleReady: Promise<void> | null = null;

function ensurePdfjsModule(): Promise<void> {
  if (!pdfjsModuleReady) {
    // unpdf's default serverless pdf.js build doesn't support page rendering;
    // the official Node "legacy" build does.
    pdfjsModuleReady = definePDFJSModule(() => import('pdfjs-dist/legacy/build/pdf.mjs'));
  }
  return pdfjsModuleReady;
}

/**
 * Renders the given 1-indexed page numbers of a PDF to PNG buffers.
 * Returns a map of pageNumber -> PNG bytes. Pages that fail to render are
 * simply omitted rather than failing the whole batch.
 */
export async function renderPdfPages(
  pdfBytes: Uint8Array,
  pageNumbers: number[],
): Promise<Map<number, Buffer>> {
  await ensurePdfjsModule();

  const pdf = await getDocumentProxy(pdfBytes);
  const uniquePages = [...new Set(pageNumbers)].filter((p) => p >= 1 && p <= pdf.numPages);

  const results = new Map<number, Buffer>();
  for (const pageNumber of uniquePages) {
    try {
      const imageBuffer = await renderPageAsImage(pdf, pageNumber, {
        scale: 1.5,
        canvasImport: () => import('@napi-rs/canvas'),
      });
      results.set(pageNumber, Buffer.from(imageBuffer));
    } catch {
      // Skip pages that fail to render (e.g. unusual encodings) — the
      // caller treats a missing page image as "no photo available".
    }
  }
  return results;
}
