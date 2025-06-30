import React, { useState, useRef, useEffect } from 'react';
import { FaEllipsisV, FaEnvelope, FaSignOutAlt } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './DashboardHeader.css';

const DashboardHeader = ({ onLogout }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dashboard-header">
      <div className="kebab-menu" ref={menuRef}>
        <button className="kebab-button" onClick={() => setShowMenu(!showMenu)}>
          <FaEllipsisV />
        </button>
        {showMenu && (
          <div className="menu-dropdown">
            <button onClick={() => navigate('/contact')}>
              <FaEnvelope /> Contact Us
            </button>
            <button onClick={onLogout}>
              <FaSignOutAlt /> Log Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;