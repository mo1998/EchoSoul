import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import CharacterCreator from './pages/CharacterCreator';
import Chat from './pages/Chat';
import WorldCreator from './pages/WorldCreator';
import WorldChat from './pages/WorldChat';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CharacterCreator />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/create-world" element={<WorldCreator />} />
            <Route path="/world/:id" element={<WorldChat />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;