import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../utils/useTranslation';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaChartLine,
  FaMoneyBillAlt,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaArrowUp,
  FaArrowDown,
  FaFileInvoice,
  FaReceipt,
  FaChartBar,
  FaMoneyBillWave,
  FaArrowRight,
} from 'react-icons/fa';
import './dashboard.css';
import logo from '../../../images/logo.png';
import { getRevenues, getExpenses } from '../../../services/api';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import Swal from 'sweetalert2';

const QUICK_LINKS = [
  { to: '/finance/accountant/transactions', icon: FaReceipt, label: 'Transactions', desc: 'Sales & payments' },
  { to: '/finance/accountant/expenses', icon: FaArrowDown, label: 'Expenses', desc: 'Track spending' },
  { to: '/finance/accountant/revenues', icon: FaArrowUp, label: 'Revenues', desc: 'Income records' },
  { to: '/finance/accountant/invoices', icon: FaFileInvoice, label: 'Invoices', desc: 'Create & manage' },
  { to: '/finance/accountant/salaries', icon: FaMoneyBillWave, label: 'Salaries', desc: 'Employee payroll' },
  { to: '/finance/accountant/reports', icon: FaChartBar, label: 'Reports', desc: 'Expenses & revenue' },
];

function FinanceDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
        if (parsedUser.userType !== 'admin' && !(parsedUser.userType === 'employee' && parsedUser.department === 'Finance')) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        const [revRes, expRes] = await Promise.all([getRevenues(), getExpenses()]);
        const revSum = (revRes.success && revRes.revenues)
          ? revRes.revenues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0)
          : 0;
        const expSum = (expRes.success && expRes.expenses)
          ? expRes.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
          : 0;
        setTotalRevenue(revSum);
        setTotalExpenses(expSum);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      }
    };
    loadStats();
  }, [user]);

  if (loading) {
    return <PageLoader message={t.loadingDashboard || t.loading} />;
  }

  if (!user) {
    return (
      <div className="dashboard-loading" style={{ flexDirection: 'column', gap: '20px' }}>
        <p>No user session found. Redirecting to login...</p>
      </div>
    );
  }

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

  const formatCurrency = (amount) => {
    const num = Number(amount);
    if (Number.isNaN(num)) return '0';
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const financialStats = [
    { title: 'Total Revenue', value: `TZS ${formatCurrency(totalRevenue)}`, color: 'success', trend: 'up', change: '' },
    { title: 'Total Expenses', value: `TZS ${formatCurrency(totalExpenses)}`, color: 'danger', trend: 'down', change: '' },
  ];

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
            <h1 className="page-title">Accountant Dashboard</h1>
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

        <div className="finance-content dashboard-redesign">
          <section className="dashboard-welcome">
            <p className="dashboard-welcome-desc">Manage transactions, expenses, revenues, invoices, and reports from one place.</p>
          </section>

          <section className="dashboard-quick-links">
            <h3 className="dashboard-section-title">Quick access</h3>
            <div className="quick-links-grid">
              {QUICK_LINKS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`quick-link-card ${isActive ? 'active' : ''}`}
                  >
                    <div className="quick-link-icon-wrap">
                      <Icon className="quick-link-icon" />
                    </div>
                    <div className="quick-link-text">
                      <span className="quick-link-label">{item.label}</span>
                      <span className="quick-link-desc">{item.desc}</span>
                    </div>
                    <FaArrowRight className="quick-link-arrow" />
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="dashboard-summary">
            <h3 className="dashboard-section-title">Summary</h3>
            <div className="stats-grid dashboard-stats">
              {financialStats.map((stat, index) => (
                <div key={index} className={`stat-card stat-${stat.color} dashboard-stat-card`}>
                  <div className="stat-info">
                    <h3 className="stat-title">{stat.title}</h3>
                    <p className="stat-value">{stat.value}</p>
                    <span className={`stat-change ${stat.trend === 'up' ? 'positive' : 'negative'}`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="dashboard-cta">
            <div className="dashboard-cta-card">
              <div className="dashboard-cta-content">
                <h3 className="dashboard-cta-title">View all transactions</h3>
                <p className="dashboard-cta-desc">See sales, payments, and filter by status or period.</p>
              </div>
              <Link to="/finance/accountant/transactions" className="dashboard-cta-btn">
                Go to Transactions <FaArrowRight />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default FinanceDashboard;
