import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

function BiometricsMonitor({ token }) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchTodaySummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/today-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTodaySummary(response.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
      setError("Failed to load monitoring summary");
    }
  }, [API_BASE_URL, token]);

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (selectedDate) {
        params.startDate = new Date(selectedDate).toISOString();
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1);
        params.endDate = endDate.toISOString();
      }

      const response = await axios.get(`${API_BASE_URL}/api/attendance/monitor`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setAttendanceRecords(response.data);
    } catch (err) {
      console.error("Failed to fetch records:", err);
      setError("Failed to load biometrics records");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token, selectedDate]);

  useEffect(() => {
    fetchTodaySummary();
    fetchAttendanceRecords();

    const interval = setInterval(() => {
      fetchTodaySummary();
      fetchAttendanceRecords();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTodaySummary, fetchAttendanceRecords]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? 12 : 20 }}>
      <h2 style={{ marginBottom: isMobile ? 16 : 20, fontSize: isMobile ? 20 : 28 }}>
        Biometrics Monitoring Dashboard
      </h2>

      {/* Team Summary */}
      {todaySummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: isMobile ? 10 : 15,
            marginBottom: isMobile ? 18 : 30,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: isMobile ? 14 : 20,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderLeft: "4px solid #dc3545",
            }}
          >
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Total Employees</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#dc3545" }}>
              {todaySummary.totalEmployees}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: isMobile ? 14 : 20,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderLeft: "4px solid #28a745",
            }}
          >
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Clocked In Today</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#28a745" }}>
              {todaySummary.clockedIn}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: isMobile ? 14 : 20,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderLeft: "4px solid #dc3545",
            }}
          >
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Not Clocked In</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#dc3545" }}>
              {todaySummary.notClockedIn}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: isMobile ? 14 : 20,
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              borderLeft: "4px solid #ffc107",
            }}
          >
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Clocked Out</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#ffc107" }}>
              {todaySummary.clockedOut}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 14 : 20,
          marginBottom: isMobile ? 14 : 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: isMobile ? 10 : 15, fontSize: isMobile ? 18 : 22 }}>Filters</h3>
        <div style={{ display: "flex", gap: isMobile ? 10 : 15, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: isMobile ? "100%" : 200 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, color: "#6c757d" }}>
              Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                padding: isMobile ? "8px 10px" : 10,
                border: "1px solid #ced4da",
                borderRadius: 5,
                fontSize: isMobile ? 13 : 14,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", width: isMobile ? "100%" : "auto" }}>
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }}
              style={{
                padding: isMobile ? "9px 14px" : "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 5,
                cursor: "pointer",
                fontSize: isMobile ? 13 : 14,
                width: isMobile ? "100%" : "auto",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Today's Sessions */}
      {todaySummary && todaySummary.records.length > 0 && (
        <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 14 : 20,
          marginBottom: isMobile ? 14 : 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
          <h3 style={{ marginBottom: 15 }}>Today&apos;s Sessions</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Employee</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Clock In</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Clock Out</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Duration</th>
                  <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todaySummary.records.map((record, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: 12 }}>
                      {record.employee
                        ? `${record.employee.firstName} ${record.employee.lastName}`
                        : "Unknown"}
                      <br />
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        ID: {record.employee?.employeeId || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{formatTime(record.clockIn)}</td>
                    <td style={{ padding: 12 }}>{record.clockOut ? formatTime(record.clockOut) : "-"}</td>
                    <td style={{ padding: 12 }}>{formatDuration(record.duration)}</td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {record.clockOut ? (
                        <span
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#ffc107",
                            color: "#000",
                            borderRadius: 15,
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          Clocked Out
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: "5px 10px",
                            backgroundColor: "#28a745",
                            color: "white",
                            borderRadius: 15,
                            fontSize: 12,
                            fontWeight: "bold",
                          }}
                        >
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Biometrics Records */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 14 : 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: 15 }}>Biometrics Records</h3>

        {loading ? (
          <p style={{ textAlign: "center", color: "#6c757d" }}>Loading records...</p>
        ) : attendanceRecords.length === 0 ? (
          <p style={{ textAlign: "center", color: "#6c757d" }}>No records found</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Employee</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Action</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Timestamp</th>
                  
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => (
                  <tr key={record._id || idx} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: 12 }}>
                      {record.employeeId
                        ? `${record.employeeId.firstName} ${record.employeeId.lastName}`
                        : "Unknown"}
                      <br />
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        ID: {record.employeeId?.employeeId || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          padding: "5px 10px",
                          backgroundColor: record.action === "clock-in" ? "#28a745" : "#dc3545",
                          color: "white",
                          borderRadius: 15,
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        {record.action === "clock-in" ? "Clock In" : "Clock Out"}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{new Date(record.timestamp).toLocaleString()}</td>
                    
                    <td style={{ padding: 12, fontSize: 12, color: "#6c757d" }}>
                      {record.location && typeof record.location.latitude === "number" && typeof record.location.longitude === "number"
                        ? `${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}`
                        : "Location unavailable"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 10,
          textAlign: "center",
          fontSize: 12,
          color: "#6c757d",
        }}
      >
        Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}

export default BiometricsMonitor;
