import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

function Dashboard({ token, userRole, userId }) {
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const API_BASE_URL = process.env.REACT_APP_API_BASE_UR || process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchReceiptsData = async () => {
      try {
        setLoading(true);

        // Get current month start and end dates
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const startDate = firstDay.toISOString().split("T")[0];
        const endDate = lastDay.toISOString().split("T")[0];

        if (userRole === 1) {
          // Manager: fetch all receipts and personal receipts
          const allReceiptsResponse = await fetch(
            `${API_BASE_URL}/api/receipts/manager/all?startDate=${startDate}&endDate=${endDate}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (allReceiptsResponse.ok) {
            const allData = await allReceiptsResponse.json();
            setTotalReceiptsCount(allData.receipts?.length || 0);
            
            // Count manager's own receipts
            const managerReceipts = allData.receipts?.filter(
              receipt => receipt.userId?._id === userId
            );
            setReceiptsCount(managerReceipts?.length || 0);
          }
        } else {
          // Regular employees: fetch only their receipts
          const response = await fetch(
            `${API_BASE_URL}/api/receipts?startDate=${startDate}&endDate=${endDate}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            setReceiptsCount(data.receipts?.length || 0);
          }
        }

        // Fetch leave balance
        const leaveResponse = await fetch(
          `${API_BASE_URL}/api/leaves/balance`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          setLeaveBalance(leaveData);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceiptsData();
  }, [token, userRole, userId, API_BASE_URL]);

  const cardStyle = {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: isMobile ? 20 : 25,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: isMobile ? 120 : 140,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    cursor: "default"
  };

  const cardTitleStyle = {
    fontSize: isMobile ? 13 : 14,
    color: "#6c757d",
    marginBottom: 10,
    fontWeight: 500
  };

  const cardValueStyle = {
    fontSize: isMobile ? 32 : 48,
    fontWeight: "bold",
    marginBottom: 5
  };

  const cardSubtitleStyle = {
    fontSize: isMobile ? 12 : 14,
    color: "#6c757d"
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      {loading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : (
        <>
          <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>Dashboard</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
            gap: isMobile ? 15 : 20,
            marginBottom: 30
          }}>
          {/* Leaves Card */}
          <div style={{
            ...cardStyle,
            borderTop: "4px solid #28a745"
          }}>
            <div style={cardTitleStyle}>Leave Credits</div>
            <div>
              <div style={{ ...cardValueStyle, color: "#28a745" }}>
                {leaveBalance ? leaveBalance.availableCredits : "-"}
              </div>
              <div style={cardSubtitleStyle}>
                {leaveBalance ? `${leaveBalance.usedCredits} used / ${leaveBalance.totalCredits} total` : "Available"}
              </div>
            </div>
          </div>

          {/* My Receipts This Month */}
          <div style={{
            ...cardStyle,
            borderTop: "4px solid #dc3545"
          }}>
            <div style={cardTitleStyle}>My Receipts</div>
            <div>
              <div style={{ ...cardValueStyle, color: "#dc3545" }}>{receiptsCount}</div>
              <div style={cardSubtitleStyle}>This Month</div>
            </div>
          </div>

          {/* Manager Only: Total Receipts for All Employees */}
          {userRole === 1 && (
            <div style={{
              ...cardStyle,
              borderTop: "4px solid #ffc107"
            }}>
              <div style={cardTitleStyle}>All Employee Receipts</div>
              <div>
                <div style={{ ...cardValueStyle, color: "#ffc107" }}>{totalReceiptsCount}</div>
                <div style={cardSubtitleStyle}>This Month (All Staff)</div>
              </div>
            </div>
          )}

          {/* Placeholder Card */}
          <div style={{
            ...cardStyle,
            borderTop: "4px solid #6c757d"
          }}>
            <div style={cardTitleStyle}>Placeholder</div>
            <div>
              <div style={{ ...cardValueStyle, color: "#6c757d" }}>-</div>
              <div style={cardSubtitleStyle}>Coming Soon</div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 20 : 30,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          marginTop: 20
        }}>
          <h3 style={{ marginBottom: 15, fontSize: isMobile ? 18 : 20 }}>
            Welcome to Your Dashboard
          </h3>
          <p style={{ color: "#6c757d", lineHeight: 1.6, fontSize: isMobile ? 13 : 14 }}>
            This is your central hub for tracking leaves, reimbursements, and other important information.
            Use the sidebar to navigate to different sections of the application.
          </p>
        </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
