import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FaArrowLeft, FaCalendar, FaPaw } from 'react-icons/fa';
import './Records.css';
import { ToastContainer } from 'react-toastify';
import pawpointLogo from '../Navbar/pawpoint-logo.png';

const Records = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printRecordId, setPrintRecordId] = useState(null);
  const recordRefs = useRef({});

  // Survey modal state
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [surveyRecord, setSurveyRecord] = useState(null);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyFeedback, setSurveyFeedback] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [submittedSurveys, setSubmittedSurveys] = useState({});

  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Fetch all service prices from the database
    const fetchServicePrices = async () => {
      const servicesSnapshot = await getDocs(collection(db, 'services'));
      const servicePriceMap = {};
      console.log('=== FETCHING SERVICES ===');
      servicesSnapshot.forEach(serviceDoc => {
        const data = serviceDoc.data();
        servicePriceMap[data.name] = data;
        console.log(`Loaded service: ${data.name}`, {
          hasPrices: !!data.prices,
          hasPrice: data.price !== undefined,
          prices: data.prices,
          price: data.price,
          fullData: data
        });
      });
      return servicePriceMap;
    };

    // Fetch submitted surveys for this user
    const fetchSubmittedSurveys = async () => {
      const feedbackQuery = query(
        collection(db, 'messages'),
        where('userId', '==', user.uid),
        where('rating', '>=', 1)
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);
      const feedbackMap = {};
      feedbackSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.appointmentId) {
          feedbackMap[data.appointmentId] = true;
        }
      });
      setSubmittedSurveys(feedbackMap);
    };

    const appointmentsRef = collection(db, 'appointments');
    const q = query(
      appointmentsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      console.log('=== PROCESSING APPOINTMENTS ===');
      const servicePriceMap = await fetchServicePrices();
      const recordsData = [];
      
      for (const docSnap of snapshot.docs) {
        const appointment = docSnap.data();
        console.log('Processing appointment:', appointment);
        
        // Get pet details if petId exists
        if (appointment.petId) {
          const petDocRef = doc(db, 'pets', appointment.petId);
          const petDocSnap = await getDoc(petDocRef);
          const petData = petDocSnap.data();
          appointment.petName = petData?.name || 'Unknown Pet';
          appointment.size = petData?.size || '';
          appointment.breed = petData?.breed || '';
          appointment.age = petData?.age || '';
          appointment.gender = petData?.gender || '';
          appointment.birthday = petData?.birthday || '';
          console.log('Pet details:', {
            name: appointment.petName,
            size: appointment.size,
            breed: appointment.breed
          });
        }

        // Build servicesWithPrices array and totalPrice
        let servicesWithPrices = [];
        let totalPrice = 0;
        if (Array.isArray(appointment.services)) {
          console.log('=== PROCESSING SERVICES ===');
          console.log('Services array:', appointment.services);
          console.log('Pet size:', appointment.size);
          
          servicesWithPrices = appointment.services.map(service => {
            let serviceName = typeof service === 'string' ? service : service.name;
            let serviceData = servicePriceMap[serviceName];
            let price = 0;

            console.log(`\n=== Processing ${serviceName} ===`);
            console.log('Service data:', serviceData);
            console.log('Pet size:', appointment.size);

            if (serviceData) {
              if (serviceData.prices && appointment.size) {
                const sizeKey = appointment.size.toLowerCase();
                console.log('Size-based pricing check:', {
                  hasPrices: !!serviceData.prices,
                  sizeKey,
                  availableSizes: Object.keys(serviceData.prices),
                  priceForSize: serviceData.prices[sizeKey]
                });
                price = serviceData.prices[sizeKey] || 0;
              } else if (serviceData.price !== undefined) {
                console.log('Flat price check:', {
                  hasPrice: serviceData.price !== undefined,
                  price: serviceData.price
                });
                price = serviceData.price;
              }
            } else {
              console.log('WARNING: No service data found for:', serviceName);
            }

            console.log('Final price for', serviceName, ':', price);
            totalPrice += Number(price);
            return { name: serviceName, price };
          });
        }
        
        console.log('\n=== Final Price Breakdown ===');
        console.log('Services with prices:', servicesWithPrices);
        console.log('Total price:', totalPrice);
        
        appointment.servicesWithPrices = servicesWithPrices;
        appointment.totalPrice = totalPrice;
        recordsData.push({
          id: docSnap.id,
          ...appointment,
          date: appointment.date ? new Date(appointment.date).toLocaleDateString() : 'No date',
          time: appointment.time || 'No time specified'
        });
      }
      
      setRecords(recordsData);
      setLoading(false);
      // Fetch feedbacks after records load
      fetchSubmittedSurveys();

      // Update statuses based on current time
      const now = new Date();
      recordsData.forEach(async (apt) => {
        const aptDate = new Date(apt.date + ' ' + apt.time); // Adjust parsing as needed
        if (apt.status === 'active' && now > aptDate) {
          await updateDoc(doc(db, 'appointments', apt.id), { status: 'done' });
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Print handler for a single record
  const handlePrint = (recordId) => {
    setPrintRecordId(recordId);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintRecordId(null), 500);
    }, 100);
  };

  if (loading) {
    return <div className="loading">Loading records...</div>;
  }

  return (
    <div className="records-container">
      <div className="records-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h2>Appointment Records</h2>
      </div>

      {/* Status Filter Dropdown */}
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
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
      </div>

      <div className="records-list">
        {records.length === 0 ? (
          <div className="no-records">
            <p>No appointments found</p>
          </div>
        ) : (
          records
            .filter(record => statusFilter === 'all' || (record.status && record.status.toLowerCase() === statusFilter))
            .slice()
            .sort((a, b) => {
              const aCreated = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const bCreated = b.createdAt ? new Date(b.createdAt) : new Date(0);
              return bCreated - aCreated;
            })
            .map((record) => (
              <div
                key={record.id}
                className={`record-item${printRecordId === record.id ? ' print-only' : ''}`}
                ref={el => (recordRefs.current[record.id] = el)}
              >
                {/* Print header: Only visible in print mode for this record */}
                {printRecordId === record.id && (
                  <div className="print-header">
                    <img src={pawpointLogo} alt="Pawpoint Logo" className="print-logo" />
                    <div className="print-title">Pawpoint <span className="paw-emoji">🐾</span></div>
                  </div>
                )}
                {/* Print footer: Only visible in print mode for this record */}
                {printRecordId === record.id && (
                  <div className="print-footer">
                    Thank you for choosing Pawpoint! <span role="img" aria-label="paw">🐾</span>
                  </div>
                )}
              <div className="record-header">
                <FaCalendar className="record-icon" />
                <span className="record-date">{record.date}</span>
                <span className="record-time">{record.time}</span>
                  {/* Status badge with logic for past appointments */}
                  {(() => {
                    // Parse date and time
                    const now = new Date();
                    // record.date is already formatted as locale string, so use record.dateRaw if available, else fallback
                    let recordDate = record.dateRaw ? new Date(record.dateRaw) : new Date(record.date);
                    // If time is available, try to parse it
                    if (record.time && record.time.includes('-')) {
                      const [start, end] = record.time.split('-').map(s => s.trim());
                      // Use end time for more accurate 'done' status
                      const [endTime, endPeriod] = end.split(' ');
                      let [endHour, endMinute] = endTime.split(':');
                      endHour = parseInt(endHour, 10);
                      endMinute = parseInt(endMinute, 10);
                      if (endPeriod && endPeriod.toLowerCase().includes('pm') && endHour !== 12) endHour += 12;
                      if (endPeriod && endPeriod.toLowerCase().includes('am') && endHour === 12) endHour = 0;
                      recordDate.setHours(endHour, endMinute, 0, 0);
                    }
                    let isPast = recordDate < now;
                    let displayStatus = record.status ? record.status.charAt(0).toUpperCase() + record.status.slice(1) : 'Active';
                    if (record.status === 'active' && isPast) displayStatus = 'Done';
                    return (
                      <>
                        <span className={`record-status status-${(displayStatus || 'active').toLowerCase()}`}>
                          {displayStatus}
                        </span>
                        {/* Survey button for Done status */}
                        {displayStatus === 'Done' && !submittedSurveys[record.id] && (
                          <button
                            className="survey-button"
                            style={{ marginLeft: 12, background: '#ffb6d5', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 18px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', boxShadow: '0 2px 8px #ffd6e6' }}
                            onClick={() => {
                              setSurveyRecord(record);
                              setShowSurveyModal(true);
                              setSurveyRating(0);
                              setSurveyFeedback('');
                            }}
                          >
                            Survey
                          </button>
                        )}
                        {displayStatus === 'Done' && submittedSurveys[record.id] && (
                          <span style={{ marginLeft: 12, color: '#aaa', fontWeight: 600, fontSize: '1rem' }}>Survey submitted</span>
                        )}
                      </>
                    );
                  })()}
                  <button
                    className="print-button"
                    onClick={() => handlePrint(record.id)}
                    style={{ marginLeft: 'auto', marginRight: 0 }}
                  >
                    Print
                  </button>
              </div>
                <div className="record-content-flex">
                  <div className="record-petinfo-left">
                <div className="pet-info">
                  <FaPaw className="pet-icon" />
                  <span className="pet-name">{record.petName}</span>
                </div>
                <div className="service-info">
                      <span className="service-label">Services:</span>
                      <span className="service-type">{Array.isArray(record.servicesWithPrices) ? record.servicesWithPrices.map(s => s.name).join(', ') : ''}</span>
                    </div>
                    {record.size && (
                      <div className="pet-size"><strong>Size:</strong> {record.size}</div>
                    )}
                    {record.breed && (
                      <div className="pet-breed"><strong>Breed:</strong> {record.breed}</div>
                    )}
                    {record.age && (
                      <div className="pet-age"><strong>Age:</strong> {record.age}</div>
                    )}
                    {record.gender && (
                      <div className="pet-gender"><strong>Gender:</strong> {record.gender}</div>
                    )}
                    {record.birthday && (
                      <div className="pet-birthday"><strong>Birthday:</strong> {new Date(record.birthday).toLocaleDateString()}</div>
                    )}
                    {/* Price breakdown */}
                    {Array.isArray(record.servicesWithPrices) && record.servicesWithPrices.length > 0 && (
                      <div className="service-breakdown">
                        <strong>Price Breakdown:</strong>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {record.servicesWithPrices.map((service, idx) => (
                            <li key={idx}>
                              {service.name}: ₱{service.price}
                            </li>
                          ))}
                        </ul>
                        <div className="service-total"><strong>Total:</strong> ₱{record.totalPrice}</div>
                      </div>
                    )}
                    <div className="meta-info">
                      <div><strong>Created At:</strong> {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'N/A'}</div>
                      {record.updatedAt && <div><strong>Last Edited:</strong> {new Date(record.updatedAt).toLocaleString()}</div>}
                      {record.cancelledAt && <div><strong>Cancelled At:</strong> {new Date(record.cancelledAt).toLocaleString()}</div>}
                      {/* Print disclaimer: Only visible in print mode, right after meta-info */}
                      {printRecordId === record.id && (
                        <div className="print-disclaimer">
                          Please note that this document is not a<br/>
                          valid receipt. A valid receipt will be<br/>
                          provided upon payment at our store.
                        </div>
                      )}
                </div>
                  </div>
                  <div className="record-details">
                    {record.price && (
                      <div className="service-price"><strong>Price:</strong> {record.price}</div>
                    )}
                    {record.notes && (
                      <div className="notes"><p>{record.notes}</p></div>
                )}
                  </div>
              </div>
            </div>
          ))
        )}
      </div>
      <ToastContainer position="top-left" />
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .record-item.print-only, .record-item.print-only * {
            visibility: visible !important;
          }
          .record-item:not(.print-only) { display: none !important; }
          .records-header, .Toastify__toast-container { display: none !important; }
          .back-button, .print-button { display: none !important; }
        }
      `}</style>

      {/* Survey Modal */}
      {showSurveyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.35)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 18,
            padding: '32px 32px 24px 32px',
            minWidth: 540,
            maxWidth: '700px',
            boxShadow: '0 8px 32px #ffd6e6',
            position: 'relative',
            textAlign: 'center',
          }}>
            <button
              onClick={() => setShowSurveyModal(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 24, color: '#ff8fab', cursor: 'pointer' }}
              aria-label="Close survey"
            >
              &times;
            </button>
            <h2 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', marginBottom: 18 }}>Service Survey</h2>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>How would you rate our service?</div>
              <div style={{ fontSize: 32 }}>
                {[1,2,3,4,5].map(star => (
                  <span
                    key={star}
                    style={{
                      cursor: 'pointer',
                      color: surveyRating >= star ? '#FFD700' : '#ddd',
                      filter: surveyRating >= star ? 'drop-shadow(0 2px 8px #ffe082)' : 'none',
                      transition: 'color 0.2s',
                    }}
                    onClick={() => setSurveyRating(star)}
                    onMouseOver={() => setSurveyRating(star)}
                    onMouseLeave={() => setSurveyRating(surveyRating)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Additional Feedback (optional):</div>
              <textarea
                value={surveyFeedback}
                onChange={e => setSurveyFeedback(e.target.value)}
                placeholder="Let us know how we did or how we can improve!"
                style={{
                  width: '100%',
                  minHeight: 60,
                  borderRadius: 10,
                  border: '1.5px solid #ffd6e6',
                  padding: 12,
                  fontFamily: 'Quicksand, cursive',
                  fontSize: '1.05rem',
                  marginBottom: 8,
                  resize: 'vertical',
                }}
              />
            </div>
            <button
              onClick={async () => {
                if (surveyRating === 0) {
                  alert('Please select a rating.');
                  return;
                }
                setSurveySubmitting(true);
                try {
                  await addDoc(collection(db, 'messages'), {
                    userId: auth.currentUser.uid,
                    userEmail: auth.currentUser.email,
                    message: surveyFeedback,
                    rating: surveyRating,
                    timestamp: serverTimestamp(),
                    fromAdmin: false,
                    reply: '',
                    isRead: false,
                    notified: false,
                    appointmentId: surveyRecord?.id || null,
                    services: surveyRecord?.services || [],
                  });
                  setSubmittedSurveys(prev => ({ ...prev, [surveyRecord?.id]: true }));
                  setShowSurveyModal(false);
                  setSurveyRecord(null);
                  setSurveyRating(0);
                  setSurveyFeedback('');
                  setSurveySubmitting(false);
                  alert('Thank you for your feedback!');
                } catch (err) {
                  setSurveySubmitting(false);
                  alert('Failed to submit feedback. Please try again.');
                }
              }}
              disabled={surveySubmitting}
              style={{
                background: '#ff8fab',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 32px',
                fontWeight: 700,
                fontFamily: 'Fredoka One, cursive',
                fontSize: '1.08rem',
                boxShadow: '0 2px 8px #ffd6e6',
                cursor: surveySubmitting ? 'not-allowed' : 'pointer',
                marginTop: 8,
              }}
            >
              {surveySubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Records;