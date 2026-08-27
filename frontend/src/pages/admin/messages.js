import React, { useState, useEffect } from 'react';
import PageLoader from '../../components/PageLoader';
import { useNavigate, Link } from 'react-router-dom';
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
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import logo from '../../images/logo.png';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import Swal from 'sweetalert2';

function Messages() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        navigate('/login');
        return;
      }
    } else {
      setLoading(false);
      navigate('/login');
      return;
    }

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

  if (loading) {
    return <PageLoader message={t.loading} />;
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} style={{
        width: sidebarOpen ? '260px' : '70px',
        background: 'linear-gradient(180deg, #1a3a5f 0%, #152d47 100%)',
        color: 'white',
        transition: 'all 0.3s ease',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <img src={logo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 600, whiteSpace: 'nowrap', opacity: sidebarOpen ? 1 : 0, transition: 'opacity 0.3s' }}>Mamuya System</span>
        </div>
        
        <nav style={{ padding: '20px 0' }}>
          <Link to="/admin/dashboard" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaChartLine style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaTags style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaBox style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaShoppingCart style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaUsers style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.employees}</span>
          </Link>
          <Link to="/admin/finances" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaMoneyBillAlt style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.finances}</span>
          </Link>
          <Link
            to="/admin/transactions"
            className={'nav-item' + (window.location.pathname === '/admin/transactions' ? ' active' : '')}
            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}
          >
            <FaCalendarAlt style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>Transactions</span>
          </Link>
          <Link to="/admin/messages" className="nav-item active" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'white', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid #f4a261', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
            <FaEnvelope style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.messages}</span>
          </Link>
          <Link to="/admin/reports" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaChartBar style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.reports || 'Reports'}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', color: 'rgba(255, 255, 255, 0.8)', textDecoration: 'none', transition: 'all 0.3s', borderLeft: '3px solid transparent' }}>
            <FaCog style={{ fontSize: '1.2rem', minWidth: '20px' }} />
            <span style={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0, overflow: 'hidden', transition: 'opacity 0.3s' }}>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: sidebarOpen ? '260px' : '70px', transition: 'margin-left 0.3s ease', minHeight: '100vh', padding: '30px' }}>
        <header style={{ background: 'white', padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', marginBottom: '30px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#1a3a5f', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}>
              <FaBars />
            </button>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 600, color: '#1a3a5f', margin: 0 }}>{t.messages}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1a3a5f' }}>
              <FaUser style={{ fontSize: '1.2rem' }} />
              <span style={{ fontWeight: 500 }}>{user?.username || 'Admin'}</span>
            </div>
            <button onClick={handleLogout} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>
        <div style={{ background: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>
          <h1>{t.messages}</h1>
          <p>{t.messages} management page coming soon...</p>
        </div>
      </div>
    </div>
  );
}

export default Messages;
