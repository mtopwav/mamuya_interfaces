import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaUsers,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaCreditCard,
  FaInfoCircle,
  FaSearch,
  FaCalendarAlt,
  FaPrint,
  FaBell
} from 'react-icons/fa';
import './dashboard.css';
import './payments.css';
import logo from '../../images/logo.png';
import { getPayments } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function SalesReports() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
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

    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) {
          setPayments(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments for reports:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load reports data. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };

    loadPayments();

    // Update current date/time every second
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

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          backgroundColor: '#f5f7fa',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
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

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(parseFloat(amount) || 0);
  };

  const handlePrintReports = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath))
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel =
      dateFrom && dateTo
        ? `${dateFrom} to ${dateTo}`
        : dateFrom
        ? `From ${dateFrom}`
        : dateTo
        ? `Until ${dateTo}`
        : 'All time';

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">${t.date}</th>
                <th class="tl">${t.customer}</th>
                <th class="tl">${t.sparePart}</th>
                <th class="tc">${t.status}</th>
                <th class="tr">${t.totalAmount} (TZS)</th>
              </tr>
            </thead>`;

    const rowsHtml =
      filteredPayments.length === 0
        ? `<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">${t.noData}</td></tr></tbody>`
        : '<tbody>' +
          filteredPayments
            .map((p, idx) => {
              const spareParts =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) =>
                        `${capitalizeName(item.sparepart_name || 'Unknown')} (${(item.sparepart_number || 'N/A')
                          .toUpperCase()
                          .replace(/</g, '&lt;')})`
                      )
                      .join('<br />')
                  : (capitalizeName(p.sparepart_name || 'Unknown') || '—').replace(/</g, '&lt;');
              const statusLabel =
                p.status === 'Approved' ? (t.approved || 'Approved') : p.status === 'Rejected' ? (t.rejected || 'Rejected') : (t.pending || 'Pending');
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${p.created_at ? formatDateTime(p.created_at) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${spareParts}</td>
                  <td class="tc">${statusLabel}</td>
                  <td class="tr">${formatPrice(p.total_amount)}</td>
                </tr>
              `;
            })
            .join('') +
          '</tbody>';

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sales Report - Mamuya Auto Spare Parts</title>
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
            .tax-inv-footer-row label { display: inline-block; min-width: 220px; font-weight: 600; }
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
              <p><strong>Report:</strong> Sales (All statuses)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Sales Staff').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">SALES REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total transactions:</label> ${totalCount}</div>
            <div class="tax-inv-footer-row"><label>Approved:</label> ${approvedCount}</div>
            <div class="tax-inv-footer-row"><label>Pending:</label> ${pendingCount}</div>
            <div class="tax-inv-footer-row"><label>Rejected:</label> ${rejectedCount}</div>
            <div class="tax-inv-footer-row"><label>Total amount (TZS):</label> ${formatPrice(totalAmount)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated sales report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
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

  const timeFilteredPayments = payments.filter((p) => isInDateRange(p.created_at, dateFrom, dateTo));
  const filteredPayments = timeFilteredPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Only show approved transactions in the on-screen table
  const approvedPaymentsForTable = filteredPayments.filter((p) => p.status === 'Approved');

  // Aggregate totals
  const totalAmount = filteredPayments.reduce(
    (sum, p) => sum + (parseFloat(p.total_amount) || 0),
    0
  );
  const totalCount = filteredPayments.length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'Pending').length;
  const approvedCount = filteredPayments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  return (
    <div className="payments-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/sales/dashboard" className="nav-item">
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
          <Link to="/sales/sales_reports" className="nav-item active">
            <FaInfoCircle className="nav-icon" />
            <span>{t.salesReports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.salesReports}</h1>
          </div>

          <div className="header-right">
            <div className="date-time-display">
              <FaCalendarAlt className="date-icon" />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span className="notification-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div className="header-control">
              <ThemeToggle />
            </div>
            <div className="header-control">
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

        {/* Reports Content */}
        <div className="payments-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <label className="sales-reports-date-label">From</label>
              <input
                type="date"
                className="status-filter sales-reports-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Filter from date"
              />
            </div>
            <div className="filter-box">
              <label className="sales-reports-date-label">To</label>
              <input
                type="date"
                className="status-filter sales-reports-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="Filter to date"
              />
            </div>
            {(dateFrom || dateTo) ? (
              <div className="filter-box">
                <button
                  type="button"
                  className="sales-reports-clear-dates"
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  title="Clear date filter"
                >
                  Clear dates
                </button>
              </div>
            ) : null}
            <button className="action-btn print" onClick={handlePrintReports}>
              <FaPrint className="action-icon" />
              <span className="action-text">{t.printReport}</span>
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalTransactions}</h3>
                <p className="stat-value">{totalCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
          </div>

          {/* Reports Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {approvedPaymentsForTable.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  approvedPaymentsForTable.slice(0, 20).map((p) => (
                    <tr key={p.id}>
                      <td>{p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : ''}</td>
                      <td>{capitalizeName(p.customer_name)}</td>
                      <td>
                        {p.items && p.items.length > 0 ? (
                          <div>
                            {p.items.map((item, idx) => (
                              <div key={idx} style={{ marginBottom: idx < p.items.length - 1 ? '5px' : '0' }}>
                                {capitalizeName(item.sparepart_name || 'Unknown')} ({(item.sparepart_number || 'N/A').toUpperCase()})
                              </div>
                            ))}
                          </div>
                        ) : (
                          capitalizeName(p.sparepart_name || 'Unknown')
                        )}
                      </td>
                      <td>{p.status === 'Approved' ? t.approved : p.status === 'Rejected' ? t.rejected : t.pending}</td>
                      <td>{formatCurrency(p.total_amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesReports;
