import React, { useState, useEffect, useMemo } from 'react';
import PageLoader, { TableDataLoader, InlineDataLoader } from '../../components/PageLoader';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaBox,
  FaUsers,
  FaCalendarAlt,
  FaEnvelope,
  FaPaperPlane,
  FaMobileAlt,
  FaHistory,
  FaSearch,
  FaEye,
  FaTrashAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt
} from 'react-icons/fa';
import '../sales/payments.css';
import './messages.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import { getSmsInit, getSmsBalance, getSmsRecipients, getSmsCampaigns, deleteSmsCampaign, sendBulkSms } from '../../services/api';

/** Apply /api/sms/balance (Onfon GET Balance) to the units card. */
function applyUnitsBalanceFromApi(balanceRes, { setSmsUnits, setSmsCredits, setSmsApiReady }) {
  if (!balanceRes) {
    setSmsCredits('—');
    return;
  }

  setSmsApiReady(balanceRes.canSend !== false);

  const unitsRaw = balanceRes.units ?? balanceRes.creditsNumeric;
  const units =
    unitsRaw != null && unitsRaw !== '' && !Number.isNaN(Number(unitsRaw)) ? Number(unitsRaw) : null;

  if (units != null) {
    const n = Math.round(units);
    setSmsUnits(n);
    setSmsCredits(
      balanceRes.unitsDisplay || `${n.toLocaleString('en-US')} ${n === 1 ? 'unit' : 'units'}`
    );
    return;
  }

  if (balanceRes.unitsDisplay) {
    setSmsUnits(null);
    setSmsCredits(balanceRes.unitsDisplay);
    return;
  }

  setSmsUnits(null);
  if (balanceRes.configured === false) {
    setSmsCredits('Not configured');
    setSmsApiReady(false);
  } else if (balanceRes.error) {
    setSmsCredits(balanceRes.error);
  } else if (balanceRes.message) {
    setSmsCredits(balanceRes.message);
  } else {
    setSmsCredits('—');
  }
}

const SMS_TEMPLATES = [
  { id: '', label: 'Custom message' },
  { id: 'payment_reminder', label: 'Loan payment reminder' },
  { id: 'loan_due', label: 'Loan balance due' },
  { id: 'promo', label: 'Promotion / offer' },
  { id: 'thanks', label: 'Thank you' }
];

const TEMPLATE_BODIES = {
  payment_reminder:
    'Habari Ndugu {Customer name}, Tunakukumbusha kulipa deni lako la TZS {Amount}. Tafadhali lipa ili tuendelee kukuhudumia. Piga 0765713467 kwa mawasiliano zaidi.',
  loan_due:
    'Ndugu {Customer name}, Deni lako la mkopo ni TZS {Amount}. Tafadhali lipa kabla ya tarehe iliyowekwa. Piga 0765713467 kwa mawasiliano zaidi.',
  promo:
    'Ofa maalum kutoka Mamuya Auto Spare Parts! Tembelea duka letu leo kwa bei nafuu za spare parts. Karibu sana.',
  thanks:
    'Ndugu {Customer name}, Asante kwa kutuchagua Mamuya Auto Spare Parts & Lubricants. Tunathamini mchango na uaminifu wako.'
};

const SMS_SINGLE_LIMIT = 160;
/** Loan customers audience: payment_type=loan and balance above this (TZS). */
const LOAN_RECIPIENT_MIN_REMAIN = 1000;

const isLoanPaymentType = (value) => String(value ?? '').trim().toLowerCase() === 'loan';

/** Replace {Customer name} / {Amount} (and {name} / {amount}) with recipient data. */
function personalizePreview(template, name, amount) {
  const amountStr =
    amount === '' || amount == null || Number(amount) === 0
      ? '0'
      : typeof amount === 'number'
        ? amount.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : String(amount);
  const customerName = String(name || 'Mteja').trim().toUpperCase() || 'MTEJA';
  return String(template)
    .replace(/\{Customer name\}/gi, customerName)
    .replace(/\{Customer Name\}/gi, customerName)
    .replace(/\{name\}/gi, customerName)
    .replace(/\{Amount\}/gi, amountStr)
    .replace(/\{amount\}/gi, amountStr);
}

