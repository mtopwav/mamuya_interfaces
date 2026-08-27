import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaMoneyBillAlt,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaChartBar,
  FaCog,
  FaUser,
  FaEnvelope,
  FaTags,
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendarAlt,
  FaBell,
  FaPlus,
  FaTimes,
  FaPrint
} from 'react-icons/fa';
import './categories&brands.css';
import '../sales/payments.css';
import logo from '../../images/logo.png';
import { getPayments, createPayment, getCustomers, getEmployees, getSpareParts } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

function Sales() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', 'today', 'weekly', 'monthly'
  const [payments, setPayments] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [dateFormatVersion, setDateFormatVersion] = useState(0); // Force re-render when format changes
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Generate Sales Modal State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedParts, setSelectedParts] = useState([]);
  const [partSearchInput, setPartSearchInput] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [priceType, setPriceType] = useState('retail');
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    setLoading(false);

    // Load payments
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
          text: error.message || 'Failed to load sales data. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    loadPayments();

    // Load data for generate sales modal
    const loadGenerateSalesData = async () => {
      setLoadingData(true);
      try {
        const [customersRes, employeesRes, sparePartsRes] = await Promise.all([
          getCustomers(),
          getEmployees(),
          getSpareParts()
        ]);

        if (customersRes.success && customersRes.customers) {
          setCustomers(customersRes.customers);
        }

        if (employeesRes.success && employeesRes.employees) {
          setEmployees(employeesRes.employees);
        }

        if (sparePartsRes.success && sparePartsRes.spareParts) {
          const formattedParts = sparePartsRes.spareParts.map(p => ({
            id: p.id,
            name: p.part_name,
            partNumber: p.part_number,
            brand: p.brand_name || 'Unknown',
            wholesale_price: p.wholesale_price != null ? Number(p.wholesale_price) : null,
            retail_price: p.retail_price != null ? Number(p.retail_price) : null,
            status: p.status
          }));
          setSpareParts(formattedParts);
        }
      } catch (error) {
        console.error('Error loading generate sales data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    // Initialize and update current date/time every second
    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Listen for date format changes
    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
      setDateFormatVersion(prev => prev + 1); // Force re-render of date displays
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  // Load data when generate modal opens
  useEffect(() => {
    if (showGenerateModal) {
      const loadGenerateSalesData = async () => {
        setLoadingData(true);
        try {
          const [customersRes, employeesRes, sparePartsRes] = await Promise.all([
            getCustomers(),
            getEmployees(),
            getSpareParts()
          ]);

          if (customersRes.success && customersRes.customers) {
            setCustomers(customersRes.customers);
          }

          if (employeesRes.success && employeesRes.employees) {
            setEmployees(employeesRes.employees);
          }

          if (sparePartsRes.success && sparePartsRes.spareParts) {
            const formattedParts = sparePartsRes.spareParts.map(p => ({
              id: p.id,
              name: p.part_name,
              partNumber: p.part_number,
              brand: p.brand_name || 'Unknown',
              wholesale_price: p.wholesale_price != null ? Number(p.wholesale_price) : null,
              retail_price: p.retail_price != null ? Number(p.retail_price) : null,
              status: p.status
            }));
            setSpareParts(formattedParts);
          }
        } catch (error) {
          console.error('Error loading generate sales data:', error);
        } finally {
          setLoadingData(false);
        }
      };
      loadGenerateSalesData();
    }
  }, [showGenerateModal]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.customer-dropdown-container') && !event.target.closest('.part-dropdown-container')) {
        setShowCustomerDropdown(false);
        setShowPartDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) {
    return null;
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

  /** Employee who created the sale — API fields or lookup by employee_id */
  const getSalesEmployeeLabel = (payment) => {
    const direct = String(payment.employee_name || payment.employee_username || '').trim();
    if (direct) return capitalizeName(direct);
    const eid = payment.employee_id;
    if (eid != null && employees.length) {
      const emp = employees.find((e) => String(e.id) === String(eid));
      if (emp) {
        const n = String(emp.full_name || emp.name || emp.username || '').trim();
        if (n) return capitalizeName(n);
      }
    }
    return '—';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Helpers for printable receipt (same style as manager/transactions)
  const formatCurrencyPrint = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const getPaymentTotalAmount = (payment) => {
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

  const handlePrintReceipt = (payment) => {
    if (!payment || payment.status !== 'Approved') return;

    const totalAmount = getPaymentTotalAmount(payment);
    const discount = Number(payment.discount_amount) || 0;
    const subTotal = totalAmount;
    const totalAmountFinal = Math.max(0, subTotal - discount);
    const amountReceived = Number(payment.amount_received) || 0;
    const amountRemain = Math.max(0, totalAmountFinal - amountReceived);

    const dateStr = formatDateInvoice(payment.created_at);
    const trnNo = '182-150-770';
    const invNum = `RCPT-${payment.id}`;
    const customerName = (payment.customer_name || '—').replace(/</g, '&lt;');

    let items = [];
    if (payment.items && payment.items.length > 0) {
      items = payment.items;
    } else {
      items = [{
        part_name: payment.sparepart_name || '—',
        part_number: payment.sparepart_number || '—',
        quantity: payment.quantity || 1,
        unit_price: payment.unit_price || 0,
        total_amount: parseFloat(payment.unit_price || 0) * (parseInt(payment.quantity || 1, 10) || 1)
      }];
    }

    const hasItems = items.length > 0;

    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoImg = logoUrl ? `<img src="${String(logoUrl).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

    const itemRows = hasItems
      ? items.map((it, i) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.unit_price) || 0;
          const amount = rate * qty;
          return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${(it.part_number || it.sparepart_number || '—').replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrencyPrint(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrencyPrint(amount)}</td>
            <td class="tr">${formatCurrencyPrint(amount)}</td>
          </tr>`;
        }).join('')
      : `<tr>
          <td class="tc">1</td>
          <td>—</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrencyPrint(totalAmount)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrencyPrint(totalAmount)}</td>
          <td class="tr">${formatCurrencyPrint(totalAmount)}</td>
        </tr>`;

    const amountInWords = numberToWords(Math.floor(totalAmountFinal)) + ' TZS Only';

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${invNum}</title>
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
      <p><strong>Date:</strong> ${dateStr}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">RECEIPT</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${customerName}
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
        <td class="tr">${formatCurrencyPrint(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Discount</td>
        <td class="tr">-${formatCurrencyPrint(discount)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Received</td>
        <td class="tr">${formatCurrencyPrint(amountReceived)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Remain</td>
        <td class="tr">${formatCurrencyPrint(amountRemain)}</td>
      </tr>
      <tr class="total-row total-final">
        <td colspan="7" class="tr" style="font-weight:700;">Total Received</td>
        <td class="tr">${formatCurrencyPrint(amountReceived)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
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

  // Generate Sales Modal Functions
  const handleOpenGenerateModal = () => {
    setShowGenerateModal(true);
    // Set default employee to current user if available
    if (user && user.id) {
      setSelectedEmployeeId(user.id);
    }
  };

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
    setSelectedCustomerId('');
    setSelectedEmployeeId('');
    setCustomerSearchInput('');
    setSelectedParts([]);
    setPartSearchInput('');
    setShowCustomerDropdown(false);
    setShowPartDropdown(false);
  };

  const filteredCustomers = customerSearchInput.trim()
    ? customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchInput.toLowerCase()) ||
        customer.phone.includes(customerSearchInput)
      )
    : customers;

  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchInput(capitalizeName(customer.name));
    setShowCustomerDropdown(false);
  };

  const filteredParts = spareParts.filter(part => {
    const isNotSelected = !selectedParts.find(sp => String(sp.partId) === String(part.id));
    const searchLower = partSearchInput.toLowerCase();
    const matchesSearch = part.name.toLowerCase().includes(searchLower) ||
      part.partNumber.toLowerCase().includes(searchLower) ||
      (part.brand && part.brand.toLowerCase().includes(searchLower));
    return isNotSelected && matchesSearch;
  });

  const handlePartSelect = (part) => {
    const alreadySelected = selectedParts.find(sp => String(sp.partId) === String(part.id));
    if (alreadySelected) {
      Swal.fire({
        icon: 'info',
        title: 'Part Already Added',
        text: 'This part is already in your list.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    if (part.status === 'Out of Stock') {
      Swal.fire({
        icon: 'warning',
        title: 'Out of Stock',
        text: 'This spare part is out of stock. Please choose another part.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    const newPart = {
      partId: part.id,
      part: part,
      quantity: 1
    };
    setSelectedParts([...selectedParts, newPart]);
    setPartSearchInput('');
    setShowPartDropdown(false);
  };

  const handleRemovePart = (partId) => {
    setSelectedParts(selectedParts.filter(sp => String(sp.partId) !== String(partId)));
  };

  const handleUpdatePartQuantity = (partId, newQuantity) => {
    const raw = String(newQuantity).replace(/\D/g, '');
    const value = raw === '' ? 0 : Math.max(1, parseInt(raw, 10) || 0);
    const updatedParts = selectedParts.map(sp => {
      if (String(sp.partId) === String(partId)) {
        return { ...sp, quantity: value };
      }
      return sp;
    });
    setSelectedParts(updatedParts);
  };

  const getUnitPrice = (part) => {
    if (priceType === 'wholesale') {
      return Number(part.wholesale_price) || 0;
    }
    return Number(part.retail_price) || 0;
  };

  const getTotalAmount = () => {
    return selectedParts.reduce((sum, selectedPart) => {
      const unitPrice = getUnitPrice(selectedPart.part);
      const quantity = Math.max(0, parseInt(selectedPart.quantity, 10) || 0);
      return sum + unitPrice * quantity;
    }, 0);
  };

  const handleGenerateSale = async (e) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select a customer.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    if (!selectedEmployeeId) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please select an employee.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    if (selectedParts.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please add at least one spare part.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    try {
      const items = selectedParts
        .map(sp => {
          const unitPrice = getUnitPrice(sp.part);
          const qty = Math.max(0, parseInt(sp.quantity, 10) || 0);
          return { sp, unitPrice, qty };
        })
        .filter(({ qty }) => qty > 0)
        .map(({ sp, unitPrice, qty }) => ({
          sparepart_id: sp.part.id,
          quantity: qty,
          unit_price: unitPrice,
          total_amount: unitPrice * qty
        }));

      if (items.length === 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please add at least one spare part with quantity greater than 0.',
          confirmButtonColor: '#1a3a5f'
        });
        return;
      }

      const paymentPayload = {
        customer_id: parseInt(selectedCustomerId),
        employee_id: parseInt(selectedEmployeeId),
        price_type: priceType,
        items
      };

      const response = await createPayment(paymentPayload);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to save payment');
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Sales generated successfully!',
        confirmButtonColor: '#1a3a5f'
      });

      // Reload payments
      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setPayments(paymentsResponse.payments);
      }

      handleCloseGenerateModal();
    } catch (error) {
      console.error('Error creating payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to save payment. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    }
  };

  // Filter payments by time period
  const filterByTimePeriod = (paymentList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return paymentList.filter((p) => {
      if (!p.created_at) return false;

      const paymentDate = new Date(p.created_at);
      const paymentDateOnly = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth(),
        paymentDate.getDate()
      );

      switch (timePeriod) {
        case 'today':
          return paymentDateOnly.getTime() === today.getTime();

        case 'weekly': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return paymentDateOnly >= weekAgo && paymentDateOnly <= today;
        }

        case 'monthly': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return paymentDateOnly >= monthAgo && paymentDateOnly <= today;
        }

        default:
          return true;
      }
    });
  };

  // Filter payments
  const timeFilteredPayments = filterByTimePeriod(payments);
  const filteredPayments = timeFilteredPayments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name &&
        payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name &&
        payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number &&
        payment.sparepart_number.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'All' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalSales = filteredPayments.reduce(
    (sum, p) => sum + (parseFloat(p.total_amount) || 0),
    0
  );
  const totalTransactions = filteredPayments.length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'Pending')
    .length;
  const approvedCount = filteredPayments.filter(
    (p) => p.status === 'Approved'
  ).length;
  const rejectedCount = filteredPayments.filter(
    (p) => p.status === 'Rejected'
  ).length;

  return (
    <div className="categories-brands-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item active">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link to="/admin/finances" className="nav-item">
            <FaMoneyBillAlt className="nav-icon" />
            <span>{t.finances}</span>
          </Link>
          <Link
            to="/admin/transactions"
            className={'nav-item' + (window.location.pathname === '/admin/transactions' ? ' active' : '')}
          >
            <FaCalendarAlt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/admin/messages" className="nav-item">
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="categories-brands-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.sales}</h1>
          </div>

          <div className="header-right">
            <div
              className="date-time-display"
              style={{
                marginRight: '20px',
                fontSize: '14px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="categories-brands-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${t.customer.toLowerCase()}, ${t.phone.toLowerCase()}, ${t.spareParts.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
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
            <div className="filter-box">
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="status-filter"
              >
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
            <button
              className="add-btn"
              onClick={handleOpenGenerateModal}
              style={{
                backgroundColor: '#1a3a5f',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                marginLeft: 'auto'
              }}
            >
              <FaPlus /> Generate Sales
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalTransactions}</h3>
                <p className="stat-value">{totalTransactions}</p>
              </div>
            </div>
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
          </div>

          {/* Sales Table */}
          <div className="table-container admin-sales-table-container">
            <table className="items-table admin-sales-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>{t.paymentId}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.discount || 'Discount'}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                  <th>Employee</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="15" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, index) => (
                    <tr key={payment.id}>
                      <td>{index + 1}</td>
                      <td>#{payment.id}</td>
                      <td>
                        <div className="customer-info">
                          <FaUsers className="info-icon" />
                          <div>
                            <div className="info-name">
                              {capitalizeName(payment.customer_name)}
                            </div>
                            <div className="info-detail">
                              {payment.customer_phone}
                            </div>
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
                                style={{
                                  marginBottom:
                                    idx < payment.items.length - 1 ? '8px' : '0'
                                }}
                              >
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">
                                    {capitalizeName(
                                      item.sparepart_name || 'Unknown'
                                    )}
                                  </div>
                                  <div className="info-detail">
                                    {(item.sparepart_number || 'N/A').toUpperCase()}{' '}
                                    - Qty: {item.quantity}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">
                                {capitalizeName(
                                  payment.sparepart_name || 'Unknown'
                                )}
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
                          ? payment.items.reduce(
                              (sum, item) =>
                                sum + (parseInt(item.quantity) || 0),
                              0
                            )
                          : payment.quantity}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0
                          ? payment.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  marginBottom:
                                    idx < payment.items.length - 1 ? '5px' : '0'
                                }}
                              >
                                TZS {formatPrice(item.unit_price)}
                              </div>
                            ))
                          : `TZS ${formatPrice(payment.unit_price)}`}
                      </td>
                      <td className="amount-cell">
                        {formatCurrency(payment.total_amount)}
                      </td>
                      <td className="amount-cell">
                        {payment.amount_received != null
                          ? formatCurrency(payment.amount_received)
                          : '—'}
                      </td>
                      <td className="amount-cell">
                        {(() => {
                          const total = parseFloat(payment.total_amount) || 0;
                          const received = parseFloat(payment.amount_received) || 0;
                          const remain =
                            payment.amount_remain != null
                              ? parseFloat(payment.amount_remain) || 0
                              : Math.max(0, total - received);
                          return formatCurrency(remain);
                        })()}
                      </td>
                      <td className="amount-cell">
                        {payment.discount_amount != null
                          ? formatCurrency(payment.discount_amount)
                          : '—'}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {payment.payment_method || '—'}
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
                          {payment.status === 'Approved' && (
                            <FaCheckCircle />
                          )}
                          {payment.status === 'Rejected' && (
                            <FaTimesCircle />
                          )}
                          {payment.status === 'Pending' && <FaClock />}
                          {payment.status}
                        </span>
                      </td>
                      <td key={`date-${dateFormatVersion}`}>{formatDateTime(payment.created_at)}</td>
                      <td>{getSalesEmployeeLabel(payment)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.view}
                            onClick={() => handleView(payment)}
                          >
                            <FaEye className="action-icon" />
                            <span className="action-text">{t.view}</span>
                          </button>
                          {payment.status === 'Approved' && (
                            <button
                              className="action-btn print"
                              title="Print Receipt"
                              onClick={() => handlePrintReceipt(payment)}
                            >
                              <FaPrint className="action-icon" />
                              <span className="action-text">Print Receipt</span>
                            </button>
                          )}
                        </div>
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
        <div
          className="modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t.paymentId} {t.details || 'Details'}</h2>
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
                    <FaShoppingCart /> {t.paymentId}
                  </label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> {t.customer}
                  </label>
                  <div className="view-value">
                    <div>
                      {capitalizeName(selectedPayment.customer_name)}
                    </div>
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
                    <FaUser /> {t.sales} Employee
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
                          <div
                            key={idx}
                            style={{
                              marginBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '15px'
                                  : '0',
                              paddingBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '15px'
                                  : '0',
                              borderBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '1px solid #eee'
                                  : 'none'
                            }}
                          >
                            <div
                              style={{
                                fontWeight: '500',
                                marginBottom: '5px'
                              }}
                            >
                              {capitalizeName(
                                item.sparepart_name || 'Unknown'
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666',
                                marginBottom: '5px'
                              }}
                            >
                              Part Number:{' '}
                              {(item.sparepart_number || 'N/A').toUpperCase()}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666',
                                marginBottom: '5px'
                              }}
                            >
                              Quantity: {item.quantity}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666'
                              }}
                            >
                              Unit Price: {formatCurrency(item.unit_price)} |
                              Total: {formatCurrency(item.total_amount)}
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
                        <FaBox /> Spare Part
                      </label>
                      <div className="view-value">
                        <div>
                          {capitalizeName(
                            selectedPayment.sparepart_name || 'Unknown'
                          )}
                        </div>
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
                      <label>Quantity</label>
                      <div className="view-value">
                        {selectedPayment.quantity}
                      </div>
                    </div>
                    <div className="view-item">
                      <label>Unit Price</label>
                      <div className="view-value">
                        {formatCurrency(selectedPayment.unit_price)}
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
                    {formatCurrency(selectedPayment.total_amount)}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaMoneyBillAlt /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">
                      {selectedPayment.payment_method || '—'}
                    </span>
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
                      {selectedPayment.status === 'Approved' && (
                        <FaCheckCircle />
                      )}
                      {selectedPayment.status === 'Rejected' && (
                        <FaTimesCircle />
                      )}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {selectedPayment.status === 'Approved' ? t.approved : selectedPayment.status === 'Rejected' ? t.rejected : t.pending}
                    </span>
                  </div>
                </div>
                {selectedPayment.status === 'Approved' &&
                  selectedPayment.approver_name && (
                    <div className="view-item">
                      <label>
                        <FaCheckCircle /> {t.approvedBy}
                      </label>
                      <div className="view-value">
                        {capitalizeName(selectedPayment.approver_name)}
                      </div>
                    </div>
                  )}
                <div className="view-item">
                  <label>
                    <FaCalendarAlt /> {t.created}
                  </label>
                  <div className="view-value">
                    <span key={`modal-date-${dateFormatVersion}`}>{formatDateTime(selectedPayment.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowViewModal(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Sales Modal */}
      {showGenerateModal && (
        <div
          className="modal-overlay"
          onClick={handleCloseGenerateModal}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <h2>Generate Sales</h2>
              <button
                className="close-btn"
                onClick={handleCloseGenerateModal}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleGenerateSale}>
              <div className="form-group">
                <label>Customer *</label>
                <div className="customer-dropdown-container" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search customer by name or phone..."
                    value={customerSearchInput}
                    onChange={(e) => {
                      setCustomerSearchInput(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="form-input"
                    required
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: '500' }}>{capitalizeName(customer.name)}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{customer.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Employee *</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {capitalizeName(emp.full_name || emp.name)} - {emp.department || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Price Type</label>
                <select
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                  className="form-input"
                >
                  <option value="retail">Retail</option>
                  <option value="wholesale">Wholesale</option>
                </select>
              </div>

              <div className="form-group">
                <label>Add Spare Parts *</label>
                <div className="part-dropdown-container" style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search spare parts..."
                    value={partSearchInput}
                    onChange={(e) => {
                      setPartSearchInput(e.target.value);
                      setShowPartDropdown(true);
                    }}
                    onFocus={() => setShowPartDropdown(true)}
                    className="form-input"
                  />
                  {showPartDropdown && filteredParts.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {filteredParts.map((part) => (
                        <div
                          key={part.id}
                          onClick={() => handlePartSelect(part)}
                          style={{
                            padding: '10px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #eee'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontWeight: '500' }}>{capitalizeName(part.name)}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            {part.partNumber} - {part.brand} - {formatCurrency(getUnitPrice(part))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedParts.length > 0 && (
                <div className="form-group">
                  <label>Selected Parts</label>
                  <div style={{ border: '1px solid #ddd', borderRadius: '5px', padding: '10px' }}>
                      {selectedParts.map((sp) => (
                        <div
                          key={sp.partId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px',
                            borderBottom: '1px solid #eee'
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500' }}>{capitalizeName(sp.part.name)}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              {sp.part.partNumber} - {formatCurrency(getUnitPrice(sp.part))} each
                            </div>
                          </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="number"
                            min="1"
                            value={sp.quantity}
                            onChange={(e) => handleUpdatePartQuantity(sp.partId, e.target.value)}
                            style={{
                              width: '80px',
                              padding: '5px',
                              border: '1px solid #ddd',
                              borderRadius: '3px'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePart(sp.partId)}
                            style={{
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '2px solid #1a3a5f' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <span>Total Amount:</span>
                        <span>{formatCurrency(getTotalAmount())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCloseGenerateModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loadingData}
                >
                  {loadingData ? <MiniLoader label={t.loading} /> : 'Generate Sales'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
