import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { toast } from 'react-toastify';
import { FaSignOutAlt } from 'react-icons/fa';
import './Logout.css';

const Logout = () => {
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    toast.info(
      <div className="logout-confirmation">
        <p>Are you sure you want to logout? 🐾</p>
        <div className="logout-buttons">
          <button 
            onClick={() => handleConfirmLogout()}
            className="confirm-btn"
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            ) : (
              'Yes, Logout'
            )}
          </button>
          <button 
            onClick={() => toast.dismiss()}
            className="cancel-btn"
            disabled={isLoggingOut}
          >
            Stay
          </button>
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
        className: 'custom-toast'
      }
    );
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      navigate('/', { replace: true });
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('🐾 Oops! Something went wrong');
    } finally {
      setIsLoggingOut(false);
      toast.dismiss();
    }
  };

  return (
    <button className="logout-button" onClick={handleLogoutClick}>
      <FaSignOutAlt className="logout-icon" />
      <span>Logout</span>
    </button>
  );
};

export default Logout;