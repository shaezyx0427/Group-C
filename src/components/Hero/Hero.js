import React, { useState } from 'react';
import './Hero.css';
import Login from '../Login/Login';
// import heroDog from './hero-dog.png'; // Removed unused import
import { FaPaw, FaCalendar, FaStar, FaHeart } from 'react-icons/fa';

const Hero = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <div className="hero-section">
      <div className="floating-cute-elements">
        {/* Floating paw prints and hearts */}
        <span className="floating-paw" style={{ top: '10%', left: '5%' }}><FaPaw /></span>
        <span className="floating-heart" style={{ top: '20%', right: '10%' }}><FaHeart /></span>
        <span className="floating-paw" style={{ bottom: '15%', left: '15%' }}><FaPaw /></span>
        <span className="floating-heart" style={{ bottom: '10%', right: '20%' }}><FaHeart /></span>
      </div>
      <div className="hero-content">
        <h1 className="hero-title">Welcome to Pawpoint</h1>
        <p className="hero-tagline">Where every pet gets the royal treatment! 🐾</p>
        <p className="hero-subtitle">Ready to give your furry friend the pampering they deserve?</p>
        <button className="hero-button" onClick={() => setIsLoginOpen(true)}>
          <FaPaw className="button-paw" /> PawSchedule Now
        </button>
        
        <div className="hero-features">
          <div className="feature">
            <FaPaw className="feature-icon" />
            <span>Professional Grooming</span>
          </div>
          <div className="feature">
            <FaCalendar className="feature-icon" />
            <span>Easy Scheduling</span>
          </div>
          <div className="feature">
            <FaStar className="feature-icon" />
            <span>Expert Care</span>
          </div>
          <div className="feature">
            <FaHeart className="feature-icon" />
            <span>Loving Service</span>
          </div>
        </div>
      </div>
      <Login isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
};

export default Hero;