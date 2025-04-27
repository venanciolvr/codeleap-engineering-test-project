import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignUpModal.css';

interface SignUpModalProps {
  onSignUp: (username: string) => void;
}

export function SignUpModal({ onSignUp }: SignUpModalProps) {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSignUp(username);
      navigate('/feed');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h1>Welcome to CodeLeap network!</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Please enter your username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <button
            type="submit"
            disabled={!username.trim()}
            className={username.trim() ? 'active' : ''}
          >
            ENTER
          </button>
        </form>
      </div>
    </div>
  );
} 