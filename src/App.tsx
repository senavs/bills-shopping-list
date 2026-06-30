import { HashRouter, Routes, Route } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

function App() {
  return (
    <LanguageProvider>
      <DarkModeProvider>
        <ListsProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lists/new" element={<ListForm />} />
              <Route path="/lists/:id" element={<ListDetail />} />
              <Route path="/lists/:id/edit" element={<ListForm />} />
            </Routes>
          </HashRouter>
        </ListsProvider>
      </DarkModeProvider>
    </LanguageProvider>
  )
}

export default App
