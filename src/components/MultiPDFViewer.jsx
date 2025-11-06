import React, { useState } from 'react'
import { Eye, Download, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react'

const MultiPDFViewer = ({ 
  files = [], 
  title = "Documente",
  placeholder = "Nu există documente de afișat",
  placeholderSubtext = "Atașează documente pentru vizualizare",
  onDelete = null
}) => {
  const [activeFileIndex, setActiveFileIndex] = useState(0)
  const [showFullscreen, setShowFullscreen] = useState(false)

  // Normalize files to array format
  const normalizedFiles = Array.isArray(files) ? files : (files ? [files] : [])
  
  // Helper function to get absolute URL for backend files
  const getAbsoluteUrl = (url) => {
    if (!url) return null
    // Already absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    // Data URL (base64)
    if (url.startsWith('data:')) return url
    // Blob URL
    if (url.startsWith('blob:')) return url
    // Relative URL - make absolute using backend URL
    const backendUrl = import.meta.env.PROD 
      ? 'https://cashpot-backend.onrender.com' 
      : 'http://localhost:5001'
    return `${backendUrl}${url.startsWith('/') ? url : '/' + url}`
  }
  
  if (normalizedFiles.length === 0) {
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

  const activeFile = normalizedFiles[activeFileIndex]
  const rawFileUrl = activeFile?.url || activeFile?.file_path || activeFile
  const fileUrl = getAbsoluteUrl(rawFileUrl)

  return (
    <div className="space-y-4">
      {/* File Selector - Show if multiple files */}
      {normalizedFiles.length > 1 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {title} ({activeFileIndex + 1}/{normalizedFiles.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveFileIndex(Math.max(0, activeFileIndex - 1))}
                disabled={activeFileIndex === 0}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Document anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveFileIndex(Math.min(normalizedFiles.length - 1, activeFileIndex + 1))}
                disabled={activeFileIndex === normalizedFiles.length - 1}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Document următor"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* File thumbnails/list */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {normalizedFiles.map((file, index) => {
              const name = file?.name || file?.type || `Document ${index + 1}`
              const isActive = index === activeFileIndex
              return (
                <button
                  key={index}
                  onClick={() => setActiveFileIndex(index)}
                  className={`p-2 rounded-lg border-2 transition-all text-left ${
                    isActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                      : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {name}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Current File Info */}
      <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {activeFile?.name || activeFile?.type || `Document ${activeFileIndex + 1}`}
            </span>
          </div>
          {activeFile?.type && (
            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
              {activeFile.type}
            </span>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-600 overflow-hidden relative">
        {fileUrl ? (
          <iframe
            src={fileUrl}
            className="w-full h-[700px]"
            title={activeFile?.name || `Document ${activeFileIndex + 1}`}
          />
        ) : (
          <div className="h-[700px] flex items-center justify-center">
            <div className="text-center text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Fișier indisponibil</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => window.open(fileUrl, '_blank')}
          className="flex-1 btn-primary flex items-center justify-center space-x-2"
          disabled={!fileUrl}
        >
          <Eye className="w-4 h-4" />
          <span>Vizualizează Fullscreen</span>
        </button>
        <button
          onClick={() => {
            const link = document.createElement('a')
            link.href = fileUrl
            link.download = activeFile?.name || `document-${activeFileIndex + 1}.pdf`
            link.click()
          }}
          className="flex-1 btn-secondary flex items-center justify-center space-x-2"
          disabled={!fileUrl}
        >
          <Download className="w-4 h-4" />
          <span>Descarcă</span>
        </button>
        {onDelete && activeFile && (
          <button
            onClick={() => {
              if (window.confirm(`Sigur vrei să ștergi "${activeFile?.name || 'acest document'}"?`)) {
                onDelete(activeFile)
              }
            }}
            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Șterge</span>
          </button>
        )}
      </div>

      {/* All Files List */}
      {normalizedFiles.length > 1 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Toate Documentele ({normalizedFiles.length})
          </h4>
          <div className="space-y-2">
            {normalizedFiles.map((file, index) => {
              const rawFUrl = file?.url || file?.file_path || file
              const fUrl = getAbsoluteUrl(rawFUrl)
              const fName = file?.name || file?.type || `Document ${index + 1}`
              const isActive = index === activeFileIndex
              
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    }`}>
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isActive ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {fName}
                      </p>
                      {file?.type && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{file.type}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setActiveFileIndex(index)}
                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Vezi în viewer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.open(fUrl, '_blank')}
                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                      title="Deschide în tab nou"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Sigur vrei să ștergi "${fName}"?`)) {
                            onDelete(file)
                          }
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Șterge"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiPDFViewer

