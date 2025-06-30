import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminSidebar from './AdminSidebar';
import { FaPaw, FaUser, FaDog, FaCat, FaBirthdayCake, FaVenusMars, FaRuler, FaNotesMedical, FaEdit, FaTrash, FaEnvelope } from 'react-icons/fa';
import './AdminPets.css';

const AdminPets = () => {
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState('Pets');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPet, setEditingPet] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [petsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'pets'), orderBy('createdAt', 'desc'))),
          getDocs(collection(db, 'users'))
        ]);

        const allPetsData = petsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const allUsersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter out admin accounts - only keep customer data
        const customerUsersData = allUsersData.filter(user => !user.isAdmin);
        
        // Create a comprehensive list of customer user IDs (both uid and id)
        const customerUserIds = new Set();
        customerUsersData.forEach(user => {
          if (user.uid) customerUserIds.add(user.uid);
          if (user.id) customerUserIds.add(user.id);
        });
        
        // Filter pets to only include those owned by customers
        const customerPetsData = allPetsData.filter(pet => {
          // Check multiple possible user ID fields
          const petUserId = pet.userId || pet.uid || pet.ownerId;
          return petUserId && customerUserIds.has(petUserId);
        });

        setPets(customerPetsData);
        setUsers(customerUsersData);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getOwnerName = (ownerId) => {
    const owner = users.find(u => u.uid === ownerId || u.id === ownerId);
    if (!owner) return 'No Name';
    const first = owner.firstName ? owner.firstName.trim() : '';
    const last = owner.lastName ? owner.lastName.trim() : '';
    const displayName = (first + ' ' + last).trim();
    return displayName || 'No Name';
  };

  const getOwnerEmail = (ownerId) => {
    const owner = users.find(u => u.uid === ownerId || u.id === ownerId);
    return owner && owner.email ? owner.email : 'No Email';
  };

  const capitalizeWords = (str) => {
    if (!str) return 'Unknown';
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleEdit = (pet) => {
    setEditingPet({ ...pet });
    setShowModal(true);
  };

  const handleEditSave = (e) => {
    e.preventDefault();
    setPendingEdit({ ...editingPet });
    setShowEditConfirm(true);
  };

  const confirmEditSave = async () => {
    setShowEditConfirm(false);
    setShowModal(false);
    try {
      const petRef = doc(db, 'pets', pendingEdit.id);
      await updateDoc(petRef, {
        name: pendingEdit.name,
        type: pendingEdit.type,
        breed: pendingEdit.breed,
        age: pendingEdit.age,
        gender: pendingEdit.gender,
        birthday: pendingEdit.birthday,
        size: pendingEdit.size,
        additionalNotes: pendingEdit.additionalNotes,
        medicalNotes: pendingEdit.medicalNotes
      });
      setPets(pets.map(pet => 
        pet.id === pendingEdit.id ? { ...pet, ...pendingEdit } : pet
      ));
      setEditingPet(null);
      setPendingEdit(null);
    } catch (err) {
      setError('Failed to update pet: ' + err.message);
      console.error('Error updating pet:', err);
    }
  };

  const cancelEditSave = () => {
    setShowEditConfirm(false);
    setPendingEdit(null);
  };

  const handleDelete = (petId) => {
    setDeleteConfirm(petId);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'pets', deleteConfirm));
      setPets(pets.filter(pet => pet.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete pet: ' + err.message);
      console.error('Error deleting pet:', err);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const filteredPets = pets.filter(pet => {
    const typeMatch = filterType === 'all' || pet.type?.toLowerCase() === filterType.toLowerCase();
    const searchMatch = !searchTerm || pet.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return typeMatch && searchMatch;
  });

  const renderPetTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'dog':
        return <FaDog className="pet-type-icon dog" />;
      case 'cat':
        return <FaCat className="pet-type-icon cat" />;
      default:
        return <FaPaw className="pet-type-icon other" />;
    }
  };

  return (
    <div className="admin-dashboard-layout pastel-theme">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-main-content">
        <div className="admin-dashboard-header">Pet Management</div>
        
        <div className="pets-controls">
          <div className="filter-container">
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
            </select>
          </div>
          <div className="search-container" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <FaPaw style={{ position: 'absolute', left: 12, color: '#ffb6d5' }} />
            <input
              type="text"
              placeholder="Search by pet name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px 8px 36px',
                borderRadius: 10,
                border: '1.5px solid #ffd6e6',
                background: '#fff0f6',
                color: '#444',
                fontWeight: 500,
                outline: 'none',
                fontSize: '1em',
                minWidth: 220,
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-message">Loading pets data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="pets-grid">
            {filteredPets.length === 0 ? (
              <div className="no-data">No pets found.</div>
            ) : (
              filteredPets.map(pet => (
                <div key={pet.id} className="pet-card">
                  <div className="pet-header">
                    {renderPetTypeIcon(pet.type)}
                    <h3>{pet.name}</h3>
                    <div className="pet-actions">
                      <button 
                        className="action-button edit"
                        onClick={() => handleEdit(pet)}
                        title="Edit Pet"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handleDelete(pet.id)}
                        title="Delete Pet"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <div className="pet-info">
                    <div className="info-row owner-info">
                      <FaUser className="info-icon" />
                      <span>Owner Name: {getOwnerName(pet.userId) || pet.userId}</span>
                    </div>
                    <div className="info-row owner-info">
                      <FaEnvelope className="info-icon" />
                      <span>Owner Email: {getOwnerEmail(pet.userId) || "No Email"}</span>
                    </div>
                    <div className="info-row">
                      <FaPaw className="info-icon" />
                      <span>Name: {capitalizeWords(pet.name)}</span>
                    </div>
                    <div className="info-row">
                      <FaPaw className="info-icon" />
                      <span>Breed: {capitalizeWords(pet.breed)}</span>
                    </div>
                    <div className="info-row">
                      <FaBirthdayCake className="info-icon" />
                      <span>Age: {pet.age || 'Unknown'}</span>
                    </div>
                    <div className="info-row">
                      <FaVenusMars className="info-icon" />
                      <span>Gender: {capitalizeWords(pet.gender)}</span>
                    </div>
                    <div className="info-row">
                      <FaBirthdayCake className="info-icon" />
                      <span>Birthday: {formatDate(pet.birthday) || 'Unknown'}</span>
                    </div>
                    <div className="info-row">
                      <FaRuler className="info-icon" />
                      <span>Size: {capitalizeWords(pet.size)}</span>
                    </div>
                    {pet.additionalNotes && (
                      <div className="info-row additional-notes">
                        <FaNotesMedical className="info-icon" />
                        <span>Additional Notes: {capitalizeWords(pet.additionalNotes)}</span>
                      </div>
                    )}
                    {pet.medicalNotes && (
                      <div className="info-row medical-notes">
                        <FaNotesMedical className="info-icon" />
                        <span>Medical Notes: {capitalizeWords(pet.medicalNotes)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Edit Modal */}
        {showModal && editingPet && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 143, 171, 0.10)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div className="modal-content" style={{
              background: '#fff5f8',
              borderRadius: 18,
              boxShadow: '0 4px 24px #ffb6d555',
              padding: '36px 32px 28px 32px',
              minWidth: 340,
              maxWidth: 420,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              border: '2px solid #ffd6e6',
              position: 'relative',
            }}>
              <h2 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 18, textAlign: 'center' }}>Edit Pet Information</h2>
              <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Name:</label>
                  <input
                    type="text"
                    value={editingPet.name}
                    onChange={e => setEditingPet({ ...editingPet, name: e.target.value })}
                    required
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Type:</label>
                  <select
                    value={editingPet.type}
                    onChange={e => setEditingPet({ ...editingPet, type: e.target.value })}
                    required
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Breed:</label>
                  <input
                    type="text"
                    value={editingPet.breed || ''}
                    onChange={e => setEditingPet({ ...editingPet, breed: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Age:</label>
                  <input
                    type="number"
                    value={editingPet.age || ''}
                    onChange={e => setEditingPet({ ...editingPet, age: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Gender:</label>
                  <select
                    value={editingPet.gender || ''}
                    onChange={e => setEditingPet({ ...editingPet, gender: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Birthday:</label>
                  <input
                    type="date"
                    value={(() => {
                      if (!editingPet.birthday) return '';
                      if (typeof editingPet.birthday === 'string') {
                        if (/^\d{4}-\d{2}-\d{2}$/.test(editingPet.birthday)) return editingPet.birthday;
                        try {
                          return new Date(editingPet.birthday).toISOString().split('T')[0];
                        } catch {
                          return '';
                        }
                      }
                      if (typeof editingPet.birthday === 'object' && editingPet.birthday.seconds) {
                        try {
                          return new Date(editingPet.birthday.seconds * 1000).toISOString().split('T')[0];
                        } catch {
                          return '';
                        }
                      }
                      if (editingPet.birthday instanceof Date) {
                        try {
                          return editingPet.birthday.toISOString().split('T')[0];
                        } catch {
                          return '';
                        }
                      }
                      return '';
                    })()}
                    onChange={e => setEditingPet({ ...editingPet, birthday: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Size:</label>
                  <select
                    value={editingPet.size || ''}
                    onChange={e => setEditingPet({ ...editingPet, size: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Select Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Additional Notes:</label>
                  <textarea
                    value={editingPet.additionalNotes || ''}
                    onChange={e => setEditingPet({ ...editingPet, additionalNotes: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                      minHeight: 60,
                    }}
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ color: '#ff8fab', fontWeight: 600 }}>Medical Notes:</label>
                  <textarea
                    value={editingPet.medicalNotes || ''}
                    onChange={e => setEditingPet({ ...editingPet, medicalNotes: e.target.value })}
                    style={{
                      padding: '10px',
                      borderRadius: 10,
                      border: '1.5px solid #ffd6e6',
                      background: '#fff',
                      fontSize: '1em',
                      color: '#444',
                      fontFamily: 'inherit',
                      minHeight: 60,
                    }}
                  />
                </div>
                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 18 }}>
                  <button type="submit" className="save-button" style={{
                    background: 'linear-gradient(45deg, #ff8fab, #f06292)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 26px',
                    borderRadius: 30,
                    fontFamily: 'Fredoka One, cursive',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 2px 8px rgba(255, 143, 171, 0.10)',
                  }}>Save Changes</button>
                  <button type="button" className="cancel-button" style={{
                    background: '#fff5f8',
                    color: '#ff8fab',
                    border: '1.5px solid #ffd6e6',
                    padding: '12px 22px',
                    borderRadius: 30,
                    fontFamily: 'Fredoka One, cursive',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  }}
                    onClick={() => {
                      setShowModal(false);
                      setEditingPet(null);
                    }}
                  >Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Confirmation Modal */}
        {showEditConfirm && pendingEdit && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Edit</h2>
              <p>Are you sure you want to save these changes to this pet?</p>
              <div className="modal-actions">
                <button className="save-button" onClick={confirmEditSave}>Confirm</button>
                <button className="cancel-button" onClick={cancelEditSave}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal-overlay">
            <div className="modal-content delete-confirmation">
              <h2>Confirm Delete</h2>
              <p>Are you sure you want to delete this pet? This action cannot be undone.</p>
              <div className="modal-actions">
                <button 
                  className="delete-button"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
                <button 
                  className="cancel-button"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPets; 