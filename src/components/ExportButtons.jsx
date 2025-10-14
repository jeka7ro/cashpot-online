import React from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

const ExportButtons = ({ onExportExcel, onExportPDF, entity }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onExportExcel}
        className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
        title="Exportă în Excel"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Excel</span>
      </button>
      <button
        onClick={onExportPDF}
        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
        title="Exportă în PDF"
      >
        <FileText className="w-4 h-4" />
        <span>PDF</span>
      </button>
    </div>
  )
}

export default ExportButtons

