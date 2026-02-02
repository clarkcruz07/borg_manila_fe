import { useState, useEffect } from "react";
import UploadReceipt from "./UploadReceipt";
import Login from "./Login";
import ChangePassword from "./ChangePassword";
import Users from "./Users";
import EmployeeProfile from "./EmployeeProfile";
import HRApprovals from "./HRApprovals";
import ManagerReimbursements from "./ManagerReimbursements";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("profile"); // Default to "profile" for testing
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://borg-manila-be.onrender.com";
  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedToken = localStorage.getItem("token");
    const storedEmail = localStorage.getItem("email");
    const storedUserId = localStorage.getItem("userId");
    const storedPasswordChanged = localStorage.getItem("passwordChanged");
    const storedRole = localStorage.getItem("role");

    if (storedToken && storedEmail && storedUserId) {
      setToken(storedToken);
      setCurrentUser(storedEmail);
      setUserId(storedUserId);
      setUserRole(parseInt(storedRole) || 3);
      
      if (storedPasswordChanged === "false") {
        setNeedsPasswordChange(true);
      }
    }

    setLoading(false);
  }, []);

  // Check if employee profile exists
  useEffect(() => {
    const checkEmployeeProfile = async () => {
      if (!token) {
        setCheckingProfile(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/employee/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profileData = await response.json();
          // Check if profile has all required fields filled AND is approved
          const isComplete = profileData.firstName && 
                            profileData.lastName && 
                            profileData.birthDate && 
                            profileData.personalEmail && 
                            profileData.mobileNumber && 
                            profileData.position && 
                            profileData.department;
          const isApproved = profileData.approval_status === 1;
          setHasEmployeeProfile(isComplete && isApproved);
        } else {
          setHasEmployeeProfile(false);
        }
      } catch (err) {
        console.error("Error checking profile:", err);
        setHasEmployeeProfile(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkEmployeeProfile();
  }, [token]);

  const handleProfileCompleted = () => {
    setHasEmployeeProfile(true);
  };

  const handleLoginSuccess = (idToken, newUserId, passwordChanged, email, role) => {
    setToken(idToken);
    setUserId(newUserId);
    setCurrentUser(email);
    setUserRole(role || 3);
    
    // Save all credentials to localStorage for session persistence
    localStorage.setItem("token", idToken);
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("email", email);
    localStorage.setItem("passwordChanged", passwordChanged);
    localStorage.setItem("role", role || 3);

    if (!passwordChanged) {
      setNeedsPasswordChange(true);
    }
  };

  const handlePasswordChanged = () => {
    setNeedsPasswordChange(false);
    localStorage.setItem("passwordChanged", "true");
    setCurrentUser(userId);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setUserId(null);
    setUserRole(null);
    setNeedsPasswordChange(false);
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("userId");
    localStorage.removeItem("passwordChanged");
    localStorage.removeItem("role");
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        fontSize: 18
      }}>
        Loading...
      </div>
    );
  }

  // If not logged in, show login page
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // If password needs to be changed, show password change page
  if (needsPasswordChange) {
    return <ChangePassword onPasswordChanged={handlePasswordChanged} token={token} userId={userId} />;
  }

  // If logged in and password changed, show main page
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }
          .sidebar.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0 !important;
            width: 100% !important;
          }
          .mobile-header {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-header {
            display: none !important;
          }
          .sidebar {
            transform: translateX(0) !important;
          }
        }
      `}</style>
      
      {/* Mobile Header */}
      <div className="mobile-header" style={{
        display: "none",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "#2c3e50",
        color: "#fff",
        padding: "15px 20px",
        zIndex: 1001,
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#fff",
            fontSize: 24,
            cursor: "pointer",
            padding: 5
          }}
        >
          ☰
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>Borg HRIS</h2>
        <div style={{ width: 34 }}></div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 999,
            display: "none"
          }}
          className="mobile-overlay"
        />
      )}
      <style>{`
        @media (max-width: 768px) {
          .mobile-overlay {
            display: block !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{
          width: 250,
          backgroundColor: "#2c3e50",
          color: "#fff",
          padding: "20px 0",
          boxShadow: "2px 0 5px rgba(0,0,0,0.1)",
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 1000,
          boxSizing: "border-box"
        }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #34495e", marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 5px 0", fontSize: 18 }}>Borg HRIS</h2>
          <p style={{ margin: 0, fontSize: 12, color: "#bdc3c7" }}>Logged in as: {currentUser}</p>
        </div>

        {/* Profile completion warning */}
        {!hasEmployeeProfile && !checkingProfile && (
          <div style={{
            margin: "0 15px 15px 15px",
            padding: "10px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: 4,
            fontSize: 12,
            border: "1px solid #ffeaa7"
          }}>
            <strong>⚠️ Action Required:</strong>
            <br />
            Complete and get your profile approved to unlock all features.
          </div>
        )}

        {/* Navigation buttons */}
        <nav style={{ padding: "0 15px" }}>
          <button
            onClick={() => { setCurrentPage("profile"); setSidebarOpen(false); }}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: currentPage === "profile" ? "#007bff" : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: currentPage === "profile" ? "4px solid #28a745" : "4px solid transparent"
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "profile") {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "profile") {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            My Profile
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { setCurrentPage("users"); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: currentPage === "users" ? "#007bff" : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: currentPage === "users" ? "4px solid #28a745" : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "users" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "users" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
              Users {!hasEmployeeProfile && "🔒"}
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { setCurrentPage("upload"); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: currentPage === "upload" ? "#007bff" : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: currentPage === "upload" ? "4px solid #28a745" : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "upload" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "upload" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            Reimbursements {!hasEmployeeProfile && "🔒"}
          </button>
          {(userRole === 1 || userRole === 2) && (
            <button
              onClick={() => { if (hasEmployeeProfile) { setCurrentPage("approvals"); setSidebarOpen(false); } }}
              disabled={!hasEmployeeProfile}
              style={{
                width: "100%",
                padding: "12px 15px",
                backgroundColor: currentPage === "approvals" ? "#007bff" : "transparent",
                color: hasEmployeeProfile ? "#fff" : "#6c757d",
                border: "none",
                borderRadius: 4,
                cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
                marginBottom: 10,
                fontSize: 14,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: currentPage === "approvals" ? "4px solid #28a745" : "4px solid transparent",
                opacity: hasEmployeeProfile ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (currentPage !== "approvals" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== "approvals" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Approvals {!hasEmployeeProfile && "🔒"}
            </button>
          )}
          {userRole === 1 && (
            <button
              onClick={() => { if (hasEmployeeProfile) { setCurrentPage("managerReimbursements"); setSidebarOpen(false); } }}
              disabled={!hasEmployeeProfile}
              style={{
                width: "100%",
                padding: "12px 15px",
                backgroundColor: currentPage === "managerReimbursements" ? "#007bff" : "transparent",
                color: hasEmployeeProfile ? "#fff" : "#6c757d",
                border: "none",
                borderRadius: 4,
                cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
                marginBottom: 10,
                fontSize: 14,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: currentPage === "managerReimbursements" ? "4px solid #28a745" : "4px solid transparent",
                opacity: hasEmployeeProfile ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (currentPage !== "managerReimbursements" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== "managerReimbursements" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Reimbursement Reports {!hasEmployeeProfile && "🔒"}
            </button>
          )}
        </nav>

        {/* Logout button at bottom */}
        <div style={{ position: "absolute", bottom: 20, width: "100%", padding: "0 15px", boxSizing: "border-box" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 15px",
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="main-content" style={{
        flex: 1,
        marginLeft: 250,
        padding: "20px",
        paddingTop: "70px",
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "calc(100% - 250px)",
        boxSizing: "border-box"
      }}>
        <style>{`
          @media (max-width: 768px) {
            .main-content {
              padding-top: 70px !important;
            }
          }
          @media (min-width: 769px) {
            .main-content {
              padding-top: 20px !important;
            }
          }
        `}</style>
        {/* Page content */}
        <div style={{ flex: 1 }}>
          {currentPage === "profile" && (
            <EmployeeProfile token={token} userId={userId} onProfileCompleted={handleProfileCompleted} />
          )}
          {currentPage === "users" && (
            <Users token={token} userRole={userRole} />
          )}
          {currentPage === "upload" && (
            <UploadReceipt token={token} userId={userId} />
          )}
          {currentPage === "approvals" && (
            <HRApprovals token={token} />
          )}
          {currentPage === "managerReimbursements" && (
            <ManagerReimbursements token={token} />
          )}
        </div>
      </main>
    </div>
    </>
  );
}

export default App;
