import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PDFViewer from '../components/PDFViewer'
import MultiPDFViewer from '../components/MultiPDFViewer'
import { useData } from '../contexts/DataContext'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import DataTable from '../components/DataTable'
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
  Eye,
  TrendingUp,
  ExternalLink,
  MapPin as LocationIcon
} from 'lucide-react'

const CompanyDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { companies, loading, updateItem, refreshData } = useData()
  const [company, setCompany] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [competitors, setCompetitors] = useState([])
  const [competitorsLoading, setCompetitorsLoading] = useState(false)
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

  // Load competitors data when switching to competition tab
  const loadCompetitors = async () => {
    if (!company || competitorsLoading) return
    
    try {
      setCompetitorsLoading(true)
      const response = await axios.get('/api/onjn-operators/stats')
      const stats = response.data
      
      // Get all brands and their slot counts
      const brandsResponse = await axios.get('/api/brands')
      const brands = brandsResponse.data
      
      // Calculate competition data - companies with their slot counts
      const competitionData = []
      
      // Group operators by company and count slots
      const response2 = await axios.get('/api/onjn-operators')
      const operators = response2.data
      
      // Group by company
      const companyStats = {}
      operators.forEach(op => {
        if (op.company_name) {
          if (!companyStats[op.company_name]) {
            companyStats[op.company_name] = {
              company_name: op.company_name,
              total_slots: 0,
              active_slots: 0,
              expired_slots: 0,
              cities: new Set(),
              counties: new Set()
            }
          }
          companyStats[op.company_name].total_slots++
          if (op.status === 'În exploatare') {
            companyStats[op.company_name].active_slots++
          }
          if (op.is_expired) {
            companyStats[op.company_name].expired_slots++
          }
          if (op.city) companyStats[op.company_name].cities.add(op.city)
          if (op.county) companyStats[op.company_name].counties.add(op.county)
        }
      })
      
      // Convert to array and sort by slot count
      const competitors = Object.values(companyStats)
        .filter(comp => comp.company_name !== company.name) // Exclude current company
        .map(comp => ({
          ...comp,
          cities_count: comp.cities.size,
          counties_count: comp.counties.size,
          cities: Array.from(comp.cities),
          counties: Array.from(comp.counties)
        }))
        .sort((a, b) => b.total_slots - a.total_slots)
      
      setCompetitors(competitors)
    } catch (error) {
      console.error('Error loading competitors:', error)
      toast.error('Eroare la încărcarea datelor concurenților!')
    } finally {
      setCompetitorsLoading(false)
    }
  }

  // Load competitors when tab changes to competition
  useEffect(() => {
    if (activeTab === 'competition' && company) {
      loadCompetitors()
    }
  }, [activeTab, company])

  const handleDocumentUpload = async (e) => {
    e.preventDefault()
    if (!newDocument.file || !newDocument.name) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', newDocument.file)
      formData.append('name', newDocument.name)
      formData.append('type', newDocument.type)

      const response = await fetch(`/api/companies/${company.id}/documents`, {
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
        const response = await fetch(`/api/companies/${company.id}/documents/${documentId}` , {
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

          {/* Tabs */}
          <div className="mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                    activeTab === 'overview'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4" />
                    <span>Prezentare</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('competition')}
                  className={`flex-1 px-6 py-4 text-left font-medium transition-colors ${
                    activeTab === 'competition'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Concurență</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
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
                    {/* Multi PDF Viewer - Afișează TOATE documentele */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Vizualizare Documente
                      </h3>
                      <MultiPDFViewer 
                        files={[
                          ...(company.cui_file ? [{ 
                            name: `CUI ${company.name}`, 
                            type: 'Document CUI',
                            file_path: company.cui_file,
                            url: company.cui_file,
                            id: 'cui'
                          }] : []),
                          ...(company.documents || []).map(doc => ({
                            ...doc,
                            file_path: doc.file_path || doc.url,
                            url: doc.url || doc.file_path
                          }))
                        ]}
                        title="Documente Companie"
                        onDelete={async (file) => {
                          if (file.id === 'cui') {
                            toast.error('Nu poți șterge documentul CUI din aici')
                          } else {
                            await handleDeleteDocument(file._id || file.id)
                          }
                        }}
                      />
                    </div>

                    {/* REMOVED - Documentele sunt deja afișate în MultiPDFViewer mai sus */}
                    {/* MultiPDFViewer include deja toate funcțiile de Eye/Download/Delete */}
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
          )}

          {/* Competition Tab */}
          {activeTab === 'competition' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">Analiză Concurență</h2>
                      <p className="text-slate-600 dark:text-slate-400">Top companii concurente din piață</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {competitors.length} companii active
                  </div>
                </div>

                {competitorsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-slate-600 dark:text-slate-400">Se încarcă concurenții...</span>
                  </div>
                ) : competitors.length > 0 ? (
                  <div className="space-y-4">
                    {competitors.slice(0, 10).map((competitor, index) => (
                      <div key={competitor.company_name} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 dark:text-white">{competitor.company_name}</h3>
                              <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                                <span className="flex items-center space-x-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{competitor.total_slots.toLocaleString('ro-RO')} sloturi</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <TrendingUp className="w-4 h-4" />
                                  <span>{competitor.active_slots.toLocaleString('ro-RO')} active</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <LocationIcon className="w-4 h-4" />
                                  <span>{competitor.counties_count} județe</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {competitor.cities_count} orașe
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {competitor.expired_slots > 0 && `${competitor.expired_slots} expirate`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p className="text-lg font-medium mb-2">Nu există date de concurență</p>
                    <p className="text-sm">Datele vor fi actualizate după sincronizarea ONJN</p>
                  </div>
                )}
              </div>
            </div>
          )}
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
