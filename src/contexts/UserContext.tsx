import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface UserContextType {
  username: string;
  setUsername: (username: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'codeleap_username';

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState(() => {
    const storedUsername = localStorage.getItem(USER_STORAGE_KEY);
    return storedUsername || '';
  });

  useEffect(() => {
    if (username) {
      localStorage.setItem(USER_STORAGE_KEY, username);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [username]);

  const logout = () => {
    setUsername('');
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ username, setUsername, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 