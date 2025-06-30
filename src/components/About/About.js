import React from 'react';
import './About.css';
import logo from '../Navbar/pawpoint-logo.png';

const About = () => {
  const mascot = logo;

  return (
    <section id="about" className="about-section">
      <div className="about-card">
        <img src={mascot} alt="PawPoint Mascot" className="about-mascot-large" />
        <h2 className="about-title">About Us 🐾</h2>
        <p className="about-subtitle">Your pet's happiness is our passion!</p>
        <div className="about-paw-divider">
          <span role="img" aria-label="paw">🐾</span>
          <span role="img" aria-label="paw">🐾</span>
          <span role="img" aria-label="paw">🐾</span>
        </div>
        <div className="about-paragraph-form">
          <p>
            Welcome to PawPoint, where pet pampering is our passion! Founded in 2025, we set out with a simple mission: to provide exceptional grooming services in a safe, comfortable, and loving environment for your furry family members. Our team of certified and experienced groomers are true animal lovers, dedicated to making every grooming session a positive experience. We use only high-quality, pet-safe products and tailor our services to meet the unique needs of each pet, from playful puppies to serene seniors. At PawPoint, we're more than just groomers—we're pet lovers dedicated to creating a stress-free, enjoyable experience for every dog and cat that walks through our doors. Because when they look good, they feel good!
          </p>
        </div>
      </div>
    </section>
  );
};

export default About; 