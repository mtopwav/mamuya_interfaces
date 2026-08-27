import React, { useEffect, useState } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaReceipt,
  FaTags,
  FaBox,
  FaShoppingCart,
  FaUsers,
  FaMoneyBillAlt,
  FaEnvelope,
  FaCog,
  FaCalendarAlt,
  FaChartBar,
  FaFileInvoice,
  FaMoneyBillWave,
  FaArrowDown,
  FaArrowUp,
  FaTrash,
} from 'react-icons/fa';
import '../finance/accountant/dashboard.css';
import '../finance/accountant/transactions.css';
import logo from '../../images/logo.png';
import { getPayments, deletePayment, getRevenues } from '../../services/api';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { useTranslation } from '../../utils/useTranslation';

function AdminTransactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [revenues, setRevenues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [showLoanOnly, setShowLoanOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operationDateFilterOpen, setOperationDateFilterOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }

    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.userType !== 'admin') {
        navigate('/login');
        return;
      }
    } catch {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        const [paymentsRes, revenuesRes] = await Promise.all([getPayments(), getRevenues()]);
        if (paymentsRes.success && paymentsRes.payments) setPayments(paymentsRes.payments);
        if (revenuesRes.success && revenuesRes.revenues) setRevenues(revenuesRes.revenues);
      } catch (err) {
        console.error('Error loading transactions:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load transactions.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // Load logo as data URL for print document (ensures logo appears in new window)
  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : logo && logo.default ? logo.default : '';
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
      title: t.logout || 'Logout',
      text: t.areYouSureLogout || 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.yesLogout || 'Yes, logout',
      cancelButtonText: t.cancel || 'Cancel',
    });

    if (!result.isConfirmed) return;
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return String(name).toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '0';
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightSearchText = (value) => {
    const text = String(value ?? '');
    const term = String(searchTerm || '').trim();
    if (!term) return text;
    const termLower = term.toLowerCase();
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      part.toLowerCase() === termLower ? (
        <span key={`hl-${idx}`} style={{ color: '#dc3545', fontWeight: 700 }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={`hl-${idx}`}>{part}</React.Fragment>
      )
    );
  };

  const isInDateRange = (dateStr, from, to) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (from && dateOnly < from) return false;
    if (to && dateOnly > to) return false;
    return true;
  };

  /** Prefer approval/confirmation time, then creation time — for “operation” date filtering. */
  const getOperationDate = (p) => p.approved_at || p.confirmed_at || p.created_at;

  const filteredPayments = payments.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      !term ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.customer_phone && p.customer_phone.includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number?.toLowerCase().includes(term)) ||
      (p.items &&
        p.items.some(
          (i) => (i.sparepart_name || '').toLowerCase().includes(term) || (i.sparepart_number || '').toLowerCase().includes(term)
        ));
    const matchesPaymentMethod =
      paymentMethodFilter === 'All' || (p.payment_method || 'Unknown') === paymentMethodFilter;
    const matchesLoanType =
      !showLoanOnly || String(p.payment_type || '').trim().toLowerCase() === 'loan';
    const matchesTime = isInDateRange(getOperationDate(p), dateFrom, dateTo);
    return matchesSearch && matchesPaymentMethod && matchesLoanType && matchesTime;
  });

  // Cards should follow only the selected date period (not search/payment-method filters).
  const dateFilteredPayments = payments.filter((p) =>
    isInDateRange(getOperationDate(p), dateFrom, dateTo)
  );

  const uniquePaymentMethods = Array.from(
    new Set(
      payments
        .map((p) => p.payment_method || 'Unknown')
        .filter((m) => m && m.trim() !== '')
    )
  );

  const isApprovedPayment = (p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Approved' || (p.status === 'Pending' && total - received === 0);
  };

  const approvedPaymentsForTable = filteredPayments.filter((p) => isApprovedPayment(p));
  const dateApprovedPayments = dateFilteredPayments.filter((p) => isApprovedPayment(p));

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const approvedCount = filteredPayments.filter((p) => isApprovedPayment(p)).length;
  const pendingCount = filteredPayments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Pending' && total - received > 0;
  }).length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  const getMethod = (p) => (p.payment_method || '').toLowerCase();

  const totalCash = approvedPaymentsForTable.reduce(
    (sum, p) => (getMethod(p).includes('cash') ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );

  const totalBankTransfer = approvedPaymentsForTable.reduce(
    (sum, p) => (getMethod(p).includes('bank') || getMethod(p).includes('transfer') ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );

  const totalMpesa = approvedPaymentsForTable.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('mpesa') || method.includes('m-pesa')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);

  const totalMixByYas = approvedPaymentsForTable.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('mix by yas') || method.includes('yas')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);

  const totalAirtelMoney = approvedPaymentsForTable.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('airtel')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);

  const totalAmountRemain = approvedPaymentsForTable.reduce((sum, p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const remain = total - received;
    return sum + Math.max(0, remain);
  }, 0);

  const parseRevenueAmount = (value) => {
    if (value == null) return 0;
    const n = Number(String(value).replace(/,/g, '').trim());
    return Number.isNaN(n) ? 0 : n;
  };

  const accountantRevenue = revenues
    .filter((r) => {
      const matchesDate = isInDateRange(r.date || r.created_at, dateFrom, dateTo);
      const isReceived = String(r.status || '').trim().toLowerCase() === 'received';
      return matchesDate && isReceived;
    })
    .reduce((sum, r) => sum + parseRevenueAmount(r.amount), 0);

  const totalAmountReceived = totalCash + totalBankTransfer + totalMpesa + totalMixByYas + totalAirtelMoney;

  const cardsApprovedCount = dateFilteredPayments.filter((p) => isApprovedPayment(p)).length;
  const cardsTotalAmountRemain = dateApprovedPayments.reduce((sum, p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return sum + Math.max(0, total - received);
  }, 0);
  const cardsTotalCash = dateApprovedPayments.reduce(
    (sum, p) => (getMethod(p).includes('cash') ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );
  const cardsTotalBankTransfer = dateApprovedPayments.reduce(
    (sum, p) =>
      getMethod(p).includes('bank') || getMethod(p).includes('transfer')
        ? sum + (Number(p.amount_received) || 0)
        : sum,
    0
  );
  const cardsTotalMpesa = dateApprovedPayments.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('mpesa') || method.includes('m-pesa')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);
  const cardsTotalMixByYas = dateApprovedPayments.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('mix by yas') || method.includes('yas')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);
  const cardsTotalAirtelMoney = dateApprovedPayments.reduce((sum, p) => {
    const method = getMethod(p);
    return method.includes('airtel')
      ? sum + (Number(p.amount_received) || 0)
      : sum;
  }, 0);

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    return 'pending';
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleDeletePayment = async (payment) => {
    if (!payment?.id) return;
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete transaction',
      text: `Are you sure you want to delete transaction #${payment.id}?`,
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete',
      cancelButtonText: t.cancel || 'Cancel',
    });
    if (!result.isConfirmed) return;

    setDeletingPaymentId(payment.id);
    try {
      const res = await deletePayment(payment.id);
      if (!res?.success) throw new Error(res?.message || 'Failed to delete transaction.');

      const refreshed = await getPayments();
      if (refreshed?.success && refreshed.payments) setPayments(refreshed.payments);

      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `Transaction #${payment.id} deleted successfully.`,
        confirmButtonColor: '#1a3a5f',
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to delete transaction.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handlePrint = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : logo && logo.default ? logo.default : '';
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

    const formatCurrency = (amount) =>
      new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0
      }).format(amount || 0);

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Customer</th>
                <th class="tl">Items</th>
                <th class="tc">Payment type</th>
                <th class="tc">Payment method</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tl">Status</th>
              </tr>
            </thead>`;

    const rowsHtml =
      approvedPaymentsForTable.length === 0
        ? '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          approvedPaymentsForTable
            .map((p, idx) => {
              const received = Number(p.amount_received) || 0;
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => {
                        const name = (item.sparepart_name || 'Unknown').replace(/</g, '&lt;');
                        const qty = Number(item.quantity) || 0;
                        return `${name} (${qty})`;
                      })
                      .join('<br />')
                  : `${(p.sparepart_name || '—').replace(/</g, '&lt;')} (${Number(p.quantity) || 0})`;
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${getOperationDate(p) ? formatDateTime(getOperationDate(p)) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${(p.payment_type || '—').replace(/</g, '&lt;')}</td>
                  <td class="tc">${(p.payment_method || '—').replace(/</g, '&lt;')}</td>
                  <td class="tr">${formatCurrency(received)}</td>
                  <td class="tl">${p.status || 'Pending'}</td>
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
          <title>Transactions Report - Mamuya Auto Spare Parts</title>
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
              <p><strong>Report:</strong> Accountant Transactions</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Accountant').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">TRANSACTIONS REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total Cash (TZS):</label> ${formatCurrency(totalCash)}</div>
            <div class="tax-inv-footer-row"><label>Total Bank transfer (TZS):</label> ${formatCurrency(totalBankTransfer)}</div>
            <div class="tax-inv-footer-row"><label>Total M-Pesa (TZS):</label> ${formatCurrency(totalMpesa)}</div>
            <div class="tax-inv-footer-row"><label>Total Mix by YAS (TZS):</label> ${formatCurrency(totalMixByYas)}</div>
            <div class="tax-inv-footer-row"><label>Total Airtel Money (TZS):</label> ${formatCurrency(totalAirtelMoney)}</div>
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatCurrency(totalCash + totalBankTransfer + totalMpesa + totalMixByYas + totalAirtelMoney)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
        </body>
      </html>
    `);

    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  const loadingOrNoUser = loading || !user;

  if (loadingOrNoUser) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  return (
    <div className="finance-dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className={'nav-item' + (location.pathname === '/admin/dashboard' ? ' active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/categories-brands" className={'nav-item' + (location.pathname === '/admin/categories-brands' ? ' active' : '')}>
            <FaTags className="nav-icon" />
            <span>Categories & Brands</span>
          </Link>
          <Link to="/admin/spareparts" className={'nav-item' + (location.pathname === '/admin/spareparts' ? ' active' : '')}>
            <FaBox className="nav-icon" />
            <span>Spare Parts</span>
          </Link>
          <Link to="/admin/sales" className={'nav-item' + (location.pathname === '/admin/sales' ? ' active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>Sales</span>
          </Link>
          <Link to="/admin/employees" className={'nav-item' + (location.pathname === '/admin/employees' ? ' active' : '')}>
            <FaUsers className="nav-icon" />
            <span>Employees</span>
          </Link>
          <Link to="/admin/finances" className={'nav-item' + (location.pathname === '/admin/finances' ? ' active' : '')}>
            <FaMoneyBillAlt className="nav-icon" />
            <span>Finances</span>
          </Link>
          <Link to="/admin/transactions" className={'nav-item' + (location.pathname === '/admin/transactions' ? ' active' : '')}>
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/messages" className={'nav-item' + (location.pathname === '/admin/messages' ? ' active' : '')}>
            <FaEnvelope className="nav-icon" />
            <span>Messages</span>
          </Link>
          <Link to="/admin/reports" className={'nav-item' + (location.pathname === '/admin/reports' ? ' active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>Reports</span>
          </Link>
          <Link to="/admin/settings" className={'nav-item' + (location.pathname === '/admin/settings' ? ' active' : '')}>
            <FaCog className="nav-icon" />
            <span>Settings</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="finance-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Admin Transactions</h1>
          </div>
          <div className="header-right">
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Admin')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="finance-content">
          <section className="transactions-intro">
            <h2 className="transactions-page-title">Transactions</h2>
            <p className="transactions-page-desc">View sales and payment transactions.</p>
          </section>

          <div className="stats-grid transactions-stats">
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Total</h3>
                <p className="stat-value">{dateFilteredPayments.length}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Approved</h3>
                <p className="stat-value">{cardsApprovedCount}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Revenue (Accountant)</h3>
                <p className="stat-value">TZS {formatPrice(accountantRevenue)}</p>
              </div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-info">
                <h3 className="stat-title">Loans</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalAmountRemain)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Cash</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalCash)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Bank Transfer</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalBankTransfer)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">M-Pesa</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalMpesa)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Mix by Yas</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalMixByYas)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Airtel Money</h3>
                <p className="stat-value">TZS {formatPrice(cardsTotalAirtelMoney)}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section">
            <div className="section-header">
              <h2>Transaction Records</h2>
              <div className="section-actions">
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select className="filter-select" value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
                    <option value="All">All payment methods</option>
                    {uniquePaymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className={'admin-operation-date-btn' + (showLoanOnly ? ' active' : '')}
                  onClick={() => setShowLoanOnly((v) => !v)}
                  title="Filter Loan payment type"
                >
                  <span>{showLoanOnly ? 'All Payment Types' : 'Loan Payment Type'}</span>
                </button>
                <button
                  type="button"
                  className={
                    'admin-operation-date-btn' +
                    (operationDateFilterOpen || dateFrom || dateTo ? ' active' : '')
                  }
                  onClick={() => setOperationDateFilterOpen((o) => !o)}
                  title="Filter by operation date (approval or creation)"
                >
                  <FaCalendarAlt aria-hidden />
                  <span>Operation date</span>
                  {(dateFrom || dateTo) && <span className="admin-date-filter-dot" aria-hidden />}
                </button>
                {operationDateFilterOpen && (
                  <div className="admin-operation-date-panel">
                    <div className="filter-group">
                      <label className="filter-label" htmlFor="admin-op-date-from">
                        From
                      </label>
                      <input
                        id="admin-op-date-from"
                        type="date"
                        className="filter-select"
                        value={dateFrom}
                        max={dateTo || undefined}
                        onChange={(e) => setDateFrom(e.target.value)}
                        title="From date"
                      />
                    </div>
                    <div className="filter-group">
                      <label className="filter-label" htmlFor="admin-op-date-to">
                        To
                      </label>
                      <input
                        id="admin-op-date-to"
                        type="date"
                        className="filter-select"
                        value={dateTo}
                        min={dateFrom || undefined}
                        onChange={(e) => setDateTo(e.target.value)}
                        title="To date"
                      />
                    </div>
                    {(dateFrom || dateTo) && (
                      <div className="filter-group">
                        <button
                          type="button"
                          className="filter-clear-dates"
                          onClick={() => {
                            setDateFrom('');
                            setDateTo('');
                          }}
                          title="Clear date filter"
                        >
                          Clear dates
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by customer, phone, or part..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button type="button" className="action-btn" onClick={handlePrint}>
                  Print Transactions
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total (TZS)</th>
                    <th>Payment Type</th>
                    <th>Payment</th>
                    <th>Received</th>
                    <th>Remain</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPaymentsForTable.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="no-data">
                        No approved transactions found
                      </td>
                    </tr>
                  ) : (
                    approvedPaymentsForTable.map((payment, index) => {
                      const total = Number(payment.total_amount) || 0;
                      const received = Number(payment.amount_received) || 0;
                      const amountRemain = total - received;
                      const displayStatus =
                        payment.status === 'Rejected'
                          ? 'Rejected'
                          : payment.status === 'Approved' || amountRemain === 0
                            ? 'Approved'
                            : 'Pending';

                      return (
                        <tr key={payment.id}>
                          <td>{index + 1}</td>
                          <td>{formatDateTime(payment.created_at)}</td>
                          <td>
                            <div className="txn-customer-cell">
                              <div className="txn-name">{highlightSearchText(capitalizeName(payment.customer_name))}</div>
                              {payment.customer_phone && <div className="txn-detail">{highlightSearchText(payment.customer_phone)}</div>}
                            </div>
                          </td>
                          <td>
                            {payment.items && payment.items.length > 0 ? (
                              <span>
                                {payment.items.map((item, idx) => (
                                  <React.Fragment key={`${payment.id}-item-${idx}`}>
                                    {highlightSearchText(`${capitalizeName(item.sparepart_name || 'Unknown')} (${Number(item.quantity) || 0})`)}
                                    {idx < payment.items.length - 1 && <br />}
                                  </React.Fragment>
                                ))}
                              </span>
                            ) : (
                              <span>{highlightSearchText(`${capitalizeName(payment.sparepart_name || '—')} (${Number(payment.quantity) || 0})`)}</span>
                            )}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(payment.total_amount)}</td>
                          <td>
                            <span className="payment-method-badge">{highlightSearchText(payment.payment_type || '—')}</span>
                          </td>
                          <td>
                            <span className="payment-method-badge">{highlightSearchText(payment.payment_method || '—')}</span>
                          </td>
                          <td className="txn-amount">
                            {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(Math.max(0, amountRemain))}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {highlightSearchText(displayStatus)}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title="View" onClick={() => handleView(payment)}>
                                <FaEye /> View
                              </button>
                              <button
                                className="action-btn reject"
                                title="Delete"
                                onClick={() => handleDeletePayment(payment)}
                                disabled={deletingPaymentId === payment.id}
                              >
                                <FaTrash /> {deletingPaymentId === payment.id ? 'Deleting...' : 'Delete'}
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
          </div>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="transactions-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div
            className="transactions-modal-content transactions-view-form-wrapper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="transactions-modal-header">
              <h3>Transaction Details</h3>
              <button type="button" className="transactions-modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>

            <div className="transactions-modal-body">
              <form className="txn-view-form" noValidate onSubmit={(e) => e.preventDefault()}>
                <fieldset className="txn-form-section">
                  <legend>Transaction</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment ID</label>
                      <div className="txn-form-value">#{selectedPayment.id}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Date &amp; time</label>
                      <div className="txn-form-value">{formatDateTime(selectedPayment.created_at)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Status</label>
                      <div className="txn-form-value">
                        {(() => {
                          const total = Number(selectedPayment.total_amount) || 0;
                          const received = Number(selectedPayment.amount_received) || 0;
                          const remain = total - received;
                          const displayStatus =
                            selectedPayment.status === 'Rejected'
                              ? 'Rejected'
                              : selectedPayment.status === 'Approved' || remain === 0
                                ? 'Approved'
                                : 'Pending';
                          return (
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Customer</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Name</label>
                      <div className="txn-form-value">{capitalizeName(selectedPayment.customer_name) || '—'}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Phone</label>
                      <div className="txn-form-value">{selectedPayment.customer_phone || '—'}</div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Items</legend>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="txn-items-table-wrap">
                      <table className="txn-items-table">
                        <thead>
                          <tr>
                            <th>Part</th>
                            <th>Part No.</th>
                            <th>Qty</th>
                            <th>Unit price (TZS)</th>
                            <th>Subtotal (TZS)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPayment.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{capitalizeName(item.sparepart_name || 'Unknown')}</td>
                              <td className="txn-detail">{(item.sparepart_number || 'N/A').toUpperCase()}</td>
                              <td>{item.quantity}</td>
                              <td>{formatPrice(item.unit_price)}</td>
                              <td>{formatPrice((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="txn-form-grid">
                      <div className="txn-form-field">
                        <label>Spare part</label>
                        <div className="txn-form-value">
                          {capitalizeName(selectedPayment.sparepart_name || '—')}
                          {selectedPayment.sparepart_number && (
                            <span className="txn-detail"> · {(selectedPayment.sparepart_number).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Payment</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment method</label>
                      <div className="txn-form-value">
                        <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Total amount (TZS)</label>
                      <div className="txn-form-value txn-amount">TZS {formatPrice(selectedPayment.total_amount)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount received (TZS)</label>
                      <div className="txn-form-value">
                        {selectedPayment.amount_received != null ? `TZS ${formatPrice(selectedPayment.amount_received)}` : '—'}
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount remaining (TZS)</label>
                      <div className="txn-form-value txn-amount">
                        TZS {formatPrice(Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0)))}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </form>
            </div>

            <div className="transactions-modal-footer">
              <button type="button" className="transactions-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTransactions;

