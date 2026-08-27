import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../utils/useTranslation';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaReceipt,
  FaFileInvoice,
  FaMoneyBillWave,
  FaChartBar,
  FaArrowDown,
  FaArrowUp,
  FaSearch,
  FaFilter,
  FaEye,
  FaEdit,
  FaPlus,
} from 'react-icons/fa';
import './dashboard.css';
import './revenues.css';
import logo from '../../../images/logo.png';
import { getRevenues, createRevenue, updateRevenue } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

const REVENUE_CATEGORIES = ['', 'Sales', 'Services', 'Rent Income', 'Interest', 'Other'];

const REVENUE_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Mobile Payment'];
const REVENUE_DATE_LOOKBACK_DAYS = 90;

function AccountantRevenues() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [revenues, setRevenues] = useState([]);
  const [selectedRevenue, setSelectedRevenue] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    description: '',
    category: REVENUE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    payment_method: '',
  });
  const [editForm, setEditForm] = useState({
    description: '',
    category: REVENUE_CATEGORIES[0],
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
    payment_method: '',
  });

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.userType !== 'admin' && !(parsed.userType === 'employee' && parsed.department === 'Finance')) {
        navigate('/login');
        return;
      }
    } catch (e) {
      navigate('/login');
      return;
    }

    const loadRevenues = async () => {
      try {
        const res = await getRevenues();
        if (res.success && res.revenues) setRevenues(res.revenues);
      } catch (err) {
        console.error('Error loading revenues:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load revenues.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    loadRevenues();
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
      cancelButtonText: 'Cancel',
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

  const parseAmount = (value) => {
    if (value == null || value === '') return 0;
    const num = Number(String(value).replace(/,/g, ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const formatCurrency = (amount) => {
    const num = parseAmount(amount);
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const getMinAllowedDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - REVENUE_DATE_LOOKBACK_DAYS);
    return date.toISOString().slice(0, 10);
  };

  const isPastDate = (dateStr) => {
    const d = toDateOnly(dateStr);
    if (d == null) return false;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - REVENUE_DATE_LOOKBACK_DAYS);
    const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime();
    return d < minDateOnly;
  };

  const isInPeriod = (dateStr, period) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    if (period === 'all') return true;
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'week') {
      const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const weekStartOnly = weekStart.getTime();
      const revOnly = toDateOnly(dateStr);
      return revOnly != null && revOnly >= weekStartOnly && revOnly <= nowOnly;
    }
    return true;
  };

  const filteredRevenues = revenues.filter((rev) => {
    const matchesSearch =
      (rev.description && rev.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (rev.category && rev.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || rev.category === categoryFilter;
    const matchesPeriod = isInPeriod(rev.date, periodFilter);
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const totalAmount = filteredRevenues.reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const totalThisMonth = revenues
    .filter((r) => isInPeriod(r.date, 'month'))
    .reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const totalThisWeek = revenues
    .filter((r) => isInPeriod(r.date, 'week'))
    .reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const receivedCount = revenues.filter((r) => r.status === 'Received').length;
  const receivedAmount = revenues.filter((r) => r.status === 'Received').reduce((sum, r) => sum + parseAmount(r.amount), 0);

  const handleView = (revenue) => {
    setSelectedRevenue(revenue);
    setShowViewModal(true);
  };

  const openAddModal = () => {
    setAddForm({
      description: '',
      category: REVENUE_CATEGORIES[0],
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      payment_method: '',
    });
    setShowAddModal(true);
  };

  const formatAmountDisplay = (value) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits === '') return '';
    return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const handleAmountChange = (inputValue) => {
    const digits = inputValue.replace(/\D/g, '');
    setAddForm((f) => ({ ...f, amount: digits === '' ? '' : formatAmountDisplay(digits) }));
  };

  const handleAddRevenue = async (e) => {
    e.preventDefault();
    if (isPastDate(addForm.date)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid date',
        text: `Date cannot be more than ${REVENUE_DATE_LOOKBACK_DAYS} days before today. Please select a date from ${REVENUE_DATE_LOOKBACK_DAYS} days ago onwards.`,
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const amountNum = parseFloat(String(addForm.amount).replace(/,/g, ''), 10);
    if (!addForm.description.trim() || !addForm.payment_method || Number.isNaN(amountNum) || amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await createRevenue({
        date: addForm.date,
        description: addForm.description.trim(),
        category: addForm.category,
        amount: amountNum,
        status: addForm.status,
        payment_method: addForm.payment_method,
        added_by: user?.id || null,
      });
      if (res.success && res.revenue) {
        setRevenues((prev) => [res.revenue, ...prev]);
        setShowAddModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Revenue added successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to add revenue');
      }
    } catch (err) {
      console.error('Error adding revenue:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to add revenue.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (rev) => {
    let dateStr = rev.date ? (typeof rev.date === 'string' && rev.date.length >= 10 ? rev.date.slice(0, 10) : new Date(rev.date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    if (isPastDate(dateStr)) {
      dateStr = getMinAllowedDate();
    }
    setEditingRevenue(rev);
    setEditForm({
      description: rev.description || '',
      category: rev.category || REVENUE_CATEGORIES[0],
      amount: formatAmountDisplay(String(parseAmount(rev.amount))),
      date: dateStr,
      status: rev.status === 'Received' ? 'Received' : 'Pending',
      payment_method: rev.payment_method ? String(rev.payment_method).trim() : '',
    });
    setShowEditModal(true);
  };

  const handleEditAmountChange = (inputValue) => {
    const digits = inputValue.replace(/\D/g, '');
    setEditForm((f) => ({ ...f, amount: digits === '' ? '' : formatAmountDisplay(digits) }));
  };

  const handleEditRevenue = async (e) => {
    e.preventDefault();
    if (!editingRevenue) return;
    if (isPastDate(editForm.date)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid date',
        text: `Date cannot be more than ${REVENUE_DATE_LOOKBACK_DAYS} days before today. Please select a date from ${REVENUE_DATE_LOOKBACK_DAYS} days ago onwards.`,
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const amountNum = parseFloat(String(editForm.amount).replace(/,/g, ''), 10);
    if (!editForm.description.trim() || !editForm.payment_method || Number.isNaN(amountNum) || amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await updateRevenue(editingRevenue.id, {
        date: editForm.date,
        description: editForm.description.trim(),
        category: editForm.category,
        amount: amountNum,
        status: editForm.status,
        payment_method: editForm.payment_method,
      });
      if (res.success && res.revenue) {
        setRevenues((prev) => prev.map((r) => (r.id === editingRevenue.id ? res.revenue : r)));
        setShowEditModal(false);
        setEditingRevenue(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Revenue updated successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to update revenue');
      }
    } catch (err) {
      console.error('Error updating revenue:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to update revenue.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <PageLoader message={t.loading} />;
  }

  return (
    <div className="finance-dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/finance/accountant/dashboard" className={'nav-item' + (location.pathname === '/finance/accountant/dashboard' ? ' active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link to="/finance/accountant/transactions" className={'nav-item' + (location.pathname === '/finance/accountant/transactions' ? ' active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/finance/accountant/loans" className={'nav-item' + (location.pathname === '/finance/accountant/loans' ? ' active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Loans</span>
          </Link>
          <Link to="/finance/accountant/expenses" className={'nav-item' + (location.pathname === '/finance/accountant/expenses' ? ' active' : '')}>
            <FaArrowDown className="nav-icon" />
            <span>Expenses</span>
          </Link>
          <Link to="/finance/accountant/revenues" className={'nav-item' + (location.pathname === '/finance/accountant/revenues' ? ' active' : '')}>
            <FaArrowUp className="nav-icon" />
            <span>Revenues</span>
          </Link>
          <Link to="/finance/accountant/invoices" className={'nav-item' + (location.pathname === '/finance/accountant/invoices' ? ' active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>Invoices</span>
          </Link>
          <Link to="/finance/accountant/salaries" className={'nav-item' + (location.pathname === '/finance/accountant/salaries' ? ' active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Salaries</span>
          </Link>
          <Link to="/finance/accountant/reports" className={'nav-item' + (location.pathname === '/finance/accountant/reports' ? ' active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>Reports</span>
          </Link>
        </nav>
      </aside>
      <div className="main-content">
        <header className="finance-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Revenues</h1>
          </div>
          <div className="header-right">
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Accountant')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="finance-content">
          <div className="stats-grid revenues-stats">
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">This Month</h3>
                <p className="stat-value">TZS {formatCurrency(totalThisMonth)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">This Week</h3>
                <p className="stat-value">TZS {formatCurrency(totalThisWeek)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Received</h3>
                <p className="stat-value">{receivedCount} · TZS {formatCurrency(receivedAmount)}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section revenues-section">
            <div className="section-header">
              <h2>Revenue Records</h2>
              <div className="section-actions">
                <button type="button" className="revenues-add-btn" onClick={openAddModal}>
                  <FaPlus /> Add revenue
                </button>
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {REVENUE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    className="filter-select"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                  >
                    <option value="all">All time</option>
                    <option value="month">This month</option>
                    <option value="week">This week</option>
                  </select>
                </div>
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search description or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table revenues-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount (TZS)</th>
                    <th>Payment method</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevenues.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No revenues found
                      </td>
                    </tr>
                  ) : (
                    filteredRevenues.map((rev) => (
                      <tr key={rev.id}>
                        <td>{formatDate(rev.date)}</td>
                        <td>{capitalizeName(rev.description)}</td>
                        <td>
                          <span className="category-badge">{rev.category}</span>
                        </td>
                        <td className="amount-positive">TZS {formatCurrency(rev.amount)}</td>
                        <td>{rev.payment_method || '—'}</td>
                        <td>
                          <span className={`status-badge ${rev.status === 'Received' ? 'completed' : 'pending'}`}>
                            {rev.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="View" onClick={() => handleView(rev)}>
                              <FaEye />
                            </button>
                            <button className="action-btn edit" title="Edit" onClick={() => openEditModal(rev)}>
                              <FaEdit />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="revenues-total-card">
              <span className="revenues-total-label">Total (filtered)</span>
              <span className="revenues-total-value">TZS {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedRevenue && (
        <div className="revenues-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="revenues-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="revenues-modal-header">
              <h3>Revenue Details</h3>
              <button type="button" className="revenues-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="revenues-modal-body">
              <div className="revenues-view-row">
                <label>Date</label>
                <span>{formatDate(selectedRevenue.date)}</span>
              </div>
              <div className="revenues-view-row">
                <label>Description</label>
                <span>{capitalizeName(selectedRevenue.description)}</span>
              </div>
              <div className="revenues-view-row">
                <label>Category</label>
                <span className="category-badge">{selectedRevenue.category}</span>
              </div>
              <div className="revenues-view-row">
                <label>Amount</label>
                <span className="amount-positive">TZS {formatCurrency(selectedRevenue.amount)}</span>
              </div>
              <div className="revenues-view-row">
                <label>Status</label>
                <span className={`status-badge ${selectedRevenue.status === 'Received' ? 'completed' : 'pending'}`}>
                  {selectedRevenue.status}
                </span>
              </div>
            </div>
            <div className="revenues-modal-footer">
              <button type="button" className="revenues-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="revenues-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="revenues-modal-content revenues-add-modal"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="revenues-modal-header">
              <h3>Add revenue</h3>
              <button type="button" className="revenues-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddRevenue} className="revenues-add-form">
              <div className="revenues-form-group">
                <label htmlFor="add-description">Description</label>
                <input
                  id="add-description"
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Sales - Spare parts"
                  required
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="add-category">Category</label>
                <select
                  id="add-category"
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  className="revenues-form-input"
                >
                  {REVENUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="revenues-form-group">
                <label htmlFor="add-amount">Amount (TZS)</label>
                <input
                  id="add-amount"
                  type="text"
                  inputMode="numeric"
                  value={addForm.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Enter Amount"
                  required
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="add-payment-method">Payment method</label>
                <select
                  id="add-payment-method"
                  value={addForm.payment_method}
                  onChange={(e) => setAddForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="revenues-form-input"
                  required
                >
                  <option value="">Select payment method</option>
                  {REVENUE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="revenues-form-group">
                <label htmlFor="add-date">Date</label>
                <input
                  id="add-date"
                  type="date"
                  min={getMinAllowedDate()}
                  value={addForm.date}
                  onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="add-status">Status</label>
                <select
                  id="add-status"
                  value={addForm.status}
                  onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                  className="revenues-form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                </select>
              </div>
              <div className="revenues-modal-footer">
                <button type="button" className="revenues-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="revenues-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add revenue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingRevenue && (
        <div className="revenues-modal-overlay" onClick={() => { setShowEditModal(false); setEditingRevenue(null); }}>
          <div
            className="revenues-modal-content revenues-add-modal"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="revenues-modal-header">
              <h3>Edit revenue</h3>
              <button type="button" className="revenues-modal-close" onClick={() => { setShowEditModal(false); setEditingRevenue(null); }}>×</button>
            </div>
            <form onSubmit={handleEditRevenue} className="revenues-add-form">
              <div className="revenues-form-group">
                <label htmlFor="edit-description">Description</label>
                <input
                  id="edit-description"
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Sales - Spare parts"
                  required
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="edit-category">Category</label>
                <select
                  id="edit-category"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  className="revenues-form-input"
                >
                  {REVENUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="revenues-form-group">
                <label htmlFor="edit-amount">Amount (TZS)</label>
                <input
                  id="edit-amount"
                  type="text"
                  inputMode="numeric"
                  value={editForm.amount}
                  onChange={(e) => handleEditAmountChange(e.target.value)}
                  placeholder="e.g. 2,000,000"
                  required
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="edit-payment-method">Payment method</label>
                <select
                  id="edit-payment-method"
                  value={editForm.payment_method}
                  onChange={(e) => setEditForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="revenues-form-input"
                  required
                >
                  <option value="">Select payment method</option>
                  {editForm.payment_method &&
                    !REVENUE_PAYMENT_METHODS.includes(editForm.payment_method) && (
                      <option value={editForm.payment_method}>{editForm.payment_method}</option>
                    )}
                  {REVENUE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="revenues-form-group">
                <label htmlFor="edit-date">Date</label>
                <input
                  id="edit-date"
                  type="date"
                  min={getMinAllowedDate()}
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="revenues-form-input"
                />
              </div>
              <div className="revenues-form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="revenues-form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="Received">Received</option>
                </select>
              </div>
              <div className="revenues-modal-footer">
                <button type="button" className="revenues-modal-btn secondary" onClick={() => { setShowEditModal(false); setEditingRevenue(null); }}>
                  Cancel
                </button>
                <button type="submit" className="revenues-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantRevenues;
