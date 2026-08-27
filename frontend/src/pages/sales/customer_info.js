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
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaPhone,
  FaIdCard,
  FaMapMarkerAlt,
  FaCreditCard,
  FaInfoCircle,
  FaFileInvoice,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './customer_info.css';
import logo from '../../images/logo.png';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function CustomerInfo() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });

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

    // Load customers from database
    const loadCustomers = async () => {
      try {
        const response = await getCustomers();
        if (response.success && response.customers) {
          // Map database fields to component format
          const formattedCustomers = response.customers.map(customer => ({
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            address: customer.address,
            paymentMethod: customer.payment_method,
            registeredDate: customer.created_at || customer.registered_date || customer.registeredDate
          }));
          setCustomers(formattedCustomers);
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load customers. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    loadCustomers();

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

  const capitalizeAddress = (address) => {
    if (!address) return '';
    return address
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid date
      
      // Format: DD/MM/YYYY HH:MM
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setAddingCustomer(true);

    try {
      // Validation
      if (!formData.name || !formData.phone || !formData.address) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Name, Phone, and Address are required fields.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingCustomer(false);
        return;
      }

      // Validate that name contains 2 or 3 names (e.g. First Last or First Middle Last)
      const nameParts = formData.name.trim().split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length < 2 || nameParts.length > 3) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please enter full name with 2 or 3 names (e.g. First Last or First Middle Last).',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingCustomer(false);
        return;
      }

      // Validate and format phone number to start with +255
      let phoneNumber = formData.phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        // If it doesn't start with +255, add it
        if (phoneNumber.startsWith('255')) {
          phoneNumber = '+' + phoneNumber;
        } else if (phoneNumber.startsWith('0')) {
          // Remove leading 0 and add +255
          phoneNumber = '+255' + phoneNumber.substring(1);
        } else {
          phoneNumber = '+255' + phoneNumber;
        }
      }

      // Validate phone number has exactly 9 digits after +255
      const phoneDigits = phoneNumber.substring(4); // Get digits after +255
      if (phoneDigits.length !== 9) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Phone number must contain exactly 9 digits (e.g., 712345678).',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingCustomer(false);
        return;
      }

      // Call API to add customer (do not send payment method; not stored on customer)
      const customerData = {
        name: formData.name.trim(),
        phone: phoneNumber,
        address: formData.address.trim()
      };

      const response = await addCustomer(customerData);

      if (response.success) {
        // Map database fields to component format
        const newCustomer = {
          id: response.customer.id,
          name: response.customer.name,
          phone: response.customer.phone,
          address: response.customer.address,
          paymentMethod: response.customer.payment_method,
          registeredDate: response.customer.created_at || response.customer.registered_date
        };

        setCustomers([newCustomer, ...customers]);

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Customer added successfully.',
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({ name: '', phone: '', address: '' });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add customer. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    // Extract phone number without +255 prefix for display
    let phoneDisplay = customer.phone || '';
    if (phoneDisplay.startsWith('+255')) {
      phoneDisplay = phoneDisplay.substring(4);
    } else if (phoneDisplay.startsWith('255')) {
      phoneDisplay = phoneDisplay.substring(3);
    } else if (phoneDisplay.startsWith('0')) {
      phoneDisplay = phoneDisplay.substring(1);
    }
    setFormData({
      name: customer.name || '',
      phone: '+255' + phoneDisplay, // Store with +255 prefix
      address: customer.address || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    setUpdatingCustomer(true);

    try {
      // Validation
      if (!formData.name || !formData.phone || !formData.address) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Name, Phone, and Address are required fields.',
          confirmButtonColor: '#1a3a5f'
        });
        setUpdatingCustomer(false);
        return;
      }

      // Validate that name contains at least 3 words (first name, middle name, last name)
      const nameParts = formData.name.trim().split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length < 3) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please enter full name with at least 3 names.',
          confirmButtonColor: '#1a3a5f'
        });
        setUpdatingCustomer(false);
        return;
      }

      // Validate and format phone number to start with +255
      let phoneNumber = formData.phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        // If it doesn't start with +255, add it
        if (phoneNumber.startsWith('255')) {
          phoneNumber = '+' + phoneNumber;
        } else if (phoneNumber.startsWith('0')) {
          // Remove leading 0 and add +255
          phoneNumber = '+255' + phoneNumber.substring(1);
        } else {
          phoneNumber = '+255' + phoneNumber;
        }
      }

      // Validate phone number has exactly 9 digits after +255
      const phoneDigits = phoneNumber.substring(4); // Get digits after +255
      if (phoneDigits.length !== 9) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Phone number must contain exactly 9 digits (e.g., 712345678).',
          confirmButtonColor: '#1a3a5f'
        });
        setUpdatingCustomer(false);
        return;
      }

      // Call API to update customer (do not send payment method; not stored on customer)
      const customerData = {
        name: formData.name.trim(),
        phone: phoneNumber,
        address: formData.address.trim()
      };

      const response = await updateCustomer(editingCustomer.id, customerData);

      if (response.success) {
        // Map database fields to component format
        const updatedCustomer = {
          id: response.customer.id,
          name: response.customer.name,
          phone: response.customer.phone,
          address: response.customer.address,
          paymentMethod: response.customer.payment_method,
          registeredDate: response.customer.created_at || response.customer.registered_date || editingCustomer.registeredDate
        };

        const updatedCustomers = customers.map(cust =>
          cust.id === editingCustomer.id ? updatedCustomer : cust
        );

        setCustomers(updatedCustomers);

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Customer updated successfully.',
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({ name: '', phone: '', address: '' });
        setEditingCustomer(null);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update customer. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setUpdatingCustomer(false);
    }
  };

  const handleDelete = async (id) => {
    const customer = customers.find(cust => cust.id === id);
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${customer?.name || 'this customer'}? This action cannot be undone.`,
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
        // Call API to delete customer
        const response = await deleteCustomer(id);

        if (response.success) {
          setCustomers(customers.filter(cust => cust.id !== id));

          Swal.fire({
            title: 'Deleted!',
            text: 'Customer has been deleted.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error('Error deleting customer:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete customer. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  // Get today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredCustomers = customers.filter(cust => {
    // If there's a search term, search through all customers (all time)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        (cust.name && cust.name.toLowerCase().includes(term)) ||
        (cust.phone && cust.phone.includes(searchTerm)) ||
        (cust.address && cust.address.toLowerCase().includes(term))
      );
    }
    
    // If no search term, show only today's customers
    const customerDate = new Date(cust.registeredDate || cust.created_at);
    customerDate.setHours(0, 0, 0, 0);
    return customerDate.getTime() === today.getTime();
  });

  return (
    <div className="customer-info-container">
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
          <Link to="/sales/customer_info" className="nav-item active">
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/sales/generate_sales" className="nav-item">
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
        <header className="customer-info-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.customerInfo}</h1>
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
            <div style={{ marginRight: '15px' }}>
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

        {/* Customer Info Content */}
        <div className="customer-info-content">
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
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus /> {t.addCustomer}
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.customers} ({t.today})</h3>
                <p className="stat-value">
                  {customers.filter(cust => {
                    const customerDate = new Date(cust.registeredDate || cust.created_at);
                    customerDate.setHours(0, 0, 0, 0);
                    return customerDate.getTime() === today.getTime();
                  }).length}
                </p>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.phone}</th>
                  <th>{t.address}</th>
                  <th>{t.date}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      {t.noCustomersFound}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td>
                        <div className="customer-name">
                          <FaIdCard className="name-icon" />
                          {capitalizeName(customer.name)}
                        </div>
                      </td>
                      <td>
                        <div className="customer-phone">
                          <FaPhone className="phone-icon" />
                          {customer.phone}
                        </div>
                      </td>
                      <td>
                        <div className="customer-address">
                          <FaMapMarkerAlt className="address-icon" />
                          {capitalizeAddress(customer.address)}
                        </div>
                      </td>
                      <td>{formatDateTime(customer.registeredDate || customer.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn edit" title={t.editCustomer} onClick={() => handleEdit(customer)}>
                            <FaEdit className="action-icon" />
                            <span className="action-text">{t.edit}</span>
                          </button>
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.addCustomer}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomer} className="customer-form">
              <div className="form-group">
                <label>{t.fullName} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter Customer name"
                  title="Enter 2 or 3 names separated by spaces"
                />
              </div>
              <div className="form-group">
                <label>{t.phone} *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
                  <span style={{ padding: '12px 15px', background: '#f8f9fa', borderRight: '1px solid #ddd', color: '#2c3e50', fontWeight: '500', whiteSpace: 'nowrap' }}>+255</span>
                  <input
                    type="tel"
                    required
                    maxLength={9}
                    value={formData.phone.startsWith('+255') ? formData.phone.substring(4) : formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9); // Remove non-digits and limit to 9 digits
                      setFormData({ ...formData, phone: '+255' + value });
                    }}
                    placeholder="712345678"
                    style={{ flex: 1, border: 'none', padding: '12px 15px', outline: 'none' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.address} *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t.address}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)} disabled={addingCustomer}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn" disabled={addingCustomer}>
                  {addingCustomer ? t.loading : t.addCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.editCustomer}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateCustomer} className="customer-form">
              <div className="form-group">
                <label>{t.fullName} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter Customer name"
                  title="Enter 2 or 3 names separated by spaces"
                />
              </div>
              <div className="form-group">
                <label>{t.phone} *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '5px', overflow: 'hidden' }}>
                  <span style={{ padding: '12px 15px', background: '#f8f9fa', borderRight: '1px solid #ddd', color: '#2c3e50', fontWeight: '500', whiteSpace: 'nowrap' }}>+255</span>
                  <input
                    type="tel"
                    required
                    maxLength={9}
                    value={formData.phone.startsWith('+255') ? formData.phone.substring(4) : formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9); // Remove non-digits and limit to 9 digits
                      setFormData({ ...formData, phone: '+255' + value });
                    }}
                    placeholder="712345678"
                    style={{ flex: 1, border: 'none', padding: '12px 15px', outline: 'none' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.address} *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t.address}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={updatingCustomer}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn" disabled={updatingCustomer}>
                  {updatingCustomer ? t.loading : t.editCustomer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerInfo;
