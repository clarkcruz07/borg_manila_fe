import { useState, useEffect } from "react";

function Users({ token, userRole }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: 3
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdUserDetails, setCreatedUserDetails] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://borg-manila-be.onrender.com";
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
     const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.email || !formData.password) {
      setFormError("Email and password are required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: parseInt(formData.role)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Store created user details including password for display
      setCreatedUserDetails({
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      setFormSuccess(`User ${formData.email} created successfully!`);
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormSuccess("");
    setFormError("");
    setCreatedUserDetails(null);
    setFormData({ email: "", password: "", role: 3 });
  };

  const handleAddAnother = () => {
    setFormSuccess("");
    setFormError("");
    setCreatedUserDetails(null);
    setFormData({ email: "", password: generateRandomPassword(), role: 3 });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Password copied to clipboard!");
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleToggleForm = () => {
    if (!showForm) {
      // Generate a random password when opening the form
      setFormData({ email: "", password: generateRandomPassword(), role: 3 });
      setShowForm(true);
    } else {
      handleCloseForm();
    }
  };

  const handleRegeneratePassword = () => {
    setFormData({ ...formData, password: generateRandomPassword() });
  };

  const getRoleName = (roleNum) => {
    const roles = { 1: "Manager", 2: "HR", 3: "Employee" };
    return roles[roleNum] || "Unknown";
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading employees list...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: "red" }}>
        Error: {error}
      </div>
    );
  }

  // Only Manager (1) and HR (2) can add users
  const canAddUsers = userRole === 1 || userRole === 2;

  return (
    <div style={{ padding: isMobile ? 15 : 20 }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: isMobile ? "flex-start" : "center", 
        marginBottom: 20,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 10 : 0
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 20 : 24, margin: 0, marginBottom: 5 }}>Employees List</h2>
          <p style={{ margin: 0, fontSize: isMobile ? 14 : 16 }}>Total Employees: <strong>{users.length}</strong></p>
        </div>
        {canAddUsers && (
          <button
            onClick={handleToggleForm}
            style={{
              padding: isMobile ? "8px 16px" : "10px 20px",
              backgroundColor: showForm ? "#dc3545" : "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14,
              fontWeight: "bold",
              alignSelf: isMobile ? "stretch" : "auto"
            }}
          >
            {showForm ? "Cancel" : "Add New Employee"}
          </button>
        )}
      </div>

      {/* Add User Form */}
      {showForm && canAddUsers && (
        <div style={{
          backgroundColor: "#f9f9f9",
          border: "1px solid #ddd",
          borderRadius: 4,
          padding: isMobile ? 15 : 20,
          marginBottom: 20
        }}>
          <h3 style={{ fontSize: isMobile ? 18 : 20 }}>Add New Employee</h3>
          {formError && (
            <div style={{ color: "red", marginBottom: 10, padding: 10, backgroundColor: "#f8d7da", borderRadius: 4, fontSize: isMobile ? 13 : 14 }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ color: "green", marginBottom: 10, padding: 10, backgroundColor: "#d4edda", borderRadius: 4, fontSize: isMobile ? 13 : 14 }}>
              ✓ {formSuccess}
              {createdUserDetails && (
                <div style={{ marginTop: 15, padding: isMobile ? 10 : 15, backgroundColor: "#fff", border: "1px solid #c3e6cb", borderRadius: 4 }}>
                  <strong style={{ fontSize: isMobile ? 14 : 16, display: "block", marginBottom: 10 }}>⚠️ Important: Save these credentials</strong>
                  <div style={{ marginBottom: 8, fontSize: isMobile ? 13 : 14 }}>
                    <strong>Email:</strong> {createdUserDetails.email}
                  </div>
                  <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: isMobile ? 13 : 14 }}>Temporary Password:</strong>
                    <span style={{ fontFamily: "monospace", backgroundColor: "#f8f9fa", padding: "4px 8px", borderRadius: 4, fontSize: isMobile ? 14 : 16 }}>
                      {createdUserDetails.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdUserDetails.password)}
                      style={{
                        padding: "4px 12px",
                        backgroundColor: "#6c757d",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <div style={{ marginBottom: 8, fontSize: isMobile ? 13 : 14 }}>
                    <strong>Role:</strong> {getRoleName(createdUserDetails.role)}
                  </div>
                  <div style={{ marginTop: 15, display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                    <button
                      type="button"
                      onClick={handleAddAnother}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: "bold"
                      }}
                    >
                      Add Another User
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#6c757d",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: isMobile ? 13 : 14
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {!createdUserDetails && (
          <form onSubmit={handleAddUser}>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: isMobile ? 13 : 14 }}>Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: isMobile ? "6px 10px" : "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  boxSizing: "border-box",
                  fontSize: isMobile ? 13 : 14
                }}
                placeholder="user@example.com"
                disabled={submitting}
              />
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: isMobile ? 13 : 14 }}>Temporary Password:</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexDirection: isMobile ? "column" : "row" }}>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{
                    flex: 1,
                    width: isMobile ? "100%" : "auto",
                    padding: isMobile ? "6px 10px" : "8px 12px",
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    boxSizing: "border-box",
                    fontSize: isMobile ? 13 : 14,
                    fontFamily: "monospace",
                    backgroundColor: "#f9f9f9"
                  }}
                  disabled={submitting}
                  readOnly
                />
                <button
                  type="button"
                  onClick={handleRegeneratePassword}
                  disabled={submitting}
                  style={{
                    padding: isMobile ? "6px 14px" : "8px 16px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: isMobile ? 13 : 14,
                    whiteSpace: "nowrap",
                    width: isMobile ? "100%" : "auto"
                  }}
                >
                  Regenerate
                </button>
              </div>
              <small style={{ color: "#666", fontSize: isMobile ? 11 : 12 }}>8-character random password (user must change on first login)</small>
            </div>
            <div style={{ marginBottom: 15 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold", fontSize: isMobile ? 13 : 14 }}>Role:</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                style={{
                  width: "100%",
                  padding: isMobile ? "6px 10px" : "8px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: isMobile ? 13 : 14,
                  boxSizing: "border-box"
                }}
                disabled={submitting}
              >
                <option value={1}>Manager</option>
                <option value={2}>HR</option>
                <option value={3}>Employee</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 20px",
                backgroundColor: submitting ? "#ccc" : "#007bff",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: "bold"
              }}
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
          </form>
          )}
        </div>
      )}

    

      {users.length === 0 ? (
        <p>No employees found</p>
      ) : isMobile ? (
        /* Mobile Card View */
        <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 20 }}>
          {users.map((user, idx) => (
            <div key={idx} style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 15,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 5 }}>
                  {user.firstName && user.lastName 
                    ? `${user.lastName}, ${user.firstName}` 
                    : <span style={{ color: "#999", fontStyle: "italic" }}>Profile not completed</span>
                  }
                </div>
                <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                  {user.email}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{
                    backgroundColor: user.role === 1 ? "#cfe2ff" : user.role === 2 ? "#fff3cd" : "#d1e7dd",
                    color: user.role === 1 ? "#084298" : user.role === 2 ? "#664d03" : "#0f5132",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {getRoleName(user.role)}
                  </span>
                  <span style={{
                    backgroundColor: user.passwordChanged ? "#d4edda" : "#f8d7da",
                    color: user.passwordChanged ? "#155724" : "#721c24",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    Password: {user.passwordChanged ? "Changed" : "Not Changed"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
                  Created: {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: 20
        }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Employee Name</th>
              <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Email</th>
              <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Role</th>
              <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Created At</th>
              <th style={{ border: "1px solid #ddd", padding: 10, textAlign: "left" }}>Password Changed</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx}>
                <td style={{ border: "1px solid #ddd", padding: 10 }}>
                  {user.firstName && user.lastName 
                    ? `${user.lastName}, ${user.firstName}` 
                    : <span style={{ color: "#999", fontStyle: "italic" }}>Profile not completed</span>
                  }
                </td>
                <td style={{ border: "1px solid #ddd", padding: 10 }}>{user.email}</td>
                <td style={{ border: "1px solid #ddd", padding: 10 }}>
                  <span style={{
                    backgroundColor: user.role === 1 ? "#cfe2ff" : user.role === 2 ? "#fff3cd" : "#d1e7dd",
                    color: user.role === 1 ? "#084298" : user.role === 2 ? "#664d03" : "#0f5132",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    {getRoleName(user.role)}
                  </span>
                </td>
                <td style={{ border: "1px solid #ddd", padding: 10 }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td style={{ border: "1px solid #ddd", padding: 10 }}>
                  <span style={{
                    backgroundColor: user.passwordChanged ? "#d4edda" : "#f8d7da",
                    color: user.passwordChanged ? "#155724" : "#721c24",
                    padding: "4px 8px",
                    borderRadius: 4
                  }}>
                    {user.passwordChanged ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Users;
