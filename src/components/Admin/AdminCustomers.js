import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, addDoc, serverTimestamp, where, deleteDoc, onSnapshot } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { db, auth } from '../../firebase';
import AdminSidebar from './AdminSidebar';
import { FaUser, FaEnvelope, FaPhone, FaHistory, FaSignInAlt, FaSignOutAlt, FaKey, FaTrash, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './AdminCustomers.css';
import { toast } from 'react-toastify';

const AdminCustomers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState('Customers');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [messageUser, setMessageUser] = useState(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [unreadMessages, setUnreadMessages] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
        const allUsersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter out admin accounts - only keep customer data
        const customerUsersData = allUsersData.filter(user => !user.isAdmin);
        setUsers(customerUsersData);

        // Create a comprehensive list of customer user IDs (both uid and id)
        const customerUserIds = new Set();
        customerUsersData.forEach(user => {
          if (user.uid) customerUserIds.add(user.uid);
          if (user.id) customerUserIds.add(user.id);
        });

        // Fetch unread message counts for each customer user
        const unreadCounts = {};
        for (const user of customerUsersData) {
          const messagesQuery = query(
            collection(db, 'messages'),
            where('userId', '==', user.uid),
            where('fromAdmin', '==', false),
            where('isRead', '==', false)
          );
          const unreadSnapshot = await getDocs(messagesQuery);
          if (!unreadSnapshot.empty) {
            unreadCounts[user.uid] = unreadSnapshot.size;
          }
        }
        setUnreadMessages(unreadCounts);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Add real-time listener for new messages
  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('fromAdmin', '==', false),
      where('isRead', '==', false),
      where('notified', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          const userQuery = query(collection(db, 'users'), where('uid', '==', messageData.userId));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            // Show notification
            toast.info(
              <div>
                <div style={{ marginBottom: '8px' }}>
                  New message from {userData.firstName} {userData.lastName}
                </div>
                <div style={{ fontSize: '0.9em', opacity: 0.9 }}>
                  {messageData.message.length > 50 
                    ? messageData.message.substring(0, 50) + '...' 
                    : messageData.message}
                </div>
              </div>,
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

            // Update message as notified
            const messageRef = doc(db, 'messages', change.doc.id);
            await updateDoc(messageRef, { notified: true });

            // Update unread count
            setUnreadMessages(prev => ({
              ...prev,
              [messageData.userId]: (prev[messageData.userId] || 0) + 1
            }));
          }
        }
      });
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        password: newPassword
      });
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    } catch (err) {
      setPasswordError('Failed to update password: ' + err.message);
      console.error('Error updating password:', err);
    }
  };

  const fetchUserMessages = async (userUid) => {
    setMessageLoading(true);
    try {
      const q = query(collection(db, 'messages'), where('userId', '==', userUid));
    const querySnapshot = await getDocs(q);
    const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Mark messages as read
      const batch = [];
      for (const msg of msgs) {
        if (!msg.fromAdmin && !msg.isRead) {
          const msgRef = doc(db, 'messages', msg.id);
          batch.push(updateDoc(msgRef, { isRead: true }));
        }
      }
      await Promise.all(batch);

      // Update unread count
      setUnreadMessages(prev => ({
        ...prev,
        [userUid]: 0
      }));

    // Sort by timestamp ascending
    msgs.sort((a, b) => {
      const ta = a.timestamp?.toMillis?.() || 0;
      const tb = b.timestamp?.toMillis?.() || 0;
      return ta - tb;
    });
    setMessages(msgs);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages. Please try again! 🐾', {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
        style: {
          background: '#ff6b6b',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
        }
      });
    } finally {
    setMessageLoading(false);
    }
  };

  const handleOpenMessages = async (user) => {
    setMessageUser(user);
    setShowMessagesModal(true);
    setMessageInput('');
    setMessageSuccess('');
    await fetchUserMessages(user.uid);
  };

  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !messageUser) return;
    try {
    await addDoc(collection(db, 'messages'), {
        userId: messageUser.uid,
      userEmail: messageUser.email,
      message: messageInput,
      rating: null,
      timestamp: serverTimestamp(),
      fromAdmin: true,
        reply: '',
        isRead: false,
        notified: false
    });
    setMessageInput('');
    setMessageSuccess('Message sent!');
      toast.success('Message sent successfully! 🐾', {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
        style: {
          background: '#ff8fab',
          color: 'white',
          fontFamily: 'Fredoka One, cursive',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(255, 143, 171, 0.3)'
        }
      });
      await fetchUserMessages(messageUser.uid);
    } catch (error) {
      toast.error('Failed to send message. Please try again! 🐾', {
        position: "top-right",
        autoClose: 3000,
        theme: "colored",
        style: {
          background: '#ff6b6b',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
        }
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      setDeleteError('Failed to delete user: ' + err.message);
    }
    setDeleteLoading(false);
  };

  const renderCustomersTab = () => {
    const filteredUsers = users.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });

    return (
    <div className="customers-grid">
        {filteredUsers.length === 0 ? (
          <div className="no-data">{searchTerm ? `No customers found for "${searchTerm}"` : "No customers found."}</div>
      ) : (
          filteredUsers.map(user => (
          <div key={user.id} className="customer-card">
            <div className="customer-header">
              <FaUser className="customer-icon" />
              <h3>{user.firstName} {user.lastName}</h3>
              <div className="action-btn-row">
              <button 
                  className="icon-action-btn"
                onClick={() => {
                  setSelectedUser(user);
                  setShowPasswordModal(true);
                }}
                title="Change Password"
              >
                <FaKey />
              </button>
                <button
                  className="icon-action-btn message-btn"
                  onClick={() => handleOpenMessages(user)}
                  title="View Messages"
                >
                  <FaEnvelope />
                  {unreadMessages[user.uid] > 0 && (
                    <span className="message-badge">{unreadMessages[user.uid]}</span>
                  )}
                </button>
                <button
                  className="icon-action-btn"
                  onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }}
                  title="Delete Account"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            <div className="customer-info-grid">
              <div><b>Email:</b> {user.email || ''}</div>
              <div><b>Phone:</b> {user.phone || ''}</div>
              <div><b>Age:</b> {user.age || ''}</div>
              <div><b>Birthday:</b> {user.birthday || ''}</div>
              <div><b>Address:</b> {user.address || ''}</div>
              <div><b>Contact number:</b> {user.contactNumber || ''}</div>
              <div><b>Telephone number:</b> {user.telephoneNumber || ''}</div>
              <div><b>Emergency contact name:</b> {user.emergencyContactName || ''}</div>
              <div><b>Emergency contact number:</b> {user.emergencyContactNumber || ''}</div>
              <div><b>Member since:</b> {formatDate(user.createdAt)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
  };

  return (
    <div className="admin-dashboard-layout pastel-theme">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-main-content">
        <div className="admin-dashboard-header">Customer Management</div>
        
        {loading ? (
          <div className="loading-message">Loading data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            <div className="customer-controls">
              <input
                type="text"
                className="customer-search-input"
                placeholder="Search for a customer by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {renderCustomersTab()}
          </>
        )}

        {showPasswordModal && selectedUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Change Password for {selectedUser.firstName} {selectedUser.lastName}</h2>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>New Password:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength="6"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password:</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength="6"
                    placeholder="Confirm new password"
                  />
                </div>
                {passwordError && (
                  <div className="error-message">{passwordError}</div>
                )}
                <div className="modal-actions">
                  <button type="submit" className="save-button">Update Password</button>
                  <button 
                    type="button" 
                    className="cancel-button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setSelectedUser(null);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMessagesModal && messageUser && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
              <h2>Messages with {messageUser.firstName} {messageUser.lastName}</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowMessagesModal(false)}
                  title="Close"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="messages-list">
                {messageLoading ? (
                  <div className="loading-messages">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="no-messages">No messages yet. Start a conversation! 🐾</div>
                ) : (
                  messages.map(msg => (
                  <div
                    key={msg.id}
                    className={msg.fromAdmin ? 'message-bubble-admin' : 'message-bubble-user'}
                    >
                      <div className="message-header">
                        <span className="message-sender">
                          {msg.fromAdmin ? 'Admin' : messageUser.firstName}
                        </span>
                        <span className="message-time">
                          {msg.timestamp?.toDate?.().toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) || ''}
                        </span>
                      </div>
                      {msg.message && <div className="message-content">{msg.message}</div>}
                      {msg.rating && (
                        <div className="message-rating">
                          Feedback: {msg.rating} {'★'.repeat(msg.rating)}
                        </div>
                      )}
                      {msg.reply && (
                        <div className="message-reply">
                          <b>Admin reply:</b> {msg.reply}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendAdminMessage} className="message-form">
                <div className="message-input-container">
                <textarea
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  placeholder="Type your message to the user..."
                    className="message-textarea"
                />
                  <button 
                    type="submit" 
                    className="send-icon-button"
                    disabled={!messageInput.trim()}
                    title="Send Message"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
                {messageSuccess && <div className="success-msg">{messageSuccess}</div>}
              </form>
            </div>
          </div>
        )}

        {showDeleteModal && userToDelete && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Confirm Account Deletion</h2>
              <p>Are you sure you want to delete the account for <b>{userToDelete.firstName} {userToDelete.lastName}</b>? This action cannot be undone.</p>
              {deleteError && <div className="error-message">{deleteError}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                <button className="save-button" onClick={handleDeleteUser} disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button className="cancel-button" onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} disabled={deleteLoading}>
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

export default AdminCustomers;