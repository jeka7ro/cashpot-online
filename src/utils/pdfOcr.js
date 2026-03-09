/**
 * Client-side PDF OCR using pdfjs-dist + tesseract.js
 * Runs entirely in the browser — no server-side OCR needed.
 */
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Use CDN for the worker — avoids Vite/Rollup bundling issues
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

/**
 * Extract text from a PDF using client-side OCR
 * @param {string} base64DataUrl - PDF as data URL
 * @param {function} onProgress - Optional (stage, percent) callback
 * @returns {Promise<string>} extracted text
 */
export async function extractTextFromPdf(base64DataUrl, onProgress) {
  const notify = (stage, pct) => onProgress && onProgress(stage, pct);

  try {
    notify('Încărcare PDF...', 5);
    
    const base64 = base64DataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let pdf;
    try {
      pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    } catch (pdfErr) {
      console.error('[OCR] PDF.js failed to load document:', pdfErr.message);
      // Try without worker as fallback
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    }
    
    const totalPages = Math.min(pdf.numPages, 2);

    // Step 1: Try direct text extraction (text-based PDFs)
    notify('Extragere text...', 10);
    let directText = '';
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      directText += content.items.map(item => item.str).join(' ') + '\n';
    }

    if (directText.replace(/\s/g, '').length > 100) {
      console.log('[OCR] Direct text extraction: ' + directText.length + ' chars');
      notify('Text extras!', 100);
      return directText;
    }

    // Step 2: Scanned PDF — render to canvas + OCR
    console.log('[OCR] Direct text too short (' + directText.replace(/\s/g, '').length + ' chars), starting OCR...');
    notify('PDF scanat. Pregătire OCR...', 15);
    
    const worker = await Tesseract.createWorker('ron');
    console.log('[OCR] Tesseract worker created');

    let fullText = '';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      notify(`OCR pagina ${pageNum}/${totalPages}...`, 15 + ((pageNum - 1) / totalPages) * 75);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      console.log(`[OCR] Page ${pageNum} rendered: ${canvas.width}x${canvas.height}`);

      const imageData = canvas.toDataURL('image/png');
      const result = await worker.recognize(imageData);
      fullText += result.data.text + '\n';
      console.log(`[OCR] Page ${pageNum}: ${result.data.text.length} chars extracted`);
    }

    await worker.terminate();
    notify('OCR finalizat!', 100);
    console.log('[OCR] Total: ' + fullText.length + ' chars from ' + totalPages + ' pages');
    return fullText;
  } catch (err) {
    console.error('[OCR] Error:', err);
    throw err;
  }
}
