import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import AdminSidebar from './AdminSidebar';
import { FaCalendarAlt, FaClock, FaEnvelope, FaEdit, FaTimes, FaCheck, FaPaw, FaUser, FaListUl, FaExclamationTriangle } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState('Appointments');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState({ show: false, message: '', type: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', time: '', services: '', userId: '', petId: '', status: 'active' });
  const [editSelectedPetSize, setEditSelectedPetSize] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editServiceSelection, setEditServiceSelection] = useState([]);
  const [editServiceSizes, setEditServiceSizes] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [reminderEdits, setReminderEdits] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    userId: '',
    petId: '',
    date: '',
    time: '',
    services: [],
    serviceSizes: {},
    status: 'active'
  });
  const [newSelectedPetSize, setNewSelectedPetSize] = useState('');

  const pastelButton = {
    padding: '8px 16px',
    background: '#ffe4ec',
    color: '#c62828',
    border: '1px solid #ffd6e0',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 500,
    boxShadow: 'none',
    marginRight: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s, border 0.2s',
  };
  const pastelButtonBlue = {
    ...pastelButton,
    background: '#e3f2fd',
    color: '#1565c0',
    border: '1px solid #bbdefb',
  };
  const pastelButtonGreen = {
    ...pastelButton,
    background: '#e8f5e9',
    color: '#2e7d32',
    border: '1px solid #c8e6c9',
  };
  const pastelButtonOrange = {
    ...pastelButton,
    background: '#fff3e0',
    color: '#e65100',
    border: '1px solid #ffe0b2',
  };
  const pastelButtonGray = {
    ...pastelButton,
    background: '#f5f5f5',
    color: '#636e72',
    border: '1px solid #dfe6e9',
  };

  // Static services list (should match AppointmentForm.js)
  const allServices = [
    {
      id: 'bath-blowdry',
      name: 'Bath & Blowdry',
      prices: { small: 300, medium: 400, large: 500 }
    },
    {
      id: 'haircut-trim',
      name: 'Basic Haircut & Trim',
      prices: { small: 300, medium: 400, large: 500 }
    },
    {
      id: 'paw-pad-care',
      name: 'Paw Pad Care',
      price: 100
    },
    {
      id: 'teeth-cleaning',
      name: 'Teeth Cleaning',
      price: 100
    },
    {
      id: 'nail-trimming',
      name: 'Nail Trimming',
      price: 100
    },
    {
      id: 'ear-cleaning',
      name: 'Ear Cleaning',
      price: 100
    }
  ];

  useEffect(() => {
    setLoading(true);
    setError('');
    const appointmentsRef = collection(db, 'appointments');
    const unsubscribe = onSnapshot(appointmentsRef, async (appointmentsSnap) => {
      try {
        const [usersSnap, petsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'pets')),
        ]);
        
        // Filter out admin accounts from users
        const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const customerUsers = allUsers.filter(user => !user.isAdmin);
        
        // Create a comprehensive list of customer user IDs (both uid and id)
        const customerUserIds = new Set();
        customerUsers.forEach(user => {
          if (user.uid) customerUserIds.add(user.uid);
          if (user.id) customerUserIds.add(user.id);
        });
        
        // Filter appointments to only include customer appointments
        let fetchedAppointments = appointmentsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(appointment => {
            // Check multiple possible user ID fields
            const appointmentUserId = appointment.userId || appointment.uid || appointment.ownerId;
            return appointmentUserId && customerUserIds.has(appointmentUserId);
          });
        
        // Sort by createdAt
        fetchedAppointments = fetchedAppointments.sort((a, b) => {
          const dateA = a.createdAt ? (typeof a.createdAt === 'object' && a.createdAt.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt)) : new Date(0);
          const dateB = b.createdAt ? (typeof b.createdAt === 'object' && b.createdAt.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt)) : new Date(0);
          return dateB - dateA;
        });

        // Automatically update status to 'done' or 'cancelled' if needed
        const now = new Date();
        fetchedAppointments.forEach(async (apt) => {
          // Cancelled logic
          if (
            apt.status !== 'cancelled' &&
            apt.cancelledAt
          ) {
            await updateDoc(doc(db, 'appointments', apt.id), { status: 'cancelled' });
            apt.status = 'cancelled';
          }
          // Done logic
          /*
          else if (
            apt.status === 'active' &&
            apt.date &&
            ((apt.time && new Date(`${apt.date}T${apt.time}`) < new Date()) || (!apt.time && new Date(apt.date) < new Date()))
          ) {
            await updateDoc(doc(db, 'appointments', apt.id), { status: 'done' });
            apt.status = 'done';
          }
          */
        });

        // Filter pets to only include those owned by customers
        const allPets = petsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const customerPets = allPets.filter(pet => {
          // Check multiple possible user ID fields
          const petUserId = pet.userId || pet.uid || pet.ownerId;
          return petUserId && customerUserIds.has(petUserId);
        });

        setAppointments(fetchedAppointments);
        setUsers(customerUsers);
        setPets(customerPets);
      } catch (err) {
        setError('Failed to load data: ' + err.message);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Utility Functions ---

  const findUserById = (userId) => {
    return users.find(u => u.uid === userId || u.id === userId);
  };

  const getPetName = (petId) => {
    const pet = pets.find(p => p.id === petId);
    return pet ? pet.name : 'Unknown Pet';
  };

  const getOwnerName = (userId) => {
    const user = findUserById(userId);
    if (!user) return 'Unknown Owner';
    const { firstName, lastName } = user;
    return `${firstName || ''} ${lastName || ''}`.trim() || 'Unknown Owner';
  };

  const getOwnerEmail = (userId) => {
    const user = findUserById(userId);
    return user ? user.email : 'No Email';
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    setLoading(true);
    setError("");
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      const updateData = { status: newStatus };

      if (newStatus === 'cancelled') {
        updateData.cancelledAt = serverTimestamp();
      } else if (newStatus === 'no show') {
        updateData.noShowAt = serverTimestamp();
      }

      await updateDoc(appointmentRef, updateData);

      // We will now rely on the listener for local state updates
      // so no manual update here is needed.
    } catch (err) {
      setError('Failed to update status: ' + err.message);
      console.error('Error updating status:', err);
    }
    setLoading(false);
  };

  const openEditModal = (appointment) => {
    setEditingId(appointment.id);
    setEditForm({
      date: appointment.date || '',
      time: appointment.time || '',
      services: Array.isArray(appointment.services) ? appointment.services : (appointment.services ? [appointment.services] : []),
      userId: appointment.userId || '',
      petId: appointment.petId || '',
      status: appointment.status || 'active'
    });
    setEditServiceSelection(Array.isArray(appointment.services) ? appointment.services : (appointment.services ? [appointment.services] : []));
    setEditServiceSizes(appointment.serviceSizes || {});
    
    // Set pet size based on the selected pet
    const selectedPet = pets.find(pet => pet.id === appointment.petId);
    const petSize = selectedPet?.size?.toLowerCase() || 'medium';
    setEditSelectedPetSize(petSize);
    
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditSelectedPetSize('');
  };

  const handleEditPetChange = (petId) => {
    setEditForm(prev => ({ ...prev, petId }));
    
    // Update pet size and adjust service sizes accordingly
    const selectedPet = pets.find(pet => pet.id === petId);
    const petSize = selectedPet?.size?.toLowerCase() || 'medium';
    setEditSelectedPetSize(petSize);
    
    // Update service sizes for size-based services
    setEditServiceSizes(prevSizes => {
      const updatedSizes = { ...prevSizes };
      editServiceSelection.forEach(serviceId => {
        const service = allServices.find(s => s.id === serviceId);
        if (service?.prices && petSize && service.prices[petSize]) {
          updatedSizes[serviceId] = petSize;
        }
      });
      return updatedSizes;
    });
  };

  const handleEditServiceChange = (serviceId) => {
    setEditServiceSelection(prev => {
      const newSelection = prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId];
      
      // Auto-set size for newly added services based on pet size
      if (!prev.includes(serviceId)) {
        const service = allServices.find(s => s.id === serviceId);
        if (service?.prices && editSelectedPetSize && service.prices[editSelectedPetSize]) {
          setEditServiceSizes(prevSizes => ({ ...prevSizes, [serviceId]: editSelectedPetSize }));
        }
      }
      
      return newSelection;
    });
  };

  const handleEditServiceSizeChange = (serviceId, size) => {
    setEditServiceSizes(prev => ({ ...prev, [serviceId]: size }));
  };

  const getServicePrice = (service, size) => {
    if (service.prices) {
      return service.prices[size || 'medium'] || 0;
    }
    return service.price || 0;
  };

  const getEditTotalPrice = () => {
    let total = 0;
    editServiceSelection.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        if (service.prices) {
          const size = editServiceSizes[serviceId] || 'medium';
          total += service.prices[size] || 0;
        } else {
          total += service.price || 0;
        }
      }
    });
    return total;
  };

  const handleEditModalSave = async () => {
    if (!editingId) return;
    setLoading(true);
    setError("");
    try {
      const appointmentRef = doc(db, 'appointments', editingId);
      const updatedData = {
        date: editForm.date,
        time: editForm.time,
        petId: editForm.petId,
        services: editServiceSelection,
        serviceSizes: editServiceSizes,
        lastModifiedAt: serverTimestamp(),
        status: editForm.status || 'active',
      };
      await updateDoc(appointmentRef, updatedData);

      // We will now rely on the listener for local state updates
      // so no manual update here is needed.

      setShowEditModal(false);
      setEditingId(null);
      // toast.success("Appointment updated successfully!");
    } catch (err) {
      setError('Failed to update appointment: ' + err.message);
      console.error('Error updating appointment:', err);
      // toast.error('Failed to update appointment.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    if (editingId) {
      await handleEditModalSave();
    }
  };

  const getCardServiceBreakdown = (appointment) => {
    if (!appointment || !Array.isArray(appointment.services) || !allServices.length) return null;
    return appointment.services.map((serviceId, idx) => {
      const service = allServices.find(s => s.id === serviceId);
      if (!service) return null;
      let price = 0;
      let size = appointment.serviceSizes ? appointment.serviceSizes[serviceId] : undefined;
      if (service.prices) {
        size = size || 'medium';
        price = service.prices[size] || 0;
      } else {
        price = service.price || 0;
      }
      return (
        <div key={serviceId} style={{ fontSize: '0.98em', color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{service.name}{service.prices ? ` (${size?.charAt(0).toUpperCase() + size?.slice(1)})` : ''}:</span>
          <span style={{ color: '#ff8fab', fontWeight: 600 }}>₱{price}</span>
        </div>
      );
    });
  };

  const getCardTotalPrice = (appointment) => {
    if (!Array.isArray(appointment.services)) return 0;
    let total = 0;
    appointment.services.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        let size = appointment.serviceSizes ? appointment.serviceSizes[serviceId] : undefined;
        if (service.prices) {
          size = size || 'medium';
          total += service.prices[size] || 0;
        } else {
          total += service.price || 0;
        }
      }
    });
    return total;
  };

  const handleNewPetChange = (petId) => {
    setNewAppointment(prev => ({ ...prev, petId }));
    
    // Update pet size and adjust service sizes accordingly
    const selectedPet = pets.find(pet => pet.id === petId);
    const petSize = selectedPet?.size?.toLowerCase() || 'medium';
    setNewSelectedPetSize(petSize);
    
    // Update service sizes for size-based services
    setNewAppointment(prev => {
      const updatedSizes = { ...prev.serviceSizes };
      prev.services.forEach(serviceId => {
        const service = allServices.find(s => s.id === serviceId);
        if (service?.prices && petSize && service.prices[petSize]) {
          updatedSizes[serviceId] = petSize;
        }
      });
      return { ...prev, serviceSizes: updatedSizes };
    });
  };

  const handleNewServiceChange = (serviceId) => {
    setNewAppointment(prev => {
      const newServices = prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId];
      
      const updatedSizes = { ...prev.serviceSizes };
      
      // Auto-set size for newly added services based on pet size
      if (!prev.services.includes(serviceId)) {
        const service = allServices.find(s => s.id === serviceId);
        if (service?.prices && newSelectedPetSize && service.prices[newSelectedPetSize]) {
          updatedSizes[serviceId] = newSelectedPetSize;
        }
      }
      
      return { ...prev, services: newServices, serviceSizes: updatedSizes };
    });
  };

  const handleNewServiceSizeChange = (serviceId, size) => {
    setNewAppointment(prev => ({
      ...prev,
      serviceSizes: { ...prev.serviceSizes, [serviceId]: size }
    }));
  };

  const getNewTotalPrice = () => {
    let total = 0;
    newAppointment.services.forEach(serviceId => {
      const service = allServices.find(s => s.id === serviceId);
      if (service) {
        if (service.prices) {
          const size = newAppointment.serviceSizes[serviceId] || 'medium';
          total += service.prices[size] || 0;
        } else {
          total += service.price || 0;
        }
      }
    });
    return total;
  };

  // --- Main Render ---
  return (
    <div className="admin-dashboard-layout pastel-theme">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-main">
        <div className="admin-dashboard-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
            <h1 style={{ margin: 0 }}>Appointments</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                color: 'white',
                border: 'none',
                padding: '12px 28px',
                borderRadius: 40,
                fontFamily: 'Fredoka One, cursive',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(255, 143, 171, 0.25)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 143, 171, 0.35)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 143, 171, 0.25)';
              }}
            >
              <FaCalendarAlt /> Create Appointment
            </button>
          </div>
        </div>
        {/* Filter and Search Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <label style={{ fontWeight: 600, color: '#ff8fab' }}>
            Status:
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                marginLeft: 8,
                padding: '6px 16px',
                borderRadius: 10,
                border: '1.5px solid #ffd6e6',
                background: '#fff0f6',
                color: '#c62828',
                fontWeight: 500,
                outline: 'none',
                fontSize: '1em',
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
              <option value="no show">No Show</option>
            </select>
          </label>
          <form
            onSubmit={e => {
              e.preventDefault();
              setSearchQuery(searchInput.trim());
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <input
              type="text"
              placeholder="Search owner name..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{
                padding: '6px 16px',
                borderRadius: 10,
                border: '1.5px solid #ffd6e6',
                background: '#fff0f6',
                color: '#444',
                fontWeight: 500,
                outline: 'none',
                fontSize: '1em',
                minWidth: 180
              }}
            />
            <button
              type="submit"
              style={{
                padding: '6px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#ff8fab',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1em',
                transition: 'background 0.2s',
              }}
            >Search</button>
          </form>
        </div>
        {loading ? (
          <div style={{ padding: 32 }}>Loading...</div>
        ) : error ? (
          <div style={{ color: 'red', padding: 32 }}>{error}</div>
        ) : (
          <div className="appointments-card-list" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            margin: '0 auto',
            alignItems: 'stretch',
            maxWidth: '1100px',
            width: '100%',
          }}>
            {appointments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#ff8fab', fontWeight: 600, fontSize: '1.2em', background: '#fff0f6', borderRadius: 18 }}>
                No appointments found. Create one by clicking the button above!
              </div>
            ) : (
              appointments
                .filter(apt => {
                  const statusMatch = statusFilter === 'all' || apt.status === statusFilter;
                  
                  const user = findUserById(apt.userId);
                  const ownerName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase() : '';
                  const searchMatch = !searchQuery || ownerName.includes(searchQuery.toLowerCase());
                  
                  return statusMatch && searchMatch;
                })
                .map((appointment, idx) => {
                  const pet = pets.find(p => p.id === appointment.petId);
                  const user = findUserById(appointment.userId);
                  if (!pet || !user) return null;

                  return (
                    <div key={appointment.id} className="appointment-card pastel-theme" style={{
                      background: idx % 2 === 0 ? '#fff5f8' : '#fff0f6',
                      borderRadius: 18,
                      boxShadow: '0 2px 12px #ffd6e0',
                      padding: '8px 20px',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 2,
                      border: '1.5px solid #ffd6e6',
                      position: 'relative',
                      width: '100%',
                      maxWidth: '100%',
                      alignItems: 'flex-start',
                      margin: '0 auto',
                      minHeight: 220,
                    }}>
                      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* User Information Section */}
                        <div style={{ 
                          background: '#fff', 
                          padding: '12px 16px', 
                          borderRadius: '12px',
                          border: '1px solid #ffd6e6',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1em', color: '#ff8fab', display: 'flex', alignItems: 'center', gap: 8, marginBottom: '4px' }}>
                            <FaUser /> {user.firstName} {user.lastName}
                          </span>
                          <span style={{ fontWeight: 500, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FaEnvelope style={{ color: '#b2bec3' }} /> {user.email || 'No email'}
                          </span>
                        </div>

                        {/* Rest of the appointment information */}
                        <span style={{ fontWeight: 500, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaListUl style={{ color: '#ffb6d5' }} /> {Array.isArray(appointment.services) ? appointment.services.join(', ') : '-'}
                        </span>
                        <span style={{ fontWeight: 500, color: '#444', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaPaw style={{ color: appointment.status === 'active' ? '#2e7d32' : appointment.status === 'done' ? '#1565c0' : appointment.status === 'cancelled' ? '#c62828' : appointment.status === 'no show' ? '#e65100' : '#b2bec3' }} />
                          <span style={{
                            padding: '4px 16px',
                            borderRadius: '16px',
                            backgroundColor: appointment.status === 'active' ? '#e8f5e9' : appointment.status === 'done' ? '#e3f2fd' : appointment.status === 'cancelled' ? '#ffebee' : appointment.status === 'no show' ? '#fff3e0' : '#f5f5f5',
                            color: appointment.status === 'active' ? '#2e7d32' : appointment.status === 'done' ? '#1565c0' : appointment.status === 'cancelled' ? '#c62828' : appointment.status === 'no show' ? '#e65100' : '#636e72',
                            fontWeight: 600,
                            fontSize: '1em',
                            display: 'inline-block',
                          }}>{appointment.status || 'active'}</span>
                        </span>
                        
                        {/* Re-adding missing fields */}
                        <span style={{ color: '#444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaCalendarAlt style={{ color: '#ffb6d5' }} />
                          Booked on: {appointment.createdAt ? (
                            typeof appointment.createdAt === 'object' && appointment.createdAt.seconds
                              ? new Date(appointment.createdAt.seconds * 1000).toLocaleString()
                              : new Date(appointment.createdAt).toLocaleString()
                          ) : '-'}
                        </span>
                        <span style={{ color: '#444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FaPaw style={{ color: '#ffb6d5' }} /> Pet: <b>{pet?.name || '-'}</b>
                        </span>

                        {/* Appointment Date and Time */}
                        <div style={{
                          margin: '8px 0',
                          padding: '8px 12px',
                          borderTop: '1.5px dashed #ffd6e6',
                          borderBottom: '1.5px dashed #ffd6e6',
                          background: '#fff',
                          borderRadius: '8px'
                        }}>
                          <span style={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FaCalendarAlt /> <b>{appointment.date || 'Date not set'}</b>
                          </span>
                          <span style={{ fontWeight: 600, color: '#d32f2f', display: 'flex', alignItems: 'center', gap: 8, marginTop: '4px' }}>
                            <FaClock /> <b>{appointment.time || 'Time not set'}</b>
                          </span>
                        </div>

                        {appointment.status === 'cancelled' && appointment.cancelledAt && (
                          <span style={{ color: '#c62828', fontWeight: 500, fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaTimes style={{ color: '#c62828' }} /> Cancelled at: {typeof appointment.cancelledAt === 'object' && appointment.cancelledAt.seconds ? new Date(appointment.cancelledAt.seconds * 1000).toLocaleString() : new Date(appointment.cancelledAt).toLocaleString()}
                          </span>
                        )}
                        {appointment.status === 'no show' && appointment.noShowAt && (
                          <span style={{ color: '#e65100', fontWeight: 500, fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaExclamationTriangle style={{ color: '#e65100' }} /> Marked as No Show at: {typeof appointment.noShowAt === 'object' && appointment.noShowAt.seconds ? new Date(appointment.noShowAt.seconds * 1000).toLocaleString() : new Date(appointment.noShowAt).toLocaleString()}
                          </span>
                        )}
                        {appointment.lastModifiedAt && (
                          <span style={{ color: '#888', fontWeight: 500, fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FaEdit style={{ color: '#888' }} /> Modified at: {typeof appointment.lastModifiedAt === 'object' && appointment.lastModifiedAt.seconds ? new Date(appointment.lastModifiedAt.seconds * 1000).toLocaleString() : new Date(appointment.lastModifiedAt).toLocaleString()}
                          </span>
                        )}
                        
                        {getCardServiceBreakdown(appointment)}
                        <div style={{ fontWeight: 700, color: '#f06292', marginTop: 4 }}>Total: ₱{getCardTotalPrice(appointment)}</div>
                        <div style={{ display: 'flex', gap: 18, marginTop: 18, justifyContent: 'center' }}>
                          {(appointment.status === 'active') && (
                            <>
                              <button
                                onClick={() => handleStatusChange(appointment.id, 'no show')}
                                style={pastelButtonOrange}
                              >
                                <FaExclamationTriangle /> No Show
                              </button>

                              {new Date(appointment.date) > new Date() && (
                                <button
                                  onClick={() => {
                                    setCancelTargetId(appointment.id);
                                    setShowCancelModal(true);
                                  }}
                                  style={pastelButton}
                                >
                                  <FaTimes /> Cancel
                                </button>
                              )}
                            </>
                          )}
                          {appointment.status !== 'cancelled' && appointment.status !== 'no show' && (
                            <button onClick={() => openEditModal(appointment)} style={pastelButtonBlue}>
                              <FaEdit /> Edit
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 220, maxWidth: 320, marginLeft: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                        <label style={{ color: '#ff8fab', fontWeight: 600, fontSize: '0.98em', marginBottom: 6, alignSelf: 'flex-start' }}>Admin Reminder:</label>
                        <textarea
                          value={reminderEdits[appointment.id] !== undefined ? reminderEdits[appointment.id] : (appointment.adminReminder || '')}
                          onChange={e => setReminderEdits(r => ({ ...r, [appointment.id]: e.target.value }))}
                          onBlur={async e => {
                            const newVal = e.target.value;
                            if (newVal !== (appointment.adminReminder || '')) {
                              // Save to Firestore
                              await updateDoc(doc(db, 'appointments', appointment.id), { adminReminder: newVal });
                            }
                          }}
                          placeholder="Type a reminder for this appointment..."
                          style={{
                            width: '100%',
                            minHeight: 80,
                            maxHeight: 120,
                            borderRadius: 12,
                            border: '1.5px solid #ffd6e6',
                            background: '#fff',
                            color: '#444',
                            fontSize: '0.97em',
                            padding: '10px',
                            fontFamily: 'Quicksand, sans-serif',
                            resize: 'vertical',
                            boxShadow: '0 2px 8px #ffd6e0',
                            marginBottom: 4,
                          }}
                          disabled={appointment.status === 'cancelled' || appointment.status === 'no show'}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}
      </main>
      {showConfirmModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 143, 171, 0.18)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="modal-content" style={{
            background: '#fff5f8', borderRadius: 18, boxShadow: '0 4px 24px #ffb6d555',
            padding: '32px 32px 24px 32px', minWidth: 340, maxWidth: 400, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 18, border: '2px solid #ffd6e6', position: 'relative',
            fontSize: '1rem',
          }}>
            <h3 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 12, textAlign: 'center', fontSize: '1.15rem' }}>Confirm Changes</h3>
            <div style={{ color: '#444', fontSize: '0.98em', textAlign: 'center', marginBottom: 10 }}>Are you sure you want to save these changes to this appointment?</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10 }}>
              <button
                onClick={() => { setShowConfirmModal(false); handleConfirmSave(); }}
                style={{
                  background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: 40,
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: '0 2px 8px rgba(255, 143, 171, 0.10)',
                  letterSpacing: '0.5px',
                }}
              >Yes, Save</button>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: '#fff5f8',
                  color: '#ff8fab',
                  border: '1.5px solid #ffd6e6',
                  padding: '12px 24px',
                  borderRadius: 40,
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  letterSpacing: '0.5px',
                }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showCancelModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 143, 171, 0.18)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="modal-content" style={{
            background: '#fff5f8', borderRadius: 18, boxShadow: '0 4px 24px #ffb6d555',
            padding: '32px 32px 24px 32px', minWidth: 340, maxWidth: 400, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 18, border: '2px solid #ffd6e6', position: 'relative',
            fontSize: '1rem',
          }}>
            <h3 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 12, textAlign: 'center', fontSize: '1.15rem' }}>Confirm Cancellation</h3>
            <div style={{ color: '#444', fontSize: '0.98em', textAlign: 'center', marginBottom: 10 }}>Are you sure you want to cancel this appointment?</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10 }}>
              <button
                onClick={() => { setShowCancelModal(false); handleStatusChange(cancelTargetId, 'cancelled'); }}
                style={{
                  background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 28px',
                  borderRadius: 40,
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: '0 2px 8px rgba(255, 143, 171, 0.10)',
                  letterSpacing: '0.5px',
                }}
              >Yes, Cancel</button>
              <button
                onClick={() => setShowCancelModal(false)}
                style={{
                  background: '#fff5f8',
                  color: '#ff8fab',
                  border: '1.5px solid #ffd6e6',
                  padding: '12px 24px',
                  borderRadius: 40,
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  letterSpacing: '0.5px',
                }}
              >No, Go Back</button>
            </div>
          </div>
        </div>
      )}
      {showCreateModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 143, 171, 0.18)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="modal-content" style={{
            background: '#fff5f8', borderRadius: 18, boxShadow: '0 4px 24px #ffb6d555',
            padding: '32px', minWidth: 340, maxWidth: 600, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 18, border: '2px solid #ffd6e6',
          }}>
            <h3 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 12 }}>Create New Appointment</h3>
            
            {/* Add form fields for new appointment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Select Customer:</label>
                <select
                  value={newAppointment.userId}
                  onChange={(e) => {
                    setNewAppointment({ 
                      ...newAppointment, 
                      userId: e.target.value, 
                      petId: '',
                      services: [],
                      serviceSizes: {}
                    });
                    setNewSelectedPetSize('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #ffd6e6',
                    background: '#fff',
                  }}
                >
                  <option value="">Select a customer...</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {newAppointment.userId && (
                <div>
                  <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Select Pet:</label>
                  <select
                    value={newAppointment.petId}
                    onChange={(e) => handleNewPetChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                    }}
                  >
                    <option value="">Select a pet...</option>
                    {pets.filter(pet => pet.userId === newAppointment.userId).map(pet => (
                      <option key={pet.id} value={pet.id}>{pet.name} ({pet.size || 'Unknown size'})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Date:</label>
                <input
                  type="date"
                  value={newAppointment.date}
                  onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #ffd6e6',
                    background: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Time:</label>
                <input
                  type="time"
                  value={newAppointment.time}
                  onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #ffd6e6',
                    background: '#fff',
                  }}
                />
              </div>

              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Services:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {allServices.map(service => (
                    <div key={service.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px',
                      background: newAppointment.services.includes(service.id) ? '#fff0f6' : '#fff',
                      border: `1.5px solid ${newAppointment.services.includes(service.id) ? '#ff8fab' : '#ffd6e6'}`,
                      borderRadius: 12,
                      transition: 'all 0.2s'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={newAppointment.services.includes(service.id)}
                          onChange={() => handleNewServiceChange(service.id)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 500, color: '#444' }}>{service.name}</span>
                      </label>
                      {service.prices && newAppointment.services.includes(service.id) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(() => {
                            // If pet size is known and available for this service, only show that size
                            if (newSelectedPetSize && service.prices[newSelectedPetSize]) {
                              return (
                                <span style={{ 
                                  padding: '4px 12px', 
                                  background: '#ff8fab', 
                                  color: 'white', 
                                  borderRadius: 20, 
                                  fontSize: '0.9em',
                                  fontWeight: 600
                                }}>
                                  {newSelectedPetSize.charAt(0).toUpperCase() + newSelectedPetSize.slice(1)} - ₱{service.prices[newSelectedPetSize]}
                                </span>
                              );
                            }
                            // Otherwise, show size selector
                            return (
                              <select
                                value={newAppointment.serviceSizes[service.id] || 'medium'}
                                onChange={(e) => handleNewServiceSizeChange(service.id, e.target.value)}
                                style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: 8, 
                                  border: '1px solid #ffd6e6',
                                  background: '#fff',
                                  fontSize: '0.9em'
                                }}
                              >
                                <option value="small">Small (₱{service.prices.small})</option>
                                <option value="medium">Medium (₱{service.prices.medium})</option>
                                <option value="large">Large (₱{service.prices.large})</option>
                              </select>
                            );
                          })()}
                        </div>
                      )}
                      {!service.prices && newAppointment.services.includes(service.id) && (
                        <span style={{ 
                          padding: '4px 12px', 
                          background: '#ff8fab', 
                          color: 'white', 
                          borderRadius: 20, 
                          fontSize: '0.9em',
                          fontWeight: 600
                        }}>
                          ₱{service.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Price */}
              <div style={{ 
                textAlign: 'right', 
                fontWeight: 'bold', 
                color: '#ff8fab', 
                fontSize: '1.2rem',
                padding: '16px',
                background: '#fff',
                borderRadius: 12,
                border: '1.5px solid #ffd6e6'
              }}>
                Total: ₱{getNewTotalPrice()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAppointment({
                    userId: '',
                    petId: '',
                    date: '',
                    time: '',
                    services: [],
                    serviceSizes: {},
                    status: 'active'
                  });
                  setNewSelectedPetSize('');
                }}
                style={{
                  background: '#fff',
                  color: '#ff8fab',
                  border: '1.5px solid #ffd6e6',
                  padding: '10px 24px',
                  borderRadius: 40,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await addDoc(collection(db, 'appointments'), {
                      ...newAppointment,
                      createdAt: serverTimestamp(),
                      status: 'active'
                    });
                    setShowCreateModal(false);
                    setNewAppointment({
                      userId: '',
                      petId: '',
                      date: '',
                      time: '',
                      services: [],
                      serviceSizes: {},
                      status: 'active'
                    });
                    setNewSelectedPetSize('');
                  } catch (err) {
                    console.error('Error creating appointment:', err);
                    setError('Failed to create appointment: ' + err.message);
                  }
                }}
                disabled={!newAppointment.userId || !newAppointment.petId || !newAppointment.date || !newAppointment.services.length}
                style={{
                  background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 40,
                  cursor: 'pointer',
                  opacity: (!newAppointment.userId || !newAppointment.petId || !newAppointment.date || !newAppointment.services.length) ? 0.7 : 1,
                }}
              >
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255, 143, 171, 0.18)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="modal-content" style={{
            background: '#fff5f8', borderRadius: 18, boxShadow: '0 4px 24px #ffb6d555',
            padding: '32px', minWidth: 340, maxWidth: 700, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 18, border: '2px solid #ffd6e6',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 12, textAlign: 'center', fontSize: '1.15rem' }}>Edit Appointment</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Customer Selection */}
              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Customer:</label>
                <select
                  value={editForm.userId}
                  onChange={(e) => setEditForm({ ...editForm, userId: e.target.value, petId: '' })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #ffd6e6',
                    background: '#fff',
                    color: '#444',
                    fontSize: '1em'
                  }}
                >
                  <option value="">Select a customer...</option>
                  {users.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.firstName} {user.lastName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Pet Selection */}
              {editForm.userId && (
                <div>
                  <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Pet:</label>
                  <select
                    value={editForm.petId}
                    onChange={(e) => handleEditPetChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      color: '#444',
                      fontSize: '1em'
                    }}
                  >
                    <option value="">Select a pet...</option>
                    {pets.filter(pet => pet.userId === editForm.userId).map(pet => (
                      <option key={pet.id} value={pet.id}>
                        {pet.name} ({pet.size || 'Unknown size'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date and Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Date:</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      color: '#444',
                      fontSize: '1em'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Time:</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      color: '#444',
                      fontSize: '1em'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Status:</label>
                <select
                  value={editForm.status || ''}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid #ffd6e6',
                    background: '#fff',
                    color: '#444',
                    fontSize: '1em',
                    marginBottom: 12
                  }}
                >
                  <option value="active">Active</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no show">No Show</option>
                </select>
              </div>

              {/* Services Selection */}
              <div>
                <label style={{ color: '#444', fontWeight: 600, marginBottom: 6, display: 'block' }}>Services:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  {allServices.map(service => (
                    <div key={service.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px',
                      background: editServiceSelection.includes(service.id) ? '#fff0f6' : '#fff',
                      border: `1.5px solid ${editServiceSelection.includes(service.id) ? '#ff8fab' : '#ffd6e6'}`,
                      borderRadius: 12,
                      transition: 'all 0.2s'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={editServiceSelection.includes(service.id)}
                          onChange={() => handleEditServiceChange(service.id)}
                          style={{ transform: 'scale(1.2)' }}
                        />
                        <span style={{ fontWeight: 500, color: '#444' }}>{service.name}</span>
                      </label>
                      {service.prices && editServiceSelection.includes(service.id) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(() => {
                            // If pet size is known and available for this service, only show that size
                            if (editSelectedPetSize && service.prices[editSelectedPetSize]) {
                              return (
                                <span style={{ 
                                  padding: '4px 12px', 
                                  background: '#ff8fab', 
                                  color: 'white', 
                                  borderRadius: 20, 
                                  fontSize: '0.9em',
                                  fontWeight: 600
                                }}>
                                  {editSelectedPetSize.charAt(0).toUpperCase() + editSelectedPetSize.slice(1)} - ₱{service.prices[editSelectedPetSize]}
                                </span>
                              );
                            }
                            // Otherwise, show size selector
                            return (
                              <select
                                value={editServiceSizes[service.id] || 'medium'}
                                onChange={(e) => handleEditServiceSizeChange(service.id, e.target.value)}
                                style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: 8, 
                                  border: '1px solid #ffd6e6',
                                  background: '#fff',
                                  fontSize: '0.9em'
                                }}
                              >
                                <option value="small">Small (₱{service.prices.small})</option>
                                <option value="medium">Medium (₱{service.prices.medium})</option>
                                <option value="large">Large (₱{service.prices.large})</option>
                              </select>
                            );
                          })()}
                        </div>
                      )}
                      {!service.prices && editServiceSelection.includes(service.id) && (
                        <span style={{ 
                          padding: '4px 12px', 
                          background: '#ff8fab', 
                          color: 'white', 
                          borderRadius: 20, 
                          fontSize: '0.9em',
                          fontWeight: 600
                        }}>
                          ₱{service.price}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Price */}
              <div style={{ 
                textAlign: 'right', 
                fontWeight: 'bold', 
                color: '#ff8fab', 
                fontSize: '1.2rem',
                padding: '16px',
                background: '#fff',
                borderRadius: 12,
                border: '1.5px solid #ffd6e6'
              }}>
                Total: ₱{getEditTotalPrice()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
              <button 
                onClick={closeEditModal} 
                style={{
                  background: '#fff',
                  color: '#ff8fab',
                  border: '1.5px solid #ffd6e6',
                  padding: '10px 24px',
                  borderRadius: 40,
                  cursor: 'pointer',
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowConfirmModal(true)} 
                style={{
                  background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 24px',
                  borderRadius: 40,
                  cursor: 'pointer',
                  fontFamily: 'Fredoka One, cursive',
                  fontSize: '1rem',
                  transition: 'all 0.2s'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;