function ManagerMessages() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  const [activeTab, setActiveTab] = useState('compose');
  const [templateId, setTemplateId] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [audience, setAudience] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [sendMode, setSendMode] = useState('now');
  const [scheduleAt, setScheduleAt] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsError, setRecipientsError] = useState('');
  const [smsUnits, setSmsUnits] = useState(null);
  const [smsCredits, setSmsCredits] = useState('Loading…');
  const [unitsBalanceLoading, setUnitsBalanceLoading] = useState(false);
  const [sentToday, setSentToday] = useState(0);
  const [failedToday, setFailedToday] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [smsApiReady, setSmsApiReady] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' &&
            (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'));
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    setLoading(false);
    const dateTimeInterval = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(dateTimeInterval);
  }, [navigate]);

  const fetchUnitsBalanceFromApi = async () => {
    setUnitsBalanceLoading(true);
    try {
      const balanceRes = await getSmsBalance();
      applyUnitsBalanceFromApi(balanceRes, { setSmsUnits, setSmsCredits, setSmsApiReady });
      return balanceRes;
    } catch (err) {
      console.error('Onfon balance API error:', err);
      setSmsUnits(null);
      setSmsCredits('Server offline');
      setSmsApiReady(false);
      return null;
    } finally {
      setUnitsBalanceLoading(false);
    }
  };

  /** Load SMS config, balance, and campaigns in one API call. */
  const loadSmsProviderConnection = async () => {
    setUnitsBalanceLoading(true);
    setCampaignsLoading(true);
    setSmsCredits('Loading…');

    try {
      const initRes = await getSmsInit();

      if (!initRes?.success) {
        throw new Error(initRes?.message || 'Cannot reach backend SMS API.');
      }

      const configRes = initRes.config || {};
      const balanceRes = initRes.balance || {};

      if (!configRes.configured) {
        setSmsApiReady(false);
        setSmsUnits(null);
        setSmsCredits('Not configured');
        setCampaigns(Array.isArray(initRes.campaigns) ? initRes.campaigns : []);
        return { configured: false };
      }

      applyUnitsBalanceFromApi(balanceRes, { setSmsUnits, setSmsCredits, setSmsApiReady });
      setSmsApiReady(configRes.canSend !== false && configRes.configured === true);

      if (Array.isArray(initRes.campaigns)) {
        setCampaigns(initRes.campaigns);
      }

      return { configured: true };
    } catch (err) {
      console.error('SMS provider connection error:', err);
      setSmsApiReady(false);
      setSmsUnits(null);
      setSmsCredits('Server offline');
      return { configured: false, offline: true };
    } finally {
      setUnitsBalanceLoading(false);
      setCampaignsLoading(false);
    }
  };

  const fetchCampaignsFromApi = async () => {
    setCampaignsLoading(true);
    try {
      const res = await getSmsCampaigns();
      if (res.success && Array.isArray(res.campaigns)) {
        setCampaigns(res.campaigns);
      }
    } catch (err) {
      console.error('SMS campaigns load error:', err);
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const loadPageData = async (attempt = 0) => {
      if (cancelled) return;

      setRecipientsLoading(true);
      setRecipientsError('');

      const [providerResult, recResult] = await Promise.allSettled([
        loadSmsProviderConnection(),
        getSmsRecipients()
      ]);

      if (cancelled) return;

      if (recResult.status === 'fulfilled') {
        const recRes = recResult.value;
        if (recRes.success && Array.isArray(recRes.recipients)) {
          setRecipients(recRes.recipients);
        } else {
          setRecipientsError(recRes.message || 'Could not load recipients from server.');
        }
      } else {
        console.error('SMS recipients load error:', recResult.reason);
        setRecipientsError(
          recResult.reason?.message || 'Could not load recipients. Is the backend running?'
        );
      }
      setRecipientsLoading(false);

      const result =
        providerResult.status === 'fulfilled' ? providerResult.value : { offline: true };
      if (result?.offline && attempt < 2) {
        setTimeout(() => loadPageData(attempt + 1), 2000);
      }
    };

    loadPageData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      if (audience === 'loan') {
        if (!isLoanPaymentType(r.payment_type)) return false;
        if (Number(r.amount_remain) <= LOAN_RECIPIENT_MIN_REMAIN) return false;
      }
      if (audience === 'outstanding') {
        if (!isLoanPaymentType(r.payment_type)) return false;
        if (Number(r.amount_remain) <= 0 || Number(r.amount_remain) > LOAN_RECIPIENT_MIN_REMAIN) {
          return false;
        }
      }
      if (audience === 'customers' && isLoanPaymentType(r.payment_type)) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.phone.replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    });
  }, [audience, searchTerm, recipients]);

  const charCount = messageBody.length;
  const smsParts = Math.max(1, Math.ceil(charCount / SMS_SINGLE_LIMIT) || 1);

  const selectAllChecked =
    filteredRecipients.length > 0 && filteredRecipients.every((r) => selectedIds.has(r.id));

  const toggleRecipient = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecipients.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecipients.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    if (id && TEMPLATE_BODIES[id]) {
      setMessageBody(TEMPLATE_BODIES[id]);
    }
  };

  const handleClearCompose = () => {
    setTemplateId('');
    setMessageBody('');
    setCampaignName('');
    setSelectedIds(new Set());
    setSendMode('now');
    setScheduleAt('');
  };

  const handleSendBulk = async () => {
    if (!messageBody.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Message required',
        text: 'Enter the SMS text before sending.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    if (selectedIds.size === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No recipients',
        text: 'Select at least one recipient.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    if (sendMode === 'schedule' && !scheduleAt) {
      Swal.fire({
        icon: 'warning',
        title: 'Schedule required',
        text: 'Choose date and time for scheduled sending.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    const selected = recipients.filter((r) => selectedIds.has(r.id));
    const confirm = await Swal.fire({
      icon: 'question',
      title: sendMode === 'now' ? 'Send messages?' : 'Schedule campaign?',
      html: `Send to <strong>${selected.length}</strong> recipient(s) via Onfon SMS?`,
      showCancelButton: true,
      confirmButtonColor: '#1a3a5f',
      cancelButtonColor: '#6c757d',
      confirmButtonText: sendMode === 'now' ? 'Send now' : 'Schedule'
    });
    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await sendBulkSms({
        campaignName: campaignName.trim() || 'Messages',
        message: messageBody.trim(),
        recipients: selected.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          amount_remain: r.amount_remain
        })),
        scheduleAt: sendMode === 'schedule' ? scheduleAt : null
      });

      if (res.success) {
        const sent = res.sent ?? selected.length;
        const failed = res.failed ?? 0;
        setSentToday((n) => n + sent);
        setFailedToday((n) => n + failed);

        await fetchCampaignsFromApi();
        await loadSmsProviderConnection();

        Swal.fire({
          icon: 'success',
          title: res.scheduled ? 'Scheduled' : 'Sent',
          text: res.message || `SMS processed for ${sent} recipient(s).`,
          confirmButtonColor: '#1a3a5f'
        });
        handleClearCompose();
      } else {
        const sent = res.sent ?? 0;
        const failed = res.failed ?? selected.length;
        if (sent > 0) {
          setSentToday((n) => n + sent);
          setFailedToday((n) => n + failed);
          await fetchCampaignsFromApi();
          await fetchUnitsBalanceFromApi();
        }
        throw new Error(res.message || res.errorDescription || 'Send failed');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'SMS failed',
        text: err.message || 'Could not send via Onfon. Check server .env and Onfon credentials.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setSubmitting(false);
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

  const firstSelected = useMemo(
    () => recipients.find((r) => selectedIds.has(r.id)),
    [recipients, selectedIds]
  );

  const previewText = messageBody.trim()
    ? personalizePreview(
        messageBody,
        firstSelected?.name,
        firstSelected?.amount_remain
      )
    : 'Your message will appear here. Use {Customer name} and {Amount} for loan payment reminders.';

  if (loading) {
    return <PageLoader message={t.loading || 'Loading...'} />;
  }

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/messages" className={'nav-item ' + (location.pathname === '/manager/messages' ? 'active' : '')}>
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/manager/sales" className={'nav-item ' + (location.pathname === '/manager/sales' ? 'active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Messages</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time">
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.full_name || user?.username || 'Manager'}</span>
            </div>
            <button type="button" className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <div className="bulk-sms-stats">
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon primary">
                <FaUsers />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Selected recipients</div>
                <div className="bulk-sms-stat-value">{selectedIds.size}</div>
              </div>
            </div>
            <div className="bulk-sms-stat-card bulk-sms-stat-card-units">
              <div className="bulk-sms-stat-icon success">
                <FaMobileAlt />
              </div>
              <div className="bulk-sms-stat-units-body">
                <div className="bulk-sms-stat-label-row">
                  <span className="bulk-sms-stat-label">SMS units (Onfon)</span>
                  <button
                    type="button"
                    className="bulk-sms-refresh-units-btn"
                    title="Refresh balance from Onfon API"
                    disabled={unitsBalanceLoading}
                    onClick={() => loadSmsProviderConnection()}
                  >
                    <FaSyncAlt className={unitsBalanceLoading ? 'spin' : ''} />
                  </button>
                </div>
                <div className="bulk-sms-stat-value bulk-sms-stat-value-units">
                  {unitsBalanceLoading ? 'Loading…' : smsCredits}
                </div>
                {smsUnits != null && !unitsBalanceLoading && (
                  <div className="bulk-sms-stat-units-api">via Onfon balance API</div>
                )}
              </div>
            </div>
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon warning">
                <FaCheckCircle />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Sent this session</div>
                <div className="bulk-sms-stat-value">{sentToday}</div>
              </div>
            </div>
            <div className="bulk-sms-stat-card">
              <div className="bulk-sms-stat-icon danger">
                <FaExclamationTriangle />
              </div>
              <div>
                <div className="bulk-sms-stat-label">Failed this session</div>
                <div className="bulk-sms-stat-value">{failedToday}</div>
              </div>
            </div>
          </div>

          <div className="bulk-sms-tabs">
            <button
              type="button"
              className={`bulk-sms-tab ${activeTab === 'compose' ? 'active' : ''}`}
              onClick={() => setActiveTab('compose')}
            >
              <FaPaperPlane /> Compose &amp; send
            </button>
            <button
              type="button"
              className={`bulk-sms-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FaHistory /> Campaign history
            </button>
          </div>

          {activeTab === 'compose' ? (
            <div className="bulk-sms-layout">
              <div>
                <div className="bulk-sms-panel" style={{ marginBottom: '20px' }}>
                  <div className="bulk-sms-panel-header">
                    <h3>
                      <FaEnvelope /> Message
                    </h3>
                  </div>
                  <div className="bulk-sms-panel-body">
                    <div className="bulk-sms-field">
                      <label htmlFor="campaign-name">Campaign name</label>
                      <input
                        id="campaign-name"
                        type="text"
                        placeholder="e.g. March payment reminders"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div className="bulk-sms-field">
                      <label htmlFor="sms-template">Template</label>
                      <select
                        id="sms-template"
                        value={templateId}
                        onChange={(e) => handleTemplateChange(e.target.value)}
                      >
                        {SMS_TEMPLATES.map((tpl) => (
                          <option key={tpl.id || 'custom'} value={tpl.id}>
                            {tpl.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bulk-sms-field">
                      <label htmlFor="sms-body">Message</label>
                      <textarea
                        id="sms-body"
                        placeholder="Type your SMS. Placeholders: {Customer name}, {Amount}"
                        value={messageBody}
                        onChange={(e) => setMessageBody(e.target.value)}
                        maxLength={640}
                      />
                      <div className="bulk-sms-char-row">
                        <span>
                          {charCount} characters · {smsParts} SMS part{smsParts > 1 ? 's' : ''}
                        </span>
                        <span className={charCount > SMS_SINGLE_LIMIT ? 'over-limit' : ''}>
                          {charCount > SMS_SINGLE_LIMIT ? 'Long message (multi-part)' : 'Single SMS'}
                        </span>
                      </div>
                    </div>
                    <div className="bulk-sms-field">
                      <label>When to send</label>
                      <div className="bulk-sms-schedule-row">
                        <label className="bulk-sms-schedule-option">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={sendMode === 'now'}
                            onChange={() => setSendMode('now')}
                          />
                          Send now
                        </label>
                        <label className="bulk-sms-schedule-option">
                          <input
                            type="radio"
                            name="sendMode"
                            checked={sendMode === 'schedule'}
                            onChange={() => setSendMode('schedule')}
                          />
                          Schedule
                        </label>
                        {sendMode === 'schedule' && (
                          <input
                            type="datetime-local"
                            value={scheduleAt}
                            onChange={(e) => setScheduleAt(e.target.value)}
                            style={{ maxWidth: '220px' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bulk-sms-panel">
                  <div className="bulk-sms-panel-header">
                    <h3>
                      <FaUsers /> Recipients
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                      {filteredRecipients.length} shown
                    </span>
                  </div>
                  <div className="bulk-sms-panel-body">
                    <div className="bulk-sms-field">
                      <label>Audience</label>
                      <div className="bulk-sms-audience-chips">
                        {[
                          { id: 'all', label: 'All' },
                          { id: 'customers', label: 'Customers' },
                          { id: 'loan', label: 'Loan customers (> TZS 1,000)' },
                          { id: 'outstanding', label: 'Outstanding balance' }
                        ].map((chip) => (
                          <button
                            key={chip.id}
                            type="button"
                            className={`bulk-sms-audience-chip ${audience === chip.id ? 'active' : ''}`}
                            onClick={() => setAudience(chip.id)}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="bulk-sms-toolbar">
                      <div className="bulk-sms-search">
                        <FaSearch className="bulk-sms-search-icon" />
                        <input
                          type="text"
                          placeholder="Search name or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <button type="button" className="bulk-sms-btn bulk-sms-btn-ghost" onClick={toggleSelectAll}>
                        {selectAllChecked ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="bulk-sms-recipients-table-wrap">
                      {recipientsError && (
                        <div className="bulk-sms-recipients-error">{recipientsError}</div>
                      )}
                      <table className="bulk-sms-recipients-table">
                        <thead>
                          <tr>
                            <th className="tc">
                              <input
                                type="checkbox"
                                checked={selectAllChecked}
                                onChange={toggleSelectAll}
                                aria-label="Select all"
                              />
                            </th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Group</th>
                            <th>Amount remain</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recipientsLoading ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                Loading recipients…
                              </td>
                            </tr>
                          ) : filteredRecipients.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                                No recipients match this filter.
                              </td>
                            </tr>
                          ) : (
                            filteredRecipients.map((r) => (
                              <tr key={r.id}>
                                <td className="tc">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(r.id)}
                                    onChange={() => toggleRecipient(r.id)}
                                    aria-label={`Select ${r.name}`}
                                  />
                                </td>
                                <td>{r.name}</td>
                                <td>{r.phone}</td>
                                <td style={{ textTransform: 'capitalize' }}>{r.group}</td>
                                <td>
                                  {r.amount_remain > 0
                                    ? `TZS ${Number(r.amount_remain).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                                    : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="bulk-sms-actions">
                      <button
                        type="button"
                        className="bulk-sms-btn bulk-sms-btn-primary"
                        onClick={handleSendBulk}
                        disabled={submitting || !smsApiReady}
                      >
                        <FaPaperPlane />
                        {submitting
                          ? 'Sending…'
                          : sendMode === 'now'
                            ? 'Send messages'
                            : 'Schedule campaign'}
                      </button>
                      <button type="button" className="bulk-sms-btn bulk-sms-btn-ghost" onClick={handleClearCompose}>
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bulk-sms-panel">
                <div className="bulk-sms-panel-header">
                  <h3>
                    <FaMobileAlt /> Preview
                  </h3>
                </div>
                <div className="bulk-sms-panel-body" style={{ padding: 0 }}>
                  <div className="bulk-sms-preview">
                    <div className="bulk-sms-preview-label">SMS preview</div>
                    <div className="bulk-sms-phone-mock">{previewText}</div>
                    <div className="bulk-sms-preview-meta">
                      <p>
                        <strong>From:</strong> Mamuya Auto
                      </p>
                      <p>
                        <strong>Recipients:</strong> {selectedIds.size} selected
                      </p>
                      <p>
                        <strong>Est. parts:</strong> {selectedIds.size * smsParts} SMS segment(s)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bulk-sms-panel bulk-sms-history-panel">
              <div className="bulk-sms-panel-header">
                <h3>
                  <FaHistory /> Past campaigns
                </h3>
                <button type="button" className="bulk-sms-btn bulk-sms-btn-secondary" onClick={() => setActiveTab('compose')}>
                  <FaPaperPlane /> New campaign
                </button>
              </div>
              <div className="bulk-sms-panel-body" style={{ padding: 0 }}>
                <table className="bulk-sms-history-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Date</th>
                      <th>Recipients</th>
                      <th>Sent</th>
                      <th>Failed</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignsLoading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                          Loading campaign history…
                        </td>
                      </tr>
                    ) : campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                          No campaigns yet. Send your first message from the Compose tab.
                        </td>
                      </tr>
                    ) : (
                      campaigns.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.date}</td>
                        <td>{c.recipients}</td>
                        <td>{c.sent}</td>
                        <td>{c.failed}</td>
                        <td>
                          <span className={`bulk-sms-status ${c.status}`}>{c.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="bulk-sms-icon-btn"
                            title="View"
                            onClick={() =>
                              Swal.fire({
                                icon: 'info',
                                title: c.name,
                                html: `<p><strong>Date:</strong> ${c.date}</p><p><strong>Recipients:</strong> ${c.recipients}</p><p><strong>Sent:</strong> ${c.sent} · <strong>Failed:</strong> ${c.failed}</p><p><strong>Status:</strong> ${c.status}</p>`,
                                confirmButtonColor: '#1a3a5f'
                              })
                            }
                          >
                            <FaEye />
                          </button>
                          <button
                            type="button"
                            className="bulk-sms-icon-btn"
                            title="Delete"
                            onClick={async () => {
                              const confirmDelete = await Swal.fire({
                                icon: 'warning',
                                title: 'Delete campaign?',
                                text: `"${c.name}" will be removed from history.`,
                                showCancelButton: true,
                                confirmButtonColor: '#dc3545',
                                cancelButtonColor: '#6c757d',
                                confirmButtonText: 'Delete'
                              });
                              if (!confirmDelete.isConfirmed) return;
                              try {
                                await deleteSmsCampaign(c.id);
                                setCampaigns((prev) => prev.filter((x) => x.id !== c.id));
                              } catch (err) {
                                Swal.fire({
                                  icon: 'error',
                                  title: 'Delete failed',
                                  text: err.message || 'Could not delete campaign.',
                                  confirmButtonColor: '#1a3a5f'
                                });
                              }
                            }}
                          >
                            <FaTrashAlt />
                          </button>
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManagerMessages;
