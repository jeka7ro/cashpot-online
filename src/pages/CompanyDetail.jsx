import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import { 
  Building2, 
  FileText, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Edit,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Eye
} from 'lucide-react'

const CompanyDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { companies, loading, updateItem, refreshData } = useData()
  const [company, setCompany] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'Contract',
    file: null
  })

  useEffect(() => {
    const foundCompany = companies.find(c => c.id === parseInt(id))
    if (foundCompany) {
      setCompany(foundCompany)
    }
  }, [id, companies])

  // Refresh company data when companies array changes
  useEffect(() => {
    const foundCompany = companies.find(c => c.id === parseInt(id))
    if (foundCompany) {
      setCompany(foundCompany)
    }
  }, [companies, id])

  const handleDocumentUpload = async (e) => {
    e.preventDefault()
    if (!newDocument.file || !newDocument.name) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', newDocument.file)
      formData.append('name', newDocument.name)
      formData.append('type', newDocument.type)
      formData.append('company_id', company.id)

      const response = await fetch('/api/companies/upload-document', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const updatedCompany = await response.json()
        setCompany(updatedCompany)
        setShowUploadModal(false)
        setNewDocument({ name: '', type: 'Contract', file: null })
        
        // Verifică dacă există informații de comprimare PDF
        if (updatedCompany.compression) {
          const { originalSize, compressedSize, compressionRatio, savedBytes } = updatedCompany.compression
          const originalMB = (originalSize / 1024 / 1024).toFixed(2)
          const compressedMB = (compressedSize / 1024 / 1024).toFixed(2)
          const savedKB = (savedBytes / 1024).toFixed(2)
          
          toast.success(
            `Document încărcat cu succes! PDF comprimat: ${originalMB}MB → ${compressedMB}MB (${compressionRatio}% reducere, ${savedKB}KB economisite)`,
            { duration: 6000 }
          )
        } else {
          toast.success('Document încărcat cu succes!')
        }
        
        // Refresh the companies list in the context
        setTimeout(() => {
          refreshData()
        }, 500)
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadDocument = (document) => {
    const link = document.createElement('a')
    link.href = document.file_path
    link.download = document.name
    link.target = '_blank'
    link.click()
  }

  const handleDeleteDocument = async (documentId) => {
    if (window.confirm('Sigur vrei să ștergi acest document?')) {
      try {
        const response = await fetch(`/api/companies/documents/${documentId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          const updatedCompany = await response.json()
          setCompany(updatedCompany)
          
          // Refresh the companies list in the context
          setTimeout(() => {
            refreshData()
          }, 500)
        }
      } catch (error) {
        console.error('Error deleting document:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Se încarcă...</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Compania nu a fost găsită</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Compania pe care o căutați nu există în sistem.</p>
            <button
              onClick={() => navigate('/companies')}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Companii</span>
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/companies')}
              className="btn-secondary flex items-center space-x-2 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Înapoi la Companii</span>
            </button>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl shadow-lg shadow-blue-500/25">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                      {company.name}
                    </h1>
                    <p className="text-slate-600 dark:text-slate-300 text-lg">
                      Detalii complete despre companie
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Atașează Document</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Informații de bază */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Informații Companie
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nume Companie</label>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{company.name}</p>
                  </div>
                  
                  {company.cui && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">CUI</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">{company.cui}</p>
                      {company.cuiFile && (
                        <div className="mt-2 flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (company.cui_file) {
                                const link = document.createElement('a')
                                link.href = company.cui_file
                                link.download = `CUI-${company.name}.pdf`
                                link.click()
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                            title="Previzualizează CUI"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Vezi Document
                          </button>
                          <button
                            onClick={() => {
                              if (company.cui_file) {
                                const link = document.createElement('a')
                                link.href = company.cui_file
                                link.download = `CUI-${company.name}.pdf`
                                link.click()
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                            title="Descarcă CUI"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Descarcă
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {company.contact_person && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Persoană de Contact</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center">
                        <User className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                        {company.contact_person}
                      </p>
                    </div>
                  )}

                  {company.phone && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Telefon</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                        {company.phone}
                      </p>
                    </div>
                  )}

                  {company.email && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                        {company.email}
                      </p>
                    </div>
                  )}

                  {company.address && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Adresă</label>
                      <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                        {company.address}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Data Creării</label>
                    <p className="text-slate-800 dark:text-slate-200 font-medium flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                      {new Date(company.created_at).toLocaleDateString('ro-RO')}
                    </p>
                  </div>

                  {company.status && (
                    <div>
                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 block mb-1">Status</label>
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                        company.status === 'Active' 
                          ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                          : 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800'
                      }`}>
                        {company.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              {company.notes && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-amber-600" />
                    Note
                  </h2>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{company.notes}</p>
                </div>
              )}
            </div>

            {/* Documente și PDF-uri */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-red-600" />
                  Documente Atașate
                </h2>
                
                {(company.documents && company.documents.length > 0) || company.cuiFile ? (
                  <div className="space-y-6">
                    {/* PDF Viewer - Prioritate pentru CUI */}
                    {(company.cuiFile || (company.documents && company.documents.length > 0)) && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-blue-600" />
                          Vizualizare Document
                        </h3>
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 mb-4">
                          <PDFViewer 
                            pdfUrl={company.cui_file || (company.documents && company.documents[0]?.file_path ? company.documents[0].file_path : null)}
                            title={company.cui_file ? `CUI Document ${company.name}` : (company.documents && company.documents[0] ? `PDF ${company.documents[0].name}` : "Document PDF")}
                            placeholder="Nu există documente de afișat"
                            placeholderSubtext="Atașează primul document sau CUI pentru a începe"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {company.cuiFile ? `Document: CUI ${company.name}` : `Document: ${company.documents[0]?.name} (${company.documents[0]?.type})`}
                          </p>
                          <button
                            onClick={() => {
                              if (company.cui_file) {
                                const link = document.createElement('a')
                                link.href = company.cui_file
                                link.download = `CUI-${company.name}.pdf`
                                link.click()
                              } else if (company.documents && company.documents[0]) {
                                handleDownloadDocument(company.documents[0])
                              }
                            }}
                            className="btn-primary flex items-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Descarcă PDF</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista documentelor */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-green-600" />
                        Toate Documentele ({company.cuiFile ? 1 : 0} + {company.documents ? company.documents.length : 0})
                      </h3>
                      <div className="space-y-4">
                        {/* CUI Document */}
                        {company.cuiFile && (
                          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">CUI {company.name}</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Document CUI • {new Date(company.created_at).toLocaleDateString('ro-RO')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    // Update the PDF viewer to show CUI document
                                    const viewer = document.querySelector('iframe')
                                    if (viewer) {
                                      viewer.src = company.cuiFile
                                    }
                                  }}
                                  className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Vezi în viewer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a')
                                    link.href = company.cuiFile
                                    link.download = `CUI_${company.name || 'company'}.pdf`
                                    link.click()
                                  }}
                                  className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                  title="Descarcă"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Other Documents */}
                        {company.documents && company.documents.map((doc, index) => (
                          <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                  <FileText className="w-5 h-5 text-red-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">{doc.name}</h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {doc.type} • {new Date(doc.uploaded_at).toLocaleDateString('ro-RO')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    // Update the PDF viewer to show this document
                                    const viewer = document.querySelector('iframe')
                                    if (viewer) {
                                      viewer.src = doc.file_path
                                    }
                                  }}
                                  className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                  title="Vezi în viewer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                  title="Descarcă"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                                  title="Șterge"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium mb-2">Nu există documente atașate</p>
                    <p className="text-sm">Atașează primul document sau CUI pentru a începe</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal pentru upload document */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Atașează Document</h3>
            
            <form onSubmit={handleDocumentUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nume Document
                </label>
                <input
                  type="text"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument({...newDocument, name: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ex: Contract de Colaborare"
                  required
                />
              </div>


              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Fișier PDF
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewDocument({...newDocument, file: e.target.files[0]})}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 btn-secondary"
                  disabled={uploading}
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary flex items-center justify-center space-x-2"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Se încarcă...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Atașează</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default CompanyDetail
