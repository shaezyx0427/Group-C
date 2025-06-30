import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import AdminSidebar from './AdminSidebar';
import { FaCalendarAlt, FaUsers, FaPaw, FaUserCircle } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './AdminDashboard.css';
import { formatDate } from '../../utils/dateUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const pastelPink = '#ffb6c1';
const pastelPinkDark = '#ff8fab';
const pastelWhite = '#fff5f8';

const AdminDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState('Dashboard');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [appointmentsSnap, usersSnap, paymentsSnap, petsSnap] = await Promise.all([
          getDocs(collection(db, 'appointments')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'pets')),
        ]);
        
        // Filter out admin accounts from users
        const allUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const customerUsers = allUsers.filter(user => !user.isAdmin);
        
        // Create a comprehensive list of customer user IDs (both uid and id)
        const customerUserIds = new Set();
        customerUsers.forEach(user => {
          if (user.uid) customerUserIds.add(user.uid);
          if (user.id) customerUserIds.add(user.id);
        });
        
        // Filter appointments, payments, and pets to only include customer data
        const customerAppointments = appointmentsSnap.docs
          .map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            date: formatDate(doc.data().date)
          }))
          .filter(appointment => {
            const appointmentUserId = appointment.userId || appointment.uid || appointment.ownerId;
            return appointmentUserId && customerUserIds.has(appointmentUserId);
          });
        
        const customerPayments = paymentsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(payment => {
            const paymentUserId = payment.userId || payment.uid || payment.ownerId;
            return paymentUserId && customerUserIds.has(paymentUserId);
          });
        
        const customerPets = petsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(pet => {
            const petUserId = pet.userId || pet.uid || pet.ownerId;
            return petUserId && customerUserIds.has(petUserId);
          });
        
        setAppointments(customerAppointments);
        setUsers(customerUsers);
        setPayments(customerPayments);
        setPets(customerPets);
      } catch (err) {
        setError('Failed to load data: ' + err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Utility Functions ---
  const getCurrentDateString = () => {
    return new Date().toISOString().split('T')[0];
  };

  // --- Data Calculations ---
  const calculateTodaysAppointments = (appointments, pets) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return appointments
      .filter(a => {
        if (!a.date) return false;
        const apptDate = new Date(a.date);
        apptDate.setHours(0, 0, 0, 0);
        return apptDate.getTime() === today.getTime() && a.status !== 'cancelled';
      })
      .map(appointment => ({
        ...appointment,
        petName: pets.find(p => p.id === appointment.petId)?.name || 'Unknown Pet'
      }));
  };

  const calculateUpcomingAppointments = (appointments, pets) => {
    const now = new Date();
    return appointments
      .filter(a => {
        const appointmentDate = new Date(`${a.date}T${a.time || '00:00'}`);
        return appointmentDate >= now && a.status !== 'cancelled';
      })
      .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
      .slice(0, 5);
  };

  const calculateTopCustomers = (users, pets) => {
    return users
      .map(u => ({
        ...u,
        petCount: pets.filter(p => p.ownerId === u.id || p.userId === u.uid).length
      }))
      .sort((a, b) => b.petCount - a.petCount)
      .slice(0, 4);
  };

  // --- Derived State ---
  const todaysAppointments = calculateTodaysAppointments(appointments, pets);
  const upcomingAppointments = calculateUpcomingAppointments(appointments, pets);
  const topCustomers = calculateTopCustomers(users, pets);
  const revenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Prepare monthly appointments data (last 6 months)
  const now = new Date();
  const months = [];
  const monthLabels = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
    monthLabels.push(d.toLocaleString('default', { month: 'short' }));
  }
  const monthlyAppointments = months.map((month, idx) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    return appointments.filter(a => {
      if (!a.date) return false;
      const appointmentDate = new Date(a.date);
      return appointmentDate.getFullYear() === year && appointmentDate.getMonth() === m;
    }).length;
  });

  const appointmentsChartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Appointments',
        data: monthlyAppointments,
        fill: true,
        backgroundColor: pastelPink + '33',
        borderColor: pastelPinkDark,
        pointBackgroundColor: pastelPinkDark,
        pointBorderColor: '#fff',
        tension: 0.4,
      },
    ],
  };

  const appointmentsChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: pastelPinkDark,
        titleColor: '#fff',
      }
    }
  };

  return (
    <div className="admin-dashboard-layout pastel-theme">
      <AdminSidebar active={active} setActive={setActive} />
      <main className="admin-main">
        <div className="admin-dashboard-header">Dashboard</div>
        {loading ? (
          <div style={{ padding: 32 }}>Loading...</div>
        ) : error ? (
          <div style={{ color: 'red', padding: 32 }}>{error}</div>
        ) : (
          <>
            <div className="admin-summary-cards">
              <div className="admin-summary-card card-pink pastel-card">
                <div className="card-icon"><FaCalendarAlt /></div>
                <div className="card-title">Today's Appointments</div>
                <div className="card-value">{todaysAppointments.length}</div>
              </div>
              <div className="admin-summary-card card-blue pastel-card">
                <div className="card-icon"><FaCalendarAlt /></div>
                <div className="card-title">Total Appointments</div>
                <div className="card-value">{appointments.length}</div>
              </div>
              <div className="admin-summary-card card-green pastel-card">
                <div className="card-icon"><FaUsers /></div>
                <div className="card-title">Customers</div>
                <div className="card-value">{users.length}</div>
              </div>
              <div className="admin-summary-card card-purple pastel-card">
                <div className="card-icon"><FaPaw /></div>
                <div className="card-title">Pets</div>
                <div className="card-value">{pets.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
              {/* Appointments Table */}
              <div className="pastel-block" style={{ flex: 2, background: pastelWhite, borderRadius: 20, boxShadow: '0 2px 8px #ffb6c133', padding: 20, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 12, color: pastelPinkDark }}>Appointments</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: pastelPinkDark, fontWeight: 500 }}>
                      <th style={{ textAlign: 'left', padding: 8 }}>Time</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Pet</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Service</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaysAppointments.length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: pastelPinkDark, padding: 16 }}>No appointments today.</td></tr>
                    ) : (
                      todaysAppointments.map((a, idx) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #ffe4ec' }}>
                          <td style={{ padding: 8 }}>{a.time || '-'}</td>
                          <td style={{ padding: 8, fontWeight: 600 }}>{a.petName || '-'}</td>
                          <td style={{ padding: 8 }}>{Array.isArray(a.services) ? a.services.join(', ') : (a.services || '-')}</td>
                          <td style={{ padding: 8 }}>{a.status || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {/* Appointments Chart */}
              <div className="pastel-block" style={{ flex: 2, background: pastelWhite, borderRadius: 20, boxShadow: '0 2px 8px #ffb6c133', padding: 20, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 12, color: pastelPinkDark }}>Monthly Appointments</div>
                <div style={{ width: '100%', height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Line data={appointmentsChartData} options={appointmentsChartOptions} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              {/* Customers List */}
              <div className="pastel-block" style={{ flex: 2, background: pastelWhite, borderRadius: 20, boxShadow: '0 2px 8px #ffb6c133', padding: 20, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: 12, color: pastelPinkDark }}>Customers</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: pastelPinkDark, fontWeight: 500 }}>
                      <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                      <th style={{ textAlign: 'left', padding: 8 }}>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.length === 0 ? (
                      <tr><td colSpan={2} style={{ textAlign: 'center', color: pastelPinkDark, padding: 16 }}>No customers found.</td></tr>
                    ) : (
                      topCustomers.map((c, idx) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #ffe4ec' }}>
                          <td style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FaUserCircle style={{ fontSize: 24, color: pastelPinkDark }} />
                            <span style={{ fontWeight: 600 }}>{c.email || '-'}</span>
                          </td>
                          <td style={{ padding: 8 }}>{(c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;