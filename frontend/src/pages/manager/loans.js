import React, { useState, useEffect, useRef } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEdit,
  FaEye,
  FaTrashAlt,
  FaCalendarAlt,
  FaCreditCard,
  FaPrint,
  FaDownload,
  FaEnvelope
} from 'react-icons/fa';
import '../sales/payments.css';
import './loans.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments, updatePaymentDetails, createLoanFromPayment, deletePayment, getSpareParts } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerLoans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [oldLoansSearchTerm, setOldLoansSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showPaidTodayOnly, setShowPaidTodayOnly] = useState(false);
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [now, setNow] = useState(() => new Date());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [splitCashInput, setSplitCashInput] = useState('');
  const [splitBankInput, setSplitBankInput] = useState('');
  const [splitAirtelInput, setSplitAirtelInput] = useState('');
  const [splitMpesaInput, setSplitMpesaInput] = useState('');
  const [splitYasInput, setSplitYasInput] = useState('');
  const [sparepartsOptions, setSparepartsOptions] = useState([]);
  const [sparepartIdInput, setSparepartIdInput] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [addLoanPaymentId, setAddLoanPaymentId] = useState('');
  const [addLoanCustomerIdInput, setAddLoanCustomerIdInput] = useState('');
  const [addLoanCustomerNameInput, setAddLoanCustomerNameInput] = useState('');
  const [addLoanCustomerPhoneInput, setAddLoanCustomerPhoneInput] = useState('');
  const [addLoanSparepartsInput, setAddLoanSparepartsInput] = useState('');
  const [addLoanTotalAmountInput, setAddLoanTotalAmountInput] = useState('');
  const [addLoanCashInput, setAddLoanCashInput] = useState('');
  const [addLoanBankTransferInput, setAddLoanBankTransferInput] = useState('');
  const [addLoanAirtelMoneyInput, setAddLoanAirtelMoneyInput] = useState('');
  const [addLoanMpesaInput, setAddLoanMpesaInput] = useState('');
  const [addLoanMixByYasInput, setAddLoanMixByYasInput] = useState('');
  const [addLoanDiscountInput, setAddLoanDiscountInput] = useState('');
  const [addLoanAmountReceivedInput, setAddLoanAmountReceivedInput] = useState('');
  const [addLoanAmountRemainInput, setAddLoanAmountRemainInput] = useState('');
  const [addLoanStatus, setAddLoanStatus] = useState('Pending');
  const [addLoanSaving, setAddLoanSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const editSaveInFlightRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' &&
            (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'));
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
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
        const [response, sparepartsResponse] = await Promise.all([
          getPayments(),
          getSpareParts()
        ]);
        if (response.success && response.payments) setPayments(response.payments);
        if (sparepartsResponse.success && Array.isArray(sparepartsResponse.spareparts)) {
          setSparepartsOptions(sparepartsResponse.spareparts);
        }
      } catch (error) {
        console.error('Error loading loans:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load loans.',
          confirmButtonColor: '#1a3a5f'
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
      cancelButtonText: 'Cancel'
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

  /** Pre-discount total from line items; falls back to total_amount + discount if DB total is already net. */
  const getLoanGrossTotal = (payment) => {
    if (!payment) return 0;
    if (payment.items && payment.items.length > 0) {
      const fromItems = payment.items.reduce((sum, item) => {
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
        return sum + itemTotal;
      }, 0);
      if (fromItems > 0) return fromItems;
    }
    const qty = Number(payment.quantity) || 0;
    const unit = Number(payment.unit_price) || 0;
    const fromSingle = qty * unit;
    if (fromSingle > 0) return fromSingle;
    const discount = Number(payment.discount_amount) || 0;
    const fromDb = Number(payment.total_amount) || 0;
    return discount > 0 ? fromDb + discount : fromDb;
  };

  const getLoanDiscountAmount = (payment) => Number(payment?.discount_amount) || 0;

  const getLoanNetTotal = (payment) => {
    const gross = getLoanGrossTotal(payment);
    const discount = getLoanDiscountAmount(payment);
    return Math.max(0, gross - discount);
  };

  function mergeLoanPaymentChannelTotals(payment, paymentMethod, addAmount) {
    const add = Number(addAmount) || 0;
    let cash = Number(payment.cash) || 0;
    let bank_transfer = Number(payment.bank_transfer) || 0;
    let airtel_money = Number(payment.airtel_money) || 0;
    let mpesa = Number(payment.mpesa) || 0;
    let mix_by_yas = Number(payment.mix_by_yas) || 0;
    const m = String(paymentMethod || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (m === 'cash') cash += add;
    else if (m === 'bank transfer') bank_transfer += add;
    else if (m === 'airtel money') airtel_money += add;
    else if (m === 'm-pesa' || m === 'mpesa') mpesa += add;
    else if (m.includes('mix') && m.includes('yas')) mix_by_yas += add;
    return { cash, bank_transfer, airtel_money, mpesa, mix_by_yas };
  }

  // Time filter: all | today | week | month | custom (from/to calendar dates)
  const isInTimeRange = (dateString, range, dateFromStr = '', dateToStr = '') => {
    if (!dateString || range === 'all') return true;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const txTime = d.getTime();

    if (range === 'custom') {
      const from = String(dateFromStr || '').trim();
      const to = String(dateToStr || '').trim();
      if (!from || !to) return true;
      const d0 = new Date(from);
      const d1 = new Date(to);
      if (isNaN(d0.getTime()) || isNaN(d1.getTime())) return true;
      const start = new Date(Math.min(d0.getTime(), d1.getTime()));
      start.setHours(0, 0, 0, 0);
      const end = new Date(Math.max(d0.getTime(), d1.getTime()));
      end.setHours(23, 59, 59, 999);
      return txTime >= start.getTime() && txTime <= end.getTime();
    }

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const todayStartTime = todayStart.getTime();
    const todayEndTime = todayEnd.getTime();
    if (range === 'today') {
      return txTime >= todayStartTime && txTime <= todayEndTime;
    }
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

  const getDateRangeLabel = () => {
    if (timeFilter === 'custom') {
      if (customDateFrom && customDateTo) return `${customDateFrom} – ${customDateTo}`;
      return 'Custom range';
    }
    if (timeFilter === 'today') return 'Today';
    if (timeFilter === 'week') return 'Last 7 days';
    if (timeFilter === 'month') return 'Last 30 days';
    return 'All time';
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

  // Countdown until 24h after approval. Decreases every second. Format: HH:MM:SS.
  const formatSendMessageCountdown = (approvedAt) => {
    if (!approvedAt) return '—';
    try {
      const approved = new Date(approvedAt);
      if (isNaN(approved.getTime())) return '—';
      const deadline = new Date(approved.getTime() + 24 * 60 * 60 * 1000);
      const remainingMs = deadline.getTime() - now.getTime();
      if (remainingMs <= 0) return 'Due';
      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } catch (error) {
      return '—';
    }
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const downloadHtmlDocument = (html, filename) => {
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to download document. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  const buildLoansReportHtml = (loansList, options = {}) => {
    const {
      titleTag = 'Loans Report - Mamuya Auto Spare Parts',
      reportLabel = 'Loans',
      heading = 'LOANS REPORT',
      emptyText = 'No loans found'
    } = options;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl =
      logoPath
        ? logoPath.startsWith('http')
          ? logoPath
          : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
        : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel = getDateRangeLabel();

    const getLoanItems = (p) => {
      if (p.items && p.items.length > 0) {
        return p.items.map((item) => ({
          name: (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'),
          partNo: (item.sparepart_number || 'N/A').toUpperCase(),
          quantity: parseInt(item.quantity, 10) || 0,
          unitPrice: parseFloat(item.unit_price || item.price) || 0
        }));
      }
      return [{
        name: (p.sparepart_name || '—').replace(/</g, '&lt;'),
        partNo: (p.sparepart_number || 'N/A').toUpperCase(),
        quantity: parseInt(p.quantity, 10) || 0,
        unitPrice: parseFloat(p.unit_price || p.price) || 0
      }];
    };

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Spare part</th>
                <th class="tc">Qty</th>
                <th class="tr">Unit price (TZS)</th>
                <th class="tr">Total amount (TZS)</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tr">Amount remain (TZS)</th>
              </tr>
            </thead>`;

    const list = Array.isArray(loansList) ? loansList : [];

    const loansSectionsHtml =
      list.length === 0
        ? '<table class="tax-inv-table">' +
          tableHeader +
          `<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">${String(emptyText).replace(/</g, '&lt;')}</td></tr></tbody></table>`
        : list
            .map((p) => {
              const grossTotal = getLoanGrossTotal(p);
              const discount = getLoanDiscountAmount(p);
              const netTotal = getLoanNetTotal(p);
              const received = Number(p.amount_received) || 0;
              const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
              const amountRemain =
                dbRemain != null && !Number.isNaN(dbRemain)
                  ? Math.max(0, dbRemain)
                  : Math.max(0, netTotal - received);
              const customerName = (p.customer_name || '').toUpperCase().replace(/</g, '&lt;');
              const customerPhone = String(p.customer_phone || '—').replace(/</g, '&lt;');
              const items = getLoanItems(p);
              const dateStr = formatDateTime(p.created_at);

              const rows = items
                .map((item, idx) => {
                  const sparePartName = `${item.name} (${item.partNo})`;
                  const lineTotal = item.quantity * item.unitPrice;
                  const amountReceivedForLine =
                    grossTotal > 0
                      ? (lineTotal / grossTotal) * received
                      : 0;
                  const lineNetShare = grossTotal > 0 ? (lineTotal / grossTotal) * netTotal : 0;
                  const amountRemainForLine = Math.max(0, lineNetShare - amountReceivedForLine);
                  return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${dateStr}</td>
                  <td class="tl">${sparePartName}</td>
                  <td class="tc">${item.quantity}</td>
                  <td class="tr">${formatPrice(item.unitPrice)}</td>
                  <td class="tr">${formatPrice(lineTotal)}</td>
                  <td class="tr">${formatPrice(amountReceivedForLine)}</td>
                  <td class="tr">${formatPrice(amountRemainForLine)}</td>
                </tr>`;
                })
                .join('');

              const totalRow = `
                <tr class="total-row total-final">
                  <td colspan="5" class="tr">Total</td>
                  <td class="tr">${formatPrice(netTotal)}</td>
                  <td class="tr">${formatPrice(received)}</td>
                  <td class="tr">${formatPrice(amountRemain)}</td>
                </tr>`;

              return `
          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${customerName}<br />
            <strong>Phone:</strong> ${customerPhone}<br />
            <strong>Discount (TZS):</strong> ${formatPrice(discount)}
          </div>
          <table class="tax-inv-table">
            ${tableHeader}
            <tbody>
              ${rows}
              ${totalRow}
            </tbody>
          </table>`;
            })
            .join('');

    const totalDiscountAmount = list.reduce((sum, p) => sum + getLoanDiscountAmount(p), 0);
    const totalReceivedAmount = list.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
    const totalLoanAmount = list.reduce((sum, p) => sum + getLoanNetTotal(p), 0);
    const totalAmountRemain = list.reduce((sum, p) => {
      const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
      if (dbRemain != null && !Number.isNaN(dbRemain)) return sum + Math.max(0, dbRemain);
      const net = getLoanNetTotal(p);
      const received = Number(p.amount_received) || 0;
      return sum + Math.max(0, net - received);
    }, 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${String(titleTag).replace(/</g, '&lt;')}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
            .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
            .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
            .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
            .tax-inv-company { flex: 1; }
            .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
            .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
            .tax-inv-meta { text-align: right; min-width: 180px; }
            .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
            .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
            .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
            .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
            .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
            .tax-inv-table th.tl { text-align: left; }
            .tax-inv-table .tc { text-align: center; }
            .tax-inv-table .tr { text-align: right; }
            .tax-inv-table .tl { text-align: left; }
            .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
            .tax-inv-footer-row { margin-bottom: 12px; }
            .tax-inv-footer-row label { display: inline-block; min-width: 240px; font-weight: 600; }
            .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
            .tax-inv-customer { margin-bottom: 12px; padding: 8px 0; }
            .total-row td { font-weight: 700; background: #fafafa; }
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
              <p><strong>Report:</strong> ${String(reportLabel).replace(/</g, '&lt;')}</p>
              <p><strong>Period:</strong> ${String(dateRangeLabel).replace(/</g, '&lt;')}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">${String(heading).replace(/</g, '&lt;')}</h1>

          ${loansSectionsHtml}

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total loan amount (TZS):</label> ${formatPrice(totalLoanAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total discount (TZS):</label> ${formatPrice(totalDiscountAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatPrice(totalReceivedAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount remain (TZS):</label> ${formatPrice(totalAmountRemain)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated loans report, hence no signature is required.*</p>
        </body>
      </html>
    `;
  };

  const handleDownloadLoans = () => {
    const html = buildLoansReportHtml(sortedFilteredLoans, {
      titleTag: 'Loans Report - Mamuya Auto Spare Parts',
      reportLabel: 'Loans (Outstanding)',
      heading: 'LOANS REPORT',
      emptyText: 'No loans found'
    });
    downloadHtmlDocument(html, `loans-report-${new Date().toISOString().slice(0, 10)}.html`);
  };

  const handleDownloadOldLoans = () => {
    const html = buildLoansReportHtml(sortedFilteredOldLoans, {
      titleTag: 'Old Loans Report - Mamuya Auto Spare Parts',
      reportLabel: 'Old Loans',
      heading: 'OLD LOANS REPORT',
      emptyText: 'No old loans found'
    });
    downloadHtmlDocument(html, `old-loans-report-${new Date().toISOString().slice(0, 10)}.html`);
  };

  const handlePrintLoans = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl =
      logoPath
        ? logoPath.startsWith('http')
          ? logoPath
          : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
        : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel = getDateRangeLabel();

    const getLoanItems = (p) => {
      if (p.items && p.items.length > 0) {
        return p.items.map((item) => ({
          name: (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'),
          partNo: (item.sparepart_number || 'N/A').toUpperCase(),
          quantity: parseInt(item.quantity, 10) || 0,
          unitPrice: parseFloat(item.unit_price || item.price) || 0
        }));
      }
      return [{
        name: (p.sparepart_name || '—').replace(/</g, '&lt;'),
        partNo: (p.sparepart_number || 'N/A').toUpperCase(),
        quantity: parseInt(p.quantity, 10) || 0,
        unitPrice: parseFloat(p.unit_price || p.price) || 0
      }];
    };

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Spare part</th>
                <th class="tc">Qty</th>
                <th class="tr">Unit price (TZS)</th>
                <th class="tr">Total amount (TZS)</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tr">Amount remain (TZS)</th>
              </tr>
            </thead>`;

    const loansSectionsHtml =
      sortedFilteredLoans.length === 0
        ? '<table class="tax-inv-table">' + tableHeader + '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No loans found</td></tr></tbody></table>'
        : sortedFilteredLoans
            .map((p) => {
              const grossTotal = getLoanGrossTotal(p);
              const discount = getLoanDiscountAmount(p);
              const netTotal = getLoanNetTotal(p);
              const received = Number(p.amount_received) || 0;
              const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
              const amountRemain =
                dbRemain != null && !Number.isNaN(dbRemain)
                  ? Math.max(0, dbRemain)
                  : Math.max(0, netTotal - received);
              const customerName = (p.customer_name || '').toUpperCase();
              const customerPhone = p.customer_phone || '—';
              const items = getLoanItems(p);
              const dateStr = formatDateTime(p.created_at);

              const rows = items
                .map((item, idx) => {
                  const sparePartName = `${item.name} (${item.partNo})`;
                  const lineTotal = item.quantity * item.unitPrice;
                  const amountReceivedForLine =
                    grossTotal > 0
                      ? (lineTotal / grossTotal) * received
                      : 0;
                  const lineNetShare = grossTotal > 0 ? (lineTotal / grossTotal) * netTotal : 0;
                  const amountRemainForLine = Math.max(0, lineNetShare - amountReceivedForLine);
                  return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${dateStr}</td>
                  <td class="tl">${sparePartName}</td>
                  <td class="tc">${item.quantity}</td>
                  <td class="tr">${formatPrice(item.unitPrice)}</td>
                  <td class="tr">${formatPrice(lineTotal)}</td>
                  <td class="tr">${formatPrice(amountReceivedForLine)}</td>
                  <td class="tr">${formatPrice(amountRemainForLine)}</td>
                </tr>`;
                })
                .join('');

              const totalRow = `
                <tr class="total-row total-final">
                  <td colspan="5" class="tr">Total</td>
                  <td class="tr">${formatPrice(netTotal)}</td>
                  <td class="tr">${formatPrice(received)}</td>
                  <td class="tr">${formatPrice(amountRemain)}</td>
                </tr>`;

              return `
          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${customerName}<br />
            <strong>Phone:</strong> ${customerPhone}<br />
            <strong>Discount (TZS):</strong> ${formatPrice(discount)}
          </div>
          <table class="tax-inv-table">
            ${tableHeader}
            <tbody>
              ${rows}
              ${totalRow}
            </tbody>
          </table>`;
            })
            .join('');

    const totalDiscountAmount = sortedFilteredLoans.reduce((sum, p) => sum + getLoanDiscountAmount(p), 0);
    const totalReceivedAmount = sortedFilteredLoans.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
    const printTotalLoanAmount = sortedFilteredLoans.reduce((sum, p) => sum + getLoanNetTotal(p), 0);
    const printTotalAmountRemain = sortedFilteredLoans.reduce((sum, p) => {
      const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
      if (dbRemain != null && !Number.isNaN(dbRemain)) return sum + Math.max(0, dbRemain);
      const net = getLoanNetTotal(p);
      const received = Number(p.amount_received) || 0;
      return sum + Math.max(0, net - received);
    }, 0);

    printWindow.document.write(`
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
            .tax-inv-table tbody tr { background: #fff; }
            .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
            .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
            .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
            .tax-inv-customer {
              margin-top: 24px;
              margin-bottom: 12px;
              padding: 8px 0;
            }
            .tax-inv-customer:first-of-type {
              margin-top: 0;
            }
            .tax-inv-customer strong {
              display: inline-block;
              min-width: 130px;
              font-size: 11px;
            }
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
              <p><strong>Report:</strong> Loans (Outstanding)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">LOANS REPORT</h1>

          ${loansSectionsHtml}

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total loan amount (TZS):</label> ${formatPrice(printTotalLoanAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total discount (TZS):</label> ${formatPrice(totalDiscountAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatPrice(totalReceivedAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount remain (TZS):</label> ${formatPrice(printTotalAmountRemain)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated loans report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handlePrintOldLoans = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl =
      logoPath
        ? logoPath.startsWith('http')
          ? logoPath
          : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
        : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel = getDateRangeLabel();

    const getLoanItems = (p) => {
      if (p.items && p.items.length > 0) {
        return p.items.map((item) => ({
          name: (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'),
          partNo: (item.sparepart_number || 'N/A').toUpperCase(),
          quantity: parseInt(item.quantity, 10) || 0,
          unitPrice: parseFloat(item.unit_price || item.price) || 0
        }));
      }
      return [{
        name: (p.sparepart_name || '—').replace(/</g, '&lt;'),
        partNo: (p.sparepart_number || 'N/A').toUpperCase(),
        quantity: parseInt(p.quantity, 10) || 0,
        unitPrice: parseFloat(p.unit_price || p.price) || 0
      }];
    };

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Spare part</th>
                <th class="tc">Qty</th>
                <th class="tr">Unit price (TZS)</th>
                <th class="tr">Total amount (TZS)</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tr">Amount remain (TZS)</th>
              </tr>
            </thead>`;

    const loansSectionsHtml =
      sortedFilteredOldLoans.length === 0
        ? '<table class="tax-inv-table">' + tableHeader + '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No old loans found</td></tr></tbody></table>'
        : sortedFilteredOldLoans
            .map((p) => {
              const grossTotal = getLoanGrossTotal(p);
              const discount = getLoanDiscountAmount(p);
              const netTotal = getLoanNetTotal(p);
              const received = Number(p.amount_received) || 0;
              const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
              const amountRemain =
                dbRemain != null && !Number.isNaN(dbRemain)
                  ? Math.max(0, dbRemain)
                  : Math.max(0, netTotal - received);
              const customerName = (p.customer_name || '').toUpperCase();
              const customerPhone = p.customer_phone || '—';
              const items = getLoanItems(p);
              const dateStr = formatDateTime(p.created_at);

              const rows = items
                .map((item, idx) => {
                  const sparePartName = `${item.name} (${item.partNo})`;
                  const lineTotal = item.quantity * item.unitPrice;
                  const amountReceivedForLine =
                    grossTotal > 0
                      ? (lineTotal / grossTotal) * received
                      : 0;
                  const lineNetShare = grossTotal > 0 ? (lineTotal / grossTotal) * netTotal : 0;
                  const amountRemainForLine = Math.max(0, lineNetShare - amountReceivedForLine);
                  return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${dateStr}</td>
                  <td class="tl">${sparePartName}</td>
                  <td class="tc">${item.quantity}</td>
                  <td class="tr">${formatPrice(item.unitPrice)}</td>
                  <td class="tr">${formatPrice(lineTotal)}</td>
                  <td class="tr">${formatPrice(amountReceivedForLine)}</td>
                  <td class="tr">${formatPrice(amountRemainForLine)}</td>
                </tr>`;
                })
                .join('');

              const totalRow = `
                <tr class="total-row total-final">
                  <td colspan="5" class="tr">Total</td>
                  <td class="tr">${formatPrice(netTotal)}</td>
                  <td class="tr">${formatPrice(received)}</td>
                  <td class="tr">${formatPrice(amountRemain)}</td>
                </tr>`;

              return `
          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${customerName}<br />
            <strong>Phone:</strong> ${customerPhone}<br />
            <strong>Discount (TZS):</strong> ${formatPrice(discount)}
          </div>
          <table class="tax-inv-table">
            ${tableHeader}
            <tbody>
              ${rows}
              ${totalRow}
            </tbody>
          </table>`;
            })
            .join('');

    const totalDiscountAmount = sortedFilteredOldLoans.reduce((sum, p) => sum + getLoanDiscountAmount(p), 0);
    const oldLoansTotalReceived = sortedFilteredOldLoans.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);

    const oldLoansTotalAmount = sortedFilteredOldLoans.reduce((sum, p) => sum + getLoanNetTotal(p), 0);
    const oldLoansTotalRemain = sortedFilteredOldLoans.reduce((sum, p) => {
      const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
      if (dbRemain != null && !Number.isNaN(dbRemain)) return sum + Math.max(0, dbRemain);
      const net = getLoanNetTotal(p);
      const received = Number(p.amount_received) || 0;
      return sum + Math.max(0, net - received);
    }, 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Old Loans Report - Mamuya Auto Spare Parts</title>
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
            .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
            .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
            .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
            .tax-inv-customer {
              margin-top: 24px;
              margin-bottom: 12px;
              padding: 8px 0;
            }
            .tax-inv-customer:first-of-type {
              margin-top: 0;
            }
            .tax-inv-customer strong {
              display: inline-block;
              min-width: 130px;
              font-size: 11px;
            }
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
              <p><strong>Report:</strong> Old Loans</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">OLD LOANS REPORT</h1>

          ${loansSectionsHtml}

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total old loans amount (TZS):</label> ${formatPrice(oldLoansTotalAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total discount (TZS):</label> ${formatPrice(totalDiscountAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatPrice(oldLoansTotalReceived)}</div>
            <div class="tax-inv-footer-row"><label>Total old loans remain (TZS):</label> ${formatPrice(oldLoansTotalRemain)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated old loans report, hence no signature is required.*</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDateInvoice = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getLoanDetailsHtml = (payment) => {
    const dbRemain = payment.amount_remain != null ? Number(payment.amount_remain) : null;
    const grossTotal = getLoanGrossTotal(payment);
    const discount = getLoanDiscountAmount(payment);
    const netTotal = getLoanNetTotal(payment);
    const received = Number(payment.amount_received) || 0;
    const amountRemain =
      dbRemain != null && !Number.isNaN(dbRemain)
        ? dbRemain
        : Math.max(0, netTotal - received);
    
    // Get the date/time when amount was received (use approved_at if available, otherwise created_at)
    const receivedDateTime = payment.approved_at || payment.created_at || null;
    const receivedDateTimeFormatted = receivedDateTime ? formatDateTime(receivedDateTime) || '—' : '—';

    const logoPathDetail = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPathDetail
      ? (logoPathDetail.startsWith('http') ? logoPathDetail : window.location.origin + (logoPathDetail.startsWith('/') ? logoPathDetail : '/' + logoPathDetail))
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const items = payment.items && payment.items.length > 0
      ? payment.items
      : [{
          sparepart_name: payment.sparepart_name || 'Unknown',
          sparepart_number: payment.sparepart_number || 'N/A',
          quantity: payment.quantity || 0,
          unit_price: payment.unit_price || 0,
          total_amount: (Number(payment.quantity) || 0) * (Number(payment.unit_price) || 0)
        }];

    const itemRows = items.map((item, idx) => {
      const itemTotal = item.total_amount != null && item.total_amount !== undefined
        ? Number(item.total_amount) || 0
        : (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      return `
        <tr>
          <td class="tc">${idx + 1}</td>
          <td class="tl">${(item.sparepart_name || 'Unknown').replace(/</g, '&lt;')}</td>
          <td class="tc">${(item.sparepart_number || 'N/A').toUpperCase()}</td>
          <td class="tr">${Number(item.quantity) || 0}</td>
          <td class="tr">${formatPrice(item.unit_price || 0)}</td>
          <td class="tc">PCS</td>
          <td class="tr">${formatPrice(itemTotal)}</td>
          <td class="tr">${formatPrice(itemTotal)}</td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Loan Details #${payment.id} - Mamuya Auto Spare Parts</title>
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
            .tax-inv-company {
              flex: 1;
            }
            .tax-inv-company h2 {
              margin: 0 0 10px 0;
              font-size: 1.15rem;
              font-weight: 700;
              color: #111;
              letter-spacing: 0.02em;
            }
            .tax-inv-address {
              margin: 0;
              color: #444;
              font-size: 10px;
              line-height: 1.5;
            }
            .tax-inv-meta {
              text-align: right;
              min-width: 180px;
            }
            .tax-inv-meta p {
              margin: 0 0 6px 0;
              font-size: 11px;
            }
            .tax-inv-title {
              text-align: center;
              font-size: 1.6rem;
              font-weight: 700;
              margin: 24px 0;
              letter-spacing: 0.05em;
            }
            .tax-inv-customer {
              margin-bottom: 18px;
              padding: 8px 0;
            }
            .tax-inv-customer strong {
              display: inline-block;
              min-width: 130px;
              font-size: 11px;
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
            .tax-inv-table .total-row td {
              font-weight: 600;
              background: #f0f0f0;
            }
            .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
            .tax-inv-table .total-final td {
              font-weight: 700;
              font-size: 11px;
              background: #e8e8e8;
            }
            .tax-inv-footer {
              margin-top: 28px;
              font-size: 11px;
              border-top: 1px solid #ccc;
              padding-top: 16px;
            }
            .tax-inv-footer-row {
              margin-bottom: 12px;
            }
            .tax-inv-footer-row label {
              display: inline-block;
              min-width: 180px;
              font-weight: 600;
            }
            .tax-inv-disclaimer {
              margin-top: 28px;
              font-style: italic;
              color: #666;
              font-size: 10px;
            }
            @media print {
              body { padding: 16px; }
              .tax-inv-logo { max-height: 52px; }
            }
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
              <p><strong>TIN:</strong> 123-456-789</p>
              <p><strong>Loan ID:</strong> #${payment.id}</p>
              <p><strong>Date:</strong> ${formatDateInvoice(payment.created_at)}</p>
            </div>
          </div>

          <div class="tax-inv-title">LOAN DETAILS</div>

          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${(payment.customer_name || '').replace(/</g, '&lt;')}<br />
            <strong>Phone:</strong> ${payment.customer_phone || '—'}<br />
            <strong>Status:</strong> ${payment.status || '—'}<br />
            <strong>Payment Method:</strong> ${payment.payment_method || '—'}
          </div>

          <table class="tax-inv-table">
            <thead>
              <tr>
                <th class="tl">Sr.No.</th>
                <th class="tl">Description</th>
                <th class="tc">Part No.</th>
                <th class="tr">Quantity</th>
                <th class="tr">Price (TZS)</th>
                <th class="tc">Per</th>
                <th class="tr">Amount (TZS)</th>
                <th class="tr">Total Amount (TZS)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr class="total-row total-first">
                <td colspan="6" class="tr"><strong>Sub Total</strong></td>
                <td class="tr">${formatPrice(grossTotal)}</td>
                <td class="tr">${formatPrice(grossTotal)}</td>
              </tr>
              ${discount > 0 ? `
              <tr class="total-row">
                <td colspan="6" class="tr"><strong>Discount</strong></td>
                <td class="tr">${formatPrice(discount)}</td>
                <td class="tr">${formatPrice(discount)}</td>
              </tr>
              ` : ''}
              <tr class="total-row total-final">
                <td colspan="6" class="tr"><strong>Total Amount</strong></td>
                <td class="tr">${formatPrice(netTotal)}</td>
                <td class="tr">${formatPrice(netTotal)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="6" class="tr"><strong>Amount Received</strong> ${received > 0 ? `<span style="font-size: 9px; font-weight: normal; color: #666; margin-left: 10px;">(${receivedDateTimeFormatted})</span>` : ''}</td>
                <td class="tr">${formatPrice(received)}</td>
                <td class="tr">${formatPrice(received)}</td>
              </tr>
              <tr class="total-row total-final">
                <td colspan="6" class="tr"><strong>Amount Remain</strong></td>
                <td class="tr">${formatPrice(amountRemain)}</td>
                <td class="tr">${formatPrice(amountRemain)}</td>
              </tr>
            </tbody>
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row">
              <label>AMOUNT REMAIN IN WORDS:</label>
              ${amountRemain > 0 ? 'TZS ' + formatPrice(amountRemain) + ' Only' : 'Fully Paid'}
            </div>
          </div>

          <p class="tax-inv-disclaimer">
            *This is a system generated loan details document, no signature is required.*
          </p>
        </body>
      </html>
    `;
    return printContent;
  };

  const handlePrintLoanDetails = (payment) => {
    const html = getLoanDetailsHtml(payment);
    if (!html) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the loan details.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
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

  const handleDownloadLoanDetails = (payment) => {
    const html = getLoanDetailsHtml(payment);
    if (!html) return;

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `loan-details-${payment.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to download document. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  const handleEdit = (payment) => {
    editSaveInFlightRef.current = false;
    setSelectedPayment(payment);
    setEditAmountReceived('0');
    const pm = String(payment?.payment_method || '').trim();
    if (!pm || pm === 'Loan' || pm === 'Mixed') {
      setPaymentMethodInput('');
    } else {
      setPaymentMethodInput(pm);
    }
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
    setSparepartIdInput(
      payment?.sparepart_id != null
        ? String(payment.sparepart_id)
        : payment?.items?.[0]?.sparepart_id != null
        ? String(payment.items[0].sparepart_id)
        : ''
    );
    setShowEditModal(true);
  };

  const handleDeleteLoan = async (payment) => {
    if (!payment?.id) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Loan',
      text: `Are you sure you want to delete loan #${payment.id}?`,
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: t.cancel || 'Cancel',
    });
    if (!result.isConfirmed) return;

    try {
      setDeletingPaymentId(payment.id);
      const response = await deletePayment(payment.id);
      if (!response?.success) {
        throw new Error(response?.message || 'Failed to delete loan.');
      }
      setPayments((prev) => prev.filter((p) => p.id !== payment.id));
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Loan deleted successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: error.message || 'Failed to delete loan.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleAddLoan = async () => {
    if (!addLoanPaymentId) {
      Swal.fire({
        icon: 'warning',
        title: 'Payment required',
        text: 'Please select a payment to create the loan record.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }

    const paymentIdNum = parseInt(addLoanPaymentId, 10);
    if (!Number.isFinite(paymentIdNum)) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid payment id',
        text: 'Payment ID must be a number.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }

    setAddLoanSaving(true);
    try {
      const normalizeNumInput = (v) => String(v ?? '').replace(/,/g, '').trim();
      const overrides = {
        customer_id: addLoanCustomerIdInput,
        customer_name: addLoanCustomerNameInput,
        customer_phone: addLoanCustomerPhoneInput,
        spareparts: addLoanSparepartsInput,
        total_amount: normalizeNumInput(addLoanTotalAmountInput),
        cash: normalizeNumInput(addLoanCashInput),
        bank_transfer: normalizeNumInput(addLoanBankTransferInput),
        airtel_money: normalizeNumInput(addLoanAirtelMoneyInput),
        mpesa: normalizeNumInput(addLoanMpesaInput),
        mix_by_yas: normalizeNumInput(addLoanMixByYasInput),
        discount: normalizeNumInput(addLoanDiscountInput),
        amount_received: normalizeNumInput(addLoanAmountReceivedInput),
        amount_remain: normalizeNumInput(addLoanAmountRemainInput),
      };

      const response = await createLoanFromPayment(paymentIdNum, addLoanStatus, overrides);
      if (!response.success) throw new Error(response.message || 'Failed to create loan');

      Swal.fire({
        icon: 'success',
        title: 'Loan created',
        text: 'Loan record inserted successfully.',
        confirmButtonColor: '#1a3a5f',
      });

      setShowAddLoanModal(false);
      setAddLoanPaymentId('');
      setAddLoanCustomerIdInput('');
      setAddLoanCustomerNameInput('');
      setAddLoanCustomerPhoneInput('');
      setAddLoanSparepartsInput('');
      setAddLoanTotalAmountInput('');
      setAddLoanCashInput('');
      setAddLoanBankTransferInput('');
      setAddLoanAirtelMoneyInput('');
      setAddLoanMpesaInput('');
      setAddLoanMixByYasInput('');
      setAddLoanDiscountInput('');
      setAddLoanAmountReceivedInput('');
      setAddLoanAmountRemainInput('');
      setAddLoanStatus('Pending');

      // Refresh payments list (UI still uses payments as source-of-truth).
      const refreshed = await getPayments();
      if (refreshed.success && refreshed.payments) setPayments(refreshed.payments);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create loan.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setAddLoanSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    if (editSaveInFlightRef.current || editSaving) return;
    editSaveInFlightRef.current = true;
    const splitCash = parseCommaNumber(splitCashInput);
    const splitBank = parseCommaNumber(splitBankInput);
    const splitAirtel = parseCommaNumber(splitAirtelInput);
    const splitMpesa = parseCommaNumber(splitMpesaInput);
    const splitYas = parseCommaNumber(splitYasInput);
    const splitTotal = splitCash + splitBank + splitAirtel + splitMpesa + splitYas;
    const manualAmount = parseCommaNumber(editAmountReceived);
    const addAmount = manualAmount + splitTotal;
    if (addAmount <= 0) {
      editSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidAmount || 'Invalid amount',
        text: t.enterAmountTZS || 'Enter amount (TZS)',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    if (manualAmount > 0 && !String(paymentMethodInput || '').trim()) {
      editSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidPaymentMethod || 'Invalid payment method',
        text: t.selectPaymentMethod || 'Please select a payment method.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const previousReceived = Number(selectedPayment.amount_received) || 0;
    const newReceivedTotal = previousReceived + addAmount;
    const amountRemain = Math.max(0, getAmountRemain(selectedPayment) - addAmount);
    const splitMethodsUsed = [
      splitCash > 0 ? 'Cash' : null,
      splitBank > 0 ? 'Bank Transfer' : null,
      splitAirtel > 0 ? 'Airtel Money' : null,
      splitMpesa > 0 ? 'M-Pesa' : null,
      splitYas > 0 ? 'Mix By Yas' : null,
    ].filter(Boolean);
    const selectedMethod = String(paymentMethodInput || '').trim();
    const methodsUsed = [
      ...(manualAmount > 0 && selectedMethod ? [selectedMethod] : []),
      ...splitMethodsUsed,
    ];
    const uniqueMethods = Array.from(new Set(methodsUsed));
    const effectivePaymentMethod =
      uniqueMethods.length > 1
        ? 'Mixed'
        : uniqueMethods[0] || selectedMethod || String(selectedPayment.payment_method || '').trim();

    const baseChannelTotals =
      manualAmount > 0
        ? mergeLoanPaymentChannelTotals(selectedPayment, selectedMethod, manualAmount)
        : {
            cash: Number(selectedPayment.cash) || 0,
            bank_transfer: Number(selectedPayment.bank_transfer) || 0,
            airtel_money: Number(selectedPayment.airtel_money) || 0,
            mpesa: Number(selectedPayment.mpesa) || 0,
            mix_by_yas: Number(selectedPayment.mix_by_yas) || 0,
          };

    const channelTotals = {
      cash: baseChannelTotals.cash + splitCash,
      bank_transfer: baseChannelTotals.bank_transfer + splitBank,
      airtel_money: baseChannelTotals.airtel_money + splitAirtel,
      mpesa: baseChannelTotals.mpesa + splitMpesa,
      mix_by_yas: baseChannelTotals.mix_by_yas + splitYas,
    };
    const sparepartIdValue =
      sparepartIdInput != null && String(sparepartIdInput).trim()
        ? parseInt(String(sparepartIdInput), 10)
        : null;
    setEditSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newReceivedTotal,
        amount_remain: amountRemain,
        payment_method: effectivePaymentMethod,
        sparepart_id: sparepartIdValue,
        payment_type: String(selectedPayment.payment_type || '').trim() || null,
        confirmed_by_cashier_id: user?.id || null,
        cash: channelTotals.cash,
        bank_transfer: channelTotals.bank_transfer,
        airtel_money: channelTotals.airtel_money,
        mpesa: channelTotals.mpesa,
        mix_by_yas: channelTotals.mix_by_yas,
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');
      
      // Reload data from database to ensure we have the latest values
      const refreshResponse = await getPayments();
      if (refreshResponse.success && refreshResponse.payments) {
        setPayments(refreshResponse.payments);
      } else {
        // Fallback: update local state if refresh fails
        setPayments((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPayment.id) return p;
            const selectedSpare = sparepartsOptions.find((s) => String(s.id) === String(sparepartIdValue));
            return {
              ...p,
              amount_received: newReceivedTotal,
              amount_remain: amountRemain,
              payment_method: effectivePaymentMethod,
              sparepart_id: sparepartIdValue,
              sparepart_name: selectedSpare?.part_name || p.sparepart_name,
              sparepart_number: selectedSpare?.part_number || p.sparepart_number,
              payment_type: String(selectedPayment.payment_type || '').trim() || null,
              cash: channelTotals.cash,
              bank_transfer: channelTotals.bank_transfer,
              airtel_money: channelTotals.airtel_money,
              mpesa: channelTotals.mpesa,
              mix_by_yas: channelTotals.mix_by_yas,
            };
          })
        );
      }

      setEditAmountReceived('');
      setSplitCashInput('');
      setSplitBankInput('');
      setSplitAirtelInput('');
      setSplitMpesaInput('');
      setSplitYasInput('');
      setPaymentMethodInput('');
      Swal.fire({
        icon: 'success',
        title: t.saved || 'Saved',
        text: t.loanInstallmentSaved || 'Installment saved. You can add another payment or close when done.',
        confirmButtonColor: '#1a3a5f',
        timer: 2800,
        timerProgressBar: true,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: error.message || 'Failed to update loan.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setEditSaving(false);
      editSaveInFlightRef.current = false;
    }
  };

  // Helper: get amount remain for a payment (from DB or calculated)
  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return Math.max(0, dbRemain);
    const net = getLoanNetTotal(p);
    const received = Number(p.amount_received) || 0;
    return Math.max(0, net - received);
  };

  const isDateOnSameCalendarDay = (dateString, refNow) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const ref = refNow instanceof Date ? refNow : new Date(refNow);
    return (
      d.getFullYear() === ref.getFullYear() &&
      d.getMonth() === ref.getMonth() &&
      d.getDate() === ref.getDate()
    );
  };

  /** Any loan that received a payment today (same basis as cashier loans). */
  const isLoanPaidToday = (p) => {
    const receivedToday = Number(p?.amount_received_today) || 0;
    if (receivedToday > 0) return true;
    const activityAt = p.updated_at || p.approved_at || p.confirmed_at || p.created_at;
    return isDateOnSameCalendarDay(activityAt, now) && (Number(p?.amount_received) || 0) > 0;
  };

  const isLoanPaymentType = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
  const getLoanStatus = (p) => {
    if (getAmountRemain(p) > 0) return 'Pending';
    const loanStatus = String(p?.loan_status ?? '').trim();
    return loanStatus || 'Pending';
  };

  // Base list:
  // - New Loans: payment_type = loan
  // - Old Loans: amount_remain > 0 and payment_type is empty/null (no payment type)
  const loansWithRemain = payments.filter((p) => isLoanPaymentType(p));
  const oldLoansBase = payments.filter((p) => {
    const hasNoPaymentType = !String(p?.payment_type ?? '').trim();
    return hasNoPaymentType && getAmountRemain(p) > 0;
  });
  // For the Add Loan modal: allow inserting from ANY loan-type payment (no remain limitation).
  const loansForAdd = payments.filter((p) => isLoanPaymentType(p));

  const filteredLoans = loansWithRemain.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name?.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    const effectiveStatus = getLoanStatus(payment);
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && effectiveStatus === 'Pending') ||
      (statusFilter === 'Approved' && effectiveStatus === 'Approved') ||
      (statusFilter === 'Rejected' && effectiveStatus === 'Rejected');

    const matchesTime = isInTimeRange(payment.created_at, timeFilter, customDateFrom, customDateTo);

    if (showPaidTodayOnly && !isLoanPaidToday(payment)) return false;

    return matchesSearch && matchesStatus && matchesTime;
  });

  // Old Loans base rule:
  // amount_remain > 0 and no payment_type.
  // Search in Old Loans section is applied on top of this base rule.
  const filteredOldLoans = oldLoansBase.filter((payment) => {
    if (showPaidTodayOnly && !isLoanPaidToday(payment)) return false;
    if (payment.status !== 'Approved') return false;
    const matchesTime = isInTimeRange(payment.created_at, timeFilter, customDateFrom, customDateTo);
    if (!matchesTime) return false;
    const term = String(oldLoansSearchTerm || '').toLowerCase().trim();
    if (!term) return true;
    return (
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(oldLoansSearchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Sort by date and time (newest first)
  const sortedFilteredLoans = [...filteredLoans].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const sortedFilteredOldLoans = [...filteredOldLoans].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const pendingLoansCount = loansWithRemain.filter((p) => getLoanStatus(p) === 'Pending').length;
  const approvedLoansCount = loansWithRemain.filter((p) => getLoanStatus(p) === 'Approved').length;
  const rejectedLoansCount = loansWithRemain.filter((p) => getLoanStatus(p) === 'Rejected').length;

  const oldLoansCount = oldLoansBase.length;

  // For Add Loan modal: show customer name for selected Payment ID.
  const selectedAddLoanPayment = loansForAdd.find((p) => String(p.id) === String(addLoanPaymentId));

  const deriveSparepartsStrFromPayment = (p) => {
    if (!p) return '';
    try {
      if (Array.isArray(p.items) && p.items.length > 0) {
        const ids = p.items.map((it) => it?.sparepart_id).filter(Boolean);
        if (ids.length > 0) return ids.map((x) => String(x)).join(',').slice(0, 100);
      }
      if (p.sparepart_id != null) return String(p.sparepart_id).slice(0, 100);
    } catch {
      // ignore
    }
    return '';
  };

  useEffect(() => {
    if (!showAddLoanModal) return;

    if (!selectedAddLoanPayment) {
      setAddLoanCustomerIdInput('');
      setAddLoanCustomerNameInput('');
      setAddLoanCustomerPhoneInput('');
      setAddLoanSparepartsInput('');
      setAddLoanTotalAmountInput('');
      setAddLoanCashInput('');
      setAddLoanBankTransferInput('');
      setAddLoanAirtelMoneyInput('');
      setAddLoanMpesaInput('');
      setAddLoanMixByYasInput('');
      setAddLoanDiscountInput('');
      setAddLoanAmountReceivedInput('');
      setAddLoanAmountRemainInput('');
      return;
    }

    const p = selectedAddLoanPayment;
    setAddLoanCustomerIdInput(p.customer_id != null ? String(p.customer_id) : '');
    setAddLoanCustomerNameInput(p.customer_name != null ? String(p.customer_name) : '');
    setAddLoanCustomerPhoneInput(p.customer_phone != null ? String(p.customer_phone) : '');
    setAddLoanSparepartsInput(deriveSparepartsStrFromPayment(p));
    setAddLoanTotalAmountInput(p.total_amount != null ? String(p.total_amount) : '');
    setAddLoanCashInput(p.cash != null ? String(p.cash) : '');
    setAddLoanBankTransferInput(p.bank_transfer != null ? String(p.bank_transfer) : '');
    setAddLoanAirtelMoneyInput(p.airtel_money != null ? String(p.airtel_money) : '');
    setAddLoanMpesaInput(p.mpesa != null ? String(p.mpesa) : '');
    setAddLoanMixByYasInput(p.mix_by_yas != null ? String(p.mix_by_yas) : '');
    setAddLoanDiscountInput(p.discount_amount != null ? String(p.discount_amount) : '');
    setAddLoanAmountReceivedInput(p.amount_received != null ? String(p.amount_received) : '');

    const remainVal = getAmountRemain(p);
    setAddLoanAmountRemainInput(remainVal != null ? String(remainVal) : '');
  }, [
    showAddLoanModal,
    selectedAddLoanPayment,
    addLoanPaymentId,
    // getAmountRemain is stable within render scope
  ]);

  const totalAmountRemain = filteredLoans.reduce((sum, p) => {
    const amountRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (amountRemain != null && !Number.isNaN(amountRemain)) {
      // `amount_remain` is already the net remain (after discount) in DB.
      return sum + Math.max(0, amountRemain);
    }

    // Fallback: compute net remain from fields.
    const received = Number(p.amount_received) || 0;
    return sum + Math.max(0, getLoanNetTotal(p) - received);
  }, 0);

  const totalLoanAmount = filteredLoans.reduce((sum, p) => sum + getLoanNetTotal(p), 0);

  if (loading) {
    return <PageLoader message={'Loading...'} />;
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
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/messages" className={'nav-item ' + (location.pathname === '/manager/messages' ? 'active' : '')}>
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/manager/sales" className={'nav-item ' + (location.pathname === '/manager/sales' ? 'active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>Sales</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerLoans}</h1>
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
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Manager')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <section className="manager-welcome-section">
            <h2 className="manager-loans-intro">{t.newLoans || 'New Loans'}</h2>
          </section>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderLoans}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-box manager-time-filter-group">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="status-filter">
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="week">{t.last7Days}</option>
                <option value="month">{t.last30Days}</option>
                <option value="custom">{t.customRange}</option>
              </select>
              {timeFilter === 'custom' && (
                <div className="manager-date-range-inputs" aria-label="Date range">
                  <label className="manager-date-range-label">
                    <span>{t.fromDate}</span>
                    <input
                      type="date"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                  <label className="manager-date-range-label">
                    <span>{t.toDate}</span>
                    <input
                      type="date"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                </div>
              )}
            </div>
            <button
              type="button"
              className={`manager-paid-today-btn${showPaidTodayOnly ? ' active' : ''}`}
              onClick={() => setShowPaidTodayOnly((v) => !v)}
              title={t.loansPaidTodayHint}
            >
              <FaCheckCircle aria-hidden />
              <span>{t.loansPaidToday}</span>
            </button>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingLoansCount}</p>
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
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedLoansCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.newLoans || 'New Loans'}</h3>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || timeFilter !== 'all' || showPaidTodayOnly
                  ? t.showingXOfYLoans.replace('{x}', filteredLoans.length).replace('{y}', loansWithRemain.length)
                  : t.showingXLoans.replace('{x}', filteredLoans.length)}
                {sortedFilteredLoans.length > 0 && t.sortedByDateNewest}
              </span>
              <button
                type="button"
                onClick={handlePrintLoans}
                className="action-btn print"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPrint className="action-icon" />
                <span className="action-text">{t.print}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadLoans}
                className="action-btn download"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title={t.download || 'Download'}
              >
                <FaDownload className="action-icon" />
                <span className="action-text">{t.download || 'Download'}</span>
              </button>
            </div>
            <div className="table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>{t.actions}</th>
                    <th>{t.customer}</th>
                    <th>{t.amountReceived || 'Amount Received'}</th>
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
                      <td colSpan="8" className="no-data">
                        {t.noNewLoans || 'No new loans found'}
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredLoans.map((payment) => {
                      const receivedFromDB = Number(payment.amount_received) || 0;
                      const displayAmountRemain = getAmountRemain(payment);
                      const discountFromDB = payment.discount_amount != null ? Number(payment.discount_amount) : null;
                      
                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title={t.viewDetails} onClick={() => handleView(payment)}>
                                <FaEye className="action-icon" />
                                <span className="action-text">{t.view}</span>
                              </button>
                              <button className="action-btn edit" title={t.edit || 'Edit'} onClick={() => handleEdit(payment)}>
                                <FaEdit className="action-icon" />
                                <span className="action-text">{t.edit || 'Edit'}</span>
                              </button>
                              <button className="action-btn print" title="Print Details" onClick={() => handlePrintLoanDetails(payment)}>
                                <FaPrint className="action-icon" />
                                <span className="action-text">Print Details</span>
                              </button>
                              <button className="action-btn download" title="Download Details" onClick={() => handleDownloadLoanDetails(payment)}>
                                <FaDownload className="action-icon" />
                                <span className="action-text">Download</span>
                              </button>
                              <button
                                className="action-btn delete"
                                title="Delete"
                                onClick={() => handleDeleteLoan(payment)}
                                disabled={deletingPaymentId === payment.id}
                              >
                                <FaTrashAlt className="action-icon" />
                                <span className="action-text">{deletingPaymentId === payment.id ? 'Deleting...' : (t.delete || 'Delete')}</span>
                              </button>
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
                          <td className="amount-cell">
                            {receivedFromDB != null
                              ? `TZS ${formatPrice(receivedFromDB)}`
                              : '—'}
                          </td>
                          <td className="amount-cell">
                            {displayAmountRemain != null
                              ? `TZS ${formatPrice(displayAmountRemain)}`
                              : '—'}
                          </td>
                          <td className="amount-cell">
                            {discountFromDB != null
                              ? Number(discountFromDB) > 0
                                ? `TZS ${formatPrice(discountFromDB)}`
                                : '—'
                              : '—'}
                          </td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                payment.status === 'Approved'
                                  ? 'approved'
                                  : payment.status === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {payment.status === 'Approved' && <FaCheckCircle />}
                              {payment.status === 'Rejected' && <FaTimesCircle />}
                              {payment.status === 'Pending' && <FaClock />}
                              {payment.status}
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
            <div className="stats-row manager-loans-summary-row">
              <div className="stat-card">
                <div className="stat-info">
                  <h3>{t.totalLoanAmount || 'Total Loan Amount'}</h3>
                  <p className="stat-value">TZS {formatPrice(totalLoanAmount)}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>{t.totalAmountRemain || 'Total Amount Remain'}</h3>
                  <p className="stat-value">TZS {formatPrice(totalAmountRemain)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="manager-transactions-table-section old-loans-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.oldLoans || 'Old Loans'}</h3>
              <div className="search-box old-loans-inline-search">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder={t.searchPlaceholderLoans || 'Search old loans...'}
                  value={oldLoansSearchTerm}
                  onChange={(e) => setOldLoansSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || timeFilter !== 'all' || showPaidTodayOnly
                  ? t.showingXOfYLoans
                      ? t.showingXOfYLoans.replace('{x}', sortedFilteredOldLoans.length).replace('{y}', oldLoansBase.length)
                      : `Showing ${sortedFilteredOldLoans.length} of ${oldLoansBase.length}`
                  : `Showing ${sortedFilteredOldLoans.length}`}
                {sortedFilteredOldLoans.length > 0 && t.sortedByDateNewest}
              </span>
              <button
                type="button"
                onClick={handlePrintOldLoans}
                className="action-btn print"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPrint className="action-icon" />
                <span className="action-text">{t.print || 'Print'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadOldLoans}
                className="action-btn download"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title={t.download || 'Download'}
              >
                <FaDownload className="action-icon" />
                <span className="action-text">{t.download || 'Download'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddLoanPaymentId('');
                  setAddLoanStatus('Pending');
                  setShowAddLoanModal(true);
                }}
                className="action-btn add"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaMoneyBillWave className="action-icon" />
                <span className="action-text">{t.addLoan || 'Add Loan'}</span>
              </button>
            </div>

            <div className="table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>{t.actions}</th>
                    <th>{t.customer}</th>
                    <th>{t.amountReceived || 'Amount Received'}</th>
                    <th>{t.amountRemain}</th>
                    <th>{t.discount || 'Discount'}</th>
                    <th>{t.paymentMethod}</th>
                    <th>{t.loanStatus || 'Loan Status'}</th>
                    <th>{t.status}</th>
                    <th>{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredOldLoans.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">
                        {t.noOldLoans || 'No old loans found'}
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredOldLoans.map((payment) => {
                      const effectiveStatus = getLoanStatus(payment);
                      const receivedFromDB = Number(payment.amount_received) || 0;
                      const displayAmountRemain = getAmountRemain(payment);
                      const discountFromDB = payment.discount_amount != null ? Number(payment.discount_amount) : null;

                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn view"
                                title={t.viewDetails}
                                onClick={() => handleView(payment)}
                              >
                                <FaEye className="action-icon" />
                                <span className="action-text">{t.view}</span>
                              </button>
                              <button
                                className="action-btn edit"
                                title={t.edit || 'Edit'}
                                onClick={() => handleEdit(payment)}
                              >
                                <FaEdit className="action-icon" />
                                <span className="action-text">{t.edit || 'Edit'}</span>
                              </button>
                              <button
                                className="action-btn print"
                                title="Print Details"
                                onClick={() => handlePrintLoanDetails(payment)}
                              >
                                <FaPrint className="action-icon" />
                                <span className="action-text">Print Details</span>
                              </button>
                              <button
                                className="action-btn download"
                                title="Download Details"
                                onClick={() => handleDownloadLoanDetails(payment)}
                              >
                                <FaDownload className="action-icon" />
                                <span className="action-text">Download</span>
                              </button>
                              <button
                                className="action-btn delete"
                                title="Delete"
                                onClick={() => handleDeleteLoan(payment)}
                                disabled={deletingPaymentId === payment.id}
                              >
                                <FaTrashAlt className="action-icon" />
                                <span className="action-text">{deletingPaymentId === payment.id ? 'Deleting...' : (t.delete || 'Delete')}</span>
                              </button>
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
                          <td className="amount-cell">
                            {receivedFromDB != null ? `TZS ${formatPrice(receivedFromDB)}` : '—'}
                          </td>
                          <td className="amount-cell">
                            {displayAmountRemain != null ? `TZS ${formatPrice(displayAmountRemain)}` : '—'}
                          </td>
                          <td className="amount-cell">
                            {discountFromDB != null ? `TZS ${formatPrice(discountFromDB)}` : '—'}
                          </td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                effectiveStatus === 'Approved'
                                  ? 'approved'
                                  : effectiveStatus === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {effectiveStatus === 'Approved' && <FaCheckCircle />}
                              {effectiveStatus === 'Rejected' && <FaTimesCircle />}
                              {effectiveStatus === 'Pending' && <FaClock />}
                              {effectiveStatus || 'Pending'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                payment.status === 'Approved'
                                  ? 'approved'
                                  : payment.status === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {payment.status === 'Approved' && <FaCheckCircle />}
                              {payment.status === 'Rejected' && <FaTimesCircle />}
                              {payment.status === 'Pending' && <FaClock />}
                              {payment.status}
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
          </section>
        </div>
      </div>

      {showAddLoanModal && (
        <div className="modal-overlay" onClick={() => setShowAddLoanModal(false)}>
          <div className="modal-content view-modal loan-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.addLoan || 'Add Loan'}</h2>
              <button className="close-btn" onClick={() => setShowAddLoanModal(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>{t.paymentId || 'Payment ID'}</label>
                  <div className="view-value">
                    <select
                      value={addLoanPaymentId}
                      onChange={(e) => setAddLoanPaymentId(e.target.value)}
                      className="loan-edit-input"
                      required
                    >
                      <option value="">{t.selectPayment || 'Select payment'}</option>
                      {loansForAdd.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          #{p.id} - {capitalizeName(p.customer_name || '')} - Remain: TZS {formatPrice(getAmountRemain(p))}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.customerId || 'Customer ID'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="loan-edit-input"
                      value={addLoanCustomerIdInput}
                      onChange={(e) => setAddLoanCustomerIdInput(e.target.value.replace(/[^\d]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.customer || 'Customer Name'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      className="loan-edit-input"
                      value={addLoanCustomerNameInput}
                      onChange={(e) => setAddLoanCustomerNameInput(e.target.value)}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.phone || 'Customer Phone'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      className="loan-edit-input"
                      value={addLoanCustomerPhoneInput}
                      onChange={(e) => setAddLoanCustomerPhoneInput(e.target.value)}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.sparePart || 'Spareparts'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      className="loan-edit-input"
                      value={addLoanSparepartsInput}
                      onChange={(e) => setAddLoanSparepartsInput(e.target.value)}
                      placeholder="e.g. 5,9,12"
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.totalAmount || 'Total Amount'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanTotalAmountInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setAddLoanTotalAmountInput(filtered);
                      }}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.discount || 'Discount'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanDiscountInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setAddLoanDiscountInput(filtered);
                      }}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.amountReceived || 'Amount Received'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanAmountReceivedInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setAddLoanAmountReceivedInput(filtered);
                      }}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.amountRemain || 'Amount Remain'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanAmountRemainInput}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setAddLoanAmountRemainInput(filtered);
                      }}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>Cash</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanCashInput}
                      onChange={(e) => setAddLoanCashInput(e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>Bank Transfer</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanBankTransferInput}
                      onChange={(e) => setAddLoanBankTransferInput(e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>Airtel Money</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanAirtelMoneyInput}
                      onChange={(e) => setAddLoanAirtelMoneyInput(e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>M-Pesa</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanMpesaInput}
                      onChange={(e) => setAddLoanMpesaInput(e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>Mix by YAS</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="decimal"
                      className="loan-edit-input"
                      value={addLoanMixByYasInput}
                      onChange={(e) => setAddLoanMixByYasInput(e.target.value.replace(/[^\d.]/g, ''))}
                    />
                  </div>
                </div>

                <div className="view-item">
                  <label>{t.status || 'Status'}</label>
                  <div className="view-value">
                    <select
                      value={addLoanStatus}
                      onChange={(e) => setAddLoanStatus(e.target.value)}
                      className="loan-edit-input"
                      required
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddLoanModal(false)} disabled={addLoanSaving}>
                {t.cancel || 'Cancel'}
              </button>
              <button className="loan-edit-save-btn" onClick={handleAddLoan} disabled={addLoanSaving}>
                {addLoanSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedPayment && (() => {
        const amountRemainVal = selectedPayment.amount_remain != null
          ? Number(selectedPayment.amount_remain)
          : Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0));
        return (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content loan-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="loan-view-header">
                <div className="loan-view-header-top">
                  <h2 className="loan-view-title">Loan Details</h2>
                  <span
                    className={`status-badge ${
                      selectedPayment.status === 'Approved' ? 'approved' :
                      selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'
                    }`}
                  >
                    {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                    {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                    {selectedPayment.status === 'Pending' && <FaClock />}
                    {selectedPayment.status}
                  </span>
                  <button className="loan-view-close" onClick={() => setShowViewModal(false)} aria-label="Close">
                    ×
                  </button>
                </div>
                <div className="loan-view-id">
                  <FaCreditCard className="loan-view-id-icon" />
                  <span>#{selectedPayment.id}</span>
                  <span className="loan-view-date">{formatDateTime(selectedPayment.created_at)}</span>
                </div>
              </div>

              <div className="loan-view-body">
                <div className="loan-view-card loan-view-customer">
                  <div className="loan-view-card-title">
                    <FaUsers />
                    <span>{t.customer}</span>
                  </div>
                  <div className="loan-view-customer-name">{capitalizeName(selectedPayment.customer_name)}</div>
                  <div className="loan-view-customer-phone">{selectedPayment.customer_phone}</div>
                </div>

                <div className="loan-view-card loan-view-items">
                  <div className="loan-view-card-title">
                    <FaBox />
                    <span>{selectedPayment.items && selectedPayment.items.length > 0 ? t.spareParts : t.sparePart}</span>
                  </div>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="loan-view-items-list">
                      {selectedPayment.items.map((item, idx) => (
                        <div key={idx} className="loan-view-item-row">
                          <div className="loan-view-item-main">
                            <span className="loan-view-item-name">{capitalizeName(item.sparepart_name || 'Unknown')}</span>
                            <span className="loan-view-item-meta">
                              {(item.sparepart_number || 'N/A').toUpperCase()} · Qty: {item.quantity}
                            </span>
                          </div>
                          <div className="loan-view-item-amount">
                            TZS {formatPrice(item.total_amount || (item.quantity * (item.unit_price || 0)))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="loan-view-item-row">
                      <div className="loan-view-item-main">
                        <span className="loan-view-item-name">{capitalizeName(selectedPayment.sparepart_name)}</span>
                        <span className="loan-view-item-meta">
                          {(selectedPayment.sparepart_number || 'N/A').toUpperCase()} · Qty: {selectedPayment.quantity}
                        </span>
                      </div>
                      <div className="loan-view-item-amount">
                        TZS {formatPrice((Number(selectedPayment.quantity) || 0) * (Number(selectedPayment.unit_price) || 0))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="loan-view-card loan-view-summary">
                  <div className="loan-view-summary-row">
                    <span>{t.paymentMethod}</span>
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                  <div className="loan-view-summary-row">
                    <span>{t.amountReceived}</span>
                    <span className="loan-view-amount">
                      {selectedPayment.amount_received != null ? `TZS ${formatPrice(selectedPayment.amount_received)}` : '—'}
                    </span>
                  </div>
                  <div className="loan-view-summary-row loan-view-remain">
                    <span>Amount Remain</span>
                    <span className="loan-view-amount loan-view-amount-highlight">TZS {formatPrice(amountRemainVal)}</span>
                  </div>
                </div>
              </div>

              <div className="loan-view-footer">
                <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEditModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!editSaving) setShowEditModal(false);
          }}
        >
          <div className="modal-content view-modal loan-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.edit} Loan</h2>
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
                  <label><FaUser /> {t.customer}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      readOnly
                      title={t.fromCustomerRecord || 'From customer record; edit in Sales/Customers if needed.'}
                      value={capitalizeName(selectedPayment.customer_name || '')}
                      className="loan-edit-input"
                      style={{
                        backgroundColor: 'var(--input-readonly-bg, #f0f2f5)',
                        textTransform: 'uppercase',
                        cursor: 'default',
                        color: 'inherit',
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.phone || 'Phone'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      readOnly
                      title={t.fromCustomerRecord || 'From customer record; edit in Sales/Customers if needed.'}
                      className="loan-edit-input"
                      value={selectedPayment.customer_phone || ''}
                      style={{
                        backgroundColor: 'var(--input-readonly-bg, #f0f2f5)',
                        cursor: 'default',
                        color: 'inherit',
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.sparePart || 'Spareparts'}</label>
                  <div className="view-value">
                    <select
                      value={sparepartIdInput}
                      onChange={(e) => setSparepartIdInput(e.target.value)}
                      className="loan-edit-input"
                      disabled
                      aria-readonly="true"
                      style={{
                        backgroundColor: 'var(--input-readonly-bg, #f0f2f5)',
                        cursor: 'default',
                        color: 'inherit',
                      }}
                    >
                      <option value="">{t.select || 'Select'}...</option>
                      {sparepartsOptions.map((sp) => (
                        <option key={sp.id} value={sp.id}>
                          {capitalizeName(sp.part_name || '—')} ({String(sp.part_number || '').toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.paymentType || 'Payment type'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      readOnly
                      aria-readonly="true"
                      className="loan-edit-input"
                      value={
                        String(selectedPayment.payment_type || '').trim()
                          ? String(selectedPayment.payment_type).trim()
                          : '—'
                      }
                      style={{
                        backgroundColor: 'var(--input-readonly-bg, #f0f2f5)',
                        cursor: 'default',
                        color: 'inherit',
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentMethod || 'Payment Method'}</label>
                  <div className="view-value">
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      className="loan-edit-input"
                    >
                      <option value="">{t.selectPaymentMethod || 'Select Payment Method'}</option>
                      <option value="Cash">Cash</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Mix By Yas">Mix By Yas</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived || 'Amount Received'} ({t.current || 'Current'})</label>
                  <div className="view-value" style={{ fontWeight: 700 }}>
                    TZS {formatPrice(selectedPayment.amount_received || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived || 'Amount Received'} ({t.add || 'Add'})</label>
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
                <div className="view-item">
                  <label>Split payment (optional)</label>
                  <div className="view-value" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input type="text" inputMode="decimal" className="loan-edit-input" placeholder="Cash" value={splitCashInput} onChange={(e) => setSplitCashInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="loan-edit-input" placeholder="Bank Transfer" value={splitBankInput} onChange={(e) => setSplitBankInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="loan-edit-input" placeholder="Airtel Money" value={splitAirtelInput} onChange={(e) => setSplitAirtelInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="loan-edit-input" placeholder="M-Pesa" value={splitMpesaInput} onChange={(e) => setSplitMpesaInput(e.target.value.replace(/[^\d.]/g, ''))} />
                    <input type="text" inputMode="decimal" className="loan-edit-input" placeholder="Mix By Yas" value={splitYasInput} onChange={(e) => setSplitYasInput(e.target.value.replace(/[^\d.]/g, ''))} />
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain || 'Amount Remain'}</label>
                  <div className="view-value" style={{ fontWeight: 'bold' }}>
                    TZS {formatPrice(
                      Math.max(
                        0,
                        getAmountRemain(selectedPayment) -
                          (
                            parseCommaNumber(editAmountReceived) +
                            parseCommaNumber(splitCashInput) +
                            parseCommaNumber(splitBankInput) +
                            parseCommaNumber(splitAirtelInput) +
                            parseCommaNumber(splitMpesaInput) +
                            parseCommaNumber(splitYasInput)
                          )
                      )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.status || 'Status'}</label>
                  <div className="view-value">
                    <span className={`status-badge ${(selectedPayment.status || '').toLowerCase()}`}>
                      {selectedPayment.status || '—'}
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
                className="loan-edit-save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveEdit();
                }}
                disabled={editSaving}
              >
                {editSaving ? (t.saving || 'Saving...') : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerLoans;
