import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import borgImg from "./assets/imgs/borg_img.jpg";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      const params = new URLSearchParams({
        userId: data.userId,
        token: data.resetToken,
      });

      navigate(`/forgot-password/change?${params.toString()}`);
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

        <h2 style={{ marginTop: 0, marginBottom: 10 }}>Forgot Password</h2>
        <p style={{ marginTop: 0, marginBottom: 20, color: "#555", fontSize: 14 }}>
          Enter your account email to continue.
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

        <form onSubmit={handleVerifyEmail}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", marginBottom: 5 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              backgroundColor: "#CD1543",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>

        <div style={{ marginTop: 15, textAlign: "center", fontSize: 13 }}>
          <Link to="/" style={{ color: "#CD1543", textDecoration: "none" }}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
