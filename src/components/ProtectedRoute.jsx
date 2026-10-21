import { Navigate, useLocation } from "react-router-dom";

function isLoggedIn() {
  const token = localStorage.getItem("access_token");
  if (!token) return false;

  // Reject tokens that have already expired (a JWT payload holds "exp")
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      return false;
    }
  } catch {
    // Not a readable JWT: let the server decide
  }
  return true;
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isLoggedIn()) {
    // Send them to login and remember where they wanted to go
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}