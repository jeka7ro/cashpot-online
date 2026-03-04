import React, { useState } from 'react';
import { X, Wand2, Upload, Loader2, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const SmartScanCvtModal = ({ onClose, onScanComplete }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [parserSource, setParserSource] = useState('');
  const [authorities, setAuthorities] = useState([]);
  const [isLoadingAuthorities, setIsLoadingAuthorities] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [selectedCommission, setSelectedCommission] = useState('');
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);
  const [file, setFile] = useState(null);
  const [base64Preview, setBase64Preview] = useState(null);

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
          // pre-select first commission
          setSelectedCommission(comData[0].name || comData[0].id);
        } else {
          setSelectedCommission(''); // Nu există comisii setate
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
    const loadingId = toast.loading('Se scanează documentul cu AI...', {
      style: {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #3b82f6',
      },
    });

    try {
      const response = await axios.post('/api/metrology/parse', {
        base64: base64Preview,
        parserSource: parserSource,
        fileName: file?.name || 'document_nespecificat.pdf'
      });

      if (response.data && response.data.success) {
        const extracted = response.data.data;
        toast.success(response.data.message || 'Date extrase și autocompletate cu succes!', { id: loadingId });

        // Pass the extracted data along with the base64 preview backward to Metrology.jsx
        onScanComplete({
          ...extracted,
          cvt_file: base64Preview, // Save the actual PDF
          cvt_filename: file?.name || 'Document Scanned.pdf',
          commission_name: selectedCommission || '' // Trimitere opțională comisie extrasă manual sau prescriptă
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-800 via-blue-800 to-cyan-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Adăugare CVT din PDF (Scanare AI)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4 overflow-y-auto">
          <div className="bg-indigo-50/50 dark:bg-slate-800/50 p-4 md:p-6 rounded-xl border border-indigo-100 dark:border-slate-700 space-y-4">

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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selectarea autorității corecte permite sistemului să identifice formatul exact pentru extragerea textului din PDF.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                2. Comisii din sistem *
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
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Alege comisia responsabilă (opțional integrat în document).
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                3. Încarcă Fișierul PDF
              </label>
              <div className="flex flex-col gap-4">
                <input
                  type="file"
                  name="cvtFile"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full relative px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:border-slate-600 dark:bg-slate-700 dark:file:bg-slate-600 dark:file:text-slate-300 transition-colors cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                onClick={handleSmartParse}
                disabled={isParsing || !base64Preview}
                className={`w-full flex items-center justify-center gap-2 whitespace-nowrap px-6 py-4 rounded-xl font-bold transition-all shadow-md active:scale-95 text-lg ${isParsing || !base64Preview
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-indigo-500/25'
                  }`}
              >
                {isParsing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Sparkles className="w-6 h-6 animate-pulse" />
                )}
                {isParsing ? 'Procesare PDF cu AI...' : 'Scanează și Generează CVT'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartScanCvtModal;
