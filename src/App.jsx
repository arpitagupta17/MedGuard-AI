import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/home/home";
import VerifyMedicine from "./pages/verify/verify";
import Login from "./pages/login/login";
import Signup from "./pages/signup/signup";
import Dashboard from "./pages/dashboard/dashboard";
import Medicines from "./pages/medicines/medicines";
import History from "./pages/history/history";
import Reports from "./pages/reports/reports";
import Settings from "./pages/settings/settings";

function AppShell() {
  const location = useLocation();

  // Pages that use the dashboard layout
  const appRoutes = [
    "/dashboard",
    "/medicines",
    "/history",
    "/reports",
    "/settings",
  ];

  const isAppArea = appRoutes.includes(location.pathname);

  return (
    <div className={`app ${isAppArea ? "app--dashboard-area" : ""}`}>
      
      {/* Main website Navbar */}
      {!isAppArea && <Navbar />}

      {/* Page Content */}
      <main className="app-content">
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<Home />} />
          <Route path="/verify" element={<VerifyMedicine />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Dashboard Pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      {/* Footer appears on ALL pages */}
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;