import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import AdminSidebar from './AdminSidebar';
import { 
  FaUser, 
  FaSignInAlt, 
  FaSignOutAlt, 
  FaHistory, 
  FaPaw, 
  FaCalendarAlt, 
  FaDownload, 
  FaPrint, 
  FaEdit, 
  FaExclamationTriangle,
  FaFilter,
  FaSearch,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import './AdminDashboard.css';
import './AdminAudit.css';

const AdminAudit = () => {
  const [auditTrail, setAuditTrail] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState('Audit Trail');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessions, setExpandedSessions] = useState({});

  useEffect(() => {
    const fetchAuditTrail = async () => {
      setLoading(true);
      const q = query(collection(db, 'userAuditTrail'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      setAuditTrail(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    };
    fetchAuditTrail();
  }, []);

  useEffect(() => {
    if (loading || auditTrail.length === 0) return;

    const groupIntoSessions = (records) => {
      const allSessions = [];
      const recordsByUser = {};

      // First, group all records by user
      records.forEach(r => {
        // Use a consistent key for users, fallback for records without a user ID
        const userKey = r.userId || r.userEmail || 'system-events';
        if (!recordsByUser[userKey]) {
          recordsByUser[userKey] = [];
        }
        recordsByUser[userKey].push(r);
      });

      // Now, process each user's records to create sessions
      for (const userKey in recordsByUser) {
        const userRecords = recordsByUser[userKey]
          .filter(r => r.timestamp && typeof r.timestamp.toMillis === 'function')
          .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis());
        
        let currentSession = null;

        userRecords.forEach(record => {
          const isLogin = record.action === 'LOGIN' || record.action === 'ADMIN_LOGIN';
          const isLogout = record.action === 'LOGOUT' || record.action === 'ADMIN_LOGOUT';

          // A login always starts a new session.
          // If a session is already open, close the previous one and start fresh.
          if (isLogin) {
            if (currentSession) {
              allSessions.push(currentSession);
            }
            currentSession = {
              id: record.id,
              userEmail: record.userEmail,
              userId: record.userId,
              userType: record.userType,
              startTime: record.timestamp,
              endTime: null,
              records: [record],
              status: 'Active'
            };
          } else {
            // If it's not a login, either add to the current session or start a new one.
            if (!currentSession) {
              // No session is active, so this record will start a new "inferred" session.
              currentSession = {
                id: record.id,
                userEmail: record.userEmail,
                userId: record.userId,
                userType: record.userType,
                startTime: record.timestamp,
                endTime: null,
                records: [record],
                status: 'Active' // We'll just call it active for simplicity
              };
            } else {
              // A session is already active, so just add this record.
              currentSession.records.push(record);
            }

            // If this action is a logout, it completes the session.
            if (isLogout) {
              currentSession.endTime = record.timestamp;
              currentSession.status = 'Completed';
              allSessions.push(currentSession);
              currentSession = null; // Reset for the next record
            }
          }
        });

        // If there's an open session at the end of all records for a user, add it to the list.
        if (currentSession) {
          allSessions.push(currentSession);
        }
      }
      
      // Finally, sort all created sessions by their start time, most recent first.
      return allSessions
        .filter(s => s.startTime && typeof s.startTime.toMillis === 'function')
        .sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
    };

    setSessions(groupIntoSessions(auditTrail));
  }, [auditTrail, loading]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'ADMIN_LOGIN':
        return <FaSignInAlt className="action-icon login" />;
      case 'LOGOUT':
      case 'ADMIN_LOGOUT':
        return <FaSignOutAlt className="action-icon logout" />;
      case 'FAILED_LOGIN':
        return <FaExclamationTriangle className="action-icon failed" />;
      case 'PET_CREATED':
      case 'PET_UPDATED':
      case 'PET_DELETED':
        return <FaPaw className="action-icon pet" />;
      case 'APPOINTMENT_CREATED':
      case 'APPOINTMENT_RESCHEDULED':
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_COMPLETED':
      case 'MANUAL_BOOKING_EDIT':
        return <FaCalendarAlt className="action-icon appointment" />;
      case 'REPORT_DOWNLOAD':
        return <FaDownload className="action-icon download" />;
      case 'REPORT_PRINT':
        return <FaPrint className="action-icon print" />;
      case 'CUSTOMER_PROFILE_EDIT':
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return <FaEdit className="action-icon edit" />;
      case 'PASSWORD_RESET':
      case 'PASSWORD_CHANGE':
        return <FaUser className="action-icon password" />;
      default:
        return <FaHistory className="action-icon default" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'LOGIN':
      case 'ADMIN_LOGIN':
        return '#2ecc71';
      case 'LOGOUT':
      case 'ADMIN_LOGOUT':
        return '#e74c3c';
      case 'FAILED_LOGIN':
        return '#f39c12';
      case 'PET_CREATED':
      case 'PET_UPDATED':
      case 'PET_DELETED':
        return '#9b59b6';
      case 'APPOINTMENT_CREATED':
      case 'APPOINTMENT_RESCHEDULED':
      case 'APPOINTMENT_CANCELLED':
      case 'APPOINTMENT_COMPLETED':
      case 'MANUAL_BOOKING_EDIT':
        return '#3498db';
      case 'REPORT_DOWNLOAD':
      case 'REPORT_PRINT':
        return '#1abc9c';
      case 'CUSTOMER_PROFILE_EDIT':
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED':
        return '#e67e22';
      case 'PASSWORD_RESET':
      case 'PASSWORD_CHANGE':
        return '#34495e';
      default:
        return '#95a5a6';
    }
  };

  const getActionCategory = (action) => {
    if (['LOGIN', 'LOGOUT', 'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'FAILED_LOGIN', 'PASSWORD_RESET', 'PASSWORD_CHANGE'].includes(action)) {
      return 'Authentication';
    } else if (['PET_CREATED', 'PET_UPDATED', 'PET_DELETED'].includes(action)) {
      return 'Pet Management';
    } else if (['APPOINTMENT_CREATED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED', 'MANUAL_BOOKING_EDIT'].includes(action)) {
      return 'Appointment Management';
    } else if (['REPORT_DOWNLOAD', 'REPORT_PRINT', 'DASHBOARD_ACCESS'].includes(action)) {
      return 'Admin Activities';
    } else if (['CUSTOMER_PROFILE_EDIT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED'].includes(action)) {
      return 'User Management';
    } else {
      return 'Other';
    }
  };

  const filteredSessions = sessions.filter(session => {
    const sessionCategory = getActionCategory(session.records[0].action);
    const matchesFilter = filter === 'all' || 
      session.records.some(record => getActionCategory(record.action) === filter);

    const matchesSearch = searchTerm === '' ||
      session.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.records.some(record => 
        record.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.details && JSON.stringify(record.details).toLowerCase().includes(searchTerm.toLowerCase()))
      );

    return matchesFilter && matchesSearch;
  });

  const toggleSession = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const getSessionDuration = (startTime, endTime) => {
    if (startTime && endTime) {
      const diff = endTime.toMillis() - startTime.toMillis();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff / (1000 * 60)) % 60;
      const seconds = Math.floor(diff / 1000) % 60;
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return 'Active';
  };

  const renderSingleRecord = (record) => {
    const details = [];
    if (record.details && typeof record.details === 'object') {
        for (const [key, value] of Object.entries(record.details)) {
            const prettyKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            const prettyValue = Array.isArray(value) ? value.join(', ') : String(value);
            details.push({ key: prettyKey, value: prettyValue });
        }
    } else if (record.details) {
        details.push({ key: 'Details', value: String(record.details) });
    }

    if (record.resourceType && record.resourceId) {
        details.push({ key: 'Resource', value: `${record.resourceType} (ID: ${record.resourceId})`});
    }

    if (record.ipAddress) {
        details.push({ key: 'IP Address', value: record.ipAddress });
    }

    return (
        <div key={record.id} className="audit-record-item">
            <div className="record-icon-container">
                {getActionIcon(record.action)}
            </div>
            <div className="record-info-stack">
                <div className="record-primary-info">
                    <span className="record-timestamp">{formatDate(record.timestamp)}</span>
                    <span className="record-action-name">{record.action.replace(/_/g, ' ')}</span>
                </div>
                {details.length > 0 && (
                    <div className="record-details-grid">
                        {details.map((detail, index) => (
                            <div className="detail-pill" key={index} title={`${detail.key}: ${detail.value}`}>
                                <span className="detail-pill-key">{detail.key}:</span>
                                <span className="detail-pill-value">{detail.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
  };
  
  const categories = ['all', 'Authentication', 'Pet Management', 'Appointment Management', 'Admin Activities', 'User Management', 'Other'];

  return (
    <div className="admin-dashboard-layout pastel-theme">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-main">
        <div className="admin-dashboard-header">Audit Trail</div>
        
        <div className="audit-controls">
          <div className="search-filter-container">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by email (customer / admin)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-container">
              <FaFilter className="filter-icon" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="filter-select"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="audit-stats">
            <div className="stat-item">
              <span className="stat-label">Total Sessions:</span>
              <span className="stat-value">{sessions.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Filtered:</span>
              <span className="stat-value">{filteredSessions.length}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-message">Loading audit records...</div>
        ) : filteredSessions.length === 0 ? (
          <div className="no-data">No audit records found.</div>
        ) : (
          <div className="audit-session-list">
            {filteredSessions.map(session => (
              <div key={session.id} className="audit-session-item">
                <div className="audit-session-header" onClick={() => toggleSession(session.id)}>
                  <div className="session-user-info">
                    {getActionIcon(session.records[0].action)}
                    <div className="user-info">
                      <span className="user-email">{session.userEmail || 'Unknown User'}</span>
                      <span className="user-type">({session.userType || 'customer'})</span>
                    </div>
                  </div>
                  <div className="session-meta">
                    <div className="session-duration">
                      <FaHistory className="meta-icon" />
                      {getSessionDuration(session.startTime, session.endTime)}
                    </div>
                    <div className={`session-status ${session.status.toLowerCase()}`}>{session.status}</div>
                    <div className="session-action-count">{session.records.length} Actions</div>
                  </div>
                  <div className="session-expand-icon">
                    {expandedSessions[session.id] ? <FaEyeSlash /> : <FaEye />}
                  </div>
                </div>

                {expandedSessions[session.id] && (
                  <div className="audit-session-body">
                    {session.records.map(record => renderSingleRecord(record))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminAudit; 