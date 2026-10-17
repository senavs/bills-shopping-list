import { useState, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { useDarkMode, type ThemeMode } from '../../contexts/DarkModeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { ListCard } from './ListCard'
import { TemplateCard } from './TemplateCard'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { BottomSheet, type BottomSheetAction } from '../shared/BottomSheet'
import { exportData, importData } from '../../lib/importExport'
import { getPresetTemplates } from '../../lib/presetTemplates'
import { CloudCheckIcon, CloudIcon, DownloadIcon, EllipsisIcon, GlobeIcon, InfoIcon, MoonIcon, PlusIcon, ShareIcon, SunIcon } from '../shared/icons'
import { useSync } from '../../contexts/SyncContext'
import { SyncStatusButton } from '../Sync/SyncStatusButton'
import { AccountSheet } from '../Sync/AccountSheet'
import { SyncBanner } from '../Sync/SyncBanner'
import type { AppState } from '../../types'

type Tab = 'active' | 'archived' | 'templates'

const NEXT_THEME: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' }

export const Dashboard = () => {
  const { lists, archiveList, unarchiveList, deleteList, duplicateList, saveAsTemplate, createFromTemplate, deleteTemplate, createFromPreset, copyPresetToTemplates } = useLists()
  const { mode, setMode, isDark } = useDarkMode()
  const { locale, setLocale, t, isBR } = useLanguage()
  const sync = useSync()
  const [showAccount, setShowAccount] = useState(false)
  const [showSyncHint, setShowSyncHint] = useState(false)
  const [pendingImport, setPendingImport] = useState<AppState | null>(null)

  const openSettings = () => {
    sync.prepare() // load the SDK early so sign-in can open its popup within the tap
    setShowSettings(true)
  }

  const syncAction: BottomSheetAction[] =
    sync.status === 'disabled' ? []
    : sync.status === 'signedOut'
      ? [{ id: 'sync', label: t.syncWithGoogle, icon: <CloudIcon />, onAction: () => { void sync.signIn() } }]
      : [{ id: 'sync', label: t.connectedWithGoogle, icon: <CloudCheckIcon />, onAction: () => setShowAccount(true) }]
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
  const presetTemplates = getPresetTemplates(t, isBR)

  const filteredLists = regularLists.filter(list =>
    activeTab === 'active' ? !list.archived : list.archived
  )

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id)
    setDeleteTemplateConfirm(null)
  }

  // Called straight from the tap so the share sheet keeps the user gesture
  const handleExport = () => {
    exportData({ lists })
      .then(() => {
        if (sync.status === 'signedOut') {
          setShowSyncHint(true)
          setTimeout(() => setShowSyncHint(false), 8000)
        }
      })
      .catch(() => {
        setImportError(t.exportFailed)
        setTimeout(() => setImportError(null), 3000)
      })
  }

  const applyImport = (data: AppState) => {
    localStorage.setItem('app', JSON.stringify(data))
    window.location.reload()
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await importData(file)
      const signedIn = sync.status !== 'disabled' && sync.status !== 'signedOut'
      if (signedIn) setPendingImport(data)
      else applyImport(data)
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
    ...syncAction,
    {
      id: 'language',
      label: locale === 'en' ? 'Mudar para Português' : 'Switch to English',
      icon: <GlobeIcon />,
      onAction: () => setLocale(locale === 'en' ? 'pt-BR' : 'en'),
    },
    {
      id: 'theme',
      label: `${t.theme}: ${{ system: t.themeSystem, light: t.themeLight, dark: t.themeDark }[mode]}`,
      icon: isDark ? <MoonIcon /> : <SunIcon />,
      onAction: () => setMode(NEXT_THEME[mode]),
    },
    { id: 'export', label: t.export, icon: <ShareIcon />, onAction: handleExport },
    { id: 'import', label: t.import, icon: <DownloadIcon />, onAction: handleImportClick },
    { id: 'about', label: t.aboutApp, icon: <InfoIcon />, onAction: () => navigate('/') },
  ]

  const tabs: { id: Tab; label: string }[] = [
    { id: 'active', label: t.active },
    { id: 'archived', label: t.archived },
    { id: 'templates', label: templates.length > 0 ? `${t.templates} (${templates.length})` : t.templates },
  ]

  return (
    <div className="min-h-dvh bg-bg pb-24">
      {/* Sticky header: title + tabs */}
      <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md pt-safe">
        <div className="container mx-auto px-4 pt-4 pb-3 max-w-4xl">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-large-title font-bold text-ink">
              {t.appTitle}
            </h1>
            <div className="flex items-center gap-2">
              <SyncStatusButton onOpen={() => setShowAccount(true)} />
              <button
                onClick={openSettings}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-fill text-accent"
                aria-label={t.settings}
              >
                <EllipsisIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Segmented control */}
          <div role="tablist" className="grid grid-cols-3 p-0.5 rounded-[9px] bg-fill">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[32px] px-2 rounded-[7px] text-footnote truncate ${
                  activeTab === tab.id
                    ? 'bg-surface dark:bg-[#636366] text-ink font-semibold shadow-sm'
                    : 'text-ink'
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
          accept="application/json,.json"
          onChange={handleImportFile}
          className="hidden"
        />

        {importError && (
          <div role="alert" className="mb-4 p-3 bg-danger/10 text-danger rounded-group">
            {importError}
          </div>
        )}

        {showSyncHint && (
          <div role="status" className="mb-4 p-3 bg-accent/10 text-ink rounded-group flex items-center gap-3">
            <p className="flex-1 text-callout">{t.exportSyncHint}</p>
            <button onClick={() => { setShowSyncHint(false); void sync.signIn() }} className="text-callout font-semibold text-accent">
              {t.syncWithGoogle}
            </button>
          </div>
        )}

        <SyncBanner listCount={regularLists.length} />

        {activeTab === 'templates' ? (
          <>
            <h2 className="pl-1 min-h-[44px] flex items-center text-callout font-semibold text-ink">
              {t.myTemplates}
            </h2>
            {templates.length === 0 ? (
              <div className="bg-surface rounded-group px-4 py-6 text-center text-muted">
                <p className="mb-1">{t.noTemplates}</p>
                <p className="text-callout">{t.noTemplatesHint}</p>
              </div>
            ) : (
              <div className="bg-surface rounded-group overflow-hidden">
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
            )}

            <h2 className="pl-1 pt-4 min-h-[44px] flex items-center text-callout font-semibold text-ink">
              {t.presetTemplates}
            </h2>
            <div className="bg-surface rounded-group overflow-hidden">
              {presetTemplates.map(preset => (
                <TemplateCard
                  key={preset.id}
                  template={preset}
                  activeTab={activeTab}
                  preset
                  onUseTemplate={() => createFromPreset(preset)}
                  onCopyToMyTemplates={() => copyPresetToTemplates(preset)}
                />
              ))}
            </div>
          </>
        ) : (
          filteredLists.length === 0 ? (
            <div className="text-center py-12 text-muted">
              <p>{activeTab === 'active' ? t.noActiveLists : t.noArchivedLists}</p>
              {activeTab === 'active' && (
                <p className="mt-3 text-callout">
                  <Link to="/" className="text-accent">
                    {t.landingHint}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <div className="bg-surface rounded-group overflow-hidden">
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
          className="fixed w-14 h-14 bg-accent text-on-accent rounded-full shadow-lg active:opacity-80 flex items-center justify-center z-10"
          aria-label={t.createList}
        >
          <PlusIcon className="w-7 h-7" />
        </Link>
      </div>

      <BottomSheet
        isOpen={showSettings}
        title={t.settings}
        actions={settingsActions}
        onClose={() => setShowSettings(false)}
      />

      <AccountSheet isOpen={showAccount} onClose={() => setShowAccount(false)} />

      <ConfirmDialog
        isOpen={deleteTemplateConfirm !== null}
        title={t.deleteTemplate}
        message={t.deleteTemplateMessage}
        onConfirm={() => deleteTemplateConfirm && handleDeleteTemplate(deleteTemplateConfirm)}
        onCancel={() => setDeleteTemplateConfirm(null)}
      />

      <ConfirmDialog
        isOpen={pendingImport !== null}
        title={t.importSyncTitle}
        message={t.importSyncWarning}
        variant="info"
        confirmLabel={t.import}
        onConfirm={() => pendingImport && applyImport(pendingImport)}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  )
}
