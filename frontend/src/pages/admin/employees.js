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
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaPhone,
  FaEnvelope as FaMail,
  FaIdCard,
  FaTags,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './employees.css';
import logo from '../../images/logo.png';
import { addEmployee, getEmployees, updateEmployee, deleteEmployee } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

function Employees() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [updatingEmployee, setUpdatingEmployee] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [employees, setEmployees] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    position: '',
    department: '',
    password: '',
    salary: ''
  });

  // Function to fetch employees from database
  const fetchEmployees = async () => {
    try {
      console.log('📥 Fetching employees from database...');
      const response = await getEmployees();

      console.log('📥 API Response:', response);

      if (response && response.success && response.employees) {
        // Map database fields to frontend format
        const mappedEmployees = response.employees.map(emp => ({
          id: emp.id,
          name: emp.full_name || emp.name || '',
          phone: emp.phone || '',
          position: emp.position || '',
          department: emp.department || '',
          status: emp.status || 'Active',
          password: emp.password || '',
          salary: emp.salary != null ? Number(emp.salary) : null,
          joinDate: emp.join_date ? new Date(emp.join_date).toISOString().split('T')[0] :
            (emp.created_at ? new Date(emp.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
        }));

        setEmployees(mappedEmployees);
        console.log(`✅ Loaded ${mappedEmployees.length} employees from database`);
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
        text: error.message || 'Failed to load employees from database. Please check the server console for details.',
        confirmButtonColor: '#1a3a5f'
      });
      // Set empty array on error to prevent crashes
      setEmployees([]);
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

    // Fetch employees from database
    fetchEmployees();
    setLoading(false);

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

  // Function to capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleNameChange = (e) => {
    setFormData({ ...formData, name: capitalizeName(e.target.value) });
  };

  // Check password strength
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength('');
      return;
    }

    let strength = 0;

    // Check length (at least 8 characters)
    if (password.length >= 8) {
      strength += 1;
    }

    // Check for lowercase letters
    if (/[a-z]/.test(password)) {
      strength += 1;
    }

    // Check for uppercase letters
    if (/[A-Z]/.test(password)) {
      strength += 1;
    }

    // Check for numbers
    if (/[0-9]/.test(password)) {
      strength += 1;
    }

    // Check for special characters
    if (/[^a-zA-Z0-9]/.test(password)) {
      strength += 1;
    }

    // Determine strength level
    if (strength <= 2) {
      setPasswordStrength('weak');
    } else if (strength <= 3) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  };

  // Format number with commas every 3 digits (e.g. 500000 → 500,000)
  const formatNumberWithCommas = (value) => {
    if (!value) return '';
    const numericValue = value.toString().replace(/\D/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSalaryChange = (e) => {
    setFormData({ ...formData, salary: formatNumberWithCommas(e.target.value) });
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddingEmployee(true);

    try {
      // Validate that full name has exactly two spaces (three names)
      const nameParts = formData.name.trim().split(/\s+/);
      if (nameParts.length !== 3) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Name',
          text: 'Full name must contain exactly 3 names (First Name, Middle Name, Last Name) separated by spaces.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingEmployee(false);
        return;
      }

      // Validate phone number is exactly 9 digits
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 9) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: 'Phone number must contain exactly 9 digits (e.g., 712345678).',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingEmployee(false);
        return;
      }

      // Format phone number with +255 prefix
      const phoneNumber = '+255' + phoneDigits;

      const salaryNum = formData.salary ? parseFloat(String(formData.salary).replace(/,/g, '')) : null;

      // Prepare employee data for database
      const employeeData = {
        name: formData.name.trim(),
        phone: phoneNumber,
        position: formData.position,
        department: formData.department,
        password: formData.password,
        salary: salaryNum
      };

      // Insert employee into database
      const response = await addEmployee(employeeData);

      if (response.success) {
        // Refresh employees list from database
        await fetchEmployees();

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Employee added successfully to database.',
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({ name: '', phone: '', position: '', department: '', password: '', salary: '', status: 'Active' });
        setPasswordStrength('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add employee. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleEdit = (employee) => {
    // Extract phone number without +255 prefix for editing
    const phoneDigits = employee.phone ? employee.phone.replace(/^\+255/, '') : '';

    setEditingEmployee(employee);
    setFormData({
      name: capitalizeName(employee.name || ''),
      phone: phoneDigits,
      position: employee.position || '',
      department: employee.department || '',
      password: '', // Don't pre-fill password for security
      salary: employee.salary != null ? formatNumberWithCommas(String(employee.salary)) : ''
    });
    setPasswordStrength('');
    setShowPassword(false);
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setUpdatingEmployee(true);

    try {
      // Validate that full name has exactly two spaces (three names)
      const nameParts = formData.name.trim().split(/\s+/);
      if (nameParts.length !== 3) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Name',
          text: 'Full name must contain exactly 3 names (First Name, Middle Name, Last Name) separated by spaces.',
          confirmButtonColor: '#1a3a5f'
        });
        setUpdatingEmployee(false);
        return;
      }

      // Validate phone number is exactly 9 digits
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 9) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone Number',
          text: 'Phone number must contain exactly 9 digits (e.g., 712345678).',
          confirmButtonColor: '#1a3a5f'
        });
        setUpdatingEmployee(false);
        return;
      }

      // Format phone number with +255 prefix
      const phoneNumber = '+255' + phoneDigits;

      // Prepare employee data for database
      const employeeData = {
        name: formData.name.trim(),
        phone: phoneNumber,
        position: formData.position,
        department: formData.department
      };

      // Only include password if it was changed
      if (formData.password && formData.password.trim() !== '') {
        employeeData.password = formData.password;
      }

      // Update employee in database
      const response = await updateEmployee(editingEmployee.id, employeeData);

      if (response.success) {
        // Refresh employees list from database
        await fetchEmployees();

        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Employee informations updated successfully.',
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });

        setFormData({ name: '', phone: '', position: '', department: '', password: '', salary: '' });
        setPasswordStrength('');
        setEditingEmployee(null);
        setShowEditModal(false);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update employee. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setUpdatingEmployee(false);
    }
  };

  const handleDelete = async (id) => {
    const employee = employees.find(emp => emp.id === id);
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${capitalizeName(employee?.name) || 'this employee'}? This action cannot be undone.`,
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
        // Delete employee from database
        const response = await deleteEmployee(id);

        if (response.success) {
          // Refresh employees list from database
          await fetchEmployees();

          Swal.fire({
            title: 'Deleted!',
            text: 'Employee informations has been deleted.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete employee. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    }
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.position && emp.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.department && emp.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const departments = [ 'Administration', 'Finance', 'Sales', 'Service'];
  const positions = ['Accountant', 'Admin', 'Cashier', 'Manager', 'Sales Representative', 'Store Keeper', 'Technician'];

  const formatCurrency = (amount) => {
    const num = amount == null || amount === '' ? 0 : Number(amount);
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(Number.isNaN(num) ? 0 : num);
  };

  // Official email service providers
  const allowedEmailProviders = [
    'gmail.com',
    'yahoo.com',
    'icloud.com',
    'outlook.com',
    'hotmail.com',
    'aol.com',
    'protonmail.com',
    'zoho.com',
    'mail.com',
    'yandex.com'
  ];

  return (
    <div className="employees-container">
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
          <Link to="/admin/employees" className="nav-item active">
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
        <header className="employees-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.employees}</h1>
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
              <span className="user-name">{capitalizeName(user?.username || user?.full_name || 'Admin')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Employees Content */}
        <div className="employees-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${t.employees.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus /> {t.addEmployee}
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalEmployees}</h3>
                <p className="stat-value">{employees.length}</p>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="table-container">
            <table className="employees-table">
              <thead>
                <tr>
                  <th>{t.name}</th>
                  <th>{t.phone}</th>
                  <th>{t.position}</th>
                  <th>{t.department}</th>
                  <th>Salary (TZS)</th>
                  <th>{t.password}</th>
                  <th>{t.joinDate}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="employee-name">
                          <FaIdCard className="name-icon" />
                          {capitalizeName(employee.name)}
                        </div>
                      </td>
                      <td>
                        <div className="employee-phone">
                          <FaPhone className="phone-icon" />
                          {employee.phone}
                        </div>
                      </td>
                      <td>{employee.position}</td>
                      <td>
                        <span className="department-badge">{employee.department}</span>
                      </td>
                      <td>{formatCurrency(employee.salary)}</td>
                      <td>
                        <div className="password-display">
                          {employee.password ? (
                            <span className="password-text" title="Click to see full password">
                              {employee.password}
                            </span>
                          ) : (
                            <span className="no-password">N/A</span>
                          )}
                        </div>
                      </td>
                      <td>{employee.joinDate}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn edit" title="Edit Employee" onClick={() => handleEdit(employee)}>
                            <FaEdit className="action-icon" />
                            <span className="action-text">Edit</span>
                          </button>
                          <button className="action-btn delete" title="Delete Employee" onClick={() => handleDelete(employee.id)}>
                            <FaTrash className="action-icon" />
                            <span className="action-text">Delete</span>
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

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.addEmployee}</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddEmployee} className="employee-form">
              <div className="form-group">
                <label>{t.fullName} *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder={t.fullName}
                  pattern=".*\s.*\s.*"
                  title="Please enter 3 names separated by spaces (e.g., John Michael Doe)"
                />
              </div>
              <div className="form-group">
                <label>{t.phone} *</label>
                <div className="phone-input-wrapper">
                  <span className="phone-prefix">
                    <span className="flag-icon">🇹🇿</span>
                    <span className="country-code">+255</span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow digits, max 9 digits
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
                    placeholder="712345678"
                    className="phone-input"
                    maxLength="9"
                    pattern="[0-9]{9}"
                    title="Enter exactly 9 digits (e.g., 712345678)"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.position} *</label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option value="">{t.position}</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t.department} *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">{t.department}</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Salary (TZS)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.salary}
                  onChange={handleSalaryChange}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>{t.password} *</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setFormData({ ...formData, password: newPassword });
                      checkPasswordStrength(newPassword);
                    }}
                    placeholder={t.password}
                    className={`password-input ${passwordStrength ? `password-${passwordStrength}` : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="password-icon" />
                    ) : (
                      <FaEye className="password-icon" />
                    )}
                  </button>
                </div>
                {passwordStrength && (
                  <div className={`password-strength ${passwordStrength}`}>
                    <span className="strength-label">Password Strength: </span>
                    <span className="strength-value">{passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}</span>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddModal(false)} disabled={addingEmployee}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn" disabled={addingEmployee}>
                  {addingEmployee ? t.loading : t.addEmployee}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editingEmployee && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.editEmployee}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateEmployee} className="employee-form">
              <div className="form-group">
                <label>Full Name * (3 names required)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Enter full name (First Middle Last)"
                  pattern=".*\s.*\s.*"
                  title="Please enter 3 names separated by spaces (e.g., John Michael Doe)"
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <div className="phone-input-wrapper">
                  <span className="phone-prefix">
                    <span className="flag-icon">🇹🇿</span>
                    <span className="country-code">+255</span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow digits, max 9 digits
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 9);
                      setFormData({ ...formData, phone: digitsOnly });
                    }}
                    placeholder="712345678"
                    className="phone-input"
                    maxLength="9"
                    pattern="[0-9]{9}"
                    title="Enter exactly 9 digits (e.g., 712345678)"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Position *</label>
                  <select
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  >
                    <option value="">Select position</option>
                    {positions.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Salary (TZS)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.salary}
                  onChange={handleSalaryChange}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    required
                    onChange={(e) => {
                      const newPassword = e.target.value;
                      setFormData({ ...formData, password: newPassword });
                      if (newPassword) {
                        checkPasswordStrength(newPassword);
                      } else {
                        setPasswordStrength('');
                      }
                    }}
                    placeholder="Enter new password"
                    className={`password-input ${passwordStrength ? `password-${passwordStrength}` : ''}`}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="password-icon" />
                    ) : (
                      <FaEye className="password-icon" />
                    )}
                  </button>
                </div>
                {passwordStrength && (
                  <div className={`password-strength ${passwordStrength}`}>
                    <span className="strength-label">Password Strength: </span>
                    <span className="strength-value">{passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}</span>
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={updatingEmployee}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={updatingEmployee}>
                  {updatingEmployee ? 'Updating...' : 'Update Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Employee Details</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>Full Name:</label>
                  <div className="view-value">
                    <FaIdCard className="view-icon" />
                    {capitalizeName(selectedEmployee.name)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Email:</label>
                  <div className="view-value">
                    <FaMail className="view-icon" />
                    {selectedEmployee.email}
                  </div>
                </div>
                <div className="view-item">
                  <label>Phone:</label>
                  <div className="view-value">
                    <FaPhone className="view-icon" />
                    {selectedEmployee.phone}
                  </div>
                </div>
                <div className="view-item">
                  <label>Position:</label>
                  <div className="view-value">{selectedEmployee.position}</div>
                </div>
                <div className="view-item">
                  <label>Department:</label>
                  <div className="view-value">
                    <span className="department-badge">{selectedEmployee.department}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Password:</label>
                  <div className="view-value">{selectedEmployee.password || 'N/A'}</div>
                </div>
                <div className="view-item">
                  <label>Join Date:</label>
                  <div className="view-value">{selectedEmployee.joinDate}</div>
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

export default Employees;

