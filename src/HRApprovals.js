import { useState, useEffect } from "react";

function HRApprovals({ token }) {
  const [pendingEmployees, setPendingEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(null);
  const [success, setSuccess] = useState("");

  const API_BASE_URL = "http://localhost:5000";

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

  useEffect(() => {
    fetchPendingApprovals();
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

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <h2>HR Approvals</h2>
        <p>Loading pending approvals...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 30 }}>
        <h2>Employee Profile Approvals</h2>
        <p style={{ color: "#666", marginTop: 5 }}>
          Review and approve pending employee profiles
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #f5c6cb",
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
            padding: 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #c3e6cb",
          }}
        >
          {success}
        </div>
      )}

      {pendingEmployees.length === 0 ? (
        <div
          style={{
            backgroundColor: "#e7f3ff",
            color: "#004085",
            padding: 20,
            borderRadius: 4,
            border: "1px solid #b3d9ff",
          }}
        >
          No pending approvals at this time.
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
                padding: 20,
              }}
            >
              <div style={{ marginBottom: 15 }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
                  {employee.firstName} {employee.lastName}
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 15,
                    fontSize: 14,
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

              <button
                onClick={() => handleApprove(employee._id)}
                disabled={approving === employee._id}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: approving === employee._id ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: "bold",
                  opacity: approving === employee._id ? 0.6 : 1,
                }}
              >
                {approving === employee._id ? "Approving..." : "✓ Approve Profile"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HRApprovals;
