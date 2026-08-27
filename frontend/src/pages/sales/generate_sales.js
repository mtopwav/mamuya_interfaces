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
  FaCreditCard,
  FaFileInvoice,
  FaInfoCircle,
  FaSearch,
  FaTimes,
  FaPlus,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './dashboard.css';
import logo from '../../images/logo.png';
import { getCustomers, getSpareParts, createPayment } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function GenerateSales() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const [customers, setCustomers] = useState([]);
  const [spareParts, setSpareParts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedParts, setSelectedParts] = useState([]); // Array of { partId, part, quantity }
  const [partSearchInput, setPartSearchInput] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [letters, setLetters] = useState('');
  const [priceType, setPriceType] = useState('retail'); // 'wholesale' | 'retail'
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
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
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [customersRes, sparePartsRes] = await Promise.all([
          getCustomers(),
          getSpareParts()
        ]);

        if (customersRes.success && customersRes.customers) {
          const formattedCustomers = customersRes.customers.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            created_at: c.created_at || c.registeredDate || c.registered_date
          }))
          // Sort by date - most recent first
          .sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA; // Descending order (newest first)
          });
          setCustomers(formattedCustomers);
        }

        if (sparePartsRes.success && sparePartsRes.spareParts) {
          const formattedParts = sparePartsRes.spareParts.map(p => ({
            id: p.id,
            name: p.part_name,
            partNumber: p.part_number,
            brand: p.brand_name || 'Unknown',
            wholesale_price: p.wholesale_price != null ? Number(p.wholesale_price) : null,
            retail_price: p.retail_price != null ? Number(p.retail_price) : null,
            unitPrice: p.retail_price,
            status: p.status,
            stockQuantity: p.quantity != null ? Number(p.quantity) : 0
          }));
          setSpareParts(formattedParts);
        }
      } catch (error) {
        console.error('Error loading data for sales generation:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load customers or spare parts. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadData();

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
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
      if (!event.target.closest('.part-search-container')) {
        setShowPartDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) {
    return null;
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

  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));
  const customerPhone = selectedCustomer?.phone || '';

  // Filter customers based on search input
  // If no search input, show recently added customers (already sorted by date)
  // If search input exists, filter by name or phone
  const filteredCustomers = customerSearchInput.trim() 
    ? customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchInput.toLowerCase()) ||
        customer.phone.includes(customerSearchInput)
      )
    : customers; // Show all customers (already sorted by most recent first)

  // Handle customer search input change
  const handleCustomerSearchChange = (e) => {
    const value = e.target.value;
    setCustomerSearchInput(value);
    setShowCustomerDropdown(true);
    if (!value) {
      setSelectedCustomerId('');
    }
  };

  // Handle customer field focus - show recently added customers
  const handleCustomerFieldFocus = () => {
    setShowCustomerDropdown(true);
  };

  // Handle customer selection from dropdown
  const handleCustomerSelect = (customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchInput(capitalizeName(customer.name));
    setShowCustomerDropdown(false);
  };

  // Filter spare parts based on search input (exclude already selected parts)
  const filteredParts = spareParts.filter(part => {
    const isNotSelected = !selectedParts.find(sp => String(sp.partId) === String(part.id));
    const searchLower = partSearchInput.toLowerCase();
    const matchesSearch = part.name.toLowerCase().includes(searchLower) ||
      part.partNumber.toLowerCase().includes(searchLower) ||
      (part.brand && part.brand.toLowerCase().includes(searchLower));
    return isNotSelected && matchesSearch;
  });

  // Handle spare part search input change
  const handlePartSearchChange = (e) => {
    const value = e.target.value;
    setPartSearchInput(value);
    setShowPartDropdown(true);
  };

  // Handle spare part selection from dropdown - add to selected parts
  const handlePartSelect = (part) => {
    // Check if part is already selected
    const alreadySelected = selectedParts.find(sp => String(sp.partId) === String(part.id));
    if (alreadySelected) {
      Swal.fire({
        icon: 'info',
        title: 'Part Already Added',
        text: 'This part is already in your list.',
        confirmButtonColor: '#1a3a5f'
      });
      setPartSearchInput('');
      setShowPartDropdown(false);
      return;
    }

    // Check if part is out of stock
    if (part.status === 'Out of Stock') {
      Swal.fire({
        icon: 'warning',
        title: 'Out of Stock',
        text: 'This spare part is out of stock. Please choose another part.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    // Add part to selected parts list
    const newPart = {
      partId: part.id,
      part: part,
      quantity: 1
    };
    setSelectedParts([...selectedParts, newPart]);
    setPartSearchInput('');
    setShowPartDropdown(false);
  };

  // Remove part from selected parts
  const handleRemovePart = (partId) => {
    setSelectedParts(selectedParts.filter(sp => String(sp.partId) !== String(partId)));
  };

  // Update quantity for a specific part (allow typing; 0 = empty display)
  const handleUpdatePartQuantity = (partId, newQuantity) => {
    const raw = String(newQuantity).replace(/\D/g, '');
    let value = raw === '' ? 0 : Math.max(1, parseInt(raw, 10) || 0);
    const updatedParts = selectedParts.map(sp => {
      if (String(sp.partId) !== String(partId)) return sp;

      const stock = sp.part && sp.part.stockQuantity != null ? Number(sp.part.stockQuantity) : null;
      if (stock != null && stock > 0 && value > stock) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock limit exceeded',
          text: `Only ${stock} unit(s) of "${capitalizeName(sp.part.name)}" are available in stock.`,
          confirmButtonColor: '#1a3a5f'
        });
        value = stock;
      }

      return { ...sp, quantity: value };
    });
    setSelectedParts(updatedParts);
  };

  // Get unit price for a part based on selected price type (wholesale or retail)
  const getUnitPrice = (part) => {
    if (priceType === 'wholesale') {
      return Number(part.wholesale_price) || Number(part.unitPrice) || 0;
    }
    return Number(part.retail_price) || Number(part.unitPrice) || 0;
  };

  // Calculate total amount as sum of (unit price × quantity) for each selected part
  const getTotalAmount = () => {
    return selectedParts.reduce((sum, selectedPart) => {
      const unitPrice = getUnitPrice(selectedPart.part);
      const quantity = Math.max(0, parseInt(selectedPart.quantity, 10) || 0);
      return sum + unitPrice * quantity;
    }, 0);
  };

  const totalPrice = getTotalAmount();

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

    if (selectedParts.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please add at least one spare part.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    const customer = customers.find(c => String(c.id) === String(selectedCustomerId));

    try {
      // Build helper list with quantities and prices
      const withQty = selectedParts.map(sp => {
        const unitPrice = getUnitPrice(sp.part);
        const qty = Math.max(0, parseInt(sp.quantity, 10) || 0);
        return { sp, unitPrice, qty };
      });

      // Check stock limits before creating items
      const overStock = withQty.find(({ sp, qty }) => {
        const stock = sp.part && sp.part.stockQuantity != null ? Number(sp.part.stockQuantity) : null;
        return stock != null && stock >= 0 && qty > stock;
      });

      if (overStock) {
        const stock = overStock.sp.part.stockQuantity;
        Swal.fire({
          icon: 'warning',
          title: 'Stock limit exceeded',
          text: `Quantity for "${capitalizeName(overStock.sp.part.name)}" cannot be greater than available stock (${stock}).`,
          confirmButtonColor: '#1a3a5f'
        });
        return;
      }

      // Build items with quantity > 0 only; total amount = sum of (unit_price × quantity) per item
      const items = withQty
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

      // Do not send payment_method; cashier sets it when approving the transaction.
      const paymentPayload = {
        customer_id: parseInt(selectedCustomerId),
        employee_id: user?.id || user?.employee_id || null,
        letters,
        price_type: priceType, // 'retail' | 'wholesale' - total is calculated from these prices
        items
      };

      const response = await createPayment(paymentPayload);

      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to save payment');
      }

      // Reset form
      setSelectedCustomerId('');
      setCustomerSearchInput('');
      setSelectedParts([]);
      setPartSearchInput('');
      setLetters('');

      // Navigate to payments page
      navigate('/sales/payments');
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

  return (
    <div className="dashboard-container">
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
          <Link to="/sales/generate_sales" className="nav-item active">
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/sales/payments" className="nav-item">
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
        <header className="dashboard-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.generateSales}</h1>
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

        {/* Content */}
        <div className="dashboard-content">
          <div className="dashboard-card">
            <div className="card-header">
              <h2>Generate Sales</h2>
            </div>
            <div className="card-body">
              {loadingData ? (
                <InlineDataLoader message={t.loadingCustomersParts || 'Loading customers and spare parts...'} />
              ) : (
                <form onSubmit={handleGenerateSale} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Price type
                      <select
                        value={priceType}
                        onChange={(e) => setPriceType(e.target.value)}
                        style={{ width: '100%', maxWidth: '280px', padding: '10px', marginTop: '5px', border: '1px solid #ddd', borderRadius: '5px', outline: 'none' }}
                      >
                        <option value="retail">Retail price</option>
                        <option value="wholesale">Wholesale price</option>
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label>
                      {t.customer} *
                      <div className="customer-search-container" style={{ position: 'relative', marginTop: '5px' }}>
                        <div style={{ position: 'relative' }}>
                          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
                          <input
                            type="text"
                            value={customerSearchInput}
                            onChange={handleCustomerSearchChange}
                            onFocus={handleCustomerFieldFocus}
                            placeholder={t.searchCustomer}
                            required={!selectedCustomerId}
                            style={{ 
                              width: '100%', 
                              padding: '10px 10px 10px 40px', 
                              border: '1px solid #ddd',
                              borderRadius: '5px',
                              outline: 'none'
                            }}
                          />
                        </div>
                        {showCustomerDropdown && filteredCustomers.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            marginTop: '5px'
                          }}>
                            {filteredCustomers.map(customer => (
                              <div
                                key={customer.id}
                                onClick={() => handleCustomerSelect(customer)}
                                style={{
                                  padding: '12px 15px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f7fa'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                              >
                                <div>
                                  <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                                    {capitalizeName(customer.name)}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                    {customer.phone}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showCustomerDropdown && filteredCustomers.length === 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            padding: '12px 15px',
                            zIndex: 1000,
                            marginTop: '5px',
                            color: '#666'
                          }}>
                            No customers found
                          </div>
                        )}
                      </div>
                    </label>

                    <label>
                      {t.phone}
                      <input
                        type="text"
                        value={customerPhone}
                        readOnly
                        placeholder={t.customerPhonePlaceholder}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', backgroundColor: '#f5f7fa' }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label>
                      {t.totalAmount}
                      <input
                        type="text"
                        value={totalPrice ? `TZS ${formatPrice(totalPrice)}` : 'TZS 0'}
                        readOnly
                        style={{ width: '100%', padding: '10px', marginTop: '5px', backgroundColor: '#f5f7fa', fontWeight: 'bold', fontSize: '1.1em' }}
                      />
                    </label>

                    <label>
                      {t.addSparePart}
                      <div className="part-search-container" style={{ position: 'relative', marginTop: '5px' }}>
                        <div style={{ position: 'relative' }}>
                          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', zIndex: 1 }} />
                            <input
                              type="text"
                              value={partSearchInput}
                              onChange={handlePartSearchChange}
                              onFocus={() => setShowPartDropdown(true)}
                              placeholder={t.searchSparePart}
                              style={{ 
                                width: '100%', 
                                padding: '10px 10px 10px 40px', 
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                outline: 'none'
                              }}
                            />
                        </div>
                        {showPartDropdown && partSearchInput && filteredParts.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            marginTop: '5px'
                          }}>
                            {filteredParts.map(part => (
                              <div
                                key={part.id}
                                onClick={() => handlePartSelect(part)}
                                style={{
                                  padding: '12px 15px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f0f0f0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f7fa'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                              >
                                <div>
                                  <div style={{ fontWeight: '500', color: '#2c3e50' }}>
                                    {capitalizeName(part.name)}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>
                                    {part.partNumber} - {part.brand} - TZS {formatPrice(priceType === 'wholesale' ? (part.wholesale_price ?? part.unitPrice) : (part.retail_price ?? part.unitPrice))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showPartDropdown && partSearchInput && filteredParts.length === 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '5px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            padding: '12px 15px',
                            zIndex: 1000,
                            marginTop: '5px',
                            color: '#666'
                          }}>
                            No spare parts found
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Selected Parts List */}
                    {selectedParts.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <label style={{ marginBottom: '10px', display: 'block', fontWeight: '500' }}>
                          {t.selectedParts} ({selectedParts.length})
                        </label>
                        <div style={{ 
                          border: '1px solid #ddd', 
                          borderRadius: '5px', 
                          maxHeight: '300px', 
                          overflowY: 'auto',
                          backgroundColor: '#f9f9f9'
                        }}>
                          {selectedParts.map((selectedPart, index) => {
                            const unitPrice = getUnitPrice(selectedPart.part);
                            const partTotal = unitPrice * Number(selectedPart.quantity);
                            return (
                              <div
                                key={selectedPart.partId}
                                style={{
                                  padding: '12px 15px',
                                  borderBottom: index < selectedParts.length - 1 ? '1px solid #eee' : 'none',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '500', color: '#2c3e50', marginBottom: '5px' }}>
                                    {capitalizeName(selectedPart.part.name)}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '8px' }}>
                                    {selectedPart.part.partNumber} - TZS {formatPrice(getUnitPrice(selectedPart.part))} each ({priceType === 'wholesale' ? 'wholesale' : 'retail'})
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#666' }}>{t.quantity}:</span>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="Enter quantity"
                                      value={selectedPart.quantity === 0 ? '' : selectedPart.quantity}
                                      onChange={(e) => handleUpdatePartQuantity(selectedPart.partId, e.target.value)}
                                      style={{
                                        width: '80px',
                                        padding: '5px 8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '3px',
                                        outline: 'none'
                                      }}
                                    />
                                    <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '10px' }}>
                                      {t.total} ({priceType === 'wholesale' ? 'wholesale' : 'retail'}): TZS {formatPrice(partTotal)}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemovePart(selectedPart.partId)}
                                  style={{
                                    padding: '8px 12px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.9rem'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                                >
                                  <FaTimes /> {t.remove}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      type="submit"
                      className="action-btn primary"
                      style={{ padding: '10px 20px', fontSize: '1rem' }}
                    >
                      <FaFileInvoice style={{ marginRight: '8px' }} />
                      {t.generateSale}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GenerateSales;

