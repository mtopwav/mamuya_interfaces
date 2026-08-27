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
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaList,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './categories&brands.css';
import logo from '../../images/logo.png';
import { getCategories, addCategory, updateCategory, deleteCategory, getBrands, addBrand, updateBrand, deleteBrand } from '../../services/api';
import { getCurrentDateTime, formatDate } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

function CategoriesBrands() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' or 'brands'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    name: ''
  });

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
    // Fetch categories and brands from database
    fetchCategories();
    fetchBrands();

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

  // Function to fetch categories from database
  const fetchCategories = async () => {
    try {
      console.log('📥 Fetching categories from database...');
      const response = await getCategories();
      
      if (response && response.success && response.categories) {
        const mappedCategories = response.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          createdAt: cat.created_at ? new Date(cat.created_at).toISOString() : new Date().toISOString()
        }));
        // Arrange categories in alphabetical order A–Z (case-insensitive)
        mappedCategories.sort((a, b) =>
          String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase())
        );
        setCategories(mappedCategories);
        console.log(`✅ Loaded ${mappedCategories.length} categories from database`);
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
        const mappedBrands = response.brands.map(brand => ({
          id: brand.id,
          name: brand.name,
          createdAt: brand.created_at ? new Date(brand.created_at).toISOString() : new Date().toISOString()
        }));
        // Sort brands alphabetically A–Z (case-insensitive)
        mappedBrands.sort((a, b) =>
          String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase())
        );
        setBrands(mappedBrands);
        console.log(`✅ Loaded ${mappedBrands.length} brands from database`);
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

  // Function to capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please enter a name.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    if (activeTab === 'categories') {
      // Add category to database
      try {
        const response = await addCategory({ name: formData.name.trim() });
        
        if (response.success) {
          // Refresh categories list from database
          await fetchCategories();
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Category added successfully to database.',
            confirmButtonColor: '#1a3a5f',
            timer: 2000,
            showConfirmButton: false
          });
          
          setFormData({ name: '' });
          setShowAddModal(false);
        }
      } catch (error) {
        console.error('Error adding category:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to add category. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    } else {
      // Add brand to database
      try {
        const response = await addBrand({ name: formData.name.trim() });
        
        if (response.success) {
          // Refresh brands list from database
          await fetchBrands();
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Brand added successfully to database.',
            confirmButtonColor: '#1a3a5f',
            timer: 2000,
            showConfirmButton: false
          });
          
          setFormData({ name: '' });
          setShowAddModal(false);
        }
      } catch (error) {
        console.error('Error adding brand:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to add brand. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name
    });
    setShowAddModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please enter a name.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    if (activeTab === 'categories') {
      // Update category in database
      try {
        const response = await updateCategory(editingItem.id, { name: formData.name.trim() });
        
        if (response.success) {
          // Refresh categories list from database
          await fetchCategories();
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Category updated successfully in database.',
            confirmButtonColor: '#1a3a5f',
            timer: 2000,
            showConfirmButton: false
          });
          
          setFormData({ name: '' });
          setEditingItem(null);
          setShowAddModal(false);
        }
      } catch (error) {
        console.error('Error updating category:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to update category. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    } else {
      // Update brand in database
      try {
        const response = await updateBrand(editingItem.id, { name: formData.name.trim() });
        
        if (response.success) {
          // Refresh brands list from database
          await fetchBrands();
          
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Brand updated successfully in database.',
            confirmButtonColor: '#1a3a5f',
            timer: 2000,
            showConfirmButton: false
          });
          
          setFormData({ name: '' });
          setEditingItem(null);
          setShowAddModal(false);
        }
      } catch (error) {
        console.error('Error updating brand:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to update brand. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  const handleDelete = async (id) => {
    const items = activeTab === 'categories' ? categories : brands;
    const item = items.find(i => i.id === id);
    
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${item?.name || 'this item'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      if (activeTab === 'categories') {
        // Delete category from database
        try {
          const response = await deleteCategory(id);
          
          if (response.success) {
            // Refresh categories list from database
            await fetchCategories();
            
            Swal.fire({
              title: 'Deleted!',
              text: 'Category has been deleted from database.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          }
        } catch (error) {
          console.error('Error deleting category:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete category. Please try again.',
            confirmButtonColor: '#1a3a5f'
          });
        }
      } else {
        // Delete brand from database
        try {
          const response = await deleteBrand(id);
          
          if (response.success) {
            // Refresh brands list from database
            await fetchBrands();
            
            Swal.fire({
              title: 'Deleted!',
              text: 'Brand has been deleted from database.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            });
          }
        } catch (error) {
          console.error('Error deleting brand:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete brand. Please try again.',
            confirmButtonColor: '#1a3a5f'
          });
        }
      }
    }
  };

  const currentItems = activeTab === 'categories' ? categories : brands;
  const filteredItems = currentItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) {
    return null;
  }

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
          <Link to="/admin/categories-brands" className="nav-item active">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
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
        <header className="categories-brands-header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.categoriesBrands}</h1>
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
          {/* Tabs */}
          <div className="content-tabs">
            <button 
              className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('categories');
                setSearchTerm('');
                setShowAddModal(false);
                setEditingItem(null);
              }}
            >
              <FaList className="tab-icon" />
              <span>{t.categories}</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'brands' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('brands');
                setSearchTerm('');
                setShowAddModal(false);
                setEditingItem(null);
              }}
            >
              <FaTags className="tab-icon" />
              <span>{t.brands}</span>
            </button>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${activeTab === 'categories' ? t.categories.toLowerCase() : t.brands.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="add-btn" onClick={() => {
              setEditingItem(null);
              setFormData({ name: '' });
              setShowAddModal(true);
            }}>
              <FaPlus /> {t.add} {activeTab === 'categories' ? t.categories : t.brands}
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalCategories}</h3>
                <p className="stat-value">{categories.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalBrands}</h3>
                <p className="stat-value">{brands.length}</p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.created}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="item-name">
                          <FaTags className="name-icon" />
                          {activeTab === 'brands'
                            ? String(item.name || '').toUpperCase()
                            : capitalizeName(item.name)}
                        </div>
                      </td>
                      <td>
                        {item.createdAt 
                          ? formatDate(item.createdAt)
                          : 'N/A'
                        }
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn edit" 
                            title={`${t.edit} ${activeTab === 'categories' ? t.categories : t.brands}`}
                            onClick={() => handleEdit(item)}
                          >
                            <FaEdit className="action-icon" />
                            <span className="action-text">{t.edit}</span>
                          </button>
                          <button 
                            className="action-btn delete" 
                            title={`${t.delete} ${activeTab === 'categories' ? t.categories : t.brands}`}
                            onClick={() => handleDelete(item.id)}
                          >
                            <FaTrash className="action-icon" />
                            <span className="action-text">{t.delete}</span>
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setEditingItem(null);
          setFormData({ name: '' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? t.edit : t.add} {activeTab === 'categories' ? t.categories : t.brands}</h2>
              <button className="close-btn" onClick={() => {
                setShowAddModal(false);
                setEditingItem(null);
                setFormData({ name: '' });
              }}>×</button>
            </div>
            <form onSubmit={editingItem ? handleUpdate : handleAdd} className="item-form">
              <div className="form-group">
                <label>{t.name} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={`${t.name} ${activeTab === 'categories' ? t.categories.toLowerCase() : t.brands.toLowerCase()}`}
                />
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingItem(null);
                    setFormData({ name: '' });
                  }}
                >
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn">
                  {editingItem ? t.save : t.add} {activeTab === 'categories' ? t.categories : t.brands}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CategoriesBrands;

