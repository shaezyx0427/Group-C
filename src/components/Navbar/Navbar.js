import React, { useState } from "react";
import "./Navbar.css";
import logo from "./pawpoint-logo.png";
import { FaHome, FaCog, FaImages, FaUser, FaPaw, FaSignOutAlt, FaEllipsisV, FaEnvelope, FaInfoCircle, FaQuestionCircle } from "react-icons/fa";
import { auth } from '../../firebase';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { signOut } from 'firebase/auth';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      toast.success('👋 See you next time!', {
        autoClose: 2000
      });
      logout();
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error logging out:', error);
    }
    setShowLogoutConfirm(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-left">
          <div className="logo-container">
            <img src={logo} alt="Pawpoint Logo" className="nav-logo cute-logo" />
          </div>
          <span className="system-name cute-name">Pawpoint</span>
        </div>
        
        <div className="nav-right">
          {user ? (
            <div className="kebab-menu">
              <button className="kebab-button" onClick={toggleMenu}>
                <FaEllipsisV />
              </button>
              {isMenuOpen && (
                <div className="dropdown-menu">
                  {!isAdmin && (
                    <>
                      <Link to="/records" className="dropdown-item">
                        <FaUser className="nav-icon" />
                        Records
                      </Link>
                      <Link to="/settings" className="dropdown-item">
                        <FaCog className="nav-icon" />
                        Settings
                      </Link>
                      <Link to="/contact" className="dropdown-item">
                        <FaEnvelope className="nav-icon" />
                        Contact Us
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogoutClick} className="dropdown-item logout">
                    <FaSignOutAlt className="nav-icon" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <a href="#home" className="nav-link cute-link" onClick={scrollToTop}>
                <FaHome className="nav-icon" /> Home
              </a>
              <a href="#service" className="nav-link cute-link">
                <FaCog className="nav-icon" /> Service
              </a>
              <a href="#gallery" className="nav-link cute-link">
                <FaImages className="nav-icon" /> Gallery
              </a>
            </>
          )}
        </div>
      </nav>

      {showLogoutConfirm && (
        <div className="logout-confirmation-modal">
          <div className="modal-content">
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out? 🐾</p>
            <div className="modal-actions">
              <button className="confirm-button" onClick={handleConfirmLogout}>Yes, Logout</button>
              <button className="cancel-button" onClick={handleCancelLogout}>Stay</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;