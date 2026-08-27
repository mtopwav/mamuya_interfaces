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
import './salaries.css';
import logo from '../../../images/logo.png';
import { getEmployees, getSalaries, createSalary, updateSalary } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

const SALARY_STATUSES = ['Pending', 'Paid'];

function AccountantSalaries() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedSalary, setSelectedSalary] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    employee_id: '',
    period: new Date().toISOString().slice(0, 7),
    amount: '',
    status: 'Pending',
    payment_date: '',
  });
  const [editForm, setEditForm] = useState({
    employee_id: '',
    period: new Date().toISOString().slice(0, 7),
    amount: '',
    status: 'Pending',
    payment_date: '',
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

    const load = async () => {
      try {
        const [empRes, salRes] = await Promise.all([getEmployees(), getSalaries()]);
        if (empRes.success && empRes.employees) setEmployees(empRes.employees);
        if (salRes.success && salRes.salaries) setSalaries(salRes.salaries);
      } catch (err) {
        console.error('Error loading data:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load salaries.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const formatPeriod = (period) => {
    if (!period || period.length < 7) return period || '—';
    const [y, m] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[parseInt(m, 10) - 1] || m;
    return `${month} ${y}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isInPeriod = (periodStr, period) => {
    if (!periodStr) return false;
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (period === 'all') return true;
    if (period === 'month') return periodStr === currentMonth;
    return true;
  };

  const filteredSalaries = salaries.filter((s) => {
    const matchesSearch =
      (s.employee_name && s.employee_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesPeriod = isInPeriod(s.period, periodFilter);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalAmount = filteredSalaries.reduce((sum, s) => sum + parseAmount(s.amount), 0);
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalThisMonth = salaries
    .filter((s) => s.period === currentPeriod)
    .reduce((sum, s) => sum + parseAmount(s.amount), 0);
  const paidCount = salaries.filter((s) => s.status === 'Paid').length;
  const paidAmount = salaries.filter((s) => s.status === 'Paid').reduce((sum, s) => sum + parseAmount(s.amount), 0);
  const pendingCount = salaries.filter((s) => s.status === 'Pending').length;

  const handleView = (salary) => {
    setSelectedSalary(salary);
    setShowViewModal(true);
  };

  const openAddModal = () => {
    setAddForm({
      employee_id: '',
      period: new Date().toISOString().slice(0, 7),
      amount: '',
      status: 'Pending',
      payment_date: '',
    });
    setShowAddModal(true);
  };

  const formatAmountDisplay = (value) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits === '') return '';
    return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const getEmployeeSalaryForAmount = (employeeId) => {
    if (!employeeId) return '';
    const emp = employees.find((e) => String(e.id) === String(employeeId));
    if (!emp) return '';
    const num = parseAmount(emp.salary);
    return num > 0 ? formatAmountDisplay(String(num)) : '';
  };

  const handleAddEmployeeChange = (employeeId) => {
    const amount = getEmployeeSalaryForAmount(employeeId);
    setAddForm((f) => ({ ...f, employee_id: employeeId, amount }));
  };

  const handleAmountChange = (inputValue) => {
    const digits = inputValue.replace(/\D/g, '');
    setAddForm((f) => ({ ...f, amount: digits === '' ? '' : formatAmountDisplay(digits) }));
  };

  const handleEditEmployeeChange = (employeeId) => {
    const amount = getEmployeeSalaryForAmount(employeeId);
    setEditForm((f) => ({ ...f, employee_id: employeeId, amount }));
  };

  const handleAddSalary = async (e) => {
    e.preventDefault();
    if (!addForm.employee_id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select an employee.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const amountNum = parseFloat(String(addForm.amount).replace(/,/g, ''), 10);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid amount', text: 'Please enter a valid amount (0 or more).', confirmButtonColor: '#1a3a5f' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await createSalary({
        employee_id: parseInt(addForm.employee_id, 10),
        period: addForm.period,
        amount: amountNum,
        status: addForm.status,
        payment_date: addForm.payment_date || null,
        added_by: user?.id || null,
      });
      if (res.success && res.salary) {
        setSalaries((prev) => [res.salary, ...prev]);
        setShowAddModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Salary record created successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to create salary');
      }
    } catch (err) {
      console.error('Error creating salary:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to create salary.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (sal) => {
    setEditingSalary(sal);
    setEditForm({
      employee_id: String(sal.employee_id),
      period: sal.period && sal.period.length >= 7 ? sal.period.slice(0, 7) : new Date().toISOString().slice(0, 7),
      amount: formatAmountDisplay(String(parseAmount(sal.amount))),
      status: sal.status || 'Pending',
      payment_date: sal.payment_date ? (typeof sal.payment_date === 'string' && sal.payment_date.length >= 10 ? sal.payment_date.slice(0, 10) : new Date(sal.payment_date).toISOString().slice(0, 10)) : '',
    });
    setShowEditModal(true);
  };

  const handleEditAmountChange = (inputValue) => {
    const digits = inputValue.replace(/\D/g, '');
    setEditForm((f) => ({ ...f, amount: digits === '' ? '' : formatAmountDisplay(digits) }));
  };

  const handleEditSalary = async (e) => {
    e.preventDefault();
    if (!editingSalary) return;
    if (!editForm.employee_id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select an employee.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const amountNum = parseFloat(String(editForm.amount).replace(/,/g, ''), 10);
    if (Number.isNaN(amountNum) || amountNum < 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid amount', text: 'Please enter a valid amount (0 or more).', confirmButtonColor: '#1a3a5f' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await updateSalary(editingSalary.id, {
        employee_id: parseInt(editForm.employee_id, 10),
        period: editForm.period,
        amount: amountNum,
        status: editForm.status,
        payment_date: editForm.payment_date || null,
      });
      if (res.success && res.salary) {
        setSalaries((prev) => prev.map((s) => (s.id === editingSalary.id ? res.salary : s)));
        setShowEditModal(false);
        setEditingSalary(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Salary record updated successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to update salary');
      }
    } catch (err) {
      console.error('Error updating salary:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to update salary.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClass = (status) => (status === 'Paid' ? 'completed' : 'pending');

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
            <h1 className="page-title">Accountant Salaries</h1>
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
          <section className="salaries-intro">
            <h2 className="salaries-page-title">Salaries</h2>
            <p className="salaries-page-desc">Manage employee salary records by period.</p>
          </section>

          <div className="stats-grid salaries-stats">
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">This Month</h3>
                <p className="stat-value">TZS {formatCurrency(totalThisMonth)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Paid</h3>
                <p className="stat-value">{paidCount} · TZS {formatCurrency(paidAmount)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Pending</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section salaries-section">
            <div className="section-header">
              <h2>Salary Records</h2>
              <div className="section-actions">
                <button type="button" className="salaries-add-btn" onClick={openAddModal}>
                  <FaPlus /> Add salary
                </button>
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    {SALARY_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    className="filter-select"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                  >
                    <option value="all">All periods</option>
                    <option value="month">This month</option>
                  </select>
                </div>
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table salaries-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Amount (TZS)</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No salary records found
                      </td>
                    </tr>
                  ) : (
                    filteredSalaries.map((s) => (
                      <tr key={s.id}>
                        <td>{capitalizeName(s.employee_name)}</td>
                        <td>{formatPeriod(s.period)}</td>
                        <td className="amount-positive">TZS {formatCurrency(s.amount)}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(s.status)}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>{s.payment_date ? formatDate(s.payment_date) : '—'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="View" onClick={() => handleView(s)}>
                              <FaEye />
                            </button>
                            {s.status !== 'Paid' && (
                              <button className="action-btn edit" title="Edit" onClick={() => openEditModal(s)}>
                                <FaEdit />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="salaries-total-card">
              <span className="salaries-total-label">Total (filtered)</span>
              <span className="salaries-total-value">TZS {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedSalary && (
        <div className="salaries-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="salaries-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="salaries-modal-header">
              <h3>Salary Details</h3>
              <button type="button" className="salaries-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="salaries-modal-body">
              <div className="salaries-view-row">
                <label>Employee</label>
                <span>{capitalizeName(selectedSalary.employee_name)}</span>
              </div>
              <div className="salaries-view-row">
                <label>Period</label>
                <span>{formatPeriod(selectedSalary.period)}</span>
              </div>
              <div className="salaries-view-row">
                <label>Amount</label>
                <span className="amount-positive">TZS {formatCurrency(selectedSalary.amount)}</span>
              </div>
              <div className="salaries-view-row">
                <label>Status</label>
                <span className={`status-badge ${getStatusClass(selectedSalary.status)}`}>
                  {selectedSalary.status}
                </span>
              </div>
              <div className="salaries-view-row">
                <label>Payment Date</label>
                <span>{selectedSalary.payment_date ? formatDate(selectedSalary.payment_date) : '—'}</span>
              </div>
            </div>
            <div className="salaries-modal-footer">
              <button type="button" className="salaries-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="salaries-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="salaries-modal-content salaries-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="salaries-modal-header">
              <h3>Add salary</h3>
              <button type="button" className="salaries-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSalary} className="salaries-add-form">
              <section className="salaries-form-section">
                <h4 className="salaries-form-section-title">Employee & period</h4>
                <div className="salaries-form-group">
                  <label htmlFor="add-employee_id">Employee <span className="salaries-required">*</span></label>
                  <select
                    id="add-employee_id"
                    value={addForm.employee_id}
                    onChange={(e) => handleAddEmployeeChange(e.target.value)}
                    className="salaries-form-input"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{capitalizeName(emp.full_name)} {emp.department ? `(${emp.department})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="salaries-form-group">
                  <label htmlFor="add-period">Period (month) <span className="salaries-required">*</span></label>
                  <input
                    id="add-period"
                    type="month"
                    value={addForm.period}
                    onChange={(e) => setAddForm((f) => ({ ...f, period: e.target.value }))}
                    className="salaries-form-input"
                    required
                  />
                </div>
              </section>
              <section className="salaries-form-section">
                <h4 className="salaries-form-section-title">Amount & status</h4>
                <div className="salaries-form-group">
                  <label htmlFor="add-amount">Amount (TZS) <span className="salaries-required">*</span></label>
                  <input
                    id="add-amount"
                    type="text"
                    inputMode="numeric"
                    value={addForm.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Select employee to fill from salary"
                    required
                    className="salaries-form-input"
                    disabled
                  />
                </div>
                <div className="salaries-form-row">
                  <div className="salaries-form-group">
                    <label htmlFor="add-status">Status</label>
                    <select
                      id="add-status"
                      value={addForm.status}
                      onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                      className="salaries-form-input"
                    >
                      {SALARY_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salaries-form-group">
                    <label htmlFor="add-payment_date">Payment date</label>
                    <input
                      id="add-payment_date"
                      type="date"
                      value={addForm.payment_date}
                      onChange={(e) => setAddForm((f) => ({ ...f, payment_date: e.target.value }))}
                      className="salaries-form-input"
                    />
                  </div>
                </div>
              </section>
              <div className="salaries-modal-footer">
                <button type="button" className="salaries-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="salaries-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingSalary && (
        <div className="salaries-modal-overlay" onClick={() => { setShowEditModal(false); setEditingSalary(null); }}>
          <div className="salaries-modal-content salaries-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="salaries-modal-header">
              <h3>Edit salary</h3>
              <button type="button" className="salaries-modal-close" onClick={() => { setShowEditModal(false); setEditingSalary(null); }}>×</button>
            </div>
            <form onSubmit={handleEditSalary} className="salaries-add-form">
              <section className="salaries-form-section">
                <h4 className="salaries-form-section-title">Employee & period</h4>
                <div className="salaries-form-group">
                  <label htmlFor="edit-employee_id">Employee <span className="salaries-required">*</span></label>
                  <select
                    id="edit-employee_id"
                    value={editForm.employee_id}
                    onChange={(e) => handleEditEmployeeChange(e.target.value)}
                    className="salaries-form-input"
                    required
                  >
                    <option value="">Select employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{capitalizeName(emp.full_name)} {emp.department ? `(${emp.department})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="salaries-form-group">
                  <label htmlFor="edit-period">Period (month) <span className="salaries-required">*</span></label>
                  <input
                    id="edit-period"
                    type="month"
                    value={editForm.period}
                    onChange={(e) => setEditForm((f) => ({ ...f, period: e.target.value }))}
                    className="salaries-form-input"
                    required
                  />
                </div>
              </section>
              <section className="salaries-form-section">
                <h4 className="salaries-form-section-title">Amount & status</h4>
                <div className="salaries-form-group">
                  <label htmlFor="edit-amount">Amount (TZS) <span className="salaries-required">*</span></label>
                  <input
                    id="edit-amount"
                    type="text"
                    inputMode="numeric"
                    value={editForm.amount}
                    onChange={(e) => handleEditAmountChange(e.target.value)}
                    placeholder="Select employee to fill from salary"
                    required
                    className="salaries-form-input"
                    disabled
                  />
                </div>
                <div className="salaries-form-row">
                  <div className="salaries-form-group">
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="salaries-form-input"
                    >
                      {SALARY_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="salaries-form-group">
                    <label htmlFor="edit-payment_date">Payment date</label>
                    <input
                      id="edit-payment_date"
                      type="date"
                      value={editForm.payment_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, payment_date: e.target.value }))}
                      className="salaries-form-input"
                    />
                  </div>
                </div>
              </section>
              <div className="salaries-modal-footer">
                <button type="button" className="salaries-modal-btn secondary" onClick={() => { setShowEditModal(false); setEditingSalary(null); }}>
                  Cancel
                </button>
                <button type="submit" className="salaries-modal-btn primary" disabled={submitting}>
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

export default AccountantSalaries;
