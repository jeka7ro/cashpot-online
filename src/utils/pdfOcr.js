/**
 * Client-side PDF OCR
 * 
 * Loads pdf.js from CDN (avoids ALL Vite/Rollup bundling issues)
 * Uses tesseract.js (npm) for OCR
 */
import Tesseract from 'tesseract.js';

// Load pdf.js from CDN via script tag — bulletproof, no bundling
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
    script.type = 'module';
    // For module scripts, we need a different approach — use classic JS
    script.remove();
    
    const classicScript = document.createElement('script');
    classicScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.js';
    classicScript.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) {
        reject(new Error('pdfjsLib not found on window after loading'));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js';
      console.log('[OCR] pdf.js v4.4.168 loaded from CDN');
      resolve(lib);
    };
    classicScript.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
    document.head.appendChild(classicScript);
  });
}

/**
 * Extract text from a PDF
 * @param {string} base64DataUrl - PDF as data:application/pdf;base64,...
 * @param {function} onProgress - Optional (stage, percent) callback
 * @returns {Promise<string>} extracted text
 */
export async function extractTextFromPdf(base64DataUrl, onProgress) {
  const notify = (stage, pct) => onProgress && onProgress(stage, pct);

  try {
    notify('Încărcare pdf.js...', 2);
    const pdfjsLib = await loadPdfJs();

    notify('Deschidere PDF...', 5);
    const base64 = base64DataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const totalPages = Math.min(pdf.numPages, 2);
    console.log('[OCR] PDF loaded:', totalPages, 'pages');

    // Try direct text first
    notify('Extragere text...', 10);
    let directText = '';
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      directText += content.items.map(item => item.str).join(' ') + '\n';
    }

    if (directText.replace(/\s/g, '').length > 100) {
      console.log('[OCR] Direct text OK:', directText.length, 'chars');
      notify('Text extras!', 100);
      return directText;
    }

    // Scanned PDF — render + OCR
    console.log('[OCR] Direct text too short, starting Tesseract OCR...');
    notify('Pregătire OCR...', 15);

    const worker = await Tesseract.createWorker('ron');
    console.log('[OCR] Tesseract worker ready');

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

      const imgData = canvas.toDataURL('image/png');
      const result = await worker.recognize(imgData);
      fullText += result.data.text + '\n';
      console.log(`[OCR] Page ${pageNum}: ${result.data.text.length} chars`);
    }

    await worker.terminate();
    notify('OCR finalizat!', 100);
    console.log('[OCR] Total:', fullText.length, 'chars');
    return fullText;
  } catch (err) {
    console.error('[OCR] FATAL:', err);
    throw err;
  }
}
