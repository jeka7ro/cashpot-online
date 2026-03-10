import React, { useState } from 'react';
import { X, Wand2, Upload, Loader2, Sparkles, FolderOpen, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { extractTextFromPdf } from '../../utils/pdfOcr';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const SmartScanCvtModal = ({ onClose, onScanComplete, onBatchImport }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [parserSource, setParserSource] = useState('');
  const [authorities, setAuthorities] = useState([]);
  const [isLoadingAuthorities, setIsLoadingAuthorities] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [selectedCommission, setSelectedCommission] = useState('');
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);

  // Single file mode
  const [file, setFile] = useState(null);
  const [base64Preview, setBase64Preview] = useState(null);

  // Batch mode
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, results: [] });
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchComplete, setBatchComplete] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  React.useEffect(() => {
    const fetchSelectData = async () => {
      try {
        const [authRes, commRes] = await Promise.all([
          axios.get('/api/authorities'),
          axios.get('/api/commissions').catch(() => ({ data: [] }))
        ]);

        const authData = Array.isArray(authRes.data) ? authRes.data : [];
        setAuthorities(authData);
        if (authData.length > 0) {
          const defaultAuth = authData.find(a => a.name && a.name.includes('BMM'));
          setParserSource(defaultAuth ? defaultAuth.name : authData[0].name);
        } else {
          setParserSource('Altele (General)');
        }

        const comData = Array.isArray(commRes.data) ? commRes.data : [];
        setCommissions(comData);
        if (comData.length > 0) {
          setSelectedCommission(comData[0].name || comData[0].id);
        } else {
          setSelectedCommission('');
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setParserSource('Altele (General)');
      } finally {
        setIsLoadingAuthorities(false);
        setIsLoadingCommissions(false);
      }
    };
    fetchSelectData();
  }, []);

  // === SINGLE FILE HANDLERS ===
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Fișierul este prea mare! Maxim 10MB.');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        setBase64Preview(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSmartParse = async () => {
    if (!base64Preview) {
      toast.error('Adaugă mai întâi un document CVT/PDF pentru scanare!');
      return;
    }

    setIsParsing(true);
    const loadingId = toast.loading('Se extrage textul din PDF...', {
      style: { background: '#1e293b', color: '#f8fafc', border: '1px solid #3b82f6' },
    });

    try {
      // Step 1: Client-side OCR
      let preExtractedText = '';
      try {
        preExtractedText = await extractTextFromPdf(base64Preview, (stage, pct) => {
          toast.loading(`${stage} (${pct}%)`, { id: loadingId });
        });
        console.log('[SmartScan] Client OCR extracted', preExtractedText.length, 'chars');
      } catch (ocrErr) {
        console.warn('[SmartScan] Client OCR failed:', ocrErr.message);
      }

      toast.loading('Se analizează datele extrase...', { id: loadingId });

      // Step 2: Send to backend for regex parsing
      const response = await axios.post('/api/metrology/parse', {
        base64: base64Preview,
        parserSource: parserSource,
        preExtractedText: preExtractedText,
        fileName: file?.name || 'document_nespecificat.pdf'
      });

      if (response.data && response.data.success) {
        const extracted = response.data.data;

        if (!extracted.expiry_date && extracted.cvt_date && (extracted.cvt_type === 'Periodică' || extracted.cvt_type === 'Inițială')) {
          const cvtDateObj = new Date(extracted.cvt_date);
          if (!isNaN(cvtDateObj.getTime())) {
            const expiryDateObj = new Date(cvtDateObj);
            expiryDateObj.setFullYear(expiryDateObj.getFullYear() + 1);
            expiryDateObj.setDate(expiryDateObj.getDate() - 1);
            extracted.expiry_date = expiryDateObj.toISOString().split('T')[0];
          }
        }

        toast.success(response.data.message || 'Date extrase și autocompletate cu succes!', { id: loadingId });

        onScanComplete({
          ...extracted,
          cvt_file: base64Preview,
          cvt_filename: extracted.serial_number ? `${extracted.serial_number}.pdf` : (file?.name || 'Document Scanned.pdf'),
          commission_name: selectedCommission || ''
        });
      } else {
        toast.error('Eroare la procesarea documentului.', { id: loadingId });
      }
    } catch (error) {
      console.error('Parse Error:', error);
      toast.error('Eroare la citirea documentului (Verifică conexiunea).', { id: loadingId });
    } finally {
      setIsParsing(false);
    }
  };

  // === BATCH FILE HANDLERS ===
  const handleBatchFileChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      toast.error('Niciun fișier PDF găsit în selecție.');
      return;
    }
    setBatchFiles(files);
    setBatchComplete(false);
    setBatchProgress({ current: 0, total: files.length, results: [] });
    toast.success(`${files.length} fișiere PDF selectate`);
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Eroare la citirea fișierului'));
      reader.readAsDataURL(file);
    });
  };

  const handleBatchProcess = async () => {
    if (batchFiles.length === 0) return;

    setIsBatchProcessing(true);
    setBatchComplete(false);
    const results = [];

    for (let i = 0; i < batchFiles.length; i++) {
      const currentFile = batchFiles[i];
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const base64 = await readFileAsBase64(currentFile);

        // Client-side OCR first
        let preExtractedText = '';
        try {
          preExtractedText = await extractTextFromPdf(base64);
        } catch (ocrErr) {
          console.warn('[Batch] Client OCR failed for', currentFile.name, ocrErr.message);
        }

        const response = await axios.post('/api/metrology/parse', {
          base64,
          parserSource,
          preExtractedText,
          fileName: currentFile.name
        }, { timeout: 120000 });

        if (response.data && response.data.success) {
          const extracted = response.data.data;

          // Auto-calculate expiry
          if (!extracted.expiry_date && extracted.cvt_date) {
            const d = new Date(extracted.cvt_date);
            if (!isNaN(d.getTime())) {
              d.setFullYear(d.getFullYear() + 1);
              d.setDate(d.getDate() - 1);
              extracted.expiry_date = d.toISOString().split('T')[0];
            }
          }

          const dataToSave = {
            ...extracted,
            cvt_file: base64,
            cvt_filename: extracted.serial_number ? `${extracted.serial_number}${extracted.cvt_date ? '_' + extracted.cvt_date : ''}.pdf` : currentFile.name,
            commission_name: selectedCommission || '',
            cvt_number: extracted.cvt_series || `AUTO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          };

          // Auto-save to database via onBatchImport callback
          let saveResult = { saved: false };
          if (onBatchImport) {
            try {
              saveResult = await onBatchImport(dataToSave);
            } catch (saveErr) {
              saveResult = { saved: false, error: saveErr.message };
            }
          }

          results.push({
            fileName: currentFile.name,
            status: saveResult.saved ? 'success' : 'warning',
            serial: extracted.serial_number || '—',
            provider: extracted.provider || '—',
            message: saveResult.saved ? 'Importat cu succes' : (saveResult.error || 'Extras dar nesalvat'),
            data: dataToSave,
            base64Content: base64,
            finalName: dataToSave.cvt_filename
          });
        } else {
          results.push({
            fileName: currentFile.name,
            status: 'error',
            serial: '—',
            provider: '—',
            message: 'Nu s-au putut extrage date din PDF'
          });
        }
      } catch (err) {
        results.push({
          fileName: currentFile.name,
          status: 'error',
          serial: '—',
          provider: '—',
          message: err.response?.data?.error || err.message || 'Eroare necunoscută'
        });
      }

      setBatchProgress(prev => ({ ...prev, results: [...results] }));
    }

    setIsBatchProcessing(false);
    setBatchComplete(true);

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    if (errorCount === 0) {
      toast.success(`✅ Import complet: ${successCount}/${results.length} importate cu succes`);
    } else {
      toast.error(`⚠️ Import: ${successCount} ok, ${warningCount} avertismente, ${errorCount} erori din ${results.length}`);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const zip = new JSZip();
      let addedAtLeastOne = false;

      batchProgress.results.forEach(res => {
        if (res.status === 'success' && res.base64Content) {
          const base64Data = res.base64Content.split(',')[1];
          if (base64Data) {
             zip.file(res.finalName, base64Data, { base64: true });
             addedAtLeastOne = true;
          }
        }
      });

      if (!addedAtLeastOne) {
         toast.error("Nu există fișiere redenumite valide de descărcat.");
         return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `CVT_Redenumite_${new Date().toISOString().split('T')[0]}.zip`);
      toast.success("Arhiva a fost descărcată!");
    } catch (e) {
      toast.error("Eroare la crearea arhivei ZIP.");
      console.error(e);
    } finally {
       setDownloadingZip(false);
    }
  };

  const successCount = batchProgress.results.filter(r => r.status === 'success').length;
  const errorCount = batchProgress.results.filter(r => r.status === 'error').length;
  const warningCount = batchProgress.results.filter(r => r.status === 'warning').length;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-800 via-blue-800 to-cyan-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {isBatchMode ? 'Import Folder CVT-uri' : 'Scanare AI - CVT din PDF'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => { setIsBatchMode(false); setBatchFiles([]); setBatchComplete(false); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${!isBatchMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            <Sparkles className="w-4 h-4 inline mr-1" /> Un singur fișier
          </button>
          <button
            onClick={() => { setIsBatchMode(true); setFile(null); setBase64Preview(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${isBatchMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
          >
            <FolderOpen className="w-4 h-4 inline mr-1" /> Import folder
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="bg-indigo-50/50 dark:bg-slate-800/50 p-4 md:p-6 rounded-xl border border-indigo-100 dark:border-slate-700 space-y-4">

            {/* Authority Select */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                1. Format Autoritate / Sursă Model *
              </label>
              <select
                value={parserSource}
                onChange={(e) => setParserSource(e.target.value)}
                disabled={isLoadingAuthorities}
                className="w-full px-4 py-3 border border-indigo-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 font-medium disabled:opacity-50"
              >
                {isLoadingAuthorities ? (
                  <option value="">Se încarcă...</option>
                ) : (
                  <>
                    {authorities.map((auth) => (
                      <option key={auth.id || auth.name} value={auth.name}>
                        {auth.name}
                      </option>
                    ))}
                    {!authorities.some(a => a.name === 'Altele (General)') && (
                      <option value="Altele (General)">Altele (General)</option>
                    )}
                  </>
                )}
              </select>
            </div>

            {/* Commission Select */}
            <div className="space-y-2 pt-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                2. Comisie Asociată
              </label>
              <select
                value={selectedCommission}
                onChange={(e) => setSelectedCommission(e.target.value)}
                disabled={isLoadingCommissions || commissions.length === 0}
                className="w-full px-4 py-3 border border-indigo-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 font-medium disabled:opacity-50"
              >
                {isLoadingCommissions ? (
                  <option value="">Se încarcă...</option>
                ) : commissions.length === 0 ? (
                  <option value="">Nicio comisie definită</option>
                ) : (
                  <>
                    <option value="">-- Alege Comisia --</option>
                    {commissions.map((com) => (
                      <option key={com.id} value={com.name || com.id}>
                        {com.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* === SINGLE MODE === */}
            {!isBatchMode && (
              <>
                <div className="space-y-2 pt-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    3. Încarcă Fișierul PDF
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="w-full relative px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:file:bg-slate-600 dark:file:text-slate-300 transition-colors cursor-pointer"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleSmartParse}
                    disabled={isParsing || !base64Preview}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 text-lg ${isParsing || !base64Preview
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                    }`}
                  >
                    {isParsing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
                    {isParsing ? 'Procesare PDF cu AI...' : 'Scanează și Generează CVT'}
                  </button>
                </div>
              </>
            )}

            {/* === BATCH MODE === */}
            {isBatchMode && (
              <>
                <div className="space-y-2 pt-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    3. Selectează Folder sau Mai Multe PDF-uri
                  </label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                      <FolderOpen className="w-5 h-5 text-indigo-600" />
                      <span className="text-sm font-semibold text-indigo-700 dark:text-slate-300">
                        {batchFiles.length > 0 ? `${batchFiles.length} PDF-uri selectate` : 'Alege Folder'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        webkitdirectory=""
                        onChange={handleBatchFileChange}
                        className="hidden"
                      />
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Multi-select</span>
                      <input
                        type="file"
                        accept=".pdf"
                        multiple
                        onChange={handleBatchFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500">Selectează un folder întreg sau mai multe fișiere PDF.</p>
                </div>

                {/* File list preview */}
                {batchFiles.length > 0 && !isBatchProcessing && !batchComplete && (
                  <div className="max-h-40 overflow-y-auto text-xs space-y-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                    {batchFiles.map((f, i) => (
                      <div key={i} className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span className="truncate">{f.name}</span>
                        <span className="text-slate-400 ml-2 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                {(isBatchProcessing || batchComplete) && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {isBatchProcessing ? 'Procesare...' : 'Import Complet'}
                      </span>
                      <span className="text-indigo-600">
                        {batchProgress.current} / {batchProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${batchComplete ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                      />
                    </div>

                    {/* Summary badges */}
                    {batchProgress.results.length > 0 && (
                      <div className="flex gap-3 text-sm">
                        {successCount > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" /> {successCount} OK
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-4 h-4" /> {warningCount} Avertismente
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-4 h-4" /> {errorCount} Erori
                          </span>
                        )}
                      </div>
                    )}

                    {/* Results list */}
                    <div className="max-h-48 overflow-y-auto space-y-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                      {batchProgress.results.map((r, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                          r.status === 'success' ? 'text-green-700 dark:text-green-400' :
                          r.status === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                          'text-red-700 dark:text-red-400'
                        }`}>
                          {r.status === 'success' ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> :
                           r.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> :
                           <XCircle className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate font-medium">{r.fileName}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="shrink-0">{r.serial}</span>
                          <span className="text-slate-400 shrink-0">({r.provider})</span>
                          <span className="ml-auto text-slate-500 shrink-0 text-[10px]">{r.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Batch action buttons */}
                <div className="pt-4 flex flex-col gap-2">
                  {batchComplete && batchProgress.results.some(r => r.status === 'success') && (
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      disabled={downloadingZip}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 text-md bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50"
                    >
                      {downloadingZip ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderOpen className="w-5 h-5" />}
                      {downloadingZip ? 'Se generează arhiva...' : 'Descarcă PDF-uri redenumite (ZIP)'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={batchComplete ? onClose : handleBatchProcess}
                    disabled={isBatchProcessing || (batchFiles.length === 0 && !batchComplete)}
                    className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 text-lg ${
                      isBatchProcessing || (batchFiles.length === 0 && !batchComplete)
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                        : batchComplete
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                    }`}
                  >
                    {isBatchProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : batchComplete ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <FolderOpen className="w-6 h-6" />
                    )}
                    {isBatchProcessing
                      ? `Procesare ${batchProgress.current}/${batchProgress.total}...`
                      : batchComplete
                        ? 'Închide'
                        : `Importă ${batchFiles.length} PDF-uri`}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartScanCvtModal;
