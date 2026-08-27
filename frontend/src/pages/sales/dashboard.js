import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FaChartLine, 
  FaBox, 
  FaMoneyBillAlt, 
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaCreditCard,
  FaFileInvoice,
  FaInfoCircle,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './dashboard.css';
import logo from '../../images/logo.png';
import { getPayments, getCustomers } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount, markAllOperationsAsViewed } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';
import Swal from 'sweetalert2';

function SalesDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Get user data from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }

    // Load payments for recent activities
    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) {
          setPayments(response.payments);
          
          // Transform payments to recent activities
          const activities = response.payments
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map((payment) => {
              const paymentDate = new Date(payment.created_at);
              const now = new Date();
              const diffMs = now - paymentDate;
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMs / 3600000);
              const diffDays = Math.floor(diffMs / 86400000);

              let timeAgo = '';
              if (diffMins < 1) {
                timeAgo = t.justNow;
              } else if (diffMins < 60) {
                // Handle both English format "{count} mins ago" and Swahili format "Dakika {count} zilizopita"
                if (t.minutesAgo.includes('Dakika')) {
                  timeAgo = t.minutesAgo.replace('{count}', diffMins);
                } else {
                  const minText = diffMins === 1 ? t.min : t.mins;
                  timeAgo = t.minutesAgo.replace('{count}', diffMins).replace('mins', minText);
                }
              } else if (diffHours < 24) {
                // Handle both English format "{count} hours ago" and Swahili format "Masaa {count} yaliyopita"
                if (t.hoursAgo.includes('Masaa')) {
                  timeAgo = t.hoursAgo.replace('{count}', diffHours);
                } else {
                  const hourText = diffHours === 1 ? t.hour : t.hours;
                  timeAgo = t.hoursAgo.replace('{count}', diffHours).replace('hours', hourText);
                }
              } else {
                // Handle both English format "{count} days ago" and Swahili format "Siku {count} zilizopita"
                if (t.daysAgo.includes('Siku')) {
                  timeAgo = t.daysAgo.replace('{count}', diffDays);
                } else {
                  const dayText = diffDays === 1 ? t.day : t.days;
                  timeAgo = t.daysAgo.replace('{count}', diffDays).replace('days', dayText);
                }
              }

              const formatCurrency = (amount) => {
                return new Intl.NumberFormat('en-TZ', {
                  style: 'currency',
                  currency: 'TZS',
                  minimumFractionDigits: 0
                }).format(amount || 0);
              };

              const capitalizeName = (name) => {
                if (!name) return '';
                return name
                  .toLowerCase()
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              };

              const customerName = capitalizeName(payment.customer_name || t.unknownCustomer);
              const amount = formatCurrency(payment.total_amount);
              const status = payment.status || t.pending;
              const translatedStatus = status === 'Approved' ? t.approved : status === 'Rejected' ? t.rejected : t.pending;

              return {
                id: payment.id,
                type: 'Sale',
                description: t.saleDescription
                  .replace('{id}', payment.id)
                  .replace('{customer}', customerName)
                  .replace('{status}', translatedStatus),
                time: timeAgo,
                amount: amount
              };
            });

          setRecentActivities(activities);
        }
      } catch (error) {
        console.error('Error loading payments for activities:', error);
      }
    };

    // Load customers
    const loadCustomers = async () => {
      try {
        const response = await getCustomers();
        if (response.success && response.customers) {
          setCustomers(response.customers);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
      }
    };

    loadPayments();
    loadCustomers();

    // Initialize and update current date/time every second
    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  // Show loading while checking authentication
  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  // If no user after loading, show message
  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        backgroundColor: '#f5f7fa',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <p>No user session found. Redirecting to login...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: t.logout || 'Logout',
      text: t.areYouSureLogout || 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.yesLogout || 'Yes, logout',
      cancelButtonText: t.cancel || 'Cancel'
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Function to capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? '+100%' : '0%';
    }
    const change = ((current - previous) / previous) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  };

  // Get today's and yesterday's dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Calculate today's completed sales (Approved status)
  const todaySales = payments
    .filter((p) => {
      if (p.status !== 'Approved') return false;
      const pDate = new Date(p.created_at);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === today.getTime();
    })
    .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Calculate yesterday's completed sales
  const yesterdaySales = payments
    .filter((p) => {
      if (p.status !== 'Approved') return false;
      const pDate = new Date(p.created_at);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === yesterday.getTime();
    })
    .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Calculate total orders (all orders)
  const totalOrders = payments.length;

  // Calculate today's total orders (all statuses)
  const todayOrders = payments.filter((p) => {
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;

  // Calculate yesterday's total orders
  const yesterdayOrders = payments.filter((p) => {
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === yesterday.getTime();
  }).length;

  // Calculate pending payments (today)
  const todayPending = payments
    .filter((p) => {
      if (p.status !== 'Pending') return false;
      const pDate = new Date(p.created_at);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === today.getTime();
    })
    .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Calculate yesterday's pending payments
  const yesterdayPending = payments
    .filter((p) => {
      if (p.status !== 'Pending') return false;
      const pDate = new Date(p.created_at);
      pDate.setHours(0, 0, 0, 0);
      return pDate.getTime() === yesterday.getTime();
    })
    .reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Calculate total customers
  const totalCustomers = customers.length;

  // Calculate today's new customers
  const todayNewCustomers = customers.filter((c) => {
    if (!c.created_at && !c.registeredDate && !c.registered_date) return false;
    const customerDate = new Date(c.created_at || c.registeredDate || c.registered_date);
    customerDate.setHours(0, 0, 0, 0);
    return customerDate.getTime() === today.getTime();
  }).length;

  // Calculate yesterday's new customers
  const yesterdayNewCustomers = customers.filter((c) => {
    if (!c.created_at && !c.registeredDate && !c.registered_date) return false;
    const customerDate = new Date(c.created_at || c.registeredDate || c.registered_date);
    customerDate.setHours(0, 0, 0, 0);
    return customerDate.getTime() === yesterday.getTime();
  }).length;

  // Sales Dashboard statistics
  const stats = [
    {
      title: t.todaySales,
      value: formatCurrency(todaySales),
      change: calculatePercentageChange(todaySales, yesterdaySales),
      icon: <FaMoneyBillAlt />,
      color: 'success'
    },
    {
      title: t.totalOrders,
      value: totalOrders.toString(),
      change: calculatePercentageChange(todayOrders, yesterdayOrders),
      icon: <FaShoppingCart />,
      color: 'primary'
    },
    {
      title: t.customers,
      value: totalCustomers.toString(),
      change: calculatePercentageChange(todayNewCustomers, yesterdayNewCustomers),
      icon: <FaUsers />,
      color: 'info'
    },
    {
      title: t.pendingPayments,
      value: formatCurrency(todayPending),
      change: calculatePercentageChange(todayPending, yesterdayPending),
      icon: <FaCreditCard />,
      color: 'warning'
    }
  ];


  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/sales/dashboard" className="nav-item active">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/sales/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/sales/customer_info" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/sales/generate_sales" className="nav-item">
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/sales/payments" className="nav-item">
            <FaCreditCard className="nav-icon" />
            <span>{t.payments}</span>
          </Link>
          <Link to="/sales/sales_reports" className="nav-item">
            <FaInfoCircle className="nav-icon" />
            <span>{t.salesReports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.salesDashboard}</h1>
          </div>
          
          <div className="header-right">
            <div className="date-time-display" style={{ 
              marginRight: '20px', 
              fontSize: '14px', 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div style={{ marginRight: '15px' }}>
              <LanguageSelector />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Sales Employee')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout || 'Logout'}
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Statistics Cards */}
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className={`stat-card stat-${stat.color}`}>
                <div className="stat-info">
                  <h3 className="stat-title">{stat.title}</h3>
                  <p className="stat-value">{stat.value}</p>
                  <span className={`stat-change ${stat.change.startsWith('+') ? 'positive' : 'negative'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Charts and Activities Row */}
          <div className="dashboard-row">
            {/* Recent Activities */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2>{t.recentActivities}</h2>
              </div>
              <div className="card-body">
                <ul className="activity-list">
                  {recentActivities.map(activity => (
                    <li key={activity.id} className="activity-item">
                      <div className="activity-icon">
                        {activity.type === 'Sale' && <FaShoppingCart />}
                        {activity.type === 'Customer' && <FaUsers />}
                        {activity.type === 'Payment' && <FaCreditCard />}
                      </div>
                      <div className="activity-content">
                        <p className="activity-description">{activity.description}</p>
                        <span className="activity-time">{activity.time}</span>
                      </div>
                      {activity.amount && (
                        <div className="activity-amount">{activity.amount}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2>{t.quickActions}</h2>
              </div>
              <div className="card-body">
                <div className="quick-actions">
                  <button className="action-btn primary" onClick={() => navigate('/sales/customer_info')}>
                    <FaUsers /> {t.newCustomer}
                  </button>
                  <button className="action-btn secondary" onClick={() => navigate('/sales/spareparts')}>
                    <FaBox /> {t.viewParts}
                  </button>
                  <button className="action-btn info" onClick={() => navigate('/sales/payments')}>
                    <FaCreditCard /> {t.payments}
                  </button>
                  <button className="action-btn warning">
                    <FaFileInvoice /> {t.generateInvoice}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <h3>{t.thisWeekSales}</h3>
              <p className="summary-value">TZS 2,450,000</p>
              <span className="summary-label">32 {t.ordersCompleted}</span>
            </div>
            <div className="summary-card">
              <h3>{t.pendingOrders}</h3>
              <p className="summary-value">5</p>
              <span className="summary-label">{t.awaitingProcessing}</span>
            </div>
            <div className="summary-card">
              <h3>{t.activeCustomers}</h3>
              <p className="summary-value">156</p>
              <span className="summary-label">{t.registeredCustomers}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;
