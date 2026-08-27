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
  FaCreditCard,
  FaFileInvoice,
  FaCashRegister,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaCalendarAlt,
  FaEdit,
  FaPrint
} from 'react-icons/fa';
import '../../sales/payments.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments, updatePaymentStatus, updatePaymentDetails, returnPayment } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';
import { buildReceiptPrintDocument } from '../../../utils/receiptPrintHtml';

/**
 * Put the received amount into the matching DB column; Loan / Credit Card only use payment_method (all channels null).
 */
function buildPaymentChannelBreakdown(paymentMethod, amountReceived) {
  const amt = Number(amountReceived) || 0;
  const empty = {
    cash: null,
    bank_transfer: null,
    airtel_money: null,
    mpesa: null,
    mix_by_yas: null,
  };
  const m = String(paymentMethod || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (m === 'cash') return { ...empty, cash: amt };
  if (m === 'bank transfer') return { ...empty, bank_transfer: amt };
  if (m === 'airtel money') return { ...empty, airtel_money: amt };
  if (m === 'm-pesa' || m === 'mpesa') return { ...empty, mpesa: amt };
  if (m.includes('mix') && m.includes('yas')) return { ...empty, mix_by_yas: amt };
  return { ...empty };
}

/** Canonical payment_type stored in API/DB (always Loan or Sales). */
function toDbPaymentType(input) {
  const s = String(input || '').trim().toLowerCase();
  if (s === 'loan') return 'Loan';
  return 'Sales';
}

function CashierTransactions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('');
  const [paymentTypeInput, setPaymentTypeInput] = useState('Sales');
  const [splitCashInput, setSplitCashInput] = useState('');
  const [splitBankInput, setSplitBankInput] = useState('');
  const [splitAirtelInput, setSplitAirtelInput] = useState('');
  const [splitMpesaInput, setSplitMpesaInput] = useState('');
  const [splitYasInput, setSplitYasInput] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnAmount, setReturnAmount] = useState('');
  const confirmLockRef = useRef(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Allow only Finance Cashier (or admin) to access
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
          setPayments(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadTransactions,
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
    return <PageLoader message={t.loadingTransactions} />;
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

  // Calculate total amount, taking discount into account if present.
  const getTotalAmount = (payment) => {
    if (!payment) return 0;

    let baseTotal;

    if (payment.items && payment.items.length > 0) {
      baseTotal = payment.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    } else {
      const qty = Number(payment.quantity) || 0;
      const unit = Number(payment.unit_price) || 0;
      baseTotal = qty * unit;
    }

    const discount = parseFloat(payment.discount_amount) || 0;
    return Math.max(0, baseTotal - discount);
  };

  // Some records may have `amount_received` duplicated while the specific payment channel column
  // (e.g. `bank_transfer`) contains the correct value. For UI and clamping, derive received amount
  // from the channel column matching `payment_method`.
  const getReceivedAmountForMethod = (payment) => {
    if (!payment) return 0;
    const m = String(payment.payment_method || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const fromChannel = {
      cash: Number(payment.cash) || 0,
      bank_transfer: Number(payment.bank_transfer) || 0,
      airtel_money: Number(payment.airtel_money) || 0,
      mpesa: Number(payment.mpesa) || 0,
      mix_by_yas: Number(payment.mix_by_yas) || 0,
    };

    if (m === 'cash') return fromChannel.cash || Number(payment.amount_received) || 0;
    if (m === 'bank transfer') return fromChannel.bank_transfer || Number(payment.amount_received) || 0;
    if (m === 'airtel money') return fromChannel.airtel_money || Number(payment.amount_received) || 0;
    if (m === 'm-pesa' || m === 'm pesa' || m === 'mpesa' || m === 'm-pesa') {
      return fromChannel.mpesa || Number(payment.amount_received) || 0;
    }
    if (m.includes('mix') && m.includes('yas')) return fromChannel.mix_by_yas || Number(payment.amount_received) || 0;

    // Loan / Credit Card / anything else falls back to amount_received.
    return Number(payment.amount_received) || 0;
  };

  const formatWithCommas = (val) => {
    if (val === '' || val == null) return '';
    const digits = String(val).replace(/\D/g, '');
    if (digits === '') return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const parseCommaNumber = (val) => {
    const s = String(val || '').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
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

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const performStatusChange = async (payment, newStatus) => {
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update status');
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? {
                ...p,
                status: newStatus,
                approved_by: approverId,
                approver_name: user?.full_name || user?.username,
                approved_at: new Date().toISOString(),
              }
            : p
        )
      );

      const { addUnviewedOperation } = await import('../../../utils/notifications');
      const operationType = newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected';
      addUnviewedOperation(payment.id, operationType, {
        customerName: payment.customer_name,
        amount: getTotalAmount(payment),
        approverName: user?.full_name || user?.username
      });

      Swal.fire({
        icon: 'success',
        title: t.successTitle,
        text: newStatus === 'Approved' ? t.transactionApprovedSuccess : t.transactionRejectedSuccess,
        confirmButtonColor: '#1a3a5f',
      });
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      Swal.fire({
        icon: 'error',
        title: t.errorTitle,
        text: error.message || t.failedToUpdateStatus,
        confirmButtonColor: '#1a3a5f',
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const confirm = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Transaction`,
      text: `Are you sure you want to ${actionText} this transaction?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`,
    });
    if (!confirm.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  const handleConfirmApprove = async () => {
    if (!selectedPayment) return;

    // Prevent double-approval if status is already Approved
    if (selectedPayment.status === 'Approved' && !isEditMode) {
      Swal.fire({
        icon: 'info',
        title: t.alreadyApprovedTitle || 'Already approved',
        text: t.alreadyApprovedMessage || 'This transaction has already been approved.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }

    // Lock immediately so rapid double-clicks cannot run validation twice or stack API calls
    if (confirmLockRef.current || approving) {
      Swal.fire({
        icon: 'info',
        title: t.processing || 'Processing',
        text: t.waitForConfirmation || 'Please wait — approval is already in progress.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    confirmLockRef.current = true;

    const releaseLockUnlessSuccess = (success) => {
      if (!success) confirmLockRef.current = false;
    };

    const dbPaymentType = toDbPaymentType(selectedPayment.payment_type || paymentTypeInput);
    const isLoanFlow = dbPaymentType === 'Loan';

    const splitCash = parseCommaNumber(splitCashInput);
    const splitBank = parseCommaNumber(splitBankInput);
    const splitAirtel = parseCommaNumber(splitAirtelInput);
    const splitMpesa = parseCommaNumber(splitMpesaInput);
    const splitYas = parseCommaNumber(splitYasInput);
    const splitTotal = splitCash + splitBank + splitAirtel + splitMpesa + splitYas;
    const useSplit = !isLoanFlow && splitTotal > 0;

    if (!isLoanFlow && !useSplit && !String(paymentMethodInput || '').trim()) {
      releaseLockUnlessSuccess(false);
      Swal.fire({
        icon: 'warning',
        title: t.invalidPaymentMethod || 'Invalid payment method',
        text: t.selectPaymentMethod || 'Please select a payment method.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }

    const methodsUsed = [
      splitCash > 0 ? 'Cash' : null,
      splitBank > 0 ? 'Bank Transfer' : null,
      splitAirtel > 0 ? 'Airtel Money' : null,
      splitMpesa > 0 ? 'M-Pesa' : null,
      splitYas > 0 ? 'Mix By Yas' : null,
    ].filter(Boolean);
    const baseReceived = Number(amountReceivedInput) || 0;
    if (!isLoanFlow && useSplit && baseReceived > 0 && String(paymentMethodInput || '').trim()) {
      methodsUsed.push(String(paymentMethodInput || '').trim());
    }
    const uniqueMethodsUsed = Array.from(new Set(methodsUsed.map((m) => String(m).toLowerCase()))).map(
      (m) => methodsUsed.find((orig) => String(orig).toLowerCase() === m)
    );

    const effectivePaymentMethod = isLoanFlow
      ? 'Loan'
      : useSplit
      ? (uniqueMethodsUsed.length > 1 ? 'Mixed' : uniqueMethodsUsed[0])
      : String(paymentMethodInput || '').trim();

    const method = String(effectivePaymentMethod || '').trim();
    if (!method) {
      releaseLockUnlessSuccess(false);
      Swal.fire({
        icon: 'warning',
        title: t.invalidPaymentMethod || 'Invalid payment method',
        text: t.selectPaymentMethod || 'Please select a payment method.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }

    const received = isLoanFlow ? 0 : baseReceived + (useSplit ? splitTotal : 0);
    const total = getTotalAmount(selectedPayment);
    const amountRemain = Math.max(0, total - received);
    let channelBreakdown = useSplit
      ? {
          cash: (Number(selectedPayment.cash) || 0) + splitCash,
          bank_transfer: (Number(selectedPayment.bank_transfer) || 0) + splitBank,
          airtel_money: (Number(selectedPayment.airtel_money) || 0) + splitAirtel,
          mpesa: (Number(selectedPayment.mpesa) || 0) + splitMpesa,
          mix_by_yas: (Number(selectedPayment.mix_by_yas) || 0) + splitYas,
        }
      : buildPaymentChannelBreakdown(effectivePaymentMethod, received);
    // If user enters both base amount and split amounts, assign the base amount
    // to the selected payment method channel so print reports can list all methods used.
    if (useSplit && baseReceived > 0) {
      const baseMethod = String(paymentMethodInput || '').trim();
      if (!baseMethod) {
        releaseLockUnlessSuccess(false);
        Swal.fire({
          icon: 'warning',
          title: t.invalidPaymentMethod || 'Invalid payment method',
          text: t.selectPaymentMethod || 'Please select a payment method.',
          confirmButtonColor: '#1a3a5f',
        });
        return;
      }
      const baseBreakdown = buildPaymentChannelBreakdown(baseMethod, baseReceived);
      channelBreakdown = {
        cash: (Number(channelBreakdown.cash) || 0) + (Number(baseBreakdown.cash) || 0),
        bank_transfer:
          (Number(channelBreakdown.bank_transfer) || 0) + (Number(baseBreakdown.bank_transfer) || 0),
        airtel_money:
          (Number(channelBreakdown.airtel_money) || 0) + (Number(baseBreakdown.airtel_money) || 0),
        mpesa: (Number(channelBreakdown.mpesa) || 0) + (Number(baseBreakdown.mpesa) || 0),
        mix_by_yas: (Number(channelBreakdown.mix_by_yas) || 0) + (Number(baseBreakdown.mix_by_yas) || 0),
      };
    }

    setApproving(true);
    let approveSucceeded = false;
    try {
      const responseDetails = await updatePaymentDetails(selectedPayment.id, {
        amount_received: received,
        amount_remain: amountRemain,
        payment_method: effectivePaymentMethod,
        payment_type: dbPaymentType,
        ...channelBreakdown,
      });
      if (!responseDetails.success) {
        throw new Error(responseDetails.message || 'Failed to confirm transaction');
      }

      if (!isEditMode) {
        // Immediately mark transaction as Approved (no manager approval needed)
        const responseStatus = await updatePaymentStatus(selectedPayment.id, 'Approved', user?.id);
        if (!responseStatus.success) {
          throw new Error(responseStatus.message || 'Failed to set transaction status to Approved');
        }
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? {
                ...p,
                amount_received: received,
                amount_remain: amountRemain,
                payment_method: effectivePaymentMethod,
                payment_type: dbPaymentType,
                cash: channelBreakdown.cash,
                bank_transfer: channelBreakdown.bank_transfer,
                airtel_money: channelBreakdown.airtel_money,
                mpesa: channelBreakdown.mpesa,
                mix_by_yas: channelBreakdown.mix_by_yas,
                status: isEditMode ? p.status : 'Approved',
                approved_at: isEditMode ? p.approved_at : new Date().toISOString(),
              }
            : p
        )
      );
      setShowApproveModal(false);
      setIsEditMode(false);
      Swal.fire({
        icon: 'success',
        title: isEditMode ? (t.successTitle || 'Success') : t.confirmed,
        text: isEditMode
          ? (t.updatedSuccessfully || 'Transaction updated successfully.')
          : (t.transactionApprovedSuccess || 'Transaction approved successfully.'),
        confirmButtonColor: '#1a3a5f',
      });

      if (!isEditMode) {
        // Redirect by payment method after approval
        const methodToRoute = String(effectivePaymentMethod || '').toLowerCase().trim();
        if (isLoanFlow || methodToRoute === 'loan') {
          navigate('/finance/cashier/loans');
        } else {
          navigate('/finance/cashier/receipts');
        }
      }
      approveSucceeded = true;
    } catch (error) {
      console.error('Error confirming transaction:', error);
      Swal.fire({
        icon: 'error',
        title: t.errorTitle,
        text: error.message || t.failedToConfirmTransaction,
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setApproving(false);
      if (!approveSucceeded) confirmLockRef.current = false;
    }
  };

  const handleOpenEditModal = (payment) => {
    confirmLockRef.current = false;
    setSelectedPayment(payment);
    const total = getTotalAmount(payment);
    const pt = String(payment.payment_type || '').trim().toLowerCase();
    if (pt === 'loan') {
      setAmountReceivedInput('0');
      setPaymentMethodInput('Loan');
      setPaymentTypeInput('Loan');
    } else {
      const currentReceived = getReceivedAmountForMethod(payment);
      const received = Math.min(Math.max(Number(currentReceived) || 0, 0), total);
      setAmountReceivedInput(
        payment.amount_received != null || currentReceived > 0 ? String(received) : ''
      );
      setPaymentTypeInput(toDbPaymentType(payment.payment_type));
      setPaymentMethodInput(payment.payment_method || '');
    }
    setSplitCashInput('');
    setSplitBankInput('');
    setSplitAirtelInput('');
    setSplitMpesaInput('');
    setSplitYasInput('');
    setIsEditMode(true);
    setShowApproveModal(true);
  };

  const handlePrintReceipt = (payment) => {
    if (!payment) return;
    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const printContent = buildReceiptPrintDocument(payment, logoSrc);
    const printWindow = window.open('', '_blank', 'width=900,height=650');
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
    printWindow.focus();
    printWindow.print();
  };

  const handleOpenReturnModal = (payment) => {
    setSelectedPayment(payment);
    setReturnAmount('');
    setShowReturnModal(true);
  };

  const handleReturnAmountChange = (e) => {
    const digitsOnly = String(e.target.value || '').replace(/\D/g, '');
    if (!digitsOnly) {
      setReturnAmount('');
      return;
    }
    const received = Number(selectedPayment?.amount_received) || 0;
    const parsed = parseInt(digitsOnly, 10) || 0;
    const clamped = Math.min(parsed, Math.max(0, Math.floor(received)));
    setReturnAmount(clamped.toLocaleString('en-US'));
  };

  const handleConfirmReturn = async () => {
    if (!selectedPayment) return;
    const raw = String(returnAmount || '').replace(/[^\d]/g, '');
    const amountNum = parseFloat(raw);
    const received = Number(selectedPayment.amount_received) || 0;

    if (!amountNum || amountNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Return amount must be greater than 0.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    if (amountNum > received) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Return amount cannot be greater than amount received.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    setReturnSaving(true);
    try {
      const response = await returnPayment(selectedPayment.id, { return_amount: amountNum });
      if (!response.success) throw new Error(response.message || 'Failed to process return');

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
      }

      setShowReturnModal(false);
      setReturnAmount('');
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Transaction returned successfully.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      console.error('Error processing return (cashier):', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process return.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setReturnSaving(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getRecordDateForFilters = (payment) => {
    if (!payment) return null;
    // Use the confirmation/approval timestamp as the reporting date when available.
    // This ensures an order created yesterday but approved today appears in today's report.
    if (payment.approved_at || payment.approvedAt || payment.confirmed_at) {
      return payment.approved_at || payment.approvedAt || payment.confirmed_at;
    }
    return payment.created_at;
  };

  /** Table lists only transactions whose record date (approval or created) is today. */
  const isPaymentToday = (payment) => {
    const recordDate = getRecordDateForFilters(payment);
    if (!recordDate) return false;
    const d = new Date(recordDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  };

  const filteredPayments = payments.filter((payment) => {
    // Cashier transactions table should display only approved records.
    if (payment.status !== 'Approved') return false;
    // Show only approved SALES in this table.
    // Approved LOAN transactions should appear in cashier/loans table only.
    if (String(payment.payment_type || '').trim().toLowerCase() !== 'sales') return false;
    // Do not show transactions with zero received amount.
    if ((Number(payment.amount_received) || 0) <= 0) return false;
    if (!isPaymentToday(payment)) return false;

    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !term ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number.toLowerCase().includes(term)) ||
      String(payment.id).includes(term) ||
      (payment.employee_name && payment.employee_name.toLowerCase().includes(term));

    const total = getTotalAmount(payment);
    const received = getReceivedAmountForMethod(payment);
    const amountRemain = total - received;
    const displayApproved = payment.status === 'Approved';
    const displayPending = payment.status === 'Pending';
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Approved' && displayApproved) ||
      (statusFilter === 'Pending' && displayPending) ||
      (statusFilter === 'Rejected' && payment.status === 'Rejected');

    return matchesSearch && matchesStatus;
  });

  // Count only today's transactions for statistics
  const pendingCount = payments.filter((p) => {
    if (p.status !== 'Pending') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const approvedCount = payments.filter((p) => {
    if (p.status !== 'Approved') return false;
    const pDate = new Date(getRecordDateForFilters(p));
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const rejectedCount = payments.filter((p) => {
    if (p.status !== 'Rejected') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;

  return (
    <div className="payments-container cashier-transactions">
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
          <Link to="/finance/cashier/transactions" className="nav-item active">
            <FaCreditCard className="nav-icon" />
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
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.cashierTransactionsVerification}</h1>
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
                placeholder={t.searchByCustomerNamePhoneSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div
              className="filter-box"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#555',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
            >
              <FaCalendarAlt aria-hidden />
              <span>{t.todayFilter || 'Today'}</span>
            </div>
            <div className="filter-box">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allStatus}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-row">
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
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedCount}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.discount || 'Discount'}</th>
                  <th>{t.paymentType || 'Payment type'}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="no-data">
                      {t.noTransactionsFound}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.viewDetails}
                            onClick={() => handleView(payment)}
                          >
                            <FaEye className="action-icon" />
                          </button>
                          <button
                            className="action-btn print"
                            title="Print Receipt"
                            onClick={() => handlePrintReceipt(payment)}
                          >
                            <FaPrint className="action-icon" />
                          </button>
                          <button
                            className="action-btn edit"
                            title={t.edit || 'Edit'}
                            onClick={() => handleOpenEditModal(payment)}
                          >
                            <FaEdit className="action-icon" />
                          </button>
                          {payment.status === 'Approved' && (
                            <button
                              type="button"
                              className="action-btn reject"
                              title="Return"
                              onClick={() => handleOpenReturnModal(payment)}
                            >
                              <FaTimesCircle className="action-icon" />
                            </button>
                          )}
                          {payment.status === 'Pending' && (
                            <>
                              <button
                                className="action-btn approve"
                                title={t.approve}
                                onClick={() => {
                                  confirmLockRef.current = false;
                                  setIsEditMode(false);
                                  setSelectedPayment(payment);
                                  const total = getTotalAmount(payment);
                                  const pt = String(payment.payment_type || '').trim().toLowerCase();
                                  if (pt === 'loan') {
                                    setAmountReceivedInput('0');
                                    setPaymentMethodInput('Loan');
                                    setPaymentTypeInput('Loan');
                                  } else {
                                    const currentReceived = getReceivedAmountForMethod(payment);
                                    const received = Math.min(Math.max(Number(currentReceived) || 0, 0), total);
                                    setAmountReceivedInput(
                                      payment.amount_received != null || currentReceived > 0 ? String(received) : ''
                                    );
                                    setPaymentTypeInput(toDbPaymentType(payment.payment_type));
                                    setPaymentMethodInput(payment.payment_method || '');
                                  }
                                setSplitCashInput('');
                                setSplitBankInput('');
                                setSplitAirtelInput('');
                                setSplitMpesaInput('');
                                setSplitYasInput('');
                                  setShowApproveModal(true);
                                }}
                              >
                                <FaCheckCircle className="action-icon" />
                              </button>
                              <button
                                className="action-btn reject"
                                title={t.reject}
                                onClick={() => handleChangeStatus(payment, 'Rejected')}
                              >
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
                            <div className="info-name">
                              {capitalizeName(payment.customer_name)}
                            </div>
                            <div className="info-detail">{payment.customer_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0 ? (
                          <div>
                            {payment.items.map((item, idx) => (
                              <div key={idx} className="part-info" style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}>
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
                                {capitalizeName(payment.sparepart_name || 'Unknown')}
                              </div>
                              <div className="info-detail">
                                {payment.sparepart_number?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0 
                          ? payment.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
                          : payment.quantity}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0
                          ? payment.items.map((item, idx) => (
                              <div key={idx} style={{ marginBottom: idx < payment.items.length - 1 ? '5px' : '0' }}>
                                TZS {formatPrice(item.unit_price)}
                              </div>
                            ))
                          : `TZS ${formatPrice(payment.unit_price)}`}
                      </td>
                      <td className="amount-cell">
                        TZS {formatPrice(getTotalAmount(payment))}
                      </td>
                      <td className="amount-cell">
                        {payment.discount_amount != null
                          ? `TZS ${formatPrice(payment.discount_amount)}`
                          : '—'}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {toDbPaymentType(payment.payment_type)}
                        </span>
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {payment.payment_method || '—'}
                        </span>
                      </td>
                      <td className="amount-cell">
                        {Number(getReceivedAmountForMethod(payment)) > 0
                          ? `TZS ${formatPrice(getReceivedAmountForMethod(payment))}`
                          : '—'}
                      </td>
                      <td className="amount-cell">
                        {(() => {
                          const total = getTotalAmount(payment);
                          const received = getReceivedAmountForMethod(payment);
                          return `TZS ${formatPrice(Math.max(0, total - received))}`;
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const total = getTotalAmount(payment);
                          const received = getReceivedAmountForMethod(payment);
                          const amountRemain = total - received;
                          const displayStatus =
                            payment.status === 'Rejected'
                              ? 'Rejected'
                              : payment.status === 'Approved'
                              ? 'Approved'
                              : 'Pending';
                          return (
                            <span
                              className={`status-badge ${
                                displayStatus === 'Approved'
                                  ? 'approved'
                                  : displayStatus === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {getStatusLabel(displayStatus)}
                            </span>
                          );
                        })()}
                      </td>
                      <td>{formatDateTime(getRecordDateForFilters(payment) || payment.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Transaction Modal */}
      {showApproveModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!approving) {
              setShowApproveModal(false);
              setIsEditMode(false);
            }
          }}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{isEditMode ? (t.editTransaction || 'Edit Transaction') : t.approveTransaction}</h2>
              <button
                className="close-btn"
                onClick={() => {
                  if (!approving) {
                    setShowApproveModal(false);
                    setIsEditMode(false);
                  }
                }}
                disabled={approving}
              >
                ×
              </button>
            </div>
            <div className="view-content">
              <p style={{ marginBottom: '16px', color: '#555' }}>
                {isEditMode
                  ? 'Update transaction details below and save changes.'
                  : 'Review the transaction details below before approving.'}
              </p>
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> Payment ID</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> {t.customer}</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label><FaUser /> {t.salesEmployee}</label>
                  <div className="view-value">
                    {capitalizeName(
                      selectedPayment.employee_name ||
                      selectedPayment.employee_username ||
                      'Unknown'
                    )}
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <div className="view-item">
                    <label><FaBox /> {t.spareParts} ({selectedPayment.items.length})</label>
                    <div className="view-value">
                      {selectedPayment.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                            {capitalizeName(item.sparepart_name || 'Unknown')}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                            {t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()} · {t.qty}: {item.quantity}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            {t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.sparePart}</label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
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
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.discount || 'Discount'}</label>
                  <div className="view-value">
                    TZS {formatPrice(selectedPayment.discount_amount || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.paymentType || 'Payment type'}</label>
                  <div className="view-value">
                    <input
                      type="text"
                      value={toDbPaymentType(paymentTypeInput)}
                      readOnly
                      style={{
                        width: '100%',
                        maxWidth: '280px',
                        padding: '8px 12px',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        backgroundColor: '#f5f5f5',
                        cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentMethod || 'Payment Method'}</label>
                  <div className="view-value">
                    {toDbPaymentType(paymentTypeInput) === 'Loan' ? (
                      <select
                        value="Loan"
                        disabled
                        style={{
                          width: '100%',
                          maxWidth: '220px',
                          padding: '8px 12px',
                          fontSize: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          backgroundColor: '#f5f5f5',
                          cursor: 'not-allowed',
                        }}
                      >
                        <option value="Loan">{t.loan || 'Loan'}</option>
                      </select>
                    ) : (
                      <select
                        value={paymentMethodInput}
                        onChange={(e) => setPaymentMethodInput(e.target.value)}
                        style={{
                          width: '100%',
                          maxWidth: '220px',
                          padding: '8px 12px',
                          fontSize: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          boxSizing: 'border-box',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">{t.selectPaymentMethod || 'Select Payment Method'}</option>
                        <option value="Cash">Cash</option>
                        <option value="M-Pesa">M-Pesa</option>
                        <option value="Mix By Yas">Mix By Yas</option>
                        <option value="Airtel Money">Airtel Money</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Credit Card">Credit Card</option>
                      </select>
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Received</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="numeric"
                      readOnly={toDbPaymentType(paymentTypeInput) === 'Loan'}
                      value={formatWithCommas(amountReceivedInput)}
                      onChange={(e) => {
                        if (toDbPaymentType(paymentTypeInput) === 'Loan') return;
                        if (
                          splitCashInput ||
                          splitBankInput ||
                          splitAirtelInput ||
                          splitMpesaInput ||
                          splitYasInput
                        ) {
                          // When split fields are used, ignore direct amount edits.
                          return;
                        }
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') {
                          setAmountReceivedInput('');
                          return;
                        }
                        const num = parseInt(raw, 10);
                        const total = getTotalAmount(selectedPayment);
                        const clamped = Math.min(Math.max(num, 0), total);
                        setAmountReceivedInput(String(clamped));
                      }}
                      placeholder={t.enterAmountTZS}
                      style={{
                        width: '100%',
                        maxWidth: '200px',
                        padding: '8px 12px',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        backgroundColor:
                          toDbPaymentType(paymentTypeInput) === 'Loan'
                            ? '#f5f5f5'
                            : 'white',
                        cursor:
                          toDbPaymentType(paymentTypeInput) === 'Loan'
                            ? 'not-allowed'
                            : 'text',
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label>Split payment (optional)</label>
                  <div
                    className="view-value"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      maxWidth: '360px',
                    }}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="Cash"
                      value={formatWithCommas(splitCashInput)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setSplitCashInput(filtered);
                      }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="Bank Transfer"
                      value={formatWithCommas(splitBankInput)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setSplitBankInput(filtered);
                      }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="Airtel Money"
                      value={formatWithCommas(splitAirtelInput)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setSplitAirtelInput(filtered);
                      }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="M-Pesa"
                      value={formatWithCommas(splitMpesaInput)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setSplitMpesaInput(filtered);
                      }}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      className="form-control"
                      placeholder="Mix By Yas"
                      value={formatWithCommas(splitYasInput)}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^\d.]/g, '');
                        const parts = v.split('.');
                        const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                        setSplitYasInput(filtered);
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain}</label>
                  <div className="view-value">
                    TZS {formatPrice(
                      getTotalAmount(selectedPayment) -
                      (toDbPaymentType(paymentTypeInput) === 'Loan'
                        ? 0
                        : (Number(amountReceivedInput) || 0) +
                          parseCommaNumber(splitCashInput) +
                          parseCommaNumber(splitBankInput) +
                          parseCommaNumber(splitAirtelInput) +
                          parseCommaNumber(splitMpesaInput) +
                          parseCommaNumber(splitYasInput))
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">
                    {(() => {
                      const total = getTotalAmount(selectedPayment);
                      const received =
                        (Number(amountReceivedInput) || 0) +
                        parseCommaNumber(splitCashInput) +
                        parseCommaNumber(splitBankInput) +
                        parseCommaNumber(splitAirtelInput) +
                        parseCommaNumber(splitMpesaInput) +
                        parseCommaNumber(splitYasInput);
                      const amountRemain = total - received;
                      const displayApproved = amountRemain === 0;
                      return (
                        <span
                          className={`status-badge ${
                            displayApproved ? 'approved' : 'pending'
                          }`}
                        >
                          {displayApproved ? (
                            <><FaCheckCircle /> {t.approved}</>
                          ) : (
                            <><FaClock /> {t.pending}</>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.createdAt}</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  if (!approving) {
                    setShowApproveModal(false);
                    setIsEditMode(false);
                  }
                }}
                disabled={approving}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                className="action-btn approve"
                style={{ marginLeft: '10px' }}
                onClick={handleConfirmApprove}
                disabled={approving}
              >
                {approving ? (
                  <>{t.processing}</>
                ) : (
                  <>
                    <FaCheckCircle className="action-icon" />
                    <span className="action-text">
                      {isEditMode ? (t.saveChanges || 'Save Changes') : t.confirmApprove}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Transaction Modal */}
      {showReturnModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!returnSaving) {
              setShowReturnModal(false);
              setReturnAmount('');
            }
          }}
        >
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Return Transaction</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  if (!returnSaving) {
                    setShowReturnModal(false);
                    setReturnAmount('');
                  }
                }}
              >
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>
                    <FaCreditCard /> {t.paymentId}
                  </label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> {t.customer}
                  </label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <div className="view-value">TZS {formatPrice(selectedPayment.amount_received || 0)}</div>
                </div>
                <div className="view-item">
                  <label>Return amount (TZS)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    value={returnAmount}
                    onChange={handleReturnAmountChange}
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
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Enter the amount to return. It cannot exceed the total amount received.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  if (!returnSaving) {
                    setShowReturnModal(false);
                    setReturnAmount('');
                  }
                }}
                disabled={returnSaving}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={handleConfirmReturn}
                disabled={returnSaving}
                style={{ padding: '10px 20px', marginLeft: '10px' }}
              >
                {returnSaving ? 'Saving...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t.transactionDetails}</h2>
              <button
                className="close-btn"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>
                    <FaCreditCard /> {t.paymentId}
                  </label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> {t.customer}
                  </label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        marginTop: '5px'
                      }}
                    >
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUser /> {t.salesEmployee}
                  </label>
                  <div className="view-value">
                    {capitalizeName(
                      selectedPayment.employee_name ||
                        selectedPayment.employee_username ||
                        'Unknown'
                    )}
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.spareParts} ({selectedPayment.items.length})
                      </label>
                      <div className="view-value">
                        {selectedPayment.items.map((item, idx) => (
                          <div key={idx} style={{ 
                            marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none'
                          }}>
                            <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                              {capitalizeName(item.sparepart_name || 'Unknown')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                              {t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                              {t.quantity}: {item.quantity}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              {t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.sparePart}
                      </label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            color: '#666',
                            marginTop: '5px'
                          }}
                        >
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.quantity}</label>
                      <div className="view-value">{selectedPayment.quantity}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.unitPrice}</label>
                      <div className="view-value">
                        TZS {formatPrice(selectedPayment.unit_price)}
                      </div>
                    </div>
                  </>
                )}
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div
                    className="view-value"
                    style={{ fontWeight: 'bold', fontSize: '1.1em' }}
                  >
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaCreditCard /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">
                      {selectedPayment.payment_method || '—'}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <div className="view-value">
                    {Number(getReceivedAmountForMethod(selectedPayment)) > 0
                      ? `TZS ${formatPrice(getReceivedAmountForMethod(selectedPayment))}`
                      : '—'}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain}</label>
                  <div className="view-value">
                    TZS {formatPrice(
                      Math.max(0,
                        getTotalAmount(selectedPayment) -
                        getReceivedAmountForMethod(selectedPayment)
                      )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaClock /> {t.status}
                  </label>
                  <div className="view-value">
                    <span
                      className={`status-badge ${
                        selectedPayment.status === 'Approved'
                          ? 'approved'
                          : selectedPayment.status === 'Rejected'
                          ? 'rejected'
                          : 'pending'
                      }`}
                    >
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.createdAt}</label>
                  <div className="view-value">
                    {formatDateTime(selectedPayment.created_at)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowViewModal(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierTransactions;