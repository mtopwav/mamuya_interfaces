import React, { Suspense, useCallback, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getTheme, applyTheme } from './utils/theme';
import { getSectionFromPath } from './utils/settingsSection';
import useAutoLogout from './utils/useAutoLogout';
import PageLoader from './components/PageLoader';
import './App.css';

const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/login'));
const Dashboard = React.lazy(() => import('./pages/admin/dashboard'));
const SalesSpareParts = React.lazy(() => import('./pages/sales/spareparts'));
const SalesDashboard = React.lazy(() => import('./pages/sales/dashboard'));
const SalesCustomerInfo = React.lazy(() => import('./pages/sales/customer_info'));
const GenerateSales = React.lazy(() => import('./pages/sales/generate_sales'));
const SalesPayments = React.lazy(() => import('./pages/sales/payments'));
const SalesInfo = React.lazy(() => import('./pages/sales/sales_reports'));
const SpareParts = React.lazy(() => import('./pages/admin/spareparts'));
const Sales = React.lazy(() => import('./pages/admin/sales'));
const Employees = React.lazy(() => import('./pages/admin/employees'));
const Finances = React.lazy(() => import('./pages/admin/finances'));
const AdminReports = React.lazy(() => import('./pages/admin/reports'));
const AdminTransactions = React.lazy(() => import('./pages/admin/transactions'));
const Messages = React.lazy(() => import('./pages/admin/messages'));
const Settings = React.lazy(() => import('./pages/admin/setting'));
const CategoriesBrands = React.lazy(() => import('./pages/admin/categories&brands'));
const AccountantDashboard = React.lazy(() => import('./pages/finance/accountant/dashboard'));
const AccountantTransactions = React.lazy(() => import('./pages/finance/accountant/transactions'));
const AccountantLoans = React.lazy(() => import('./pages/finance/accountant/loans'));
const AccountantInvoices = React.lazy(() => import('./pages/finance/accountant/invoices'));
const AccountantReports = React.lazy(() => import('./pages/finance/accountant/reports'));
const AccountantSalaries = React.lazy(() => import('./pages/finance/accountant/salaries'));
const AccountantExpenses = React.lazy(() => import('./pages/finance/accountant/expenses'));
const AccountantRevenues = React.lazy(() => import('./pages/finance/accountant/revenues'));
const CashierDashboard = React.lazy(() => import('./pages/finance/cashier/dashboard'));
const CashierTransactions = React.lazy(() => import('./pages/finance/cashier/transactions'));
const CashierReceipts = React.lazy(() => import('./pages/finance/cashier/receipts'));
const CashierReports = React.lazy(() => import('./pages/finance/cashier/reports'));
const CashierLoans = React.lazy(() => import('./pages/finance/cashier/loans'));
const ManagerDashboard = React.lazy(() => import('./pages/manager/dashboard'));
const ManagerTransactions = React.lazy(() => import('./pages/manager/transactions'));
const ManagerLoans = React.lazy(() => import('./pages/manager/loans'));
const ManagerReports = React.lazy(() => import('./pages/manager/reports'));
const ManagerSales = React.lazy(() => import('./pages/manager/sales'));
const ManagerSpareparts = React.lazy(() => import('./pages/manager/spareparts'));
const ManagerGenerateSales = React.lazy(() => import('./pages/manager/generateSales'));
const ManagerCustomersInfo = React.lazy(() => import('./pages/manager/customersInfo'));
const ManagerMessages = React.lazy(() => import('./pages/manager/messages'));

// Applies the current section's theme when route changes so admin/sales/finance/manager each keep their own theme
function ThemeApplicator() {
  const location = useLocation();
  useEffect(() => {
    const section = getSectionFromPath(location.pathname);
    const theme = getTheme(section);
    applyTheme(theme, section);
  }, [location.pathname]);
  return null;
}

function AutoLogoutWatcher() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnProtectedSection = () => {
    const path = location.pathname || '';
    const protectedPrefixes = [
      '/sales',
      '/finance/cashier',
      '/finance/accountant',
      '/manager',
      '/admin',
    ];
    return protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  };

  const onLogout = useCallback(() => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  }, [navigate]);

  const enabled = (localStorage.getItem('user') || sessionStorage.getItem('user')) && isOnProtectedSection();

  useAutoLogout({
    enabled: Boolean(enabled),
    inactivityMs: 30 * 60 * 1000,
    warningMs: 30 * 1000,
    onLogout,
  });

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeApplicator />
      <AutoLogoutWatcher />
      <Suspense fallback={<PageLoader message="Loading..." />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/spareparts" element={<SpareParts />} />
          <Route path="/admin/sales" element={<Sales />} />
          <Route path="/admin/employees" element={<Employees />} />
          <Route path="/admin/finances" element={<Finances />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/messages" element={<Messages />} />
          <Route path="/admin/categories-brands" element={<CategoriesBrands />} />
          <Route path="/admin/settings" element={<Settings />} />

          {/* Employee Routes */}
          <Route path="/sales/dashboard" element={<SalesDashboard />} />
          <Route path="/sales/customer_info" element={<SalesCustomerInfo />} />
          <Route path="/sales/generate_sales" element={<GenerateSales />} />
          <Route path="/sales/payments" element={<SalesPayments />} />
          <Route path="/sales/spareparts" element={<SalesSpareParts />} />
          <Route path="/sales/sales_reports" element={<SalesInfo />} />

          {/* Finance Employee Routes */}
          <Route path="/finance/accountant/dashboard" element={<AccountantDashboard />} />
          <Route path="/finance/accountant/transactions" element={<AccountantTransactions />} />
          <Route path="/finance/accountant/loans" element={<AccountantLoans />} />
          <Route path="/finance/accountant/expenses" element={<AccountantExpenses />} />
          <Route path="/finance/accountant/revenues" element={<AccountantRevenues />} />
          <Route path="/finance/accountant/reports" element={<AccountantReports />} />
          <Route path="/finance/accountant/invoices" element={<AccountantInvoices />} />
          <Route path="/finance/accountant/salaries" element={<AccountantSalaries />} />
          <Route path="/finance/cashier/dashboard" element={<CashierDashboard />} />
          <Route path="/finance/cashier/transactions" element={<CashierTransactions />} />
          <Route path="/finance/cashier/reports" element={<CashierReports />} />
          <Route path="/finance/cashier/receipts" element={<CashierReceipts />} />
          <Route path="/finance/cashier/loans" element={<CashierLoans />} />

          {/* Manager Routes */}
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/transactions" element={<ManagerTransactions />} />
          <Route path="/manager/loans" element={<ManagerLoans />} />
          <Route path="/manager/messages" element={<ManagerMessages />} />
          <Route path="/manager/reports" element={<ManagerReports />} />
          <Route path="/manager/sales" element={<ManagerSales />} />
          <Route path="/manager/generate-sales" element={<ManagerGenerateSales />} />
          <Route path="/manager/spareparts" element={<ManagerSpareparts />} />
          <Route path="/manager/customers-info" element={<ManagerCustomersInfo />} />

          {/* Redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
