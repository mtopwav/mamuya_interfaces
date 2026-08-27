import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaBox,
  FaUsers,
  FaCalendarAlt,
  FaPrint,
  FaFilter,
  FaEnvelope,
} from 'react-icons/fa';
import '../sales/payments.css';
import './reports.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { RECEIPT_PRINT_STYLES, buildReceiptBodyHtml } from '../../utils/receiptPrintHtml';
import { useTranslation } from '../../utils/useTranslation';

function ManagerReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [activeReport, setActiveReport] = useState('sales'); // 'sales' | 'transactions' | 'loans'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);

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

    let cancelled = false;
    const loadData = async () => {
      setDataLoading(true);
      try {
        const query =
          dateFrom && dateTo
            ? { receivedSumFrom: dateFrom, receivedSumTo: dateTo }
            : {};
        const response = await getPayments(query);
        if (cancelled) return;
        if (response?.success && Array.isArray(response.payments)) {
          setPayments(response.payments);
        } else {
          setPayments([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading reports:', error);
          setPayments([]);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load report data.',
            confirmButtonColor: '#1a3a5f'
          });
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
          setLoading(false);
        }
      }
    };
    loadData();

    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [navigate, dateFrom, dateTo]);

  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
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

  /** Same currency formatting as finance/cashier/reports.js printed document */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const getRecordDateForReports = (payment) => {
    if (!payment) return null;
    const isLoan = String(payment?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan) {
      return payment.updated_at || payment.created_at;
    }
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  const toNumPayment = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;

  const getPaymentChannelsList = (p) => {
    if (!p) return [];
    return [
      { label: t.cash || 'Cash', val: toNumPayment(p.cash) },
      { label: t.bankTransfer || 'Bank Transfer', val: toNumPayment(p.bank_transfer) },
      { label: t.airtelMoney || 'Airtel Money', val: toNumPayment(p.airtel_money) },
      { label: 'M-Pesa', val: toNumPayment(p.mpesa) },
      { label: t.mixByYas || 'Mix by YAS', val: toNumPayment(p.mix_by_yas) }
    ].filter((c) => c.val > 0);
  };

  /**
   * For loan payments in a date range: attribute period amount to the method used for that
   * installment (payment_method), not split across lifetime cash/bank columns from earlier payments.
   */
  const allocateLoanChannelAmounts = (amount, paymentMethod) => {
    const amt = Number(amount) || 0;
    const empty = {
      cash: 0,
      bank_transfer: 0,
      airtel_money: 0,
      mpesa: 0,
      mix_by_yas: 0,
      credit: 0
    };
    if (amt <= 0) return empty;
    const m = String(paymentMethod || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    if (m === 'cash') return { ...empty, cash: amt };
    if (m === 'bank transfer') return { ...empty, bank_transfer: amt };
    if (m === 'airtel money') return { ...empty, airtel_money: amt };
    if (m === 'm-pesa' || m === 'mpesa') return { ...empty, mpesa: amt };
    if (m.includes('mix') && m.includes('yas')) return { ...empty, mix_by_yas: amt };
    if (m === 'credit card' || m === 'credit') return { ...empty, credit: amt };
    return empty;
  };

  const paymentMethodForPrintRow = (p) => {
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan && dateFrom && dateTo) {
      const inRange = Number(p?.amount_received_in_range) || 0;
      const method = String(p?.payment_method || '—').trim() || '—';
      if (inRange > 0) return `${method} · ${formatCurrency(inRange)}`;
      return method;
    }
    const ch = getPaymentChannelsList(p);
    if (ch.length >= 2) {
      return ch.map((c) => `${c.label} ${formatCurrency(c.val)}`).join('\n');
    }
    if (ch.length === 1) {
      return `${ch[0].label} · ${formatCurrency(ch[0].val)}`;
    }
    const method = String(p?.payment_method || '—').trim() || '—';
    const amt = Number(p?.amount_received) || 0;
    if (amt > 0) return `${method} · ${formatCurrency(amt)}`;
    return method;
  };

  const amountReceivedSumForPrintRow = (p) => {
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan && dateFrom && dateTo) {
      return Number(p?.amount_received_in_range) || 0;
    }
    const ch = getPaymentChannelsList(p);
    if (ch.length >= 1) {
      return ch.reduce((s, c) => s + c.val, 0);
    }
    return Number(p?.amount_received) || 0;
  };

  /** Compare payment.created_at calendar date to [dateFrom, dateTo] (inclusive). No dates = all rows. */
  const isPaymentInDateRange = (payment) => {
    if (!dateFrom && !dateTo) return true;
    if (!payment?.created_at) return false;
    const d = new Date(payment.created_at);
    if (isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateFrom && dateOnly < dateFrom) return false;
    if (dateTo && dateOnly > dateTo) return false;
    return true;
  };

  const paymentsInRange = payments.filter((p) => isPaymentInDateRange(p));

  const periodLabel =
    dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : dateFrom
      ? `${t.fromDate || 'From'} ${dateFrom}`
      : dateTo
      ? `${t.toDate || 'Until'} ${dateTo}`
      : t.allTime || 'All time';

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const isCreatedToday = (payment) => {
    if (!payment?.created_at) return false;
    const t = new Date(payment.created_at).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  };

  // Sales report: filtered by date range (created_at)
  const approvedPayments = paymentsInRange.filter((p) => p.status === 'Approved');
  const salesTotalAmount = paymentsInRange.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const approvedTotalAmount = approvedPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const todaySales = paymentsInRange.filter((p) => isCreatedToday(p));
  const todaySalesAmount = todaySales.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const hasDateFilter = Boolean(dateFrom || dateTo);

  // Transaction report: all payments (transactions)
  const pendingCount = paymentsInRange.filter((p) => p.status === 'Pending').length;
  const approvedCount = paymentsInRange.filter((p) => p.status === 'Approved').length;
  const rejectedCount = paymentsInRange.filter((p) => p.status === 'Rejected').length;

  // Loans report: payments with amount remain > 0
  const getAmountRemain = (p) => (Number(p.total_amount) || 0) - (Number(p.amount_received) || 0);
  const loansOnly = paymentsInRange.filter((p) => getAmountRemain(p) > 0);
  const loansPending = loansOnly.filter((p) => p.status === 'Pending').length;
  const loansApproved = loansOnly.filter((p) => p.status === 'Approved').length;
  const loansRejected = loansOnly.filter((p) => p.status === 'Rejected').length;
  const totalOutstanding = loansOnly.reduce((sum, p) => sum + Math.max(0, getAmountRemain(p)), 0);

  const isLoanPaymentType = (p) =>
    String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';

  const getAmountRemainLoan = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  /** Totals for printed report footer — same logic as finance/cashier/reports.js (`approvedForPrint` rows). */
  const buildPrintSummaryFromApprovedRows = (approvedRows) => {
    const toN = (v) => Number(v) || 0;
    const isLoanT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    const isSalesT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';
    const loanReceivedForPrint = (p) =>
      dateFrom && dateTo ? toN(p.amount_received_in_range) : toN(p.amount_received);

    const receiptsSales = approvedRows.filter((p) => isSalesT(p) && p.status !== 'Pending');
    const loanPaidRows = approvedRows.filter((p) => {
      if (p.status !== 'Approved') return false;
      const received = loanReceivedForPrint(p);
      if (received <= 0) return false;
      if (!isLoanT(p)) return false;
      const total = Number(p.total_amount) || 0;
      const discount = Number(p.discount_amount) || 0;
      const netDue = Math.max(0, total - discount);
      if (netDue <= 0) return false;
      const remain = getAmountRemainLoan(p);
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

    const loanPaidTotal = loanPaidRows.reduce((s, p) => s + loanReceivedForPrint(p), 0);

    const getLoanChannelsForSummary = (p) => {
      const received = loanReceivedForPrint(p);

      if (dateFrom && dateTo && received > 0) {
        return allocateLoanChannelAmounts(received, p.payment_method);
      }

      const base = {
        cash: toN(p.cash),
        bank_transfer: toN(p.bank_transfer),
        airtel_money: toN(p.airtel_money),
        mpesa: toN(p.mpesa),
        mix_by_yas: toN(p.mix_by_yas)
      };
      const channelSum =
        base.cash + base.bank_transfer + base.airtel_money + base.mpesa + base.mix_by_yas;

      if (received > 0 && channelSum <= 0) {
        return allocateLoanChannelAmounts(received, p.payment_method);
      }

      return {
        cash: base.cash,
        bank_transfer: base.bank_transfer,
        airtel_money: base.airtel_money,
        mpesa: base.mpesa,
        mix_by_yas: base.mix_by_yas,
        credit: 0
      };
    };

    const loanPaidChannels = loanPaidRows.map(getLoanChannelsForSummary);
    const loanPaidCashTotal = loanPaidChannels.reduce((s, c) => s + c.cash, 0);
    const loanPaidBankTotal = loanPaidChannels.reduce((s, c) => s + c.bank_transfer, 0);
    const loanPaidAirtelTotal = loanPaidChannels.reduce((s, c) => s + c.airtel_money, 0);
    const loanPaidMpesaTotal = loanPaidChannels.reduce((s, c) => s + c.mpesa, 0);
    const loanPaidYasTotal = loanPaidChannels.reduce((s, c) => s + c.mix_by_yas, 0);
    const loanPaidCreditTotal = loanPaidChannels.reduce((s, c) => s + c.credit, 0);

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
      totalAmount
    };
  };

  const openPrintWindow = (html) => {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the report.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  /** Same table + footer as finance/cashier/reports.js when “all payment methods” is selected. */
  const handlePrintCashierTransactionsDocument = () => {
    const logoPath = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel =
      dateFrom && dateTo
        ? `${dateFrom} to ${dateTo}`
        : dateFrom
        ? `From ${dateFrom}`
        : dateTo
        ? `Until ${dateTo}`
        : t.allTime || 'All time';

    const filterByDateRangeForCashierPrint = (paymentList) => {
      if (!dateFrom && !dateTo) return paymentList;
      return paymentList.filter((p) => {
        const recordDate = getRecordDateForReports(p);
        if (!recordDate) return false;
        const d = new Date(recordDate);
        if (isNaN(d.getTime())) return false;
        const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        if (dateFrom && dateOnly < dateFrom) return false;
        if (dateTo && dateOnly > dateTo) return false;
        return true;
      });
    };

    const timeFiltered = filterByDateRangeForCashierPrint(payments);
    const printedRows = timeFiltered.filter((p) => {
      const isVisibleStatus = p.status === 'Approved' || p.status === 'Returned';
      if (!isVisibleStatus) return false;
      const isLoanWithZeroReceived =
        String(p?.payment_type ?? '').trim().toLowerCase() === 'loan' &&
        amountReceivedSumForPrintRow(p) <= 0;
      return !isLoanWithZeroReceived;
    });

    const approvedForSummary = printedRows.filter((p) => p.status === 'Approved');
    const printSummary = buildPrintSummaryFromApprovedRows(approvedForSummary);
    const singleDaySummaryNote =
      dateFrom && dateTo && dateFrom === dateTo
        ? `<div class="tax-inv-footer-row"><label>Summary scope:</label> All approved transactions on ${String(
            dateFrom
          ).replace(/</g, '&lt;')} (same as listed above).</div>`
        : '';

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
                <th class="tr">Amount remain (TZS)</th>
                <th class="tl">Status</th>
              </tr>
            </thead>`;

    const rowsHtml =
      printedRows.length === 0
        ? '<tbody><tr><td colspan="9" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          printedRows
            .map((p, idx) => {
              const items =
                p.items && p.items.length > 0
                  ? p.items.map((item) => (item.sparepart_name || 'Unknown').replace(/</g, '&lt;')).join('<br />')
                  : (p.sparepart_name || '—').replace(/</g, '&lt;');
              const paymentType = String(p.payment_type || '—').replace(/</g, '&lt;');
              const paymentMethodCell = String(paymentMethodForPrintRow(p) || '—')
                .replace(/</g, '&lt;')
                .replace(/\n/g, '<br />');
              const printableStatus =
                p.status === 'Returned' || Number(p.return_amount) > 0
                  ? 'Returned'
                  : getStatusLabel(p.status);
              const amountRemain =
                p.amount_remain != null
                  ? Math.max(0, Number(p.amount_remain) || 0)
                  : Math.max(
                      0,
                      (Number(p.total_amount) || 0) -
                        (Number(p.discount_amount) || 0) -
                        (Number(p.amount_received) || 0)
                    );
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${getRecordDateForReports(p) ? String(getRecordDateForReports(p)).replace('T', ' ').slice(0, 16) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${paymentType}</td>
                  <td class="tc">${paymentMethodCell}</td>
                  <td class="tr">${formatCurrency(amountReceivedSumForPrintRow(p))}</td>
                  <td class="tr">${formatCurrency(amountRemain)}</td>
                  <td class="tl">${printableStatus}</td>
                </tr>
              `;
            })
            .join('') +
          '</tbody>';

    const html = `
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
              <p><strong>Report:</strong> Manager transactions (all payment methods)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Manager').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">MANAGER TRANSACTIONS REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
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
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
        </body>
      </html>
    `;
    openPrintWindow(html);
  };

  const handlePrint = () => {
    const logoPath = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel =
      dateFrom && dateTo
        ? `${dateFrom} to ${dateTo}`
        : dateFrom
        ? `From ${dateFrom}`
        : dateTo
        ? `Until ${dateTo}`
        : t.allTime || 'All time';

    if (activeReport === 'sales') {
      const filteredPayments = paymentsInRange;
      const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
      const totalCount = filteredPayments.length;
      const pendingCountPrint = filteredPayments.filter((p) => p.status === 'Pending').length;
      const approvedCountPrint = filteredPayments.filter((p) => p.status === 'Approved').length;
      const rejectedCountPrint = filteredPayments.filter((p) => p.status === 'Rejected').length;

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
                  p.status === 'Approved'
                    ? t.approved || 'Approved'
                    : p.status === 'Rejected'
                    ? t.rejected || 'Rejected'
                    : t.pending || 'Pending';
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

      const html = `
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
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Manager').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">MANAGER SALES REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total transactions:</label> ${totalCount}</div>
            <div class="tax-inv-footer-row"><label>Approved:</label> ${approvedCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Pending:</label> ${pendingCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Rejected:</label> ${rejectedCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Total amount (TZS):</label> ${formatPrice(totalAmount)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated sales report, hence no signature is required.*</p>
        </body>
      </html>
    `;
      openPrintWindow(html);
      return;
    }

    if (activeReport === 'transactions') {
      const list = [...paymentsInRange].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
      if (list.length === 0) {
        Swal.fire({
          icon: 'info',
          title: t.noData || 'No data',
          text: t.noTransactionsInRange || 'No transactions in the selected period.',
          confirmButtonColor: '#1a3a5f'
        });
        return;
      }
      const pageBreakStyles = `
        .receipt-print-page { page-break-after: always; }
        .receipt-print-page:last-child { page-break-after: auto; }
        .manager-tx-banner { text-align: center; font-weight: 600; margin-bottom: 20px; font-size: 12px; }
      `;
      const bodies = list
        .map(
          (p) =>
            `<div class="receipt-print-page">${buildReceiptBodyHtml(p, logoSrcForPrint)}</div>`
        )
        .join('');
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transaction receipts — Mamuya Auto Spare Parts</title>
  <style>${RECEIPT_PRINT_STYLES}${pageBreakStyles}</style>
</head>
<body>
  <p class="manager-tx-banner">Transaction reports — ${String(periodLabel).replace(/</g, '&lt;')} · Printed ${new Date().toLocaleString('en-GB')}</p>
  ${bodies}
</body>
</html>`;
      openPrintWindow(html);
      return;
    }

    // loans (same table/footer style as finance/cashier/loans.js; cumulative Received column)
    const loanRows = paymentsInRange.filter((p) => isLoanPaymentType(p));
    const sortedLoanRows = [...loanRows].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
    const totalLoanAmount = sortedLoanRows.reduce(
      (sum, p) => sum + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)),
      0
    );
    const totalAmountRemain = sortedLoanRows.reduce((sum, p) => sum + getAmountRemainLoan(p), 0);

    const rows =
      sortedLoanRows.length === 0
        ? '<tr><td colspan="8" style="text-align:center">No loans found</td></tr>'
        : sortedLoanRows
            .map(
              (p, idx) =>
                `<tr><td class="tc">${idx + 1}</td><td>${String(p.customer_name || '—')
                  .replace(/</g, '&lt;')
                  .toUpperCase()}</td><td>${(p.customer_phone || '—').replace(/</g, '&lt;')}</td><td class="tr">${formatPrice(
                  (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)
                )}</td><td class="tr">${formatPrice(getAmountRemainLoan(p))}</td><td class="tr">${formatPrice(
                  Number(p.amount_received) || 0
                )}</td><td>${(p.payment_method || '—').replace(/</g, '&lt;')}</td><td>${(p.status || '—').replace(
                  /</g,
                  '&lt;'
                )}</td></tr>`
            )
            .join('');

    const loansHtml = `<!DOCTYPE html>
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
      <p><strong>Period:</strong> ${String(periodLabel).replace(/</g, '&lt;')}</p>
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
        <th>Received (TZS)</th>
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
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`;
    openPrintWindow(loansHtml);
  };

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
            <span>{t.sales}</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="manager-reports-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerReports}</h1>
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
          <div className="manager-reports-tabs" style={{ alignItems: 'center' }}>
            <div>
              <button
                className={`manager-report-tab ${activeReport === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveReport('sales')}
              >
                <FaShoppingCart className="tab-icon" />
                {t.salesReports}
              </button>
              <button
                className={`manager-report-tab ${activeReport === 'transactions' ? 'active' : ''}`}
                onClick={() => setActiveReport('transactions')}
              >
                <FaFileInvoice className="tab-icon" />
                {t.transactionReports}
              </button>
              <button
                className={`manager-report-tab ${activeReport === 'loans' ? 'active' : ''}`}
                onClick={() => setActiveReport('loans')}
              >
                <FaMoneyBillWave className="tab-icon" />
                {t.loansReports}
              </button>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="action-btn print"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FaPrint />
              <span>Print Report</span>
            </button>
          </div>

          <div className="manager-reports-date-toolbar" aria-label="Date range">
            <FaFilter className="manager-reports-date-filter-icon" aria-hidden />
            <label className="manager-reports-date-label">
              <span>{t.fromDate || 'From'}</span>
              <input
                type="date"
                className="manager-reports-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="manager-reports-date-label">
              <span>{t.toDate || 'To'}</span>
              <input
                type="date"
                className="manager-reports-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="manager-reports-date-clear"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                {t.clearDates || 'Clear dates'}
              </button>
            )}
            <span className="manager-reports-period-hint">
              {t.showing || 'Showing'}: {periodLabel}
            </span>
          </div>

          {dataLoading ? (
            <InlineDataLoader message={t.loadingReportData} />
          ) : (
            <>
              {activeReport === 'sales' && (
                <section className="manager-report-section">
                  <h3 className="manager-report-section-title">
                    <FaShoppingCart /> {t.salesReports}
                  </h3>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalSalesCountLabel}</div>
                      <div className="manager-report-card-value">{paymentsInRange.length}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.approvedSales}</div>
                      <div className="manager-report-card-value">{approvedPayments.length}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(salesTotalAmount)}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.approvedAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(approvedTotalAmount)}</div>
                    </div>
                    <div className="manager-report-card highlight">
                      <div className="manager-report-card-label">{t.todaySalesTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(todaySalesAmount)}</div>
                      <div className="manager-report-card-sublabel">
                        {todaySales.length} {t.transactionsTodaySublabel}
                        {hasDateFilter ? ` · ${periodLabel}` : ''}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeReport === 'transactions' && (
                <section className="manager-report-section">
                  <div
                    className="manager-report-section-heading-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      marginBottom: '12px'
                    }}
                  >
                    <h3 className="manager-report-section-title" style={{ margin: 0 }}>
                      <FaFileInvoice /> {t.transactionReports}
                    </h3>
                    <button
                      type="button"
                      onClick={handlePrintCashierTransactionsDocument}
                      className="action-btn print"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      title={t.printTransactionDocument || 'Print transaction document'}
                    >
                      <FaPrint />
                      <span>{t.printTransactionDocument || 'Print transaction document'}</span>
                    </button>
                  </div>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalTransactionsLabel}</div>
                      <div className="manager-report-card-value">{paymentsInRange.length}</div>
                    </div>
                    <div className="manager-report-card pending">
                      <div className="manager-report-card-label">{t.pending}</div>
                      <div className="manager-report-card-value">{pendingCount}</div>
                    </div>
                    <div className="manager-report-card approved">
                      <div className="manager-report-card-label">{t.approved}</div>
                      <div className="manager-report-card-value">{approvedCount}</div>
                    </div>
                    <div className="manager-report-card rejected">
                      <div className="manager-report-card-label">{t.rejected}</div>
                      <div className="manager-report-card-value">{rejectedCount}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(salesTotalAmount)}</div>
                    </div>
                  </div>
                </section>
              )}

              {activeReport === 'loans' && (
                <section className="manager-report-section">
                  <h3 className="manager-report-section-title">
                    <FaMoneyBillWave /> {t.loansReports}
                  </h3>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.loansOutstanding}</div>
                      <div className="manager-report-card-value">{loansOnly.length}</div>
                      <div className="manager-report-card-sublabel">{t.amountRemainGreaterThanZero}</div>
                    </div>
                    <div className="manager-report-card pending">
                      <div className="manager-report-card-label">{t.pendingApprovalLabel}</div>
                      <div className="manager-report-card-value">{loansPending}</div>
                    </div>
                    <div className="manager-report-card approved">
                      <div className="manager-report-card-label">{t.approved}</div>
                      <div className="manager-report-card-value">{loansApproved}</div>
                    </div>
                    <div className="manager-report-card rejected">
                      <div className="manager-report-card-label">{t.rejected}</div>
                      <div className="manager-report-card-value">{loansRejected}</div>
                    </div>
                    <div className="manager-report-card highlight">
                      <div className="manager-report-card-label">{t.totalOutstandingTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(totalOutstanding)}</div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManagerReports;
