import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useDarkMode } from '../../contexts/DarkModeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { ListCard } from './ListCard'
import { TemplateCard } from './TemplateCard'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { exportData, importData } from '../../lib/importExport'

type Tab = 'active' | 'archived' | 'templates'

export const Dashboard = () => {
  const { lists, archiveList, unarchiveList, deleteList, duplicateList, saveAsTemplate, createFromTemplate, deleteTemplate } = useLists()
  const { isDark, toggleDarkMode } = useDarkMode()
  const { locale, setLocale, t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as { activeTab?: Tab } | null
  const [activeTab, setActiveTab] = useState<Tab>(locationState?.activeTab || 'active')
  const [deleteTemplateConfirm, setDeleteTemplateConfirm] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Rarely used preferences and data tools live together in one sheet
  const settingsActions: BottomSheetAction[] = [
    {
      id: 'language',
      label: locale === 'en' ? 'Mudar para Português' : 'Switch to English',
      icon: locale === 'en' ? '🇧🇷' : '🇺🇸',
      onAction: () => setLocale(locale === 'en' ? 'pt-BR' : 'en'),
    },
    { id: 'theme', label: isDark ? t.lightMode : t.darkMode, icon: isDark ? '☀️' : '🌙', onAction: toggleDarkMode },
    { id: 'export', label: t.export, icon: '📤', onAction: handleExport },
    { id: 'import', label: t.import, icon: '📥', onAction: handleImportClick },
    { id: 'about', label: t.aboutApp, icon: 'ℹ️', onAction: () => navigate('/') },
  ]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: t.active },
    { id: 'archived', label: t.archived },
    { id: 'templates', label: templates.length > 0 ? `${t.templates} (${templates.length})` : t.templates },
  ]

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900 pb-24">
      {/* Sticky header: title + tabs */}
      <div className="sticky top-0 z-30 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md pt-safe">
        <div className="container mx-auto px-4 pt-4 pb-3 max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t.appTitle}
            </h1>
            <button
              onClick={() => setShowSettings(true)}
              className="w-11 h-11 flex items-center justify-center rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t.settings}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <circle cx="4" cy="10" r="2" />
                <circle cx="10" cy="10" r="2" />
                <circle cx="16" cy="10" r="2" />
              </svg>
            </button>
          </div>

          {/* Segmented control */}
          <div role="tablist" className="grid grid-cols-3 p-0.5 rounded-lg bg-gray-200 dark:bg-gray-800">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[36px] px-2 rounded-md text-sm font-medium truncate transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
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
                    {t.landingHint}
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
          style={{
            bottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))',
            right: 'max(1.5rem, env(safe-area-inset-right))',
          }}
          className="fixed w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:shadow-md flex items-center justify-center z-10 transition-all"
          aria-label={t.createList}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </Link>
      </div>

      <BottomSheet
        isOpen={showSettings}
        title={t.settings}
        actions={settingsActions}
        onClose={() => setShowSettings(false)}
      />

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
