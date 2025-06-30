import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import Service from './components/Service/Service';
import Gallery from './components/Gallery/Gallery';
import About from './components/About/About';
import FAQ from './components/FAQ/FAQ';
import Dashboard from './components/Dashboard/Dashboard';
import Pets from './components/Pets/Pets';
import Appointments from './components/Appointments/Appointments';
import History from './components/History/History';
import Records from './components/Records/Records';
import Footer from './components/Footer/Footer';
import Login from './components/Login/Login';
import Logout from './components/Logout/Logout';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import AppointmentForm from './components/Appointments/AppointmentForm';
import ScrollToTop from './components/ScrollToTop';
import Search from './components/Search/Search';
import Settings from './components/Settings/Settings';
import AdminDashboard from './components/Admin/AdminDashboard';
import AdminAppointments from './components/Admin/AdminAppointments';
import AdminCustomers from './components/Admin/AdminCustomers';
import AdminPets from './components/Admin/AdminPets';
import AdminReports from './components/Admin/AdminReports';
import ContactAdmin from './components/ContactAdmin';
import AdminMessages from './components/Admin/AdminMessages';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import AdminSidebar from './components/Admin/AdminSidebar';
import AdminAudit from './components/Admin/AdminAudit';

// PrivateRoute component for protected routes
const PrivateRoute = ({ roles, children }) => {
  const { user, isAdmin } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles?.includes('admin') && !isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// Layout component to handle conditional rendering of Navbar and Footer
const Layout = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/logout';

  // Don't render Navbar and Footer during loading or on auth pages
  if (loading || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </>
  );
};

// AppRoutes component to handle routing logic
const AppRoutes = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // Handle immediate navigation for logged out state
  if (!user && location.pathname !== '/') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user
            ? isAdmin
              ? <Navigate to="/admin" replace />
              : <Navigate to="/dashboard" replace />
            : (
              <div className="home-content">
                <Hero />
                <Service />
                <Gallery />
                <About />
                <FAQ />
              </div>
            )
        }
      />
      <Route path="/service" element={<Service />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/about" element={<About />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      
      {/* Protected User Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            {isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />}
          </PrivateRoute>
        }
      />
      <Route path="/pets/*" element={<PrivateRoute><Pets /></PrivateRoute>} />
      <Route path="/appointments" element={<PrivateRoute><Appointments /></PrivateRoute>} />
      <Route path="/appointments/edit/:id" element={<PrivateRoute><AppointmentForm /></PrivateRoute>} />
      <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
      <Route path="/records" element={<PrivateRoute><Records /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/search" element={<Search />} />
      <Route path="/contact" element={<PrivateRoute><ContactAdmin /></PrivateRoute>} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/appointments"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminAppointments />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminCustomers />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/pets"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminPets />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <PrivateRoute roles={['admin']}>
            <div className="admin-dashboard-layout pastel-theme">
              <AdminSidebar active="Reports" setActive={() => {}} />
              <main className="admin-main">
                <AdminReports />
              </main>
            </div>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/messages"
        element={
          <PrivateRoute roles={['admin']}>
            <div className="admin-dashboard-layout pastel-theme">
              <AdminSidebar active="Messages" setActive={() => {}} />
              <main className="admin-main">
                <AdminMessages />
              </main>
            </div>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminAudit />
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

function AppContent() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App">
        <Layout>
          <AppRoutes />
        </Layout>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;