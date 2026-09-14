import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DebatePage from './pages/DebatePage'

function App() {
  return (
    <>
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/debate" element={<DebatePage />} />
      </Routes>
    </div>
    </>
  )
}

export default App
