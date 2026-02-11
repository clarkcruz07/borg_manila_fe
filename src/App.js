import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import UploadReceipt from "./UploadReceipt";
import Login from "./Login";
import ChangePassword from "./ChangePassword";
import Users from "./Users";
import Dashboard from "./Dashboard";
import EmployeeProfile from "./EmployeeProfile";
import HRApprovals from "./HRApprovals";
import ManagerReimbursements from "./ManagerReimbursements";
import Settings from "./Settings";
import LoadingSpinner from "./LoadingSpinner";
import Biometrics from "./Biometrics";
import BiometricsMonitor from "./BiometricsMonitor";
import Leaves from "./Leaves";
import Assets from "./Assets";

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const COLOR_DANGER = "#dc3545";
  const COLOR_DANGER_ACCENT = "#f96f7d";
  const COLOR_NAV_ACTIVE = COLOR_DANGER;
  const COLOR_NAV_ACTIVE_ACCENT = COLOR_DANGER_ACCENT;

  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasEmployeeProfile, setHasEmployeeProfile] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_UR || process.env.REACT_APP_API_BASE_URL;
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
    } else {
      // If no token, we don't need to check profile
      setCheckingProfile(false);
    }

    setLoading(false);
  }, []);

  // Check if employee profile exists (only on initial mount)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const isComplete = !!(profileData.firstName && 
                            profileData.lastName && 
                            profileData.birthDate && 
                            profileData.personalEmail && 
                            profileData.mobileNumber && 
                            profileData.position && 
                            profileData.department);
          const isApproved = profileData.approval_status === 1;
          const hasProfile = isComplete && isApproved;
          
          setHasEmployeeProfile(hasProfile);
          
          // Only redirect from root path after initial check
          if (location.pathname === '/' && !checkingProfile) {
            if (hasProfile) {
              navigate('/dashboard', { replace: true });
            } else {
              navigate('/profile', { replace: true });
            }
          }
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

    if (token) {
      checkEmployeeProfile();
    }
  }, [token, API_BASE_URL]);
  
  // Separate effect to handle initial navigation only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!checkingProfile && token) {
      if (location.pathname === '/') {
        if (hasEmployeeProfile) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/profile', { replace: true });
        }
      }
    }
  }, [checkingProfile, hasEmployeeProfile, token]);

  const handleProfileCompleted = () => {
    setHasEmployeeProfile(true);
    // After profile completion, navigate to dashboard
    navigate('/dashboard');
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
    setCurrentUser(localStorage.getItem("email") || currentUser);
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

  if (loading || checkingProfile) {
    return <LoadingSpinner size="large" message="Initializing application..." />;
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
            top: 62px !important;
            height: calc(100vh - 62px) !important;
          }
          .sidebar nav button {
            padding: 9px 12px !important;
            margin-bottom: 6px !important;
            font-size: 13px !important;
            line-height: 1.2 !important;
          }
          .sidebar nav button[data-subnav="true"] {
            padding-left: 22px !important;
            font-size: 12px !important;
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
        @media (max-height: 820px), (max-width: 1366px) {
          .sidebar nav button {
            padding: 8px 12px !important;
            margin-bottom: 4px !important;
            font-size: 13px !important;
            line-height: 1.15 !important;
          }
          .sidebar nav button[data-subnav="true"] {
            padding-left: 20px !important;
            font-size: 12px !important;
          }
          .sidebar > div:first-child {
            padding: 14px !important;
            margin-bottom: 12px !important;
          }
          .sidebar > nav {
            padding: 0 12px !important;
          }
          .sidebar [style*="position: absolute"][style*="bottom: 20px"] {
            bottom: 10px !important;
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
        backgroundColor: "#333",
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
        <img
          src="/borg-white-red.png"
          alt="Borg HCMS"
          style={{ height: 28, width: "auto", objectFit: "contain" }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
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
          backgroundColor: "#333",
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
        <div style={{ padding: "20px", borderBottom: "1px solid #fff", marginBottom: 20 }}>
         
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
            onClick={() => { navigate('/profile'); setSidebarOpen(false); }}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/profile' ? COLOR_NAV_ACTIVE : "transparent",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/profile' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent"
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== '/profile') {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== '/profile') {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            My Profile
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/dashboard'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/dashboard' ? COLOR_NAV_ACTIVE : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/dashboard' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/dashboard" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/dashboard" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
              Dashboard {!hasEmployeeProfile && "🔒"}
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/users'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/users' ? COLOR_NAV_ACTIVE : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/users' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/users" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/users" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
              Employees {!hasEmployeeProfile && "🔒"}
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/biometrics'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/biometrics' ? COLOR_DANGER : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/biometrics' ? `4px solid ${COLOR_DANGER_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/biometrics" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/biometrics" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
              Biometrics {!hasEmployeeProfile && "🔒"}
          </button>
          {(userRole === 1 || userRole === 2) && (
            <button
              data-subnav="true"
              onClick={() => { if (hasEmployeeProfile) { navigate('/biometrics/monitor'); setSidebarOpen(false); } }}
              disabled={!hasEmployeeProfile}
              style={{
                width: "100%",
                padding: "10px 15px 10px 30px",
                backgroundColor: location.pathname === '/biometrics/monitor' ? COLOR_NAV_ACTIVE : "transparent",
                color: hasEmployeeProfile ? "#fff" : "#6c757d",
                border: "none",
                borderRadius: 4,
                cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
                marginBottom: 10,
                fontSize: 13,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: location.pathname === '/biometrics/monitor' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
                opacity: hasEmployeeProfile ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== "/biometrics/monitor" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/biometrics/monitor" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Biometrics Monitor {!hasEmployeeProfile && "ðŸ”’"}
            </button>
          )}
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/leaves'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/leaves' ? COLOR_NAV_ACTIVE : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/leaves' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/leaves" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/leaves" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            Leaves {!hasEmployeeProfile && "🔒"}
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/reimbursements'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/reimbursements' ? COLOR_NAV_ACTIVE : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/reimbursements' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/reimbursements" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/reimbursements" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            Reimbursements {!hasEmployeeProfile && "🔒"}
          </button>
          <button
            onClick={() => { if (hasEmployeeProfile) { navigate('/assets'); setSidebarOpen(false); } }}
            disabled={!hasEmployeeProfile}
            style={{
              width: "100%",
              padding: "12px 15px",
              backgroundColor: location.pathname === '/assets' ? COLOR_NAV_ACTIVE : "transparent",
              color: hasEmployeeProfile ? "#fff" : "#6c757d",
              border: "none",
              borderRadius: 4,
              cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
              marginBottom: 10,
              fontSize: 14,
              textAlign: "left",
              transition: "all 0.3s ease",
              borderLeft: location.pathname === '/assets' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              opacity: hasEmployeeProfile ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== "/assets" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "#34495e";
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== "/assets" && hasEmployeeProfile) {
                e.target.style.backgroundColor = "transparent";
              }
            }}
          >
            Asset Management {!hasEmployeeProfile && "🔒"}
          </button>
          {(userRole === 1 || userRole === 2) && (
            <button
              onClick={() => { if (hasEmployeeProfile) { navigate('/approvals'); setSidebarOpen(false); } }}
              disabled={!hasEmployeeProfile}
              style={{
                width: "100%",
                padding: "12px 15px",
                backgroundColor: location.pathname === '/approvals' ? COLOR_NAV_ACTIVE : "transparent",
                color: hasEmployeeProfile ? "#fff" : "#6c757d",
                border: "none",
                borderRadius: 4,
                cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
                marginBottom: 10,
                fontSize: 14,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: location.pathname === '/approvals' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
                opacity: hasEmployeeProfile ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== "/approvals" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/approvals" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Approvals {!hasEmployeeProfile && "🔒"}
            </button>
          )}
          {userRole === 1 && (
            <>
            <button
              onClick={() => { if (hasEmployeeProfile) { navigate('/manager-reimbursements'); setSidebarOpen(false); } }}
              disabled={!hasEmployeeProfile}
              style={{
                width: "100%",
                padding: "12px 15px",
                backgroundColor: location.pathname === '/manager-reimbursements' ? COLOR_NAV_ACTIVE : "transparent",
                color: hasEmployeeProfile ? "#fff" : "#6c757d",
                border: "none",
                borderRadius: 4,
                cursor: hasEmployeeProfile ? "pointer" : "not-allowed",
                marginBottom: 10,
                fontSize: 14,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: location.pathname === '/manager-reimbursements' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
                opacity: hasEmployeeProfile ? 1 : 0.5
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== "/manager-reimbursements" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/manager-reimbursements" && hasEmployeeProfile) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Reimbursement Reports {!hasEmployeeProfile && "🔒"}
            </button>
            <button
              onClick={() => { navigate('/settings'); setSidebarOpen(false); }}
              style={{
                width: "100%",
                padding: "12px 15px",
                backgroundColor: location.pathname === '/settings' ? COLOR_NAV_ACTIVE : "transparent",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                marginBottom: 10,
                fontSize: 14,
                textAlign: "left",
                transition: "all 0.3s ease",
                borderLeft: location.pathname === '/settings' ? `4px solid ${COLOR_NAV_ACTIVE_ACCENT}` : "4px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== "/settings") {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== "/settings") {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              Settings
            </button>
            </>
          )}
        </nav>
        
        {/* Logout button at bottom */}
        <div style={{ position: "absolute", bottom: 20, width: "100%", padding: "0 15px", boxSizing: "border-box" }}>

          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "10px 15px",
              backgroundColor: COLOR_DANGER,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Logout
          </button>
          <div style={{
          fontSize: 12,
          padding: "10px 0px"
         }}>Made By: BORG Manila Babies</div>
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
          {checkingProfile ? (
            <LoadingSpinner />
          ) : (
            <Routes>
              <Route path="/" element={<Navigate to={hasEmployeeProfile ? "/dashboard" : "/profile"} replace />} />
              <Route path="/profile" element={<EmployeeProfile token={token} userId={userId} onProfileCompleted={handleProfileCompleted} />} />
              <Route path="/dashboard" element={hasEmployeeProfile ? <Dashboard token={token} userRole={userRole} userId={userId} /> : <Navigate to="/profile" replace />} />
              <Route path="/users" element={hasEmployeeProfile ? <Users token={token} userRole={userRole} /> : <Navigate to="/profile" replace />} />
              <Route path="/biometrics" element={hasEmployeeProfile ? (
                <Biometrics token={token} userId={userId} userRole={userRole} />
              ) : <Navigate to="/profile" replace />} />
              <Route path="/biometrics/monitor" element={hasEmployeeProfile && (userRole === 1 || userRole === 2) ? (
                <BiometricsMonitor token={token} userId={userId} />
              ) : <Navigate to="/profile" replace />} />
              <Route path="/leaves" element={hasEmployeeProfile ? <Leaves token={token} userId={userId} userRole={userRole} /> : <Navigate to="/profile" replace />} />
              <Route path="/reimbursements" element={hasEmployeeProfile ? <UploadReceipt token={token} userId={userId} /> : <Navigate to="/profile" replace />} />
              <Route path="/assets" element={hasEmployeeProfile ? <Assets token={token} /> : <Navigate to="/profile" replace />} />
              <Route path="/approvals" element={hasEmployeeProfile && (userRole === 1 || userRole === 2) ? <HRApprovals token={token} /> : <Navigate to="/profile" replace />} />
              <Route path="/manager-reimbursements" element={hasEmployeeProfile && userRole === 1 ? <ManagerReimbursements token={token} /> : <Navigate to="/profile" replace />} />
              <Route path="/settings" element={userRole === 1 ? <Settings token={token} /> : <Navigate to="/profile" replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
    </>
  );
}

export default App;
