import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState({});
  const [active, setActive] = useState('Messages');

  useEffect(() => {
    const fetchMessages = async () => {
      const querySnapshot = await getDocs(collection(db, 'messages'));
      setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMessages();
  }, []);

  const handleReply = async (id) => {
    await updateDoc(doc(db, 'messages', id), {
      reply: reply[id] || '',
      fromAdmin: true
    });
    setReply({ ...reply, [id]: '' });
    // Optionally, refresh messages
    const querySnapshot = await getDocs(collection(db, 'messages'));
    setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  return (
    <div>
      <h2>User Messages & Surveys</h2>
      {messages.length === 0 ? <div>No messages yet.</div> : messages.map(msg => (
        <div key={msg.id} className="admin-message-block">
          <div><b>User:</b> {msg.userEmail}</div>
          <div><b>Message:</b> {msg.message}</div>
          <div><b>Rating:</b> {msg.rating || 'N/A'}</div>
          <div><b>Sent:</b> {msg.timestamp?.toDate?.().toLocaleString?.() || 'N/A'}</div>
          <div>
            <textarea
              value={reply[msg.id] || ''}
              onChange={e => setReply({ ...reply, [msg.id]: e.target.value })}
              placeholder="Type your reply..."
            />
            <button onClick={() => handleReply(msg.id)}>Send Reply</button>
          </div>
          {msg.reply && <div className="admin-reply"><b>Admin reply:</b> {msg.reply}</div>}
        </div>
      ))}
    </div>
  );
};

export default AdminMessages; 