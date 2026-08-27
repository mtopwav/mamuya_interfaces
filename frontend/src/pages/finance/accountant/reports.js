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
  FaFilter,
  FaPrint,
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import logo from '../../../images/logo.png';
import { getExpenses, getRevenues } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

function AccountantReports() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);
  /** 'both' | 'revenues' | 'expenses' — controls visible tables and print output */
  const [reportTypeFilter, setReportTypeFilter] = useState('both');

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
        const [expRes, revRes] = await Promise.all([getExpenses(), getRevenues()]);
        if (expRes.success && expRes.expenses) setExpenses(expRes.expenses);
        if (revRes.success && revRes.revenues) setRevenues(revRes.revenues);
      } catch (err) {
        console.error('Error loading reports:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load reports.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    if (!logoSrc) return;
    const src = logoSrc.startsWith('http')
      ? logoSrc
      : window.location.origin + (logoSrc.startsWith('/') ? logoSrc : '/' + logoSrc);
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoDataUrl(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
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

  const isInDateRange = (dateStr, from, to) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (!from && !to) return true;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (from && dateOnly < from) return false;
    if (to && dateOnly > to) return false;
    return true;
  };

  const filteredExpenses = expenses.filter((e) => isInDateRange(e.date, dateFrom, dateTo));
  const filteredRevenues = revenues.filter((r) => isInDateRange(r.date, dateFrom, dateTo));

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalRevenues = filteredRevenues.reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const netAmount = totalRevenues - totalExpenses;

  const periodLabel =
    dateFrom && dateTo
      ? `${dateFrom} to ${dateTo}`
      : dateFrom
      ? `From ${dateFrom}`
      : dateTo
      ? `Until ${dateTo}`
      : 'All time';

  const showRevenues = reportTypeFilter === 'both' || reportTypeFilter === 'revenues';
  const showExpenses = reportTypeFilter === 'both' || reportTypeFilter === 'expenses';

  const reportScopeLabel =
    reportTypeFilter === 'both'
      ? 'Revenue & expenses'
      : reportTypeFilter === 'revenues'
      ? 'Revenues only'
      : 'Expenses only';

  const handlePrintReports = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the report.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath))
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const expensesTableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Description</th>
                <th class="tl">Category</th>
                <th class="tr">Amount (TZS)</th>
                <th class="tc">Status</th>
              </tr>
            </thead>`;
    const expensesRows =
      filteredExpenses.length === 0
        ? '<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">No expenses in this period</td></tr></tbody>'
        : '<tbody>' +
          filteredExpenses
            .map((e, idx) => `
              <tr>
                <td class="tc">${idx + 1}</td>
                <td class="tl">${formatDate(e.date)}</td>
                <td class="tl">${(e.description || '—').replace(/</g, '&lt;')}</td>
                <td class="tl">${(e.category || '—').replace(/</g, '&lt;')}</td>
                <td class="tr">TZS ${formatCurrency(e.amount)}</td>
                <td class="tc">${(e.status || '—').replace(/</g, '&lt;')}</td>
              </tr>
            `)
            .join('') +
          '</tbody>';

    const revenuesTableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Description</th>
                <th class="tl">Category</th>
                <th class="tr">Amount (TZS)</th>
                <th class="tc">Payment method</th>
                <th class="tc">Status</th>
              </tr>
            </thead>`;
    const revenuesRows =
      filteredRevenues.length === 0
        ? '<tbody><tr><td colspan="7" style="text-align:center;padding:12px;">No revenues in this period</td></tr></tbody>'
        : '<tbody>' +
          filteredRevenues
            .map((r, idx) => `
              <tr>
                <td class="tc">${idx + 1}</td>
                <td class="tl">${formatDate(r.date)}</td>
                <td class="tl">${(r.description || '—').replace(/</g, '&lt;')}</td>
                <td class="tl">${(r.category || '—').replace(/</g, '&lt;')}</td>
                <td class="tr">TZS ${formatCurrency(r.amount)}</td>
                <td class="tc">${(r.payment_method || '—').replace(/</g, '&lt;')}</td>
                <td class="tc">${(r.status || '—').replace(/</g, '&lt;')}</td>
              </tr>
            `)
            .join('') +
          '</tbody>';

    const printTitleShort =
      reportTypeFilter === 'both'
        ? 'Revenue & Expenses'
        : reportTypeFilter === 'revenues'
        ? 'Revenue'
        : 'Expenses';
    const printHeading =
      reportTypeFilter === 'both'
        ? 'REVENUE & EXPENSES REPORT'
        : reportTypeFilter === 'revenues'
        ? 'REVENUE REPORT'
        : 'EXPENSES REPORT';

    const revenueSectionHtml =
      showRevenues &&
      `
          <div class="tax-inv-section-title">Revenue</div>
          <table class="tax-inv-table">
            ${revenuesTableHeader}
            ${revenuesRows}
          </table>
`;

    const expensesSectionHtml =
      showExpenses &&
      `
          <div class="tax-inv-section-title">Expenses</div>
          <table class="tax-inv-table">
            ${expensesTableHeader}
            ${expensesRows}
          </table>
`;

    const footerRowsHtml = [
      showRevenues
        ? `<div class="tax-inv-footer-row"><label>Total Revenue (TZS):</label> ${formatCurrency(totalRevenues)}</div>`
        : '',
      showExpenses
        ? `<div class="tax-inv-footer-row"><label>Total Expenses (TZS):</label> ${formatCurrency(totalExpenses)}</div>`
        : '',
      showRevenues && showExpenses
        ? `<div class="tax-inv-footer-row"><label>Net (Revenue − Expenses) (TZS):</label> ${
            netAmount >= 0 ? formatCurrency(netAmount) : '- ' + formatCurrency(Math.abs(netAmount))
          }</div>`
        : '',
    ]
      .filter(Boolean)
      .join('\n            ');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${printTitleShort} Report - Mamuya Auto Spare Parts</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              max-width: 900px;
              margin: 0 auto;
              padding: 24px;
              color: #222;
              font-size: 11px;
              line-height: 1.4;
            }
            .tax-inv-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .tax-inv-left {
              display: flex;
              align-items: flex-start;
              gap: 20px;
              flex: 1;
            }
            .tax-inv-logo {
              max-height: 60px;
              max-width: 140px;
              object-fit: contain;
            }
            .tax-inv-company { flex: 1; }
            .tax-inv-company h2 {
              margin: 0 0 10px 0;
              font-size: 1.15rem;
              font-weight: 700;
              color: #111;
              letter-spacing: 0.02em;
            }
            .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
            .tax-inv-meta { text-align: right; min-width: 180px; }
            .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
            .tax-inv-title {
              text-align: center;
              font-size: 1.6rem;
              font-weight: 700;
              margin: 24px 0;
              letter-spacing: 0.05em;
            }
            .tax-inv-section-title {
              font-size: 1rem;
              font-weight: 700;
              margin: 20px 0 10px 0;
              color: #111;
            }
            .tax-inv-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 20px 0;
              font-size: 10px;
              border: 1px solid #333;
            }
            .tax-inv-table th,
            .tax-inv-table td {
              border: 1px solid #333;
              padding: 6px 8px;
              vertical-align: middle;
            }
            .tax-inv-table th {
              background: #f0f0f0;
              font-weight: 700;
              text-align: center;
              font-size: 10px;
            }
            .tax-inv-table th.tl { text-align: left; }
            .tax-inv-table .tc { text-align: center; }
            .tax-inv-table .tr { text-align: right; }
            .tax-inv-table .tl { text-align: left; }
            .tax-inv-table tbody tr { background: #fff; }
            .tax-inv-footer {
              margin-top: 28px;
              font-size: 11px;
              border-top: 1px solid #ccc;
              padding-top: 16px;
            }
            .tax-inv-footer-row { margin-bottom: 12px; }
            .tax-inv-footer-row label { display: inline-block; min-width: 200px; font-weight: 600; }
            .tax-inv-disclaimer {
              margin-top: 28px;
              font-style: italic;
              color: #666;
              font-size: 10px;
            }
            @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
          </style>
        </head>
        <body>
          <div class="tax-inv-top">
            <div class="tax-inv-left">
              <img src="${String(logoSrcForPrint).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />
              <div class="tax-inv-company">
                <h2>Mamuya Auto Spare Parts</h2>
                <p class="tax-inv-address">
                  Kilimanjaro, Tanzania<br />
                  Phone: +255 22 123 4567
                </p>
              </div>
            </div>
            <div class="tax-inv-meta">
              <p><strong>Report:</strong> ${printTitleShort}${reportTypeFilter === 'both' ? '' : ' only'}</p>
              <p><strong>Period:</strong> ${periodLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Accountant').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">${printHeading}</h1>

          ${revenueSectionHtml || ''}
          ${expensesSectionHtml || ''}

          <div class="tax-inv-footer">
            ${footerRowsHtml}
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
            <h1 className="page-title">Accountant Reports</h1>
          </div>
          <div className="header-right">
            {/* eslint-disable-next-line react/jsx-no-undef -- imported at top */}
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
          <section className="reports-intro">
            <h2 className="reports-page-title">Expenses & Revenue Reports</h2>
            <p className="reports-page-desc">Summary and detailed view of expenses and revenues by period.</p>
          </section>

          <div className="reports-toolbar">
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <label className="filter-label">From</label>
              <input
                type="date"
                className="filter-select reports-period-select"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Filter from date"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">To</label>
              <input
                type="date"
                className="filter-select reports-period-select"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="Filter to date"
              />
            </div>
            {(dateFrom || dateTo) ? (
              <div className="filter-group">
                <button
                  type="button"
                  className="reports-clear-dates"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  title="Clear date filter"
                >
                  Clear dates
                </button>
              </div>
            ) : null}
            <div className="reports-type-filter" role="group" aria-label="Report content">
              <span className="reports-type-filter-label">Show</span>
              <button
                type="button"
                className={'reports-type-btn' + (reportTypeFilter === 'both' ? ' active' : '')}
                onClick={() => setReportTypeFilter('both')}
              >
                All
              </button>
              <button
                type="button"
                className={'reports-type-btn' + (reportTypeFilter === 'revenues' ? ' active' : '')}
                onClick={() => setReportTypeFilter('revenues')}
              >
                Revenues
              </button>
              <button
                type="button"
                className={'reports-type-btn' + (reportTypeFilter === 'expenses' ? ' active' : '')}
                onClick={() => setReportTypeFilter('expenses')}
              >
                Expenses
              </button>
            </div>
            <span className="reports-period-label">
              Showing: {periodLabel} · {reportScopeLabel}
            </span>
            <button
              onClick={handlePrintReports}
              className="action-btn print"
              style={{
                marginLeft: 'auto',
                padding: '10px 20px',
                backgroundColor: '#1a3a5f',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#15304a'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#1a3a5f'}
              title="Print Report"
            >
              <FaPrint />
              <span>Print Report</span>
            </button>
          </div>

          <div className="stats-grid reports-stats">
            {showExpenses && (
              <div className="stat-card stat-danger reports-stat-card">
                <div className="stat-info">
                  <h3 className="stat-title">Total Expenses</h3>
                  <p className="stat-value">TZS {formatCurrency(totalExpenses)}</p>
                  <span className="reports-stat-count">{filteredExpenses.length} record(s)</span>
                </div>
              </div>
            )}
            {showRevenues && (
              <div className="stat-card stat-success reports-stat-card">
                <div className="stat-info">
                  <h3 className="stat-title">Total Revenue</h3>
                  <p className="stat-value">TZS {formatCurrency(totalRevenues)}</p>
                  <span className="reports-stat-count">{filteredRevenues.length} record(s)</span>
                </div>
              </div>
            )}
            {reportTypeFilter === 'both' && (
              <div className={`stat-card reports-stat-card reports-net-card ${netAmount >= 0 ? 'stat-success' : 'stat-danger'}`}>
                <div className="stat-info">
                  <h3 className="stat-title">Net (Revenue − Expenses)</h3>
                  <p className="stat-value">{netAmount >= 0 ? 'TZS ' : '- TZS '}{formatCurrency(Math.abs(netAmount))}</p>
                </div>
              </div>
            )}
          </div>

          <div className="reports-sections">
            {showRevenues && (
              <section className="reports-section reports-revenues" aria-label="Revenue Report">
                <div className="reports-section-header">
                  <h3 className="reports-section-title">
                    <FaArrowUp className="reports-section-icon" /> Revenue Report
                  </h3>
                  <span className="reports-section-total amount-positive">TZS {formatCurrency(totalRevenues)}</span>
                </div>
                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount (TZS)</th>
                        <th>Payment method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRevenues.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="no-data">No revenues in this period</td>
                        </tr>
                      ) : (
                        filteredRevenues.map((r) => (
                          <tr key={r.id}>
                            <td>{formatDate(r.date)}</td>
                            <td className="reports-desc-cell">{r.description || '—'}</td>
                            <td><span className="reports-category-badge">{r.category || '—'}</span></td>
                            <td className="amount-positive">TZS {formatCurrency(r.amount)}</td>
                            <td>{r.payment_method || '—'}</td>
                            <td><span className={`status-badge ${r.status === 'Approved' ? 'completed' : 'pending'}`}>{r.status || '—'}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {showRevenues && showExpenses && (
              <div className="reports-divider" aria-hidden="true">
                <span className="reports-divider-label">Expenses</span>
              </div>
            )}

            {showExpenses && (
              <section className="reports-section reports-expenses" aria-label="Expenses Report">
                <div className="reports-section-header">
                  <h3 className="reports-section-title">
                    <FaArrowDown className="reports-section-icon" /> Expenses Report
                  </h3>
                  <span className="reports-section-total amount-negative">TZS {formatCurrency(totalExpenses)}</span>
                </div>
                <div className="reports-table-wrap">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount (TZS)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="no-data">No expenses in this period</td>
                        </tr>
                      ) : (
                        filteredExpenses.map((e) => (
                          <tr key={e.id}>
                            <td>{formatDate(e.date)}</td>
                            <td className="reports-desc-cell">{e.description || '—'}</td>
                            <td><span className="reports-category-badge">{e.category || '—'}</span></td>
                            <td className="amount-negative">TZS {formatCurrency(e.amount)}</td>
                            <td><span className={`status-badge ${e.status === 'Approved' ? 'completed' : 'pending'}`}>{e.status || '—'}</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountantReports;
