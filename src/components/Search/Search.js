import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FaArrowLeft, FaPaw, FaCalendar } from 'react-icons/fa';
import './Search.css';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const searchAppointmentsForPets = async () => {
      setLoading(true);
      setAppointments([]);

      if (!searchQuery.trim()) {
        setLoading(false);
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Find all pets whose name matches the search
        const petsRef = collection(db, 'pets');
        const petsQuery = query(petsRef, where('userId', '==', user.uid));
        const petsSnapshot = await getDocs(petsQuery);
        const matchingPets = petsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(pet => pet.name?.toLowerCase().includes(searchQuery.toLowerCase()));

        if (matchingPets.length === 0) {
          setLoading(false);
          setAppointments([]);
          return;
        }

        // 2. For each matching pet, fetch all appointments for that pet
        const appointmentsRef = collection(db, 'appointments');
        let allAppointments = [];
        for (const pet of matchingPets) {
          const apptsQuery = query(
            appointmentsRef,
            where('userId', '==', user.uid),
            where('petId', '==', pet.id)
          );
          const apptsSnapshot = await getDocs(apptsQuery);
          const apptsResults = apptsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            petName: pet.name // Add pet name for display
          }));
          allAppointments = allAppointments.concat(apptsResults);
        }

        setAppointments(allAppointments);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    searchAppointmentsForPets();
  }, [searchQuery]);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="search-results-container">
      <div className="search-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h2>Search Results for "{searchQuery}"</h2>
      </div>

      {loading ? (
        <div className="loading">Searching...</div>
      ) : (
        <div className="results-list">
          {appointments.length === 0 ? (
            <div className="no-results">
              <p>No appointments found for "{searchQuery}"</p>
              <button
                className="schedule-first-btn"
                onClick={() => navigate('/appointments')}
              >
                Book an Appointment
              </button>
            </div>
          ) : (
            appointments.map(appt => (
              <div
                key={appt.id}
                className="result-card"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  navigate('/appointments', { state: { scrollToAppointmentId: appt.id } })
                }
              >
                <div className="result-content appointment">
                  <FaCalendar className="result-icon" />
                  <div className="result-details">
                    <h3>Appointment for {appt.petName}</h3>
                    <p><strong>Date:</strong> {formatDate(appt.date)}</p>
                    <p><strong>Time:</strong> {appt.time || 'N/A'}</p>
                    <p>
                      <strong>Services:</strong>{' '}
                      {Array.isArray(appt.services)
                        ? appt.services.join(', ')
                        : appt.services || 'N/A'}
                    </p>
                    {appt.notes && <p><strong>Notes:</strong> {appt.notes}</p>}
                    {appt.status && <p><strong>Status:</strong> {appt.status}</p>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Search;