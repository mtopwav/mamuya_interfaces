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
  FaTag,
  FaTags,
  FaWarehouse,
  FaMoneyBillWave,
  FaBarcode,
  FaLayerGroup,
  FaIndustry,
  FaCreditCard,
  FaInfoCircle,
  FaFileInvoice,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './spareparts.css';
import logo from '../../images/logo.png';
import { getSpareParts } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function SalesSpareParts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [spareParts, setSpareParts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);

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

    // Load spare parts from database
    const loadSpareParts = async () => {
      try {
        const response = await getSpareParts();
        if (response.success && response.spareParts) {
          // Map database fields to component format
          const formattedParts = response.spareParts.map(part => ({
            id: part.id,
            partName: part.part_name,
            partNumber: part.part_number,
            category: part.category_name || 'Unknown',
            brand: part.brand_name || 'Unknown',
            quantity: part.quantity,
            wholesale_price: part.wholesale_price,
            retail_price: part.retail_price,
            unitPrice: part.retail_price,
            totalValue: part.total_value,
            status: part.status,
            location: part.location,
            supplier: part.supplier,
            dateAdded: part.date_added
          }));
          setSpareParts(formattedParts);
        }
      } catch (error) {
        console.error('Error loading spare parts:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load spare parts. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    loadSpareParts();

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

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatLocation = (location) => {
    if (!location) return '';
    return location
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleView = (part) => {
    setSelectedPart(part);
    setShowViewModal(true);
  };

  const filteredParts = spareParts.filter(part =>
    (part.partName && part.partName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.partNumber && part.partNumber.toUpperCase().includes(searchTerm.toUpperCase())) ||
    (part.category && part.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.brand && part.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (part.location && part.location.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedParts = [...filteredParts].sort((a, b) =>
    String(a.partName || '').toLowerCase().localeCompare(String(b.partName || '').toLowerCase())
  );

  // Calculate statistics - only in stock and out of stock counts
  const inStockParts = spareParts.filter(part => part.status === 'In Stock').length;
  const outOfStockParts = spareParts.filter(part => part.status === 'Out of Stock').length;

  return (
    <div className="spareparts-container">
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
          <Link to="/sales/spareparts" className="nav-item active">
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

        {/* Spare Parts Content */}
        <div className="spareparts-content">
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
          </div>

          {/* Spare Parts Table */}
          <div className="table-container">
            <table className="spareparts-table">
              <thead>
                <tr>
                  <th>{t.partName}</th>
                  <th>{t.partNumber}</th>
                  <th>{t.category}</th>
                  <th>{t.brand}</th>
                  <th>{t.quantity}</th>
                  <th>{t.wholesalePrice}</th>
                  <th>{t.retailPrice}</th>
                  <th>{t.location}</th>
                </tr>
              </thead>
              <tbody>
                {sortedParts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  sortedParts.map(part => (
                    <tr key={part.id}>
                      <td>
                        <div className="part-name">
                          <FaTag className="name-icon" />
                          {capitalizeName(part.partName)}
                        </div>
                      </td>
                      <td>
                        <div className="part-number">
                          <FaBarcode className="number-icon" />
                          {part.partNumber?.toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">
                          <FaLayerGroup className="category-icon" />
                          {capitalizeName(part.category)}
                        </span>
                      </td>
                      <td>
                        <span className="brand-badge">
                          <FaIndustry className="brand-icon" />
                          {(part.brand || '—').toUpperCase()}
                        </span>
                      </td>
                      <td>{part.quantity}</td>
                      <td>TZS {formatPrice(part.wholesale_price)}</td>
                      <td>TZS {formatPrice(part.retail_price)}</td>
                      <td>
                        <div className="location-info">
                          <FaWarehouse className="location-icon" />
                          {formatLocation(part.location)}
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

      {/* View Part Modal */}
      {showViewModal && selectedPart && (
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
                    <FaTag /> {t.partName}
                  </label>
                  <div className="view-value">{capitalizeName(selectedPart.partName)}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaBarcode /> {t.partNumber}
                  </label>
                  <div className="view-value">{(selectedPart.partNumber || '—').toUpperCase()}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaLayerGroup /> {t.category}
                  </label>
                  <div className="view-value">{capitalizeName(selectedPart.category)}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaIndustry /> {t.brand}
                  </label>
                  <div className="view-value">{(selectedPart.brand || '—').toUpperCase()}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaBox /> {t.quantity}
                  </label>
                  <div className="view-value">{selectedPart.quantity}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaMoneyBillWave /> {t.unitPrice}
                  </label>
                  <div className="view-value">TZS {formatPrice(selectedPart.unitPrice)}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaMoneyBillWave /> {t.totalValue}
                  </label>
                  <div className="view-value">TZS {formatPrice(selectedPart.totalValue)}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaTag /> {t.status}
                  </label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPart.status === 'In Stock' ? 'in-stock' : 'out-of-stock'}`}>
                      {selectedPart.status === 'In Stock' ? t.inStock : selectedPart.status === 'Out of Stock' ? t.outOfStock : selectedPart.status}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaWarehouse /> {t.location}
                  </label>
                  <div className="view-value">{formatLocation(selectedPart.location)}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaTags /> {t.supplier}
                  </label>
                  <div className="view-value">{selectedPart.supplier || 'Mamuya Auto Spare Parts'}</div>
                </div>
                {selectedPart.dateAdded && (
                  <div className="view-item">
                    <label>
                      <FaBox /> {t.date} {t.add}
                    </label>
                    <div className="view-value">{selectedPart.dateAdded}</div>
                  </div>
                )}
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
    </div>
  );
}

export default SalesSpareParts;
