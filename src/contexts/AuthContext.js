import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { logAuditTrail, AUDIT_ACTIONS, getClientIP } from '../utils/auditLogger';
import './AuthContext.css';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-spinner"></div>
    </div>
  </div>
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Separate function to handle user data fetching
  const fetchUserData = async (user) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const isUserAdmin = (userDoc.exists() && userDoc.data().isAdmin === true) || 
                         user.email === 'pawpointt@gmail.com';
      
      // Store user profile data
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
      
      return isUserAdmin;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return user.email === 'pawpointt@gmail.com';
    }
  };

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;

      if (user) {
        // Set user immediately to start loading the dashboard
        setUser(user);
        
        // Then fetch additional data
        const isUserAdmin = await fetchUserData(user);
        
        if (mounted) {
          setIsAdmin(isUserAdmin);
          setLoading(false);
          
          // Log the login after everything is set up
          try {
            const ipAddress = await getClientIP();
            await logAuditTrail({
              userId: user.uid,
              userEmail: user.email,
              action: isUserAdmin ? AUDIT_ACTIONS.ADMIN_LOGIN : AUDIT_ACTIONS.LOGIN,
              userType: isUserAdmin ? 'admin' : 'customer',
              ipAddress
            });
          } catch (error) {
            console.error('Error logging audit trail:', error);
          }
        }
      } else {
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
          setUserProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Pre-fetch user data immediately after login
      const isUserAdmin = await fetchUserData(userCredential.user);
      setIsAdmin(isUserAdmin);
      
      return userCredential.user;
    } catch (error) {
      // Log failed login attempt
      try {
        const ipAddress = await getClientIP();
        await logAuditTrail({
          userId: null,
          userEmail: email,
          action: AUDIT_ACTIONS.FAILED_LOGIN,
          details: { error: error.message },
          userType: 'unknown',
          ipAddress
        });
      } catch (logError) {
        console.error('Error logging failed login:', logError);
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      const ipAddress = await getClientIP();
      const isUserAdmin = isAdmin || user?.email === 'pawpointt@gmail.com';
      
      // Log the audit trail first
      await logAuditTrail({
        userId: user?.uid,
        userEmail: user?.email,
        action: isUserAdmin ? AUDIT_ACTIONS.ADMIN_LOGOUT : AUDIT_ACTIONS.LOGOUT,
        userType: isUserAdmin ? 'admin' : 'customer',
        ipAddress
      });
      
      // Then perform the logout
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
      setUserProfile(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    userProfile
  };

  // Only show loading screen for initial auth check
  if (loading && !user) {
    return <LoadingScreen />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 