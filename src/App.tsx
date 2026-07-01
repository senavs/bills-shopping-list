import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Landing } from './components/Landing/Landing'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

/**
 * On first visit ever: show Landing at /
 * On return visit (fresh tab/window open): redirect to /app
 * On in-app navigation to / (Home button, hint link): show Landing
 * 
 * Uses sessionStorage to distinguish fresh open vs in-app navigation.
 * sessionStorage is cleared when the tab/window closes.
 */
const HomeRoute = () => {
  const visited = localStorage.getItem('billbuddy_visited')
  const isActiveSession = sessionStorage.getItem('billbuddy_in_session')

  if (!isActiveSession) {
    // First render in this tab session - mark it active
    sessionStorage.setItem('billbuddy_in_session', 'true')
    // If returning user, redirect to app
    if (visited) {
      return <Navigate to="/app" replace />
    }
  }

  // Either first-time user or in-app navigation to /
  return <Landing />
}

function App() {
  return (
    <LanguageProvider>
      <DarkModeProvider>
        <ListsProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
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
