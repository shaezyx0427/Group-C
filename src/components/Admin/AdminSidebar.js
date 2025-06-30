import { useNavigate, useContext } from 'react-router-dom';
import { FaTachometerAlt, FaCalendarAlt, FaUsers, FaPaw, FaUserCircle, FaChartBar, FaHistory } from 'react-icons/fa';
import './AdminDashboard.css';
import { logAuditTrail, AUDIT_ACTIONS } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  { name: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
  { name: 'Appointments', icon: <FaCalendarAlt />, path: '/admin/appointments' },
  { name: 'Customers', icon: <FaUsers />, path: '/admin/customers' },
  { name: 'Pets', icon: <FaPaw />, path: '/admin/pets' },
  { name: 'Reports', icon: <FaChartBar />, path: '/admin/reports' },
  { name: 'Audit Trail', icon: <FaHistory />, path: '/admin/audit' },
];

const AdminSidebar = ({ active, setActive }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const handleNavigation = async (link) => {
    setActive(link.name);
    navigate(link.path);
    
    // Check if user is admin from context OR if email is pawpointt@gmail.com
    const isUserAdmin = isAdmin || user?.email === 'pawpointt@gmail.com';
    
    // Log dashboard access
    await logAuditTrail({
      userId: user?.uid,
      userEmail: user?.email,
      action: AUDIT_ACTIONS.DASHBOARD_ACCESS,
      details: { section: link.name },
      userType: isUserAdmin ? 'admin' : 'customer',
      resourceType: 'dashboard',
      resourceId: link.path
    });
  };

  const getUserIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching user IP:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    const userIp = await getUserIp();
    await logAuditTrail({
      userId: user?.uid,
      userEmail: user?.email,
      action: 'LOGIN',
      ipAddress: userIp,
    });
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0' }}>
          <FaUserCircle className="admin-avatar" />
          <span className="admin-label">Admin Panel</span>
        </div>
      </div>
      <nav className="admin-nav">
        {links.map(link => (
          <div
            key={link.name}
            className={`admin-nav-link${active === link.name ? ' active' : ''}`}
            onClick={() => handleNavigation(link)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
          >
            {link.icon}
            <span>{link.name}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default AdminSidebar;