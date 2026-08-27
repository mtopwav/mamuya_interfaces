import React, { useEffect, useRef, useState } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaBars,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaCreditCard,
  FaCheckCircle,
  FaEdit,
  FaEye,
  FaFileInvoice,
  FaBox,
  FaClock,
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
import { getPayments, updatePaymentDetails, getSpareParts } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

/** YYYY-MM-DD bounds for summing installment events (matches GET /api/payments receivedSumFrom/To). */
function getReceivedSumQueryParams(timeFilter, customDateFrom, customDateTo) {
  const pad = (n) => String(n).padStart(2, '0');
  const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (timeFilter === 'all') return {};

  if (timeFilter === 'custom') {
    const from = String(customDateFrom || '').trim();
    const to = String(customDateTo || '').trim();
    if (!from || !to) return {};
    return { receivedSumFrom: from, receivedSumTo: to };
  }

  const end = new Date();
  if (timeFilter === 'today') {
    const ymd = toYmd(end);
    return { receivedSumFrom: ymd, receivedSumTo: ymd };
  }
  if (timeFilter === 'week') {
    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return { receivedSumFrom: toYmd(start), receivedSumTo: toYmd(end) };
  }
  if (timeFilter === 'month') {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return { receivedSumFrom: toYmd(start), receivedSumTo: toYmd(end) };
  }
  return {};
}

function getDisplayedAmountReceived(payment, receivedSumQueryParams) {
  const usePeriod = Object.keys(receivedSumQueryParams || {}).length > 0;
  if (!usePeriod) return Number(payment.amount_received) || 0;
  return Number(payment.amount_received_in_range) || 0;
}

/** Add installment to the channel matching payment_method; Loan / Credit Card do not change channel columns. */
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

