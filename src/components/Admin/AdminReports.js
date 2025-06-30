import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAuditTrail, AUDIT_ACTIONS } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import './AdminDashboard.css';
import './AdminReports.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const allServices = [
    { id: 'bath-blowdry', name: 'Bath & Blowdry', prices: { small: 300, medium: 400, large: 500 } },
    { id: 'haircut-trim', name: 'Basic Haircut & Trim', prices: { small: 300, medium: 400, large: 500 } },
    { id: 'paw-pad-care', name: 'Paw Pad Care', price: 100 },
    { id: 'teeth-cleaning', name: 'Teeth Cleaning', price: 100 },
    { id: 'nail-trimming', name: 'Nail Trimming', price: 100 },
    { id: 'ear-cleaning', name: 'Ear Cleaning', price: 100 }
];

const AdminReports = () => {
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [surveyMessages, setSurveyMessages] = useState([]);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [appointmentsSnap, paymentsSnap, petsSnap, usersSnap, servicesSnap, messagesSnap] = await Promise.all([
          getDocs(collection(db, 'appointments')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'pets')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'services')),
          getDocs(collection(db, 'messages')),
        ]);
        
        // Filter out admin accounts - only keep customer data
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
          .map(doc => ({ id: doc.id, ...doc.data() }))
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
        setPayments(customerPayments);
        setPets(customerPets);
        setUsers(customerUsers);
        setServices(servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSurveyMessages(
          messagesSnap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(msg => msg.rating && msg.rating >= 1)
        );
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMenuOpen && !event.target.closest('.hamburger-menu')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Reset menu state when changing reports
  useEffect(() => {
    setIsMenuOpen(false);
  }, [selectedReport]);

  // --- Booking Metrics ---
  const today = new Date();
  const getDateString = (date) => date.toISOString().slice(0, 10);
  const getWeekStart = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay()); // Gets Sunday of current week
    return getDateString(d);
  };
  const getWeekEnd = (date) => {
    const d = new Date(date);
    d.setDate(d.getDate() + (6 - d.getDay()));
    return getDateString(d);
  };
  const getMonthStart = (date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    return getDateString(d);
  };

  // Weekly data covers from Sunday of current week to today
  // Monthly data covers from 1st of current month to today

  // Get current week range for display
  const currentWeekStart = getWeekStart(today);
  const currentWeekEnd = getWeekEnd(today);
  const currentWeekRange = `${currentWeekStart} to ${currentWeekEnd}`;

  // Improved appointment counting with better date handling
  const totalAppointments = {
    daily: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate === getDateString(today);
    }).length,
    weekly: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate >= getWeekStart(today);
    }).length,
    monthly: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate >= getMonthStart(today);
    }).length,
  };

  // Cancelled appointment counting with better date handling
  const cancelledAppointments = {
    daily: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate === getDateString(today) && a.status === 'cancelled';
    }).length,
    weekly: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate >= getWeekStart(today) && a.status === 'cancelled';
    }).length,
    monthly: appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate >= getMonthStart(today) && a.status === 'cancelled';
    }).length,
    total: appointments.filter(a => a.status === 'cancelled').length,
  };

  const noShowAppointments = appointments.filter(a => a.status === 'no show').length;

  // Cancellation rate calculations
  const cancellationRate = {
    daily: totalAppointments.daily > 0 ? ((cancelledAppointments.daily / totalAppointments.daily) * 100).toFixed(1) : 0,
    weekly: totalAppointments.weekly > 0 ? ((cancelledAppointments.weekly / totalAppointments.weekly) * 100).toFixed(1) : 0,
    monthly: totalAppointments.monthly > 0 ? ((cancelledAppointments.monthly / totalAppointments.monthly) * 100).toFixed(1) : 0,
    overall: appointments.length > 0 ? ((cancelledAppointments.total / appointments.length) * 100).toFixed(1) : 0,
  };

  // Cancelled appointments by customer
  const cancelledByCustomer = users.map(u => {
    const firstName = u.firstName || '';
    const lastName = u.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    
    return {
      name: fullName,
      count: appointments.filter(a => a.userId === u.id && a.status === 'cancelled').length
    };
  }).filter(user => user.count > 0) // Only include users with cancelled appointments
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 customers with most cancellations

  // Improved service counting with better data handling
  const serviceCounts = (rangeStart) => {
    const counts = {};
    const filteredAppointments = rangeStart 
        ? appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
            return appointmentDate && appointmentDate >= rangeStart;
          })
        : appointments;

    filteredAppointments.forEach(a => {
      if (Array.isArray(a.services)) {
        a.services.forEach(serviceId => {
          if (serviceId) {
            counts[serviceId] = (counts[serviceId] || 0) + 1;
          }
        });
      }
    });
    return counts;
  };

  const weekStart = getWeekStart(today);
  const monthStart = getMonthStart(today);
  const mostPopularServicesWeek = Object.entries(serviceCounts(weekStart))
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);
  const mostPopularServicesMonth = Object.entries(serviceCounts(monthStart))
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);

  // Improved time slot counting
  const timeSlotCounts = (rangeStart) => {
    const counts = {};
    appointments.filter(a => {
      const appointmentDate = a.date || a.appointmentDate;
      return appointmentDate >= rangeStart;
    }).forEach(a => {
      if (a.time) counts[a.time] = (counts[a.time] || 0) + 1;
    });
    return counts;
  };
  const busiestTimeSlotsWeek = Object.entries(timeSlotCounts(weekStart)).map(([slot, count]) => ({ slot, count })).sort((a, b) => b.count - a.count).slice(0, 3);
  const busiestTimeSlotsMonth = Object.entries(timeSlotCounts(monthStart)).map(([slot, count]) => ({ slot, count })).sort((a, b) => b.count - a.count).slice(0, 3);

  // --- Pet & Client Trends ---
  const petTypeCounts = pets.reduce((acc, pet) => {
    if (pet.type && pet.type.trim() !== '') {
      acc[pet.type] = (acc[pet.type] || 0) + 1;
    }
    return acc;
  }, {});

  // Top customers based on completed appointments
  const userAppointmentCounts = users.map(u => {
    const firstName = u.firstName || '';
    const lastName = u.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown User';
    
    return {
      name: fullName,
      email: u.email || 'No email provided',
      count: appointments.filter(a => (a.userId === u.id || a.userId === u.uid) && a.status === 'done').length
    };
  }).filter(user => user.count > 0) // Only include users with completed appointments
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Top 5 customers

  // --- Service Performance ---
  const serviceUsage = Object.entries(serviceCounts(monthStart)).map(([service, count]) => ({ service, count }));

  // Improved service feedback calculation
  const serviceFeedback = Object.entries(
    surveyMessages.reduce((acc, msg) => {
      if (Array.isArray(msg.services)) {
        msg.services.forEach(serviceId => {
          if (!acc[serviceId]) acc[serviceId] = { total: 0, count: 0 };
          acc[serviceId].total += Number(msg.rating);
          acc[serviceId].count += 1;
        });
      }
      return acc;
    }, {})
  ).map(([serviceId, { total, count }]) => ({
    service: allServices.find(s => s.id === serviceId)?.name || serviceId,
    rating: (total / count).toFixed(2)
  }));

  // Calculate overall average rating from surveyMessages
  const overallFeedback = surveyMessages.length
    ? (surveyMessages.reduce((sum, msg) => sum + Number(msg.rating), 0) / surveyMessages.length).toFixed(2)
    : '0.00';

  // --- Improved Summaries with accurate data ---
  const topServiceId = mostPopularServicesMonth[0]?.service;
  const topService = allServices.find(s => s.id === topServiceId)?.name || 'No services booked yet';
  
  const summary = {
    totalAppointments: appointments.length,
    cancelledAppointments: cancelledAppointments.total,
    totalNoShow: noShowAppointments,
    cancellationRate: cancellationRate.overall,
    topService: topService,
    topClient: userAppointmentCounts[0]?.name || 'No customers yet',
    avgRating: appointments.filter(a => a.rating).length > 0 
      ? (appointments.filter(a => a.rating).reduce((sum, a) => sum + Number(a.rating), 0) /
         appointments.filter(a => a.rating).length).toFixed(2)
      : '0.00',
    totalServices: services.length,
    totalPets: pets.length,
    totalUsers: users.length
  };

  // --- Download and Print Functions ---
  const downloadReport = async (reportId) => {
    const reportData = generateReportData(reportId);
    const csvContent = convertToCSV(reportData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportId}_report_${getDateString(today)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Check if user is admin from context OR if email is pawpointt@gmail.com
    const isUserAdmin = isAdmin || user?.email === 'pawpointt@gmail.com';

    // Log audit trail
    await logAuditTrail({
      userId: user?.uid,
      userEmail: user?.email,
      action: AUDIT_ACTIONS.REPORT_DOWNLOAD,
      details: { reportType: reportId, reportName: reportData.title },
      userType: isUserAdmin ? 'admin' : 'customer',
      resourceType: 'report',
      resourceId: reportId
    });
  };

  const printReport = async (reportId) => {
    const reportData = generateReportData(reportId);
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintHTML(reportData, reportId);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    // Check if user is admin from context OR if email is pawpointt@gmail.com
    const isUserAdmin = isAdmin || user?.email === 'pawpointt@gmail.com';

    // Log audit trail
    await logAuditTrail({
      userId: user?.uid,
      userEmail: user?.email,
      action: AUDIT_ACTIONS.REPORT_PRINT,
      details: { reportType: reportId, reportName: reportData.title },
      userType: isUserAdmin ? 'admin' : 'customer',
      resourceType: 'report',
      resourceId: reportId
    });
  };

  const generateReportData = (reportId) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    switch (reportId) {
      case 'booking':
        return {
          title: 'Customer Booking Metrics Report',
          date: currentDate,
          time: currentTime,
          metrics: {
            'Today\'s Appointments': totalAppointments.daily,
            'This Week (Sun-Today)': totalAppointments.weekly,
            'This Month': totalAppointments.monthly,
            'Total Cancelled': cancelledAppointments.total,
            'Cancellation Rate': `${cancellationRate.overall}%`
          },
          cancelledData: {
            'Daily Cancelled': cancelledAppointments.daily,
            'Weekly Cancelled': cancelledAppointments.weekly,
            'Monthly Cancelled': cancelledAppointments.monthly
          },
          cancellationRates: {
            'Daily Rate': `${cancellationRate.daily}%`,
            'Weekly Rate': `${cancellationRate.weekly}%`,
            'Monthly Rate': `${cancellationRate.monthly}%`,
            'Overall Rate': `${cancellationRate.overall}%`
          },
          topCustomers: cancelledByCustomer.map(c => ({ name: c.name, cancellations: c.count }))
        };
      
      case 'pet':
        return {
          title: 'Customer Pet & Client Trends Report',
          date: currentDate,
          time: currentTime,
          petTypes: Object.entries(petTypeCounts).map(([type, count]) => ({ type, count })),
          topCustomers: userAppointmentCounts.map(c => ({ name: c.name, email: c.email, visits: c.count }))
        };
      
      case 'service':
        return {
          title: 'Customer Service Performance Report',
          date: currentDate,
          time: currentTime,
          serviceUsage: serviceUsage.map(s => ({ service: allServices.find(as => as.id === s.service)?.name || s.service, bookings: s.count })),
          serviceRatings: serviceFeedback.map(s => ({ service: s.service, rating: s.rating }))
        };
      
      case 'summary':
        return {
          title: 'Customer Summary Report',
          date: currentDate,
          time: currentTime,
          summary: {
            'Total Appointments': summary.totalAppointments,
            'Total Cancelled': summary.cancelledAppointments,
            'Total No Show': summary.totalNoShow,
            'Cancellation Rate': `${summary.cancellationRate}%`,
            'Top Service': summary.topService,
            'Top Client': summary.topClient,
            'Average Rating': summary.avgRating,
            'Total Services': summary.totalServices,
            'Total Pets': summary.totalPets,
            'Total Users': summary.totalUsers
          }
        };
      
      default:
        return { title: 'Report', date: currentDate, time: currentTime };
    }
  };

  const convertToCSV = (data) => {
    let csv = `Report: ${data.title}\n`;
    csv += `Generated: ${data.date} at ${data.time}\n\n`;
    
    if (data.metrics) {
      csv += 'Metrics:\n';
      Object.entries(data.metrics).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += '\n';
    }
    
    if (data.cancelledData) {
      csv += 'Cancelled Appointments:\n';
      Object.entries(data.cancelledData).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += '\n';
    }
    
    if (data.cancellationRates) {
      csv += 'Cancellation Rates:\n';
      Object.entries(data.cancellationRates).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
      csv += '\n';
    }
    
    if (data.topCustomers) {
      csv += 'Top Customers:\n';
      data.topCustomers.forEach(customer => {
        csv += `${customer.name},${customer.email || ''},${customer.cancellations || customer.visits}\n`;
      });
      csv += '\n';
    }
    
    if (data.petTypes) {
      csv += 'Pet Types:\n';
      data.petTypes.forEach(pet => {
        csv += `${pet.type},${pet.count}\n`;
      });
      csv += '\n';
    }
    
    if (data.serviceUsage) {
      csv += 'Service Usage:\n';
      data.serviceUsage.forEach(service => {
        csv += `${service.service},${service.bookings}\n`;
      });
      csv += '\n';
    }
    
    if (data.serviceRatings) {
      csv += 'Service Ratings:\n';
      data.serviceRatings.forEach(service => {
        csv += `${service.service},${service.rating}\n`;
      });
      csv += '\n';
    }
    
    if (data.summary) {
      csv += 'Summary:\n';
      Object.entries(data.summary).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
    }
    
    return csv;
  };

  const generatePrintHTML = (data, reportId) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff8fab; padding-bottom: 10px; }
          .header h1 { color: #ff8fab; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .section { margin: 20px 0; }
          .section h2 { color: #ff8fab; border-bottom: 1px solid #ffd6e6; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #fff8fc; color: #ff8fab; font-weight: bold; }
          .metric { display: inline-block; margin: 10px; padding: 10px; background: #fff8fc; border: 1px solid #ffd6e6; border-radius: 5px; min-width: 150px; }
          .metric-label { font-weight: bold; color: #ff8fab; }
          .metric-value { font-size: 1.2em; color: #333; }
          @media print { body { margin: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p>Generated on ${data.date} at ${data.time}</p>
          <p>PawPoint Pet Care - Admin Reports</p>
        </div>
        
        ${generatePrintContent(data, reportId)}
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">Print Report</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;
  };

  const generatePrintContent = (data, reportId) => {
    let content = '';
    
    if (data.metrics) {
      content += '<div class="section"><h2>Key Metrics</h2>';
      Object.entries(data.metrics).forEach(([key, value]) => {
        content += `<div class="metric"><div class="metric-label">${key}</div><div class="metric-value">${value}</div></div>`;
      });
      content += '</div>';
    }
    
    if (data.cancelledData) {
      content += '<div class="section"><h2>Cancelled Appointments</h2>';
      Object.entries(data.cancelledData).forEach(([key, value]) => {
        content += `<div class="metric"><div class="metric-label">${key}</div><div class="metric-value">${value}</div></div>`;
      });
      content += '</div>';
    }
    
    if (data.cancellationRates) {
      content += '<div class="section"><h2>Cancellation Rates</h2>';
      Object.entries(data.cancellationRates).forEach(([key, value]) => {
        content += `<div class="metric"><div class="metric-label">${key}</div><div class="metric-value">${value}</div></div>`;
      });
      content += '</div>';
    }
    
    if (data.topCustomers && data.topCustomers.length > 0) {
      const isBookingReport = reportId === 'booking';
      content += `<div class="section"><h2>Top Customers</h2><table><tr><th>Customer Name</th><th>Email</th><th>${isBookingReport ? 'Cancellations' : 'Completed Appointments'}</th></tr>`;
      data.topCustomers.forEach(customer => {
        content += `<tr><td>${customer.name}</td><td>${customer.email || ''}</td><td>${customer.cancellations || customer.visits}</td></tr>`;
      });
      content += '</table></div>';
    }
    
    if (data.petTypes && data.petTypes.length > 0) {
      content += '<div class="section"><h2>Pet Types Distribution</h2><table><tr><th>Pet Type</th><th>Count</th></tr>';
      data.petTypes.forEach(pet => {
        content += `<tr><td>${pet.type}</td><td>${pet.count}</td></tr>`;
      });
      content += '</table></div>';
    }
    
    if (data.serviceUsage && data.serviceUsage.length > 0) {
      content += '<div class="section"><h2>Service Usage</h2><table><tr><th>Service</th><th>Bookings</th></tr>';
      data.serviceUsage.forEach(service => {
        content += `<tr><td>${service.service}</td><td>${service.bookings}</td></tr>`;
      });
      content += '</table></div>';
    }
    
    if (data.serviceRatings && data.serviceRatings.length > 0) {
      content += '<div class="section"><h2>Service Ratings</h2><table><tr><th>Service</th><th>Average Rating</th></tr>';
      data.serviceRatings.forEach(service => {
        content += `<tr><td>${service.service}</td><td>${service.rating} ⭐</td></tr>`;
      });
      content += '</table></div>';
    }
    
    if (data.summary) {
      content += '<div class="section"><h2>Summary</h2>';
      Object.entries(data.summary).forEach(([key, value]) => {
        content += `<div class="metric"><div class="metric-label">${key}</div><div class="metric-value">${value}</div></div>`;
      });
      content += '</div>';
    }
    
    return content;
  };

  // Report cards data
  const reportCards = [
    {
      id: 'booking',
      title: 'Customer Booking Metrics',
      icon: '📊',
      description: 'View appointment trends, cancelled appointments, and cancellation analysis',
      color: '#ff8fab',
      data: {
        totalAppointments,
        cancelledAppointments,
        cancellationRate,
        cancelledByCustomer,
        busiestTimeSlotsWeek,
        busiestTimeSlotsMonth
      }
    },
    {
      id: 'pet',
      title: 'Customer Pet & Client Trends',
      icon: '🐾',
      description: 'Analyze pet types, client behavior, and customer loyalty',
      color: '#ffb6d5',
      data: {
        petTypeCounts,
        userAppointmentCounts
      }
    },
    {
      id: 'service',
      title: 'Service Performance',
      icon: '⭐',
      description: 'Monitor service usage, ratings, and customer satisfaction',
      color: '#ff7096',
      data: {
        serviceUsage,
        serviceFeedback
      }
    },
    {
      id: 'summary',
      title: 'Customer Summary',
      icon: '📈',
      description: 'Comprehensive business overview and key performance indicators',
      color: '#ff5eab',
      data: summary
    }
  ];

  // Render report content based on selection
  const renderReportContent = (reportId) => {
    switch (reportId) {
      case 'booking':
        return (
          <div className="report-content">
            <div className="report-header">
              <button onClick={() => setSelectedReport(null)} className="back-button">
                ← Back to Reports
              </button>
              <h2>Customer Booking Metrics</h2>
              <div className="hamburger-menu">
                <button 
                  className="hamburger-button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle menu"
                >
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </button>
                {isMenuOpen && (
                  <div className="menu-dropdown">
                <button 
                      onClick={async () => {
                        await downloadReport('booking');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      📥 Download Report
                    </button>
                    <button 
                      onClick={async () => {
                        await printReport('booking');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                >
                      🖨️ Print Report
                </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ 
              background: '#fff8fc', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '16px', 
              border: '1px solid #ffd6e6',
              fontSize: '0.9rem',
              color: '#666',
              fontFamily: 'Quicksand, sans-serif'
            }}>
              <strong>Date Coverage:</strong> Daily (Today) | Weekly (Sunday-Today) | Monthly (1st-Today)
            </div>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>Today's Appointments</h3>
                <div className="metric-value">{totalAppointments.daily}</div>
              </div>
              <div className="metric-card">
                <h3>This Week</h3>
                <div className="metric-value">{totalAppointments.weekly}</div>
              </div>
              <div className="metric-card">
                <h3>This Month</h3>
                <div className="metric-value">{totalAppointments.monthly}</div>
              </div>
              <div className="metric-card">
                <h3>Total Cancelled</h3>
                <div className="metric-value">{cancelledAppointments.total}</div>
              </div>
              <div className="metric-card">
                <h3>Cancellation Rate</h3>
                <div className="metric-value">{cancellationRate.overall}%</div>
              </div>
            </div>
            <div className="chart-section">
              <h3>Appointment Trends</h3>
              <Bar data={{
                labels: ['Today', 'This Week (Sun-Today)', 'This Month'],
                datasets: [{
                  label: 'Appointments',
                  data: [totalAppointments.daily, totalAppointments.weekly, totalAppointments.monthly],
                  backgroundColor: ['#ffb6d5', '#ff8fab', '#ffe4ec'],
                  borderColor: ['#ff8fab', '#ff5eab', '#ffb6d5'],
                  borderWidth: 2
                }]
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                  }
                }
              }} />
            </div>
            <div className="chart-section">
              <h3>Cancelled Appointments (This Month)</h3>
              {cancelledAppointments.monthly > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <h4 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', fontSize: '1rem', marginBottom: '12px', textAlign: 'center' }}>Cancellation Overview</h4>
                    <Bar data={{
                      labels: ['Today', 'This Week (Sun-Today)', 'This Month'],
                      datasets: [{
                        label: 'Cancelled Appointments',
                        data: [cancelledAppointments.daily, cancelledAppointments.weekly, cancelledAppointments.monthly],
                        backgroundColor: ['#ff6b6b', '#ff8fab', '#ffb6d5'],
                        borderColor: ['#ff5252', '#ff5eab', '#ff8fab'],
                        borderWidth: 2
                      }]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { stepSize: 1 }
                        }
                      }
                    }} />
                  </div>
                  <div>
                    <h4 style={{ color: '#ff8fab', fontFamily: 'Fredoka One, cursive', fontSize: '1rem', marginBottom: '12px', textAlign: 'center' }}>Cancellation Rate</h4>
                    <Bar data={{
                      labels: ['Today', 'This Week (Sun-Today)', 'This Month', 'Overall'],
                      datasets: [{
                        label: 'Cancellation Rate (%)',
                        data: [parseFloat(cancellationRate.daily), parseFloat(cancellationRate.weekly), parseFloat(cancellationRate.monthly), parseFloat(cancellationRate.overall)],
                        backgroundColor: ['#ff6b6b', '#ff8fab', '#ffb6d5', '#ffe4ec'],
                        borderColor: ['#ff5252', '#ff5eab', '#ff8fab', '#ffb6d5'],
                        borderWidth: 2
                      }]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: { stepSize: 10 }
                        }
                      }
                    }} />
                  </div>
                </div>
              ) : (
                <div className="no-data">No cancelled appointments this month</div>
              )}
            </div>
            {cancelledByCustomer.length > 0 && (
              <div className="chart-section">
                <h3>Top Customers with Cancellations</h3>
                <Bar data={{
                  labels: cancelledByCustomer.map(c => c.name),
                  datasets: [{
                    label: 'Cancelled Appointments',
                    data: cancelledByCustomer.map(c => c.count),
                    backgroundColor: '#ff6b6b',
                    borderColor: '#ff5252',
                    borderWidth: 2
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 }
                    }
                  }
                }} />
              </div>
            )}
          </div>
        );

      case 'pet':
        return (
          <div className="report-content">
            <div className="report-header">
              <button onClick={() => setSelectedReport(null)} className="back-button">
                ← Back to Reports
              </button>
              <h2>Customer Pet & Client Trends</h2>
              <div className="hamburger-menu">
                <button 
                  className="hamburger-button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle menu"
                >
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </button>
                {isMenuOpen && (
                  <div className="menu-dropdown">
                <button 
                      onClick={async () => {
                        await downloadReport('pet');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      📥 Download Report
                    </button>
                    <button 
                      onClick={async () => {
                        await printReport('pet');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                >
                      🖨️ Print Report
                </button>
                  </div>
                )}
              </div>
            </div>
            <div className="chart-section">
              <h3>Pet Types Distribution</h3>
              {Object.keys(petTypeCounts).length > 0 ? (
                <Pie data={{
                  labels: Object.keys(petTypeCounts),
                  datasets: [{
                    data: Object.values(petTypeCounts),
                    backgroundColor: ['#ffb6d5', '#ff8fab', '#ffe4ec', '#ffd6e6', '#ffc0cb'],
                    borderColor: '#fff',
                    borderWidth: 2
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false
                }} />
              ) : (
                <div className="no-data">No pet data available</div>
              )}
            </div>
            <div className="chart-section">
              <h3>Top Customers (by Completed Appointments)</h3>
              {userAppointmentCounts.length > 0 ? (
                <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Customer Name</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Completed Appointments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAppointmentCounts.map(customer => (
                      <tr key={customer.email}>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.name}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{customer.email}</td>
                        <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{customer.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">No customer data available for completed appointments.</div>
              )}
            </div>
          </div>
        );

      case 'service':
        return (
          <div className="report-content">
            <div className="report-header">
              <button onClick={() => setSelectedReport(null)} className="back-button">
                ← Back to Reports
              </button>
              <h2>Service Performance</h2>
              <div className="hamburger-menu">
                <button 
                  className="hamburger-button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle menu"
                >
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </button>
                {isMenuOpen && (
                  <div className="menu-dropdown">
                <button 
                      onClick={async () => {
                        await downloadReport('service');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      📥 Download Report
                    </button>
                    <button 
                      onClick={async () => {
                        await printReport('service');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                >
                      🖨️ Print Report
                </button>
                  </div>
                )}
              </div>
            </div>
            {/* Overall Average Rating */}
            <div className="chart-section">
              <h3>Overall Average Rating</h3>
              <div style={{
                fontSize: '2.2rem',
                fontWeight: 700,
                color: '#ff8fab',
                marginBottom: 12,
                fontFamily: 'Fredoka One, cursive'
              }}>
                {overallFeedback} <span style={{ fontSize: '1.5rem' }}>⭐</span>
              </div>
            </div>
            {/* Per-service ratings */}
            <div className="chart-section">
              <h3>Service Ratings</h3>
              {serviceFeedback.length > 0 ? (
                <Bar data={{
                  labels: serviceFeedback.map(s => s.service),
                  datasets: [{
                    label: 'Average Rating',
                    data: serviceFeedback.map(s => s.rating),
                    backgroundColor: '#ff8fab',
                    borderColor: '#ff5eab',
                    borderWidth: 2
                  }]
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 5,
                      ticks: { stepSize: 0.5 }
                    }
                  }
                }} />
              ) : (
                <div className="no-data">No rating data available</div>
              )}
            </div>
            {/* All feedback comments */}
            <div className="chart-section">
              <h3>All Service Feedback</h3>
              {surveyMessages.length > 0 ? (
                <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd' }}>Date</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd' }}>User</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd' }}>Services</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd' }}>Rating</th>
                      <th style={{ background: '#fff8fc', color: '#ff8fab', padding: '8px', border: '1px solid #ddd' }}>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveyMessages
                      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                      .map(msg => (
                        <tr key={msg.id}>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {msg.timestamp?.seconds
                              ? new Date(msg.timestamp.seconds * 1000).toLocaleString()
                              : 'N/A'}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {msg.userEmail || msg.userId || 'Unknown'}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {Array.isArray(msg.services)
                              ? msg.services.map(sid => allServices.find(s => s.id === sid)?.name || sid).join(', ')
                              : ''}
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>
                            {msg.rating} ⭐
                          </td>
                          <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                            {msg.message || <span style={{ color: '#aaa' }}>(No comment)</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">No feedback submitted yet.</div>
              )}
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="report-content">
            <div className="report-header">
              <button onClick={() => setSelectedReport(null)} className="back-button">
                ← Back to Reports
              </button>
              <h2>Customer Summary</h2>
              <div className="hamburger-menu">
                <button 
                  className="hamburger-button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Toggle menu"
                >
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                  <span className="hamburger-line"></span>
                </button>
                {isMenuOpen && (
                  <div className="menu-dropdown">
                <button 
                      onClick={async () => {
                        await downloadReport('summary');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                    >
                      📥 Download Report
                    </button>
                    <button 
                      onClick={async () => {
                        await printReport('summary');
                        setIsMenuOpen(false);
                      }}
                      className="menu-item"
                >
                      🖨️ Print Report
                </button>
                  </div>
                )}
              </div>
            </div>
            <div className="summary-grid">
              <div className="summary-card">
                <h3>Total Appointments</h3>
                <div className="summary-value">{summary.totalAppointments}</div>
              </div>
              <div className="summary-card">
                <h3>Total Cancelled</h3>
                <div className="summary-value">{summary.cancelledAppointments}</div>
              </div>
              <div className="summary-card">
                <h3>Total No Show</h3>
                <div className="summary-value">{summary.totalNoShow}</div>
              </div>
              <div className="summary-card">
                <h3>Cancellation Rate</h3>
                <div className="summary-value">{summary.cancellationRate}%</div>
              </div>
              <div className="summary-card">
                <h3>Top Service</h3>
                <div className="summary-value">{summary.topService || 'No services yet'}</div>
              </div>
              <div className="summary-card">
                <h3>Top Client</h3>
                <div className="summary-value">{summary.topClient || 'No clients yet'}</div>
              </div>
              <div className="summary-card">
                <h3>Average Rating</h3>
                <div className="summary-value">{summary.avgRating} ⭐</div>
              </div>
              <div className="summary-card">
                <h3>Total Services</h3>
                <div className="summary-value">{summary.totalServices}</div>
              </div>
              <div className="summary-card">
                <h3>Total Pets</h3>
                <div className="summary-value">{summary.totalPets}</div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <main className="admin-main">
        <div className="loading-msg">Loading reports...</div>
      </main>
    );
  }

  return (
    <main className="admin-main">
      <h1 className="admin-title">Reports & Analytics</h1>
      
      {selectedReport ? (
        renderReportContent(selectedReport)
      ) : (
        <div className="reports-grid">
          {reportCards.map((card) => (
            <div
              key={card.id}
              className="report-card"
              onClick={() => setSelectedReport(card.id)}
              style={{ borderColor: card.color }}
            >
              <div className="card-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="card-arrow">→</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
};

export default AdminReports; 