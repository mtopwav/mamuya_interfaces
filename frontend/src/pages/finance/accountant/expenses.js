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
import './expenses.css';
import logo from '../../../images/logo.png';
import { getExpenses, createExpense, updateExpense } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

const EXPENSE_CATEGORIES = ['','Payroll', 'Inventory', 'Operations', 'Utilities', 'Rent', 'Maintenance', 'Other'];
const EXPENSE_DATE_LOOKBACK_DAYS = 90;

function AccountantExpenses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
  });
  const [editForm, setEditForm] = useState({
    description: '',
    category: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'Pending',
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

    const loadExpenses = async () => {
      try {
        const res = await getExpenses();
        if (res.success && res.expenses) setExpenses(res.expenses);
      } catch (err) {
        console.error('Error loading expenses:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load expenses.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    loadExpenses();
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
    date.setDate(date.getDate() - EXPENSE_DATE_LOOKBACK_DAYS);
    return date.toISOString().slice(0, 10);
  };

  const isPastDate = (dateStr) => {
    const d = toDateOnly(dateStr);
    if (d == null) return false;
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - EXPENSE_DATE_LOOKBACK_DAYS);
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
      const expenseOnly = toDateOnly(dateStr);
      return expenseOnly != null && expenseOnly >= weekStartOnly && expenseOnly <= nowOnly;
    }
    return true;
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (exp.category && exp.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'All' || exp.category === categoryFilter;
    const matchesPeriod = isInPeriod(exp.date, periodFilter);
    return matchesSearch && matchesCategory && matchesPeriod;
  });

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalThisMonth = expenses
    .filter((e) => isInPeriod(e.date, 'month'))
    .reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalThisWeek = expenses
    .filter((e) => isInPeriod(e.date, 'week'))
    .reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const pendingCount = expenses.filter((e) => e.status === 'Pending').length;
  const pendingAmount = expenses.filter((e) => e.status === 'Pending').reduce((sum, e) => sum + parseAmount(e.amount), 0);

  const handleView = (expense) => {
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const openAddModal = () => {
    setAddForm({
      description: '',
      category: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'Pending',
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

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (isPastDate(addForm.date)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid date',
        text: `Date cannot be more than ${EXPENSE_DATE_LOOKBACK_DAYS} days before today. Please select a date from ${EXPENSE_DATE_LOOKBACK_DAYS} days ago onwards.`,
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const amountNum = parseFloat(String(addForm.amount).replace(/,/g, ''), 10);
    if (!addForm.description.trim() || !addForm.category.trim() || Number.isNaN(amountNum) || amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await createExpense({
        date: addForm.date,
        description: addForm.description.trim(),
        category: addForm.category.trim(),
        amount: amountNum,
        status: addForm.status,
        added_by: user?.id || null,
      });
      if (res.success && res.expense) {
        setExpenses((prev) => [res.expense, ...prev]);
        setShowAddModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Expense added successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to add expense');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to add expense.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (exp) => {
    let dateStr = exp.date ? (typeof exp.date === 'string' && exp.date.length >= 10 ? exp.date.slice(0, 10) : new Date(exp.date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    if (isPastDate(dateStr)) {
      dateStr = getMinAllowedDate();
    }
    setEditingExpense(exp);
    setEditForm({
      description: exp.description || '',
      category: exp.category != null ? String(exp.category) : '',
      amount: formatAmountDisplay(String(parseAmount(exp.amount))),
      date: dateStr,
      status: exp.status === 'Paid' ? 'Paid' : 'Pending',
    });
    setShowEditModal(true);
  };

  const handleEditAmountChange = (inputValue) => {
    const digits = inputValue.replace(/\D/g, '');
    setEditForm((f) => ({ ...f, amount: digits === '' ? '' : formatAmountDisplay(digits) }));
  };

  const handleEditExpense = async (e) => {
    e.preventDefault();
    if (!editingExpense) return;
    if (isPastDate(editForm.date)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid date',
        text: `Date cannot be more than ${EXPENSE_DATE_LOOKBACK_DAYS} days before today. Please select a date from ${EXPENSE_DATE_LOOKBACK_DAYS} days ago onwards.`,
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const amountNum = parseFloat(String(editForm.amount).replace(/,/g, ''), 10);
    if (!editForm.description.trim() || !editForm.category.trim() || Number.isNaN(amountNum) || amountNum <= 0) return;
    setSubmitting(true);
    try {
      const res = await updateExpense(editingExpense.id, {
        date: editForm.date,
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        amount: amountNum,
        status: editForm.status,
      });
      if (res.success && res.expense) {
        setExpenses((prev) => prev.map((ex) => (ex.id === editingExpense.id ? res.expense : ex)));
        setShowEditModal(false);
        setEditingExpense(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Expense updated successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to update expense');
      }
    } catch (err) {
      console.error('Error updating expense:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to update expense.',
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
            <h1 className="page-title">Accountant Expenses</h1>
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
          <section className="expenses-intro">
            <h2 className="expenses-page-title">Expenses</h2>
            <p className="expenses-page-desc">Track and manage company expenses by category and period.</p>
          </section>

          <div className="stats-grid expenses-stats">
            <div className="stat-card stat-danger">
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
                <h3 className="stat-title">Pending</h3>
                <p className="stat-value">{pendingCount} · TZS {formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section expenses-section">
            <div className="section-header">
              <h2>Expense Records</h2>
              <div className="section-actions">
                <button type="button" className="expenses-add-btn" onClick={openAddModal}>
                  <FaPlus /> Add expense
                </button>
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
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
              <table className="transactions-table expenses-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount (TZS)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No expenses found
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>{formatDate(exp.date)}</td>
                        <td>{capitalizeName(exp.description)}</td>
                        <td>
                          <span className="category-badge">{exp.category}</span>
                        </td>
                        <td className="amount-negative">TZS {formatCurrency(exp.amount)}</td>
                        <td>
                          <span className={`status-badge ${exp.status === 'Paid' ? 'completed' : 'pending'}`}>
                            {exp.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="View" onClick={() => handleView(exp)}>
                              <FaEye />
                            </button>
                            <button className="action-btn edit" title="Edit" onClick={() => openEditModal(exp)}>
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

            <div className="expenses-total-card">
              <span className="expenses-total-label">Total (filtered)</span>
              <span className="expenses-total-value">TZS {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedExpense && (
        <div className="expenses-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="expenses-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="expenses-modal-header">
              <h3>Expense Details</h3>
              <button type="button" className="expenses-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="expenses-modal-body">
              <div className="expenses-view-row">
                <label>Date</label>
                <span>{formatDate(selectedExpense.date)}</span>
              </div>
              <div className="expenses-view-row">
                <label>Description</label>
                <span>{capitalizeName(selectedExpense.description)}</span>
              </div>
              <div className="expenses-view-row">
                <label>Category</label>
                <span className="category-badge">{selectedExpense.category}</span>
              </div>
              <div className="expenses-view-row">
                <label>Amount</label>
                <span className="amount-negative">TZS {formatCurrency(selectedExpense.amount)}</span>
              </div>
              <div className="expenses-view-row">
                <label>Status</label>
                <span className={`status-badge ${selectedExpense.status === 'Paid' ? 'completed' : 'pending'}`}>
                  {selectedExpense.status}
                </span>
              </div>
            </div>
            <div className="expenses-modal-footer">
              <button type="button" className="expenses-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="expenses-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="expenses-modal-content expenses-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="expenses-modal-header">
              <h3>Add expense</h3>
              <button type="button" className="expenses-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddExpense} className="expenses-add-form">
              <div className="expenses-form-group">
                <label htmlFor="add-description">Description</label>
                <input
                  id="add-description"
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Office supplies"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="add-category">Category</label>
                <input
                  id="add-category"
                  type="text"
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Payroll, Utilities, Inventory"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="add-amount">Amount (TZS)</label>
                <input
                  id="add-amount"
                  type="text"
                  inputMode="numeric"
                  value={addForm.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="Enter Amount"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="add-date">Date</label>
                <input
                  id="add-date"
                  type="date"
                  min={getMinAllowedDate()}
                  value={addForm.date}
                  onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="add-status">Status</label>
                <select
                  id="add-status"
                  value={addForm.status}
                  onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                  className="expenses-form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div className="expenses-modal-footer">
                <button type="button" className="expenses-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="expenses-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingExpense && (
        <div className="expenses-modal-overlay" onClick={() => { setShowEditModal(false); setEditingExpense(null); }}>
          <div className="expenses-modal-content expenses-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="expenses-modal-header">
              <h3>Edit expense</h3>
              <button type="button" className="expenses-modal-close" onClick={() => { setShowEditModal(false); setEditingExpense(null); }}>×</button>
            </div>
            <form onSubmit={handleEditExpense} className="expenses-add-form">
              <div className="expenses-form-group">
                <label htmlFor="edit-description">Description</label>
                <input
                  id="edit-description"
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Office supplies"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="edit-category">Category</label>
                <input
                  id="edit-category"
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Payroll, Utilities, Inventory"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="edit-amount">Amount (TZS)</label>
                <input
                  id="edit-amount"
                  type="text"
                  inputMode="numeric"
                  value={editForm.amount}
                  onChange={(e) => handleEditAmountChange(e.target.value)}
                  placeholder="e.g. 2,000,000"
                  required
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="edit-date">Date</label>
                <input
                  id="edit-date"
                  type="date"
                  min={getMinAllowedDate()}
                  value={editForm.date}
                  onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                  className="expenses-form-input"
                />
              </div>
              <div className="expenses-form-group">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="expenses-form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div className="expenses-modal-footer">
                <button type="button" className="expenses-modal-btn secondary" onClick={() => { setShowEditModal(false); setEditingExpense(null); }}>
                  Cancel
                </button>
                <button type="submit" className="expenses-modal-btn primary" disabled={submitting}>
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

export default AccountantExpenses;
