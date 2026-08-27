import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaReceipt,
  FaFileInvoice,
  FaChartBar,
  FaSearch,
  FaCalendarAlt,
  FaPrint,
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import '../../sales/payments.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

/** Local calendar date YYYY-MM-DD (cashier reports are today-only). */
function getTodayYmd() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CashierReports() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all' | 'cash' | 'bank' | 'mobile'
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [detailPayment, setDetailPayment] = useState(null);

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
        const day = getTodayYmd();
        const response = await getPayments({ receivedSumFrom: day, receivedSumTo: day });
        if (response.success && response.payments) {
          setPayments(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments for reports:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadReports,
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

  // Load logo as data URL for printing (so it appears in new window)
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
    return <PageLoader message={t.loadingReports} />;
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
        <p>{t.noUserRedirect}</p>
      </div>
    );
  }

  const handleLogout = () => {
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

  const isMobilePaymentMethod = (method) => {
    const raw = String(method || '').toLowerCase().trim();
    if (!raw) return false;

    // Normalize: remove spaces, hyphens and other separators so "M-Pesa" => "mpesa"
    const compact = raw.replace(/[^a-z0-9]/g, '');

    return (
      raw === 'mobile' ||
      raw === 'mobile money' ||
      compact === 'mobilemoney' ||
      compact.includes('mobile') ||
      compact.includes('mpesa') ||
      compact.includes('yas') ||
      compact.includes('airtel') ||
      compact.includes('tigo')
    );
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

  const isLoanPaymentMethod = (method) => {
    const raw = String(method || '').toLowerCase().trim();
    if (!raw) return false;
    return raw === 'loan' || raw.includes('loan');
  };

  /** Remaining balance (same idea as loans page): DB value or total − discount − received */
  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const toNumPayment = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;

  /** Non-zero channel amounts from payment row (mixed / split payments). */
  const getPaymentChannelsList = (p) => {
    if (!p) return [];
    return [
      { label: t.cash || 'Cash', val: toNumPayment(p.cash) },
      { label: t.bankTransfer || 'Bank Transfer', val: toNumPayment(p.bank_transfer) },
      { label: t.airtelMoney || 'Airtel Money', val: toNumPayment(p.airtel_money) },
      { label: 'M-Pesa', val: toNumPayment(p.mpesa) },
      { label: t.mixByYas || 'Mix by YAS', val: toNumPayment(p.mix_by_yas) },
    ].filter((c) => c.val > 0);
  };

  /** Payment method label including amount received when it is greater than zero. */
  const paymentMethodWithAmount = (p) => {
    const method = String(p?.payment_method || '—').trim() || '—';
    const amt = Number(p?.amount_received) || 0;
    if (amt > 0) return `${method} · ${formatCurrency(amt)}`;
    return method;
  };

  /** Printed report: show each channel when split; single channel or legacy uses method + amount. */
  const paymentMethodForPrintRow = (p) => {
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    if (isLoan) {
      const method = String(p?.payment_method || '—').trim() || '—';
      const amt = Number(p?.amount_received_in_range) || 0;
      if (amt > 0) return `${method} · ${formatCurrency(amt)}`;
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
    if (isLoan) {
      return Number(p?.amount_received_in_range) || 0;
    }
    const ch = getPaymentChannelsList(p);
    if (ch.length >= 1) {
      return ch.reduce((s, c) => s + c.val, 0);
    }
    return Number(p?.amount_received) || 0;
  };

  const hasAnyChannelAmount = (p) =>
    toNumPayment(p.cash) +
      toNumPayment(p.bank_transfer) +
      toNumPayment(p.airtel_money) +
      toNumPayment(p.mpesa) +
      toNumPayment(p.mix_by_yas) >
    0;

  /** Include row when filter matches channel amounts or legacy payment_method only. */
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

  /** Amount + label for the selected filter only (split payments → one channel). */
  const getSelectedChannelForPrint = (p) => {
    const m = String(p.payment_method || '').toLowerCase().trim();
    const hasCh = hasAnyChannelAmount(p);
    const isLoan = String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
    const recv = isLoan
      ? (Number(p.amount_received_in_range) || 0)
      : (Number(p.amount_received) || 0);

    switch (paymentMethodFilter) {
      case 'cash': {
        const v = toNumPayment(p.cash);
        if (v > 0) return { label: t.cash || 'Cash', val: v };
        if (!hasCh && m === 'cash') return { label: t.cash || 'Cash', val: recv };
        return null;
      }
      case 'bank': {
        const v = toNumPayment(p.bank_transfer);
        if (v > 0) return { label: t.bankTransfer || 'Bank Transfer', val: v };
        if (!hasCh && m === 'bank transfer') return { label: t.bankTransfer || 'Bank Transfer', val: recv };
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
        if (v > 0) return { label: t.airtelMoney || 'Airtel Money', val: v };
        if (!hasCh && isAirtelMoneyPaymentMethod(p.payment_method))
          return { label: t.airtelMoney || 'Airtel Money', val: recv };
        return null;
      }
      case 'yas': {
        const v = toNumPayment(p.mix_by_yas);
        if (v > 0) return { label: t.mixByYas || 'Mix by YAS', val: v };
        if (!hasCh && isYasPaymentMethod(p.payment_method))
          return { label: t.mixByYas || 'Mix by YAS', val: recv };
        return null;
      }
      case 'mobile': {
        const mpesa = toNumPayment(p.mpesa);
        const am = toNumPayment(p.airtel_money);
        const my = toNumPayment(p.mix_by_yas);
        const sum = mpesa + am + my;
        if (sum > 0) {
          const parts = [];
          if (mpesa > 0) parts.push(`M-Pesa ${formatCurrency(mpesa)}`);
          if (am > 0) parts.push(`${t.airtelMoney || 'Airtel Money'} ${formatCurrency(am)}`);
          if (my > 0) parts.push(`${t.mixByYas || 'Mix by YAS'} ${formatCurrency(my)}`);
          return { label: parts.join('\n'), val: sum, isMultiLine: true };
        }
        if (!hasCh && isMobilePaymentMethod(p.payment_method))
          return { label: String(p.payment_method || 'Mobile'), val: recv, isMultiLine: false };
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
    if (paymentMethodFilter === 'all') return amountReceivedSumForPrintRow(p);
    const sel = getSelectedChannelForPrint(p);
    if (sel) return sel.val;
    return amountReceivedSumForPrintRow(p);
  };

  const getRecordDateForReports = (payment) => {
    if (!payment) return null;
    const isLoan = String(payment?.payment_type ?? '').trim().toLowerCase() === 'loan';
    // Loans: use last row update so an older loan with an installment or confirmation today appears in today's report.
    if (isLoan) {
      return payment.updated_at || payment.created_at;
    }
    // Non-loans: confirmation/approval time when available.
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  /** Totals for the printed report footer — sales payment type only (matches printed table rows). */
  const buildPrintSummaryFromApprovedRows = (approvedRows) => {
    const toN = (v) => Number(v) || 0;
    const isSalesT = (p) => String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';

    const receiptsSales = approvedRows.filter((p) => isSalesT(p) && p.status !== 'Pending');

    const cashTotal = receiptsSales.reduce((s, p) => s + toN(p.cash), 0);
    const bankTotal = receiptsSales.reduce((s, p) => s + toN(p.bank_transfer), 0);
    const airtelTotal = receiptsSales.reduce((s, p) => s + toN(p.airtel_money), 0);
    const mpesaTotal = receiptsSales.reduce((s, p) => s + toN(p.mpesa), 0);
    const yasTotal = receiptsSales.reduce((s, p) => s + toN(p.mix_by_yas), 0);
    const totalDirectSales = cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal;

    return {
      cashTotal,
      bankTotal,
      airtelTotal,
      mpesaTotal,
      yasTotal,
      totalDirectSales,
    };
  };

  const handlePrintReports = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel = getTodayYmd();

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

    const printedRows = filteredPayments.filter((p) => {
      if (String(p?.payment_type ?? '').trim().toLowerCase() !== 'sales') return false;
      const isVisibleStatus = p.status === 'Approved' || p.status === 'Returned';
      if (!isVisibleStatus) return false;
      return true;
    });
    const approvedForSummary = printedRows.filter((p) => p.status === 'Approved');
    const printSummary = buildPrintSummaryFromApprovedRows(approvedForSummary);
    const singleDaySummaryNote = `<div class="tax-inv-footer-row"><label>Summary scope:</label> All approved transactions on ${String(
      getTodayYmd()
    ).replace(/</g, '&lt;')} (same as listed above).</div>`;
    const selectedMethodPrintLabel =
      paymentMethodFilter === 'cash'
        ? (t.cash || 'Cash')
        : paymentMethodFilter === 'bank'
        ? (t.bankTransfer || 'Bank Transfer')
        : paymentMethodFilter === 'mobile'
        ? (t.mobileLabel || 'Mobile')
        : paymentMethodFilter === 'mpesa'
        ? 'M-Pesa'
        : paymentMethodFilter === 'airtel'
        ? 'Airtel Money'
        : paymentMethodFilter === 'yas'
        ? 'Mix by YAS'
        : (t.allMethods || 'All methods');

    const printReportHeading =
      paymentMethodFilter === 'all'
        ? 'TRANSACTIONS REPORT'
        : `${String(selectedMethodPrintLabel).toUpperCase()} TRANSACTIONS REPORT`;
    const printReportTitleTag =
      paymentMethodFilter === 'all'
        ? 'Transactions Report'
        : `${selectedMethodPrintLabel} Transactions Report`;
    const printReportMetaDescription =
      paymentMethodFilter === 'all'
        ? 'Cashier transactions (all payment methods)'
        : `Cashier transactions — ${selectedMethodPrintLabel}`;

    const selectedMethodPrintTotal = approvedForSummary.reduce(
      (sum, p) => sum + amountReceivedForPrintRowScoped(p),
      0
    );
    const selectedMethodPrintCount = approvedForSummary.length;

    const rowsHtml =
      printedRows.length === 0
        ? '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          printedRows
            .map((p, idx) => {
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'))
                      .join('<br />')
                  : (p.sparepart_name || '—').replace(/</g, '&lt;');
              const paymentType = String(p.payment_type || '—').replace(/</g, '&lt;');
              const paymentMethodCell = String(paymentMethodForPrintRow(p) || '—')
                .replace(/</g, '&lt;')
                .replace(/\n/g, '<br />');
              const printableStatus =
                p.status === 'Returned' || Number(p.return_amount) > 0
                  ? 'Returned'
                  : getStatusLabel(p.status);
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${getRecordDateForReports(p) ? String(getRecordDateForReports(p)).replace('T', ' ').slice(0, 16) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${paymentType}</td>
                  <td class="tc">${paymentMethodCell}</td>
                  <td class="tr">${formatCurrency(amountReceivedSumForPrintRow(p))}</td>
                  <td class="tl">${printableStatus}</td>
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
          <title>${printReportTitleTag} - Mamuya Auto Spare Parts</title>
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
              <p><strong>Report:</strong> ${printReportMetaDescription}</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Cashier').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">${printReportHeading}</h1>

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

  // Filter payments to today's date only (matches API received-sum range).
  const filterByDateRange = (paymentList) => {
    const from = getTodayYmd();
    const to = getTodayYmd();
    return paymentList.filter((p) => {
      const recordDate = getRecordDateForReports(p);
      if (!recordDate) return false;
      const d = new Date(recordDate);
      if (isNaN(d.getTime())) return false;
      const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (dateOnly < from) return false;
      if (dateOnly > to) return false;
      return true;
    });
  };

  // Filter data by selected date range first, then by payment method, then by search term
  const timeFilteredPayments = filterByDateRange(payments);

  const methodFilteredPayments = timeFilteredPayments.filter((p) => paymentMatchesSelectedMethod(p));

  const filteredPayments = methodFilteredPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const isLoanWithZeroReceived =
      String(p?.payment_type ?? '').trim().toLowerCase() === 'loan' &&
      (Number(p?.amount_received) || 0) <= 0;
    if (isLoanWithZeroReceived) return false;
    return (
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Date + search only (ignore paymentMethodFilter)
  const dateAndSearchPayments = timeFilteredPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    const isLoanWithZeroReceived =
      String(p?.payment_type ?? '').trim().toLowerCase() === 'loan' &&
      (Number(p?.amount_received) || 0) <= 0;
    if (isLoanWithZeroReceived) return false;
    return (
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Cards totals should be sum of:
  // - Loans page transactions (payment_type=loan, Approved)
  // - Receipts page transactions (not Pending, and not loan type)
  const isLoanPaymentType = (p) =>
    String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';
  const isSalesPaymentType = (p) =>
    String(p?.payment_type ?? '').trim().toLowerCase() === 'sales';
  const loansForCards = dateAndSearchPayments.filter(
    (p) => isLoanPaymentType(p) && p.status === 'Approved'
  );
  const receiptsForCards = dateAndSearchPayments.filter(
    (p) => isSalesPaymentType(p) && p.status !== 'Pending'
  );
  const cardsPayments = [...loansForCards, ...receiptsForCards];

  const toNum = (v) => Number(v) || 0;

  // Method totals must come from the breakdown columns in `payments`
  // (not from `payment_method` string).
  const cashTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.cash), 0);
  const bankTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.bank_transfer), 0);
  const airtelTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.airtel_money), 0);
  const mpesaTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.mpesa), 0);
  const yasTotal = receiptsForCards.reduce((sum, p) => sum + toNum(p.mix_by_yas), 0);

  const totalCount = cardsPayments.length;
  const pendingCount = 0;
  const approvedCount = cardsPayments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = cardsPayments.filter((p) => p.status === 'Rejected').length;

  const totalDirectSales = cashTotal + bankTotal + airtelTotal + mpesaTotal + yasTotal;

  const totalAmount = totalDirectSales;

  const selectedMethodLabel =
    paymentMethodFilter === 'cash'
      ? (t.cash || 'Cash')
      : paymentMethodFilter === 'bank'
      ? (t.bankTransfer || 'Bank Transfer')
      : paymentMethodFilter === 'mobile'
      ? (t.mobileLabel || 'Mobile')
      : paymentMethodFilter === 'mpesa'
      ? 'M-Pesa'
      : paymentMethodFilter === 'airtel'
      ? 'Airtel Money'
      : paymentMethodFilter === 'yas'
      ? 'Mix by YAS'
      : (t.allMethods || 'All methods');

  const selectedMethodApprovedPayments = filteredPayments.filter((p) => p.status === 'Approved');
  const selectedMethodTotalAmount = selectedMethodApprovedPayments.reduce(
    (sum, p) => sum + (Number(p.amount_received) || 0),
    0
  );
  const selectedMethodCount = selectedMethodApprovedPayments.length;


  return (
    <div className="cashier-dashboard-container">
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
          <Link to="/finance/cashier/receipts" className="nav-item">
            <FaFileInvoice className="nav-icon" />
            <span>{t.payments || 'Payments'}</span>
          </Link>
          <Link to="/finance/cashier/transactions" className="nav-item">
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/finance/cashier/reports" className="nav-item active">
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header - styled like Cashier Transactions/Receipts header */}
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.cashierReports}</h1>
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
        <div className="cashier-content">
          {/* Search / filter */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchByCustomerOrSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="reports-period-filter" style={{ alignItems: 'center', gap: '8px' }}>
              <FaCalendarAlt style={{ color: '#666' }} />
              <span className="filter-label" style={{ margin: 0 }}>
                {t.date || 'Date'}: <strong>{getTodayYmd()}</strong>
                <span style={{ fontWeight: 400, opacity: 0.85, marginLeft: 6 }}>({t.today || 'today'} only)</span>
              </span>
            </div>
            <div className="reports-period-filter">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="reports-period-select"
              >
                <option value="all">{t.allMethods}</option>
                <option value="cash">{t.cash}</option>
                <option value="bank">{t.bankTransfer}</option>
                <option value="mobile">{t.mobileLabel}</option>
                <option value="mpesa">M-Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="yas">Mix by YAS</option>
              </select>
            </div>
            <button
              onClick={handlePrintReports}
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
              title={t.printReport}
            >
              <FaPrint />
              <span>{t.printReport}</span>
            </button>
          </div>

          {/* Summary cards */}
          <div className="stats-grid">
            {paymentMethodFilter !== 'all' && (
              <div className="stat-card stat-info">
                <div className="stat-info">
                  <h3 className="stat-title">{selectedMethodLabel} {t.summary || 'Summary'}</h3>
                  <p className="stat-value">{formatCurrency(selectedMethodTotalAmount)}</p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', opacity: 0.85 }}>
                    {selectedMethodCount} {t.transactions || 'transactions'}
                  </p>
                </div>
              </div>
            )}
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">{t.totalAmountReceived || t.amountReceived || 'Total amount received'}</h3>
                <p className="stat-value">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.cash}</h3>
                <p className="stat-value">{formatCurrency(cashTotal)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.bankTransfer}</h3>
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
          </div>

          {/* Simple latest transactions table */}
          <div className="table-container" style={{ marginTop: '30px' }}>
            <h2 style={{ marginBottom: '15px' }}>{t.recentTransactions}</h2>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.status}</th>
                  <th>{t.amountReceived}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.filter((p) => p.status === 'Approved').length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {t.noTransactionsFound}
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
                      onClick={() => setDetailPayment(p)}
                      title={t.viewDetails || 'View details'}
                    >
                      <td>{getRecordDateForReports(p) ? String(getRecordDateForReports(p)).replace('T', ' ').slice(0, 16) : ''}</td>
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

          {detailPayment && (
            <div
              className="modal-overlay"
              onClick={() => setDetailPayment(null)}
              style={{ zIndex: 2000 }}
            >
              <div
                className="modal-content view-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 520 }}
              >
                <div className="modal-header">
                  <h2>{t.transactionDetails || 'Transaction details'}</h2>
                  <button
                    type="button"
                    className="close-btn"
                    onClick={() => setDetailPayment(null)}
                    aria-label={t.close || 'Close'}
                  >
                    ×
                  </button>
                </div>
                <div className="view-content">
                  <div className="view-section">
                    <div className="view-item">
                      <label>{t.date}</label>
                      <div className="view-value">
                        {getRecordDateForReports(detailPayment)
                          ? String(getRecordDateForReports(detailPayment)).replace('T', ' ').slice(0, 16)
                          : '—'}
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.customer}</label>
                      <div className="view-value">{capitalizeName(detailPayment.customer_name)}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.sparePart}</label>
                      <div className="view-value">
                        {detailPayment.items && detailPayment.items.length > 0 ? (
                          detailPayment.items.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 6 }}>
                              {capitalizeName(item.sparepart_name || 'Unknown')} (
                              {(item.sparepart_number || 'N/A').toUpperCase()})
                            </div>
                          ))
                        ) : (
                          capitalizeName(detailPayment.sparepart_name || '—')
                        )}
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.paymentMethod}</label>
                      <div className="view-value" style={{ fontWeight: 600 }}>
                        {paymentMethodWithAmount(detailPayment)}
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.amountReceived}</label>
                      <div className="view-value">{formatCurrency(detailPayment.amount_received)}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.status}</label>
                      <div className="view-value">{getStatusLabel(detailPayment.status)}</div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setDetailPayment(null)}>
                    {t.close || 'Close'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CashierReports;

