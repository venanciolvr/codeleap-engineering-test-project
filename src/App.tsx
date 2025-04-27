import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { SignUpModal } from './components/SignUpModal';
import { Feed } from './components/Feed';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function AppContent() {
  const { username, setUsername } = useUser();

  if (!username) {
    return <SignUpModal onSignUp={setUsername} />;
  }

  return (
    <Routes>
      <Route path="/feed" element={<Feed />} />
      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Router>
  );
}

export default App
