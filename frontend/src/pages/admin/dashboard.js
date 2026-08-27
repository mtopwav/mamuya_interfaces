import React, { useState, useEffect, useMemo } from 'react';
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
  FaChartBar,
  FaCog,
  FaUser,
  FaEnvelope,
  FaTags,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './dashboard.css';
import logo from '../../images/logo.png';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { getPayments, getSpareParts, getCustomers } from '../../services/api';
import Swal from 'sweetalert2';

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [payments, setPayments] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [yesterdaySales, setYesterdaySales] = useState(0);
  const [lastWeekParts, setLastWeekParts] = useState(0);
  const [lastWeekOrders, setLastWeekOrders] = useState(0);
  const [lastWeekCustomers, setLastWeekCustomers] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [todayPendingOrdersCount, setTodayPendingOrdersCount] = useState(0);
  const [sparePartsList, setSparePartsList] = useState([]);

  useEffect(() => {
    // Get user data from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
        
        // Redirect Sales department employees to sales page
        if (parsedUser.userType === 'employee' && parsedUser.department === 'Sales') {
          console.log('Redirecting Sales employee to sales page...');
          navigate('/sales/dashboard');
          return;
        }
        
        // Redirect Finance department employees to finance page
        if (parsedUser.userType === 'employee' && parsedUser.department === 'Finance') {
          console.log('Redirecting Finance employee to finance page...');
          navigate('/finance/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        // Don't redirect immediately, show error instead
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      // Don't redirect immediately, show message instead
      setTimeout(() => navigate('/login'), 1000);
    }

    // Initialize date/time display
    setCurrentDateTime(getCurrentDateTime());
    
    // Update current date/time every second
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Listen for date format changes
    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    // Fetch payments to calculate today's sales
    const fetchPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) {
          setPayments(response.payments);
          
          // Count total orders (all payments)
          setTotalOrders(response.payments.length);
          
          // Get today's and yesterday's dates for filtering
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          // Get last week's date (7 days ago)
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          
          // Calculate today's sales from approved transactions only
          const todayApprovedPayments = response.payments.filter(p => {
            if (!p.status || p.status.trim() !== 'Approved') {
              return false;
            }
            if (!p.created_at) return false;
            const paymentDate = new Date(p.created_at);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === today.getTime();
          });
          
          const salesTotal = todayApprovedPayments.reduce(
            (sum, p) => {
              // Use amount_received when available; fallback to total_amount
              const amount = parseFloat(p.amount_received ?? p.total_amount) || 0;
              return sum + amount;
            },
            0
          );
          setTotalSales(salesTotal);
          setTodaySalesCount(todayApprovedPayments.length);
          
          // Count today's pending orders
          const todayPendingPayments = response.payments.filter(p => {
            // Check if status is Pending or empty/null (not Approved or Rejected)
            const status = p.status ? p.status.trim() : '';
            if (status === 'Approved' || status === 'Rejected') {
              return false;
            }
            // Check if created today
            if (!p.created_at) return false;
            const paymentDate = new Date(p.created_at);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === today.getTime();
          });
          setTodayPendingOrdersCount(todayPendingPayments.length);
          
          // Calculate yesterday's sales for comparison
          const yesterdayApprovedPayments = response.payments.filter(p => {
            if (!p.status || p.status.trim() !== 'Approved') {
              return false;
            }
            if (!p.created_at) return false;
            const paymentDate = new Date(p.created_at);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === yesterday.getTime();
          });
          
          const yesterdaySalesTotal = yesterdayApprovedPayments.reduce(
            (sum, p) => {
              // Use amount_received when available; fallback to total_amount
              const amount = parseFloat(p.amount_received ?? p.total_amount) || 0;
              return sum + amount;
            },
            0
          );
          setYesterdaySales(yesterdaySalesTotal);
          
          // Count last week's orders
          const lastWeekPayments = response.payments.filter(p => {
            if (!p.created_at) return false;
            const paymentDate = new Date(p.created_at);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() >= lastWeek.getTime() && paymentDate.getTime() < today.getTime();
          });
          setLastWeekOrders(lastWeekPayments.length);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
        setTotalSales(0);
        setTotalOrders(0);
        setYesterdaySales(0);
        setLastWeekOrders(0);
        setTodaySalesCount(0);
        setTodayPendingOrdersCount(0);
      }
    };
    fetchPayments();

    // Fetch spare parts to count total parts and total wholesale/retail values
    const fetchSpareParts = async () => {
      try {
        const response = await getSpareParts();
        if (response.success && response.spareParts) {
          const spareParts = response.spareParts;

          // Count total spare parts
          setTotalParts(spareParts.length);
          setSparePartsList(spareParts);
          
          // Calculate last week's parts count (parts created before 7 days ago)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          
          const lastWeekPartsCount = spareParts.filter(part => {
            if (!part.created_at && !part.date_added) return false;
            const partDate = new Date(part.created_at || part.date_added);
            partDate.setHours(0, 0, 0, 0);
            return partDate.getTime() < lastWeek.getTime();
          }).length;
          setLastWeekParts(lastWeekPartsCount);
        }
      } catch (error) {
        console.error('Error fetching spare parts:', error);
        setTotalParts(0);
        setSparePartsList([]);
        setLastWeekParts(0);
      }
    };
    fetchSpareParts();

    // Fetch customers to count total customers
    const fetchCustomers = async () => {
      try {
        const response = await getCustomers();
        if (response.success && response.customers) {
          // Count total customers
          setTotalCustomers(response.customers.length);
          
          // Calculate last week's customers count (customers registered before 7 days ago)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastWeek = new Date(today);
          lastWeek.setDate(lastWeek.getDate() - 7);
          
          const lastWeekCustomersCount = response.customers.filter(customer => {
            if (!customer.created_at && !customer.registered_date) return false;
            const customerDate = new Date(customer.created_at || customer.registered_date);
            customerDate.setHours(0, 0, 0, 0);
            return customerDate.getTime() < lastWeek.getTime();
          }).length;
          setLastWeekCustomers(lastWeekCustomersCount);
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        setTotalCustomers(0);
        setLastWeekCustomers(0);
      }
    };
    fetchCustomers();

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  // Time ago helper (uses t for language)
  const getTimeAgo = (dateString) => {
    if (!dateString) return t.na;
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return t.justNow;
    if (diffInSeconds < 3600) return t.timeAgoMinutes.replace('%s', Math.floor(diffInSeconds / 60));
    if (diffInSeconds < 86400) return t.timeAgoHours.replace('%s', Math.floor(diffInSeconds / 3600));
    if (diffInSeconds < 604800) return t.timeAgoDays.replace('%s', Math.floor(diffInSeconds / 86400));
    if (diffInSeconds < 2592000) return t.timeAgoWeeks.replace('%s', Math.floor(diffInSeconds / 604800));
    return t.timeAgoMonths.replace('%s', Math.floor(diffInSeconds / 2592000));
  };

  // Fetch recent operations
  useEffect(() => {
    const fetchRecentOperations = async () => {
      try {
        // Fetch all data needed for operations
        const [paymentsRes, sparePartsRes, customersRes] = await Promise.all([
          getPayments(),
          getSpareParts(),
          getCustomers()
        ]);

        const activities = [];

        // Helper function to format currency
        const formatCurrencyLocal = (amount) => {
          const formatted = new Intl.NumberFormat('en-TZ', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(amount || 0);
          return `TZS ${formatted}`;
        };

        // Add payment operations (approved/rejected) - store raw data for translated description in render
        if (paymentsRes.success && paymentsRes.payments) {
          const operations = paymentsRes.payments
            .filter(p => p.status && (p.status === 'Approved' || p.status === 'Rejected') && p.approved_at)
            .sort((a, b) => new Date(b.approved_at || b.created_at) - new Date(a.approved_at || a.created_at))
            .slice(0, 10)
            .map(p => ({
              id: `payment_${p.id}`,
              type: 'Sale',
              paymentId: p.id,
              status: p.status,
              amount: formatCurrencyLocal(parseFloat(p.total_amount) || 0),
              date: new Date(p.approved_at || p.created_at)
            }));
          activities.push(...operations);
        }

        // Add recent spare parts
        if (sparePartsRes.success && sparePartsRes.spareParts) {
          const recentParts = sparePartsRes.spareParts
            .sort((a, b) => new Date(b.created_at || b.date_added) - new Date(a.created_at || a.date_added))
            .slice(0, 5)
            .map(part => ({
              id: `part_${part.id}`,
              type: 'Product',
              partName: part.part_name || 'Unknown',
              date: new Date(part.created_at || part.date_added)
            }));
          activities.push(...recentParts);
        }

        // Add recent customers
        if (customersRes.success && customersRes.customers) {
          const recentCustomers = customersRes.customers
            .sort((a, b) => new Date(b.created_at || b.registered_date) - new Date(a.created_at || a.registered_date))
            .slice(0, 5)
            .map(customer => ({
              id: `customer_${customer.id}`,
              type: 'Customer',
              customerName: customer.name || 'Unknown',
              date: new Date(customer.created_at || customer.registered_date)
            }));
          activities.push(...recentCustomers);
        }

        // Sort by date (most recent first) and take top 7
        activities.sort((a, b) => b.date - a.date);
        setRecentActivities(activities.slice(0, 7));
      } catch (error) {
        console.error('Error fetching recent operations:', error);
        setRecentActivities([]);
      }
    };
    fetchRecentOperations();
  }, []);

  /** Stock on hand: Σ (qty × wholesale_price) and Σ (qty × retail_price) per spare part. */
  const inventoryStockTotals = useMemo(() => {
    const parsePrice = (v) => {
      if (v == null || v === '') return 0;
      const n = parseFloat(String(v).replace(/,/g, ''));
      return Number.isNaN(n) ? 0 : n;
    };
    let wholesale = 0;
    let retail = 0;
    for (const part of sparePartsList) {
      const qty = Number(part.quantity) || 0;
      wholesale += qty * parsePrice(part.wholesale_price ?? part.wholesalePrice);
      retail += qty * parsePrice(part.retail_price ?? part.retailPrice);
    }
    return { wholesale, retail };
  }, [sparePartsList]);

  /** Approved payments only: amount_received split by stored price_type (wholesale vs retail/other). */
  const amountReceivedByPriceType = useMemo(() => {
    let wholesaleRecv = 0;
    let retailRecv = 0;
    for (const p of payments) {
      if (String(p.status || '').trim() !== 'Approved') continue;
      const recv = Number(p.amount_received) || 0;
      const pt = String(p.price_type || '').trim().toLowerCase();
      if (pt === 'wholesale') wholesaleRecv += recv;
      else retailRecv += recv;
    }
    return { wholesaleRecv, retailRecv };
  }, [payments]);

  /** Total sold-out quantity across all spare parts. */
  const totalSoldOutSpareparts = useMemo(() => {
    return sparePartsList.reduce((sum, part) => sum + (Number(part.soldout_quantity) || 0), 0);
  }, [sparePartsList]);

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
        <p>{t.redirectingToLogin}</p>
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

  // Format currency function
  const formatCurrency = (amount) => {
    const formatted = new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
    // Add "TZS" prefix
    return `TZS ${formatted}`;
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) {
      return {
        value: current > 0 ? '+100%' : '0%',
        isPositive: current > 0
      };
    }
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return {
      value: `${sign}${change.toFixed(1)}%`,
      isPositive: change >= 0
    };
  };

  // Calculate percentage changes
  const salesChange = calculatePercentageChange(totalSales, yesterdaySales);
  const partsChange = calculatePercentageChange(totalParts, lastWeekParts);
  const ordersChange = calculatePercentageChange(totalOrders, lastWeekOrders);
  const customersChange = calculatePercentageChange(totalCustomers, lastWeekCustomers);

  const receivedLineWholesale = `${t.totalReceived || 'Total received'}: ${formatCurrency(amountReceivedByPriceType.wholesaleRecv)}`;
  const receivedLineRetail = `${t.totalReceived || 'Total received'}: ${formatCurrency(amountReceivedByPriceType.retailRecv)}`;

  // Dashboard statistics
  const stats = [
    {
      title: t.todaySales || 'Today\'s Sales',
      value: formatCurrency(totalSales),
      change: salesChange.value,
      changePositive: salesChange.isPositive,
      icon: <FaMoneyBillAlt />,
      color: 'success'
    },
    {
      title: t.totalParts,
      value: totalParts.toLocaleString('en-TZ'),
      change: partsChange.value,
      changePositive: partsChange.isPositive,
      icon: <FaBox />,
      color: 'primary'
    },
    {
      title: t.totalOrders,
      value: totalOrders.toLocaleString('en-TZ'),
      change: ordersChange.value,
      changePositive: ordersChange.isPositive,
      icon: <FaShoppingCart />,
      color: 'info'
    },
    {
      title: t.customers,
      value: totalCustomers.toLocaleString('en-TZ'),
      change: customersChange.value,
      changePositive: customersChange.isPositive,
      icon: <FaUsers />,
      color: 'warning'
    },
    {
      title: t.totalWholesaleValue || 'Total Wholesale Value',
      value: formatCurrency(inventoryStockTotals.wholesale),
      change: receivedLineWholesale,
      changePositive: true,
      icon: <FaMoneyBillAlt />,
      color: 'secondary'
    },
    {
      title: t.totalRetailValue || 'Total Retail Value',
      value: formatCurrency(inventoryStockTotals.retail),
      change: receivedLineRetail,
      changePositive: true,
      icon: <FaMoneyBillAlt />,
      color: 'secondary'
    },
    {
      title: t.totalSoldOutSpareparts || 'Total Sold Out Spareparts',
      value: totalSoldOutSpareparts.toLocaleString('en-TZ'),
      change: t.soldOutQuantity || 'Sold-out quantity',
      changePositive: true,
      icon: <FaBox />,
      color: 'warning'
    }
  ];

  // Recent activities are now fetched from the database

  // Debug: Log when component renders
  console.log('Dashboard rendering, user:', user, 'loading:', loading);

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item active">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link to="/admin/finances" className="nav-item">
            <FaMoneyBillAlt className="nav-icon" />
            <span>{t.finances}</span>
          </Link>
          <Link
            to="/admin/transactions"
            className={'nav-item' + (window.location.pathname === '/admin/transactions' ? ' active' : '')}
          >
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/messages" className="nav-item">
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
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
            <h1 className="page-title">{t.dashboard}</h1>
          </div>
          
          <div className="header-right">
            <div style={{ marginRight: '15px' }}>
              <LanguageSelector />
            </div>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#1a3a5f';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666';
              }}
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
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
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
                  <span className={`stat-change ${stat.changePositive ? 'positive' : 'negative'}`}>
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
                <h2>{t.recentOperations}</h2>
              </div>
              <div className="card-body">
                {recentActivities.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px', 
                    color: '#6c757d',
                    fontSize: '0.95rem'
                  }}>
                    {t.noRecentOperations}
                  </div>
                ) : (
                  <ul className="activity-list">
                    {recentActivities.map(activity => {
                      const description = activity.type === 'Sale'
                        ? (activity.status === 'Approved' ? t.paymentApproved.replace('%s', activity.paymentId) : t.paymentRejected.replace('%s', activity.paymentId))
                        : activity.type === 'Product'
                        ? t.newSparePartAdded.replace('%s', activity.partName)
                        : t.newCustomerRegistered.replace('%s', activity.customerName);
                      return (
                        <li key={activity.id} className="activity-item">
                          <div className="activity-icon">
                            {activity.type === 'Sale' && <FaShoppingCart />}
                            {activity.type === 'Product' && <FaBox />}
                            {activity.type === 'Customer' && <FaUsers />}
                          </div>
                          <div className="activity-content">
                            <p className="activity-description">{description}</p>
                            <span className="activity-time">{getTimeAgo(activity.date)}</span>
                          </div>
                          {activity.amount && (
                            <div className="activity-amount">{activity.amount}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card">
              <div className="card-header">
                <h2>{t.quickActions}</h2>
              </div>
              <div className="card-body">
                <div className="quick-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => navigate('/admin/sales')}
                  >
                    <FaShoppingCart /> {t.sales}
                  </button>
                  <button 
                    className="action-btn secondary"
                    onClick={() => navigate('/sales/spareparts')}
                  >
                    <FaBox /> {t.add} {t.spareParts}
                  </button>
                  <button className="action-btn info">
                    <FaUsers /> {t.add} {t.customer}
                  </button>
                  <button className="action-btn warning">
                    <FaMoneyBillAlt /> {t.viewReports}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <h3>{t.todaySales}</h3>
              <p className="summary-value">{todaySalesCount}</p>
              <span className="summary-label">{todaySalesCount === 1 ? t.sale : t.sales} {t.approved.toLowerCase()}</span>
            </div>
            <div className="summary-card">
              <h3>{t.pending} {t.totalOrders}</h3>
              <p className="summary-value">{todayPendingOrdersCount}</p>
              <span className="summary-label">{todayPendingOrdersCount === 1 ? t.order : t.orders} {t.pending.toLowerCase()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

