import React, { useEffect, useMemo, useState } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaMoneyBillAlt,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaCog,
  FaUser,
  FaEnvelope,
  FaTags,
  FaCalendarAlt,
  FaBell,
  FaChartBar,
  FaFileInvoice,
  FaFileDownload
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import logo from '../../images/logo.png';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { getPayments, getSpareParts, getCustomers, getEmployees } from '../../services/api';

function AdminReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [spareparts, setSpareparts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.userType !== 'admin') {
        navigate('/login');
        return;
      }
    } catch (error) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        const [paymentsRes, sparepartsRes, customersRes, employeesRes] = await Promise.all([
          getPayments(),
          getSpareParts(),
          getCustomers(),
          getEmployees()
        ]);
        if (paymentsRes?.success) setPayments(paymentsRes.payments || []);
        if (sparepartsRes?.success) setSpareparts(sparepartsRes.spareParts || []);
        if (customersRes?.success) setCustomers(customersRes.customers || []);
        if (employeesRes?.success) setEmployees(employeesRes.employees || []);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: t.error || 'Error',
          text: error.message || 'Failed to load reports data.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate, t.error]);

  useEffect(() => {
    setCurrentDateTime(getCurrentDateTime());
    const interval = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const count = await getUnviewedOperationsCount();
        setNotificationCount(count || 0);
      } catch (error) {
        setNotificationCount(0);
      }
    };
    loadNotifications();
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: t.logout || 'Logout',
      text: t.confirmLogout || 'Are you sure you want to logout?',
      icon: 'warning',
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

  const summaryCards = useMemo(() => {
    const approvedPayments = payments.filter((p) => p.status === 'Approved');
    const totalSales = approvedPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const loanPayments = payments.filter((p) => String(p.payment_type || '').toLowerCase() === 'loan');
    const outstandingLoans = loanPayments.filter((p) => (Number(p.amount_remain) || 0) > 0);

    return [
      { title: t.transactions || 'Transactions', value: payments.length },
      { title: t.sales || 'Sales', value: `TZS ${Math.round(totalSales).toLocaleString()}` },
      { title: t.customers || 'Customers', value: customers.length },
      { title: t.employees || 'Employees', value: employees.length },
      { title: t.spareParts || 'Spare Parts', value: spareparts.length },
      { title: t.loans || 'Loans Outstanding', value: outstandingLoans.length }
    ];
  }, [payments, spareparts.length, customers.length, employees.length, t]);

  const reportActions = [
    {
      title: t.transactions || 'Transactions Report',
      description: 'View and export transaction-level analytics.',
      route: '/admin/transactions'
    },
    {
      title: t.finances || 'Financial Reports',
      description: 'Check totals across expenses, revenues and salaries.',
      route: '/admin/finances'
    },
    {
      title: t.sales || 'Sales Performance',
      description: 'Analyze product movement and sales trends.',
      route: '/admin/sales'
    },
    {
      title: t.dashboard || 'Executive Overview',
      description: 'Back to dashboard with key metrics at a glance.',
      route: '/admin/dashboard'
    }
  ];

  const isInDateRange = (dateValue) => {
    if (!dateFrom && !dateTo) return true;
    if (!dateValue) return false;
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return false;
    const dayOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateFrom && dayOnly < dateFrom) return false;
    if (dateTo && dayOnly > dateTo) return false;
    return true;
  };

  const matchesSearch = (p) => {
    const term = String(searchTerm || '').trim().toLowerCase();
    if (!term) return true;
    return (
      String(p.customer_name || '').toLowerCase().includes(term) ||
      String(p.customer_phone || '').toLowerCase().includes(term) ||
      String(p.payment_method || '').toLowerCase().includes(term) ||
      String(p.payment_type || '').toLowerCase().includes(term) ||
      String(p.sparepart_name || '').toLowerCase().includes(term) ||
      String(p.sparepart_number || '').toLowerCase().includes(term) ||
      String(p.status || '').toLowerCase().includes(term)
    );
  };

  const escapePrintCell = (value) => String(value ?? '').replace(/</g, '&lt;');

  /** Employee who created the sale: payment fields or lookup by employee_id */
  const getSalesEmployeeName = (p) => {
    const direct = String(p.employee_name || p.employee_username || '').trim();
    if (direct) return escapePrintCell(direct);
    const eid = p.employee_id;
    if (eid != null && employees.length) {
      const emp = employees.find((e) => String(e.id) === String(eid));
      if (emp) {
        const n = String(emp.full_name || emp.name || emp.username || '').trim();
        if (n) return escapePrintCell(n);
      }
    }
    return '—';
  };

  const openPrintDocument = (title, rowsHtml, footerHtml, disclaimer) => {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to open print reports.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; font-size: 11px; color:#222; }
        .top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; border-bottom:2px solid #333; padding-bottom:14px; }
        .left { display:flex; gap:14px; align-items:flex-start; }
        .logo { width:56px; height:56px; object-fit:contain; }
        .title { text-align:center; font-size:1.5rem; font-weight:700; margin:16px 0; }
        table { width:100%; border-collapse:collapse; border:1px solid #333; margin-bottom:16px; }
        th, td { border:1px solid #333; padding:6px 8px; }
        th { background:#f0f0f0; }
        .tr { text-align:right; } .tc { text-align:center; } .tl { text-align:left; }
        .footer { border-top:1px solid #ccc; padding-top:10px; margin-top:10px; }
      </style></head><body>
      <div class="top"><div class="left"><img src="${logo}" class="logo" alt="logo"/><div><strong>Mamuya Auto Spare Parts</strong><div>Kilimanjaro, Tanzania</div></div></div><div>Printed: ${new Date().toLocaleString('en-GB')}</div></div>
      <div class="title">${title}</div>
      <table>${rowsHtml}</table>
      <div class="footer">${footerHtml}</div>
      <p style="margin-top:20px;font-style:italic;color:#666;">${disclaimer}</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePrintSalesReport = () => {
    const rows = payments.filter((p) =>
      String(p.payment_type || '').toLowerCase() === 'sales' &&
      isInDateRange(p.created_at || p.updated_at) &&
      matchesSearch(p)
    );
    const total = rows.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
    const body =
      '<thead><tr><th class="tc">#</th><th class="tl">Date</th><th class="tl">Customer</th><th class="tl">Employee</th><th class="tl">Method</th><th class="tr">Amount (TZS)</th><th class="tl">Status</th></tr></thead><tbody>' +
      (rows.length
        ? rows.map((p, i) => `<tr><td class="tc">${i + 1}</td><td>${String(p.created_at || '').replace('T', ' ').slice(0, 16)}</td><td>${String(p.customer_name || '—').replace(/</g, '&lt;')}</td><td>${getSalesEmployeeName(p)}</td><td>${String(p.payment_method || '—').replace(/</g, '&lt;')}</td><td class="tr">${Math.round(Number(p.total_amount) || 0).toLocaleString()}</td><td>${p.status || '—'}</td></tr>`).join('')
        : '<tr><td colspan="7" class="tc">No sales records found</td></tr>') +
      '</tbody>';
    openPrintDocument('SALES REPORT', body, `<strong>Total Sales (TZS):</strong> ${Math.round(total).toLocaleString()}`, '*This is a computer generated sales report, hence no signature is required.*');
  };

  const handlePrintTransactionsReport = () => {
    const rows = payments.filter(
      (p) => p.status === 'Approved' && isInDateRange(p.approved_at || p.created_at || p.updated_at) && matchesSearch(p)
    );
    const total = rows.reduce((s, p) => s + (Number(p.amount_received) || 0), 0);
    const body =
      '<thead><tr><th class="tc">#</th><th class="tl">Date</th><th class="tl">Customer</th><th class="tl">Type</th><th class="tl">Method</th><th class="tr">Amount Received (TZS)</th></tr></thead><tbody>' +
      (rows.length
        ? rows.map((p, i) => `<tr><td class="tc">${i + 1}</td><td>${String(p.approved_at || p.created_at || '').replace('T', ' ').slice(0, 16)}</td><td>${String(p.customer_name || '—').replace(/</g, '&lt;')}</td><td>${String(p.payment_type || '—')}</td><td>${String(p.payment_method || '—')}</td><td class="tr">${Math.round(Number(p.amount_received) || 0).toLocaleString()}</td></tr>`).join('')
        : '<tr><td colspan="6" class="tc">No transaction records found</td></tr>') +
      '</tbody>';
    openPrintDocument('TRANSACTIONS REPORT', body, `<strong>Total Amount Received (TZS):</strong> ${Math.round(total).toLocaleString()}`, '*This is a computer generated transactions report, hence no signature is required.*');
  };

  const handlePrintLoansReport = () => {
    const rows = payments.filter((p) =>
      String(p.payment_type || '').toLowerCase() === 'loan' &&
      (p.status === 'Approved' || p.status === 'Pending') &&
      isInDateRange(p.updated_at || p.created_at) &&
      matchesSearch(p)
    );
    const totalRemain = rows.reduce((s, p) => s + Math.max(0, Number(p.amount_remain) || 0), 0);
    const body =
      '<thead><tr><th class="tc">#</th><th class="tl">Date</th><th class="tl">Customer</th><th class="tl">Status</th><th class="tr">Received (TZS)</th><th class="tr">Remain (TZS)</th></tr></thead><tbody>' +
      (rows.length
        ? rows.map((p, i) => `<tr><td class="tc">${i + 1}</td><td>${String(p.updated_at || p.created_at || '').replace('T', ' ').slice(0, 16)}</td><td>${String(p.customer_name || '—').replace(/</g, '&lt;')}</td><td>${p.status || '—'}</td><td class="tr">${Math.round(Number(p.amount_received) || 0).toLocaleString()}</td><td class="tr">${Math.round(Math.max(0, Number(p.amount_remain) || 0)).toLocaleString()}</td></tr>`).join('')
        : '<tr><td colspan="6" class="tc">No loan records found</td></tr>') +
      '</tbody>';
    openPrintDocument('LOANS REPORT', body, `<strong>Total Amount Remain (TZS):</strong> ${Math.round(totalRemain).toLocaleString()}`, '*This is a computer generated loans report, hence no signature is required.*');
  };

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  return (
    <div className="dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
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
            className={'nav-item' + (location.pathname === '/admin/transactions' ? ' active' : '')}
          >
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/messages" className="nav-item">
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item active">
            <FaChartBar className="nav-icon" />
            <span>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.reports || 'Reports'}</h1>
          </div>

          <div className="header-right">
            <LanguageSelector />
            <div className="date-time-display" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666' }}>
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <button className="notification-btn" disabled title="New operations count">
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
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-card reports-filter-card">
            <div className="reports-filter-group reports-filter-search">
              <label className="reports-filter-label">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Customer, phone, method..."
                className="status-filter"
              />
            </div>
            <div className="reports-filter-group">
              <label className="reports-filter-label">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="status-filter"
              />
            </div>
            <div className="reports-filter-group">
              <label className="reports-filter-label">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="status-filter"
              />
            </div>
            <button
              type="button"
              className="action-btn view reports-clear-btn"
              onClick={() => {
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              <span className="action-text">Clear dates</span>
            </button>
          </div>

          <div className="stats-grid">
            {summaryCards.map((card, idx) => (
              <div key={idx} className="stat-card stat-primary">
                <div className="stat-info">
                  <h3 className="stat-title">{card.title}</h3>
                  <p className="stat-value">{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <h2>{t.reports || 'Reports'}</h2>
            </div>
            <div className="reports-print-actions">
              <button
                type="button"
                className="reports-print-btn sales"
                onClick={handlePrintSalesReport}
              >
                Print Sales Report
              </button>
              <button
                type="button"
                className="reports-print-btn transactions"
                onClick={handlePrintTransactionsReport}
              >
                Print Transactions Report
              </button>
              <button
                type="button"
                className="reports-print-btn loans"
                onClick={handlePrintLoansReport}
              >
                Print Loans Report
              </button>
            </div>
            <div className="reports-actions-grid">
              {reportActions.map((action, idx) => (
                <div key={idx} className="reports-action-card">
                  <div className="reports-action-title">
                    <strong>{action.title}</strong>
                  </div>
                  <p className="reports-action-description">{action.description}</p>
                  <button
                    type="button"
                    className="action-btn view reports-open-btn"
                    onClick={() => navigate(action.route)}
                  >
                    <span className="action-text">Open</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminReports;
