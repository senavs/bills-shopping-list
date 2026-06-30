import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { DarkModeProvider } from './contexts/DarkModeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { Landing } from './components/Landing/Landing'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

/**
 * On first visit: show Landing at /
 * On return visit (has localStorage flag): redirect / to /app only on initial app load.
 * If user explicitly navigates to / (e.g., Home button), always show Landing.
 */
const HomeRoute = () => {
  const visited = localStorage.getItem('billbuddy_visited')
  const cameFromApp = sessionStorage.getItem('billbuddy_in_session')

  // If user already has an active session (navigated within the app), show Landing
  if (cameFromApp) {
    return <Landing />
  }

  // First load of this session: mark session active
  sessionStorage.setItem('billbuddy_in_session', 'true')

  // If they've visited before, redirect to app on fresh open
  if (visited) {
    return <Navigate to="/app" replace />
  }

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
