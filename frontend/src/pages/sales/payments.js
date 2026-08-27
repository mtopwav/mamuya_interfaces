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
  FaSearch,
  FaEye,
  FaCreditCard,
  FaFileInvoice,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendarAlt,
  FaBell,
  FaPrint,
  FaReceipt,
  FaEdit,
  FaDownload
} from 'react-icons/fa';
import './payments.css';
import logo from '../../images/logo.png';
import { getPayments, updatePaymentDetails, updatePaymentStatus, apiRequest, getSpareParts } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function Payments() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filterDate, setFilterDate] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState({
    customer_name: '',
    customer_phone: '',
    payment_method: '',
    amount_received: '',
    status: 'Pending',
    quantity: '',
    items: []
  });
  const [payments, setPayments] = useState([]);
  const [spareparts, setSpareparts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [newEditItem, setNewEditItem] = useState({
    sparepart_id: '',
    quantity: ''
  });
  const [newEditSpareSearch, setNewEditSpareSearch] = useState('');
  const [showNewEditSpareDropdown, setShowNewEditSpareDropdown] = useState(false);

  useEffect(() => {
    // Get user data from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }

    // Load payments from database
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
          title: 'Error',
          text: error.message || 'Failed to load payments. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    // Load spare parts from database (for adding new sparepart in edit modal)
    const loadSpareparts = async () => {
      try {
        const response = await getSpareParts();
        if (response.success && response.spareParts) {
          setSpareparts(response.spareParts);
        }
      } catch (error) {
        console.error('Error loading spare parts for payments edit modal:', error);
      }
    };

    loadPayments();
    loadSpareparts();

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
    if (typeof logo !== 'string' || !logo) return;
    const src = logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo);
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        backgroundColor: '#f5f7fa',
        flexDirection: 'column',
        gap: '20px'
      }}>
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
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
    return g(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + numberToWords(num % 1000000000) : '');
  };

  const getTotalAmount = (payment) => {
    if (payment.items && payment.items.length > 0) {
      return payment.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    }
    const qty = Number(payment.quantity) || 0;
    const unit = Number(payment.unit_price) || 0;
    return qty * unit;
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

  const handleEdit = (payment) => {
    setEditingPayment(payment);

    // Build editable items list: either from items array or from single sparepart fields
    let itemsForEdit = [];
    if (payment.items && payment.items.length > 0) {
      itemsForEdit = payment.items.map((item) => ({
        sparepart_id: item.sparepart_id,
        sparepart_name: item.sparepart_name || 'Unknown',
        sparepart_number: item.sparepart_number || 'N/A',
        quantity: parseInt(item.quantity, 10) || 1,
        unit_price: parseFloat(item.unit_price || item.price || 0)
      }));
    } else {
      itemsForEdit = [{
        sparepart_id: payment.sparepart_id,
        sparepart_name: payment.sparepart_name || 'Unknown',
        sparepart_number: payment.sparepart_number || 'N/A',
        quantity: parseInt(payment.quantity, 10) || 1,
        unit_price: parseFloat(payment.unit_price || payment.price || 0)
      }];
    }

    setEditForm({
      customer_name: payment.customer_name || '',
      customer_phone: payment.customer_phone || '',
      payment_method: payment.payment_method || '',
      amount_received: payment.amount_received || '',
      status: payment.status || 'Pending',
      quantity: '', // no longer used for saving; kept for backward compatibility
      items: itemsForEdit
    });
    setShowEditModal(true);
  };

  const handleEditItemQuantityChange = (index, value) => {
    const raw = String(value).replace(/\D/g, '');
    const qty = raw === '' ? '' : Math.max(1, parseInt(raw, 10) || 1);
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, quantity: qty } : item
      )
    }));
  };

  const handleNewEditItemChange = (field, value) => {
    setNewEditItem((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewEditSpareSearchChange = (value) => {
    setNewEditSpareSearch(value);
    setShowNewEditSpareDropdown(true);
    setNewEditItem((prev) => ({ ...prev, sparepart_id: '' }));
  };

  const handleNewEditSpareSelect = (part) => {
    setNewEditItem((prev) => ({
      ...prev,
      sparepart_id: part.id
    }));
    setNewEditSpareSearch(part.part_name || '');
    setShowNewEditSpareDropdown(false);
  };

  // Infer price type from existing order: use payment.price_type or match existing item unit_price to retail/wholesale
  const getOrderPriceType = () => {
    if (editingPayment && (editingPayment.price_type === 'wholesale' || editingPayment.price_type === 'retail')) {
      return editingPayment.price_type;
    }
    if (!editForm.items || editForm.items.length === 0) return 'retail';
    for (const item of editForm.items) {
      const sp = spareparts.find((s) => String(s.id) === String(item.sparepart_id));
      if (!sp) continue;
      const retail = parseFloat(sp.retail_price) || 0;
      const wholesale = parseFloat(sp.wholesale_price) || 0;
      const unit = parseFloat(item.unit_price) || 0;
      if (retail && Math.abs(unit - retail) < 0.01) return 'retail';
      if (wholesale && Math.abs(unit - wholesale) < 0.01) return 'wholesale';
    }
    return 'retail';
  };

  const handleAddNewEditItem = () => {
    const sparepartId = newEditItem.sparepart_id;
    const qtyNum = parseInt(String(newEditItem.quantity).replace(/\D/g, ''), 10) || 0;
    const searchName = (newEditSpareSearch || '').trim();

    if (qtyNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Quantity must be greater than 0.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    // Try to find selected sparepart from database list
    const selectedSpare = spareparts.find(
      (sp) => String(sp.id) === String(sparepartId)
    );

    let itemToAdd;

    if (selectedSpare) {
      const priceType = getOrderPriceType();
      const unitPrice =
        priceType === 'wholesale'
          ? parseFloat(selectedSpare.wholesale_price) || parseFloat(selectedSpare.retail_price) || 0
          : parseFloat(selectedSpare.retail_price) || parseFloat(selectedSpare.wholesale_price) || 0;

      itemToAdd = {
        sparepart_id: selectedSpare.id,
        sparepart_name: selectedSpare.part_name || 'Unknown',
        sparepart_number: selectedSpare.part_number || 'N/A',
        quantity: qtyNum,
        unit_price: unitPrice
      };
    } else if (searchName) {
      // Allow user to type full spare part name even if not in database list
      itemToAdd = {
        sparepart_id: null,
        sparepart_name: searchName,
        sparepart_number: 'N/A',
        quantity: qtyNum,
        unit_price: 0
      };
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please type spare part name or select it from the list.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    setEditForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), itemToAdd]
    }));

    setNewEditItem({
      sparepart_id: '',
      quantity: ''
    });
    setNewEditSpareSearch('');
    setShowNewEditSpareDropdown(false);
  };

  const handleCancelOrder = async (payment) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Cancel order',
      text: 'Are you sure you want to cancel this order?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, cancel order',
      cancelButtonText: 'No'
    });

    if (!result.isConfirmed) return;

    try {
      const response = await updatePaymentStatus(payment.id, 'Rejected', user?.id || null);
      if (!response.success) {
        throw new Error(response.message || 'Failed to cancel order');
      }

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
      }

      Swal.fire({
        icon: 'success',
        title: 'Order cancelled',
        text: 'The order has been cancelled successfully.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to cancel order. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  const handleRemoveEditItem = (index) => {
    setEditForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getEditFormTotalAmount = () => {
    if (!editForm.items || editForm.items.length === 0) return 0;
    return editForm.items.reduce((sum, item) => {
      const qty = parseInt(item.quantity, 10) || 0;
      const unit = parseFloat(item.unit_price) || 0;
      return sum + qty * unit;
    }, 0);
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    try {
      if (!editForm.items || editForm.items.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'At least one spare part is required.',
          confirmButtonColor: '#1a3a5f'
        });
        return;
      }

      // Normalize items and compute totals
      const normalizedItems = editForm.items.map((item) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const unit = parseFloat(item.unit_price) || 0;
        return {
          sparepart_id: item.sparepart_id,
          quantity: qty,
          unit_price: unit,
          total_amount: unit * qty,
          sparepart_name: item.sparepart_name,
          sparepart_number: item.sparepart_number
        };
      });

      const totalQuantity = normalizedItems.reduce((sum, it) => sum + (parseInt(it.quantity, 10) || 0), 0);
      const totalAmount = normalizedItems.reduce((sum, it) => sum + (parseFloat(it.total_amount) || 0), 0);

      const response = await apiRequest(`/payments/${editingPayment.id}`, {
        method: 'PUT',
        body: {
          items_json: normalizedItems,
          quantity: totalQuantity,
          total_amount: totalAmount
        }
      });

      if (response.success) {
        const paymentsResponse = await getPayments();
        if (paymentsResponse.success && paymentsResponse.payments) {
          setPayments(paymentsResponse.payments);
        }

        setShowEditModal(false);
        setEditingPayment(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Payment updated successfully.',
          confirmButtonColor: '#1a3a5f'
        });
      } else {
        throw new Error(response.message || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update payment. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  const getInvoicePrintHtml = (payment) => {
    const totalAmount = getTotalAmount(payment);
    const dateStr = formatDateInvoice(payment.created_at);
    const trnNo = '182-150-770';
    const invNum = `PAY-${payment.id}`;
    // Uppercase for printing while keeping HTML escaping intact.
    const customerName = String(payment.customer_name || '—')
      .toUpperCase()
      .replace(/</g, '&lt;');
    const customerPhone = (payment.customer_phone || '—').replace(/</g, '&lt;');

    let items = [];
    if (payment.items && payment.items.length > 0) {
      items = payment.items;
    } else {
      // Convert single item to array format
      items = [{
        part_name: payment.sparepart_name || '—',
        part_number: payment.sparepart_number || '—',
        quantity: payment.quantity || 1,
        unit_price: payment.unit_price || 0,
        total_amount: parseFloat(payment.unit_price || 0) * (parseInt(payment.quantity || 1, 10) || 1)
      }];
    }

    const hasItems = items.length > 0;
    const subTotal = hasItems
      ? items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
      : totalAmount;
    const totalAmountFinal = subTotal;

    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const logoImg = logoSrc ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

    const itemRows = hasItems
      ? items.map((it, i) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.unit_price) || 0;
          const amount = rate * qty;
          return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${String(it.part_number || it.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
        }).join('')
      : `<tr>
          <td class="tc">1</td>
          <td>—</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
        </tr>`;

    const amountInWords = numberToWords(Math.floor(totalAmountFinal)) + ' TZS Only';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice ${invNum}</title>
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
      <p><strong>Invoice No:</strong> ${invNum}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">INVOICE</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${customerName}<br />
    <strong>Phone:</strong> ${customerPhone}
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
      <tr class="total-row total-first total-final">
        <td colspan="7" class="tr" style="font-weight:600;">Total</td>
        <td class="tr">${formatCurrency(totalAmountFinal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated invoice, hence no signature is required.*</p>
</body>
</html>`;
  };

  /** Six blank payment slips on one A4 landscape page (invoice-style branding, compact cards). */
  const getBlankPaymentSlipPrintHtml = () => {
    const logoUrl =
      typeof logo === 'string' && logo
        ? logo.startsWith('http')
          ? logo
          : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo)
        : '';
    const logoSrc = logoDataUrl || logoUrl;
    const logoImg = logoSrc
      ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="" class="slip-logo" />`
      : '';

    const printDateStr = formatDateTime(new Date().toISOString());
    const printedByRaw = String(user?.full_name || user?.username || user?.name || '').trim();
    const printedBy = printedByRaw
      ? capitalizeName(printedByRaw).replace(/</g, '&lt;')
      : '—';
    const esc = (s) => String(s ?? '').replace(/</g, '&lt;');

    const oneSlipCard = `
      <article class="slip-card">
        <div class="slip-head">
          <div class="slip-head-left">
            ${logoImg}
            <div class="slip-company">
              <h3 class="slip-co-name">Mamuya Auto Spare Parts</h3>
              <p class="slip-co-line">Kilimanjaro, Tanzania</p>
              <p class="slip-co-line">Tel: +255 757171337</p>
            </div>
          </div>
          <div class="slip-meta">
            <p><strong>Date:</strong> ${esc(printDateStr)}</p>
            <p><strong>Printed by:</strong> ${printedBy}</p>
          </div>
        </div>
        <h2 class="slip-doc-title">Customer Payment Slip</h2>
        <div class="slip-fields">
          <div class="slip-field">
            <span class="slip-label">CUSTOMER NAME</span>
            <div class="slip-line"></div>
          </div>
          <div class="slip-field">
            <span class="slip-label">AMOUNT (TZS)</span>
            <div class="slip-line"></div>
          </div>
          <div class="slip-verify">
            <span class="slip-label">VERIFIED BY</span>
            <div class="slip-sign">Signature cashier: <span class="slip-rule"></span></div>
          </div>
        </div>
      </article>`;

    const sixCards = Array.from({ length: 6 }, () => oneSlipCard).join('\n');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payment slips — 6 per sheet</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      color: #222;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    .slip-sheet {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 5mm 6mm;
      width: 100%;
      padding: 0;
      align-items: stretch;
    }
    .slip-card {
      border: 1px solid #333;
      padding: 6px 8px 7px;
      display: flex;
      flex-direction: column;
      font-size: 9px;
      line-height: 1.35;
      overflow: hidden;
      break-inside: avoid;
      page-break-inside: avoid;
      min-height: 0;
    }
    .slip-logo {
      max-height: 30px;
      max-width: 62px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .slip-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 4px;
      padding-bottom: 4px;
      margin-bottom: 3px;
      border-bottom: 1px solid #333;
    }
    .slip-head-left {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      min-width: 0;
      flex: 1;
    }
    .slip-company {
      min-width: 0;
    }
    .slip-co-name {
      margin: 0 0 1px;
      font-size: 10px;
      font-weight: 700;
      color: #111;
      letter-spacing: 0.02em;
    }
    .slip-co-line {
      margin: 0;
      font-size: 8px;
      color: #444;
    }
    .slip-meta {
      text-align: right;
      flex-shrink: 0;
      max-width: 42%;
    }
    .slip-meta p {
      margin: 0 0 2px;
      font-size: 8px;
    }
    .slip-meta p:last-child { margin-bottom: 0; }
    .slip-doc-title {
      margin: 0 0 4px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      font-decoration: uppercase;
    }
    .slip-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .slip-field { flex: 0 0 auto; }
    .slip-label {
      font-weight: 600;
      font-size: 10px;
      display: block;
      margin-bottom: 2px;
    }
    .slip-line {
      border-bottom: 1px dotted #333;
      min-height: 14px;
    }
    .slip-verify {
      margin-top: auto;
      padding-top: 3px;
      border-top: 1px solid #ccc;
      font-size: 10px;
    }
    .slip-sign {
      margin-top: 2px;
      font-weight: 600;
    }
    .slip-rule {
      display: inline-block;
      min-width: 55%;
      max-width: 100%;
      border-bottom: 1px solid #333;
      vertical-align: bottom;
      min-height: 0.95em;
    }
    @media screen {
      body {
        padding: 14px;
        background: #e9ecef;
      }
      .slip-sheet {
        max-width: 1160px;
        margin: 0 auto;
        min-height: 720px;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.12);
      }
    }
    @media print {
      html, body {
        height: 100%;
        margin: 0;
        background: #fff;
      }
      .slip-sheet {
        gap: 4mm;
        min-height: 0;
        height: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="slip-sheet">${sixCards}
  </div>
</body>
</html>`;
  };

  const handlePrintPaymentSlipTemplate = () => {
    const printContent = getBlankPaymentSlipPrintHtml();
    const printWindow = window.open('', '_blank', 'width=1200,height=820');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the payment slip.',
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
      setTimeout(triggerPrint, 150);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 150);
    }
  };

  const handlePrintInvoice = (payment) => {
    const printContent = getInvoicePrintHtml(payment);

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the invoice.',
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

  const handleDownloadInvoice = (payment) => {
    const html = getInvoicePrintHtml(payment);
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${payment.id}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to download invoice. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  const isOnFilterDate = (dateString, date) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    if (!date) return true;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    return dateOnly === date;
  };

  // Filter payments by search, status, and selected date range
  const filteredPayments = payments.filter((payment) => {
    if (!isOnFilterDate(payment.created_at, filterDate)) return false;

    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.sparepart_number && payment.sparepart_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics - count only payments in selected date range
  const pendingPayments = payments.filter((p) => p.status === 'Pending' && isOnFilterDate(p.created_at, filterDate)).length;
  const approvedPayments = payments.filter((p) => p.status === 'Approved' && isOnFilterDate(p.created_at, filterDate)).length;
  const rejectedPayments = payments.filter((p) => p.status === 'Rejected' && isOnFilterDate(p.created_at, filterDate)).length;

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
          <Link to="/sales/payments" className="nav-item active">
            <FaCreditCard className="nav-icon" />
            <span>{t.payments}</span>
          </Link>
          <Link to="/sales/sales_reports" className="nav-item">
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
            <h1 className="page-title">{t.payments}</h1>
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

        {/* Payments Content */}
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
            <button
              type="button"
              className="payment-slip-toolbar-btn"
              onClick={handlePrintPaymentSlipTemplate}
              title="Print blank customer payment slip"
            >
              <FaReceipt className="toolbar-slip-icon" aria-hidden />
              Payment slip
            </button>
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
            <div className="filter-box">
              <label className="sales-reports-date-label">Date</label>
              <input
                type="date"
                className="status-filter sales-reports-date-input"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                title="Filter by date"
              />
            </div>
            {filterDate ? (
              <div className="filter-box">
                <button
                  type="button"
                  className="sales-reports-clear-dates"
                  onClick={() => { setFilterDate(''); }}
                  title="Clear date"
                >
                  Clear date
                </button>
              </div>
            ) : null}
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingPayments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedPayments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedPayments}</p>
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
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => (
                    <tr key={payment.id}>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn view" title={t.details} onClick={() => handleView(payment)}>
                            <FaEye className="action-icon" />
                          </button>
                          {payment.status === 'Pending' && (
                            <>
                              <button
                                className="action-btn edit"
                                title="Edit Payment"
                                onClick={() => handleEdit(payment)}
                              >
                                <FaEdit className="action-icon" />
                              </button>
                              <button
                                className="action-btn reject"
                                title="Cancel Order"
                                onClick={() => handleCancelOrder(payment)}
                              >
                                <FaTimesCircle className="action-icon" />
                              </button>
                            </>
                          )}
                          <button
                            className="action-btn print"
                            title="Print Invoice"
                            onClick={() => handlePrintInvoice(payment)}
                          >
                            <FaPrint className="action-icon" />
                          </button>
                          <button
                            className="action-btn view"
                            title="Download Invoice"
                            onClick={() => handleDownloadInvoice(payment)}
                          >
                            <FaDownload className="action-icon" />
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
                      <td>
                        {payment.items && payment.items.length > 0 ? (
                          <div>
                            {payment.items.map((item, idx) => (
                              <div key={idx} className="part-info" style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}>
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                  <div className="info-detail">{(item.sparepart_number || 'N/A').toUpperCase()} - Qty: {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">{capitalizeName(payment.sparepart_name || 'Unknown')}</div>
                              <div className="info-detail">{payment.sparepart_number?.toUpperCase()}</div>
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
                      <td className="amount-cell">TZS {formatPrice(getTotalAmount(payment))}</td>
                      <td>
                        <span className={`status-badge ${
                          payment.status === 'Approved' ? 'approved' :
                          payment.status === 'Rejected' ? 'rejected' :
                          'pending'
                        }`}>
                          {payment.status === 'Approved' && <FaCheckCircle />}
                          {payment.status === 'Rejected' && <FaTimesCircle />}
                          {payment.status === 'Pending' && <FaClock />}
                          {payment.status === 'Approved' ? t.approved : payment.status === 'Rejected' ? t.rejected : t.pending}
                        </span>
                      </td>
                      <td>{formatDateTime(payment.created_at)}</td>
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
              <h2>{t.details}</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
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
                  <label>
                    <FaUser /> {t.performedBy}
                  </label>
                  <div className="view-value">
                    {capitalizeName(selectedPayment.employee_name || selectedPayment.employee_username || 'Unknown')}
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
                              {t.partNumber}: {(item.sparepart_number || 'N/A').toUpperCase()}
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
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.quantity}
                      </label>
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
                  <label>
                    <FaCreditCard /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaClock /> {t.status}
                  </label>
                  <div className="view-value">
                    <span className={`status-badge ${
                      selectedPayment.status === 'Approved' ? 'approved' :
                      selectedPayment.status === 'Rejected' ? 'rejected' :
                      'pending'
                    }`}>
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {selectedPayment.status === 'Approved' ? t.approved : selectedPayment.status === 'Rejected' ? t.rejected : t.pending}
                    </span>
                  </div>
                </div>
                {selectedPayment.approver_name && (
                  <div className="view-item">
                    <label>
                      <FaUser /> {t.approvedBy}
                    </label>
                    <div className="view-value">{capitalizeName(selectedPayment.approver_name)}</div>
                  </div>
                )}
                {selectedPayment.approved_at && (
                  <div className="view-item">
                    <label>
                      <FaClock /> {t.approved} {t.date}
                    </label>
                    <div className="view-value">{formatDateTime(selectedPayment.approved_at)}</div>
                  </div>
                )}
                <div className="view-item">
                  <label>
                    <FaClock /> {t.created}
                  </label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditModal && editingPayment && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingPayment(null); }}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Payment</h2>
              <button className="close-btn" onClick={() => { setShowEditModal(false); setEditingPayment(null); }}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>
                    <FaCreditCard /> Payment ID
                  </label>
                  <div className="view-value">#{editingPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> Customer Name
                  </label>
                  <input
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '5px' }}
                    readOnly
                    disabled
                  />
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> Customer Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.customer_phone}
                    onChange={(e) => setEditForm({ ...editForm, customer_phone: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '5px' }}
                    readOnly
                    disabled
                  />
                </div>

                {editForm.items && editForm.items.length > 0 && (
                  <div className="view-item">
                    <label>
                      <FaBox /> Spare Parts & Quantities
                    </label>
                    <div
                      className="view-value"
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      {editForm.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '8px 10px',
                            border: '1px solid #eee',
                            borderRadius: '6px',
                            flex: '0 0 calc(50% - 10px)',
                            boxSizing: 'border-box',
                            backgroundColor: '#fafafa'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>
                              {capitalizeName(item.sparepart_name || 'Unknown')}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                              {(item.sparepart_number || 'N/A').toUpperCase()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>Qty:</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => handleEditItemQuantityChange(idx, e.target.value)}
                              style={{
                                width: '70px',
                                padding: '5px 8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                              }}
                            />
                            {editForm.items.length > 1 && (
                              <button
                                type="button"
                                className="action-btn reject"
                                style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                                onClick={() => handleRemoveEditItem(idx)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add new spare part (from database list, with search like manager generateSales) */}
                <div className="view-item">
                  <label>Add new spare part to this payment</label>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginTop: '6px'
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <FaSearch
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#666',
                          zIndex: 1
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search spare part"
                        value={newEditSpareSearch}
                        onChange={(e) => handleNewEditSpareSearchChange(e.target.value)}
                        onFocus={() => setShowNewEditSpareDropdown(true)}
                        style={{
                          width: '100%',
                          padding: '8px 10px 8px 36px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      {showNewEditSpareDropdown && newEditSpareSearch && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            marginTop: '5px'
                          }}
                        >
                          {spareparts
                            .filter((sp) => {
                              // Exclude already selected items in this payment
                              const alreadyInPayment =
                                editForm.items &&
                                editForm.items.some(
                                  (it) =>
                                    it.sparepart_id &&
                                    String(it.sparepart_id) === String(sp.id)
                                );
                              if (alreadyInPayment) return false;

                              const searchLower = newEditSpareSearch.toLowerCase();
                              const nameMatch =
                                (sp.part_name && sp.part_name.toLowerCase().includes(searchLower)) ||
                                (sp.part_number && sp.part_number.toLowerCase().includes(searchLower)) ||
                                (sp.brand_name && sp.brand_name.toLowerCase().includes(searchLower));
                              return nameMatch;
                            })
                            .slice()
                            .sort((a, b) =>
                              String(a.part_name || '').toLowerCase().localeCompare(String(b.part_name || '').toLowerCase())
                            )
                            .map((sp) => (
                              <div
                                key={sp.id}
                                onClick={() => handleNewEditSpareSelect(sp)}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f5f7fa';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 500, color: '#2c3e50' }}>
                                    {capitalizeName(sp.part_name)}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                    {(() => {
                                      const priceType = getOrderPriceType();
                                      const rawPrice =
                                        priceType === 'wholesale'
                                          ? (sp.wholesale_price ?? sp.retail_price ?? 0)
                                          : (sp.retail_price ?? sp.wholesale_price ?? 0);
                                      return `${sp.part_number || 'N/A'} - TZS ${formatPrice(rawPrice)}`;
                                    })()}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Quantity"
                        value={newEditItem.quantity}
                        onChange={(e) => handleNewEditItemChange('quantity', e.target.value)}
                        style={{
                          width: '120px',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <button
                        type="button"
                        className="action-btn approve"
                        style={{ padding: '8px 14px', fontSize: '0.9rem' }}
                        onClick={handleAddNewEditItem}
                      >
                        Add spare part
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      New parts use <strong>{getOrderPriceType() === 'wholesale' ? 'wholesale' : 'retail'}</strong> price to match this order.
                    </div>
                  </div>
                </div>

                <div className="view-item">
                  <label>Total Amount</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getEditFormTotalAmount())}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaClock /> Status
                  </label>
                  <div className="view-value">
                    <span className={`status-badge ${
                      editingPayment.status === 'Approved' ? 'approved' :
                      editingPayment.status === 'Rejected' ? 'rejected' :
                      'pending'
                    }`}>
                      {editingPayment.status === 'Approved' && <FaCheckCircle />}
                      {editingPayment.status === 'Rejected' && <FaTimesCircle />}
                      {editingPayment.status === 'Pending' && <FaClock />}
                      {editingPayment.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => { setShowEditModal(false); setEditingPayment(null); }}>
                Cancel
              </button>
              <button 
                className="action-btn primary" 
                onClick={handleSaveEdit}
                style={{ padding: '10px 20px', marginLeft: '10px' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
