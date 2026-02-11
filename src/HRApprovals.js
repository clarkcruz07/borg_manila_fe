import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

function HRApprovals({ token }) {
  const [activeTab, setActiveTab] = useState("profiles");
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [success, setSuccess] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/employee/pending-approvals`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch pending approvals");
      }

      const data = await response.json();
      setPendingEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLeaves = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/leaves/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pending leaves");
      }

      const data = await response.json();
      setPendingLeaves(data);
    } catch (err) {
      console.error("Error fetching pending leaves:", err);
      // Don't set error state here, just log it
    }
  };

  useEffect(() => {
    fetchPendingApprovals();
    fetchPendingLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApprove = async (employeeId) => {
    try {
      setApproving(employeeId);
      const response = await fetch(
        `${API_BASE_URL}/api/employee/profile/${employeeId}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ approval_status: 1 }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve profile");
      }

      setSuccess("Profile approved successfully!");
      // Remove from pending list
      setPendingEmployees(
        pendingEmployees.filter((emp) => emp._id !== employeeId)
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (employeeId) => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    try {
      setApproving(employeeId);
      const response = await fetch(
        `${API_BASE_URL}/api/employee/profile/${employeeId}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject profile");
      }

      setSuccess("Profile rejected successfully!");
      // Remove from pending list
      setPendingEmployees(
        pendingEmployees.filter((emp) => emp._id !== employeeId)
      );
      setRejecting(null);
      setRejectionReason("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleLeaveApprove = async (leaveId) => {
    if (!window.confirm("Are you sure you want to approve this leave?")) {
      return;
    }

    try {
      setApproving(leaveId);
      const response = await fetch(
        `${API_BASE_URL}/api/leaves/${leaveId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "approved" }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve leave");
      }

      setSuccess("Leave approved successfully!");
      setPendingLeaves(pendingLeaves.filter((leave) => leave._id !== leaveId));
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleLeaveReject = async (leaveId) => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    try {
      setApproving(leaveId);
      const response = await fetch(
        `${API_BASE_URL}/api/leaves/${leaveId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            status: "rejected",
            rejectionReason: rejectionReason.trim()
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reject leave");
      }

      setSuccess("Leave rejected successfully!");
      setPendingLeaves(pendingLeaves.filter((leave) => leave._id !== leaveId));
      setRejecting(null);
      setRejectionReason("");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(null);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
        <h2 style={{ marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>Approvals</h2>
        <LoadingSpinner message="Loading pending approvals..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24 }}>Approvals Dashboard</h2>
        <p style={{ color: "#666", marginTop: 5, fontSize: isMobile ? 13 : 14 }}>
          Review and approve pending employee profiles and leave requests
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, borderBottom: "2px solid #e9ecef", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setActiveTab("profiles");
              setError("");
              setRejecting(null);
              setRejectionReason("");
            }}
            style={{
              padding: isMobile ? "10px 15px" : "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "profiles" ? "3px solid #007bff" : "3px solid transparent",
              color: activeTab === "profiles" ? "#007bff" : "#6c757d",
              fontWeight: activeTab === "profiles" ? "600" : "normal",
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14
            }}
          >
            Profile Approvals ({pendingEmployees.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("leaves");
              setError("");
              setRejecting(null);
              setRejectionReason("");
            }}
            style={{
              padding: isMobile ? "10px 15px" : "12px 24px",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: activeTab === "leaves" ? "3px solid #007bff" : "3px solid transparent",
              color: activeTab === "leaves" ? "#007bff" : "#6c757d",
              fontWeight: activeTab === "leaves" ? "600" : "normal",
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14
            }}
          >
            Leave Approvals ({pendingLeaves.length})
          </button>
        </div>
      </div>

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

      {/* Profile Approvals Tab */}
      {activeTab === "profiles" && (
        <>
          {pendingEmployees.length === 0 ? (
            <div
              style={{
                backgroundColor: "#e7f3ff",
                color: "#004085",
                padding: isMobile ? 15 : 20,
                borderRadius: 4,
                border: "1px solid #b3d9ff",
                fontSize: isMobile ? 13 : 14
              }}
            >
              No pending profile approvals at this time.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {pendingEmployees.map((employee) => (
                <div
                  key={employee._id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: isMobile ? 15 : 20,
                  }}
                >
                  <div style={{ marginBottom: 15 }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: isMobile ? 16 : 18 }}>
                      {employee.firstName} {employee.lastName}
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                        gap: isMobile ? 10 : 15,
                        fontSize: isMobile ? 13 : 14,
                      }}
                    >
                      <div>
                        <strong>Email:</strong> {employee.userId?.email}
                      </div>
                      <div>
                        <strong>Position:</strong> {employee.position}
                      </div>
                      <div>
                        <strong>Company:</strong> {employee.company}
                      </div>
                      <div>
                        <strong>Department:</strong> {employee.department}
                      </div>
                      <div>
                        <strong>Personal Email:</strong> {employee.personalEmail}
                      </div>
                      <div>
                        <strong>Mobile:</strong> {employee.mobileNumber}
                      </div>
                      <div>
                        <strong>Birthdate:</strong>{" "}
                        {new Date(employee.birthDate).toLocaleDateString()}
                      </div>
                      <div>
                        <strong>Address:</strong> {employee.homeAddress}
                      </div>
                      <div>
                        <strong>Emergency Contact:</strong>{" "}
                        {employee.emergencyContactName} ({employee.relationship})
                      </div>
                      <div>
                        <strong>Emergency Contact #:</strong>{" "}
                        {employee.emergencyContactNumber}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleApprove(employee._id)}
                      disabled={approving === employee._id || rejecting === employee._id}
                      style={{
                        padding: isMobile ? "8px 16px" : "10px 20px",
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: (approving === employee._id || rejecting === employee._id) ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: "bold",
                        opacity: (approving === employee._id || rejecting === employee._id) ? 0.6 : 1,
                      }}
                    >
                      {approving === employee._id ? "Approving..." : "✓ Approve"}
                    </button>

                    <button
                      onClick={() => {
                        if (rejecting === employee._id) {
                          setRejecting(null);
                          setRejectionReason("");
                        } else {
                          setRejecting(employee._id);
                          setRejectionReason("");
                        }
                      }}
                      disabled={approving === employee._id}
                      style={{
                        padding: isMobile ? "8px 16px" : "10px 20px",
                        backgroundColor: rejecting === employee._id ? "#6c757d" : "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: approving === employee._id ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: "bold",
                        opacity: approving === employee._id ? 0.6 : 1,
                      }}
                    >
                      {rejecting === employee._id ? "✕ Cancel" : "✕ Reject"}
                    </button>
                  </div>

                  {rejecting === employee._id && (
                    <div style={{ marginTop: 15 }}>
                      <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
                        Reason for Rejection:
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a clear reason for rejecting this profile..."
                        style={{
                          width: "100%",
                          padding: isMobile ? 8 : 10,
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: isMobile ? 13 : 14,
                          minHeight: isMobile ? 70 : 80,
                          resize: "vertical",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        }}
                      />
                      <button
                        onClick={() => handleReject(employee._id)}
                        disabled={!rejectionReason.trim()}
                        style={{
                          marginTop: 10,
                          padding: isMobile ? "8px 16px" : "10px 20px",
                          backgroundColor: !rejectionReason.trim() ? "#ccc" : "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: !rejectionReason.trim() ? "not-allowed" : "pointer",
                          fontSize: isMobile ? 13 : 14,
                          fontWeight: "bold",
                        }}
                      >
                        Submit Rejection
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Leave Approvals Tab */}
      {activeTab === "leaves" && (
        <>
          {pendingLeaves.length === 0 ? (
            <div
              style={{
                backgroundColor: "#e7f3ff",
                color: "#004085",
                padding: isMobile ? 15 : 20,
                borderRadius: 4,
                border: "1px solid #b3d9ff",
                fontSize: isMobile ? 13 : 14
              }}
            >
              No pending leave approvals at this time.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: 8,
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              {pendingLeaves.map((leave) => (
                <div
                  key={leave._id}
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: isMobile ? 15 : 20,
                  }}
                >
                  <div style={{ marginBottom: 15 }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#333", fontSize: isMobile ? 16 : 18 }}>
                      {leave.employeeId?.firstName} {leave.employeeId?.lastName}
                    </h4>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
                      gap: isMobile ? 10 : 15, 
                      fontSize: isMobile ? 13 : 14 
                    }}>
                      <div>
                        <strong>Email:</strong> {leave.userId?.email}
                      </div>
                      <div>
                        <strong>Position:</strong> {leave.employeeId?.position}
                      </div>
                      <div>
                        <strong>Department:</strong> {leave.employeeId?.department}
                      </div>
                      <div>
                        <strong>Leave Type:</strong>{" "}
                        <span style={{ 
                          textTransform: "capitalize",
                          backgroundColor: "#e7f3ff",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: isMobile ? 12 : 13
                        }}>
                          {leave.leaveType}
                        </span>
                      </div>
                      <div>
                        <strong>Start Date:</strong> {formatDate(leave.startDate)}
                      </div>
                      <div>
                        <strong>End Date:</strong> {formatDate(leave.endDate)}
                      </div>
                      <div>
                        <strong>Duration:</strong> {leave.numberOfDays} business day{leave.numberOfDays > 1 ? 's' : ''}
                      </div>
                      <div>
                        <strong>Applied On:</strong> {formatDate(leave.createdAt)}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, fontSize: isMobile ? 13 : 14 }}>
                      <strong>Reason:</strong>
                      <div style={{ 
                        marginTop: 5, 
                        padding: isMobile ? 10 : 12, 
                        backgroundColor: "#f8f9fa", 
                        borderRadius: 4,
                        border: "1px solid #e9ecef"
                      }}>
                        {leave.reason}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleLeaveApprove(leave._id)}
                      disabled={approving === leave._id || rejecting === leave._id}
                      style={{
                        padding: isMobile ? "8px 16px" : "10px 20px",
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: (approving === leave._id || rejecting === leave._id) ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: "bold",
                        opacity: (approving === leave._id || rejecting === leave._id) ? 0.6 : 1,
                      }}
                    >
                      {approving === leave._id ? "Approving..." : "✓ Approve"}
                    </button>

                    <button
                      onClick={() => {
                        if (rejecting === leave._id) {
                          setRejecting(null);
                          setRejectionReason("");
                        } else {
                          setRejecting(leave._id);
                          setRejectionReason("");
                        }
                      }}
                      disabled={approving === leave._id}
                      style={{
                        padding: isMobile ? "8px 16px" : "10px 20px",
                        backgroundColor: rejecting === leave._id ? "#6c757d" : "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: approving === leave._id ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: "bold",
                        opacity: approving === leave._id ? 0.6 : 1,
                      }}
                    >
                      {rejecting === leave._id ? "✕ Cancel" : "✕ Reject"}
                    </button>
                  </div>

                  {rejecting === leave._id && (
                    <div style={{ marginTop: 15 }}>
                      <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
                        Reason for Rejection:
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a clear reason for rejecting this leave request..."
                        style={{
                          width: "100%",
                          padding: isMobile ? 8 : 10,
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: isMobile ? 13 : 14,
                          minHeight: isMobile ? 70 : 80,
                          resize: "vertical",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        }}
                      />
                      <button
                        onClick={() => handleLeaveReject(leave._id)}
                        disabled={!rejectionReason.trim()}
                        style={{
                          marginTop: 10,
                          padding: isMobile ? "8px 16px" : "10px 20px",
                          backgroundColor: !rejectionReason.trim() ? "#ccc" : "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: !rejectionReason.trim() ? "not-allowed" : "pointer",
                          fontSize: isMobile ? 13 : 14,
                          fontWeight: "bold",
                        }}
                      >
                        Submit Rejection
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HRApprovals;
