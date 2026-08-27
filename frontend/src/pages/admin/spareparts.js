import React, { useState, useEffect } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader, MiniLoader } from '../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaTag,
  FaTags,
  FaWarehouse,
  FaMoneyBillWave,
  FaBarcode,
  FaLayerGroup,
  FaIndustry,
  FaCalendarAlt,
  FaBell,
  FaDownload,
  FaPrint
} from 'react-icons/fa';
import './spareparts.css';
import logo from '../../images/logo.png';
import { getCategories, getBrands, addSparePart, getSpareParts, updateSparePart, deleteSparePart } from '../../services/api';
import { getCurrentDateTime, formatDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function SpareParts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showSoldoutTodayOnly, setShowSoldoutTodayOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  /** Current stock when opening edit; form quantity is the amount to add. */
  const [editAvailableQuantity, setEditAvailableQuantity] = useState(null);
  const [addingPart, setAddingPart] = useState(false);
  const [updatingPart, setUpdatingPart] = useState(false);
  const [spareParts, setSpareParts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    category: '',
    brand: '',
    quantity: '',
    wholesalePrice: '',
    retailPrice: '',
    status: 'In Stock',
    location: '',
    supplier: 'Mamuya Auto Spare Parts'
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Function to fetch categories from database
  const fetchCategories = async () => {
    try {
      console.log('📥 Fetching categories from database...');
      const response = await getCategories();
      
      if (response && response.success && response.categories) {
        // Store categories with both id and name, sorted alphabetically (A–Z)
        const sortedCategories = [...response.categories].sort((a, b) =>
          String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase())
        );
        setCategories(sortedCategories);
        console.log(`✅ Loaded ${response.categories.length} categories from database`);
      } else {
        setCategories([]);
        console.warn('⚠️ No categories found or invalid response');
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load categories from database.',
        confirmButtonColor: '#1a3a5f'
      });
      setCategories([]);
    }
  };

  // Function to fetch brands from database
  const fetchBrands = async () => {
    try {
      console.log('📥 Fetching brands from database...');
      const response = await getBrands();
      
      if (response && response.success && response.brands) {
        // Store brands with both id and name, sorted alphabetically (A–Z)
        const sortedBrands = [...response.brands].sort((a, b) =>
          String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase())
        );
        setBrands(sortedBrands);
        console.log(`✅ Loaded ${response.brands.length} brands from database`);
      } else {
        setBrands([]);
        console.warn('⚠️ No brands found or invalid response');
      }
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load brands from database.',
        confirmButtonColor: '#1a3a5f'
  });
      setBrands([]);
    }
  };

  // Function to fetch spare parts from database
  const fetchSpareParts = async () => {
    try {
      console.log('📥 Fetching spare parts from database...');
      const response = await getSpareParts();
      
      if (response && response.success && response.spareParts) {
        // Map database data to component format
        const mappedParts = response.spareParts.map(part => ({
          id: part.id,
          partName: part.part_name,
          partNumber: part.part_number,
          category: part.category_name || 'Unknown',
          categoryId: part.category_id,
          brand: part.brand_name || 'Unknown',
          brandId: part.brand_id,
          quantityAdded: Number(part.quantity_added) || 0,
          soldoutQuantity: Number(part.soldout_quantity) || 0,
          quantity: part.quantity,
          wholesale_price: (part.wholesale_price ?? part.wholesalePrice) != null ? Number(part.wholesale_price ?? part.wholesalePrice) : null,
          retail_price: (part.retail_price ?? part.retailPrice) != null ? Number(part.retail_price ?? part.retailPrice) : null,
          status: part.status,
          location: part.location,
          supplier: part.supplier,
          dateAdded: part.date_added,
          createdAt: part.created_at,
          updatedAt: part.updated_at
        }));
        setSpareParts(mappedParts);
        console.log(`Loaded ${mappedParts.length} spare parts from database`);
      } else {
        setSpareParts([]);
        console.warn('No spare parts found or invalid response');
      }
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      console.error('Error details:', error.message);
      // Show error only if it's not a table doesn't exist error
      if (error.message && !error.message.includes('doesn\'t exist')) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load spare parts from database.',
          confirmButtonColor: '#1a3a5f'
        });
      }
      setSpareParts([]);
    }
  };

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
    // Fetch categories, brands, and spare parts from database
    fetchCategories();
    fetchBrands();
    fetchSpareParts();

    // Initialize and update current date/time every second
    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Listen for date format changes
    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
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

  // Function to capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const highlightSearchText = (value) => {
    const text = String(value ?? '');
    const term = String(searchTerm || '').trim();
    if (!term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    const termLower = term.toLowerCase();
    return text.split(regex).map((part, idx) =>
      part.toLowerCase() === termLower ? (
        <span key={`sp-hl-${idx}`} style={{ color: '#dc3545', fontWeight: 700 }}>
          {part}
        </span>
      ) : (
        <React.Fragment key={`sp-hl-${idx}`}>{part}</React.Fragment>
      )
    );
  };

  // Format number with commas
  const formatNumberWithCommas = (value) => {
    if (!value) return '';
    // Remove all non-digit characters
    const numericValue = value.toString().replace(/\D/g, '');
    if (!numericValue) return '';
    // Add commas every three digits from right
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse formatted number back to numeric value
  const parseFormattedNumber = (value) => {
    if (!value) return '';
    // Remove commas and return numeric string
    return value.toString().replace(/,/g, '');
  };

  const handleWholesalePriceChange = (e) => {
    setFormData({ ...formData, wholesalePrice: formatNumberWithCommas(e.target.value) });
  };

  const handleRetailPriceChange = (e) => {
    setFormData({ ...formData, retailPrice: formatNumberWithCommas(e.target.value) });
  };

  // Quantity: text input that stores numbers only
  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, quantity: value });
  };

  // Handle part name change with capitalization
  const handlePartNameChange = (e) => {
    const value = e.target.value;
    const capitalized = capitalizeName(value);
    setFormData({ ...formData, partName: capitalized });
  };

  const emptyFormState = () => ({
    partName: '',
    partNumber: '',
    category: '',
    brand: '',
    quantity: '',
    wholesalePrice: '',
    retailPrice: '',
    status: 'In Stock',
    location: '',
    supplier: 'Mamuya Auto Spare Parts',
  });

  const openAddSpareModal = () => {
    setEditingPart(null);
    setEditAvailableQuantity(null);
    setFormData(emptyFormState());
    setShowAddModal(true);
  };

  const closeAddSpareModal = () => {
    setShowAddModal(false);
    setEditingPart(null);
    setEditAvailableQuantity(null);
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    setAddingPart(true);
    
    try {
      const needsQuantity = !editingPart;
      // Validation
      if (
        !formData.partName ||
        !formData.partNumber ||
        !formData.category ||
        !formData.brand ||
        (needsQuantity && !formData.quantity) ||
        !formData.wholesalePrice ||
        !formData.retailPrice ||
        !formData.location
      ) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please fill in all required fields (including wholesale and retail price).',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }

      const wholesaleVal = parseFloat(parseFormattedNumber(formData.wholesalePrice)) || 0;
      const retailVal = parseFloat(parseFormattedNumber(formData.retailPrice)) || 0;
      if (wholesaleVal < 0 || retailVal < 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Wholesale and retail price must be 0 or greater.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }
      
      // Find category and brand IDs by name
      const selectedCategory = categories.find(cat => cat.name === formData.category);
      const selectedBrand = brands.find(brand => brand.name === formData.brand);
      
      if (!selectedCategory || !selectedBrand) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please select valid category and brand.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }
      
      const baseStock = editingPart ? Number(editAvailableQuantity) || 0 : 0;
      const qtyRaw = String(formData.quantity ?? '').trim();
      let qty;
      if (editingPart) {
        const addPart = qtyRaw === '' ? 0 : parseInt(qtyRaw, 10);
        if (qtyRaw !== '' && (Number.isNaN(addPart) || addPart < 0)) {
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Quantity to add must be a valid number (≥ 0), or leave blank to keep stock unchanged.',
            confirmButtonColor: '#1a3a5f',
          });
          setAddingPart(false);
          return;
        }
        qty = baseStock + addPart;
      } else {
        qty = parseInt(formData.quantity, 10);
        if (Number.isNaN(qty) || qty < 0) {
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Quantity must be a valid number (≥ 0).',
            confirmButtonColor: '#1a3a5f',
          });
          setAddingPart(false);
          return;
        }
      }
      // New part: set quantity_added with initial stock. Edit: full update sends new total quantity (available + add).
      const sparePartData = {
        part_name: formData.partName.trim(),
        part_number: formData.partNumber.trim(),
        category_id: selectedCategory.id,
        brand_id: selectedBrand.id,
        quantity: qty,
        wholesale_price: wholesaleVal,
        retail_price: retailVal,
        status: formData.status,
        location: formData.location.trim(),
        supplier: formData.supplier || 'Mamuya Auto Spare Parts'
      };
      if (!editingPart) {
        sparePartData.quantity_added = qty;
      }
      
      console.log('Sending spare part data to API:', sparePartData);
      
      // Add or update spare part
      const response = editingPart
        ? await updateSparePart(editingPart.id, sparePartData)
        : await addSparePart(sparePartData);
      
      console.log('API Response:', response);
      
      if (response && response.success) {
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: editingPart ? 'Spare part updated successfully.' : 'Spare part added successfully.',
        confirmButtonColor: '#1a3a5f',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Reset form
      setFormData(emptyFormState());
      closeAddSpareModal();
        
        // Refresh spare parts list from database
        fetchSpareParts();
      } else {
        throw new Error(response.message || 'Failed to add spare part');
      }
    } catch (error) {
      console.error('Error adding spare part:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add spare part. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setAddingPart(false);
    }
  };

  const handleView = (part) => {
    setSelectedPart(part);
    setShowViewModal(true);
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setEditAvailableQuantity(Number(part.quantity) || 0);
    setFormData({
      partName: part.partName || '',
      partNumber: part.partNumber || '',
      category: part.category || '',
      brand: part.brand || '',
      quantity: '',
      wholesalePrice: formatNumberWithCommas(part.wholesale_price ?? ''),
      retailPrice: formatNumberWithCommas(part.retail_price ?? ''),
      status: part.status || 'In Stock',
      location: part.location || '',
      supplier: part.supplier || 'Mamuya Auto Spare Parts'
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    const part = spareParts.find(p => p.id === id);
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${part?.partName || 'this spare part'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        // Call API to delete spare part from database
        const response = await deleteSparePart(id);
        
        if (response && response.success) {
          // Refresh spare parts list from database
          await fetchSpareParts();
          
          Swal.fire({
            title: 'Deleted!',
            text: 'Spare part has been deleted successfully.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            confirmButtonColor: '#1a3a5f'
          });
        } else {
          throw new Error(response?.message || 'Failed to delete spare part');
        }
      } catch (error) {
        console.error('Error deleting spare part:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete spare part. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  const filteredParts = spareParts.filter((part) => {
    const matchesSearch =
      part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.brand.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLowStock = !showLowStockOnly || (Number(part.quantity) || 0) < 10;
    const partUpdatedDate = part.updatedAt ? new Date(part.updatedAt) : null;
    const now = new Date();
    const isSoldoutToday =
      Number(part.soldoutQuantity) > 0 &&
      partUpdatedDate &&
      !Number.isNaN(partUpdatedDate.getTime()) &&
      partUpdatedDate.getFullYear() === now.getFullYear() &&
      partUpdatedDate.getMonth() === now.getMonth() &&
      partUpdatedDate.getDate() === now.getDate();
    const matchesSoldoutToday = !showSoldoutTodayOnly || isSoldoutToday;
    return matchesSearch && matchesLowStock && matchesSoldoutToday;
  });

  const sortedFilteredParts = [...filteredParts].sort((a, b) =>
    String(a.partName || '').toLowerCase().localeCompare(String(b.partName || '').toLowerCase())
  );

  const getStockMeta = (qtyValue) => {
    const qty = Number(qtyValue) || 0;
    if (qty < 10) return { status: 'Low Stock', className: 'qty-low' };
    if (qty <= 100) return { status: 'In Stock', className: 'qty-medium' };
    return { status: 'In Stock', className: 'qty-high' };
  };

  const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];

  const buildManagerStyleInventoryDocument = () => {
    const safe = (v) => String(v ?? '').replace(/</g, '&lt;');
    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath))
      : window.location.origin + '/logo192.png';
    const printedAt = new Date().toLocaleString('en-GB');
    const printedBy = safe(user?.full_name || user?.username || 'Admin');
    const categoryLabel = 'All categories';
    const scopeLabel = showSoldoutTodayOnly
      ? 'Soldout today only'
      : (showLowStockOnly ? 'Low stock only' : 'All stock');
    const rowsHtml =
      sortedFilteredParts.length === 0
        ? `<tr><td colspan="7" class="no-data">No spare parts found</td></tr>`
        : sortedFilteredParts
            .map((part, idx) => {
              const qty = Number(part.quantity) || 0;
              const isLow = qty < 10;
              const qtyAdded = Number(part.quantityAdded) || 0;
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${safe(capitalizeName(part.partName || '—'))}</td>
                  <td class="tl">${safe(String(part.partNumber || '—').toUpperCase())}</td>
                  <td class="tl">${safe(capitalizeName(part.category || '—'))}</td>
                  <td class="tl">${safe(String(part.brand || '—').toUpperCase())}</td>
                  <td class="tr">${qtyAdded}</td>
                  <td class="tr ${isLow ? 'qty-low' : ''}">${qty}</td>
                </tr>
              `;
            })
            .join('');
    return `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Spare Parts Inventory - Mamuya Auto Spare Parts</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 980px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #333; gap: 16px; }
            .left { display: flex; gap: 16px; align-items: flex-start; flex: 1; }
            .logo { max-height: 56px; max-width: 140px; object-fit: contain; }
            .company h2 { margin: 0 0 6px 0; font-size: 1.15rem; font-weight: 800; }
            .company p { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
            .meta { text-align: right; min-width: 220px; }
            .meta p { margin: 0 0 6px 0; font-size: 11px; }
            .title { text-align: center; font-size: 1.6rem; font-weight: 800; margin: 18px 0 14px; letter-spacing: 0.05em; }
            .subtitle { text-align: center; margin: 0 0 18px; color: #444; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; border: 1px solid #333; font-size: 10px; }
            th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
            th { background: #f0f0f0; font-weight: 700; text-align: center; }
            .tc { text-align: center; }
            .tr { text-align: right; }
            .tl { text-align: left; }
            .no-data { text-align: center; padding: 18px; color: #6c757d; }
            .qty-low { color: #dc3545; font-weight: 700; }
            .footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid #ccc; font-size: 11px; }
            .footer-row { margin-bottom: 10px; }
            .footer-row label { display: inline-block; min-width: 220px; font-weight: 700; }
            @media print { body { padding: 16px; } .logo { max-height: 48px; } }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="left">
              <img src="${safe(logoUrl)}" alt="Logo" class="logo" />
              <div class="company">
                <h2>Mamuya Auto Spare Parts</h2>
                <p>Kilimanjaro, Tanzania<br />Phone: +255 22 123 4567</p>
              </div>
            </div>
            <div class="meta">
              <p><strong>Report:</strong> Spare Parts Inventory</p>
              <p><strong>Category:</strong> ${safe(categoryLabel)}</p>
              <p><strong>Scope:</strong> ${safe(scopeLabel)}</p>
              <p><strong>Printed:</strong> ${safe(printedAt)}</p>
              <p><strong>Printed by:</strong> ${printedBy}</p>
            </div>
          </div>
          <h1 class="title">INVENTORY REPORT</h1>
          <p class="subtitle">Showing ${sortedFilteredParts.length} item(s)</p>
          <table>
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Part name</th>
                <th class="tl">Part number</th>
                <th class="tl">Category</th>
                <th class="tl">Brand</th>
                <th class="tr">Quantity added</th>
                <th class="tr">Quantity</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="footer">
            <div class="footer-row"><label>Total items shown:</label> ${sortedFilteredParts.length}</div>
          </div>
        </body>
      </html>`;
  };

  const handleDownloadCsv = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const printedAt = new Date().toLocaleString('en-GB');
    const printedBy = capitalizeName(user?.full_name || user?.username || 'Admin');
    const scopeLabel = showSoldoutTodayOnly
      ? 'Soldout today only'
      : (showLowStockOnly ? 'Low stock only' : 'All stock');
    const safeLogoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';

    const getLogoDataUrl = async () => {
      if (!safeLogoPath) return null;
      try {
        const src = safeLogoPath.startsWith('http')
          ? safeLogoPath
          : window.location.origin + (safeLogoPath.startsWith('/') ? safeLogoPath : '/' + safeLogoPath);
        const res = await fetch(src);
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        return dataUrl;
      } catch {
        return null;
      }
    };

    const logoDataUrl = await getLogoDataUrl();

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 44, 24, 90, 40);
      } catch {
        // ignore image rendering errors and continue without logo
      }
    }

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Mamuya Auto Spare Parts', 150, 38);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Kilimanjaro, Tanzania', 150, 54);
    doc.text('Phone: +255 22 123 4567', 150, 68);

    doc.setFontSize(10);
    doc.text(`Report: Spare Parts Inventory`, 560, 34);
    doc.text(`Category: All categories`, 560, 49);
    doc.text(`Scope: ${scopeLabel}`, 560, 64);
    doc.text(`Printed: ${printedAt}`, 560, 79);
    doc.text(`Printed by: ${printedBy}`, 560, 94);

    doc.setDrawColor(51, 51, 51);
    doc.setLineWidth(1.5);
    doc.line(40, 108, 802, 108);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('INVENTORY REPORT', 421, 138, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Showing ${sortedFilteredParts.length} item(s)`, 421, 154, { align: 'center' });

    const bodyRows = sortedFilteredParts.map((part, idx) => [
      idx + 1,
      capitalizeName(part.partName || '—'),
      String(part.partNumber || '—').toUpperCase(),
      capitalizeName(part.category || '—'),
      String(part.brand || '—').toUpperCase(),
      Number(part.quantityAdded) || 0,
      Number(part.quantity) || 0
    ]);

    autoTable(doc, {
      startY: 166,
      head: [['S.No', 'Part name', 'Part number', 'Category', 'Brand', 'Quantity added', 'Quantity']],
      body: bodyRows.length ? bodyRows : [['', 'No spare parts found', '', '', '', '', '']],
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [20, 20, 20], halign: 'center', fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 5, textColor: [34, 34, 34] },
      columnStyles: { 0: { halign: 'center', cellWidth: 42 }, 5: { halign: 'right', cellWidth: 56 }, 6: { halign: 'right', cellWidth: 56 } },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const qty = Number(data.cell.raw) || 0;
          if (qty < 10) {
            data.cell.styles.textColor = [220, 53, 69];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    const endY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 220;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(40, endY - 10, 802, endY - 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total items shown: ${sortedFilteredParts.length}`, 40, endY);
    doc.save(`inventory_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handlePrintTable = () => {
    const w = window.open('', '_blank', 'width=1100,height=750');
    if (!w) return;
    w.document.write(buildManagerStyleInventoryDocument());
    w.document.close();
    w.focus();
    w.print();
  };

  // Format currency (handles values from DB: number, string, null, undefined)
  const formatCurrency = (amount) => {
    const num = amount == null || amount === '' ? 0 : Number(amount);
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(Number.isNaN(num) ? 0 : num);
  };

  // Prepare chart data for stock quantities (show all parts, limit to top 10 for readability)
  const partsForChart = spareParts.slice(0, 10);
  const quantities = partsForChart.map(part => part.quantity);
  const maxQuantity = Math.max(...quantities, 1); // Ensure at least 1 to avoid division by zero
  
  // Function to get color based on percentage of maximum value
  const getPercentageColor = (value, max) => {
    if (max === 0) return { bg: 'rgba(108, 117, 125, 0.8)', border: 'rgba(108, 117, 125, 1)' }; // Gray for zero
    
    const percentage = (value / max) * 100;
    
    // Green for high values (70-100%)
    if (percentage >= 70) {
      return { bg: 'rgba(40, 167, 69, 0.8)', border: 'rgba(40, 167, 69, 1)' }; // Green
    }
    // Yellow/Orange for medium values (30-69%)
    else if (percentage >= 30) {
      return { bg: 'rgba(255, 193, 7, 0.8)', border: 'rgba(255, 193, 7, 1)' }; // Orange/Yellow
    }
    // Red for low values (0-29%)
    else {
      return { bg: 'rgba(220, 53, 69, 0.8)', border: 'rgba(220, 53, 69, 1)' }; // Red
    }
  };
  
  const chartLabel = t.stockQuantity ?? 'Stock Quantity';
  const chartTitle = t.stockQuantityByPart ?? 'Stock Quantity by Part';

  const chartData = {
    labels: partsForChart.map(part => capitalizeName(part.partName)),
    datasets: [
      {
        label: chartLabel,
        data: quantities,
        backgroundColor: quantities.map(qty => getPercentageColor(qty, maxQuantity).bg),
        borderColor: quantities.map(qty => getPercentageColor(qty, maxQuantity).border),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartTitle,
        font: {
          size: 18,
          weight: 'bold'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        },
      },
    },
  };

  return (
    <div className="spareparts-container">
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
          <Link to="/admin/spareparts" className="nav-item active">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item">
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
        <header className="spareparts-header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.spareParts}</h1>
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

        {/* Spare Parts Content */}
        <div className="spareparts-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${t.spareParts.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button
              type="button"
              className="add-btn"
              onClick={() => setShowLowStockOnly((v) => !v)}
              style={{
                background: showLowStockOnly
                  ? 'linear-gradient(135deg, #dc3545, #b02a37)'
                  : 'linear-gradient(135deg, #6c757d, #495057)'
              }}
            >
              {showLowStockOnly ? 'Show All' : 'Low Stock'}
            </button>
            <button
              type="button"
              className="add-btn"
              onClick={() => setShowSoldoutTodayOnly((v) => !v)}
              style={{
                background: showSoldoutTodayOnly
                  ? 'linear-gradient(135deg, #0d6efd, #0b5ed7)'
                  : 'linear-gradient(135deg, #6c757d, #495057)'
              }}
            >
              {showSoldoutTodayOnly ? 'Show All' : 'Soldout Today'}
            </button>
            <button type="button" className="add-btn" onClick={handleDownloadCsv}>
              <FaDownload /> Download
            </button>
            <button type="button" className="add-btn" onClick={handlePrintTable}>
              <FaPrint /> Print
            </button>
            <button className="add-btn" onClick={openAddSpareModal}>
              <FaPlus /> {t.addSparePart}
            </button>
          </div>

          {/* Stock Chart */}
          {spareParts.length > 0 && (
            <div className="chart-container">
              <div className="chart-card">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Spare Parts Table */}
          <div className="table-container">
            <table className="spareparts-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>S.No</th>
                  <th>{t.partName}</th>
                  <th>{t.partNumber}</th>
                  <th>{t.category}</th>
                  <th>{t.brand}</th>
                  <th>Quantity Added</th>
                  <th>{t.quantity}</th>
                  <th>Soldout Quantity</th>
                  <th>{t.wholesalePrice}</th>
                  <th>{t.retailPrice}</th>
                  <th>{t.status}</th>
                  <th>{t.location}</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredParts.length === 0 ? (
                  <tr>
                    <td colSpan="13" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  sortedFilteredParts.map((part, index) => {
                    const stockMeta = getStockMeta(part.quantity);
                    const displayStatus =
                      String(part.status || '').trim().toLowerCase() === 'discontinued'
                        ? 'Discontinued'
                        : String(part.status || '').trim().toLowerCase() === 'out of stock'
                        ? 'Out of Stock'
                        : stockMeta.status;
                    return (
                    <tr key={part.id}>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view" 
                            title={t.view}
                            onClick={() => handleView(part)}
                          >
                            <FaEye className="action-icon" />
                            <span className="action-text">{t.view}</span>
                          </button>
                          <button 
                            className="action-btn edit" 
                            title={t.edit}
                            onClick={() => handleEdit(part)}
                          >
                            <FaEdit className="action-icon" />
                            <span className="action-text">{t.edit}</span>
                          </button>
                          <button 
                            className="action-btn delete" 
                            title={t.delete} 
                            onClick={() => handleDelete(part.id)}
                          >
                            <FaTrash className="action-icon" />
                            <span className="action-text">{t.delete}</span>
                          </button>
                        </div>
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        <div className="part-name">
                          <FaTag className="name-icon" />
                          {highlightSearchText(capitalizeName(part.partName))}
                        </div>
                      </td>
                      <td>
                        <div className="part-number">
                          <FaBarcode className="number-icon" />
                          {highlightSearchText((part.partNumber || '').toUpperCase())}
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">
                          <FaLayerGroup className="category-icon" />
                          {highlightSearchText(capitalizeName(part.category))}
                        </span>
                      </td>
                      <td>
                        <div className="brand-name">
                          <FaIndustry className="brand-icon" />
                          {highlightSearchText(capitalizeName(part.brand))}
                        </div>
                      </td>
                      <td className="quantity-added-value">{part.quantityAdded}</td>
                      <td>
                        <span className={`quantity-badge ${stockMeta.className}`}>
                          {part.quantity}
                        </span>
                      </td>
                      <td>{part.soldoutQuantity}</td>
                      <td>{formatCurrency(part.wholesale_price)}</td>
                      <td>{formatCurrency(part.retail_price)}</td>
                      <td>
                        <span className={`status-badge ${displayStatus.toLowerCase().replace(' ', '-')}`}>
                          {highlightSearchText(displayStatus)}
                        </span>
                      </td>
                      <td>{highlightSearchText(capitalizeName(part.location))}</td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Spare Part Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddSpareModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? 'Edit spare part' : t.addSparePart}</h2>
              <button className="close-btn" onClick={closeAddSpareModal}>×</button>
            </div>
              <form onSubmit={handleAddPart} className="sparepart-form">
              <div className="form-group">
                <label>{t.partName} *</label>
                <input
                  type="text"
                  required
                  value={formData.partName}
                  onChange={handlePartNameChange}
                  placeholder={t.partName}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.partNumber} *</label>
                  <input
                    type="text"
                    required
                    value={formData.partNumber}
                    onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
                    placeholder={t.partNumber}
                  />
                </div>
                <div className="form-group">
                  <label>{t.category} *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">{t.category}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{capitalizeName(cat.name)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.brand} *</label>
                  <select
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  >
                    <option value="">{t.brand}</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.name}>{capitalizeName(brand.name)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t.status} *</label>
                  <input
                    type="text"
                    readOnly
                    value={t.inStock}
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              {editingPart && (
                <div className="form-group">
                  <label>{t.availableQuantity || 'Available quantity'}</label>
                  <input
                    type="text"
                    readOnly
                    value={editAvailableQuantity ?? ''}
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
              )}
              <div className="form-group">
                <label>
                  {editingPart ? t.addToStock || 'Quantity to add' : `${t.quantity} *`}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required={!editingPart}
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  placeholder={editingPart ? (t.optionalAddStock || '0 = no change') : t.quantity}
                />
                {editingPart && (
                  <small style={{ display: 'block', marginTop: 6, opacity: 0.85 }}>
                    {t.addStockHint || 'Leave empty or 0 to keep current stock. Enter an amount to add to available quantity.'}
                  </small>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Wholesale price (TZS) *</label>
                  <input
                    type="text"
                    required
                    value={formData.wholesalePrice}
                    onChange={handleWholesalePriceChange}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Retail price (TZS) *</label>
                  <input
                    type="text"
                    required
                    value={formData.retailPrice}
                    onChange={handleRetailPriceChange}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.location} *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder={t.location}
                />
              </div>
              <div className="form-group">
                <label>{t.supplier}</label>
                <input
                  type="text"
                  value={formData.supplier}
                  readOnly
                  placeholder={t.supplier}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeAddSpareModal} disabled={addingPart}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn" disabled={addingPart}>
                  {addingPart ? t.loading : (editingPart ? (t.edit || 'Update') : t.addSparePart)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Spare Part Modal */}
      {showViewModal && selectedPart && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Spare Part Details</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>Part Name:</label>
                  <div className="view-value">
                    <FaTag className="view-icon" />
                    {capitalizeName(selectedPart.partName)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Part Number:</label>
                  <div className="view-value">
                    <FaBarcode className="view-icon" />
                    {(selectedPart.partNumber || '').toUpperCase()}
                  </div>
                </div>
                <div className="view-item">
                  <label>Category:</label>
                  <div className="view-value">
                    <FaLayerGroup className="view-icon" />
                    <span className="category-badge">{capitalizeName(selectedPart.category)}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Brand:</label>
                  <div className="view-value">
                    <FaIndustry className="view-icon" />
                    {capitalizeName(selectedPart.brand)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Quantity:</label>
                  <div className="view-value">{selectedPart.quantity}</div>
                </div>
                <div className="view-item">
                  <label>{t.wholesalePrice}</label>
                  <div className="view-value">{formatCurrency(selectedPart.wholesale_price)}</div>
                </div>
                <div className="view-item">
                  <label>{t.retailPrice}</label>
                  <div className="view-value">{formatCurrency(selectedPart.retail_price)}</div>
                </div>
                <div className="view-item">
                  <label>Status:</label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPart.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedPart.status}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Location:</label>
                  <div className="view-value">{capitalizeName(selectedPart.location)}</div>
                </div>
                {selectedPart.supplier && (
                  <div className="view-item">
                    <label>Supplier:</label>
                    <div className="view-value">{selectedPart.supplier}</div>
                  </div>
                )}
                <div className="view-item">
                  <label>Date Added:</label>
                  <div className="view-value">{formatDateTime(selectedPart.createdAt || selectedPart.dateAdded) || '—'}</div>
                </div>
              </div>
            </div>
            <div className="form-actions">
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

export default SpareParts;
