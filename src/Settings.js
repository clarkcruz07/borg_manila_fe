import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

function Settings({ token }) {
  const [activeTab, setActiveTab] = useState("departments");
  const [departments, setDepartments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Form states
  const [showAddDeptForm, setShowAddDeptForm] = useState(false);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingCompany, setEditingCompany] = useState(null);
  
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [companyForm, setCompanyForm] = useState({ name: "", description: "" });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptResponse, companyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/departments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (deptResponse.ok) {
        const deptData = await deptResponse.json();
        setDepartments(deptData);
      }

      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        setCompanies(companyData);
      }
    } catch (err) {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ==================== DEPARTMENT FUNCTIONS ====================

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deptForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Department added successfully");
      setDeptForm({ name: "", description: "" });
      setShowAddDeptForm(false);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateDepartment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/departments/${editingDept._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deptForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Department updated successfully");
      setDeptForm({ name: "", description: "" });
      setEditingDept(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this department?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/departments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Department deleted successfully");
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditDepartment = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name, description: dept.description });
    setShowAddDeptForm(false);
  };

  // ==================== COMPANY FUNCTIONS ====================

  const handleAddCompany = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/companies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(companyForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Company added successfully");
      setCompanyForm({ name: "", description: "" });
      setShowAddCompanyForm(false);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateCompany = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/companies/${editingCompany._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(companyForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Company updated successfully");
      setCompanyForm({ name: "", description: "" });
      setEditingCompany(null);
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCompany = async (id) => {
    if (!window.confirm("Are you sure you want to delete this company?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/companies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setSuccess("Company deleted successfully");
      fetchData();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyForm({ name: company.name, description: company.description });
    setShowAddCompanyForm(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>Settings</h2>

      {/* Success/Error Messages */}
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

      {/* Tabs */}
      <div style={{ borderBottom: "2px solid #ddd", marginBottom: 30 }}>
        <button
          onClick={() => setActiveTab("departments")}
          style={{
            padding: isMobile ? "8px 16px" : "10px 20px",
            marginRight: 10,
            border: "none",
            borderBottom: activeTab === "departments" ? "3px solid #CD1543" : "none",
            backgroundColor: "transparent",
            color: activeTab === "departments" ? "#CD1543" : "#666",
            fontWeight: activeTab === "departments" ? "bold" : "normal",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 16,
          }}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab("companies")}
          style={{
            padding: isMobile ? "8px 16px" : "10px 20px",
            border: "none",
            borderBottom: activeTab === "companies" ? "3px solid #CD1543" : "none",
            backgroundColor: "transparent",
            color: activeTab === "companies" ? "#CD1543" : "#666",
            fontWeight: activeTab === "companies" ? "bold" : "normal",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          Companies
        </button>
      </div>

      {/* DEPARTMENTS TAB */}
      {activeTab === "departments" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3>Manage Departments</h3>
            <button
              onClick={() => {
                setShowAddDeptForm(!showAddDeptForm);
                setEditingDept(null);
                setDeptForm({ name: "", description: "" });
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: showAddDeptForm ? "#6c757d" : "#CD1543",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {showAddDeptForm ? "Cancel" : "+ Add Department"}
            </button>
          </div>

          {/* Add/Edit Department Form */}
          {(showAddDeptForm || editingDept) && (
            <form
              onSubmit={editingDept ? handleUpdateDepartment : handleAddDepartment}
              style={{
                backgroundColor: "#f8f9fa",
                padding: 20,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <h4>{editingDept ? "Edit Department" : "Add New Department"}</h4>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5 }}>Department Name *</label>
                <input
                  type="text"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
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
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5 }}>Description</label>
                <textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {editingDept ? "Update" : "Add"}
                </button>
                {editingDept && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDept(null);
                      setDeptForm({ name: "", description: "" });
                    }}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Departments Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Name</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Description</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Created</th>
                  <th style={{ padding: 12, textAlign: "center", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                      No departments found. Add your first department above.
                    </td>
                  </tr>
                ) : (
                  departments.map((dept) => (
                    <tr key={dept._id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: 12 }}>{dept.name}</td>
                      <td style={{ padding: 12, color: "#666" }}>{dept.description || "—"}</td>
                      <td style={{ padding: 12, color: "#666" }}>
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 12, textAlign: "center" }}>
                        <button
                          onClick={() => handleEditDepartment(dept)}
                          style={{
                            padding: "5px 15px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            marginRight: 5,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDepartment(dept._id)}
                          style={{
                            padding: "5px 15px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COMPANIES TAB */}
      {activeTab === "companies" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3>Manage Companies</h3>
            <button
              onClick={() => {
                setShowAddCompanyForm(!showAddCompanyForm);
                setEditingCompany(null);
                setCompanyForm({ name: "", description: "" });
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: showAddCompanyForm ? "#6c757d" : "#CD1543",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {showAddCompanyForm ? "Cancel" : "+ Add Company"}
            </button>
          </div>

          {/* Add/Edit Company Form */}
          {(showAddCompanyForm || editingCompany) && (
            <form
              onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany}
              style={{
                backgroundColor: "#f8f9fa",
                padding: 20,
                borderRadius: 4,
                marginBottom: 20,
              }}
            >
              <h4>{editingCompany ? "Edit Company" : "Add New Company"}</h4>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5 }}>Company Name *</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
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
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5 }}>Description</label>
                <textarea
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  {editingCompany ? "Update" : "Add"}
                </button>
                {editingCompany && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCompany(null);
                      setCompanyForm({ name: "", description: "" });
                    }}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Companies Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#fff" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Name</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Description</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: "bold" }}>Created</th>
                  <th style={{ padding: 12, textAlign: "center", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#666" }}>
                      No companies found. Add your first company above.
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company._id} style={{ borderBottom: "1px solid #ddd" }}>
                      <td style={{ padding: 12 }}>{company.name}</td>
                      <td style={{ padding: 12, color: "#666" }}>{company.description || "—"}</td>
                      <td style={{ padding: 12, color: "#666" }}>
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 12, textAlign: "center" }}>
                        <button
                          onClick={() => handleEditCompany(company)}
                          style={{
                            padding: "5px 15px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            marginRight: 5,
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company._id)}
                          style={{
                            padding: "5px 15px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
