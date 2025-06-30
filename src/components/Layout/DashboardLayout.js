import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { FaComments, FaEllipsisV, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-toastify';
import './DashboardLayout.css';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
    setShowMenu(false);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      toast.success('👋 See you next time!', {
        autoClose: 2000
      });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setShowLogoutConfirm(false);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <div className="dashboard-container">
      <header className="top-navbar">
        <div className="kebab-menu" ref={menuRef}>
          <button className="kebab-button" onClick={() => setShowMenu(!showMenu)}>
            <FaEllipsisV />
          </button>
          {showMenu && (
            <div className="menu-dropdown">
              <button onClick={() => navigate('/contact')}>
                <FaComments /> Contact Us
              </button>
              <button onClick={handleLogout}>
                <FaSignOutAlt /> Log Out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="dashboard-content">
        <Outlet />
      </main>

      {showLogoutConfirm && (
        <div className="logout-confirmation-modal">
          <div className="modal-content">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out? 🐾</p>
            <div className="modal-actions">
              <button className="confirm-button" onClick={confirmLogout}>Yes, Logout</button>
              <button className="cancel-button" onClick={cancelLogout}>Stay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;