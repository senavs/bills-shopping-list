import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useDarkMode } from '../../contexts/DarkModeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { ListCard } from './ListCard'
import { TemplateCard } from './TemplateCard'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { exportData, importData } from '../../lib/importExport'

export const Dashboard = () => {
  const { lists, archiveList, unarchiveList, deleteList, duplicateList, saveAsTemplate, createFromTemplate, deleteTemplate } = useLists()
  const { isDark, toggleDarkMode } = useDarkMode()
  const { locale, setLocale, t } = useLanguage()
  const location = useLocation()
  const locationState = location.state as { activeTab?: 'active' | 'archived' | 'templates' } | null
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'templates'>(locationState?.activeTab || 'active')
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const regularLists = lists.filter(list => !list.isTemplate)
  const templates = lists.filter(list => list.isTemplate)

  const filteredLists = regularLists.filter(list =>
    activeTab === 'active' ? !list.archived : list.archived
  )

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id)
    setDeleteTemplateConfirm(null)
  }

  const handleExport = () => {
    exportData({ lists })
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await importData(file)
      localStorage.setItem('app', JSON.stringify(data))
      window.location.reload()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : t.importFailed)
      setTimeout(() => setImportError(null), 3000)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Sticky header: title + tabs */}
      <div className="sticky top-0 z-30 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md">
        <div className="container mx-auto px-4 pt-4 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t.appTitle}
            </h1>
            <div className="flex gap-3 items-center">
              <button
                onClick={() => setLocale(locale === 'en' ? 'pt-BR' : 'en')}
                className="w-12 h-12 flex items-center justify-center text-xl rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={locale === 'en' ? 'Mudar para Português' : 'Switch to English'}
              >
                {locale === 'pt-BR' ? '🇧🇷' : '🇺🇸'}
              </button>
              <button
                onClick={toggleDarkMode}
                className="w-12 h-12 bg-gray-600 text-white hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <Link
                to="/"
                className="w-12 h-12 bg-gray-600 text-white hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                title="Home"
              >
                🏠
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-12 h-12 bg-gray-600 text-white hover:bg-gray-700 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
                  aria-label="Menu"
                >
                  ⋮
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
                    <button
                      onClick={() => { handleExport(); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t.export}
                    </button>
                    <button
                      onClick={() => { handleImportClick(); setMenuOpen(false) }}
                      className="w-full text-left px-4 py-3 min-h-[44px] text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t.import}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('active')}
              className={`pb-3 pt-2 px-2 min-h-[44px] text-sm font-medium transition-colors ${
                activeTab === 'active'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t.active}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`pb-3 pt-2 px-2 min-h-[44px] text-sm font-medium transition-colors ${
                activeTab === 'archived'
                  ? 'border-b-2 border-red-600 text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t.archived}
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-3 pt-2 px-2 min-h-[44px] text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'border-b-2 border-green-600 text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t.templates}{templates.length > 0 && ` (${templates.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="container mx-auto px-4 pt-4 max-w-4xl">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />

        {importError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
            {importError}
          </div>
        )}

        {activeTab === 'templates' ? (
          templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="mb-2">{t.noTemplates}</p>
              <p className="text-sm">{t.noTemplatesHint}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  activeTab={activeTab}
                  onUseTemplate={() => createFromTemplate(template.id)}
                  onDelete={() => setDeleteTemplateConfirm(template.id)}
                />
              ))}
            </div>
          )
        ) : (
          filteredLists.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>{activeTab === 'active' ? t.noActiveLists : t.noArchivedLists}</p>
              {activeTab === 'active' && (
                <p className="mt-3 text-sm">
                  <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
                    {t.landingHint} →
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredLists.map(list => (
                <ListCard
                  key={list.id}
                  list={list}
                  activeTab={activeTab}
                  onArchive={() => archiveList(list.id)}
                  onUnarchive={() => unarchiveList(list.id)}
                  onDelete={() => deleteList(list.id)}
                  onDuplicate={() => duplicateList(list.id)}
                  onSaveAsTemplate={() => saveAsTemplate(list.id)}
                />
              ))}
            </div>
          )
        )}

        <Link
          to="/lists/new"
          state={{ activeTab, from: '/app' }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:shadow-md flex items-center justify-center text-2xl z-10 transition-all"
        >
          +
        </Link>
      </div>

      <ConfirmDialog
        isOpen={deleteTemplateConfirm !== null}
        title={t.deleteTemplate}
        message={t.deleteTemplateMessage}
        onConfirm={() => deleteTemplateConfirm && handleDeleteTemplate(deleteTemplateConfirm)}
        onCancel={() => setDeleteTemplateConfirm(null)}
      />
    </div>
  )
}
