import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FaPaw, FaCalendar, FaArrowLeft } from 'react-icons/fa';
import './History.css';

const History = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    // Consolidate all activities in one array
    let allActivities = [];

    // Get pet activities
    const petsRef = collection(db, 'pets');
    const petsQuery = query(
      petsRef,
      where('userId', '==', user.uid)
    );

    // Get appointment activities
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsQuery = query(
      appointmentsRef,
      where('userId', '==', user.uid)
    );

    // Create listeners for both collections
    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const pet = change.doc.data();
        allActivities.push({
          id: change.doc.id,
          type: 'pet',
          name: pet.name,
          action: change.type, // 'added', 'modified', or 'removed'
          timestamp: pet.createdAt || new Date().toISOString()
        });
      });
      
      // Sort and update state only if we have both pet and appointment data
      setActivities(allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      setLoading(false);
    });

    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const appointment = change.doc.data();
        allActivities.push({
          id: change.doc.id,
          type: 'appointment',
          service: appointment.service,
          action: change.type,
          timestamp: appointment.createdAt || new Date().toISOString()
        });
      });
      
      // Sort and update state only if we have both pet and appointment data
      setActivities(allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      setLoading(false);
    });

    // Cleanup listeners
    return () => {
      unsubscribePets();
      unsubscribeAppointments();
    };
  }, []);

  if (loading) {
    return (
      <div className="history-container">
        <div className="loading">
          <p>Loading activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h2>Activity History</h2>
      </div>

      <div className="activities-list">
        {activities.length === 0 ? (
          <div className="no-activities">
            <p>No activities found</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="activity-item">
              {activity.type === 'pet' ? <FaPaw className="activity-icon" /> : <FaCalendar className="activity-icon" />}
              <div className="activity-content">
                <p className="activity-text">
                  {activity.type === 'pet' 
                    ? `${activity.action} pet: ${activity.name}`
                    : `${activity.action} appointment: ${activity.service || 'No service specified'}`
                  }
                </p>
                <span className="activity-time">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default History;