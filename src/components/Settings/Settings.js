import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import './Settings.css';
import { useNavigate } from 'react-router-dom';
import { signOut, updatePassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Settings = () => {
  const { user: currentUser } = useAuth();
  const [userData, setUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    age: '',
    birthday: '',
    address: '',
    contactNumber: '',
    telephoneNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: ''
  });
  const [userDocId, setUserDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  // Add state for Privacy Policy modal
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  // Add state for Terms & Conditions modal
  const [showTermsModal, setShowTermsModal] = useState(false);
  // Add state for Contact Us modal
  const [showContactModal, setShowContactModal] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordSuccessModal, setShowPasswordSuccessModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrCreateUserData = async () => {
      setLoading(true);
      setError('');
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('uid', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // User document exists
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          setUserDocId(docSnap.id);
          setUserData({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || currentUser.email || '',
            age: data.age || '',
            birthday: data.birthday || '',
            address: data.address || '',
            contactNumber: data.contactNumber || '',
            telephoneNumber: data.telephoneNumber || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || ''
          });
        } else {
          // User document does not exist, create it
          const newUser = {
            uid: currentUser.uid,
            firstName: '',
            lastName: '',
            email: currentUser.email,
            age: '',
            birthday: '',
            address: '',
            contactNumber: '',
            telephoneNumber: '',
            emergencyContactName: '',
            emergencyContactNumber: ''
          };
          const docRef = await addDoc(usersRef, newUser);
          setUserDocId(docRef.id);
          // Fetch the new document to ensure UI updates
          const newDocSnap = await getDocs(query(usersRef, where('uid', '==', currentUser.uid)));
          if (!newDocSnap.empty) {
            const data = newDocSnap.docs[0].data();
            setUserData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || currentUser.email || '',
              age: data.age || '',
              birthday: data.birthday || '',
              address: data.address || '',
              contactNumber: data.contactNumber || '',
              telephoneNumber: data.telephoneNumber || '',
              emergencyContactName: data.emergencyContactName || '',
              emergencyContactNumber: data.emergencyContactNumber || ''
            });
          }
        }
      } catch (err) {
        setError('Failed to load user data.');
      }
      setLoading(false);
    };
    fetchOrCreateUserData();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser && !loading) {
      navigate('/');
    }
  }, [currentUser, loading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSuccess('');
    setError('');
    if (!userDocId) {
      toast.error('User document not found.', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }
    try {
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        age: userData.age,
        birthday: userData.birthday,
        address: userData.address,
        contactNumber: userData.contactNumber,
        telephoneNumber: userData.telephoneNumber,
        emergencyContactName: userData.emergencyContactName,
        emergencyContactNumber: userData.emergencyContactNumber
      });
      setSuccess('Information saved!');
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);
      
      toast.success('Profile information updated successfully!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    } catch (err) {
      setError('Failed to save information.');
      toast.error('Failed to save information. Please try again.', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      navigate('/');
    } catch (error) {
      toast.error('Failed to log out. Please try again.', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      return;
    }

    try {
      await updatePassword(currentUser, passwordData.newPassword);
      setShowPasswordModal(false);
      setShowPasswordSuccessModal(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      let errorMessage = 'Failed to update password. Please try again.';
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security reasons, please log out and log in again before changing your password.';
      }
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!currentUser) {
    return <div className="settings-section"><div className="settings-card"><h2>Settings</h2><div>Loading user...</div></div></div>;
  }
  if (loading) return <div className="settings-section"><div className="settings-card"><h2>Settings</h2><div>Loading...</div></div></div>;
  if (error) return <div className="settings-section"><div className="settings-card"><h2>Settings</h2><div style={{color: 'red'}}>{error}</div></div></div>;

  return (
    <section className="settings-section">
      <div className="settings-container">
        <div className="settings-card">
          <button
            className="settings-back-btn"
            onClick={() => navigate(-1)}
            style={{
              marginBottom: '1rem',
              background: 'none',
              border: 'none',
              color: '#f06292',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>&larr;</span> Back
          </button>
          <h2>Profile Settings</h2>
          <div className="settings-row">
            <label>First Name:</label>
            <span>{userData.firstName || currentUser.displayName?.split(' ')[0] || ''}</span>
          </div>
          <div className="settings-row">
            <label>Last Name:</label>
            <span>{userData.lastName || currentUser.displayName?.split(' ').slice(1).join(' ') || ''}</span>
          </div>
          <div className="settings-row">
            <label>Email Address:</label>
            <span>{userData.email || currentUser.email || ''}</span>
          </div>
          <div className="settings-row">
            <label>Age:</label>
            <input type="text" name="age" value={userData.age} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Birthday:</label>
            <input type="date" name="birthday" value={userData.birthday} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Address:</label>
            <input type="text" name="address" value={userData.address} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Contact Number:</label>
            <input type="text" name="contactNumber" value={userData.contactNumber} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Telephone Number:</label>
            <input type="text" name="telephoneNumber" value={userData.telephoneNumber} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Emergency Contact Name:</label>
            <input type="text" name="emergencyContactName" value={userData.emergencyContactName} onChange={handleChange} />
          </div>
          <div className="settings-row">
            <label>Emergency Contact Number:</label>
            <input type="text" name="emergencyContactNumber" value={userData.emergencyContactNumber} onChange={handleChange} />
          </div>
          <button className="settings-save-btn" onClick={handleSave}>Save</button>
          {success && <div style={{color: 'green', marginTop: '1rem'}}>{success}</div>}
          {error && <div style={{color: 'red', marginTop: '1rem'}}>{error}</div>}
        </div>

        <div className="settings-card">
          <h2>Account & Legal Settings</h2>
          <div className="settings-options">
            <button className="settings-option-btn" onClick={() => setShowPasswordModal(true)}>
              Change Password
            </button>
            <button className="settings-option-btn" onClick={() => setShowPaymentModal(true)}>
              Payment Method
            </button>
            <button className="settings-option-btn" onClick={() => setShowContactModal(true)}>
              How to Contact Us
            </button>
            {/* Change Privacy Policy button to open modal */}
            <button className="settings-option-btn" onClick={() => setShowPrivacyModal(true)}>
              Privacy Policy
            </button>
            <button className="settings-option-btn" onClick={() => setShowTermsModal(true)}>
              Terms & Conditions
            </button>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Change Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}>
                &times;
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="settings-row">
                <label>Current Password:</label>
                <div className="password-input-container">
                <input
                    type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordInputChange}
                  required
                    style={{paddingRight: '2.5rem', flex: 1, minWidth: 0}}
                  />
                  <button
                    type="button"
                    style={{position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#f06292', fontSize: '1.2rem'}}
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              <div className="settings-row">
                <label>New Password:</label>
                <div className="password-input-container">
                <input
                    type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  required
                    style={{paddingRight: '2.5rem', flex: 1, minWidth: 0}}
                  />
                  <button
                    type="button"
                    style={{position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#f06292', fontSize: '1.2rem'}}
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              <div className="settings-row">
                <label>Confirm New Password:</label>
                <div className="password-input-container">
                <input
                    type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  required
                    style={{paddingRight: '2.5rem', flex: 1, minWidth: 0}}
                  />
                  <button
                    type="button"
                    style={{position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#f06292', fontSize: '1.2rem'}}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              </div>
              <div className="modal-buttons">
                <button type="submit" className="settings-save-btn">Update Password</button>
                <button type="button" className="settings-cancel-btn" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Success Modal */}
      {showPasswordSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{textAlign: 'center'}}>
            <h3 style={{color: '#ff69b4', fontFamily: 'Fredoka One, cursive'}}>Password Updated!</h3>
            <p style={{margin: '1.5rem 0', color: '#444', fontSize: '1.1rem'}}>Your password has been updated successfully.</p>
            <button className="settings-save-btn" onClick={() => setShowPasswordSuccessModal(false)} style={{margin: '0 auto'}}>
              OK
            </button>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Payment Method</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
              >
                &times;
              </button>
            </div>
            <p>Cash on Arrival – Payment will be collected in cash when you arrive at our PawPoint.</p>
          </div>
        </div>
      )}

      {/* Add Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Privacy Policy for Pawpoint</h3>
              <button 
                onClick={() => setShowPrivacyModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Effective Date:</strong> June 13, 2025 <strong>Last Updated:</strong> June 13, 2025</p>
              <p>Welcome to Pawpoint! Your privacy is important to us, and we are committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or use our grooming services.</p>
              
              <h3>1. Information We Collect</h3>
              <p>We collect the following types of information:</p>
              <ul>
                <li><strong>Personal Information:</strong> Name, email address, phone number, home address, and pet details (such as breed, birthday, age, size, gender, and health conditions).</li>
                <li><strong>Payment Information:</strong> Payments for services are collected in cash upon arrival at Pawpoint.</li>
                <li><strong>Website Usage Data:</strong> Information about your interactions with our website, including cookies, IP addresses, and browsing behavior.</li>
              </ul>
    
              <h3>2. How We Use Your Information</h3>
              <p>We use your information to:</p>
              <ul>
                <li>Schedule and manage grooming appointments</li>
                <li>Process payments securely</li>
                <li>Send appointment reminders, promotions, and updates</li>
                <li>Improve our services and website experience</li>
                <li>Comply with legal obligations</li>
              </ul>
    
              <h3>3. Sharing Your Information</h3>
              <p>We do not sell or rent your personal information. However, we may share your data with:</p>
              <ul>
                <li><strong>Service Providers:</strong> Third-party companies that help us process payments, send communications, or improve our website.</li>
                <li><strong>Legal Authorities:</strong> If required by law or to protect our legal rights and safety.</li>
              </ul>
    
              <h3>4. Data Security</h3>
              <p>We take appropriate security measures to protect your personal information from unauthorized access, alteration, or disclosure. While no online system is completely secure, we encourage you to use strong passwords and safeguard your personal data.</p>
    
              <h3>5. Your Rights</h3>
              <p>You have the right to:</p>
              <ul>
                <li>Access, update, or delete your personal information</li>
                <li>Opt out of marketing communications</li>
                <li>Request details about how we process your data</li>
              </ul>
              <p>To exercise these rights, contact us at pawpointt@gmail.com.</p>
    
              <h3>6. Cookies & Tracking Technologies</h3>
              <p>We use cookies to enhance your browsing experience. We may also use third-party analytics tools to monitor website performance and improve user experience. You can manage cookie preferences through your browser settings.</p>
    
              <h3>7. Changes to This Policy</h3>
              <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date.</p>
    
              <h3>8. Contact Us</h3>
              <p>If you have any questions about this Privacy Policy, please contact us at:</p>
              <p>Pawpoint Grooming Services<br />
              UPS V, Parañaque City<br />
              pawpointt@gmail.com<br />
              +63 956 2775 784</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Terms and Conditions</h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p><strong>Effective Date:</strong> June 13, 2025</p>
              <p>Welcome to Pawpoint! These Terms and Conditions govern your use of our website and services. By accessing or using our platform, you agree to be bound by these terms.</p>

              <h3>1. Services</h3>
              <p>Pawpoint provides pet grooming services through our physical location. Our services are subject to availability and may be modified or discontinued at any time.</p>

              <h3>2. Appointments and Cancellations</h3>
              <ul>
                <li>Appointments must be scheduled in advance through our website.</li>
              </ul>

              <h3>3. Payment Terms</h3>
              <ul>
                <li>All payments are due at the time of service.</li>
                <li>We accept cash payments only.</li>
                <li>Prices are subject to change without notice.</li>
              </ul>

              <h3>4. Pet Health and Safety</h3>
              <ul>
                <li>Pet owners must disclose any health conditions or special requirements.</li>
                <li>We reserve the right to refuse service if we believe it may harm the pet.</li>
                <li>Pet owners are responsible for any injuries caused by their pets.</li>
              </ul>

              <h3>5. User Accounts</h3>
              <ul>
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the security of your account.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
              </ul>

              <h3>6. Intellectual Property</h3>
              <p>All content on our website, including text, graphics, logos, and images, is the property of Pawpoint and is protected by copyright laws.</p>

              <h3>7. Limitation of Liability</h3>
              <p>Pawpoint is not liable for any indirect, incidental, or consequential damages arising from your use of our services.</p>

              <h3>8. Changes to Terms</h3>
              <p>We reserve the right to modify these terms at any time. Continued use of our services constitutes acceptance of the modified terms.</p>

              <h3>9. Contact Information</h3>
              <p>For questions about these Terms and Conditions, please contact us at support@pawpoint.com</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Us Modal */}
      {showContactModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>How to Contact Us</h3>
              <button 
                onClick={() => setShowContactModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer'}}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{textAlign: 'center', padding: '2rem 0'}}>
              <p style={{fontSize: '1.1rem', lineHeight: '1.6', color: '#444'}}>
                Have any questions or suggestions. Reach out to us! You can send us a text message at <strong>+63 956 2775 784</strong> or email us at <strong>pawpointt@gmail.com</strong>—we're happy to assist you!
              </p>
              <p style={{fontSize: '1.05rem', color: '#444', marginTop: '1.2rem'}}>
                You can also send us a message by clicking the <strong>How to Contact Us</strong> option in the menu.
              </p>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default Settings;