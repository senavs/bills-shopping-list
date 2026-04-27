import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLists } from '../../hooks/useLists'
import { ListCard } from './ListCard'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { exportData, importData } from '../../lib/importExport'

export const Dashboard = () => {
  const { lists, archiveList, deleteList, duplicateList } = useLists()
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredLists = lists.filter(list => 
    activeTab === 'active' ? !list.archived : list.archived
  )

  const handleDelete = (id: string) => {
    deleteList(id)
    setDeleteConfirm(null)
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
      localStorage.setItem('bills-shopping-state', JSON.stringify(data))
      window.location.reload()
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed')
      setTimeout(() => setImportError(null), 3000)
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bills & Shopping List
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded text-sm"
            >
              Export
            </button>
            <button
              onClick={handleImportClick}
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded text-sm"
            >
              Import
            </button>
            <Link
              to="/lists/new"
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded"
            >
              + New List
            </Link>
          </div>
        </div>

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

        <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2 px-1 ${
              activeTab === 'active'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`pb-2 px-1 ${
              activeTab === 'archived'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Archived
          </button>
        </div>

        {filteredLists.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No {activeTab} lists yet
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredLists.map(list => (
              <ListCard
                key={list.id}
                list={list}
                onArchive={() => archiveList(list.id)}
                onDelete={() => setDeleteConfirm(list.id)}
                onDuplicate={() => duplicateList(list.id)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Delete List"
        message="Are you sure you want to delete this list? This action cannot be undone."
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  )
}
