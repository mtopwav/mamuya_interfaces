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
  FaEye,
  FaEdit,
  FaPlus,
  FaMinus,
  FaPrint,
  FaDownload,
} from 'react-icons/fa';
import './dashboard.css';
import './invoices.css';
import logo from '../../../images/logo.png';
import { getInvoices, createInvoice, updateInvoice, getSpareParts } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

const INVOICE_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];

/** Generate next invoice number: INV-YYYY-NNNN (e.g. INV-2025-0001) */
function generateInvoiceNumber(existingInvoices = []) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const pattern = new RegExp(`^${prefix.replace('-', '\\-')}(\\d+)$`, 'i');
  let maxNum = 0;
  existingInvoices.forEach((inv) => {
    const num = inv.invoice_number && typeof inv.invoice_number === 'string' ? inv.invoice_number.trim() : '';
    const match = num.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

function AccountantInvoices() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    invoice_number: '',
    date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    items: [{ sparepart_id: null, quantity: 1 }],
    status: 'Draft',
    due_date: '',
    tin: '182-150-770',
  });
  const [editForm, setEditForm] = useState({
    invoice_number: '',
    date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    items: [{ sparepart_id: null, quantity: 1 }],
    status: 'Draft',
    due_date: '',
    tin: '182-150-770',
  });
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [spareparts, setSpareparts] = useState([]);

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

    const loadInvoices = async () => {
      try {
        const res = await getInvoices();
        if (res.success && res.invoices) setInvoices(res.invoices);
      } catch (err) {
        console.error('Error loading invoices:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load invoices.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    const loadSpareparts = async () => {
      try {
        const res = await getSpareParts();
        if (res.success && res.spareParts) setSpareparts(res.spareParts || []);
      } catch (err) {
        console.error('Error loading spare parts:', err);
      }
    };
    loadInvoices();
    loadSpareparts();
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

  const parseAmount = (value) => {
    if (value == null || value === '') return 0;
    const num = Number(String(value).replace(/,/g, ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const formatCurrency = (amount) => {
    const num = parseAmount(amount);
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const toDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const isInPeriod = (dateStr, period) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    if (period === 'all') return true;
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'week') {
      const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
      const invOnly = toDateOnly(dateStr);
      return invOnly != null && invOnly >= weekStart && invOnly <= nowOnly;
    }
    return true;
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      (inv.invoice_number && inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (inv.description && inv.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const matchesPeriod = isInPeriod(inv.date, periodFilter);
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalAmount = filteredInvoices.reduce((sum, i) => sum + parseAmount(i.amount), 0);
  const totalThisMonth = invoices
    .filter((i) => isInPeriod(i.date, 'month'))
    .reduce((sum, i) => sum + parseAmount(i.amount), 0);
  const paidCount = invoices.filter((i) => i.status === 'Paid').length;
  const paidAmount = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + parseAmount(i.amount), 0);

  const handleView = (invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const openAddModal = () => {
    const nextNumber = generateInvoiceNumber(invoices);
    setAddForm({
      invoice_number: nextNumber,
      date: new Date().toISOString().slice(0, 10),
      customer_name: '',
      items: [{ sparepart_id: null, quantity: 1 }],
      status: 'Draft',
      due_date: '',
      tin: '',
    });
    setShowAddModal(true);
  };

  const formatAmountDisplay = (value) => {
    const digits = String(value).replace(/\D/g, '');
    if (digits === '') return '';
    return Number(digits).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const getSparepartById = (id) => spareparts.find((sp) => String(sp.id) === String(id));
  const getWholesalePrice = (sp) => parseFloat(sp?.wholesale_price) || 0;

  const computeItemsTotal = (items) => {
    return items.reduce((sum, it) => {
      const sp = getSparepartById(it.sparepart_id);
      const price = getWholesalePrice(sp);
      const qty = parseInt(it.quantity, 10) || 0;
      return sum + price * qty;
    }, 0);
  };

  const computeItemsDescription = (items) => {
    return items
      .filter((it) => it.sparepart_id)
      .map((it) => {
        const sp = getSparepartById(it.sparepart_id);
        const qty = parseInt(it.quantity, 10) || 1;
        return sp ? `${sp.part_name}${sp.part_number ? ` (${sp.part_number})` : ''} x${qty}` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  const addItemRow = (form) => {
    if (form === 'add') setAddForm((f) => ({ ...f, items: [...f.items, { sparepart_id: null, quantity: 1 }] }));
    else setEditForm((f) => ({ ...f, items: [...f.items, { sparepart_id: null, quantity: 1 }] }));
  };

  const removeItemRow = (form, idx) => {
    if (form === 'add') setAddForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx).length ? f.items.filter((_, i) => i !== idx) : [{ sparepart_id: null, quantity: 1 }] }));
    else setEditForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx).length ? f.items.filter((_, i) => i !== idx) : [{ sparepart_id: null, quantity: 1 }] }));
  };

  const updateAddItem = (idx, field, value) => {
    setAddForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const updateEditItem = (idx, field, value) => {
    setEditForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    const invoiceNumber = (addForm.invoice_number && addForm.invoice_number.trim()) || generateInvoiceNumber(invoices);
    if (!invoiceNumber) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Invoice number is required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (!addForm.customer_name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Customer name is required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const itemsData = addForm.items
      .filter((it) => it.sparepart_id)
      .map((it) => {
        const sp = getSparepartById(it.sparepart_id);
        return {
          sparepart_id: parseInt(it.sparepart_id, 10),
          part_name: sp?.part_name,
          part_number: sp?.part_number,
          quantity: parseInt(it.quantity, 10) || 1,
          wholesale_price: getWholesalePrice(sp),
        };
      });
    const amountNum = computeItemsTotal(addForm.items);
    if (amountNum <= 0 || itemsData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Add at least one spare part.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const description = computeItemsDescription(addForm.items);
    setSubmitting(true);
    try {
      const res = await createInvoice({
        invoice_number: invoiceNumber,
        date: addForm.date,
        customer_name: addForm.customer_name.trim(),
        description: description || null,
        amount: amountNum,
        status: addForm.status,
        due_date: addForm.due_date || null,
        tin: '182-150-770',
        items_json: JSON.stringify(itemsData),
        added_by: user?.id || null,
      });
      if (res.success && res.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setShowAddModal(false);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Invoice created successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to create invoice');
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to create invoice.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (inv) => {
    const dateStr = inv.date ? (typeof inv.date === 'string' && inv.date.length >= 10 ? inv.date.slice(0, 10) : new Date(inv.date).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10);
    const dueStr = inv.due_date ? (typeof inv.due_date === 'string' && inv.due_date.length >= 10 ? inv.due_date.slice(0, 10) : new Date(inv.due_date).toISOString().slice(0, 10)) : '';
    let items = [{ sparepart_id: null, quantity: 1 }];
    if (inv.items_json) {
      try {
        const parsed = JSON.parse(inv.items_json);
        if (Array.isArray(parsed) && parsed.length) {
          items = parsed.map((it) => ({ sparepart_id: it.sparepart_id, quantity: it.quantity || 1 }));
        }
      } catch (_) {}
    }
    setEditingInvoice(inv);
    setEditForm({
      invoice_number: inv.invoice_number || '',
      date: dateStr,
      customer_name: inv.customer_name || '',
      items,
      status: inv.status || 'Draft',
      due_date: dueStr,
      tin: inv.tin || '',
    });
    setShowEditModal(true);
  };

  const handleEditInvoice = async (e) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (!editForm.invoice_number.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Invoice number is required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (!editForm.customer_name.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Customer name is required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const itemsData = editForm.items
      .filter((it) => it.sparepart_id)
      .map((it) => {
        const sp = getSparepartById(it.sparepart_id);
        return {
          sparepart_id: parseInt(it.sparepart_id, 10),
          part_name: sp?.part_name,
          part_number: sp?.part_number,
          quantity: parseInt(it.quantity, 10) || 1,
          wholesale_price: getWholesalePrice(sp),
        };
      });
    const amountNum = computeItemsTotal(editForm.items);
    if (amountNum <= 0 || itemsData.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Add at least one spare part.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const description = computeItemsDescription(editForm.items);
    setSubmitting(true);
    try {
      const res = await updateInvoice(editingInvoice.id, {
        invoice_number: editForm.invoice_number.trim(),
        date: editForm.date,
        customer_name: editForm.customer_name.trim(),
        description: description || null,
        amount: amountNum,
        status: editForm.status,
        due_date: editForm.due_date || null,
        tin: '182-150-770',
        items_json: JSON.stringify(itemsData),
      });
      if (res.success && res.invoice) {
        setInvoices((prev) => prev.map((i) => (i.id === editingInvoice.id ? res.invoice : i)));
        setShowEditModal(false);
        setEditingInvoice(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Invoice updated successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(res.message || 'Failed to update invoice');
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Failed to update invoice.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusClass = (status) => {
    if (status === 'Paid') return 'completed';
    if (status === 'Overdue') return 'overdue';
    if (status === 'Sent') return 'sent';
    return 'pending';
  };

  const getInvoicePrintHtml = (inv) => {
    const dateStr = formatDateInvoice(inv.date);
    const dueStr = inv.due_date ? formatDateInvoice(inv.due_date) : '—';
    const amountNum = parseAmount(inv.amount);
    const amountStr = formatCurrency(inv.amount);
    const trnNo = inv.tin || '182-150-770';
    const invNum = (inv.invoice_number || inv.id || '').toString().replace(/</g, '&lt;');
    const customerName = (inv.customer_name || '—').replace(/</g, '&lt;');

    let items = [];
    if (inv.items_json) {
      try {
        const parsed = JSON.parse(inv.items_json);
        if (Array.isArray(parsed)) items = parsed;
      } catch (_) {}
    }
    const hasItems = items.length > 0;
    const subTotal = hasItems
      ? items.reduce((s, it) => s + (parseFloat(it.wholesale_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
      : amountNum;
    // No VAT / percentage calculation – total is just the subtotal (or saved amount)
    const totalAmount = subTotal;

    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const logoImg = logoSrc ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

    const itemRows = hasItems
      ? items.map((it, i) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.wholesale_price) || 0;
          const amount = rate * qty;
          // Each spare part on its own row; Description first, then Part No.
          return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || '—').replace(/</g, '&lt;')}</td>
            <td>${(it.part_number || '—').replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
        }).join('')
      : `<tr>
          <td class="tc">1</td>
          <td>${(inv.description || '—').replace(/</g, '&lt;')}</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrency(amountNum)}</td>
          <td>PCS</td>
          <td class="tr">${amountStr}</td>
          <td class="tr">${amountStr}</td>
        </tr>`;

    const emptyRowHtml = '';

    const amountInWords = numberToWords(Math.floor(totalAmount)) + ' TZS Only';

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
      ${emptyRowHtml}
      <tr class="total-row total-first total-final">
        <td colspan="7" class="tr" style="font-weight:600;">Total</td>
        <td class="tr">${formatCurrency(totalAmount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>DELIVERY LOCATION :</label> </div>
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated invoice, hence no signature is required.*</p>
</body>
</html>`;
  };

  const handlePrint = (inv) => {
    const win = window.open('', '_blank');
    if (!win) {
      Swal.fire({ icon: 'warning', title: 'Popup blocked', text: 'Please allow popups to print.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    win.document.write(getInvoicePrintHtml(inv));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  const handleDownload = (inv) => {
    const html = getInvoicePrintHtml(inv);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${(inv.invoice_number || inv.id || 'invoice').replace(/[^a-z0-9-_]/gi, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
        <header className="finance-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Invoices</h1>
          </div>
          <div className="header-right">
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
          <section className="invoices-intro">
            <h2 className="invoices-page-title">Invoices</h2>
            <p className="invoices-page-desc">Create and manage invoices for customers.</p>
          </section>

          <div className="stats-grid invoices-stats">
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">This Month</h3>
                <p className="stat-value">TZS {formatCurrency(totalThisMonth)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Paid</h3>
                <p className="stat-value">{paidCount} · TZS {formatCurrency(paidAmount)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Total Invoices</h3>
                <p className="stat-value">{invoices.length}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section invoices-section">
            <div className="section-header">
              <h2>Invoice Records</h2>
              <div className="section-actions">
                <button type="button" className="invoices-add-btn" onClick={openAddModal}>
                  <FaPlus /> Add invoice
                </button>
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    {INVOICE_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    className="filter-select"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                  >
                    <option value="all">All time</option>
                    <option value="month">This month</option>
                    <option value="week">This week</option>
                  </select>
                </div>
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search invoice # or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table invoices-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Description</th>
                    <th>Amount (TZS)</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="invoice-number-cell">{inv.invoice_number}</td>
                        <td>{formatDate(inv.date)}</td>
                        <td>{capitalizeName(inv.customer_name)}</td>
                        <td className="description-cell">{inv.description || '—'}</td>
                        <td className="amount-positive">TZS {formatCurrency(inv.amount)}</td>
                        <td>{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                        <td>
                          <span className={`status-badge ${getStatusClass(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title="View" onClick={() => handleView(inv)}>
                              <FaEye />
                            </button>
                            <button className="action-btn edit" title="Edit" onClick={() => openEditModal(inv)}>
                              <FaEdit />
                            </button>
                            <button className="action-btn print" title="Print" onClick={() => handlePrint(inv)}>
                              <FaPrint />
                            </button>
                            <button className="action-btn download" title="Download" onClick={() => handleDownload(inv)}>
                              <FaDownload />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="invoices-total-card">
              <span className="invoices-total-label">Total (filtered)</span>
              <span className="invoices-total-value">TZS {formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedInvoice && (
        <div className="invoices-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="invoices-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="invoices-modal-header">
              <h3>Invoice Details</h3>
              <button type="button" className="invoices-modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="invoices-modal-body">
              <div className="invoices-view-row">
                <label>Invoice #</label>
                <span>{selectedInvoice.invoice_number}</span>
              </div>
              <div className="invoices-view-row">
                <label>Date</label>
                <span>{formatDate(selectedInvoice.date)}</span>
              </div>
              <div className="invoices-view-row">
                <label>TIN</label>
                <span>{selectedInvoice.tin || '—'}</span>
              </div>
              <div className="invoices-view-row">
                <label>Customer</label>
                <span>{capitalizeName(selectedInvoice.customer_name)}</span>
              </div>
              {selectedInvoice.items_json ? (() => {
                try {
                  const items = JSON.parse(selectedInvoice.items_json);
                  if (Array.isArray(items) && items.length) {
                    return (
                      <div className="invoices-view-row">
                        <label>Items (wholesale)</label>
                        <div>
                          {items.map((it, i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                              {it.part_name}{it.part_number ? ` (${it.part_number})` : ''} × {it.quantity} — TZS {formatCurrency((parseFloat(it.wholesale_price) || 0) * (parseInt(it.quantity, 10) || 1))}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                } catch (_) {}
                return null;
              })() : (
                <div className="invoices-view-row">
                  <label>Description</label>
                  <span>{selectedInvoice.description || '—'}</span>
                </div>
              )}
              <div className="invoices-view-row">
                <label>Amount</label>
                <span className="amount-positive">TZS {formatCurrency(selectedInvoice.amount)}</span>
              </div>
              <div className="invoices-view-row">
                <label>Due Date</label>
                <span>{selectedInvoice.due_date ? formatDate(selectedInvoice.due_date) : '—'}</span>
              </div>
              <div className="invoices-view-row">
                <label>Status</label>
                <span className={`status-badge ${getStatusClass(selectedInvoice.status)}`}>
                  {selectedInvoice.status}
                </span>
              </div>
            </div>
            <div className="invoices-modal-footer">
              <button type="button" className="invoices-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="invoices-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="invoices-modal-content invoices-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoices-modal-header">
              <h3>Add invoice</h3>
              <button type="button" className="invoices-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddInvoice} className="invoices-add-form">
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Invoice details</h4>
                <div className="invoices-form-row">
                  <div className="invoices-form-group">
                    <label htmlFor="add-invoice_number">
                      Invoice number <span className="invoices-required">*</span>
                      <span className="invoices-auto-badge">Auto-generated</span>
                    </label>
                    <input
                      id="add-invoice_number"
                      type="text"
                      value={addForm.invoice_number}
                      readOnly
                      required
                      className="invoices-form-input invoices-form-input-readonly"
                      title="Generated automatically."
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="add-date">Date <span className="invoices-required">*</span></label>
                    <input
                      id="add-date"
                      type="date"
                      value={addForm.date}
                      readOnly
                      className="invoices-form-input invoices-form-input-readonly"
                      title="Current date (auto-set)."
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="add-tin">TIN</label>
                    <input
                      id="add-tin"
                      type="text"
                      value="182-150-770"
                      readOnly
                      className="invoices-form-input invoices-form-input-readonly"
                    />
                  </div>
                </div>
              </section>
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Customer & amount</h4>
                <div className="invoices-form-group">
                  <label htmlFor="add-customer_name">Customer name <span className="invoices-required">*</span></label>
                  <input
                    id="add-customer_name"
                    type="text"
                    value={addForm.customer_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Full name or company"
                    required
                    className="invoices-form-input"
                  />
                </div>
                <div className="invoices-form-group invoices-items-group">
                  <label>Spare parts (wholesale price) <span className="invoices-required">*</span></label>
                  {addForm.items.map((item, idx) => (
                    <div key={idx} className="invoices-item-row">
                      <select
                        value={item.sparepart_id || ''}
                        onChange={(e) => updateAddItem(idx, 'sparepart_id', e.target.value || null)}
                        className="invoices-form-input invoices-item-select"
                      >
                        <option value="">— Select —</option>
                        {spareparts.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.part_name} {sp.part_number ? `(${sp.part_number})` : ''} — TZS {formatCurrency(sp.wholesale_price)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateAddItem(idx, 'quantity', e.target.value)}
                        className="invoices-form-input invoices-item-qty"
                        placeholder="Qty"
                      />
                      <span className="invoices-item-line-total">
                        TZS {formatCurrency((getWholesalePrice(getSparepartById(item.sparepart_id)) || 0) * (parseInt(item.quantity, 10) || 0))}
                      </span>
                      <button type="button" className="invoices-remove-row" onClick={() => removeItemRow('add', idx)} title="Remove">
                        <FaMinus />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="invoices-add-row" onClick={() => addItemRow('add')}>
                    <FaPlus /> Add spare part
                  </button>
                  <div className="invoices-total-row">
                    <strong>Total (TZS):</strong> <span>{formatCurrency(computeItemsTotal(addForm.items))}</span>
                  </div>
                </div>
              </section>
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Due date & status</h4>
                <div className="invoices-form-row">
                  <div className="invoices-form-group">
                    <label htmlFor="add-due_date">Due date</label>
                    <input
                      id="add-due_date"
                      type="date"
                      value={addForm.due_date}
                      onChange={(e) => setAddForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="invoices-form-input"
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="add-status">Status</label>
                    <select
                      id="add-status"
                      value={addForm.status}
                      onChange={(e) => setAddForm((f) => ({ ...f, status: e.target.value }))}
                      className="invoices-form-input"
                    >
                      {INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <div className="invoices-modal-footer">
                <button type="button" className="invoices-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="invoices-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingInvoice && (
        <div className="invoices-modal-overlay" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>
          <div className="invoices-modal-content invoices-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoices-modal-header">
              <h3>Edit invoice</h3>
              <button type="button" className="invoices-modal-close" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>×</button>
            </div>
            <form onSubmit={handleEditInvoice} className="invoices-add-form">
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Invoice details</h4>
                <div className="invoices-form-row">
                  <div className="invoices-form-group">
                    <label htmlFor="edit-invoice_number">Invoice number <span className="invoices-required">*</span></label>
                    <input
                      id="edit-invoice_number"
                      type="text"
                      value={editForm.invoice_number}
                      readOnly
                      required
                      className="invoices-form-input invoices-form-input-readonly"
                      title="Invoice number cannot be changed."
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="edit-date">Date <span className="invoices-required">*</span></label>
                    <input
                      id="edit-date"
                      type="date"
                      value={editForm.date}
                      readOnly
                      className="invoices-form-input invoices-form-input-readonly"
                      title="Invoice date cannot be changed."
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="edit-tin">TIN</label>
                    <input
                      id="edit-tin"
                      type="text"
                      value="182-150-770"
                      readOnly
                      className="invoices-form-input invoices-form-input-readonly"
                    />
                  </div>
                </div>
              </section>
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Customer & amount</h4>
                <div className="invoices-form-group">
                  <label htmlFor="edit-customer_name">Customer name <span className="invoices-required">*</span></label>
                  <input
                    id="edit-customer_name"
                    type="text"
                    value={editForm.customer_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, customer_name: e.target.value }))}
                    placeholder="Full name or company"
                    required
                    className="invoices-form-input"
                  />
                </div>
                <div className="invoices-form-group invoices-items-group">
                  <label>Spare parts (wholesale price) <span className="invoices-required">*</span></label>
                  {editForm.items.map((item, idx) => (
                    <div key={idx} className="invoices-item-row">
                      <select
                        value={item.sparepart_id || ''}
                        onChange={(e) => updateEditItem(idx, 'sparepart_id', e.target.value || null)}
                        className="invoices-form-input invoices-item-select"
                      >
                        <option value="">— Select —</option>
                        {spareparts.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.part_name} {sp.part_number ? `(${sp.part_number})` : ''} — TZS {formatCurrency(sp.wholesale_price)}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateEditItem(idx, 'quantity', e.target.value)}
                        className="invoices-form-input invoices-item-qty"
                        placeholder="Qty"
                      />
                      <span className="invoices-item-line-total">
                        TZS {formatCurrency((getWholesalePrice(getSparepartById(item.sparepart_id)) || 0) * (parseInt(item.quantity, 10) || 0))}
                      </span>
                      <button type="button" className="invoices-remove-row" onClick={() => removeItemRow('edit', idx)} title="Remove">
                        <FaMinus />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="invoices-add-row" onClick={() => addItemRow('edit')}>
                    <FaPlus /> Add spare part
                  </button>
                  <div className="invoices-total-row">
                    <strong>Total (TZS):</strong> <span>{formatCurrency(computeItemsTotal(editForm.items))}</span>
                  </div>
                </div>
              </section>
              <section className="invoices-form-section">
                <h4 className="invoices-form-section-title">Due date & status</h4>
                <div className="invoices-form-row">
                  <div className="invoices-form-group">
                    <label htmlFor="edit-due_date">Due date</label>
                    <input
                      id="edit-due_date"
                      type="date"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="invoices-form-input"
                    />
                  </div>
                  <div className="invoices-form-group">
                    <label htmlFor="edit-status">Status</label>
                    <select
                      id="edit-status"
                      value={editForm.status}
                      onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                      className="invoices-form-input"
                    >
                      {INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
              <div className="invoices-modal-footer">
                <button type="button" className="invoices-modal-btn secondary" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>
                  Cancel
                </button>
                <button type="submit" className="invoices-modal-btn primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantInvoices;
