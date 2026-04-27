import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ListsProvider } from './contexts/ListsContext'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'
import { ListDetail } from './components/ListDetail/ListDetail'

function App() {
  return (
    <ListsProvider>
      <BrowserRouter basename="/mvp">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lists/new" element={<ListForm />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/lists/:id/edit" element={<ListForm />} />
        </Routes>
      </BrowserRouter>
    </ListsProvider>
  )
}

export default App
