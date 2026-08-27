import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCog, FaBox, FaUsers, FaChartLine, FaShoppingCart, FaMoneyBillAlt } from 'react-icons/fa';
import './Home.css';
import logo from '../images/logo.png';

function Home() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const features = [
    { icon: <FaBox />, title: 'Spare Parts Management', description: 'Efficiently manage your inventory' },
    { icon: <FaUsers />, title: 'Employee Management', description: 'Track and manage your team' },
    { icon: <FaShoppingCart />, title: 'Sales Tracking', description: 'Monitor your sales performance' },
    { icon: <FaChartLine />, title: 'Analytics Dashboard', description: 'Get insights into your business' },
    { icon: <FaMoneyBillAlt />, title: 'Financial Management', description: 'Track finances and expenses' },
    { icon: <FaCog />, title: 'System Settings', description: 'Customize your system preferences' }
  ];

  return (
    <div className="home">
      {/* Header */}
      <header className="home-header">
        <div className="header-content">
          <img src={logo} alt="Mamuya Auto Spare Parts Logo" className="header-logo" />
          <h2 className="header-title">Mamuya Auto Spare Parts</h2>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to <span className="highlight">Mamuya Auto Spare Parts</span> Management System
          </h1>
          <p className="hero-description">
            Streamline your business operations with our comprehensive management system. 
            Manage inventory, track sales, monitor finances, and optimize your workflow all in one place.
          </p>
          <button className="cta-button" onClick={handleGetStarted}>
            Get Started
            <span className="button-arrow">→</span>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">System Features</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <p className="footer-text">
            &copy; 2026 Mamuya Auto Spare Parts Management System. All rights reserved.
          </p>
          <p className="footer-note">
            This system is the exclusive property of Mamuya Auto Spare Parts
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
