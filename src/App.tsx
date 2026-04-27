import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Dashboard } from './components/Dashboard/Dashboard'
import { ListForm } from './components/ListForm/ListForm'

function App() {
  return (
    <BrowserRouter basename="/mvp">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lists/new" element={<ListForm />} />
        <Route path="/lists/:id/edit" element={<ListForm />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
