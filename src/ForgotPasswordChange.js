import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import borgImg from "./assets/imgs/borg_img.jpg";

function ForgotPasswordChange() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!userId || !token) {
      setError("Invalid reset request. Please verify your email again.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/change`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resetToken: token, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: 40,
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <img
            src={borgImg}
            alt="Borg Manila"
            style={{
              maxWidth: "60%",
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Change Password</h2>
        <p style={{ marginTop: 0, marginBottom: 20, color: "#555", fontSize: 14 }}>
          Set your new password.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: 10,
              borderRadius: 4,
              marginBottom: 15,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "#d4edda",
              color: "#155724",
              padding: 10,
              borderRadius: 4,
              marginBottom: 15,
            }}
          >
            Password changed successfully. Redirecting to login...
          </div>
        )}

        <form onSubmit={handleResetPassword}>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: "block", marginBottom: 5 }}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 5 }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 4,
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              width: "100%",
              padding: 10,
              backgroundColor: success ? "#28a745" : "#CD1543",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              cursor: loading || success ? "not-allowed" : "pointer",
              opacity: loading || success ? 0.8 : 1,
            }}
          >
            {loading ? "Updating..." : success ? "Done" : "Update Password"}
          </button>
        </form>

        <div style={{ marginTop: 15, textAlign: "center", fontSize: 13 }}>
          <Link to="/forgot-password" style={{ color: "#CD1543", textDecoration: "none" }}>
            Back
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordChange;
