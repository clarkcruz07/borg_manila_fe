import React, { useState, useEffect, useMemo, useCallback } from "react";

function LeavesMonitor({ token }) {
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
  const [summaryRows, setSummaryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchMonitorData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(`${API_BASE_URL}/api/leaves/monitor-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load leave monitor data");
      }

      setSummaryRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setError(err.message || "Failed to load leave monitor data");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);

  const hasRows = useMemo(() => summaryRows.length > 0, [summaryRows]);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: isMobile ? 12 : 20 }}>
      <h2 style={{ marginBottom: isMobile ? 16 : 20, fontSize: isMobile ? 20 : 28 }}>
        Leaves Monitoring Dashboard
      </h2>

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

      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 14 : 20,
          marginBottom: isMobile ? 14 : 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <h3 style={{ marginBottom: 12, fontSize: isMobile ? 18 : 22 }}>All Leave Totals</h3>
        <p style={{ marginTop: 0, color: "#6c757d", fontSize: isMobile ? 12 : 14 }}>
          Totals are based on all leave records.
        </p>

        {loading ? (
          <p style={{ color: "#6c757d", marginBottom: 0 }}>Loading...</p>
        ) : !hasRows ? (
          <p style={{ color: "#6c757d", marginBottom: 0 }}>No leave records found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Employee</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Vacation</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Sick</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Leave Credits</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.employeeId || row.userId || row.fullName} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>{row.fullName}</div>
                      <div style={{ fontSize: 12, color: "#6c757d" }}>
                        {row.position}
                      </div>
                    </td>
                  
                    <td style={{ padding: 12, textAlign: "right" }}>{row.vacation  || 0}</td>
                    <td style={{ padding: 12, textAlign: "right" }}>{row.sick  || 0}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>{Number(row.vacation + row.sick) || 0}</td>
                  </tr>
                ))}
               
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeavesMonitor;
