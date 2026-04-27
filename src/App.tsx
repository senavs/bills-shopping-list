import { HashRouter, Routes, Route } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

function App() {
  return (
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
  )
}

export default App
