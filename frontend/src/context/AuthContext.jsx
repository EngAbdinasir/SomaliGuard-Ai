import { createContext, useContext, useState, useEffect } from 'react';
import { clearToken, getProfile, getToken, loginUser, loginWithGoogleCredential, registerUser, setToken, uploadProfilePicture } from '../services/api';

const AuthContext = createContext();

// Context consumers intentionally share this module with the provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getProfile();
        setCurrentUser(data.user);
      } catch {
        clearToken();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (name, email, password, profilePicture = null, verificationCode = '') => {
    try {
      const data = await registerUser(name, email, password, profilePicture, verificationCode);
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const data = await loginWithGoogleCredential(credential);
      setToken(data.token);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
  };

  const updateProfilePicture = async (file) => {
    try {
      const data = await uploadProfilePicture(file);
      setCurrentUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginWithGoogle, register, logout, updateProfilePicture, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
