import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ParsedContentProvider } from './lib/ParsedContentContext'
import { ScriptProvider } from './lib/ScriptContext'
import { SessionStatsProvider } from './lib/SessionStatsContext'
import Landing from './pages/Landing'
import Upload from './pages/Upload'
import GenreSelect from './pages/GenreSelect'
import Player from './pages/Player'
import Quiz from './pages/Quiz'
import Sessions from './pages/Sessions'

function App() {
  return (
    <ParsedContentProvider>
      <ScriptProvider>
        <SessionStatsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/genre-select" element={<GenreSelect />} />
              <Route path="/player" element={<Player />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/sessions" element={<Sessions />} />
            </Routes>
          </BrowserRouter>
        </SessionStatsProvider>
      </ScriptProvider>
    </ParsedContentProvider>
  )
}

export default App
