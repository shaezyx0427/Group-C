import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './BackButton.css';

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button className="back-button" onClick={() => navigate('/dashboard')}>
      <FaArrowLeft /> Back to Dashboard
    </button>
  );
};

export default BackButton;