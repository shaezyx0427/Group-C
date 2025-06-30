import React, { useState } from 'react';
import { auth, db } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

const Login = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });

  const toastConfig = {
    position: "top-right",
    autoClose: 2000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "colored",
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    setIsLogin(true);
    onClose();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Use the context login function instead of direct Firebase call
      await login(formData.email, formData.password);
      
      // Show success toast but don't wait for it
      toast.success('🐾 Welcome back!', toastConfig);
      
      // Close the modal immediately
      onClose();
      
      // Navigate to dashboard immediately
      // The AuthContext will handle redirecting admin users
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError('Failed to log in. Please check your credentials.');
      toast.error('❌ Login failed. Please check your credentials.', toastConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      toast.error('❌ Passwords do not match', toastConfig);
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Store additional user data in Firestore
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        createdAt: serverTimestamp()
      });

      toast.success('🎉 Account created successfully!', toastConfig);
      setShowConfirmation(true);
      
      // Navigate to dashboard immediately after signup
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError('Failed to create account. ' + error.message);
      toast.error('❌ Failed to create account', toastConfig);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-overlay">
      {!showConfirmation ? (
        <div className="login-content">
          <button className="login-close" onClick={onClose}>&times;</button>
          
          <div className="login-tabs">
            <button 
              className={`tab-button ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button 
              className={`tab-button ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {isLogin ? (
            <form className="login-form" onSubmit={handleLogin}>
              <input 
                type="email" 
                name="email"
                placeholder="Email" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
              <div className="password-input">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password" 
                  placeholder="Password" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Logging in...
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleSignUp}>
              <div className="name-inputs">
                <input 
                  type="text" 
                  name="firstName"
                  placeholder="First Name" 
                  value={formData.firstName}
                  onChange={handleChange}
                  required 
                />
                <input 
                  type="text" 
                  name="lastName"
                  placeholder="Last Name" 
                  value={formData.lastName}
                  onChange={handleChange}
                  required 
                />
              </div>
              <input 
                type="email" 
                name="email"
                placeholder="Email" 
                value={formData.email}
                onChange={handleChange}
                required 
              />
              <div className="password-input">
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password" 
                  placeholder="Password" 
                  value={formData.password}
                  onChange={handleChange}
                  required 
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="password-input">
                <input 
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword" 
                  placeholder="Confirm Password" 
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required 
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
              <button type="submit" className="submit-button" disabled={isLoading}>
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Creating account...
                  </div>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="login-content confirmation-modal">
          <div className="confirmation-content">
            <h2>🎉 Sign Up Successful!</h2>
            <p>Your account has been created successfully. You can now log in with your email and password.</p>
            <button className="submit-button" onClick={handleConfirmationClose}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;