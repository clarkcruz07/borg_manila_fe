import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [companies, setCompanies] = useState([]);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
  
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

  const fetchCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
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

  const handleViewEmployee = async (user) => {
    if (!(userRole === 1 || userRole === 2)) {
      // Do nothing for role 3
      return;
    }
    try {
      // Fetch full employee details
      const response = await fetch(`${API_BASE_URL}/api/employee/profile/${user._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch employee details");
      }

      const employeeData = await response.json();
      setSelectedEmployee(employeeData);
      setEditFormData({
        firstName: employeeData.firstName || "",
        lastName: employeeData.lastName || "",
        birthDate: employeeData.birthDate ? new Date(employeeData.birthDate).toISOString().split("T")[0] : "",
        personalEmail: employeeData.personalEmail || "",
        mobileNumber: employeeData.mobileNumber || "",
        homeAddress: employeeData.homeAddress || "",
        emergencyContactName: employeeData.emergencyContactName || "",
        relationship: employeeData.relationship || "",
        emergencyContactNumber: employeeData.emergencyContactNumber || "",
        position: employeeData.position || "",
        company: employeeData.company || "",
        department: employeeData.department || "",
        dateHired: employeeData.dateHired ? new Date(employeeData.dateHired).toISOString().split("T")[0] : "",
        sssNumber: employeeData.sssNumber || "",
        philhealthNumber: employeeData.philhealthNumber || "",
        tinNumber: employeeData.tinNumber || "",
        pagibigNumber: employeeData.pagibigNumber || "",
      });
      setEditModalOpen(true);
      setEditError("");
      setEditSuccess("");
    } catch (err) {
      alert(err.message);
    }
  };

  const formatGovernmentId = (name, value) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    switch (name) {
      case "sssNumber":
        // Format: XX-XXXXXXX-X (2-7-1)
        if (digits.length <= 2) return digits;
        if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 9)}-${digits.slice(9, 10)}`;
      
      case "philhealthNumber":
        // Format: XX-XXXXXXXXX-X (2-9-1)
        if (digits.length <= 2) return digits;
        if (digits.length <= 11) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
        return `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11, 12)}`;
      
      case "tinNumber":
        // Format: XXX-XXX-XXX-XXX (3-3-3-3)
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9, 12)}`;
      
      case "pagibigNumber":
        // Format: XXXX-XXXX-XXXX (4-4-4)
        if (digits.length <= 4) return digits;
        if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
        return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
      
      default:
        return value;
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    
    // Apply formatting for government IDs
    const formattedValue = ["sssNumber", "philhealthNumber", "tinNumber", "pagibigNumber"].includes(name)
      ? formatGovernmentId(name, value)
      : value;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setEditLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/employee/profile/${selectedEmployee._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setEditSuccess("Employee profile updated successfully!");
      setTimeout(() => {
        setEditModalOpen(false);
        fetchUsers();
      }, 1500);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedEmployee(null);
    setEditFormData({});
    setEditError("");
    setEditSuccess("");
  };


  const handleRegeneratePassword = () => {
    setFormData({ ...formData, password: generateRandomPassword() });
  };

  const getRoleName = (roleNum) => {
    const roles = { 1: "Manager", 2: "HR", 3: "Employee" };
    return roles[roleNum] || "Unknown";
  };

  if (loading) {
    return <LoadingSpinner message="Loading employees..." />;
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
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    if (!normalizedSearch) return true;
    const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim().toLowerCase();
    const position = (user.position || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return (
      fullName.includes(normalizedSearch) ||
      position.includes(normalizedSearch) ||
      email.includes(normalizedSearch)
    );
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: isMobile ? "flex-start" : "center", 
        marginBottom: isMobile ? 20 : 30,
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 10 : 0
      }}>
        <div>
          <h2 style={{  fontSize: isMobile ? 20 : 24 }}>Employees List</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
            gap: isMobile ? 15 : 20
          }}></div>
          <p style={{ margin: 0, fontSize: isMobile ? 13 : 14 }}>
            Total Employees: <strong>{users.length}</strong>
          </p>
          <p style={{ margin: "4px 0 0 0", fontSize: isMobile ? 12 : 13, color: "#6c757d" }}>
            Showing: <strong>{filteredUsers.length}</strong>
          </p>
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
          padding: isMobile ? 20 : 30,
          marginBottom: 20
        }}>
          <h3 style={{ fontSize: isMobile ? 18 : 20 }}>Add New Employee</h3>
          {formError && (
            <div style={{ color: "red", marginBottom: 10, padding: isMobile ? 10 : 12, backgroundColor: "#f8d7da", borderRadius: 4, fontSize: isMobile ? 13 : 14 }}>
              {formError}
            </div>
          )}
          {formSuccess && (
            <div style={{ color: "green", marginBottom: 10, padding: isMobile ? 10 : 12, backgroundColor: "#d4edda", borderRadius: 4, fontSize: isMobile ? 13 : 14 }}>
              ✓ {formSuccess}
              {createdUserDetails && (
                <div style={{ marginTop: 15, padding: isMobile ? 12 : 15, backgroundColor: "#fff", border: "1px solid #c3e6cb", borderRadius: 4 }}>
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
                backgroundColor: submitting ? "#ccc" : "#dc3545",
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

      {/* Search */}
      <div style={{ marginBottom: 15 }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, position, or email"
          style={{
            width: "100%",
            padding: isMobile ? "8px 10px" : "10px 12px",
            border: "1px solid #ddd",
            borderRadius: 6,
            fontSize: isMobile ? 13 : 14,
            boxSizing: "border-box",
          }}
        />
      </div>

      {users.length === 0 ? (
        <p>No employees found</p>
      ) : filteredUsers.length === 0 ? (
        <p style={{ color: "#6c757d" }}>No employees matched your search.</p>
      ) : (
        /* Employee Cards View */
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", 
          gap: isMobile ? 15 : 20, 
          marginTop: 20 
        }}>
          {filteredUsers.map((user, idx) => (
            <div key={idx} style={{
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              cursor: "pointer"
            }}
            onClick={() => handleViewEmployee(user)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
            }}
            >
              {/* Profile Picture */}
              <div style={{ textAlign: "center", marginBottom: 15 }}>
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={`${user.firstName} ${user.lastName}`}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #dc3545",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
                    }}
                  />
                ) : (
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: "#e9ecef",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                    fontSize: 36,
                    color: "#6c757d",
                    border: "3px solid #dee2e6"
                  }}>
                    👤
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{ 
                textAlign: "center", 
                fontWeight: 700, 
                fontSize: 18, 
                marginBottom: 8,
                color: "#333"
              }}>
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : <span style={{ color: "#999", fontStyle: "italic", fontSize: 14 }}>Profile not completed</span>
                }
              </div>

              {/* Position */}
              <div style={{ 
                textAlign: "center", 
                fontSize: 14, 
                color: "#6c757d",
                marginBottom: 8,
                fontWeight: 500
              }}>
                {user.position || "—"}
              </div>

              {/*Company */}
              <div style={{ 
                textAlign: "center", 
                fontSize: 12, 
                color: "#6c757d",
                marginBottom: 12
              }}>
                {user.company 
                  ? `Company: ${user.company}` 
                  : "Company not set"}
              </div>
              {/* Email */}
              <div style={{ 
                textAlign: "center", 
                fontSize: 13, 
                color: "#dc3545",
                marginBottom: 8,
                wordBreak: "break-word"
              }}>
                {user.email}
              </div>

              {/* Date Hired */}
              <div style={{ 
                textAlign: "center", 
                fontSize: 12, 
                color: "#6c757d",
                marginBottom: 12
              }}>
                {user.dateHired 
                  ? `Hired: ${new Date(user.dateHired).toLocaleDateString()}` 
                  : "Hire date not set"}
              </div>
              
{/*
              
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{
                  backgroundColor: user.role === 1 ? "#f8d7da" : user.role === 2 ? "#fff3cd" : "#d1e7dd",
                  color: user.role === 1 ? "#084298" : user.role === 2 ? "#664d03" : "#0f5132",
                  padding: "4px 12px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  display: "inline-block"
                }}>
                  {getRoleName(user.role)}
                </span>
              </div>

              
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                gap: 8, 
                marginTop: 10,
                flexWrap: "wrap"
              }}>
                <span style={{
                  backgroundColor: user.passwordChanged ? "#d4edda" : "#f8d7da",
                  color: user.passwordChanged ? "#155724" : "#721c24",
                  padding: "3px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 500
                }}>
                  {user.passwordChanged ? "✓ Password Set" : "⚠ Password Pending"}
                </span>
              </div> */}
            </div>
          ))}
        </div>
      )}

      {/* Edit Employee Modal */}
      {editModalOpen && selectedEmployee && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: isMobile ? 10 : 20,
          overflow: "auto"
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: isMobile ? 20 : 30,
            maxWidth: 800,
            width: "100%",
            maxHeight: "90vh",
            overflow: "auto",
            position: "relative"
          }}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>Edit Employee Profile</h2>

            {editError && (
              <div style={{
                backgroundColor: "#f8d7da",
                color: "#721c24",
                padding: 12,
                borderRadius: 4,
                marginBottom: 15,
                fontSize: 14
              }}>
                {editError}
              </div>
            )}

            {editSuccess && (
              <div style={{
                backgroundColor: "#d4edda",
                color: "#155724",
                padding: 12,
                borderRadius: 4,
                marginBottom: 15,
                fontSize: 14
              }}>
                {editSuccess}
              </div>
            )}

            {(userRole === 1 || userRole === 2) ? (
              <form onSubmit={handleUpdateEmployee}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 15, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editFormData.firstName}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editFormData.lastName}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Birth Date *</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={editFormData.birthDate}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Personal Email *</label>
                  <input
                    type="email"
                    name="personalEmail"
                    value={editFormData.personalEmail}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Mobile Number *</label>
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={editFormData.mobileNumber}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Home Address *</label>
                  <input
                    type="text"
                    name="homeAddress"
                    value={editFormData.homeAddress}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Emergency Contact Name *</label>
                  <input
                    type="text"
                    name="emergencyContactName"
                    value={editFormData.emergencyContactName}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Relationship *</label>
                  <input
                    type="text"
                    name="relationship"
                    value={editFormData.relationship}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Emergency Contact Number *</label>
                  <input
                    type="tel"
                    name="emergencyContactNumber"
                    value={editFormData.emergencyContactNumber}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Position *</label>
                  <input
                    type="text"
                    name="position"
                    value={editFormData.position}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Company *</label>
                  <select
                    name="company"
                    value={editFormData.company}
                    onChange={handleEditChange}
                    required
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                      boxSizing: "border-box",
                      backgroundColor: "#fff"
                    }}
                  >
                    <option value="">Select a company</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company.name}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Date Hired *</label>
                  <input
                    type="date"
                    name="dateHired"
                    value={editFormData.dateHired}
                    onChange={handleEditChange}
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>SSS Number *</label>
                  <input
                    type="text"
                    name="sssNumber"
                    value={editFormData.sssNumber}
                    onChange={handleEditChange}
                    required
                    placeholder="XX-XXXXXXX-X"
                    pattern="\d{2}-\d{7}-\d{1}"
                    title="SSS Number must follow format XX-XXXXXXX-X"
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>PhilHealth Number *</label>
                  <input
                    type="text"
                    name="philhealthNumber"
                    value={editFormData.philhealthNumber}
                    onChange={handleEditChange}
                    required
                    placeholder="XX-XXXXXXXXX-X"
                    pattern="\d{2}-\d{9}-\d{1}"
                    title="PhilHealth Number must follow format XX-XXXXXXXXX-X"
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>TIN Number *</label>
                  <input
                    type="text"
                    name="tinNumber"
                    value={editFormData.tinNumber}
                    onChange={handleEditChange}
                    required
                    placeholder="XXX-XXX-XXX-XXX"
                    pattern="\d{3}-\d{3}-\d{3}-\d{3}"
                    title="TIN Number must follow format XXX-XXX-XXX-XXX"
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

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: 500, fontSize: 14 }}>Pag-IBIG Number *</label>
                  <input
                    type="text"
                    name="pagibigNumber"
                    value={editFormData.pagibigNumber}
                    onChange={handleEditChange}
                    required
                    placeholder="XXXX-XXXX-XXXX"
                    pattern="\d{4}-\d{4}-\d{4}"
                    title="Pag-IBIG Number must follow format XXXX-XXXX-XXXX"
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
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={editLoading}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: editLoading ? "not-allowed" : "pointer",
                    opacity: editLoading ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: editLoading ? "#ccc" : "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: "bold",
                    cursor: editLoading ? "not-allowed" : "pointer"
                  }}
                >
                  {editLoading ? "Updating..." : "Update Profile"}
                </button>
              </div>
              </form>
            ) : (
              <div style={{ color: '#888', fontSize: 15, textAlign: 'center', marginTop: 30 }}>
                You do not have permission to edit employee profiles.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
