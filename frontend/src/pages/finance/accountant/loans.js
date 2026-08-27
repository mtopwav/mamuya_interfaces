import React, { useEffect, useState } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaBars,
  FaBox,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaCheckCircle,
  FaClock,
  FaCreditCard,
  FaDownload,
  FaEdit,
  FaEye,
  FaFileInvoice,
  FaMoneyBillWave,
  FaPrint,
  FaReceipt,
  FaSearch,
  FaSignOutAlt,
  FaTimesCircle,
  FaUser,
  FaUsers,
} from 'react-icons/fa';
import '../../sales/payments.css';
import '../../manager/loans.css';
import logo from '../../../images/logo.png';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import { getPayments, updatePaymentDetails, updatePaymentStatus } from '../../../services/api';
import { getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

function AccountantLoans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [now, setNow] = useState(() => new Date());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' && parsedUser.department === 'Finance');
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch {
        setLoading(false);
        setTimeout(() => navigate('/login'), 1000);
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
        if (response.success && response.payments) setPayments(response.payments);
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load loans.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    loadPayments();

    const intervalId = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
      setNow(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
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
    return String(name)
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatWithCommas = (val) => {
    const s = String(val || '').replace(/[^\d.]/g, '');
    if (!s) return '';
    const parts = s.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1].slice(0, 2) : intPart;
  };

  const parseCommaNumber = (val) => {
    const s = String(val || '').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  // Time filter: all = all transactions; today = only today; week = last 7 days; month = last 30 days
  const isInTimeRange = (dateString, range) => {
    if (!dateString || range === 'all') return true;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return false;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const txTime = d.getTime();
    if (range === 'today') return txTime >= todayStart.getTime() && txTime <= todayEnd.getTime();
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
      if (Number.isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateString;
    }
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    setEditAmountReceived('');
    setShowEditModal(true);
  };

  const performStatusChange = async (payment, newStatus) => {
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId);
      if (!response.success) throw new Error(response.message || 'Failed to update status');
      setPayments((prev) => prev.map((p) => (p.id === payment.id ? { ...p, status: newStatus } : p)));
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Loan ${newStatus.toLowerCase()} successfully.`,
        confirmButtonColor: '#1a3a5f',
      });
      return true;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update loan status.',
        confirmButtonColor: '#1a3a5f',
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const result = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Loan`,
      text: `Are you sure you want to ${actionText} this loan?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`,
    });
    if (!result.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  // Helper: get amount remain for a payment (from DB or calculated)
  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const isMpesaPaymentMethod = (method) => {
    const raw = String(method || '').toLowerCase().trim();
    if (!raw) return false;
    const compact = raw.replace(/[^a-z0-9]/g, '');
    return compact.includes('mpesa');
  };

  const isAirtelMoneyPaymentMethod = (method) => {
    const raw = String(method || '').toLowerCase().trim();
    if (!raw) return false;
    const compact = raw.replace(/[^a-z0-9]/g, '');
    return compact.includes('airtel');
  };

  const isYasPaymentMethod = (method) => {
    const raw = String(method || '').toLowerCase().trim();
    if (!raw) return false;
    const compact = raw.replace(/[^a-z0-9]/g, '');
    return compact.includes('yas');
  };

  const isLoanPaymentType = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';

  // Base list: only payments where amount_remain > 0, then filter by search/status/time
  const loansWithRemain = payments.filter((p) => getAmountRemain(p) > 0);

  const filteredLoans = loansWithRemain.filter((payment) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && String(payment.customer_phone).includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name?.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    // Show only approved loans on accountant loans page
    const matchesStatus = payment.status === 'Approved';

    const matchesTime = isInTimeRange(payment.created_at, timeFilter);
    return matchesSearch && matchesStatus && matchesTime;
  });

  // Sort by date and time (newest first)
  const sortedFilteredLoans = [...filteredLoans].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const approvedLoansCount = loansWithRemain.filter((p) => p.status === 'Approved').length;

  const totalAmountRemain = filteredLoans.reduce((sum, p) => {
    const amountRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    const discount = p.discount_amount != null ? Number(p.discount_amount) : 0;
    if (amountRemain != null && !Number.isNaN(amountRemain)) {
      const displayRemain = discount > 0 ? Math.max(0, amountRemain - discount) : amountRemain;
      return sum + displayRemain;
    }
    const total = Number(p.total_amount) || 0;
    const totalAfterDiscount = Math.max(0, total - discount);
    const received = Number(p.amount_received) || 0;
    return sum + Math.max(0, totalAfterDiscount - received);
  }, 0);

  const totalLoanAmount = filteredLoans.reduce((sum, p) => {
    const baseTotal = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const totalAfterDiscount = Math.max(0, baseTotal - discount);
    return sum + totalAfterDiscount;
  }, 0);

  // Loan Paid breakdown for the selected day/range (timeFilter)
  const loanPaidPayments = payments.filter((p) => {
    if (!isLoanPaymentType(p)) return false;
    if (p.status !== 'Approved') return false;
    const received = Number(p.amount_received) || 0;
    if (received <= 0) return false;
    if (!isInTimeRange(p.created_at, timeFilter)) return false;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const netDue = Math.max(0, total - discount);
    if (netDue <= 0) return false;
    const remain = getAmountRemain(p);
    if (Number.isNaN(remain)) return false;
    return true; // remain === 0 (paid) or remain > 0 (debt reduced)
  });

  const loanPaidTotal = loanPaidPayments.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
  const loanPaidCashTotal = loanPaidPayments.reduce(
    (sum, p) => ((p.payment_method || '').toLowerCase() === 'cash' ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );
  const loanPaidBankTransferTotal = loanPaidPayments.reduce(
    (sum, p) =>
      ((p.payment_method || '').toLowerCase() === 'bank transfer' ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );
  const loanPaidAirtelMoneyTotal = loanPaidPayments.reduce(
    (sum, p) => (isAirtelMoneyPaymentMethod(p.payment_method) ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );
  const loanPaidMpesaTotal = loanPaidPayments.reduce(
    (sum, p) => (isMpesaPaymentMethod(p.payment_method) ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );
  const loanPaidYasTotal = loanPaidPayments.reduce(
    (sum, p) => (isYasPaymentMethod(p.payment_method) ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    const amountToAdd = parseCommaNumber(editAmountReceived);
    if (amountToAdd <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter an amount greater than 0.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const currentAmountReceived = Number(selectedPayment.amount_received) || 0;
    const newAmountReceived = currentAmountReceived + amountToAdd;
    const total = Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.discount_amount) || 0));
    const amountRemain = Math.max(0, total - newAmountReceived);
    setEditSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newAmountReceived,
        amount_remain: amountRemain,
        payment_method: selectedPayment.payment_method || null,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
      }
      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Amount received updated successfully.',
        confirmButtonColor: '#1a3a5f',
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update amount received.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handlePrintLoans = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : logo && logo.default ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const timeLabel =
      timeFilter === 'all'
        ? 'All time'
        : timeFilter === 'today'
        ? 'Today'
        : timeFilter === 'week'
        ? 'Last 7 days'
        : 'Last 30 days';

    const statusLabel = 'Approved';

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">${t.customer}</th>
                <th class="tr">${t.amountRemain}</th>
                <th class="tr">Discount</th>
                <th class="tc">${t.paymentMethod}</th>
                <th class="tc">${t.status}</th>
                <th class="tl">${t.date}</th>
              </tr>
            </thead>`;

    const rowsHtml =
      sortedFilteredLoans.length === 0
        ? `<tbody><tr><td colspan="7" style="text-align:center;padding:12px;">${t.noTransactionsFound || 'No loans found'}</td></tr></tbody>`
        : '<tbody>' +
          sortedFilteredLoans
            .map((p, idx) => {
              const remain = getAmountRemain(p);
              const discount = Number(p.discount_amount) || 0;
              const displayRemain = discount > 0 ? Math.max(0, remain - discount) : remain;
              const status = p.status === 'Approved' ? (t.approved || 'Approved') : p.status === 'Rejected' ? (t.rejected || 'Rejected') : (t.pending || 'Pending');
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}<br /><span style="color:#666;">${(p.customer_phone || '—').replace(/</g, '&lt;')}</span></td>
                  <td class="tr">${formatPrice(displayRemain)}</td>
                  <td class="tr">${formatPrice(discount)}</td>
                  <td class="tc">${(p.payment_method || '—').replace(/</g, '&lt;')}</td>
                  <td class="tc">${status}</td>
                  <td class="tl">${formatDateTime(p.created_at)}</td>
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
          <title>Loans Report - Mamuya Auto Spare Parts</title>
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
              <p><strong>Report:</strong> Loans</p>
              <p><strong>Status:</strong> ${statusLabel}</p>
              <p><strong>Period:</strong> ${timeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Accountant').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">LOANS REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total loans:</label> ${sortedFilteredLoans.length}</div>
            <div class="tax-inv-footer-row"><label>Total loan amount (TZS):</label> ${formatPrice(totalLoanAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount remain (TZS):</label> ${formatPrice(totalAmountRemain)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated loans report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

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
          <Link
            to="/finance/accountant/dashboard"
            className={'nav-item ' + (location.pathname === '/finance/accountant/dashboard' ? 'active' : '')}
          >
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/finance/accountant/transactions"
            className={'nav-item ' + (location.pathname === '/finance/accountant/transactions' ? 'active' : '')}
          >
            <FaReceipt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link
            to="/finance/accountant/loans"
            className={'nav-item ' + (location.pathname === '/finance/accountant/loans' ? 'active' : '')}
          >
            <FaMoneyBillWave className="nav-icon" />
            <span>Loans</span>
          </Link>
          <Link
            to="/finance/accountant/expenses"
            className={'nav-item ' + (location.pathname === '/finance/accountant/expenses' ? 'active' : '')}
          >
            <FaMoneyBillWave className="nav-icon" />
            <span>Expenses</span>
          </Link>
          <Link
            to="/finance/accountant/revenues"
            className={'nav-item ' + (location.pathname === '/finance/accountant/revenues' ? 'active' : '')}
          >
            <FaChartBar className="nav-icon" />
            <span>Revenues</span>
          </Link>
          <Link
            to="/finance/accountant/invoices"
            className={'nav-item ' + (location.pathname === '/finance/accountant/invoices' ? 'active' : '')}
          >
            <FaFileInvoice className="nav-icon" />
            <span>Invoices</span>
          </Link>
          <Link
            to="/finance/accountant/salaries"
            className={'nav-item ' + (location.pathname === '/finance/accountant/salaries' ? 'active' : '')}
          >
            <FaMoneyBillWave className="nav-icon" />
            <span>Salaries</span>
          </Link>
          <Link
            to="/finance/accountant/reports"
            className={'nav-item ' + (location.pathname === '/finance/accountant/reports' ? 'active' : '')}
          >
            <FaChartBar className="nav-icon" />
            <span>Reports</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Loans</h1>
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
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Accountant')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout || 'Logout'}
            </button>
          </div>
        </header>

        <div className="payments-content">
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
              <label style={{ fontSize: 12, color: '#5b6b7a', fontWeight: 600 }}>Period</label>
              <select
                className="status-filter"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 10 }}
                title="Filter by period"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
              </select>
            </div>
            {(timeFilter !== 'all' || searchTerm) ? (
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setSearchTerm('');
                  setTimeFilter('all');
                }}
                title="Clear filters"
              >
                Clear
              </button>
            ) : null}
            <button className="action-btn print" onClick={handlePrintLoans} title={t.printReport || 'Print report'}>
              <FaPrint className="action-icon" />
              <span className="action-text">{t.printReport || 'Print report'}</span>
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalTransactions}</h3>
                <p className="stat-value">{loansWithRemain.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedLoansCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.amountRemain}</h3>
                <p className="stat-value">TZS {formatPrice(totalAmountRemain)}</p>
              </div>
            </div>
          </div>

          <div className="stats-row" style={{ marginTop: 18 }}>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Loan Paid</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidTotal)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Cash</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidCashTotal)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Bank Transfer</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidBankTransferTotal)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Airtel Money</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidAirtelMoneyTotal)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>M-Pesa</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidMpesaTotal)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Mix by YAS</h3>
                <p className="stat-value">TZS {formatPrice(loanPaidYasTotal)}</p>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.customer}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.discount || 'Discount'}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {t.noTransactionsFound || 'No loans found'}
                    </td>
                  </tr>
                ) : (
                  sortedFilteredLoans.map((payment) => {
                    const remain = getAmountRemain(payment);
                    const discount = Number(payment.discount_amount) || 0;
                    const displayRemain = discount > 0 ? Math.max(0, remain - discount) : remain;
                    const displayStatus =
                      payment.status === 'Rejected'
                        ? 'Rejected'
                        : payment.status === 'Approved'
                        ? 'Approved'
                        : 'Pending';
                    const needsApproval = payment.status === 'Pending';

                    return (
                      <tr key={payment.id}>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title={t.details} onClick={() => handleView(payment)}>
                              <FaEye className="action-icon" />
                            </button>
                            <button className="action-btn print" title={t.print} onClick={() => handleView(payment)}>
                              <FaPrint className="action-icon" />
                            </button>
                            {needsApproval && (
                              <>
                                <button className="action-btn edit" title={t.edit || 'Edit'} onClick={() => handleEdit(payment)}>
                                  <FaEdit className="action-icon" />
                                </button>
                                <button className="action-btn approve" title={t.approve} onClick={() => handleChangeStatus(payment, 'Approved')}>
                                  <FaCheckCircle className="action-icon" />
                                </button>
                                <button className="action-btn reject" title={t.reject} onClick={() => handleChangeStatus(payment, 'Rejected')}>
                                  <FaTimesCircle className="action-icon" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="customer-info">
                            <FaUsers className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                              <div className="info-detail">{payment.customer_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="amount-cell">TZS {formatPrice(displayRemain)}</td>
                        <td className="amount-cell">TZS {formatPrice(discount)}</td>
                        <td>
                          <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                        </td>
                        <td>
                          <span className={`status-badge ${displayStatus === 'Approved' ? 'approved' : displayStatus === 'Rejected' ? 'rejected' : 'pending'}`}>
                            {displayStatus === 'Approved' && <FaCheckCircle />}
                            {displayStatus === 'Rejected' && <FaTimesCircle />}
                            {displayStatus === 'Pending' && <FaClock />}
                            {displayStatus === 'Approved' ? t.approved : displayStatus === 'Rejected' ? t.rejected : t.pending}
                          </span>
                        </td>
                        <td>{formatDateTime(payment.created_at)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.paymentDetails}</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentId}</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> {t.customer}</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(selectedPayment.total_amount)}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <div className="view-value">TZS {formatPrice(selectedPayment.amount_received || 0)}</div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain}</label>
                  <div className="view-value">TZS {formatPrice(getAmountRemain(selectedPayment))}</div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentMethod}</label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">{selectedPayment.status}</div>
                </div>
                <div className="view-item">
                  <label>{t.date}</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.edit || 'Edit'}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="loan-edit-input"
                    value={formatWithCommas(editAmountReceived)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      const parts = v.split('.');
                      const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                      setEditAmountReceived(filtered);
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={editSaving}>
                {t.cancel || 'Cancel'}
              </button>
              <button className="action-btn primary" onClick={handleSaveEdit} disabled={editSaving} style={{ marginLeft: '10px' }}>
                {editSaving ? (t.processing || 'Saving...') : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantLoans;

