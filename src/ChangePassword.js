import { useState } from "react";
import borgImg from "./assets/imgs/borg_img.jpg";
function ChangePassword({ onPasswordChanged, token, userId }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Use the same backend base URL as Login
  //const API_BASE_URL = "http://localhost:5000";
  const API_BASE_URL = "https://borg-manila-be.onrender.com";
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

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
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");

      // Call parent callback after 1.5 seconds
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      backgroundColor: "#f5f5f5"
    }}>
      <div style={{
        backgroundColor: "#fff",
        padding: 40,
        borderRadius: 8,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: 400
      }}>
             <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <img
            src={borgImg}
            alt="Borg Manila"
            style={{
              maxWidth: "60%",
              height: "auto",
              objectFit: "contain"
            }}
          />
        </div>
        <h2 style={{ textAlign: "left", marginBottom: 10 }}>Change Password</h2>
        <p style={{ textAlign: "left", color: "#3d3d3d", marginBottom: 30 }}>
          For first time account, the password should change once logged in.
        </p>

        {error && (
          <div style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 10,
            borderRadius: 4,
            marginBottom: 15
          }}>
            {error}
          </div>
        )}

        {error && !success && (
          <div style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 10,
            borderRadius: 4,
            marginBottom: 15
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 15, display: success ? "none" : "block" }}>
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
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: 20, display: success ? "none" : "block" }}>
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
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              backgroundColor: success ? "#28a745" : "#CD1543",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.3s ease"
            }}
          >
            {loading ? "Updating..." : success ? "✓ Password Changed Successfully" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
