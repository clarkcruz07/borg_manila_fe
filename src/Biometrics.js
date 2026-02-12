import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE_URL = process.env.REACT_APP_API_BASE_UR || process.env.REACT_APP_API_BASE_URL;

function Biometrics({ token }) {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Month/Year filter
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate start and end dates for the selected month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const response = await axios.get(`${API_BASE_URL}/api/attendance/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 1000
        }
      });

      setAttendanceHistory(response.data);
    } catch (err) {
      console.error("Failed to fetch attendance history:", err);
      setError("Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  }, [token, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (minutes) => {
    if (typeof minutes !== 'number' || minutes < 0) return "N/A";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Group attendance by date
  const groupByDate = () => {
    const grouped = {};
    attendanceHistory.forEach(record => {
      const date = new Date(record.timestamp).toDateString();
      if (!grouped[date]) {
        grouped[date] = { clockIn: null, clockOut: null };
      }
      if (record.action === 'clock-in') {
        grouped[date].clockIn = record;
      } else if (record.action === 'clock-out') {
        grouped[date].clockOut = record;
      }
    });
    return grouped;
  };

  const groupedData = groupByDate();

  // Generate month options (last 12 months)
  const generateMonthOptions = () => {
    const options = [];
    const current = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
      options.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      });
    }
    return options;
  };

  const monthOptions = generateMonthOptions();

  // Calculate summary stats
  const calculateStats = () => {
    const dates = Object.keys(groupedData).length;
    let totalMinutes = 0;

    Object.values(groupedData).forEach(day => {
      if (day.clockIn && day.clockOut && typeof day.clockOut.duration === 'number') {
        totalMinutes += day.clockOut.duration;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = Math.round(totalMinutes % 60);

    return {
      daysPresent: dates,
      totalHours,
      totalMinutes: remainingMinutes,
      formattedTotal: `${totalHours}h ${remainingMinutes}m`
    };
  };

  const stats = calculateStats();

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>
        Attendance History
      </h2>

      {/* Month Selector and Summary */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: isMobile ? 15 : 25,
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}>
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: isMobile ? 15 : 20,
          marginBottom: 20
        }}>
          <div style={{ flex: 1 }}>
            <label style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
              fontSize: isMobile ? 13 : 14,
              color: "#333"
            }}>
              Select Month:
            </label>
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split("-");
                setSelectedYear(parseInt(year));
                setSelectedMonth(parseInt(month));
              }}
              style={{
                width: "100%",
                padding: isMobile ? "10px 12px" : "12px 15px",
                border: "1px solid #ddd",
                borderRadius: 5,
                fontSize: isMobile ? 13 : 14,
                backgroundColor: "#fff",
                cursor: "pointer"
              }}
            >
              {monthOptions.map(option => (
                <option key={`${option.year}-${option.month}`} value={`${option.year}-${option.month}`}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Stats */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: isMobile ? 10 : 15,
            flex: 2
          }}>
            <div style={{
              padding: isMobile ? 12 : 15,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              textAlign: "center"
            }}>
              <div style={{ fontSize: isMobile ? 10 : 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Days Present
              </div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#dc3545" }}>
                {stats.daysPresent}
              </div>
            </div>

            <div style={{
              padding: isMobile ? 12 : 15,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              textAlign: "center"
            }}>
              <div style={{ fontSize: isMobile ? 10 : 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Total Hours
              </div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: "bold", color: "#28a745" }}>
                {stats.totalHours}h
              </div>
            </div>

            <div style={{
              padding: isMobile ? 12 : 15,
              backgroundColor: "#f8f9fa",
              borderRadius: 8,
              textAlign: "center",
              gridColumn: isMobile ? "span 2" : "auto"
            }}>
              <div style={{ fontSize: isMobile ? 10 : 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Total Time
              </div>
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: "bold", color: "#ffc107" }}>
                {stats.formattedTotal}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: isMobile ? 12 : 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      }}>
        {loading ? (
          <LoadingSpinner message="Loading attendance history..." />
        ) : error ? (
          <div style={{
            padding: isMobile ? 15 : 20,
            textAlign: "center",
            color: "#dc3545",
            backgroundColor: "#f8d7da",
            borderRadius: 5,
            fontSize: isMobile ? 13 : 14
          }}>
            {error}
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div style={{
            padding: isMobile ? 30 : 40,
            textAlign: "center",
            color: "#6c757d",
            fontSize: isMobile ? 13 : 14
          }}>
            No attendance records for this month
          </div>
        ) : (
          <div>
            {isMobile ? (
              /* Mobile Card Layout */
              <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
                {Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a)).map((date) => {
                  const day = groupedData[date];
                  return (
                    <div key={date} style={{
                      backgroundColor: "#f8f9fa",
                      borderRadius: 8,
                      padding: 15,
                      border: "1px solid #dee2e6"
                    }}>
                      <div style={{ fontWeight: "bold", marginBottom: 12, color: "#333", fontSize: 14 }}>
                        {formatDate(day.clockIn?.timestamp || day.clockOut?.timestamp)}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>Clock In</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {day.clockIn ? formatTime(day.clockIn.timestamp) : "-"}
                          </div>
                          {day.clockIn && (
                            <div style={{ fontSize: 10, color: "#6c757d", marginTop: 2 }}>
                              {day.clockIn.workMode === 'WFH' ? 'WFH' : 'Office'}
                            </div>
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 3 }}>Clock Out</div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {day.clockOut ? formatTime(day.clockOut.timestamp) : "-"}
                          </div>
                          {day.clockOut && typeof day.clockOut.duration === 'number' && (
                            <div style={{ fontSize: 10, color: "#28a745", marginTop: 2 }}>
                              ⏱️ {formatDuration(day.clockOut.duration)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop Table Layout */
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Date</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Clock In</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Mode</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Clock Out</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a)).map((date, index) => {
                    const day = groupedData[date];
                    return (
                      <tr key={date} style={{
                        borderBottom: "1px solid #dee2e6",
                        backgroundColor: index % 2 === 0 ? "#fff" : "#f8f9fa"
                      }}>
                        <td style={{ padding: 12 }}>
                          {formatDate(day.clockIn?.timestamp || day.clockOut?.timestamp)}
                        </td>
                        <td style={{ padding: 12 }}>
                          {day.clockIn ? formatTime(day.clockIn.timestamp) : "-"}
                        </td>
                        <td style={{ padding: 12 }}>
                          {day.clockIn ? (
                            <span style={{
                              padding: "4px 10px",
                              backgroundColor: day.clockIn.workMode === 'WFH' ? '#dc3545' : '#28a745',
                              color: "#fff",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 600
                            }}>
                              {day.clockIn.workMode === 'WFH' ? 'WFH' : 'Office'}
                            </span>
                          ) : "-"}
                        </td>
                        <td style={{ padding: 12 }}>
                          {day.clockOut ? formatTime(day.clockOut.timestamp) : "-"}
                        </td>
                        <td style={{ padding: 12, fontWeight: 600, color: "#28a745" }}>
                          {day.clockOut && typeof day.clockOut.duration === 'number' ? formatDuration(day.clockOut.duration) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: 20,
        padding: isMobile ? 12 : 15,
        backgroundColor: "#f3f3f3",
        borderRadius: 5,
        fontSize: isMobile ? 11 : 13,
        color: "#000",
      }}>
        <strong> About Attendance History:</strong>
        <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: isMobile ? 20 : 30 }}>
          <li>View your complete attendance records filtered by month</li>
          <li>Track your total working hours and days present</li>
          <li>See whether you worked from office or home</li>
          <li>Duration is calculated automatically when you clock out</li>
        </ul>
      </div>
    </div>
  );
}

export default Biometrics;
