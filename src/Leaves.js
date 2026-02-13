import React, { useState, useEffect, useCallback } from "react";
import LoadingSpinner from "./LoadingSpinner";

function Leaves({ token, userId, userRole }) {
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("apply");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    leaveType: "vacation",
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchLeaveBalance = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setLeaveBalance(data);
      }
    } catch (err) {
      console.error("Error fetching leave balance:", err);
    }
  }, [API_BASE_URL, token]);

  const fetchMyLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/leaves/my-leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setLeaves(data);
      }
    } catch (err) {
      console.error("Error fetching leaves:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchLeaveBalance();
    fetchMyLeaves();
  }, [fetchLeaveBalance, fetchMyLeaves]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    let count = 0;
    let currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.startDate || !formData.endDate || !formData.reason) {
      setError("All fields are required");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Leave application submitted successfully!");
      setFormData({
        leaveType: "vacation",
        startDate: "",
        endDate: "",
        reason: "",
      });
      fetchLeaveBalance();
      fetchMyLeaves();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave application?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Leave cancelled successfully");
      fetchMyLeaves();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#28a745";
      case "rejected":
        return "#dc3545";
      case "pending":
        return "#ffc107";
      case "cancelled":
        return "#6c757d";
      default:
        return "#6c757d";
    }
  };

  const getStatusBadge = (status) => {
    return {
      backgroundColor: getStatusColor(status),
      color: "#fff",
      padding: "4px 12px",
      borderRadius: 12,
      fontSize: isMobile ? 11 : 12,
      fontWeight: "500",
      display: "inline-block",
    };
  };

  if (loading && !leaveBalance) {
    return <LoadingSpinner message="Loading leave information..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>
        Leave Management
      </h2>

      {leaveBalance && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: isMobile ? 20 : 30,
            marginBottom: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderTop: "4px solid #28a745",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: isMobile ? 18 : 20 }}>
            Your Leave Balance
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: isMobile ? 15 : 20,
            }}
          >
            <div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginBottom: 5 }}>
                Vacation Leave
              </div>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: "bold", color: "#28a745" }}>
                {leaveBalance.vacation?.availableCredits ?? 0}
              </div>
              <div style={{ fontSize: isMobile ? 12 : 13, color: "#6c757d" }}>
                {leaveBalance.vacation?.usedCredits ?? 0} used / {leaveBalance.vacation?.totalCredits ?? 0} total
              </div>
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginBottom: 5 }}>
                Sick Leave
              </div>
              <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: "bold", color: "#28a745" }}>
                {leaveBalance.sick?.availableCredits ?? 0}
              </div>
              <div style={{ fontSize: isMobile ? 12 : 13, color: "#6c757d" }}>
                {leaveBalance.sick?.usedCredits ?? 0} used / {leaveBalance.sick?.totalCredits ?? 0} total
              </div>
            </div>
          </div>
          <p style={{ marginTop: 15, marginBottom: 0, fontSize: isMobile ? 12 : 13, color: "#6c757d" }}>
            Months employed: {leaveBalance.monthsEmployed ?? 0}. Eligible after 6 months: {leaveBalance.eligibleToUse ? "Yes" : "No"}.
          </p>
          <p style={{ marginTop: 6, marginBottom: 0, fontSize: isMobile ? 12 : 13, color: "#6c757d", fontStyle: "italic" }}>
            You earn 1 leave credit per month per type. Leaves filed before 6 months are deducted and applied once eligible. Hired on: {leaveBalance.dateHired ? formatDate(leaveBalance.dateHired) : "N/A"}
          </p>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: isMobile ? 12 : 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #f5c6cb",
            fontSize: isMobile ? 13 : 14,
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
            padding: isMobile ? 12 : 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #c3e6cb",
            fontSize: isMobile ? 13 : 14,
          }}
        >
          {success}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, borderBottom: "2px solid #e9ecef" }}>
          <button
            onClick={() => setActiveTab("apply")}
            style={{
              padding: isMobile ? "10px 15px" : "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "apply" ? "3px solid #dc3545" : "3px solid transparent",
              color: activeTab === "apply" ? "#dc3545" : "#6c757d",
              fontWeight: activeTab === "apply" ? "600" : "normal",
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Apply for Leave
          </button>
          <button
            onClick={() => setActiveTab("myLeaves")}
            style={{
              padding: isMobile ? "10px 15px" : "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "myLeaves" ? "3px solid #dc3545" : "3px solid transparent",
              color: activeTab === "myLeaves" ? "#dc3545" : "#6c757d",
              fontWeight: activeTab === "myLeaves" ? "600" : "normal",
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            My Leaves
          </button>
        </div>
      </div>

      {activeTab === "apply" && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: isMobile ? 20 : 30,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: isMobile ? 18 : 22 }}>Apply for Leave</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: "500", fontSize: isMobile ? 13 : 14 }}>
                Leave Type *
              </label>
              <select
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                required
                style={{
                  width: "100%",
                  padding: isMobile ? "8px 10px" : 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: isMobile ? 13 : 14,
                  boxSizing: "border-box",
                }}
              >
                <option value="vacation">Vacation Leave</option>
                <option value="sick">Sick Leave</option>
              </select>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: isMobile ? 15 : 20,
                marginBottom: 20,
              }}
            >
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: "500", fontSize: isMobile ? 13 : 14 }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "8px 10px" : 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: isMobile ? 13 : 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 8, fontWeight: "500", fontSize: isMobile ? 13 : 14 }}>
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "8px 10px" : 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: isMobile ? 13 : 14,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {formData.startDate && formData.endDate && (
              <div
                style={{
                  backgroundColor: "#fdecef",
                  padding: isMobile ? 10 : 12,
                  borderRadius: 4,
                  marginBottom: 20,
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                Business days: <strong>{calculateDays()}</strong> day(s)
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: "500", fontSize: isMobile ? 13 : 14 }}>
                Reason *
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                rows={4}
                style={{
                  width: "100%",
                  padding: isMobile ? "8px 10px" : 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: isMobile ? 13 : 14,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
                placeholder="Please provide a reason for your leave..."
              />
            </div>

            <button
              type="submit"
              style={{
                backgroundColor: "#dc3545",
                color: "#fff",
                padding: isMobile ? "10px 20px" : "12px 30px",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: isMobile ? 14 : 16,
                fontWeight: "500",
              }}
            >
              Submit Leave Application
            </button>
          </form>
        </div>
      )}

      {activeTab === "myLeaves" && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: isMobile ? 15 : 30,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: isMobile ? 18 : 22 }}>My Leave Applications</h3>
          {leaves.length === 0 ? (
            <p style={{ color: "#6c757d", fontSize: isMobile ? 13 : 14 }}>No leave applications yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              {leaves.map((leave) => (
                <div
                  key={leave._id}
                  style={{
                    border: "1px solid #e9ecef",
                    borderRadius: 4,
                    padding: isMobile ? 12 : 15,
                    marginBottom: 15,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: "600", marginBottom: 5 }}>
                        {leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1)} Leave
                      </div>
                      <div style={{ fontSize: isMobile ? 12 : 13, color: "#6c757d" }}>
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)} ({leave.numberOfDays} day{leave.numberOfDays > 1 ? "s" : ""})
                      </div>
                    </div>
                    <div style={getStatusBadge(leave.status)}>{leave.status.toUpperCase()}</div>
                  </div>
                  <div style={{ fontSize: isMobile ? 12 : 13, color: "#333", marginBottom: 10 }}>
                    <strong>Reason:</strong> {leave.reason}
                  </div>
                  {leave.status === "rejected" && leave.rejectionReason && (
                    <div style={{ fontSize: isMobile ? 12 : 13, color: "#dc3545", backgroundColor: "#f8d7da", padding: 8, borderRadius: 4 }}>
                      <strong>Rejection Reason:</strong> {leave.rejectionReason}
                    </div>
                  )}
                  {leave.status === "pending" && (
                    <button
                      onClick={() => handleCancelLeave(leave._id)}
                      style={{
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        padding: "6px 12px",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: isMobile ? 12 : 13,
                        marginTop: 10,
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Leaves;