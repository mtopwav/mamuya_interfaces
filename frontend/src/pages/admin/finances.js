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
  FaCalculator,
  FaCashRegister,
  FaPhone,
  FaIdCard,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaHistory,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './categories&brands.css';
import logo from '../../images/logo.png';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getPayments
} from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount, markOperationAsViewed } from '../../utils/notifications';

function Finances() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('accountant'); // 'accountant' or 'cashier'
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [operations, setOperations] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [dateFormatVersion, setDateFormatVersion] = useState(0); // Force re-render when format changes
  const [notificationCount, setNotificationCount] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: 'Accountant',
    department: 'Finance',
    password: '',
    status: 'Active'
  });

  useEffect(() => {
    const userData =
      localStorage.getItem('user') || sessionStorage.getItem('user');

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
    // Fetch employees from database
    fetchEmployees();
    // Fetch payments for operations
    fetchPayments();

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

  // Function to fetch payments and extract operations
  const fetchPayments = async () => {
    try {
      const response = await getPayments();
      if (response.success && response.payments) {
        setPayments(response.payments);
        // Update operations after payments are set
        const operationsList = response.payments
          .filter((p) => p.approved_by && p.approver_name && p.approved_at)
          .map((p) => ({
            id: p.id,
            paymentId: p.id,
            customerName: p.customer_name || 'N/A',
            amount: parseFloat(p.total_amount) || 0,
            action: p.status,
            approverName: p.approver_name,
            approverId: p.approved_by,
            approvedAt: p.approved_at,
            createdAt: p.created_at
          }))
          .sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
        
        setOperations(operationsList);
        
        // Mark operations as viewed when they're displayed
        operationsList.forEach(op => {
          const operationType = op.action === 'Approved' ? 'payment_approved' : 'payment_rejected';
          markOperationAsViewed(op.id, operationType);
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Function to fetch employees from database
  const fetchEmployees = async () => {
    try {
      console.log('📥 Fetching employees from database...');
      const response = await getEmployees();

      console.log('📥 API Response:', response);

      if (response && response.success && response.employees) {
        // Filter only Finance department employees
        const financeEmployees = response.employees.filter(
          (emp) => emp.department === 'Finance'
        );

        // Map database fields to frontend format
        const mappedEmployees = financeEmployees.map((emp) => ({
          id: emp.id,
          name: emp.full_name || emp.name || '',
          email: emp.email || '',
          phone: emp.phone || '',
          position: emp.position || '',
          department: emp.department || 'Finance',
          status: emp.status || 'Active',
          password: emp.password || '',
          joinDate: emp.join_date
            ? new Date(emp.join_date).toISOString().split('T')[0]
            : emp.created_at
            ? new Date(emp.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        }));

        setEmployees(mappedEmployees);
        console.log(
          `✅ Loaded ${mappedEmployees.length} finance employees from database`
        );
      } else {
        console.warn('⚠️ No employees found or invalid response:', response);
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      console.error('Error details:', error.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.message ||
          'Failed to load employees from database. Please check the server console for details.',
        confirmButtonColor: '#1a3a5f'
      });
      // Set empty array on error to prevent crashes
      setEmployees([]);
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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password.trim()
    ) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all required fields.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    setAddingEmployee(true);

    try {
      const employeeData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        position: activeTab === 'accountant' ? 'Accountant' : 'Cashier',
        department: 'Finance',
        password: formData.password.trim(),
        status: formData.status || 'Active'
      };

      const response = await addEmployee(employeeData);

      if (response.success) {
        // Refresh employees list from database
        await fetchEmployees();
        // Refresh operations
        await fetchPayments();

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${capitalizeName(activeTab)} added successfully.`,
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({
          name: '',
          email: '',
          phone: '',
          position: activeTab === 'accountant' ? 'Accountant' : 'Cashier',
          department: 'Finance',
          password: '',
          status: 'Active'
        });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error(`Error adding ${activeTab}:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || `Failed to add ${activeTab}. Please try again.`,
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      position: employee.position || '',
      department: employee.department || 'Finance',
      password: employee.password || '',
      status: employee.status || 'Active'
    });
    setShowAddModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password.trim()
    ) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all required fields.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    setUpdatingEmployee(true);

    try {
      const employeeData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        position: editingEmployee.position,
        department: 'Finance',
        password: formData.password.trim(),
        status: formData.status || 'Active'
      };

      const response = await updateEmployee(editingEmployee.id, employeeData);

      if (response.success) {
        // Refresh employees list from database
        await fetchEmployees();
        // Refresh operations
        await fetchPayments();

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${capitalizeName(activeTab)} updated successfully.`,
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({
          name: '',
          email: '',
          phone: '',
          position: activeTab === 'accountant' ? 'Accountant' : 'Cashier',
          department: 'Finance',
          password: '',
          status: 'Active'
        });
        setEditingEmployee(null);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error(`Error updating ${activeTab}:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || `Failed to update ${activeTab}. Please try again.`,
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleDelete = async (id) => {
    const currentEmployees =
      activeTab === 'accountant' ? accountants : cashiers;
    const employee = currentEmployees.find((e) => e.id === id);

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${employee?.name || 'this employee'}?`,
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
        const response = await deleteEmployee(id);

        if (response.success) {
          // Refresh employees list from database
          await fetchEmployees();
          // Refresh operations
          await fetchPayments();

          Swal.fire({
            title: 'Deleted!',
            text: `${capitalizeName(activeTab)} has been deleted.`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error(`Error deleting ${activeTab}:`, error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || `Failed to delete ${activeTab}. Please try again.`,
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calculate time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'N/A';
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return formatDateTime(dateString);
  };

  const isInDateRange = (dateStr, from, to) => {
    if (!from && !to) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (from && dateOnly < from) return false;
    if (to && dateOnly > to) return false;
    return true;
  };

  // Filter employees by position
  const accountants = employees.filter(
    (emp) => emp.position === 'Accountant'
  );
  const cashiers = employees.filter((emp) => emp.position === 'Cashier');

  const currentEmployees = activeTab === 'accountant' ? accountants : cashiers;
  const filteredEmployees = currentEmployees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone.includes(searchTerm)
  );

  // Filter operations by active tab (accountant or cashier)
  const filteredOperations = operations.filter((op) => {
    const approver = employees.find((e) => e.id === op.approverId);
    if (!approver) return false;
    const matchesTab = activeTab === 'accountant'
      ? approver.position === 'Accountant'
      : approver.position === 'Cashier';
    const matchesDate = isInDateRange(op.approvedAt || op.createdAt, dateFrom, dateTo);
    return matchesTab && matchesDate;
  });

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
          <Link to="/admin/categories-brands" className="nav-item">
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
          <Link to="/admin/finances" className="nav-item active">
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
            <h1 className="page-title">{t.finances}</h1>
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
              className={`tab-btn ${activeTab === 'accountant' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('accountant');
                setSearchTerm('');
                setShowAddModal(false);
                setEditingEmployee(null);
              }}
            >
              <FaCalculator className="tab-icon" />
              <span>{t.accountant}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'cashier' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('cashier');
                setSearchTerm('');
                setShowAddModal(false);
                setEditingEmployee(null);
              }}
            >
              <FaCashRegister className="tab-icon" />
              <span>{t.cashier}</span>
            </button>
          </div>

          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${activeTab === 'accountant' ? t.accountant.toLowerCase() : t.cashier.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <FaCalendarAlt style={{ color: '#1a3a5f' }} />
              <label style={{ fontSize: '0.9rem', color: '#666' }}>From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="search-input"
                style={{ maxWidth: '170px' }}
              />
              <label style={{ fontSize: '0.9rem', color: '#666' }}>To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="search-input"
                style={{ maxWidth: '170px' }}
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  style={{ padding: '8px 12px' }}
                >
                  Clear dates
                </button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalAccountants}</h3>
                <p className="stat-value">{accountants.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalCashiers}</h3>
                <p className="stat-value">{cashiers.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.recentOperations}</h3>
                <p className="stat-value">{filteredOperations.length}</p>
              </div>
            </div>
          </div>

          {/* Operations Section */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '20px' 
            }}>
              <FaHistory style={{ fontSize: '1.2rem', color: '#1a3a5f' }} />
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a3a5f' }}>
                {t.recentOperations}
              </h2>
            </div>
            <div className="table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>{t.paymentId}</th>
                    <th>{t.customer}</th>
                    <th>{t.totalAmount}</th>
                    <th>{t.actions}</th>
                    <th>{t.performedBy}</th>
                    <th>{t.dateTime}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {t.noData} {activeTab === 'accountant' ? t.accountants.toLowerCase() : t.cashiers.toLowerCase()}
                      </td>
                    </tr>
                  ) : (
                    filteredOperations.map((op, index) => (
                      <tr key={op.id}>
                        <td>{index + 1}</td>
                        <td>#{op.paymentId}</td>
                        <td>{capitalizeName(op.customerName)}</td>
                        <td className="amount-cell">{formatCurrency(op.amount)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              op.action === 'Approved'
                                ? 'approved'
                                : op.action === 'Rejected'
                                ? 'rejected'
                                : 'pending'
                            }`}
                          >
                            {op.action === 'Approved' && <FaCheckCircle />}
                            {op.action === 'Rejected' && <FaTimesCircle />}
                            {op.action === 'Pending' && <FaClock />}
                            {op.action === 'Approved' ? t.approved : op.action === 'Rejected' ? t.rejected : t.pending}
                          </span>
                        </td>
                        <td>{capitalizeName(op.approverName)}</td>
                        <td>
                          <div>
                            <div key={`op-date-${dateFormatVersion}`}>{formatDateTime(op.approvedAt)}</div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '3px' }}>
                              {getTimeAgo(op.approvedAt)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>{t.name}</th>
                  <th>{t.email}</th>
                  <th>{t.phone}</th>
                  <th>{t.position}</th>
                  <th>{t.status}</th>
                  <th>{t.joinDate}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {t.noData} {activeTab === 'accountant' ? t.accountants.toLowerCase() : t.cashiers.toLowerCase()}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee, index) => (
                    <tr key={employee.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="employee-info">
                          <FaUser className="info-icon" />
                          <span>{capitalizeName(employee.name)}</span>
                        </div>
                      </td>
                      <td>{employee.email}</td>
                      <td>{employee.phone}</td>
                      <td>
                        <span className="position-badge">{employee.position}</span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            employee.status === 'Active'
                              ? 'active'
                              : 'inactive'
                          }`}
                        >
                          {employee.status === 'Active' ? t.active : t.inactive}
                        </span>
                      </td>
                      <td>{employee.joinDate}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit"
                            title={t.edit}
                            onClick={() => handleEdit(employee)}
                          >
                            <FaEdit className="action-icon" />
                            <span className="action-text">{t.edit}</span>
                          </button>
                          <button
                            className="action-btn delete"
                            title={t.delete}
                            onClick={() => handleDelete(employee.id)}
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
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditingEmployee(null);
            setFormData({
              name: '',
              email: '',
              phone: '',
              position:
                activeTab === 'accountant' ? 'Accountant' : 'Cashier',
              department: 'Finance',
              password: '',
              status: 'Active'
            });
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {editingEmployee
                  ? `Edit ${capitalizeName(activeTab)}`
                  : `Add ${capitalizeName(activeTab)}`}
              </h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEmployee(null);
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    position:
                      activeTab === 'accountant' ? 'Accountant' : 'Cashier',
                    department: 'Finance',
                    password: '',
                    status: 'Active'
                  });
                }}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={editingEmployee ? handleUpdate : handleAdd}
              className="modal-form"
            >
              <div className="form-group">
                <label>
                  <FaUser /> Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <FaEnvelope /> Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <FaPhone /> Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <FaIdCard /> Position
                </label>
                <input
                  type="text"
                  value={
                    activeTab === 'accountant' ? 'Accountant' : 'Cashier'
                  }
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>
                  <FaIdCard /> Department
                </label>
                <input
                  type="text"
                  value="Finance"
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>
              <div className="form-group">
                <label>
                  Password *
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginLeft: '10px',
                      color: '#1a3a5f'
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEmployee(null);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      position:
                        activeTab === 'accountant' ? 'Accountant' : 'Cashier',
                      department: 'Finance',
                      password: '',
                      status: 'Active'
                    });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={addingEmployee || updatingEmployee}
                >
                  {addingEmployee || updatingEmployee
                    ? 'Processing...'
                    : editingEmployee
                    ? 'Update'
                    : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finances;
