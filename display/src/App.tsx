import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DebatePage from './pages/DebatePage'
import QwenDebatePage from './pages/QwenDebatePage'

function App() {
  return (
    <>
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/debate" element={<DebatePage />} />
        <Route path="/qwen-debate" element={<QwenDebatePage />} />
      </Routes>
    </div>
    </>
  )
}

export default App
