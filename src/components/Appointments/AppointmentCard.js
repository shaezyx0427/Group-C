import React from 'react';
import { useNavigate } from 'react-router-dom';

const AppointmentCard = ({ appointment }) => {
  const navigate = useNavigate();

  return (
    <div className="appointment-card">
      {/* Your appointment card content */}
      <button 
        onClick={() => navigate(`/appointments/edit/${appointment.id}`)}
        className="edit-btn"
      >
        Edit
      </button>
    </div>
  );
};

export default AppointmentCard;