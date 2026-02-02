import { useState, useEffect } from "react";
import borgImg from "./assets/imgs/borg_img.jpg";

function EmployeeProfile({ token, userId, onProfileCompleted }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    personalEmail: "",
    mobileNumber: "",
    homeAddress: "",
    emergencyContactName: "",
    relationship: "",
    emergencyContactNumber: "",
    position: "",
    company: "",
    department: "",
    sssNumber: "",
    philhealthNumber: "",
    tinNumber: "",
    pagibigNumber: "",
  });

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const API_BASE_URL = "http://localhost:5000";

  const isApproved = approvalStatus === 1;

  // Handle mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const readOnlyValueStyle = {
    width: "100%",
    padding: isMobile ? "8px 10px" : "10px 12px",
    fontSize: isMobile ? 13 : 14,
    color: "#333",
    backgroundColor: "#f8f9fa",
    borderRadius: 4,
    border: "1px solid #e9ecef",
    boxSizing: "border-box",
    minHeight: isMobile ? 36 : 40,
    display: "flex",
    alignItems: "center",
    lineHeight: "20px",
  };

  // Fetch departments and existing profile
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch departments (now requires JWT)
        const deptResponse = await fetch(
          `${API_BASE_URL}/api/employee/departments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const deptData = await deptResponse.json();
        setDepartments(deptData);

        // Fetch existing employee profile
        if (token) {
          const profileResponse = await fetch(
            `${API_BASE_URL}/api/employee/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setFormData({
              firstName: profileData.firstName || "",
              lastName: profileData.lastName || "",
              birthDate: profileData.birthDate
                ? new Date(profileData.birthDate).toISOString().split("T")[0]
                : "",
              personalEmail: profileData.personalEmail || "",
              mobileNumber: profileData.mobileNumber || "",
              homeAddress: profileData.homeAddress || "",
              emergencyContactName: profileData.emergencyContactName || "",
              relationship: profileData.relationship || "",
              emergencyContactNumber: profileData.emergencyContactNumber || "",
              position: profileData.position || "",
              company: profileData.company || "",
              department: profileData.department || "",
              sssNumber: profileData.sssNumber || "",
              philhealthNumber: profileData.philhealthNumber || "",
              tinNumber: profileData.tinNumber || "",
              pagibigNumber: profileData.pagibigNumber || "",
            });
            setApprovalStatus(profileData.approval_status);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/employee/profile`, {
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

      setSuccess(true);
      setApprovalStatus(data.approval_status);
      
      // Notify parent that profile is completed AND approved
      if (onProfileCompleted && data.approval_status === 1) {
        onProfileCompleted();
      }
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <div style={{ marginBottom: isMobile ? 20 : 30 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24 }}>Employee Profile</h2>
        <p style={{ color: "#666", marginTop: 5, fontSize: isMobile ? 13 : 14 }}>
          {isApproved
            ? "Your employee profile has been approved and is now read-only."
            : "Please fill in your employee information. This information requires HR approval."}
        </p>
      </div>

  

      {approvalStatus !== null && !isApproved && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: isMobile ? 12 : 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #ffeaa7",
            fontSize: isMobile ? 13 : 14
          }}
        >
          <strong>Approval Status:</strong> ⏳ Pending Approval
        </div>
      )}


      {error && (
        <div
          style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: isMobile ? 12 : 15,
            borderRadius: 4,
            fontSize: isMobile ? 13 : 14,
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
            padding: isMobile ? 12 : 15,
            borderRadius: 4,
            marginBottom: 20,
            border: "1px solid #c3e6cb",
            fontSize: isMobile ? 13 : 14
          }}
        >
          ✓ Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div
          style={{
            backgroundColor: "#fff",
            padding: isMobile ? 20 : 30,
            borderRadius: 8,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* Personal Information Section */}
          <h3 style={{ marginTop: 0, marginBottom: 20, color: "#333", fontSize: isMobile ? 18 : 20 }}>
            Personal Information
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? 15 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
                First Name *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.firstName || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>
                Last Name *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.lastName || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Birthdate *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.birthDate ? new Date(formData.birthDate).toLocaleDateString() : "—"}
                </div>
              ) : (
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  disabled={approvalStatus === 0}
                  onChange={handleChange}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Personal Email *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.personalEmail || "—"}
                </div>
              ) : (
                <input
                  type="email"
                  name="personalEmail"
                  value={formData.personalEmail}
                  disabled={approvalStatus === 0}
                  onChange={handleChange}
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
              )}
            </div>
          </div>

          {/* Contact Information Section */}
          <h3 style={{ marginTop: 30, marginBottom: 20, color: "#333", fontSize: isMobile ? 18 : 20 }}>
            Contact Information
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? 15 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Mobile Number *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.mobileNumber || "—"}
                </div>
              ) : (
                <input
                  type="tel"
                  name="mobileNumber"
                  disabled={approvalStatus === 0}
                  value={formData.mobileNumber}
                  onChange={handleChange}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Home Address *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.homeAddress || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  disabled={approvalStatus === 0}
                  name="homeAddress"
                  value={formData.homeAddress}
                  onChange={handleChange}
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
              )}
            </div>
          </div>

          {/* Emergency Contact Section */}
          <h3 style={{ marginTop: 30, marginBottom: 20, color: "#333", fontSize: isMobile ? 18 : 20 }}>
            Emergency Contact
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? 15 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Emergency Contact Name *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.emergencyContactName || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  disabled={approvalStatus === 0}
                  name="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={handleChange}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Relationship *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.relationship || "—"}
                </div>
              ) : (
                <input
                  disabled={approvalStatus === 0}
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Contact Number *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.emergencyContactNumber || "—"}
                </div>
              ) : (
                <input
                  disabled={approvalStatus === 0}
                  type="tel"
                  name="emergencyContactNumber"
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
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
              )}
            </div>
          </div>

          {/* Work Information Section */}
          <h3 style={{ marginTop: 30, marginBottom: 20, color: "#333", fontSize: isMobile ? 18 : 20 }}>
            Work Information
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? 15 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Position *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.position || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Company *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.company || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
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
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Department *
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.department || "—"}
                </div>
              ) : (
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
                  required
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                    backgroundColor: "#fff",
                  }}
                >
                  <option value="">Select a department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Government ID Numbers Section */}
          <h3 style={{ marginTop: 30, marginBottom: 20, color: "#333", fontSize: isMobile ? 18 : 20 }}>
            Government ID Numbers
          </h3>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", 
            gap: isMobile ? 15 : 20, 
            marginBottom: 20 
          }}>
            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                SSS Number
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.sssNumber || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="sssNumber"
                  value={formData.sssNumber}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
                  placeholder="XX-XXXXXXX-X"
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                PhilHealth Number
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.philhealthNumber || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="philhealthNumber"
                  value={formData.philhealthNumber}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
                  placeholder="XX-XXXXXXXXX-X"
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                TIN Number
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.tinNumber || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="tinNumber"
                  value={formData.tinNumber}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
                  placeholder="XXX-XXX-XXX-XXX"
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 8, fontWeight: 500 }}>
                Pag-IBIG HDMF Number
              </label>
              {isApproved ? (
                <div style={readOnlyValueStyle}>
                  {formData.pagibigNumber || "—"}
                </div>
              ) : (
                <input
                  type="text"
                  name="pagibigNumber"
                  value={formData.pagibigNumber}
                  onChange={handleChange}
                  disabled={approvalStatus === 0}
                  placeholder="XXXX-XXXX-XXXX"
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              )}
            </div>
          </div>

          {/* Submit Button - Only show if not approved */}
          {approvalStatus !== 1 && (
            <div style={{ marginTop: 30 }}>
              <button
                type="submit"
                disabled={loading || approvalStatus === 0}
                style={{
                  padding: "12px 30px",
                  backgroundColor: loading || approvalStatus === 0 ? "#ccc" : "#CD1543",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: "bold",
                  cursor: loading || approvalStatus === 0 ? "not-allowed" : "pointer",
                  opacity: loading || approvalStatus === 0 ? 0.6 : 1,
                }}
              >
                {loading ? "Saving..." : approvalStatus === 0 ? "Pending Approval" : "Save Profile"}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

export default EmployeeProfile;
