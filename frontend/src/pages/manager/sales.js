import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaCalendarAlt,
  FaCreditCard,
  FaEnvelope
} from 'react-icons/fa';
import '../sales/payments.css';
import './sales.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments } from '../../services/api';
import { useTranslation } from '../../utils/useTranslation';
import { getCurrentDateTime } from '../../utils/dateTime';

function ManagerSales() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [now, setNow] = useState(() => new Date());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' &&
            (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'));
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    let cancelled = false;
    const loadPayments = async () => {
      setDataLoading(true);
      try {
        const response = await getPayments();
        if (cancelled) return;
        if (response?.success && Array.isArray(response.payments)) {
          setPayments(response.payments);
        } else {
          setPayments([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading sales:', error);
          setPayments([]);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load sales from database.',
            confirmButtonColor: '#1a3a5f'
          });
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
          setLoading(false);
        }
      }
    };
    loadPayments();

    const t = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
      setNow(new Date());
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [navigate]);

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
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Calculate total amount from price × quantity: use items if present, else single line (quantity * unit_price)
  const getPaymentTotalAmount = (payment) => {
    if (payment.items && payment.items.length > 0) {
      return payment.items.reduce((sum, item) => {
        const qty = parseInt(item.quantity, 10) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const lineTotal = parseFloat(item.total_amount) || qty * unitPrice;
        return sum + (Number.isFinite(lineTotal) ? lineTotal : qty * unitPrice);
      }, 0);
    }
    const qty = parseInt(payment.quantity, 10) || 0;
    const unitPrice = parseFloat(payment.unit_price) || 0;
    const fromDb = parseFloat(payment.total_amount);
    return Number.isFinite(fromDb) ? fromDb : qty * unitPrice;
  };

  const isInTimeRange = (dateString, range) => {
    if (!dateString || range === 'all') return true;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const txTime = d.getTime();
    if (range === 'today') {
      return txTime >= todayStart.getTime() && txTime <= todayEnd.getTime();
    }
    if (range === 'week') {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return txTime >= sevenDaysAgo && txTime <= now.getTime();
    }
    if (range === 'month') {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return txTime >= thirtyDaysAgo && txTime <= now.getTime();
    }
    return true;
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

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const filteredSales = payments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(term)) ||
      (payment.sparepart_name && payment.sparepart_name?.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));
    const matchesStatus =
      statusFilter === 'All' ||
      (payment.status || '') === statusFilter;
    const matchesTime = isInTimeRange(payment.created_at, timeFilter);
    return matchesSearch && matchesStatus && matchesTime;
  });

  const sortedSales = [...filteredSales].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const totalSalesCount = payments.length;
  const approvedCount = payments.filter((p) => p.status === 'Approved').length;
  const pendingCount = payments.filter((p) => p.status === 'Pending').length;
  const rejectedCount = payments.filter((p) => p.status === 'Rejected').length;
  const totalAmount = payments.reduce((sum, p) => sum + getPaymentTotalAmount(p), 0);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todaySales = payments.filter(
    (p) => p.created_at && new Date(p.created_at).getTime() >= todayStart.getTime() && new Date(p.created_at).getTime() <= todayEnd.getTime()
  );
  const todayAmount = todaySales.reduce((sum, p) => sum + getPaymentTotalAmount(p), 0);

  if (loading) {
    return <PageLoader message={'Loading...'} />;
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
            <span>Dashboard</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
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
            <h1 className="page-title">{t.managerSales}</h1>
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
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="payments-content">
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderManager}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">{t.allStatus}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
            </div>
            <div className="filter-box">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="status-filter">
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="week">{t.last7Days}</option>
                <option value="month">{t.last30Days}</option>
              </select>
            </div>
          </div>

          <div className="stats-row manager-stats-row manager-sales-stats">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalSales}</h3>
                <p className="stat-value">{totalSalesCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Total Amount (TZS)</h3>
                <p className="stat-value">{formatPrice(totalAmount)}</p>
              </div>
            </div>
            <div className="stat-card manager-stat-today">
              <div className="stat-info">
                <h3>{t.todaySalesTZS}</h3>
                <p className="stat-value">{formatPrice(todayAmount)}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section manager-sales-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.salesTransactions}</h3>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || timeFilter !== 'all'
                  ? `Showing ${sortedSales.length} of ${payments.length}`
                  : `Showing ${sortedSales.length} sales`}
                {sortedSales.length > 0 && ' · Sorted by date & time (newest first)'}
              </span>
            </div>
            <div className="table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>{t.customer}</th>
                    <th>{t.sparePart}</th>
                    <th>{t.totalAmount}</th>
                    <th>{t.paymentMethod}</th>
                    <th>{t.status}</th>
                    <th>{t.date}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <TableDataLoader message={t.loadingReportData} colSpan={7} />
                  ) : sortedSales.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {t.noSalesFound}
                      </td>
                    </tr>
                  ) : (
                    sortedSales.map((payment) => {
                      const displayStatus =
                        payment.status === 'Rejected'
                          ? 'Rejected'
                          : payment.status === 'Approved'
                          ? 'Approved'
                          : 'Pending';
                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="customer-info">
                              <FaUsers className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                                <div className="info-detail">{payment.customer_phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            {payment.items && payment.items.length > 0 ? (
                              <div>
                                {payment.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="part-info" style={{ marginBottom: idx < Math.min(2, payment.items.length) - 1 ? '6px' : 0 }}>
                                    <FaBox className="info-icon" />
                                    <div>
                                      <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                      <div className="info-detail">Qty: {item.quantity}</div>
                                    </div>
                                  </div>
                                ))}
                                {payment.items.length > 2 && (
                                  <div className="info-detail">+{payment.items.length - 2} more</div>
                                )}
                              </div>
                            ) : (
                              <div className="part-info">
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(payment.sparepart_name || '—')}</div>
                                  <div className="info-detail">{payment.sparepart_number || '—'}</div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="amount-cell">TZS {formatPrice(getPaymentTotalAmount(payment))}</td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                displayStatus === 'Approved' ? 'approved' : displayStatus === 'Rejected' ? 'rejected' : 'pending'
                              }`}
                            >
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus === 'Approved' ? t.approved : displayStatus === 'Rejected' ? t.rejected : t.pending}
                            </span>
                          </td>
                          <td>{formatDateTime(payment.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title={t.view} onClick={() => handleView(payment)}>
                                <FaEye /> {t.view}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="modal-overlay manager-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal manager-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header manager-modal-header">
              <h2>Sale Details</h2>
              <button className="close-btn manager-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content manager-modal-body">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> Payment ID</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> Customer</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <div className="view-item">
                    <label><FaBox /> Spare Parts ({selectedPayment.items.length})</label>
                    <div className="view-value">
                      {selectedPayment.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: idx < selectedPayment.items.length - 1 ? '12px' : 0,
                            paddingBottom: idx < selectedPayment.items.length - 1 ? '12px' : 0,
                            borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none'
                          }}
                        >
                          <div style={{ fontWeight: '500' }}>{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            Part: {(item.sparepart_number || 'N/A').toUpperCase()} · Qty: {item.quantity} · TZS {formatPrice(item.total_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="view-item">
                    <label><FaBox /> Spare Part</label>
                    <div className="view-value">
                      <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>{selectedPayment.sparepart_number?.toUpperCase()}</div>
                    </div>
                  </div>
                )}
                <div className="view-item">
                  <label>Total Amount</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getPaymentTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>Payment Method</label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Received</label>
                  <div className="view-value">
                    {selectedPayment.amount_received != null
                      ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                      : '—'}
                  </div>
                </div>
                <div className="view-item">
                  <label>Status</label>
                  <div className="view-value">
                    <span
                      className={`status-badge ${
                        selectedPayment.status === 'Approved' ? 'approved' : selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'
                      }`}
                    >
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Date</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer manager-modal-footer">
              <button className="cancel-btn manager-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerSales;
