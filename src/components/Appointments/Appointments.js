import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, addDoc, setDoc, getDoc } from 'firebase/firestore';
import { logAuditTrail, AUDIT_ACTIONS } from '../../utils/auditLogger';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppointmentForm from './AppointmentForm';
import './Appointments.css';

const priceList = {
  'haircut-trim': 200,
  'bath-blowdry': 150,
  'paw-pad-care': 100,
  'ear-cleaning': 80,
  'nail-trimming': 70,
  'teeth-cleaning': 120
};

const Appointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const navigate = useNavigate();
  const toastShown = useRef(false);
  const containerRef = useRef(null);

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

  // Scroll to top function
  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Real-time listener for appointments
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('userId', '==', user.uid)
    );
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      const appointmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(appointmentsData);
      setLoading(false);
      // Scroll to top when appointments are updated
      scrollToTop();
    });

    // Real-time listener for pets
    const petsQuery = query(
      collection(db, 'pets'),
      where('userId', '==', user.uid)
    );
    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const petsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPets(petsData);
    });

    return () => {
      unsubscribeAppointments();
      unsubscribePets();
    };
  }, [navigate]);

  const handleDeleteAppointment = async (appointmentId) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const appointmentDoc = await getDoc(appointmentRef);
      const appointmentData = appointmentDoc.data();
      
      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });

      // Log audit trail for appointment cancellation
      await logAuditTrail({
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        action: AUDIT_ACTIONS.APPOINTMENT_CANCELLED,
        details: { 
          appointmentDate: appointmentData.date, 
          appointmentTime: appointmentData.time,
          services: appointmentData.services 
        },
        userType: 'customer',
        resourceType: 'appointment',
        resourceId: appointmentId
      });

      toast.success('Appointment cancelled successfully', {
        ...toastConfig,
        autoClose: 1500
      });
      // Scroll to top after cancellation
      scrollToTop();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment', {
        ...toastConfig,
        autoClose: 2000
      });
    }
  };

  return (
    <div className="appointments-container" ref={containerRef}>
      <div className="appointments-header-wrapper">
        <div className="header-content">
          <div className="title-section">
            <span className="heart-icon">🐾</span>
            <h1>My Furry Friends Appointments</h1>
            <span className="heart-icon">🐾</span>
          </div>
          <div className="appointments-header-actions-row">
            <div className="left-back-btn">
              <button className="back-btn" onClick={() => {
                navigate('/dashboard');
                scrollToTop();
              }}>
                ← Back
              </button>
            </div>
            <div className="centered-new-appointment-btn">
              <button className="add-new-btn" onClick={() => {
                setShowForm(true);
                scrollToTop();
              }}>
                + New Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      {showForm ? (
        <AppointmentForm onClose={() => {
          setShowForm(false);
          scrollToTop();
        }} />
      ) : (
        <div className="appointments-content">
          <div className="appointments-grid">
            {appointments.length === 0 ? (
              <div className="no-appointments">
                <div className="empty-state-icon">🐱</div>
                <p className="empty-state-text">Pawsitively no appointments yet!</p>
                <button 
                  className="schedule-first-btn"
                  onClick={() => {
                    setShowForm(true);
                    scrollToTop();
                  }}
                >
                  <span className="button-icon">✨</span>
                  Schedule Your First Pawsome Visit!
                </button>
              </div>
            ) : (
              appointments.filter(appointment => {
                // Only show active appointments
                if (appointment.status !== 'active') return false;
                
                // Check if appointment is in the past
                const now = new Date();
                const aptDate = new Date(appointment.date);
                
                // Parse appointment time if it exists
                if (appointment.time && appointment.time.includes('-')) {
                  const [start] = appointment.time.split('-').map(s => s.trim());
                  const [startTime, startPeriod] = start.split(' ');
                  let [startHour, startMinute] = startTime.split(':');
                  startHour = parseInt(startHour, 10);
                  startMinute = parseInt(startMinute, 10);
                  
                  // Convert to 24-hour format
                  if (startPeriod && startPeriod.toLowerCase().includes('pm') && startHour !== 12) {
                    startHour += 12;
                  }
                  if (startPeriod && startPeriod.toLowerCase().includes('am') && startHour === 12) {
                    startHour = 0;
                  }
                  
                  aptDate.setHours(startHour, startMinute, 0, 0);
                }
                
                // Only show appointments that are in the future or today
                return aptDate >= now;
              }).map(appointment => (
                <div key={appointment.id} className="appointment-card">
                  <div className="appointment-header">
                    <div className="appointment-date">
                      {new Date(appointment.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="appointment-time">{appointment.time}</div>
                  </div>
                  <div className="appointment-details">
                    <div className="pet-info">
                      <h3>Pet: {pets.find(pet => pet.id === appointment.petId)?.name}</h3>
                    </div>
                    <div className="services-list">
                      <h4>Services:</h4>
                      {appointment.services.map(service => (
                        <span key={service} className="service-tag">
                          {service}
                        </span>
                      ))}
                    </div>
                    {appointment.notes && (
                      <div className="notes-section">
                        <h4>Notes:</h4>
                        <p className="appointment-notes">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="appointment-actions">
                    {/* Only show Edit button if appointment is active and at least 3 hours before timeslot */}
                    {(() => {
                      if (appointment.status !== 'active') return null;
                      // Parse appointment start time
                      const now = new Date();
                      const aptDate = new Date(appointment.date);
                      if (appointment.time && appointment.time.includes('-')) {
                        const [start, end] = appointment.time.split('-').map(s => s.trim());
                        const [startTime, startPeriod] = start.split(' ');
                        let [startHour, startMinute] = startTime.split(':');
                        startHour = parseInt(startHour, 10);
                        startMinute = parseInt(startMinute, 10);
                        if (startPeriod && startPeriod.toLowerCase().includes('pm') && startHour !== 12) startHour += 12;
                        if (startPeriod && startPeriod.toLowerCase().includes('am') && startHour === 12) startHour = 0;
                        aptDate.setHours(startHour, startMinute, 0, 0);
                      }
                      // Only show if more than 3 hours before timeslot
                      if (aptDate.getTime() - now.getTime() > 3 * 60 * 60 * 1000) {
                        return (
                          <button 
                            className="edit-btn"
                            onClick={() => navigate(`/appointments/edit/${appointment.id}`, { state: { currentAppointment: appointment, isEditing: true } })}
                          >
                            <span className="button-icon">✎</span>
                            Edit
                          </button>
                        );
                      }
                      return null;
                    })()}
                    <button 
                      className="cancel-btn"
                      onClick={() => setAppointmentToCancel(appointment)}
                    >
                      <span className="button-icon">✕</span>
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {appointmentToCancel && (
            <div className="modal-overlay">
              <div className="modal-content" style={{minWidth: '320px', maxWidth: '95vw'}}>
                <h2>Cancel Appointment?</h2>
                <p>Are you sure you want to cancel this appointment?</p>
                <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
                  <button
                    className="confirm-btn"
                    onClick={async () => {
                      await handleDeleteAppointment(appointmentToCancel.id);
                      setAppointmentToCancel(null);
                    }}
                  >
                    Yes, Cancel
                  </button>
                  <button
                    className="keep-btn"
                    onClick={() => setAppointmentToCancel(null)}
                  >
                    Keep Appointment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Appointments;