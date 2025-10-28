import React from 'react'
import { Eye, Download, FileText } from 'lucide-react'

const PDFViewer = ({ 
  pdfUrl, 
  title = "Document PDF", 
  placeholder = "Nu există document de afișat",
  placeholderSubtext = "Atașează un document PDF pentru vizualizare"
}) => {
  if (!pdfUrl) {
    return (
      <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-700 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">{placeholder}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{placeholderSubtext}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600 overflow-hidden">
        <iframe
          src={pdfUrl}
          className="w-full h-[600px]"
          title={title}
        />
      </div>
      <div className="flex space-x-3">
        <button
          onClick={() => window.open(pdfUrl, '_blank')}
          className="flex-1 btn-primary flex items-center justify-center space-x-2"
        >
          <Eye className="w-4 h-4" />
          <span>Vizualizează</span>
        </button>
        <button
          onClick={() => window.open(pdfUrl, '_blank')}
          className="flex-1 btn-secondary flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>Descarcă</span>
        </button>
      </div>
    </div>
  )
}

export default PDFViewer