function CashierLoans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
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
  const editSaveInFlightRef = useRef(false);
  const paymentsFirstLoadRef = useRef(true);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      setLoading(false);
      navigate('/login');
      return;
    }
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      const allowed =
        parsedUser.userType === 'admin' ||
        (parsedUser.userType === 'employee' &&
          parsedUser.department === 'Finance' &&
          parsedUser.position === 'Cashier');
      if (!allowed) {
        setLoading(false);
        navigate('/login');
        return;
      }
    } catch {
      setLoading(false);
      navigate('/login');
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
      setNow(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const loadPayments = async () => {
      if (paymentsFirstLoadRef.current) setLoading(true);
      const receivedParams = getReceivedSumQueryParams(timeFilter, customDateFrom, customDateTo);
      try {
        const [paymentsResponse, sparePartsResponse] = await Promise.all([
          getPayments(receivedParams),
          paymentsFirstLoadRef.current ? getSpareParts() : Promise.resolve(null),
        ]);
        if (paymentsResponse.success && paymentsResponse.payments) setPayments(paymentsResponse.payments);
        if (
          sparePartsResponse &&
          sparePartsResponse.success &&
          Array.isArray(sparePartsResponse.spareParts)
        ) {
          setSparepartsOptions(sparePartsResponse.spareParts);
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load loans.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        if (paymentsFirstLoadRef.current) {
          paymentsFirstLoadRef.current = false;
          setLoading(false);
        }
      }
    };
    loadPayments();
  }, [user, timeFilter, customDateFrom, customDateTo]);

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

  const capitalizeName = (name) =>
    String(name || '')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const formatPrice = (price) =>
    (Number(price) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

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

  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const getTotalAmount = (p) => {
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    return Math.max(0, total - discount);
  };

  // Time filter: all | today | week | month | custom (from/to calendar dates)
  const isInTimeRange = (dateString, range, dateFromStr = '', dateToStr = '') => {
    if (!dateString || range === 'all') return true;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return false;
    const txTime = d.getTime();

    if (range === 'custom') {
      const from = String(dateFromStr || '').trim();
      const to = String(dateToStr || '').trim();
      if (!from || !to) return true;
      const d0 = new Date(from);
      const d1 = new Date(to);
      if (Number.isNaN(d0.getTime()) || Number.isNaN(d1.getTime())) return true;
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
    if (range === 'today') {
      return txTime >= todayStart.getTime() && txTime <= todayEnd.getTime();
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
      return t.customRange || 'Custom range';
    }
    if (timeFilter === 'today') return t.today || 'Today';
    if (timeFilter === 'week') return t.last7Days || 'Last 7 days';
    if (timeFilter === 'month') return t.last30Days || 'Last 30 days';
    return t.allTime || 'All time';
  };

  /** Loan rows: date filters use last activity (installment/confirmation), not only loan open date. */
  const getLoanActivityDate = (p) => p?.updated_at || p?.created_at;

  // Show rows where DB column payment_type is Loan (case-insensitive).
  const isLoanPaymentType = (p) =>
    String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';

  const receivedSumQueryParams = getReceivedSumQueryParams(timeFilter, customDateFrom, customDateTo);

  const loansBase = payments.filter((p) => isLoanPaymentType(p));

  const filteredLoans = loansBase.filter((payment) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      !term ||
      (payment.customer_name || '').toLowerCase().includes(term) ||
      (payment.customer_phone || '').includes(searchTerm) ||
      (payment.sparepart_name || '').toLowerCase().includes(term) ||
      (payment.sparepart_number || '').toLowerCase().includes(term);
    // Allow cashier to edit the same loan multiple times:
    // keep pending loans visible until the manager confirms them.
    const matchesStatus = payment.status === 'Approved' || payment.status === 'Pending';
    return (
      matchesSearch &&
      matchesStatus &&
      isInTimeRange(getLoanActivityDate(payment), timeFilter, customDateFrom, customDateTo)
    );
  });

  const sortedFilteredLoans = [...filteredLoans].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
  );
  const pendingLoansCount = loansBase.filter((p) => p.status === 'Pending').length;
  const approvedLoansCount = loansBase.filter((p) => p.status === 'Approved').length;
  const rejectedLoansCount = loansBase.filter((p) => p.status === 'Rejected').length;
  const totalLoanAmount = filteredLoans.reduce((sum, p) => sum + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)), 0);
  const totalAmountReceived = filteredLoans.reduce((sum, p) => sum + (Number(p.amount_received) || 0), 0);
  const totalReceivedInSelectedPeriod = filteredLoans.reduce(
    (sum, p) => sum + getDisplayedAmountReceived(p, receivedSumQueryParams),
    0
  );
  const totalAmountRemain = filteredLoans.reduce((sum, p) => sum + getAmountRemain(p), 0);

  /** Loans with at least one installment event logged today (server date). */
  const loansPaidToday = loansBase.filter(
    (p) =>
      (p.status === 'Approved' || p.status === 'Pending') && (Number(p.amount_received_today) || 0) > 0
  );
  const loansPaidTodayCount = loansPaidToday.length;
  const loansPaidTodayTotalReceived = loansPaidToday.reduce(
    (s, p) => s + (Number(p.amount_received_today) || 0),
    0
  );

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

  const handleEdit = (payment) => {
    editSaveInFlightRef.current = false;
    setSelectedPayment(payment);
    setEditAmountReceived('0');
    const pm = String(payment?.payment_method || '').trim();
    if (!pm || pm === 'Loan') {
      setPaymentMethodInput('');
    } else {
      setPaymentMethodInput(pm);
    }
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
    setSparepartIdInput(payment?.sparepart_id != null ? String(payment.sparepart_id) : (payment?.items?.[0]?.sparepart_id != null ? String(payment.items[0].sparepart_id) : ''));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    if (editSaveInFlightRef.current || editSaving) return;
    // Lock immediately so double-clicks cannot both pass validation before React re-renders `editSaving`.
    editSaveInFlightRef.current = true;
    const splitCash = parseCommaNumber(splitCashInput);
    const splitBank = parseCommaNumber(splitBankInput);
    const splitAirtel = parseCommaNumber(splitAirtelInput);
    const splitMpesa = parseCommaNumber(splitMpesaInput);
    const splitYas = parseCommaNumber(splitYasInput);
    const splitTotal = splitCash + splitBank + splitAirtel + splitMpesa + splitYas;
    const useSplit = splitTotal > 0;
    const addAmount = useSplit ? splitTotal : parseCommaNumber(editAmountReceived);
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
    if (!useSplit && !String(paymentMethodInput || '').trim()) {
      editSaveInFlightRef.current = false;
      Swal.fire({
        icon: 'warning',
        title: t.invalidPaymentMethod || 'Invalid payment method',
        text: t.selectPaymentMethod || 'Please select a payment method.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const prevReceived = Number(selectedPayment.amount_received) || 0;
    const newAmountReceived = prevReceived + addAmount;
    const newAmountRemain = Math.max(0, getAmountRemain(selectedPayment) - addAmount);
    const methodsUsed = [
      splitCash > 0 ? 'Cash' : null,
      splitBank > 0 ? 'Bank Transfer' : null,
      splitAirtel > 0 ? 'Airtel Money' : null,
      splitMpesa > 0 ? 'M-Pesa' : null,
      splitYas > 0 ? 'Mix By Yas' : null,
    ].filter(Boolean);
    const effectivePaymentMethod = useSplit
      ? (methodsUsed.length > 1 ? 'Mixed' : methodsUsed[0])
      : String(paymentMethodInput || '').trim();
    const channelTotals = useSplit
      ? {
          cash: (Number(selectedPayment.cash) || 0) + splitCash,
          bank_transfer: (Number(selectedPayment.bank_transfer) || 0) + splitBank,
          airtel_money: (Number(selectedPayment.airtel_money) || 0) + splitAirtel,
          mpesa: (Number(selectedPayment.mpesa) || 0) + splitMpesa,
          mix_by_yas: (Number(selectedPayment.mix_by_yas) || 0) + splitYas,
        }
      : mergeLoanPaymentChannelTotals(selectedPayment, effectivePaymentMethod, addAmount);
    const sparepartIdValue =
      sparepartIdInput != null && String(sparepartIdInput).trim()
        ? parseInt(String(sparepartIdInput), 10)
        : null;
    try {
      setEditSaving(true);
      // Only send columns that exist on `payments` (amounts, methods, sparepart_id, etc.).
      // Customer name/phone come from the linked customer record, not the payment row.
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newAmountReceived,
        amount_remain: newAmountRemain,
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
      if (!response.success) throw new Error(response.message || 'Failed to update loan');

      // Re-fetch after save so UI shows values from database source of truth.
      const refreshed = await getPayments(getReceivedSumQueryParams(timeFilter, customDateFrom, customDateTo));
      if (refreshed.success && refreshed.payments) {
        setPayments(refreshed.payments);
        const latest = refreshed.payments.find((p) => p.id === selectedPayment.id);
        if (latest) setSelectedPayment(latest);
      } else {
        const selectedSpare = sparepartsOptions.find((s) => String(s.id) === String(sparepartIdValue));
        // Fallback local update if refresh fails.
        setPayments((prev) =>
          prev.map((p) =>
            p.id === selectedPayment.id
              ? {
                  ...p,
                  amount_received: newAmountReceived,
                  amount_remain: newAmountRemain,
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
                }
              : p
          )
        );
      }

      // Clear "add installment" fields so cashier can confirm again without closing the modal.
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
      const msg =
        error && error.message
          ? String(error.message)
          : 'Failed to update loan.';
      Swal.fire({
        icon: 'error',
        title: t.error || 'Error',
        text: msg,
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setEditSaving(false);
      editSaveInFlightRef.current = false;
    }
  };

  const handlePrintLoans = () => {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) return;
    const logoPath = typeof logo === 'string' ? logo : logo && logo.default ? logo.default : '';
    const logoUrl = logoPath ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)) : '';
    const logoSrcForPrint = logoDataUrl || logoUrl;
    const rows = sortedFilteredLoans.length
      ? sortedFilteredLoans
          .map((p, idx) => `<tr><td class="tc">${idx + 1}</td><td>${String(p.customer_name || '—').replace(/</g, '&lt;').toUpperCase()}</td><td>${(p.customer_phone || '—').replace(/</g, '&lt;')}</td><td class="tr">${formatPrice((Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0))}</td><td class="tr">${formatPrice(getAmountRemain(p))}</td><td class="tr">${formatPrice(getDisplayedAmountReceived(p, receivedSumQueryParams))}</td><td>${(p.payment_method || '—').replace(/</g, '&lt;')}</td><td>${(p.status || '—').replace(/</g, '&lt;')}</td></tr>`)
          .join('')
      : '<tr><td colspan="8" style="text-align:center">No loans found</td></tr>';
    const numberToWords = (n) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const num = Math.floor(parseFloat(n) || 0);
      if (num === 0) return 'Zero';
      const g = (x) => {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
        return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + g(x % 100) : '');
      };
      if (num < 1000) return g(num);
      if (num < 1000000) return g(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + g(num % 1000) : '');
      return String(num);
    };
    w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Loans Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
    .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
    .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
    .tax-inv-company { flex: 1; }
    .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
    .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
    .tax-inv-contact { margin-top: 8px; font-size: 10px; color: #555; }
    .tax-inv-contact span { margin-right: 16px; }
    .tax-inv-meta { text-align: right; min-width: 180px; }
    .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
    .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
    .tax-inv-footer-row { margin-bottom: 12px; }
    .tax-inv-footer-row label { display: inline-block; min-width: 180px; font-weight: 600; }
    .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
    @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
  </style>
</head>
<body>
  <div class="tax-inv-top">
    <div class="tax-inv-left">
      <img src="${String(logoSrcForPrint).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Kilimanjaro, Tanzania</p>
        <div class="tax-inv-contact"><span>Tel: +255 757171337</span></div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> 182-150-770</p>
      <p><strong>Report No:</strong> LNS-${new Date().toISOString().slice(0, 10)}</p>
      <p><strong>Period:</strong> ${getDateRangeLabel()}</p>
      <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">LOANS REPORT</h1>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Total (TZS)</th>
        <th>Remain (TZS)</th>
        <th>Received (TZS)${Object.keys(receivedSumQueryParams).length ? ' — period' : ''}</th>
        <th>Payment</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL LOAN AMOUNT:</label> TZS ${formatPrice(totalLoanAmount)}</div>
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT REMAIN:</label> TZS ${formatPrice(totalAmountRemain)}</div>
    ${
      Object.keys(receivedSumQueryParams).length
        ? `<div class="tax-inv-footer-row"><label>TOTAL RECEIVED IN THIS PERIOD:</label> TZS ${formatPrice(totalReceivedInSelectedPeriod)}</div>`
        : ''
    }
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePrintLoanDetails = (payment) => {
    const w = window.open('', '_blank', 'width=950,height=700');
    if (!w) return;
    const logoPath = typeof logo === 'string' ? logo : logo && logo.default ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : '';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const formatCurrency = (amount) =>
      new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(parseFloat(amount) || 0);

    const formatDateInvoice = (dateStr) => {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatDateTimeShort = (dateStr) => {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      } catch {
        return dateStr;
      }
    };

    // Helpers used by receipts.js for display rows.
    const getTotalAmount = () => {
      // Receipts.js total logic: baseTotal - discount.
      if (payment.items && payment.items.length > 0) {
        const baseTotal = payment.items.reduce((sum, item) => {
          const qty = Number(item.quantity) || 0;
          const unit = Number(item.unit_price) || 0;
          const itemTotal = item.total_amount != null && item.total_amount !== undefined ? Number(item.total_amount) || 0 : qty * unit;
          return sum + itemTotal;
        }, 0);
        const discount = Number(payment.discount_amount) || 0;
        return Math.max(0, baseTotal - discount);
      }

      const qty = Number(payment.quantity) || 0;
      const unit = Number(payment.unit_price) || 0;
      const baseTotal = qty * unit;
      const discount = Number(payment.discount_amount) || 0;
      return Math.max(0, baseTotal - discount);
    };

    const totalAmountFinal = getTotalAmount();
    let amountReceived = Number(payment.amount_received) || 0;
    let amountRemain = Math.max(0, totalAmountFinal - amountReceived);
    const discountAmt = Number(payment.discount_amount) || 0;

    const trnNo = '182-150-770';
    const invNum = `RCPT-${payment.id}`;
    const dateStr = formatDateTimeShort(payment.created_at);

    const logoImg = logoSrcForPrint
      ? `<img src="${String(logoSrcForPrint).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />`
      : '';

    // Build table rows similar to receipts.js (use items if present, otherwise a single sparepart row).
    const hasItems = payment.items && payment.items.length > 0;
    const subTotal = hasItems
      ? payment.items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
      : (parseFloat(payment.unit_price || 0) || 0) * (parseInt(payment.quantity || 1, 10) || 1);

    const itemRows = hasItems
      ? payment.items
          .map((it, i) => {
            const qty = parseInt(it.quantity, 10) || 1;
            const rate = parseFloat(it.unit_price) || 0;
            const amount = rate * qty;
            return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${String(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${String(it.part_number || it.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
          })
          .join('')
      : `<tr>
          <td class="tc">1</td>
          <td>${String(payment.sparepart_name || '—').replace(/</g, '&lt;')}</td>
          <td>${String(payment.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
          <td class="tr">${payment.quantity || 1}</td>
          <td class="tr">${formatCurrency(payment.unit_price || 0)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrency((parseFloat(payment.unit_price || 0) || 0) * (parseInt(payment.quantity || 1, 10) || 1))}</td>
          <td class="tr">${formatCurrency((parseFloat(payment.unit_price || 0) || 0) * (parseInt(payment.quantity || 1, 10) || 1))}</td>
        </tr>`;

    // Minimal number-to-words helper (same intention as receipts.js).
    const numberToWords = (n) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const num = Math.floor(parseFloat(n) || 0);
      if (num === 0) return 'Zero';
      const g = (x) => {
        if (x < 20) return ones[x];
        if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
        return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + g(x % 100) : '');
      };
      if (num < 1000) return g(num);
      if (num < 1000000) return g(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + g(num % 1000) : '');
      if (num < 1000000000) return g(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
      return String(num);
    };

    const paymentMethod = String(payment.payment_method || '—').replace(/</g, '&lt;');
    const statusText = String(payment.status || '—').replace(/</g, '&lt;');

    const cashBreakdown = Number(payment?.cash) || 0;
    const bankBreakdown = Number(payment?.bank_transfer) || 0;
    const airtelBreakdown = Number(payment?.airtel_money) || 0;
    const mpesaBreakdown = Number(payment?.mpesa) || 0;
    const yasBreakdown = Number(payment?.mix_by_yas) || 0;

    const channelSegments = [
      { label: 'Cash', value: cashBreakdown },
      { label: 'Bank Transfer', value: bankBreakdown },
      { label: 'Airtel Money', value: airtelBreakdown },
      { label: 'M-Pesa', value: mpesaBreakdown },
      { label: 'Mix by Yas', value: yasBreakdown },
    ].filter((s) => Number(s.value) > 0);

    const isMultiMethodTransaction = channelSegments.length > 1;
    const totalFromChannels = channelSegments.reduce((sum, s) => sum + Number(s.value || 0), 0);
    if (isMultiMethodTransaction && totalFromChannels > 0) {
      amountReceived = totalFromChannels;
      amountRemain = Math.max(0, totalAmountFinal - amountReceived);
    }

    const amountReceivedByLabelHtml = isMultiMethodTransaction
      ? channelSegments
          .map((s) => `${String(s.label).replace(/</g, '&lt;')} ${formatCurrency(s.value)}`)
          .join('<br />')
      : `${paymentMethod} ${formatCurrency(amountReceived)}`;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Loan ${invNum}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
    .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
    .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
    .tax-inv-company { flex: 1; }
    .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
    .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
    .tax-inv-contact { margin-top: 8px; font-size: 10px; color: #555; }
    .tax-inv-contact span { margin-right: 16px; }
    .tax-inv-meta { text-align: right; min-width: 180px; }
    .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
    .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
    .tax-inv-customer { margin-bottom: 18px; padding: 8px 0; }
    .tax-inv-customer strong { display: inline-block; min-width: 130px; font-size: 11px; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table th.tl { text-align: left; }
    .tax-inv-table th .sub { display: block; font-weight: 400; font-size: 9px; color: #444; margin-top: 1px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-table .tl { text-align: left; }
    .tax-inv-table tbody tr { background: #fff; }
    .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
    .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
    .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
    .tax-inv-table .col-labels td { border: 1px solid #333; border-top: none; background: #fff; font-size: 9px; color: #444; padding: 4px 8px; text-align: right; }
    .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
    .tax-inv-footer-row { margin-bottom: 12px; }
    .tax-inv-footer-row label { display: inline-block; min-width: 180px; font-weight: 600; }
    .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
    @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
  </style>
</head>
<body>
  <div class="tax-inv-top">
    <div class="tax-inv-left">
      ${logoImg}
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Kilimanjaro, Tanzania</p>
        <div class="tax-inv-contact">
          <span>Tel: +255 757171337</span>
        </div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> ${(trnNo).replace(/</g, '&lt;')}</p>
      <p><strong>Receipt No:</strong> ${invNum}</p>
      <p><strong>Date:</strong> ${dateStr || formatDateInvoice(payment.created_at)}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">RECEIPT</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${String(payment.customer_name || '—').replace(/</g, '&lt;').toUpperCase()}<br />
    <strong>Phone:</strong> ${(payment.customer_phone || '—').replace(/</g, '&lt;')}
  </div>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th style="width:4%">Sr.No.</th>
        <th style="width:22%" class="tl">Description</th>
        <th style="width:11%" class="tl">Part No.</th>
        <th style="width:7%">Quantity</th>
        <th style="width:10%"><span>Price</span><span class="sub">TZS</span></th>
        <th style="width:6%">Per</th>
        <th style="width:11%"><span>Amount</span><span class="sub">TZS</span></th>
        <th style="width:12%"><span>Total Amount</span><span class="sub">TZS</span></th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row total-first">
        <td colspan="7" class="tr" style="font-weight:600;">Sub Total</td>
        <td class="tr">${formatCurrency(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Discount</td>
        <td class="tr">-${formatCurrency(discountAmt)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">
          Amount received by<br />
          <span style="font-weight:500;">${amountReceivedByLabelHtml}</span>
        </td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Remain</td>
        <td class="tr">${formatCurrency(amountRemain)}</td>
      </tr>
      <tr class="total-row total-final">
        <td colspan="7" class="tr" style="font-weight:700;">Total Received</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer"></div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`;

    printWindowSafe(w, printContent);
    w.document.close();
    w.focus();
    w.print();
  };

  // Keep printing logic safe: some browsers throw if document is written after closed.
  const printWindowSafe = (printWindow, content) => {
    try {
      printWindow.document.open();
    } catch {
      // ignore
    }
    printWindow.document.write(content);
    try {
      printWindow.document.close();
    } catch {
      // ignore
    }
  };

  if (loading) return <PageLoader message={t.loading || 'Loading...'} />;

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/finance/cashier/dashboard" className={'nav-item ' + (location.pathname === '/finance/cashier/dashboard' ? 'active' : '')}><FaChartLine className="nav-icon" /><span>{t.dashboard}</span></Link>
          <Link to="/finance/cashier/receipts" className={'nav-item ' + (location.pathname === '/finance/cashier/receipts' ? 'active' : '')}><FaFileInvoice className="nav-icon" /><span>{t.payments || 'Payments'}</span></Link>
          <Link to="/finance/cashier/transactions" className={'nav-item ' + (location.pathname === '/finance/cashier/transactions' ? 'active' : '')}><FaReceipt className="nav-icon" /><span>{t.transactions}</span></Link>
          <Link to="/finance/cashier/reports" className={'nav-item ' + (location.pathname === '/finance/cashier/reports' ? 'active' : '')}><FaChartBar className="nav-icon" /><span>{t.reports}</span></Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}><FaBars /></button>
            <h1 className="page-title">{t.cashierLoans || 'Cashier Loans'}</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time"><FaCalendarAlt /><span>{currentDateTime}</span></div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info"><FaUser className="user-icon" /><span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Cashier')}</span></div>
            <button className="logout-btn" onClick={handleLogout}><FaSignOutAlt /> {t.logout}</button>
          </div>
        </header>

        <div className="payments-content">
          <section className="manager-welcome-section"><h2 className="manager-loans-intro">{t.loansOutstanding || 'Loans Outstanding'}</h2></section>
          <div className="action-bar">
            <div className="search-box"><FaSearch className="search-icon" /><input type="text" placeholder={t.searchPlaceholderLoans || 'Search loans...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" /></div>
            <div className="filter-box manager-time-filter-group">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="status-filter">
                <option value="all">{t.allTime || 'All time'}</option>
                <option value="today">{t.today || 'Today'}</option>
                <option value="week">{t.last7Days || 'Last 7 days'}</option>
                <option value="month">{t.last30Days || 'Last 30 days'}</option>
                <option value="custom">{t.customRange || 'Custom range'}</option>
              </select>
              {timeFilter === 'custom' && (
                <div className="manager-date-range-inputs" aria-label="Date range">
                  <label className="manager-date-range-label">
                    <span>{t.fromDate || 'From'}</span>
                    <input
                      type="date"
                      value={customDateFrom}
                      max={customDateTo || undefined}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                  <label className="manager-date-range-label">
                    <span>{t.toDate || 'To'}</span>
                    <input
                      type="date"
                      value={customDateTo}
                      min={customDateFrom || undefined}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                      className="manager-date-input"
                    />
                  </label>
                  <button
                    type="button"
                    className="manager-date-clear"
                    onClick={() => {
                      setCustomDateFrom('');
                      setCustomDateTo('');
                    }}
                  >
                    {t.clearDates || 'Clear dates'}
                  </button>
                </div>
              )}
            </div>
          </div>
          {timeFilter === 'today' && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted, #5a6570)' }}>
              {t.loansTodayFilterHint ||
                'Shows loans with activity today. “Amount received” column is installments recorded today only; the Amount Received stat is cumulative on each loan.'}
            </p>
          )}
          {timeFilter === 'custom' && (!customDateFrom || !customDateTo) && (
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-muted, #5a6570)' }}>
              {t.selectFromToDatesHint || 'Choose From and To dates to filter by last activity on the loan.'}
            </p>
          )}

          <div className="stats-row manager-stats-row">
            <div className="stat-card"><div className="stat-info"><h3>{t.pending}</h3><p className="stat-value">{pendingLoansCount}</p></div></div>
            <div className="stat-card"><div className="stat-info"><h3>{t.approved}</h3><p className="stat-value">{approvedLoansCount}</p></div></div>
            <div className="stat-card"><div className="stat-info"><h3>{t.rejected}</h3><p className="stat-value">{rejectedLoansCount}</p></div></div>
            <div
              className="stat-card"
              title={
                t.loansPaidTodayHint ||
                'Loans where at least one installment was recorded today. The TZS total is only today’s receipts, not the full loan balance paid.'
              }
            >
              <div className="stat-info">
                <h3>{t.loansPaidToday || 'Loans paid today'}</h3>
                <p className="stat-value">{loansPaidTodayCount}</p>
                <p style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
                  TZS {formatPrice(loansPaidTodayTotalReceived)}
                </p>
              </div>
            </div>
            <div
              className="stat-card"
              title={
                t.totalAmountReceivedCumulativeHint ||
                'Sum of all installments ever recorded on each loan in the list (lifetime cumulative), not limited to the selected period.'
              }
            >
              <div className="stat-info">
                <h3>{t.amountReceived || 'Amount Received'}</h3>
                <p className="stat-value">TZS {formatPrice(totalAmountReceived)}</p>
              </div>
            </div>
            <div className="stat-card"><div className="stat-info"><h3>{t.amountRemain || 'Amount Remain'}</h3><p className="stat-value">TZS {formatPrice(totalAmountRemain)}</p></div></div>
          </div>

          <section className="manager-transactions-table-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.loans || 'Loans'}</h3>
              <button type="button" onClick={handlePrintLoans} className="action-btn print" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FaPrint className="action-icon" />
                <span className="action-text">{t.print || 'Print'}</span>
              </button>
            </div>
            <div className="table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>{t.actions}</th>
                    <th>{t.receiptNum || 'Receipt No'}</th>
                    <th>{t.customer}</th>
                    <th>{t.sparePart || 'Spare Part'}</th>
                    <th>{t.paymentType || 'Payment Type'}</th>
                    <th>{t.totalAmount || 'Total Amount'}</th>
                    <th
                      title={
                        Object.keys(receivedSumQueryParams).length
                          ? t.amountReceivedPeriodColumnHint ||
                            'Installments logged in the selected period only. Use “All time” for lifetime total on each loan.'
                          : undefined
                      }
                    >
                      {t.amountReceived || 'Amount Received'}
                      {Object.keys(receivedSumQueryParams).length ? (
                        <span style={{ fontWeight: 400, fontSize: '0.85em', display: 'block', opacity: 0.85 }}>
                          ({t.thisPeriod || 'this period'})
                        </span>
                      ) : null}
                    </th>
                    <th>{t.amountRemain || 'Amount Remain'}</th>
                    <th>{t.paymentMethod}</th>
                    <th title={t.lastUpdateHint || 'Last change on this payment (e.g. installment)'}>{t.lastUpdate || 'Last update'}</th>
                    <th>{t.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredLoans.length === 0 ? (
                    <tr><td colSpan="11" className="no-data">{t.noTransactionsFound || 'No loans found'}</td></tr>
                  ) : (
                    sortedFilteredLoans.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="View" onClick={() => { setSelectedPayment(payment); setShowViewModal(true); }}><FaEye className="action-icon" /></button>
                            <button className="action-btn edit" title="Edit" onClick={() => handleEdit(payment)}><FaEdit className="action-icon" /></button>
                            <button className="action-btn print" title="Print Details" onClick={() => handlePrintLoanDetails(payment)}><FaPrint className="action-icon" /></button>
                          </div>
                        </td>
                        <td>#{payment.id}</td>
                        <td>
                          <div className="customer-info">
                            <FaUsers className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(payment.customer_name || '')}</div>
                              <div className="info-detail">{payment.customer_phone || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(payment.sparepart_name || '—')}</div>
                              <div className="info-detail">{String(payment.sparepart_number || '—').toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="payment-method-badge">
                            {String(payment.payment_type || '—').trim() || '—'}
                          </span>
                        </td>
                        <td className="amount-cell">TZS {formatPrice(getTotalAmount(payment))}</td>
                        <td className="amount-cell">
                          {Object.keys(receivedSumQueryParams).length === 0 && payment.amount_received == null
                            ? '—'
                            : `TZS ${formatPrice(getDisplayedAmountReceived(payment, receivedSumQueryParams))}`}
                        </td>
                        <td className="amount-cell">TZS {formatPrice(getAmountRemain(payment))}</td>
                        <td>
                          <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                        </td>
                        <td>{formatDateTime(payment.updated_at || payment.created_at)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              payment.status === 'Approved' ? 'approved' : payment.status === 'Rejected' ? 'rejected' : 'pending'
                            }`}
                          >
                            {payment.status === 'Approved' && <FaCheckCircle />}
                            {payment.status === 'Rejected' && <FaTimesCircle />}
                            {payment.status !== 'Approved' && payment.status !== 'Rejected' && <FaClock />}
                            {payment.status || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="manager-loans-total-cards">
            <div className="manager-loans-total-card"><span className="manager-loans-total-label">{t.totalLoanAmount || 'Total Loan Amount'}</span><span className="manager-loans-total-value">TZS {formatPrice(totalLoanAmount)}</span></div>
            <div className="manager-loans-total-card"><span className="manager-loans-total-label">{t.totalAmountRemain || 'Total Amount Remain'}</span><span className="manager-loans-total-value">TZS {formatPrice(totalAmountRemain)}</span></div>
          </div>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{t.transactionDetails || 'Loan Details'}</h3>
            <p><strong>{t.customer}:</strong> {capitalizeName(selectedPayment.customer_name)}</p>
            <p><strong>{t.phone || 'Phone'}:</strong> {selectedPayment.customer_phone || '—'}</p>
            <p><strong>{t.totalAmount || 'Total Amount'}:</strong> TZS {formatPrice((Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.discount_amount) || 0))}</p>
            <p><strong>{t.amountReceived}:</strong> TZS {formatPrice(selectedPayment.amount_received || 0)}</p>
            <p><strong>{t.amountRemain || 'Amount Remain'}:</strong> TZS {formatPrice(getAmountRemain(selectedPayment))}</p>
            <div style={{ marginTop: 12 }}><button className="action-btn" onClick={() => setShowViewModal(false)}>{t.close || 'Close'}</button></div>
          </div>
        </div>
      )}

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
                      <option value="Mixed">Mixed</option>
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
                        getAmountRemain(selectedPayment) - (
                          (parseCommaNumber(splitCashInput) + parseCommaNumber(splitBankInput) + parseCommaNumber(splitAirtelInput) + parseCommaNumber(splitMpesaInput) + parseCommaNumber(splitYasInput)) > 0
                            ? (parseCommaNumber(splitCashInput) + parseCommaNumber(splitBankInput) + parseCommaNumber(splitAirtelInput) + parseCommaNumber(splitMpesaInput) + parseCommaNumber(splitYasInput))
                            : parseCommaNumber(editAmountReceived)
                        )
                      )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.status}</label>
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

export default CashierLoans;
