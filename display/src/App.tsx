import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import Gemma from './pages/Gemma'
import Qwen from './pages/Qwen'
function App() {
  return (
    <>
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gemma" element={<Gemma />} />
        <Route path="/qwen" element={<Qwen />} />
             </Routes>
    </div>
    </>
  )
}

export default App
