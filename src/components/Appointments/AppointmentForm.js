import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { db, auth } from '../../firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, where } from 'firebase/firestore';
import { logAuditTrail, AUDIT_ACTIONS } from '../../utils/auditLogger';
import { usePets } from '../../hooks/usePets';
import './AppointmentForm.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppointmentForm = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { currentAppointment, isEditing } = location.state || {};
  const { pets, loading: petsLoading } = usePets();
  const [formData, setFormData] = useState({
    petId: '',
    date: '',
    time: '',
    services: [],
    serviceSizes: {},
    notes: '',
    selectedPetSize: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);

  useEffect(() => {
    if (isEditing && currentAppointment) {
      setFormData(currentAppointment);
    }
    setLoading(false);
  }, [isEditing, currentAppointment]);

  const toastConfig = {
    position: "top-right",
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
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isFormValid()) {
      toast.error('Please fill in all required fields', {
        ...toastConfig,
        autoClose: 2000
      });
      return;
    }
    try {
      setLoading(true);
      if (!isEditing) {
        // Check for max 5 appointments per timeslot
        const q = query(
          collection(db, 'appointments'),
          where('date', '==', formData.date),
          where('time', '==', formData.time),
          where('status', 'in', ['active', 'done']) // Only count active/done
        );
        const snapshot = await new Promise((resolve, reject) => {
          try {
            const unsub = onSnapshot(q, (snap) => {
              unsub();
              resolve(snap);
            }, reject);
          } catch (err) { reject(err); }
        });
        if (snapshot.size >= 5) {
          setLoading(false);
          toast.error('This timeslot is fully booked. Please choose another time.', {
            ...toastConfig,
            autoClose: 2500
          });
          return;
        }
      }
      if (isEditing) {
        const appointmentRef = doc(db, 'appointments', currentAppointment.id);
        const oldData = { ...currentAppointment };
        
        await updateDoc(appointmentRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });

        // Log audit trail for appointment update
        await logAuditTrail({
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULED,
          details: { 
            appointmentDate: formData.date, 
            appointmentTime: formData.time,
            services: formData.services 
          },
          userType: 'customer',
          resourceType: 'appointment',
          resourceId: currentAppointment.id,
          changes: {
            before: oldData,
            after: { ...formData, updatedAt: new Date().toISOString() }
          }
        });

        toast.success('✨ Appointment updated!', {
          ...toastConfig,
          icon: "🐾",
          autoClose: 1500
        });
        setLoading(false);
        navigate('/appointments');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Create operation
        const newAppointment = {
          ...formData,
          userId: auth.currentUser.uid,
          status: 'active',
          createdAt: new Date().toISOString()
        };
        // Save to Firestore
        const docRef = await addDoc(collection(db, 'appointments'), newAppointment);

        // Log audit trail for appointment creation
        await logAuditTrail({
          userId: auth.currentUser.uid,
          userEmail: auth.currentUser.email,
          action: AUDIT_ACTIONS.APPOINTMENT_CREATED,
          details: { 
            appointmentDate: formData.date, 
            appointmentTime: formData.time,
            services: formData.services 
          },
          userType: 'customer',
          resourceType: 'appointment',
          resourceId: docRef.id
        });

        toast.success('✨ Appointment booked successfully!', {
          ...toastConfig,
          icon: "🐾",
          autoClose: 1500
        });
        // Prepare receipt details
        setReceiptDetails({
          ...newAppointment,
          petName: pets.find(pet => pet.id === formData.petId)?.name || '',
          servicesList: formData.services.map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            let size = '';
            let price = '';
            if (service.prices) {
              size = formData.serviceSizes[serviceId] || 'medium';
              price = service.prices[size];
            } else {
              price = service.price;
            }
            return {
              name: service.name,
              size: size,
              price: price
            };
          }),
          total: calculateTotalPrice()
        });
        setShowReceipt(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save appointment', {
        ...toastConfig,
        autoClose: 2000
      });
      setLoading(false);
    }
  };

  const handleConfirmReceipt = () => {
    setShowReceipt(false);
    if (onClose) {
      onClose();
    } else {
      navigate('/appointments');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCancelReceipt = () => {
    setShowReceipt(false);
    // Optionally, you can delete the appointment from Firestore if you want to roll back
    // For now, just close the modal
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/appointments');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isFormValid = () => {
    return (
      formData.petId !== '' && 
      formData.date !== '' && 
      formData.time !== '' && 
      formData.services.length > 0
    );
  };

  const getSubmitButtonText = () => {
    if (loading) return 'Saving...';
    return isEditing ? 'Update Appointment' : 'Schedule Appointment';
  };

  const getFormTitle = () => {
    return isEditing ? 'Edit Appointment' : 'Schedule an Appointment';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      let updated = { ...prev, [name]: value };
      if (name === 'petId') {
        const selectedPet = pets?.find(pet => pet.id === value);
        updated.selectedPetSize = selectedPet?.size?.toLowerCase() || '';
      }
      return updated;
    });
  };

  const handleSizeChange = (serviceId, size) => {
    setFormData(prev => ({
      ...prev,
      serviceSizes: {
        ...prev.serviceSizes,
        [serviceId]: size
      }
    }));
  };

  const handleServiceChange = (serviceId) => {
    setFormData(prev => {
      const updatedServices = prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId];
      const service = services.find(s => s.id === serviceId);
      const updatedSizes = { ...prev.serviceSizes };
      if (service?.prices && !updatedSizes[serviceId]) {
        const petSize = prev.selectedPetSize || (pets?.find(pet => pet.id === prev.petId)?.size?.toLowerCase());
        if (petSize && service.prices[petSize]) {
          updatedSizes[serviceId] = petSize;
        }
      }
      return {
        ...prev,
        services: updatedServices,
        serviceSizes: updatedSizes
      };
    });
  };

  const timeSlots = [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '1:00 PM - 2:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM'
  ];

  const handleTimeSelect = (time) => {
    setFormData(prev => ({
      ...prev,
      time: time
    }));
  };

  const services = [
    { 
      id: 'bath-blowdry', 
      name: 'Bath & Blowdry',
      prices: {
        small: 300,
        medium: 400,
        large: 500
      }
    },
    { 
      id: 'haircut-trim', 
      name: 'Basic Haircut & Trim',
      prices: {
        small: 300,
        medium: 400,
        large: 500
      }
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

  const getServicePrice = (service) => {
    if (service.prices) {
      const selectedSize = formData.serviceSizes[service.id] || 'medium';
      return service.prices[selectedSize];
    }
    return service.price;
  };

  const calculateTotalPrice = () => {
    let total = 0;
    formData.services.forEach(serviceId => {
      const service = services.find(s => s.id === serviceId);
      if (service.prices) {
        const selectedSize = formData.serviceSizes[serviceId] || 'medium';
        total += service.prices[selectedSize];
      } else {
        total += service.price;
      }
    });
    return total;
  };

  const minDate = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="appointment-form-container">
        <div className="loading-overlay">
          <div className="loading-content">
            <span className="loading-icon">🐾</span>
            <p>Just a moment...</p>
          </div>
        </div>
        {/* Keep the form visible while loading */}
        <h2>{getFormTitle()}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="appointment-form">
          <div className="form-group">
            <label htmlFor="petId">Select Pet</label>
            <select
              id="petId"
              name="petId"
              value={formData.petId}
              onChange={handleInputChange}
              required
            >
              <option value="">Choose a pet</option>
              {pets?.map(pet => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group services-group">
            <label>Select Services</label>
            <div className="services-grid">
              {/* First row - Bath & Blowdry, Basic Haircut & Trim, Paw Pad Care */}
              <div className="services-row">
                {services.slice(0, 3).map(service => (
                  <div 
                    key={service.id} 
                    className={`service-card ${formData.services.includes(service.id) ? 'selected' : ''}`}
                  >
                    <div className="service-content">
                      <h3>{service.name}</h3>
                      {formData.services.includes(service.id) && (
                        service.prices ? (
                          <div className="size-options">
                            {(() => {
                              // If pet size is known, only show that size
                              const petSize = formData.selectedPetSize;
                              if (petSize && service.prices[petSize]) {
                                return (
                                  <label className="size-option">
                                    <input
                                      type="radio"
                                      name={`size-${service.id}`}
                                      value={petSize}
                                      checked={formData.serviceSizes[service.id] === petSize}
                                      onChange={() => handleSizeChange(service.id, petSize)}
                                    />
                                    <span className="size-label">
                                      {petSize.charAt(0).toUpperCase() + petSize.slice(1)} - ₱{service.prices[petSize]}
                                    </span>
                                  </label>
                                );
                              }
                              // Otherwise, show all size options
                              return Object.keys(service.prices).map(size => (
                                <label key={size} className="size-option">
                                  <input
                                    type="radio"
                                    name={`size-${service.id}`}
                                    value={size}
                                    checked={formData.serviceSizes[service.id] === size}
                                    onChange={() => handleSizeChange(service.id, size)}
                                  />
                                  <span className="size-label">
                                    {size.charAt(0).toUpperCase() + size.slice(1)} - ₱{service.prices[size]}
                                  </span>
                                </label>
                              ));
                            })()}
                          </div>
                        ) : (
                          <p className="service-price">
                            ₱{service.price}
                          </p>
                        )
                      )}
                    </div>
                    <div className="service-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.id)}
                        onChange={() => handleServiceChange(service.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Second row - Teeth Cleaning, Nail Trimming, Ear Cleaning */}
              <div className="services-row">
                {services.slice(3).map(service => (
                  <div 
                    key={service.id} 
                    className={`service-card ${formData.services.includes(service.id) ? 'selected' : ''}`}
                  >
                    <div className="service-content">
                      <h3>{service.name}</h3>
                      {formData.services.includes(service.id) && (
                        service.prices ? (
                          <div className="size-options">
                            {(() => {
                              // If pet size is known, only show that size
                              const petSize = formData.selectedPetSize;
                              if (petSize && service.prices[petSize]) {
                                return (
                                  <label className="size-option">
                                    <input
                                      type="radio"
                                      name={`size-${service.id}`}
                                      value={petSize}
                                      checked={formData.serviceSizes[service.id] === petSize}
                                      onChange={() => handleSizeChange(service.id, petSize)}
                                    />
                                    <span className="size-label">
                                      {petSize.charAt(0).toUpperCase() + petSize.slice(1)} - ₱{service.prices[petSize]}
                                    </span>
                                  </label>
                                );
                              }
                              // Otherwise, show all size options
                              return Object.keys(service.prices).map(size => (
                                <label key={size} className="size-option">
                                  <input
                                    type="radio"
                                    name={`size-${service.id}`}
                                    value={size}
                                    checked={formData.serviceSizes[service.id] === size}
                                    onChange={() => handleSizeChange(service.id, size)}
                                  />
                                  <span className="size-label">
                                    {size.charAt(0).toUpperCase() + size.slice(1)} - ₱{service.prices[size]}
                                  </span>
                                </label>
                              ));
                            })()}
                          </div>
                        ) : (
                          <p className="service-price">
                            ₱{service.price}
                          </p>
                        )
                      )}
                    </div>
                    <div className="service-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.id)}
                        onChange={() => handleServiceChange(service.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {formData.services.length === 0 && (
              <p className="service-error">Please select at least one service</p>
            )}
            {formData.services.length > 0 && (
              <div className="total-price">
                <h3>Total: ₱{calculateTotalPrice()}</h3>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              min={minDate}
              required
            />
          </div>

          <div className="form-group">
            <label>Select Time Slot</label>
            <div className="time-slots-grid">
              {timeSlots.map((timeSlot) => (
                <div
                  key={timeSlot}
                  className={`time-slot ${formData.time === timeSlot ? 'selected' : ''}`}
                  onClick={() => handleTimeSelect(timeSlot)}
                >
                  {timeSlot}
                </div>
              ))}
            </div>
            {!formData.time && (
              <p className="service-error">Please select a time slot</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any special instructions or concerns..."
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn"
              onClick={handleCancel}
            >
              <span className="button-icon">✕</span>
              Cancel
            </button>
            <button
              type="button"
              className="submit-btn"
              disabled={loading || !isFormValid()}
              onClick={() => {
                if (isEditing) {
                  setShowUpdateConfirm(true);
                } else {
                  handleSubmit();
                }
              }}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Appointment' : 'Book Appointment')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="appointment-form-container">
      <div className="title-container">
        <h2>{getFormTitle()}</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="appointment-form">
        <div className="form-group">
          <label htmlFor="petId">Select Pet</label>
          <select
            id="petId"
            name="petId"
            value={formData.petId}
            onChange={handleInputChange}
            required
          >
            <option value="">Choose a pet</option>
            {pets?.map(pet => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group services-group">
          <label>Select Services</label>
          <div className="services-grid">
            {/* First row - Bath & Blowdry, Basic Haircut & Trim, Paw Pad Care */}
            <div className="services-row">
              {services.slice(0, 3).map(service => (
                <div 
                  key={service.id} 
                  className={`service-card ${formData.services.includes(service.id) ? 'selected' : ''}`}
                >
                  <div className="service-content">
                    <h3>{service.name}</h3>
                    {formData.services.includes(service.id) && (
                      service.prices ? (
                        <div className="size-options">
                          {(() => {
                            // If pet size is known, only show that size
                            const petSize = formData.selectedPetSize;
                            if (petSize && service.prices[petSize]) {
                              return (
                                <label className="size-option">
                                  <input
                                    type="radio"
                                    name={`size-${service.id}`}
                                    value={petSize}
                                    checked={formData.serviceSizes[service.id] === petSize}
                                    onChange={() => handleSizeChange(service.id, petSize)}
                                  />
                                  <span className="size-label">
                                    {petSize.charAt(0).toUpperCase() + petSize.slice(1)} - ₱{service.prices[petSize]}
                                  </span>
                                </label>
                              );
                            }
                            // Otherwise, show all size options
                            return Object.keys(service.prices).map(size => (
                              <label key={size} className="size-option">
                                <input
                                  type="radio"
                                  name={`size-${service.id}`}
                                  value={size}
                                  checked={formData.serviceSizes[service.id] === size}
                                  onChange={() => handleSizeChange(service.id, size)}
                                />
                                <span className="size-label">
                                  {size.charAt(0).toUpperCase() + size.slice(1)} - ₱{service.prices[size]}
                                </span>
                              </label>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p className="service-price">
                          ₱{service.price}
                        </p>
                      )
                    )}
                  </div>
                  <div className="service-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service.id)}
                      onChange={() => handleServiceChange(service.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Second row - Teeth Cleaning, Nail Trimming, Ear Cleaning */}
            <div className="services-row">
              {services.slice(3).map(service => (
                <div 
                  key={service.id} 
                  className={`service-card ${formData.services.includes(service.id) ? 'selected' : ''}`}
                >
                  <div className="service-content">
                    <h3>{service.name}</h3>
                    {formData.services.includes(service.id) && (
                      service.prices ? (
                        <div className="size-options">
                          {(() => {
                            // If pet size is known, only show that size
                            const petSize = formData.selectedPetSize;
                            if (petSize && service.prices[petSize]) {
                              return (
                                <label className="size-option">
                                  <input
                                    type="radio"
                                    name={`size-${service.id}`}
                                    value={petSize}
                                    checked={formData.serviceSizes[service.id] === petSize}
                                    onChange={() => handleSizeChange(service.id, petSize)}
                                  />
                                  <span className="size-label">
                                    {petSize.charAt(0).toUpperCase() + petSize.slice(1)} - ₱{service.prices[petSize]}
                                  </span>
                                </label>
                              );
                            }
                            // Otherwise, show all size options
                            return Object.keys(service.prices).map(size => (
                              <label key={size} className="size-option">
                                <input
                                  type="radio"
                                  name={`size-${service.id}`}
                                  value={size}
                                  checked={formData.serviceSizes[service.id] === size}
                                  onChange={() => handleSizeChange(service.id, size)}
                                />
                                <span className="size-label">
                                  {size.charAt(0).toUpperCase() + size.slice(1)} - ₱{service.prices[size]}
                                </span>
                              </label>
                            ));
                          })()}
                        </div>
                      ) : (
                        <p className="service-price">
                          ₱{service.price}
                        </p>
                      )
                    )}
                  </div>
                  <div className="service-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service.id)}
                      onChange={() => handleServiceChange(service.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {formData.services.length === 0 && (
            <p className="service-error">Please select at least one service</p>
          )}
          {formData.services.length > 0 && (
            <div className="total-price">
              <h3>Total: ₱{calculateTotalPrice()}</h3>
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            min={minDate}
            required
          />
        </div>

        <div className="form-group">
          <label>Select Time Slot</label>
          <div className="time-slots-grid">
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                className={`time-slot ${formData.time === timeSlot ? 'selected' : ''}`}
                onClick={() => handleTimeSelect(timeSlot)}
              >
                {timeSlot}
              </div>
            ))}
          </div>
          {!formData.time && (
            <p className="service-error">Please select a time slot</p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="notes">Additional Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any special instructions or concerns..."
            rows={4}
          />
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-btn"
            onClick={handleCancel}
          >
            <span className="button-icon">✕</span>
            Cancel
          </button>
          <button
            type="button"
            className="submit-btn"
            disabled={loading || !isFormValid()}
            onClick={() => {
              if (isEditing) {
                setShowUpdateConfirm(true);
              } else {
                handleSubmit();
              }
            }}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Appointment' : 'Book Appointment')}
          </button>
        </div>
      </form>
      {showReceipt && receiptDetails && (
        <div className="modal-overlay">
          <div className="modal-content" style={{minWidth: '350px', maxWidth: '95vw'}}>
            <h2>Appointment Confirmation</h2>
            <p><strong>Pet Name:</strong> {receiptDetails.petName}</p>
            <p><strong>Date:</strong> {receiptDetails.date}</p>
            <p><strong>Time:</strong> {receiptDetails.time}</p>
            <div style={{margin: '1rem 0'}}>
              <strong>Services:</strong>
              <ul style={{textAlign: 'left', margin: '0.5rem 0 0 1.5rem'}}>
                {receiptDetails.servicesList.map((s, idx) => (
                  <li key={idx}>
                    {s.name}{s.size ? ` (${s.size.charAt(0).toUpperCase() + s.size.slice(1)})` : ''} - ₱{s.price}
                  </li>
                ))}
              </ul>
            </div>
            <p><strong>Total Cost:</strong> ₱{receiptDetails.total}</p>
            <p style={{color: '#d32f2f', fontWeight: 'bold', marginTop: '1.5rem', background: '#fff0f6', borderRadius: 8, padding: '10px 16px', border: '1.5px solid #ffd6e6'}}>Please note: Pawpoint is located in <b>Parañaque City</b>. Make sure you are able to come to our location for your appointment.</p>
            <p style={{color: '#f06292', fontWeight: 'bold', marginTop: '1.5rem'}}>You will pay for the appointment when you arrive at the store.</p>
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
              <button className="submit-btn" onClick={handleConfirmReceipt}>Confirm</button>
              <button className="cancel-btn" onClick={handleCancelReceipt}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showUpdateConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{minWidth: '320px', maxWidth: '95vw'}}>
            <h2>Update Appointment?</h2>
            <p>Are you sure you want to update this appointment?</p>
            <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
              <button
                className="confirm-btn"
                onClick={() => {
                  setShowUpdateConfirm(false);
                  handleSubmit();
                }}
              >
                Yes, Update
              </button>
              <button
                className="keep-btn"
                onClick={() => setShowUpdateConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;