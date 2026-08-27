import React, { useState, useEffect, useRef } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaPrint,
  FaReceipt,
  FaCalendarAlt,
  FaEye,
  FaCreditCard,
  FaEdit
} from 'react-icons/fa';
import '../../sales/payments.css';
import './receipts.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments, updatePaymentDetails } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';
import { buildReceiptPrintDocument } from '../../../utils/receiptPrintHtml';

/**
 * Add the entered amount to the DB channel column that matches payment method.
 * Loan/Credit Card do not write to channel columns.
 */
function mergeReceiptPaymentChannelTotals(payment, paymentMethod, addAmount) {
  const add = Number(addAmount) || 0;
  let cash = Number(payment.cash) || 0;
  let bank_transfer = Number(payment.bank_transfer) || 0;
  let airtel_money = Number(payment.airtel_money) || 0;
  let mpesa = Number(payment.mpesa) || 0;
  let mix_by_yas = Number(payment.mix_by_yas) || 0;
  const m = String(paymentMethod || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (m === 'cash') cash += add;
  else if (m === 'bank transfer') bank_transfer += add;
  else if (m === 'airtel money') airtel_money += add;
  else if (m === 'm-pesa' || m === 'mpesa') mpesa += add;
  else if (m.includes('mix') && m.includes('yas')) mix_by_yas += add;
  return { cash, bank_transfer, airtel_money, mpesa, mix_by_yas };
}

/** Normalize selected payment method to footer label (for Mixed / display). */
function paymentMethodToSummaryLabel(method) {
  const m = String(method || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!m) return null;
  if (m === 'cash') return 'Cash';
  if (m === 'bank transfer') return 'Bank Transfer';
  if (m === 'airtel money') return 'Airtel Money';
  if (m === 'm-pesa' || m === 'mpesa') return 'M-Pesa';
  if (m.includes('mix') && m.includes('yas')) return 'Mix By Yas';
  if (m === 'credit card') return 'Credit Card';
  return String(method || '').trim();
}

function CashierReceipts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Day'); // 'All' | 'Day' | 'Week' | 'Month'
  const [receipts, setReceipts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [splitCashInput, setSplitCashInput] = useState('');
  const [splitBankInput, setSplitBankInput] = useState('');
  const [splitAirtelInput, setSplitAirtelInput] = useState('');
  const [splitMpesaInput, setSplitMpesaInput] = useState('');
  const [splitYasInput, setSplitYasInput] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const editSaveInFlightRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        if (
          !(
            (parsedUser.userType === 'employee' &&
              parsedUser.department === 'Finance' &&
              parsedUser.position === 'Cashier') ||
            parsedUser.userType === 'admin'
          )
        ) {
          navigate('/login');
          return;
        }
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
          setReceipts(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadPayments,
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

    return () => clearInterval(dateTimeInterval);
  }, [navigate]);

  // Load logo as data URL for printing
  useEffect(() => {
    if (typeof logo !== 'string' || !logo) return;
    const src = logo.startsWith('http')
      ? logo
      : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo);
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
    return <PageLoader message={t.loadingReceipts} />;
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

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // For split payments, prefer channel columns over single payment_method text.
  const getAppliedPaymentMethods = (payment) => {
    const channels = [
      { label: 'Cash', value: Number(payment?.cash) || 0 },
      { label: 'Bank Transfer', value: Number(payment?.bank_transfer) || 0 },
      { label: 'Airtel Money', value: Number(payment?.airtel_money) || 0 },
      { label: 'M-Pesa', value: Number(payment?.mpesa) || 0 },
      { label: 'Mix By Yas', value: Number(payment?.mix_by_yas) || 0 },
    ].filter((c) => c.value > 0);
    if (channels.length > 0) return channels;
    const fallback = String(payment?.payment_method || '').trim();
    return fallback ? [{ label: fallback, value: Number(payment?.amount_received) || 0 }] : [];
  };

  const getTotalAmount = (receipt) => {
    // Base total from items
    let baseTotal = 0;

    if (receipt.items && receipt.items.length > 0) {
      baseTotal = receipt.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    } else {
      const qty = Number(receipt.quantity) || 0;
      const unit = Number(receipt.unit_price) || 0;
      baseTotal = qty * unit;
    }

    // Payable total must consider discount_amount
    const discount = Number(receipt.discount_amount) || 0;
    return Math.max(0, baseTotal - discount);
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

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || t.pending;
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleEdit = (payment) => {
    editSaveInFlightRef.current = false;
    setSelectedPayment(payment);
    setEditPaymentMethod(String(payment?.payment_method || '').trim());
    // Start with an empty editable field; keep original amount visible in the read-only field
    setEditAmountReceived('');
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
    setShowEditModal(true);
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

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    if (editSaveInFlightRef.current || editSaving) return;
    // Lock immediately so double-clicks cannot both pass validation before React re-renders `editSaving`.
    editSaveInFlightRef.current = true;
    const primaryAdd = parseCommaNumber(editAmountReceived);
    const splitCash = parseCommaNumber(splitCashInput);
    const splitBank = parseCommaNumber(splitBankInput);
    const splitAirtel = parseCommaNumber(splitAirtelInput);
    const splitMpesa = parseCommaNumber(splitMpesaInput);
    const splitYas = parseCommaNumber(splitYasInput);
    const splitTotal = splitCash + splitBank + splitAirtel + splitMpesa + splitYas;
    const amountToAdd = primaryAdd + splitTotal;
    if (amountToAdd <= 0) {
      editSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter an amount greater than 0.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    const selectedMethod = String(editPaymentMethod || '').trim();
    if (primaryAdd > 0 && !selectedMethod) {
      editSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select payment method.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    const currentAmountReceived = Number(selectedPayment.amount_received) || 0;
    const newAmountReceived = currentAmountReceived + amountToAdd;
    const total = getTotalAmount(selectedPayment);
    const amountRemain = Math.max(0, total - newAmountReceived);

    const splitLabels = [
      splitCash > 0 ? 'Cash' : null,
      splitBank > 0 ? 'Bank Transfer' : null,
      splitAirtel > 0 ? 'Airtel Money' : null,
      splitMpesa > 0 ? 'M-Pesa' : null,
      splitYas > 0 ? 'Mix By Yas' : null,
    ].filter(Boolean);

    const methodLabels = new Set(splitLabels);
    if (primaryAdd > 0) {
      const pl = paymentMethodToSummaryLabel(selectedMethod);
      if (pl) methodLabels.add(pl);
    }

    const labelArr = [...methodLabels];
    const effectivePaymentMethod =
      labelArr.length > 1 ? 'Mixed' : labelArr.length === 1 ? labelArr[0] : selectedMethod || 'Mixed';

    // Split rows add to each channel; primary "Amount received" adds to the column for the selected method.
    const basePayment = {
      ...selectedPayment,
      cash: (Number(selectedPayment.cash) || 0) + splitCash,
      bank_transfer: (Number(selectedPayment.bank_transfer) || 0) + splitBank,
      airtel_money: (Number(selectedPayment.airtel_money) || 0) + splitAirtel,
      mpesa: (Number(selectedPayment.mpesa) || 0) + splitMpesa,
      mix_by_yas: (Number(selectedPayment.mix_by_yas) || 0) + splitYas,
    };
    const channelTotals = mergeReceiptPaymentChannelTotals(basePayment, selectedMethod, primaryAdd);
    try {
      setEditSaving(true);
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newAmountReceived,
        amount_remain: amountRemain,
        payment_method: effectivePaymentMethod,
        payment_type: selectedPayment.payment_type,
        cash: channelTotals.cash,
        bank_transfer: channelTotals.bank_transfer,
        airtel_money: channelTotals.airtel_money,
        mpesa: channelTotals.mpesa,
        mix_by_yas: channelTotals.mix_by_yas,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');
      
      // Reload payments to get updated data
      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setReceipts(paymentsResponse.payments);
      }
      
      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Amount received updated successfully.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update amount received.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setEditSaving(false);
      editSaveInFlightRef.current = false;
    }
  };

  const handlePrint = (receipt) => {
    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const printContent = buildReceiptPrintDocument(receipt, logoSrc);

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the receipt.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 100);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 100);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isReceiptInDateRange = (createdAt) => {
    const d = new Date(createdAt);
    d.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const p = d.getTime();
    if (dateFilter === 'Day') {
      return p === t;
    }
    if (dateFilter === 'Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return p >= weekAgo.getTime() && p <= t;
    }
    if (dateFilter === 'Month') {
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    return true; // 'All'
  };

  /** Approved sales: filter by approval day, not order creation day. */
  const getApprovalInstantForFilter = (r) =>
    r.approved_at || r.approvedAt || r.confirmed_at || r.updated_at || r.created_at;

  const formatReceiptListDate = (r) =>
    formatDateTime(getApprovalInstantForFilter(r));

  const receiptMatchesSearch = (r) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (r.customer_name && r.customer_name.toLowerCase().includes(term)) ||
      (r.customer_phone && r.customer_phone.includes(searchTerm)) ||
      (r.sparepart_name && r.sparepart_name.toLowerCase().includes(term)) ||
      (r.sparepart_number && r.sparepart_number.toLowerCase().includes(term)) ||
      String(r.id).includes(searchTerm)
    );
  };

  /** Receipts table: approved sales only; date range uses approval time (not created_at). */
  const filteredReceipts = receipts.filter((r) => {
    if (String(r.status || '').trim() !== 'Approved') return false;
    if (String(r.payment_type || '').trim().toLowerCase() !== 'sales') return false;
    if ((Number(r.amount_received) || 0) !== 0) return false;
    if (!isReceiptInDateRange(getApprovalInstantForFilter(r))) return false;
    return receiptMatchesSearch(r);
  });

  const returnsCount = receipts.filter((r) => {
    if (String(r.status || '').trim() !== 'Returned') return false;
    if (!isReceiptInDateRange(r.updated_at || r.created_at)) return false;
    return receiptMatchesSearch(r);
  }).length;

  return (
    <div className="payments-container receipts-page">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/finance/cashier/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/finance/cashier/receipts" className="nav-item active">
            <FaFileInvoice className="nav-icon" />
            <span>{t.payments || 'Payments'}</span>
          </Link>
          <Link to="/finance/cashier/transactions" className="nav-item">
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/finance/cashier/reports" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="payments-header receipts-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">Receipts</h1>
          </div>

          <div className="header-right">
            <div className="date-time-display" style={{ 
              marginRight: '20px', 
              fontSize: '14px', 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">
                {capitalizeName(user?.full_name || user?.username || 'Cashier')}
              </span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="payments-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchByPaymentCustomerPhoneSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allDates}</option>
                <option value="Day">{t.todayFilter}</option>
                <option value="Week">{t.last7Days}</option>
                <option value="Month">{t.thisMonth}</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.paymentsLabel}</h3>
                <p className="stat-value">{filteredReceipts.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.amountReceived}</h3>
                <p className="stat-value">
                  TZS {formatPrice(filteredReceipts.reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0))}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Returns</h3>
                <p className="stat-value">{returnsCount}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.receiptNum}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.paymentType || 'Payment Type'}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.date}</th>
                  <th>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="no-data">
                      {t.noPaymentsFound}
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.viewDetails}
                            onClick={() => handleView(r)}
                          >
                            <FaEye className="action-icon" />
                          </button>
                          <button
                            className="action-btn edit"
                            title="Edit Amount Received"
                            onClick={() => handleEdit(r)}
                          >
                            <FaEdit className="action-icon" />
                          </button>
                          <button
                            className="action-btn print"
                            title={r.status === 'Approved' ? t.printReceipt : t.print}
                            onClick={() => r.status === 'Approved' && handlePrint(r)}
                            disabled={r.status !== 'Approved'}
                          >
                            <FaPrint className="action-icon" />
                          </button>
                        </div>
                      </td>
                      <td>#{r.id}</td>
                      <td>
                        <div className="customer-info">
                          <FaUsers className="info-icon" />
                          <div>
                            <div className="info-name">
                              {capitalizeName(r.customer_name)}
                            </div>
                            <div className="info-detail">{r.customer_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.items && r.items.length > 0 ? (
                          <div>
                            {r.items.map((item, idx) => (
                              <div key={idx} className="part-info" style={{ marginBottom: idx < r.items.length - 1 ? '8px' : '0' }}>
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                  <div className="info-detail">{(item.sparepart_number || 'N/A').toUpperCase()} - {t.qty}: {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">
                                {capitalizeName(r.sparepart_name || 'Unknown')}
                              </div>
                              <div className="info-detail">
                                {r.sparepart_number?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {String(r.payment_type || '—').trim() || '—'}
                        </span>
                      </td>
                      <td className="amount-cell">
                        TZS {formatPrice(getTotalAmount(r))}
                      </td>
                      <td className="amount-cell">
                        {r.amount_received != null
                          ? `TZS ${formatPrice(r.amount_received)}`
                          : '—'}
                      </td>
                      <td className="amount-cell">
                        {(() => {
                          const baseTotal = getTotalAmount(r);
                          const discount = Number(r.discount_amount) || 0;
                          // Total after discount (if any)
                          const totalAfterDiscount = Math.max(0, baseTotal - discount);
                          const received = Number(r.amount_received) || 0;
                          const remain = Math.max(0, totalAfterDiscount - received);
                          return `TZS ${formatPrice(remain)}`;
                        })()}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {getAppliedPaymentMethods(r).length > 0
                            ? getAppliedPaymentMethods(r).map((m, idx) => (
                                <span key={idx} style={{ display: 'block' }}>
                                  {m.label}{m.value > 0 ? ` ${formatPrice(m.value)}` : ''}
                                </span>
                              ))
                            : '—'}
                        </span>
                      </td>
                      <td>{formatReceiptListDate(r)}</td>
                      <td>
                        <span className={`status-badge ${
                          r.status === 'Approved' ? 'approved' :
                          r.status === 'Rejected' ? 'rejected' : 'pending'
                        }`}>
                          {r.status === 'Approved' && <FaCheckCircle />}
                          {r.status === 'Rejected' && <FaTimesCircle />}
                          {r.status === 'Pending' && <FaClock />}
                          {r.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Payment Modal */}
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
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.spareParts} ({selectedPayment.items.length})</label>
                      <div className="view-value">
                        {selectedPayment.items.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0', paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0', borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none' }}>
                            <div style={{ fontWeight: '500', marginBottom: '5px' }}>{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>{t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()} | {t.qty}: {item.quantity}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.sparePart}</label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.sparepart_number?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.quantity}</label>
                      <div className="view-value">{selectedPayment.quantity}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.unitPrice}</label>
                      <div className="view-value">TZS {formatPrice(selectedPayment.unit_price)}</div>
                    </div>
                  </>
                )}
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>TZS {formatPrice(getTotalAmount(selectedPayment))}</div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentMethod}</label>
                  <div className="view-value">
                    <span className="payment-method-badge">
                      {getAppliedPaymentMethods(selectedPayment).length > 0
                        ? getAppliedPaymentMethods(selectedPayment).map((m, idx) => (
                            <span key={idx} style={{ display: 'block' }}>
                              {m.label}{m.value > 0 ? ` ${formatPrice(m.value)}` : ''}
                            </span>
                          ))
                        : '—'}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPayment.status === 'Approved' ? 'approved' : selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {getStatusLabel(selectedPayment.status || 'Pending')}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.date}</label>
                  <div className="view-value">{formatReceiptListDate(selectedPayment)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedPayment.status === 'Approved' && (
                <button className="action-btn print" onClick={() => handlePrint(selectedPayment)} style={{ marginRight: '10px' }}>
                  <FaPrint className="action-icon" />
                  <span className="action-text">{t.print}</span>
                </button>
              )}
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Amount Received Modal */}
      {showEditModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!editSaving) setShowEditModal(false);
          }}
        >
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Amount Received</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  if (!editSaving) setShowEditModal(false);
                }}
                disabled={editSaving}
              >
                ×
              </button>
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
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.discount || 'Discount'}</label>
                  <div className="view-value" style={{ fontWeight: 600 }}>
                    TZS {formatPrice(Number(selectedPayment.discount_amount) || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Total Amount Received</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formatPrice(selectedPayment.amount_received || 0)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px',
                      backgroundColor: '#f8f9fa',
                      color: '#495057',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <div className="view-item">
                  <label>{t.paymentType || 'Payment Type'}</label>
                  <div
                    className="view-value"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px',
                      backgroundColor: '#f8f9fa',
                      color: '#495057'
                    }}
                  >
                    {String(selectedPayment.payment_type || '—').trim() || '—'}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.paymentMethod}</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px',
                      backgroundColor: 'white',
                      color: '#495057'
                    }}
                  >
                    <option value="">Select Payment Method</option>
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Mix By Yas">Mix By Yas</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                  </select>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={formatWithCommas(editAmountReceived)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      const parts = v.split('.');
                      const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                      setEditAmountReceived(filtered);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px'
                    }}
                  />
                </div>
                <div className="view-item">
                  <label>Split payment (optional)</label>
                  <div className="view-value" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" inputMode="decimal" className="form-control" placeholder="Cash" value={splitCashInput} onChange={(e) => setSplitCashInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="form-control" placeholder="Bank Transfer" value={splitBankInput} onChange={(e) => setSplitBankInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="form-control" placeholder="Airtel Money" value={splitAirtelInput} onChange={(e) => setSplitAirtelInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="form-control" placeholder="M-Pesa" value={splitMpesaInput} onChange={(e) => setSplitMpesaInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="form-control" placeholder="Mix By Yas" value={splitYasInput} onChange={(e) => setSplitYasInput(e.target.value.replace(/[^\d.]/g, ''))} />
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Remain</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(
                      Math.max(
                        0,
                        getTotalAmount(selectedPayment) -
                          (Number(selectedPayment.amount_received) || 0) -
                          parseCommaNumber(editAmountReceived) -
                          parseCommaNumber(splitCashInput) -
                          parseCommaNumber(splitBankInput) -
                          parseCommaNumber(splitAirtelInput) -
                          parseCommaNumber(splitMpesaInput) -
                          parseCommaNumber(splitYasInput)
                      )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPayment.status === 'Approved' ? 'approved' : selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {getStatusLabel(selectedPayment.status || 'Pending')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  if (!editSaving) setShowEditModal(false);
                }}
                disabled={editSaving}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                disabled={editSaving}
                style={{ padding: '10px 20px', marginLeft: '10px' }}
              >
                {editSaving ? 'Saving...' : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierReceipts;

