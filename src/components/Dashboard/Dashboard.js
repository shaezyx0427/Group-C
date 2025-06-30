import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../firebase';
import './Dashboard.css';
import { signOut } from 'firebase/auth';
import { 
  FaCalendar, 
  FaClipboardList,
  FaComments,
  FaHistory,
  FaSearch,
  FaPaw,
  FaHome,
  FaSignOutAlt,
  FaPlus
} from 'react-icons/fa';
import { usePets } from '../../hooks/usePets';
import { useAppointments } from '../../hooks/useAppointments';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { parseAppointmentTime } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();
  const { pets, loading: petsLoading } = usePets();
  const { appointments, loading: apptsLoading } = useAppointments();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const appointmentRefs = useRef({});
  const reminderShown = useRef(false);

  // Scroll to top utility function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Scroll to top when loading states change
  useEffect(() => {
    if (petsLoading || apptsLoading) {
      scrollToTop();
    }
  }, [petsLoading, apptsLoading]);

  // Scroll to top when appointments are updated
  useEffect(() => {
    if (!apptsLoading && appointments?.length > 0) {
      scrollToTop();
    }
  }, [apptsLoading, appointments]);

  // Calculate active appointments - only include appointments that are active and not in the past
  const activeAppointments = appointments?.filter(apt => {
    if (apt.status !== 'active') return false;
    
    const appointmentDate = new Date(apt.date);
    const today = new Date();
    const currentTime = { hours: today.getHours(), minutes: today.getMinutes() };
    
    // Reset time to start of day for date comparison
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    // If appointment is today, check the time
    if (appointmentDate.getTime() === today.getTime()) {
      const appointmentTime = parseAppointmentTime(apt.time);
      if (!appointmentTime) return false;
      
      // If current time is past appointment time, filter out
      if (currentTime.hours > appointmentTime.hours || 
          (currentTime.hours === appointmentTime.hours && currentTime.minutes > appointmentTime.minutes)) {
        return false;
      }
    }
    
    return appointmentDate >= today;
  }).sort((a, b) => {
    // Sort by date first
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA - dateB;
    }
    
    // If same date, sort by time
    const timeA = parseAppointmentTime(a.time);
    const timeB = parseAppointmentTime(b.time);
    if (!timeA || !timeB) return 0;
    
    if (timeA.hours !== timeB.hours) {
      return timeA.hours - timeB.hours;
    }
    return timeA.minutes - timeB.minutes;
  }) || [];

  // Show appointment reminder when user logs in
  useEffect(() => {
    if (!apptsLoading && !reminderShown.current && activeAppointments.length > 0) {
      const nextAppointment = activeAppointments[0];
      const appointmentDate = new Date(nextAppointment.date);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Format the time to be more readable
      const time = nextAppointment.time || 'Time not specified';

      toast.info(
        `You have ${activeAppointments.length} upcoming appointment${activeAppointments.length > 1 ? 's' : ''}! Next appointment on ${formattedDate} at ${time}`,
        {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "colored",
          style: {
            background: '#ff8fab',
            color: 'white',
            fontFamily: 'Fredoka One, cursive',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(255, 143, 171, 0.3)'
          }
        }
      );
      reminderShown.current = true;
    }
  }, [apptsLoading, activeAppointments]);

  // Add auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      // Fetch first name from Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Assuming the first document contains the user's data
        const userData = querySnapshot.docs[0].data();
        // Update userProfile in useAuth
        // This is a placeholder and should be replaced with actual implementation
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out. Please try again.');
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      scrollToTop();
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePetsClick = () => {
    if (petsLoading) {
      toast.info('Loading pets...', { position: "top-right" });
      return;
    }
    scrollToTop();
    navigate('/pets');
  };

  const handleAddPet = (e) => {
    e.stopPropagation(); // Prevent triggering the parent card's click
    scrollToTop();
    navigate('/pets/new');
  };

  useEffect(() => {
    if (location.state?.scrollToAppointmentId) {
      const el = appointmentRefs.current[location.state.scrollToAppointmentId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      // If no specific appointment to scroll to, scroll to top
      scrollToTop();
    }
  }, [location.state, appointments]);

  return (
    <div className="dashboard-container">
      <main className="dashboard-content">
        <section className="welcome-section">
          <div className="pet-icons">
            <span className="pet-icon dog">🐕</span>
            <span className="pet-icon cat">🐱</span>
            <span className="pet-icon paw">🐾</span>
          </div>
          <div className="welcome-content-wrapper">
            <h1>Welcome to Pawpoint{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}!</h1>
            <p>Your Furry friend deserves the ultimate pampering—let's get them scheduled for a tail-wagging, fluff-tastic day!</p>
            <form className="search-form" onSubmit={handleSearch}>
              <div className="search-container">
                <input
                  type="text"
                  id="dashboard-search"
                  name="dashboard-search"
                  placeholder="Search your friend's name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button type="submit" className="search-button">
                  <FaSearch />
                </button>
              </div>
            </form>
          </div>
        </section>
        <div className="stats-grid">
          <div className="stats-card" onClick={handlePetsClick}>
            <FaPaw className="stats-icon" />
            <div className="stats-info">
              <h3>My Pets</h3>
              {petsLoading ? (
                <p className="loading-text">Loading...</p>
              ) : (
                <>
                  <p className="stats-number">{pets?.length || 0}</p>
                  <p className="stats-label">
                    {pets?.length === 1 ? 'Pet' : 'Pets'} Registered
                  </p>
                  <div className="pet-tags">
                    {pets?.length > 0 ? (
                      pets.map(pet => (
                        <span key={pet.id} className="pet-tag">
                          <span className="pet-type-icon">
                            {pet.type && pet.type.toLowerCase().includes('dog') ? '🐶' : pet.type && pet.type.toLowerCase().includes('cat') ? '🐱' : '🐾'}
                          </span>
                          {pet.name}
                        </span>
                      ))
                    ) : (
                      <button 
                        className="add-pet-btn"
                        onClick={handleAddPet}
                      >
                        <FaPlus /> Add Your First Pet
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="stats-card" onClick={() => navigate('/appointments')}>
            <FaCalendar className="stats-icon" />
            <div className="stats-info">
              <h3>Appointments</h3>
              {apptsLoading ? (
                <p className="loading-text">Loading...</p>
              ) : (
                <>
                  <p className="stats-number">{activeAppointments.length}</p>
                  <p className="stats-label">Active Appointments</p>
                </>
              )}
            </div>
          </div>
        </div>
        {showLogoutConfirm && (
          <div className="logout-confirmation-modal">
            <div className="modal-content">
              <h2>Confirm Logout</h2>
              <p>Are you sure you want to log out?</p>
              <div className="modal-actions">
                <button className="confirm-button" onClick={handleConfirmLogout}>Yes, Logout</button>
                <button className="cancel-button" onClick={cancelLogout}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;