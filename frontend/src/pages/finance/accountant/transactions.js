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
  FaCalendarAlt,
  FaEye,
  FaUsers,
  FaBox,
  FaPrint,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from 'react-icons/fa';
import '../cashier/dashboard.css';
import './transactions.css';
import '../../sales/payments.css';
import '../cashier/reports.css';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import { getCurrentDateTime } from '../../../utils/dateTime';

function AccountantTransactions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

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
        const res = await getPayments();
        if (res.success && res.payments) setPayments(res.payments);
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

  // Load logo as data URL for print document (match loans report)
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

  // Update date-time display every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);
    return () => clearInterval(intervalId);
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

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '0';
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
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

  const toNum = (v) => Number(v) || 0;
  const toNumPayment = (v) => Number(v) || 0;

  const normalizePaymentMethod = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const isMpesaPaymentMethod = (value) => {
    const m = normalizePaymentMethod(value);
    return m === 'mpesa' || m === 'm-pesa' || m.includes('mpesa') || m.includes('m-pesa');
  };

  const isAirtelMoneyPaymentMethod = (value) => {
    const m = normalizePaymentMethod(value);
    return m.includes('airtel');
  };

  const isYasPaymentMethod = (value) => {
    const m = normalizePaymentMethod(value);
    return (m.includes('mix') && m.includes('yas')) || m === 'yas';
  };

  const isMobilePaymentMethod = (value) =>
    isMpesaPaymentMethod(value) || isAirtelMoneyPaymentMethod(value) || isYasPaymentMethod(value);

  const hasAnyChannelAmount = (p) =>
    toNumPayment(p.cash) +
      toNumPayment(p.bank_transfer) +
      toNumPayment(p.airtel_money) +
      toNumPayment(p.mpesa) +
      toNumPayment(p.mix_by_yas) >
    0;

  const getRecordDateForReports = (payment) => {
    if (!payment) return null;
    const isLoan = String(payment?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan) return payment.updated_at || payment.created_at;
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  const filterByDateRange = (paymentList) => {
    if (!dateFrom && !dateTo) return paymentList;
    return paymentList.filter((p) => {
      const recordDate = getRecordDateForReports(p);
      if (!recordDate) return false;
      const d = new Date(recordDate);
      if (Number.isNaN(d.getTime())) return false;
      const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (dateFrom && dateOnly < dateFrom) return false;
      if (dateTo && dateOnly > dateTo) return false;
      return true;
    });
  };

  const paymentMatchesSelectedMethod = (p) => {
    if (paymentMethodFilter === 'all') return true;
    const m = String(p.payment_method || '').toLowerCase().trim();
    const cash = toNumPayment(p.cash);
    const bank = toNumPayment(p.bank_transfer);
    const airtel = toNumPayment(p.airtel_money);
    const mpesa = toNumPayment(p.mpesa);
    const yas = toNumPayment(p.mix_by_yas);
    const hasCh = hasAnyChannelAmount(p);

    if (paymentMethodFilter === 'cash') {
      if (cash > 0) return true;
      if (!hasCh && m === 'cash') return true;
      return false;
    }
    if (paymentMethodFilter === 'bank') {
      if (bank > 0) return true;
      if (!hasCh && m === 'bank transfer') return true;
      return false;
    }
    if (paymentMethodFilter === 'mpesa') {
      if (mpesa > 0) return true;
      if (!hasCh && isMpesaPaymentMethod(p.payment_method)) return true;
      return false;
    }
    if (paymentMethodFilter === 'airtel') {
      if (airtel > 0) return true;
      if (!hasCh && isAirtelMoneyPaymentMethod(p.payment_method)) return true;
      return false;
    }
    if (paymentMethodFilter === 'yas') {
      if (yas > 0) return true;
      if (!hasCh && isYasPaymentMethod(p.payment_method)) return true;
      return false;
    }
    if (paymentMethodFilter === 'mobile') {
      if (mpesa > 0 || airtel > 0 || yas > 0) return true;
      if (!hasCh && isMobilePaymentMethod(p.payment_method)) return true;
      return false;
    }
    return true;
  };

  // Match cashier/reports data pipeline: date -> method -> search.
  const timeFilteredPayments = filterByDateRange(payments);
  const methodFilteredPayments = timeFilteredPayments.filter((p) => paymentMatchesSelectedMethod(p));
  const filteredPayments = methodFilteredPayments.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    return (
      !term ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.customer_phone && p.customer_phone.includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number?.toLowerCase().includes(term)) ||
      (p.items &&
        p.items.some(
          (i) =>
            (i.sparepart_name || '').toLowerCase().includes(term) ||
            (i.sparepart_number || '').toLowerCase().includes(term)
        ))
    );
  });

  // Date + search only (ignore payment method filter), like cashier reports cards.
  const dateAndSearchPayments = timeFilteredPayments.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    return (
      !term ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.customer_phone && p.customer_phone.includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number?.toLowerCase().includes(term)) ||
      (p.items &&
        p.items.some(
          (i) =>
            (i.sparepart_name || '').toLowerCase().includes(term) ||
            (i.sparepart_number || '').toLowerCase().includes(term)
        ))
    );
  });

  const isLoanPaymentType = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
  const isSalesPaymentType = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';

  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const loansForCards = dateAndSearchPayments.filter((p) => isLoanPaymentType(p) && p.status === 'Approved');
  const receiptsForCards = dateAndSearchPayments.filter((p) => isSalesPaymentType(p) && p.status !== 'Pending');
  const cardsPayments = [...loansForCards, ...receiptsForCards];

  const cashTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.cash), 0);
  const bankTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.bank_transfer), 0);
  const airtelTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.airtel_money), 0);
  const mpesaTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.mpesa), 0);
  const yasTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.mix_by_yas), 0);

  // Loan paid: Approved + loan type + amount_received > 0 + positive amount due.
  const loanPaidPayments = dateAndSearchPayments.filter((p) => {
    if (p.status !== 'Approved') return false;
    const received = Number(p.amount_received) || 0;
    if (received <= 0) return false;
    if (!isLoanPaymentType(p)) return false;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const netDue = Math.max(0, total - discount);
    if (netDue <= 0) return false;
    const remain = getAmountRemain(p);
    if (Number.isNaN(remain)) return false;
    return remain === 0 || remain > 0;
  });

  const loanPaidTotal = loanPaidPayments.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
  const loanPaidCount = loanPaidPayments.length;

  const loanPaidCashTotal = loanPaidPayments.reduce((sum, p) => sum + toNum(p.cash), 0);
  const loanPaidBankTotal = loanPaidPayments.reduce((sum, p) => sum + toNum(p.bank_transfer), 0);
  const loanPaidAirtelTotal = loanPaidPayments.reduce((sum, p) => sum + toNum(p.airtel_money), 0);
  const loanPaidMpesaTotal = loanPaidPayments.reduce((sum, p) => sum + toNum(p.mpesa), 0);
  const loanPaidYasTotal = loanPaidPayments.reduce((sum, p) => sum + toNum(p.mix_by_yas), 0);
  const loanPaidCreditTotal = loanPaidPayments
    .filter((p) => {
      const m = String(p.payment_method || '').trim().toLowerCase();
      return m === 'credit' || m === 'credit card';
    })
    .reduce((sum, p) => sum + toNum(p.amount_received), 0);

  const totalDirectSales = cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal;
  const totalAmountReceivedForCards = totalDirectSales + loanPaidTotal;
  const approvedCountForCards = cardsPayments.filter((p) => p.status === 'Approved').length;
  const selectedMethodLabel =
    paymentMethodFilter === 'cash'
      ? 'Cash'
      : paymentMethodFilter === 'bank'
      ? 'Bank Transfer'
      : paymentMethodFilter === 'mobile'
      ? 'Mobile'
      : paymentMethodFilter === 'mpesa'
      ? 'M-Pesa'
      : paymentMethodFilter === 'airtel'
      ? 'Airtel Money'
      : paymentMethodFilter === 'yas'
      ? 'Mix by YAS'
      : 'All methods';

  const selectedMethodApprovedPayments = filteredPayments.filter((p) => p.status === 'Approved');
  const selectedMethodTotalAmount = selectedMethodApprovedPayments.reduce(
    (sum, p) => sum + (Number(p.amount_received) || 0),
    0
  );
  const selectedMethodCount = selectedMethodApprovedPayments.length;

  const isApprovedPayment = (p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Approved' || (p.status === 'Pending' && total - received === 0);
  };

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const approvedCount = filteredPayments.filter((p) => isApprovedPayment(p)).length;
  const pendingCount = filteredPayments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Pending' && total - received > 0;
  }).length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  // Only show approved transactions in the table
  const approvedPaymentsForTable = filteredPayments.filter((p) => isApprovedPayment(p));

  const totalAmountLabelByTime = () => {
    if (dateFrom && dateTo) return `Total amount (${dateFrom} to ${dateTo})`;
    if (dateFrom) return `Total amount (from ${dateFrom})`;
    if (dateTo) return `Total amount (until ${dateTo})`;
    return 'Total amount (all time)';
  };

  const getMethod = (p) => (p.payment_method || '').toLowerCase();

  // Totals by payment method – use amount_received so cards show actual cash/bank/mobile received
  const totalCash = approvedPaymentsForTable.reduce(
    (sum, p) => (getMethod(p).includes('cash') ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );

  const totalBankTransfer = approvedPaymentsForTable.reduce(
    (sum, p) =>
      getMethod(p).includes('bank') || getMethod(p).includes('transfer')
        ? sum + (Number(p.amount_received) || 0)
        : sum,
    0
  );

  const totalMobilePayments = approvedPaymentsForTable.reduce(
    (sum, p) =>
      getMethod(p).includes('mobile') ||
      getMethod(p).includes('mpesa') ||
      getMethod(p).includes('tigo') ||
      getMethod(p).includes('airtel')
        ? sum + (Number(p.amount_received) || 0)
        : sum,
    0
  );

  const totalAmountRemain = approvedPaymentsForTable.reduce((sum, p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const remain = total - received;
    return sum + Math.max(0, remain);
  }, 0);

  const totalAmountReceived = totalCash + totalBankTransfer + totalMobilePayments;

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    return 'pending';
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return 'Approved';
    if (status === 'Rejected') return 'Rejected';
    return 'Pending';
  };

  const paymentMethodWithAmount = (p) => {
    const method = String(p?.payment_method || '—').trim() || '—';
    const amt = Number(p?.amount_received) || 0;
    return amt > 0 ? `${method} · ${formatCurrency(amt)}` : method;
  };

  const getPaymentChannelsList = (p) => {
    if (!p) return [];
    const toN = (v) => Number(v) || 0;
    return [
      { label: 'Cash', val: toN(p.cash) },
      { label: 'Bank Transfer', val: toN(p.bank_transfer) },
      { label: 'Airtel Money', val: toN(p.airtel_money) },
      { label: 'M-Pesa', val: toN(p.mpesa) },
      { label: 'Mix by YAS', val: toN(p.mix_by_yas) },
    ].filter((c) => c.val > 0);
  };

  const paymentMethodForPrintRow = (p) => {
    const channels = getPaymentChannelsList(p);
    if (channels.length >= 2) {
      return channels.map((c) => `${c.label} ${formatCurrency(c.val)}`).join('\n');
    }
    if (channels.length === 1) {
      return `${channels[0].label} ${formatCurrency(channels[0].val)}`;
    }
    return paymentMethodWithAmount(p);
  };

  const amountReceivedForPrintRow = (p) => {
    const channels = getPaymentChannelsList(p);
    if (channels.length > 0) return channels.reduce((s, c) => s + c.val, 0);
    return Number(p?.amount_received) || 0;
  };

  /** Amount + label for selected print filter only (split payments -> one/multi selected channels). */
  const getSelectedChannelForPrint = (p) => {
    const m = String(p.payment_method || '').toLowerCase().trim();
    const hasCh = hasAnyChannelAmount(p);
    const recv = Number(p.amount_received) || 0;

    switch (paymentMethodFilter) {
      case 'cash': {
        const v = toNumPayment(p.cash);
        if (v > 0) return { label: 'Cash', val: v };
        if (!hasCh && m === 'cash') return { label: 'Cash', val: recv };
        return null;
      }
      case 'bank': {
        const v = toNumPayment(p.bank_transfer);
        if (v > 0) return { label: 'Bank Transfer', val: v };
        if (!hasCh && m === 'bank transfer') return { label: 'Bank Transfer', val: recv };
        return null;
      }
      case 'mpesa': {
        const v = toNumPayment(p.mpesa);
        if (v > 0) return { label: 'M-Pesa', val: v };
        if (!hasCh && isMpesaPaymentMethod(p.payment_method)) return { label: 'M-Pesa', val: recv };
        return null;
      }
      case 'airtel': {
        const v = toNumPayment(p.airtel_money);
        if (v > 0) return { label: 'Airtel Money', val: v };
        if (!hasCh && isAirtelMoneyPaymentMethod(p.payment_method)) return { label: 'Airtel Money', val: recv };
        return null;
      }
      case 'yas': {
        const v = toNumPayment(p.mix_by_yas);
        if (v > 0) return { label: 'Mix by YAS', val: v };
        if (!hasCh && isYasPaymentMethod(p.payment_method)) return { label: 'Mix by YAS', val: recv };
        return null;
      }
      case 'mobile': {
        const vMpesa = toNumPayment(p.mpesa);
        const vAirtel = toNumPayment(p.airtel_money);
        const vYas = toNumPayment(p.mix_by_yas);
        const sum = vMpesa + vAirtel + vYas;
        if (sum > 0) {
          const parts = [];
          if (vMpesa > 0) parts.push(`M-Pesa ${formatCurrency(vMpesa)}`);
          if (vAirtel > 0) parts.push(`Airtel Money ${formatCurrency(vAirtel)}`);
          if (vYas > 0) parts.push(`Mix by YAS ${formatCurrency(vYas)}`);
          return { label: parts.join('\n'), val: sum, isMultiLine: true };
        }
        if (!hasCh && isMobilePaymentMethod(p.payment_method)) {
          return { label: String(p.payment_method || 'Mobile'), val: recv, isMultiLine: false };
        }
        return null;
      }
      default:
        return null;
    }
  };

  const paymentMethodForPrintRowScoped = (p) => {
    if (paymentMethodFilter === 'all') return paymentMethodForPrintRow(p);
    const sel = getSelectedChannelForPrint(p);
    if (sel?.isMultiLine) return sel.label;
    if (sel) return `${sel.label} · ${formatCurrency(sel.val)}`;
    return paymentMethodForPrintRow(p);
  };

  const amountReceivedForPrintRowScoped = (p) => {
    if (paymentMethodFilter === 'all') return amountReceivedForPrintRow(p);
    const sel = getSelectedChannelForPrint(p);
    if (sel) return sel.val;
    return amountReceivedForPrintRow(p);
  };

  /** Totals for the printed report footer — same rows as the print table (`approvedForPrint`). */
  const buildPrintSummaryFromApprovedRows = (approvedRows) => {
    const toN = (v) => Number(v) || 0;
    const isLoanT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    const isSalesT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';

    const receiptsSales = approvedRows.filter((p) => isSalesT(p) && p.status !== 'Pending');
    const loanPaidRows = approvedRows.filter((p) => {
      if (p.status !== 'Approved') return false;
      const received = toN(p.amount_received);
      if (received <= 0) return false;
      if (!isLoanT(p)) return false;

      const total = toN(p.total_amount);
      const discount = toN(p.discount_amount);
      const netDue = Math.max(0, total - discount);
      if (netDue <= 0) return false;

      const remain = getAmountRemain(p);
      if (Number.isNaN(remain)) return false;

      const loanFullyPaid = remain === 0;
      const debtReduced = remain > 0;
      return loanFullyPaid || debtReduced;
    });

    const cashTotal = receiptsSales.reduce((s, p) => s + toN(p.cash), 0);
    const bankTotal = receiptsSales.reduce((s, p) => s + toN(p.bank_transfer), 0);
    const airtelTotal = receiptsSales.reduce((s, p) => s + toN(p.airtel_money), 0);
    const mpesaTotal = receiptsSales.reduce((s, p) => s + toN(p.mpesa), 0);
    const yasTotal = receiptsSales.reduce((s, p) => s + toN(p.mix_by_yas), 0);

    const totalDirectSales = cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal;

    const loanPaidTotal = loanPaidRows.reduce((s, p) => s + toN(p.amount_received), 0);
    const loanPaidCashTotal = loanPaidRows.reduce((s, p) => s + toN(p.cash), 0);
    const loanPaidBankTotal = loanPaidRows.reduce((s, p) => s + toN(p.bank_transfer), 0);
    const loanPaidAirtelTotal = loanPaidRows.reduce((s, p) => s + toN(p.airtel_money), 0);
    const loanPaidMpesaTotal = loanPaidRows.reduce((s, p) => s + toN(p.mpesa), 0);
    const loanPaidYasTotal = loanPaidRows.reduce((s, p) => s + toN(p.mix_by_yas), 0);
    const loanPaidCreditTotal = loanPaidRows
      .filter((p) => {
        const m = String(p.payment_method || '').trim().toLowerCase();
        return m === 'credit' || m === 'credit card';
      })
      .reduce((s, p) => s + toN(p.amount_received), 0);

    const totalAmount =
      cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal + loanPaidTotal;

    return {
      cashTotal,
      bankTotal,
      airtelTotal,
      mpesaTotal,
      yasTotal,
      totalDirectSales,
      loanPaidCashTotal,
      loanPaidBankTotal,
      loanPaidAirtelTotal,
      loanPaidMpesaTotal,
      loanPaidYasTotal,
      loanPaidCreditTotal,
      loanPaidTotal,
      totalAmount,
    };
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handlePrint = () => {
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
                <th class="tl">Date</th>
                <th class="tl">Customer</th>
                <th class="tl">Items</th>
                <th class="tc">Payment type</th>
                <th class="tc">Payment method</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tl">Status</th>
              </tr>
            </thead>`;

    const selectedMethodPrintLabel = selectedMethodLabel;
    const approvedForPrint = approvedPaymentsForTable.filter((p) => {
      if (p.status !== 'Approved') return false;
      const isLoanWithZeroReceived =
        String(p?.payment_type ?? '').trim().toLowerCase() === 'loan' &&
        (Number(p?.amount_received) || 0) <= 0;
      return !isLoanWithZeroReceived;
    });
    const printSummary = buildPrintSummaryFromApprovedRows(approvedForPrint);
    const selectedMethodPrintTotal = approvedForPrint.reduce(
      (sum, p) => sum + amountReceivedForPrintRowScoped(p),
      0
    );
    const selectedMethodPrintCount = approvedForPrint.length;

    const singleDaySummaryNote =
      dateFrom && dateTo && dateFrom === dateTo
        ? `<div class="tax-inv-footer-row"><label>Summary scope:</label> All approved transactions on ${String(
            dateFrom
          ).replace(/</g, '&lt;')} (same as listed above).</div>`
        : '';

    const rowsHtml =
      approvedForPrint.length === 0
        ? '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          approvedForPrint
            .map((p, idx) => {
              const received = amountReceivedForPrintRowScoped(p);
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'))
                      .join('<br />')
                  : (p.sparepart_name || '—').replace(/</g, '&lt;');
              const paymentType = String(p.payment_type || '—').replace(/</g, '&lt;');
              const paymentMethodCell = String(paymentMethodForPrintRowScoped(p) || '—')
                .replace(/</g, '&lt;')
                .replace(/\n/g, '<br />');
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${getRecordDateForReports(p) ? formatDateTime(getRecordDateForReports(p)) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${paymentType}</td>
                  <td class="tc">${paymentMethodCell}</td>
                  <td class="tr">${formatCurrency(received)}</td>
                  <td class="tl">${getStatusLabel(p.status)}</td>
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
            ${
              paymentMethodFilter !== 'all'
                ? `
            <div class="tax-inv-footer-row"><label>Payment method filter:</label> ${selectedMethodPrintLabel}</div>
            <div class="tax-inv-footer-row"><label>Total (${selectedMethodPrintLabel}) (TZS):</label> ${formatCurrency(selectedMethodPrintTotal)}</div>
            <div class="tax-inv-footer-row"><label>Transactions (this method):</label> ${selectedMethodPrintCount}</div>
            <p style="margin:12px 0 0;font-size:10px;color:#555;">Only transactions that include this method are listed. Amounts show the portion received via this method only.</p>
            `
                : `
            ${singleDaySummaryNote}
            <div class="tax-inv-footer-row"><label>Direct Sales by Cash (TZS):</label> ${formatCurrency(printSummary.cashTotal)}</div>
            <div class="tax-inv-footer-row"><label>Direct Sales by Bank transfer (TZS):</label> ${formatCurrency(printSummary.bankTotal)}</div>
            <div class="tax-inv-footer-row"><label>Direct Sales by Airtel Money (TZS):</label> ${formatCurrency(printSummary.airtelTotal)}</div>
            <div class="tax-inv-footer-row"><label>Direct Sales by M-Pesa (TZS):</label> ${formatCurrency(printSummary.mpesaTotal)}</div>
            <div class="tax-inv-footer-row"><label>Direct Sales by Mix by YAS (TZS):</label> ${formatCurrency(printSummary.yasTotal)}</div>
            <div class="tax-inv-footer-row"><label>Total Direct Sales (TZS):</label> ${formatCurrency(printSummary.totalDirectSales)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by Cash (TZS):</label> ${formatCurrency(printSummary.loanPaidCashTotal)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by Bank transfer (TZS):</label> ${formatCurrency(printSummary.loanPaidBankTotal)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by Airtel Money (TZS):</label> ${formatCurrency(printSummary.loanPaidAirtelTotal)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by M-Pesa (TZS):</label> ${formatCurrency(printSummary.loanPaidMpesaTotal)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by Mix by YAS (TZS):</label> ${formatCurrency(printSummary.loanPaidYasTotal)}</div>
            <div class="tax-inv-footer-row"><label>Loan paid by Credit (TZS):</label> ${formatCurrency(printSummary.loanPaidCreditTotal)}</div>
            <div class="tax-inv-footer-row"><label>Total Loan paid (TZS):</label> ${formatCurrency(printSummary.loanPaidTotal)}</div>
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatCurrency(printSummary.totalAmount)}</div>
            `
            }
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
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
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Transactions</h1>
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
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Accountant')}</span>
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

          {/* Action bar (match cashier reports layout) */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by customer, phone, or spare part..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="reports-period-filter">
              <label className="filter-label">From</label>
              <input
                type="date"
                className="reports-period-select"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="reports-period-filter">
              <label className="filter-label">To</label>
              <input
                type="date"
                className="reports-period-select"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="reports-period-filter">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="reports-period-select"
              >
                <option value="all">All payment methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mobile">Mobile</option>
                <option value="mpesa">M-Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="yas">Mix by YAS</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="action-btn print"
              style={{
                marginLeft: '15px',
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
                fontWeight: '500'
              }}
            >
              <FaPrint />
              <span>Print Transactions</span>
            </button>
          </div>

          {/* Summary cards (match cashier reports layout) */}
          <div className="stats-grid">
            {paymentMethodFilter !== 'all' && (
              <div className="stat-card stat-warning">
                <div className="stat-info">
                  <h3 className="stat-title">{selectedMethodLabel} (Approved)</h3>
                  <p className="stat-value">{formatCurrency(selectedMethodTotalAmount)}</p>
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    {selectedMethodCount} transactions
                  </p>
                </div>
              </div>
            )}
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Total amount received</h3>
                <p className="stat-value">{formatCurrency(totalAmountReceivedForCards)}</p>
              </div>
            </div>

            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Approved</h3>
                <p className="stat-value">{approvedCountForCards}</p>
              </div>
            </div>

            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Cash</h3>
                <p className="stat-value">{formatCurrency(cashTotal)}</p>
              </div>
            </div>

            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Bank Transfer</h3>
                <p className="stat-value">{formatCurrency(bankTotal)}</p>
              </div>
            </div>

            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Airtel Money</h3>
                <p className="stat-value">{formatCurrency(airtelTotal)}</p>
              </div>
            </div>

            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">M-Pesa</h3>
                <p className="stat-value">{formatCurrency(mpesaTotal)}</p>
              </div>
            </div>

            <div className="stat-card stat-warning">
              <div className="stat-info">
                <h3 className="stat-title">Mix by YAS</h3>
                <p className="stat-value">{formatCurrency(yasTotal)}</p>
              </div>
            </div>

            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Loan Paid</h3>
                <p className="stat-value">{formatCurrency(loanPaidTotal)}</p>
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  Amount received: {formatCurrency(loanPaidTotal)}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                  {loanPaidCount} transactions
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '0.78rem', opacity: 0.88, lineHeight: 1.4 }}>
                  Airtel Money: {formatCurrency(loanPaidAirtelTotal)} <br />
                  M-Pesa: {formatCurrency(loanPaidMpesaTotal)} <br />
                  Mix by YAS: {formatCurrency(loanPaidYasTotal)}
                </p>
              </div>
            </div>
          </div>

          {/* Latest transactions table (match cashier reports table layout) */}
          <div className="transactions-section">
            <div className="table-container" style={{ marginTop: '30px' }}>
              <h2 style={{ marginBottom: '15px' }}>Recent Transactions</h2>
              <table
                className="transactions-table"
                style={{ width: '8000px', minWidth: '8000px' }}
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>SparePart</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                    <th>Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.filter((p) => p.status === 'Approved').length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredPayments
                      .filter((p) => p.status === 'Approved')
                      .slice(0, 20)
                      .map((p) => (
                        <tr
                          key={p.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleView(p)}
                          title="View details"
                        >
                          <td>
                            {getRecordDateForReports(p)
                              ? String(getRecordDateForReports(p)).replace('T', ' ').slice(0, 16)
                              : ''}
                          </td>
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
                          <td style={{ maxWidth: 220 }}>{paymentMethodWithAmount(p)}</td>
                          <td>{getStatusLabel(p.status)}</td>
                          <td>{formatCurrency(p.amount_received)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="transactions-section" style={{ display: 'none' }}>
            <div className="section-header">
              <h2>Transaction Records</h2>
              <div className="section-actions">
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  >
                    <option value="all">All payment methods</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="airtel">Airtel Money</option>
                    <option value="yas">Mix by YAS</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">From</label>
                  <input
                    type="date"
                    className="filter-select"
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
                    className="filter-select"
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
                      className="filter-clear-dates"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      title="Clear date filter"
                    >
                      Clear dates
                    </button>
                  </div>
                ) : null}
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
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Actions</th>
                    <th>Receipt No</th>
                    <th>Customer</th>
                    <th>SparePart</th>
                    <th>Total Amount</th>
                    <th>Amount Received</th>
                    <th>Amount Remain</th>
                    <th>Payment Method</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPaymentsForTable.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="no-data">
                        No approved transactions found
                      </td>
                    </tr>
                  ) : (
                    approvedPaymentsForTable.map((payment) => {
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
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn view"
                                title="View"
                                onClick={() => handleView(payment)}
                              >
                                <FaEye className="action-icon" />
                              </button>
                            </div>
                          </td>
                          <td>
                            #{payment.id}
                          </td>
                          <td>
                            <div className="customer-info">
                              <FaUsers className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                                {payment.customer_phone && (
                                  <div className="info-detail">{payment.customer_phone}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {payment.items && payment.items.length > 0 ? (
                              <div>
                                {payment.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="part-info"
                                    style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}
                                  >
                                    <FaBox className="info-icon" />
                                    <div>
                                      <div className="info-name">
                                        {capitalizeName(item.sparepart_name || 'Unknown')}
                                      </div>
                                      <div className="info-detail">
                                        {(item.sparepart_number || 'N/A').toUpperCase()} - Qty: {item.quantity}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="part-info">
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(payment.sparepart_name || 'Unknown')}</div>
                                  <div className="info-detail">
                                    {(payment.sparepart_number || 'N/A').toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="amount-cell">TZS {formatPrice(payment.total_amount)}</td>
                          <td className="amount-cell">
                            {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                          </td>
                          <td className="amount-cell">TZS {formatPrice(Math.max(0, amountRemain))}</td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td>
                            {formatDateTime(payment.created_at)}
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
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
        <div className="transactions-modal-overlay" onClick={() => setShowViewModal(false)} style={{ display: 'none' }}>
          <div className="transactions-modal-content transactions-view-form-wrapper" onClick={(e) => e.stopPropagation()}>
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
                          const displayStatus = selectedPayment.status === 'Rejected' ? 'Rejected' : selectedPayment.status === 'Approved' || remain === 0 ? 'Approved' : 'Pending';
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
                        {selectedPayment.amount_received != null
                          ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                          : '—'}
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

      {/* Match cashier reports modal layout */}
      {showViewModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => setShowViewModal(false)}
          style={{ zIndex: 2000 }}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <div className="modal-header">
              <h2>Transaction details</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowViewModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>Date &amp; time</label>
                  <div className="view-value">
                    {selectedPayment.created_at
                      ? selectedPayment.created_at.replace('T', ' ').slice(0, 16)
                      : '—'}
                  </div>
                </div>

                <div className="view-item">
                  <label>Customer</label>
                  <div className="view-value">
                    {capitalizeName(selectedPayment.customer_name) || '—'}
                    {selectedPayment.customer_phone && (
                      <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                        {selectedPayment.customer_phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="view-item">
                  <label>Spare part</label>
                  <div className="view-value">
                    {selectedPayment.items && selectedPayment.items.length > 0 ? (
                      selectedPayment.items.map((item, idx) => (
                        <div key={idx} style={{ marginBottom: idx < selectedPayment.items.length - 1 ? '6px' : '0' }}>
                          {capitalizeName(item.sparepart_name || 'Unknown')} ({(item.sparepart_number || 'N/A').toUpperCase()})
                        </div>
                      ))
                    ) : (
                      <>
                        {capitalizeName(selectedPayment.sparepart_name || '—')}
                        {selectedPayment.sparepart_number && (
                          <span style={{ color: '#666' }}>
                            {' '}
                            · {selectedPayment.sparepart_number.toUpperCase()}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="view-item">
                  <label>Payment method</label>
                  <div className="view-value" style={{ fontWeight: 600 }}>
                    {paymentMethodWithAmount(selectedPayment)}
                  </div>
                </div>

                <div className="view-item">
                  <label>Amount received</label>
                  <div className="view-value">{formatCurrency(selectedPayment.amount_received)}</div>
                </div>

                <div className="view-item">
                  <label>Status</label>
                  <div className="view-value">{getStatusLabel(selectedPayment.status)}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="cancel-btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantTransactions;
