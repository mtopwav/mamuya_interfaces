import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FaChartLine, FaBars, FaSignOutAlt, FaUser, FaMoneyBillWave, FaChartBar, FaShoppingCart, FaFileInvoice, FaReceipt, FaCalendarAlt, FaCheckCircle, FaTimesCircle, FaClock, FaBox, FaUsers, FaEnvelope } from 'react-icons/fa';
import Swal from 'sweetalert2';
import '../sales/payments.css';
import './dashboard.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        if (
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' && (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'))
        ) {
          // Authorized
        } else {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
      return;
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const res = await getPayments();
        if (res.success && res.payments) setPayments(res.payments);
      } catch (err) {
        console.error('Error loading payments:', err);
      }
    };
    loadPayments();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPayments = payments.filter((p) => {
    const d = new Date(p.created_at);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const pendingApproval = todayPayments.filter((p) => {
    if (p.status === 'Rejected') return false;
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return total - received !== 0;
  }).length;
  const approvedToday = todayPayments.filter((p) => {
    if (p.status === 'Approved') return true;
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Pending' && total - received === 0;
  }).length;
  const totalToday = todayPayments.length;

  const displayTransactions = todayPayments.slice(0, 15).map((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const amountRemain = total - received;
    const displayStatus =
      p.status === 'Rejected'
        ? 'Rejected'
        : p.status === 'Approved' || amountRemain === 0
        ? 'Approved'
        : 'Pending';
    return { ...p, amountRemain, displayStatus };
  });

  const quickLinks = [
    { to: '/manager/transactions', label: t.transactions, desc: t.reviewApproveTransactions },
    { to: '/manager/loans', label: t.loans, desc: t.manageLoanApprovals },
    { to: '/manager/messages', label: t.messages, desc: t.messages },
    { to: '/manager/sales', label: t.sales, desc: t.salesOverview },
    { to: '/manager/spareparts', label: t.spareParts, desc: t.viewInventoryStock },
    { to: '/manager/reports', label: t.reports, desc: t.viewReportsAnalytics },
  ];

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>Spare Parts</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/messages" className={'nav-item ' + (location.pathname === '/manager/messages' ? 'active' : '')}>
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/manager/sales" className={'nav-item ' + (location.pathname === '/manager/sales' ? 'active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>
      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerDashboard}</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time">
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Manager')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>
        <div className="cashier-content manager-dashboard-content">
          <section className="manager-stats">
            <h3 className="manager-section-title">{t.todayOverview}</h3>
            <div className="stats-row manager-stats-row">
              <div className="stat-card manager-stat-card manager-stat-pending">
                <div className="stat-info">
                  <h3>{t.pendingApproval}</h3>
                  <p className="stat-value">{pendingApproval}</p>
                </div>
              </div>
              <div className="stat-card manager-stat-card manager-stat-approved">
                <div className="stat-info">
                  <h3>{t.approvedToday}</h3>
                  <p className="stat-value">{approvedToday}</p>
                </div>
              </div>
              <div className="stat-card manager-stat-card manager-stat-total">
                <div className="stat-info">
                  <h3>{t.totalTransactionsToday}</h3>
                  <p className="stat-value">{totalToday}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="manager-quick-links">
            <h3 className="manager-section-title">{t.quickActions}</h3>
            <div className="manager-quick-grid">
              {quickLinks.map((link) => (
                <Link key={link.to} to={link.to} className="manager-quick-card">
                  <div className="manager-quick-text">
                    <span className="manager-quick-label">{link.label}</span>
                    <span className="manager-quick-desc">{link.desc}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="manager-transactions-section">
            <div className="manager-section-header">
              <h3 className="manager-section-title">{t.transactions}</h3>
              <Link to="/manager/transactions" className="manager-view-all-link">
                {t.viewAll}
              </Link>
            </div>
            <div className="table-container manager-dashboard-table">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Total Amount</th>
                    <th>Amount Received</th>
                    <th>Amount Remain</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        {t.noTransactionsToday}
                      </td>
                    </tr>
                  ) : (
                    displayTransactions.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="info-name">{capitalizeName(p.customer_name)}</div>
                          {p.customer_phone && (
                            <div className="info-detail" style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                              {p.customer_phone}
                            </div>
                          )}
                        </td>
                        <td className="amount-cell">TZS {formatPrice(p.total_amount)}</td>
                        <td className="amount-cell">
                          {p.amount_received != null ? `TZS ${formatPrice(p.amount_received)}` : '—'}
                        </td>
                        <td className="amount-cell">TZS {formatPrice(Math.max(0, p.amountRemain))}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              p.displayStatus === 'Approved'
                                ? 'approved'
                                : p.displayStatus === 'Rejected'
                                ? 'rejected'
                                : 'pending'
                            }`}
                          >
                            {p.displayStatus === 'Approved' && <FaCheckCircle />}
                            {p.displayStatus === 'Rejected' && <FaTimesCircle />}
                            {p.displayStatus === 'Pending' && <FaClock />}
                            {p.displayStatus === 'Approved' ? t.approved : p.displayStatus === 'Rejected' ? t.rejected : t.pending}
                          </span>
                        </td>
                        <td>{formatDateTime(p.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default ManagerDashboard;
