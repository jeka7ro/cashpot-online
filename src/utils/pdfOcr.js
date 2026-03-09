/**
 * Client-side PDF OCR using pdfjs-dist + tesseract.js
 * 
 * This runs entirely in the browser — no server-side OCR needed.
 * pdfjs-dist renders PDF pages to canvas, tesseract.js does OCR on the canvas image.
 */
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set PDFJS worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extract text from a PDF file using OCR (client-side)
 * @param {string} base64DataUrl - The PDF as a data URL (data:application/pdf;base64,...)
 * @param {function} onProgress - Optional progress callback (stage, percent)
 * @returns {Promise<string>} - Extracted text from all pages
 */
export async function extractTextFromPdf(base64DataUrl, onProgress) {
  const notify = (stage, pct) => onProgress && onProgress(stage, pct);

  try {
    // Step 1: Load PDF
    notify('Încărcare PDF...', 5);
    const base64 = base64DataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const totalPages = Math.min(pdf.numPages, 2); // Max 2 pages

    // Step 2: Try text extraction first (works on text-based PDFs)
    notify('Extragere text direct...', 10);
    let directText = '';
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      directText += content.items.map(item => item.str).join(' ') + '\n';
    }

    if (directText.trim().length > 100) {
      notify('Text extras direct din PDF!', 100);
      return directText;
    }

    // Step 3: PDF is image-based — render each page + OCR
    notify('PDF scanat detectat. Pregătire OCR...', 15);

    // Create Tesseract worker (downloads ~15MB trained data once, cached after)
    const worker = await Tesseract.createWorker('ron', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          notify('OCR în progres...', 20 + Math.round((m.progress || 0) * 70));
        }
      }
    });

    let fullText = '';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      notify(`OCR pagina ${pageNum}/${totalPages}...`, 20 + ((pageNum - 1) / totalPages) * 70);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 }); // Good quality for OCR
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convert canvas to image data for Tesseract
      const imageData = canvas.toDataURL('image/png');
      const result = await worker.recognize(imageData);
      fullText += result.data.text + '\n';
    }

    await worker.terminate();
    notify('OCR finalizat!', 100);

    return fullText;
  } catch (err) {
    console.error('[Client OCR] Error:', err);
    throw err;
  }
}
