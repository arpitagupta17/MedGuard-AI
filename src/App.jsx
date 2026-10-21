import "./App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import { enforceRememberMe } from "./utils/session"; // ADDED

import Home from "./pages/home/home";
import VerifyMedicine from "./pages/verify/verify";
import Login from "./pages/login/login";

import Signup from "./pages/signup/signup";
import Dashboard from "./pages/dashboard/dashboard";
import Medicines from "./pages/medicines/medicines";
import History from "./pages/history/history";
import Reports from "./pages/reports/reports";
import Settings from "./pages/settings/settings";

// ADDED: if "Remember me" was off and the browser was closed, log out
enforceRememberMe();

function AppShell() {
  const location = useLocation();

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
      {!isAppArea && <Navbar />}

      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Pages that need an account: logged-out users go to /login */}
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <VerifyMedicine />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medicines"
          element={
            <ProtectedRoute>
              <Medicines />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Routes>

      {!isAppArea && <Footer />}
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