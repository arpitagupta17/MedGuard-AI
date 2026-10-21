import { useNavigate } from "react-router-dom";
import { HiOutlineLogout } from "react-icons/hi";
import "./LogoutButton.css";

// Small Logout button shown in the top-right corner of the app pages.
export default function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    localStorage.removeItem("rememberMe");
    navigate("/login", { replace: true });
  }

  return (
    <button type="button" className="mg-logout-btn" onClick={handleLogout}>
      <HiOutlineLogout aria-hidden="true" />
      Logout
    </button>
  );
}
