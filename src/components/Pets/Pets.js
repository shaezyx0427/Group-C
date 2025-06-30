import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { doc, deleteDoc, collection, getDocs, getDoc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { logAuditTrail, AUDIT_ACTIONS } from '../../utils/auditLogger';
import { FaPlus, FaArrowLeft, FaEdit, FaTrash, FaPaw, FaVenusMars, FaRuler, FaBirthdayCake, FaEllipsisV } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Pets.css';

// PetCard Component
const PetCard = ({ pet, onEdit, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Function to clean pet name by removing "dog" and "cat" words
  const cleanPetName = (name) => {
    if (!name) return '';
    return name
      .replace(/\b(dog|cat)\b/gi, '') // Remove "dog" or "cat" (case insensitive)
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <div className={`pet-card ${isMenuOpen ? 'menu-active' : ''}`}>
      <div className="pet-header">
        <h3 className="pet-name">{cleanPetName(pet.name)}</h3>
        <div className="pet-actions-menu" ref={menuRef}>
          <button className="kebab-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <FaEllipsisV />
          </button>
        </div>
      </div>
      
      <div className="pet-info-box">
        <div className="pet-info-row">
          <span className="pet-info-label">Type</span>
          <span className="pet-info-value">{pet.type}</span>
        </div>
        <div className="pet-info-row">
          <span className="pet-info-label">Breed</span>
          <span className="pet-info-value">{pet.breed || 'N/A'}</span>
        </div>
        <div className="pet-info-row">
          <span className="pet-info-label">Age</span>
          <span className="pet-info-value">{pet.age ? `${pet.age} years` : 'N/A'}</span>
        </div>
        <div className="pet-info-row">
          <span className="pet-info-label">Gender</span>
          <span className="pet-info-value">{pet.gender || 'N/A'}</span>
        </div>
        <div className="pet-info-row">
          <span className="pet-info-label">Size</span>
          <span className="pet-info-value">{pet.size || 'N/A'}</span>
        </div>
        <div className="pet-info-row">
          <span className="pet-info-label">Birthday</span>
          <span className="pet-info-value">{pet.birthday || 'N/A'}</span>
        </div>
      </div>

      {pet.notes && (
        <div className="notes-section">
          <h4><span role="img" aria-label="memo">📝</span> Additional Notes</h4>
          <p className="notes-content">{pet.notes}</p>
        </div>
      )}
      
      {pet.medicalNotes && (
        <div className="notes-section medical">
          <h4><span role="img" aria-label="hospital">🏥</span> Medical Notes</h4>
          <p className="notes-content">{pet.medicalNotes}</p>
        </div>
      )}

      {isMenuOpen && (
        <div className="kebab-dropdown">
          <button 
            className="action-btn edit-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Edit button clicked for pet:', pet.name);
              onEdit(pet);
              setIsMenuOpen(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FaEdit /> Edit
          </button>
          <button 
            className="action-btn delete-btn" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Delete button clicked for pet:', pet.name);
              onDelete(pet);
              setIsMenuOpen(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FaTrash /> Remove
          </button>
        </div>
      )}
    </div>
  );
};

// PetList Component
const PetList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pets, setPets] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);
  const toastShown = useRef(false);

  const toastConfig = {
    position: "top-right",
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
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
  };

  // Fetch pets when component mounts
  useEffect(() => {
    const fetchPets = async () => {
      if (!auth.currentUser) return;

      try {
        const petsRef = collection(db, 'pets');
        const q = query(petsRef, where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const petsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort pets by creation date (oldest first)
        const sortedPets = petsData.sort((a, b) => {
          // Handle pets without createdAt field (fallback to current date)
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
          return dateA - dateB; // Oldest first
        });
        
        setPets(sortedPets);
      } catch (error) {
        console.error('Error fetching pets:', error);
        setError('Failed to load pets');
        toast.error('❌ Failed to load pets', toastConfig);
      }
    };

    fetchPets();
  }, []);

  // Check for success message from form submission
  useEffect(() => {
    if (location.state?.success) {
      toast.success(location.state.message || '✅ Pet updated successfully!', {
        ...toastConfig,
        autoClose: 1500,
      });
      // Clean up the location state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleEdit = (pet) => {
    try {
      navigate(`/pets/${pet.id}/edit`, { 
        state: { pet }
      });
      // Scroll to top when navigating to edit form
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.info('✏️ Editing pet information...', {
        ...toastConfig,
        autoClose: 1000,
      });
    } catch (error) {
      console.error('Error navigating to edit:', error);
      toast.error('❌ Failed to edit pet', toastConfig);
    }
  };

  const handleDelete = (pet) => {
    try {
    setSelectedPet(pet);
    setShowDeleteModal(true);
      setError(null);
    } catch (error) {
      console.error('Error preparing delete:', error);
      toast.error('❌ Failed to prepare delete', toastConfig);
    }
  };

  const confirmDelete = async () => {
    if (!selectedPet) return;

    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'pets', selectedPet.id));
      setPets(prevPets => prevPets.filter(pet => pet.id !== selectedPet.id));
      setShowDeleteModal(false);
      setSelectedPet(null);
      toast.success('🗑️ Pet removed successfully!', {
        ...toastConfig,
        autoClose: 1500,
      });
      // Scroll to top after successful deletion
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error deleting pet:', error);
      toast.error('❌ Failed to delete pet', toastConfig);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pets-container">
      <div className="pets-header">
        <div className="header-content">
          <div className="title-section">
            <span className="paw-icon">🐾</span>
            <h1>My Furry Friends</h1>
            <span className="paw-icon">🐾</span>
          </div>
          <div className="pets-header-actions-row">
            <div className="left-back-btn">
              <button className="back-btn" onClick={() => {
                navigate('/dashboard');
                // Scroll to top when navigating back to dashboard
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>
                <FaArrowLeft /> Back
              </button>
            </div>
            <div className="centered-add-pet-btn">
              <button className="add-pet-btn" onClick={() => {
                navigate('/pets/new');
                // Scroll to top when navigating to add new pet
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}>
                <FaPlus /> Add New Friend
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="pets-grid">
        {pets.length === 0 ? (
          <div className="no-pets">
            <p>No pets added yet</p>
            <button onClick={() => navigate('/pets/new')}>
              Add Your First Pet
            </button>
          </div>
        ) : (
          pets.map(pet => (
            <PetCard 
              key={pet.id} 
              pet={pet} 
              onEdit={handleEdit} 
              onDelete={handleDelete} 
            />
          ))
        )}
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Remove Pet</h2>
            <p>Are you sure you want to remove {selectedPet?.name}?</p>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button 
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPet(null);
                  setError(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="confirm-delete-btn"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// PetForm Component
const PetForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [petInfo, setPetInfo] = useState({
    name: '',
    type: '',
    breed: '',
    gender: '',
    age: '',
    birthday: '',
    size: '',
    notes: '',
    medicalNotes: ''
  });

  const toastConfig = {
    position: "top-right",
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: false,
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
  };

  // Fetch pet data if editing
  useEffect(() => {
    const fetchPet = async () => {
      if (id) {
        try {
          const petDoc = await getDoc(doc(db, 'pets', id));
          if (petDoc.exists()) {
            setPetInfo(petDoc.data());
          }
        } catch (error) {
          console.error('Error fetching pet:', error);
        }
      }
    };

    fetchPet();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      toast.error('Please fill in all required fields', toastConfig);
      return;
    }

    // Show confirmation modal instead of saving directly
    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    setIsSubmitting(true);
    setShowSaveModal(false);

    try {
      if (id) {
        // Update existing pet
        const petRef = doc(db, 'pets', id);
        const petDoc = await getDoc(petRef);
        const oldData = petDoc.data();
        
        await updateDoc(petRef, {
          ...petInfo,
          updatedAt: new Date().toISOString()
        });

        // Log audit trail for pet update
        await logAuditTrail({
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          action: AUDIT_ACTIONS.PET_UPDATED,
          details: { petName: petInfo.name, petType: petInfo.type },
          userType: 'customer',
          resourceType: 'pet',
          resourceId: id,
          changes: {
            before: oldData,
            after: { ...petInfo, updatedAt: new Date().toISOString() }
          }
        });

        toast.success('🐾 Pet information updated successfully!', toastConfig);
      } else {
        // Add new pet
        const docRef = await addDoc(collection(db, 'pets'), {
          ...petInfo,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        });

        // Log audit trail for pet creation
        await logAuditTrail({
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          action: AUDIT_ACTIONS.PET_CREATED,
          details: { petName: petInfo.name, petType: petInfo.type },
          userType: 'customer',
          resourceType: 'pet',
          resourceId: docRef.id
        });

        toast.success('🐾 Welcome to the family, ' + petInfo.name + '!', toastConfig);
      }

      // Navigate immediately without delay
      navigate('/pets');
      // Scroll to top of the page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error saving pet:', error);
      toast.error('Failed to save pet information', toastConfig);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelSave = () => {
    setShowSaveModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Age validation for numbers only
    if (name === 'age' && value !== '') {
      const numberValue = value.replace(/[^0-9]/g, '');
      setPetInfo(prev => ({
        ...prev,
        [name]: numberValue
      }));
      return;
    }

    setPetInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const isFormValid = () => {
    return petInfo.name && petInfo.type && petInfo.age;
  };
  
  return (
    <div className="pet-form-container">
      <div className="title-container">
        <h2>{id ? 'Edit Pet' : 'Add New Friend'}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="pet-form">
        <div className="form-group">
          <label htmlFor="name">Pet Name*</label>
          <input
            type="text"
            id="name"
            name="name"
            value={petInfo.name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Pet Type*</label>
          <select
            id="type"
            name="type"
            value={petInfo.type}
            onChange={handleChange}
            required
          >
            <option value="">Select type</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="breed">Breed</label>
          <input
            type="text"
            id="breed"
            name="breed"
            value={petInfo.breed}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            name="gender"
            value={petInfo.gender}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="age">Age (years)*</label>
            <input
              type="text"
              id="age"
              name="age"
              value={petInfo.age}
              onChange={handleChange}
              placeholder="Enter numbers only"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="birthday">Birthday</label>
            <input
              type="date"
              id="birthday"
              name="birthday"
              value={petInfo.birthday}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="size">Size</label>
          <select
            id="size"
            name="size"
            value={petInfo.size}
            onChange={handleChange}
          >
            <option value="">Select size</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="notes">Additional Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={petInfo.notes}
            onChange={handleChange}
            placeholder="Any special care instructions or preferences..."
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="medicalNotes">Medical Notes</label>
          <textarea
            id="medicalNotes"
            name="medicalNotes"
            value={petInfo.medicalNotes}
            onChange={handleChange}
            placeholder="Allergies, medications, or health conditions..."
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn" 
            onClick={() => {
              navigate('/pets');
              // Scroll to top when canceling
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? (id ? 'Saving...' : 'Adding...') : (id ? 'Save Changes' : 'Add Pet')}
          </button>
        </div>
      </form>

      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content save-confirmation-modal">
            <div className="modal-header">
              <h2>🐾 Confirm Changes</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to {id ? 'save the changes' : 'add'} for <strong>{petInfo.name}</strong>?</p>
              {id && (
                <div className="change-summary">
                  <p className="summary-title">Summary of changes:</p>
                  <ul className="change-list">
                    {petInfo.name && <li>• Pet name: {petInfo.name}</li>}
                    {petInfo.type && <li>• Type: {petInfo.type}</li>}
                    {petInfo.breed && <li>• Breed: {petInfo.breed}</li>}
                    {petInfo.age && <li>• Age: {petInfo.age} years</li>}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                type="button"
                className="cancel-btn"
                onClick={cancelSave}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="confirm-save-btn"
                onClick={confirmSave}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : (id ? 'Save Changes' : 'Add Pet')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Pets Component
const Pets = () => {
  return (
    <Routes>
      <Route path="/" element={<PetList />} />
      <Route path="/new" element={<PetForm />} />
      <Route path="/:id/edit" element={<PetForm />} />
    </Routes>
  );
};

export default Pets;
