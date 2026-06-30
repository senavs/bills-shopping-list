import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Landing } from './components/Landing/Landing'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

const HomeRedirect = () => {
  const visited = localStorage.getItem('billbuddy_visited')
  return visited ? <Navigate to="/app" replace /> : <Landing />
}

function App() {
  return (
    <LanguageProvider>
      <DarkModeProvider>
        <ListsProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/app" element={<Dashboard />} />
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
