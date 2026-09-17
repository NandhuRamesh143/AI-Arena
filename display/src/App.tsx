import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DebatePage from './pages/DebatePage'

function App() {
  return (
    <>
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/controller" element={<DebatePage role="controller" />} />
        <Route path="/qwen" element={<DebatePage role="qwen" />} />
        <Route path="/gemma" element={<DebatePage role="gemma" />} />
        <Route path="/debate" element={<DebatePage role="controller" />} />
      </Routes>
    </div>
    </>
  )
}

export default App
