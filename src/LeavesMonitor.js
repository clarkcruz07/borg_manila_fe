import React, { useState, useEffect, useMemo, useCallback } from "react";

function LeavesMonitor({ token, userRole }) {
    // Save handler for updating leave credits
    const handleSave = async (rowId) => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/leaves/update-credits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rowId,
            vacation: editValues.vacation,
            sick: editValues.sick,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to update leave credits");
        setEditRowId(null);
        setEditValues({});
        fetchMonitorData();
      } catch (err) {
        setError(err.message || "Failed to update leave credits");
      } finally {
        setLoading(false);
      }
    };
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
  const [summaryRows, setSummaryRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editRowId, setEditRowId] = useState(null);
  const [editValues, setEditValues] = useState({});
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
      // Use leaveCreditsMode from monitor-summary data if present, default to 'auto'
      const rowsWithMode = (Array.isArray(data.rows) ? data.rows : []).map(row => ({
        ...row,
        leaveCreditsMode: row.leaveCreditsMode || 'auto',
      }));
      setSummaryRows(rowsWithMode);
      console.log(rowsWithMode);
    } catch (err) {
      setError(err.message || "Failed to load leave monitor data");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchMonitorData();
  }, [fetchMonitorData]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return summaryRows;

    return summaryRows.filter((row) => {
      const fullName = String(row.fullName || "").toLowerCase();
      const position = String(row.position || "").toLowerCase();
      const department = String(row.department || "").toLowerCase();
      return (
        fullName.includes(normalizedSearch) ||
        position.includes(normalizedSearch) ||
        department.includes(normalizedSearch)
      );
    });
  }, [summaryRows, searchTerm]);

  const hasRows = useMemo(() => filteredRows.length > 0, [filteredRows]);

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
        <div style={{ marginBottom: 15 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by employee, position, or department"
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

        {loading ? (
          <p style={{ color: "#6c757d", marginBottom: 0 }}>Loading...</p>
        ) : !hasRows ? (
          <p style={{ color: "#6c757d", marginBottom: 0 }}>
            {summaryRows.length === 0 ? "No leave records found." : "No employees matched your search."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Employee</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Vacation</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Sick</th>
                  <th style={{ padding: 12, textAlign: "right", fontSize: 14 }}>Leave Credits</th>
                  {(userRole === 1 || userRole === 2) && (
                    <th style={{ padding: 12, textAlign: "center", fontSize: 14 }}>Mode</th>
                  )}
                 
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const rowId = row.employeeId || row.userId || row.fullName;
                  const isEditing = editRowId === rowId;
                  return (
                    <tr key={rowId} style={{ borderBottom: "1px solid #dee2e6" }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ fontWeight: 600 }}>{row.fullName}</div>
                        <div style={{ fontSize: 12, color: "#6c757d" }}>{row.position}</div>
                      </td>
                      <td style={{ padding: 12, textAlign: "right" }}>
                        {isEditing && (userRole === 1 || userRole === 2) ? (
                          <input
                            type="number"
                            min={0}
                            value={editValues.vacation ?? row.vacation ?? 0}
                            onChange={e => setEditValues(v => ({ ...v, vacation: Number(e.target.value) }))}
                            style={{ width: 70, padding: 4, fontSize: 14 }}
                          />
                        ) : (
                          row.vacation || 0
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: "right" }}>
                        {isEditing && (userRole === 1 || userRole === 2) ? (
                          <input
                            type="number"
                            min={0}
                            value={editValues.sick ?? row.sick ?? 0}
                            onChange={e => setEditValues(v => ({ ...v, sick: Number(e.target.value) }))}
                            style={{ width: 70, padding: 4, fontSize: 14 }}
                          />
                        ) : (
                          row.sick || 0
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>
                        {isEditing && (userRole === 1 || userRole === 2)
                          ? Number(editValues.vacation ?? row.vacation ?? 0) + Number(editValues.sick ?? row.sick ?? 0)
                          : Number(row.vacation + row.sick) || 0}
                      </td>
                      {(userRole === 1 || userRole === 2) && (
                        <>
                          <td style={{ padding: 12, textAlign: "center" }}>
                            {isEditing ? (
                              <>
                                <button
                                  style={{ marginRight: 8, padding: "4px 10px", background: "#28a745", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
                                  onClick={() => handleSave(rowId)}
                                >Save</button>
                                <button
                                  style={{ padding: "4px 10px", background: "#6c757d", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
                                  onClick={() => setEditRowId(null)}
                                >Cancel</button>
                              </>
                            ) : (
                              <button
                                style={{ padding: "4px 10px", background: "#dc3545", color: "#fff", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer" }}
                                onClick={() => {
                                  setEditRowId(rowId);
                                  setEditValues({ vacation: row.vacation || 0, sick: row.sick || 0 });
                                }}
                              >Edit</button>
                            )}
                          </td>
                          
                        </>
                      )}
                    </tr>
                  );
                })}
                
               
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LeavesMonitor;
