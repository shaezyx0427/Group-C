import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaPaw, FaPaperPlane } from 'react-icons/fa';
import { toast } from 'react-toastify';

const ContactAdmin = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const [rating, setRating] = useState(0);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [userMessages, setUserMessages] = useState([]);
  const [canSendFeedback, setCanSendFeedback] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const chatWindowRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    // Scroll chat window to top when this section mounts
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = 0;
    }
    const fetchMessages = async () => {
      const q = query(collection(db, 'messages'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      setUserMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    const checkDoneAppointment = async () => {
      const q = query(collection(db, 'appointments'), where('userId', '==', user.uid), where('status', '==', 'Done'));
      const querySnapshot = await getDocs(q);
      setCanSendFeedback(!querySnapshot.empty);
      setLoading(false);
    };
    fetchMessages();
    checkDoneAppointment();
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userEmail: user.email,
        message,
        rating: null,
        timestamp: serverTimestamp(),
        fromAdmin: false,
        reply: '',
        isRead: false,
        notified: false
      });
      setMessage('');
      setMessageSuccess('Message sent!');
      toast.success('Message sent successfully! 🐾', {
        position: "top-right",
        autoClose: 3000,
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
      });
    } catch (error) {
      toast.error('Failed to send message. Please try again! 🐾', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        style: {
          background: '#ff6b6b',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
        }
      });
    }
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    try {
      await addDoc(collection(db, 'messages'), {
        userId: user.uid,
        userEmail: user.email,
        message: '',
        rating,
        timestamp: serverTimestamp(),
        fromAdmin: false,
        reply: '',
        isRead: false,
        notified: false
      });
      setRating(0);
      setFeedbackSuccess('Feedback sent!');
      toast.success('Feedback sent successfully! Thank you! 🐾', {
        position: "top-right",
        autoClose: 3000,
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
      });
    } catch (error) {
      toast.error('Failed to send feedback. Please try again! 🐾', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
        style: {
          background: '#ff6b6b',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
        }
      });
    }
  };

  const overallFeedback = userMessages.length
    ? (userMessages.reduce((sum, msg) => sum + Number(msg.rating), 0) / userMessages.length).toFixed(2)
    : '0.00';

  return (
    <div className="contact-admin-chat-app" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '80vh',
      maxWidth: '1400px',
      width: '98vw',
      margin: '40px auto',
      background: 'rgba(255,255,255,0.95)',
      borderRadius: 24,
      boxShadow: '0 8px 32px #ffd6e6',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        width: '100%',
        background: 'linear-gradient(90deg, #ff8fab 0%, #ffb6d5 100%)',
        padding: '18px 0',
        textAlign: 'center',
        fontFamily: 'Fredoka One, cursive',
        fontSize: '1.5rem',
        color: '#fff',
        letterSpacing: 1,
        boxShadow: '0 2px 8px #ffd6e6',
        position: 'relative',
      }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#ffb6d5',
            border: 'none',
            borderRadius: '50%',
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'none',
            cursor: 'pointer',
            outline: 'none',
            transition: 'background 0.2s',
            zIndex: 2,
          }}
          title="Back"
          aria-label="Back"
        >
          <span style={{ fontSize: '1.5rem', color: '#fff', verticalAlign: 'middle' }}>&larr;</span>
        </button>
        <FaPaw style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Contact Admin
      </div>
      <div className="chat-messages-window" style={{
        flex: 1,
        width: '100%',
        overflowY: 'auto',
        padding: '32px 24px 16px 24px',
        background: '#ffe3ed'
      }}
      ref={chatWindowRef}
      >
        {userMessages.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>No messages yet.</p>
        ) : (
          userMessages
            .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0))
            .map(msg => {
              const isUser = !msg.fromAdmin;
              return (
                <div
                  key={msg.id}
                  className={isUser ? 'message-bubble-user' : 'message-bubble-admin'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    marginBottom: 18,
                    width: '100%',
                  }}
                >
                  <div className="message-header" style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                    marginBottom: 4,
                    width: '100%'
                  }}>
                    <span className="message-sender" style={{
                      fontWeight: 700,
                      color: isUser ? '#ff8fab' : '#232b33',
                      marginRight: isUser ? 0 : 8,
                      marginLeft: isUser ? 8 : 0
                    }}>
                      {isUser ? 'You' : 'Admin'}
                    </span>
                    <span className="message-time" style={{
                      fontSize: '0.85em',
                      color: '#b6c2d1',
                      marginLeft: isUser ? 8 : 0,
                      marginRight: isUser ? 0 : 8
                    }}>
                      {msg.timestamp?.seconds ? new Date(msg.timestamp.seconds * 1000).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      }) : ''}
                    </span>
                  </div>
                  {msg.message && msg.message.trim() && (
                    <div className="message-content" style={{
                      background: isUser ? '#ffd6e6' : '#232b33',
                      color: isUser ? '#232b33' : '#fff',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      padding: '10px 18px',
                      maxWidth: '70%',
                      fontSize: '1.02rem',
                      fontFamily: 'Quicksand, cursive',
                      boxShadow: isUser ? '0 2px 8px #ffd6e6' : '0 2px 8px #232b33',
                      marginLeft: isUser ? 'auto' : '12px',
                      marginRight: isUser ? '12px' : 'auto',
                      marginBottom: 4,
                      wordBreak: 'break-word',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                    }}>
                      {msg.message}
                    </div>
                  )}
                  {msg.rating && (
                    <div className="message-rating" style={{
                      color: '#FFD700',
                      fontWeight: 600,
                      marginBottom: 4,
                      alignSelf: isUser ? 'flex-end' : 'flex-start'
                    }}>
                      Feedback: {msg.rating} {'★'.repeat(msg.rating)}
                    </div>
                  )}
                  {msg.reply && msg.reply.trim() && (
                    <div className="message-reply" style={{
                      background: '#fffbe7',
                      color: '#ff8fab',
                      borderRadius: 8,
                      padding: '8px 16px',
                      marginTop: 10,
                      fontWeight: 600,
                      fontFamily: 'Quicksand, sans-serif',
                      boxShadow: '0 1px 4px #ffe082',
                      border: '1.5px solid #ffe082',
                      maxWidth: '70%',
                      alignSelf: 'flex-start',
                      wordBreak: 'break-word',
                      marginLeft: '12px',
                      marginRight: 'auto',
                    }}>
                      <b>Admin reply:</b> {msg.reply}
                    </div>
                  )}
                </div>
              );
            })
        )}
        <div ref={chatEndRef} />
      </div>
      {/* Message input at the bottom */}
      <form onSubmit={handleSendMessage} style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '24px 0 32px 0',
        background: 'rgba(255,255,255,0.0)',
        borderTop: '2px solid #ffd6e6',
        justifyContent: 'center',
      }}>
        <div style={{
          position: 'relative',
          width: '90vw',
          maxWidth: 1200,
          minWidth: 320,
          display: 'flex',
          alignItems: 'center',
        }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Type your message..."
            style={{
              width: '100%',
              background: '#fff0f6',
              border: '2px solid #ffd6e6',
              borderRadius: 16,
              minHeight: 48,
              maxHeight: 120,
              fontFamily: 'Quicksand, cursive',
              fontSize: '1.08rem',
              boxShadow: '0 2px 8px #ffd6e6',
              padding: '16px 56px 16px 18px',
              color: '#444',
              outline: 'none',
              resize: 'none',
              marginRight: 0,
              marginBottom: 0,
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#ff8fab',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px #ffd6e6',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 0.2s',
            }}
            title="Send"
            aria-label="Send message"
          >
            <FaPaperPlane style={{ fontSize: '1.6rem', color: '#fff', verticalAlign: 'middle' }} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactAdmin; 