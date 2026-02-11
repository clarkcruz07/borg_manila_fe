import React, { useState, useEffect } from "react";
import axios from "axios";

// Company location (same as Biometrics component)
const OFFICE_LOCATION = {
  latitude: 14.5829394,
  longitude: 121.0554831,
  radius: 100 // meters
};

function BiometricsMonitor({ token, userId }) {
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterUserId, setFilterUserId] = useState('');

  // Clock in/out states
  const [currentLocation, setCurrentLocation] = useState(null);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [distance, setDistance] = useState(null);
  const [withinRange, setWithinRange] = useState(false);
  const [clockedIn, setClockedIn] = useState(false);
  const [lastClockIn, setLastClockIn] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Reverse geocode to get address from coordinates
  const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      // Use Google Maps Geocoding API via a public reverse geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.error('Geocoding API error:', response.status);
        return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data); // Debug log
      
      if (data && data.address) {
        // Format a shorter, more readable address
        const addr = data.address;
        let shortAddress = '';
        
        // Build address from available components
        if (addr.road || addr.street) {
          shortAddress = addr.road || addr.street;
        } else if (addr.building || addr.house_name) {
          shortAddress = addr.building || addr.house_name;
        }
        
        if (addr.suburb || addr.neighbourhood || addr.quarter) {
          const area = addr.suburb || addr.neighbourhood || addr.quarter;
          shortAddress += shortAddress ? `, ${area}` : area;
        }
        
        if (addr.city || addr.municipality || addr.town) {
          const locality = addr.city || addr.municipality || addr.town;
          shortAddress += shortAddress ? `, ${locality}` : locality;
        }
        
        return shortAddress || data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
      
      return data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  // Start continuous location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });

        // Get address name from coordinates
        const address = await getAddressFromCoordinates(latitude, longitude);
        setCurrentAddress(address);

        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        );

        setDistance(Math.round(dist));
        setWithinRange(dist <= OFFICE_LOCATION.radius);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setLocationWatchId(watchId);
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    if (locationWatchId !== null) {
      navigator.geolocation.clearWatch(locationWatchId);
      setLocationWatchId(null);
    }
  };

  // Add notification
  const addNotification = (message) => {
    const newNotif = {
      message,
      time: new Date().toLocaleString(),
      timestamp: Date.now()
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  // Fetch clock status
  const fetchClockStatus = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/attendance/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClockedIn(response.data.clockedIn);
      if (response.data.lastClockIn) {
        setLastClockIn(new Date(response.data.lastClockIn).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch clock status:', err);
    }
  };

  // Handle Clock In
  const handleClockIn = async () => {
    if (!withinRange) {
      alert(`You must be within ${OFFICE_LOCATION.radius}m of the office to clock in`);
      return;
    }

    if (!currentLocation) {
      alert('Location not available. Please wait...');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/attendance/clock-in',
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: 10
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setClockedIn(true);
      setLastClockIn(new Date(response.data.timestamp).toLocaleString());
      addNotification(`✅ Clock In successful at ${new Date(response.data.timestamp).toLocaleTimeString()}`);
      alert(`✅ ${response.data.message}\nTime: ${new Date(response.data.timestamp).toLocaleString()}`);
      
      // Refresh summary after clock in
      fetchTodaySummary();
      fetchAttendanceRecords();
    } catch (err) {
      console.error('Clock in error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to clock in';
      alert(`❌ ${errorMsg}`);
    }
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (!withinRange) {
      alert(`You must be within ${OFFICE_LOCATION.radius}m of the office to clock out`);
      return;
    }

    if (!currentLocation) {
      alert('Location not available. Please wait...');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:5000/api/attendance/clock-out',
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          accuracy: 10
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setClockedIn(false);
      const clockOutTime = new Date(response.data.timestamp).toLocaleString();
      addNotification(`✅ Clock Out successful at ${new Date(response.data.timestamp).toLocaleTimeString()} - Duration: ${response.data.duration} minutes`);
      alert(`✅ ${response.data.message}\nTime: ${clockOutTime}\nDuration: ${response.data.duration} minutes`);
      
      // Refresh summary after clock out
      fetchTodaySummary();
      fetchAttendanceRecords();
    } catch (err) {
      console.error('Clock out error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to clock out';
      alert(`❌ ${errorMsg}`);
    }
  };

  // Fetch today's summary
  const fetchTodaySummary = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/attendance/today-summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodaySummary(response.data);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError('Failed to load attendance summary');
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedDate) {
        params.startDate = new Date(selectedDate).toISOString();
        const endDate = new Date(selectedDate);
        endDate.setDate(endDate.getDate() + 1);
        params.endDate = endDate.toISOString();
      }
      if (filterUserId) {
        params.userId = filterUserId;
      }

      const response = await axios.get('http://localhost:5000/api/attendance/monitor', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setAttendanceRecords(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch records:', err);
      setError('Failed to load attendance records');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySummary();
    fetchAttendanceRecords();
    fetchClockStatus();
    startLocationTracking();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTodaySummary();
      fetchAttendanceRecords();
    }, 30000);

    // Close notifications dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      stopLocationTracking();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedDate, filterUserId, showNotifications]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 20, position: "relative" }}>
      {/* Notification Bell Button */}
      <div className="notification-container" style={{ position: "absolute", top: 20, right: 20, zIndex: 1000 }}>
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            position: "relative",
            padding: "12px",
            backgroundColor: "#fff",
            border: "2px solid #007bff",
            borderRadius: "50%",
            width: 48,
            height: 48,
            cursor: "pointer",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#007bff";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fff";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <span style={{ fontSize: 20 }}>🔔</span>
          {notifications.length > 0 && (
            <span style={{
              position: "absolute",
              top: -5,
              right: -5,
              backgroundColor: "#dc3545",
              color: "white",
              borderRadius: "50%",
              width: 20,
              height: 20,
              fontSize: 11,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white"
            }}>
              {notifications.length}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div style={{
            position: "absolute",
            top: 60,
            right: 0,
            backgroundColor: "#fff",
            borderRadius: 8,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            minWidth: 320,
            maxHeight: 400,
            overflowY: "auto",
            border: "1px solid #dee2e6",
            zIndex: 1001
          }}>
            <div style={{
              padding: "15px 20px",
              borderBottom: "1px solid #dee2e6",
              fontWeight: "bold",
              fontSize: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={() => setNotifications([])}
                  style={{
                    fontSize: 12,
                    color: "#007bff",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Clear all
                </button>
              )}
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#6c757d",
                  fontSize: 14
                }}>
                  <div style={{ fontSize: 48, marginBottom: 10 }}>🔕</div>
                  <div>No notifications</div>
                </div>
              ) : (
                notifications.map((notif, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "15px 20px",
                      borderBottom: index < notifications.length - 1 ? "1px solid #f0f0f0" : "none",
                      cursor: "pointer",
                      transition: "background-color 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <div style={{ fontSize: 13, color: "#333", marginBottom: 5 }}>
                      {notif.message}
                    </div>
                    <div style={{ fontSize: 11, color: "#6c757d" }}>
                      {notif.time}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <h2 style={{ marginBottom: 20 }}>📊 Biometrics - Manager/HR Dashboard</h2>

      {/* Personal Attendance Table */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        border: "2px solid #007bff"
      }}>
        <h3 style={{ marginBottom: 15, color: "#007bff" }}>⏱️ Your Attendance</h3>
        
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, width: "20%" }}>Location Status</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, width: "15%" }}>Distance</th>
              <th style={{ padding: 12, textAlign: "left", fontSize: 14, width: "20%" }}>Last Action</th>
              <th style={{ padding: 12, textAlign: "center", fontSize: 14, width: "15%" }}>Status</th>
              <th style={{ padding: 12, textAlign: "center", fontSize: 14, width: "30%" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #dee2e6" }}>
              <td style={{ padding: 12 }}>
                {currentLocation ? (
                  <div>
                    <span style={{ fontSize: 13, color: "#333", fontWeight: "500" }}>
                      📍 {currentAddress || '🔄 Loading address...'}
                    </span>
                    <div style={{ fontSize: 11, color: "#6c757d", marginTop: 3 }}>
                      Coordinates: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </div>
                    {locationWatchId && (
                      <div style={{ fontSize: 11, color: "#28a745", marginTop: 3 }}>
                        🔄 Auto-tracking location
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#6c757d", fontSize: 14 }}>🔄 Loading location...</span>
                )}
              </td>
              <td style={{ padding: 12 }}>
                {distance !== null ? (
                  <span style={{ 
                    color: withinRange ? "#28a745" : "#dc3545", 
                    fontWeight: "bold",
                    fontSize: 16
                  }}>
                    {distance}m
                  </span>
                ) : (
                  <span style={{ color: "#6c757d" }}>-</span>
                )}
              </td>
              <td style={{ padding: 12 }}>
                {lastClockIn ? (
                  <span style={{ fontSize: 13 }}>{lastClockIn}</span>
                ) : (
                  <span style={{ color: "#6c757d" }}>-</span>
                )}
              </td>
              <td style={{ padding: 12, textAlign: "center" }}>
                {withinRange ? (
                  <span style={{
                    padding: "5px 12px",
                    backgroundColor: "#28a745",
                    color: "white",
                    borderRadius: 15,
                    fontSize: 12,
                    fontWeight: "bold"
                  }}>
                    ✅ In Range
                  </span>
                ) : (
                  <span style={{
                    padding: "5px 12px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    borderRadius: 15,
                    fontSize: 12,
                    fontWeight: "bold"
                  }}>
                    ❌ Out of Range
                  </span>
                )}
              </td>
              <td style={{ padding: 12, textAlign: "center" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button
                    onClick={handleClockIn}
                    disabled={!withinRange || clockedIn}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: clockedIn ? "#6c757d" : "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: 5,
                      cursor: withinRange && !clockedIn ? "pointer" : "not-allowed",
                      opacity: withinRange && !clockedIn ? 1 : 0.6,
                      fontSize: 13,
                      fontWeight: "bold"
                    }}
                  >
                    {clockedIn ? "✅ Clocked In" : "🟢 Clock In"}
                  </button>

                  <button
                    onClick={handleClockOut}
                    disabled={!withinRange || !clockedIn}
                    style={{
                      padding: "8px 16px",
                      backgroundColor: !clockedIn ? "#6c757d" : "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: 5,
                      cursor: withinRange && clockedIn ? "pointer" : "not-allowed",
                      opacity: withinRange && clockedIn ? 1 : 0.6,
                      fontSize: 13,
                      fontWeight: "bold"
                    }}
                  >
                    {!clockedIn ? "Not Clocked In" : "🔴 Clock Out"}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Monitoring Dashboard Below */}
      <h3 style={{ marginTop: 30, marginBottom: 20, color: "#6c757d" }}>👥 Team Monitoring</h3>

      {/* Today's Summary Cards */}
      {todaySummary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginBottom: 30 }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderLeft: "4px solid #007bff"
          }}>
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Total Employees</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#007bff" }}>{todaySummary.totalEmployees}</div>
          </div>

          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderLeft: "4px solid #28a745"
          }}>
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Clocked In Today</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#28a745" }}>{todaySummary.clockedIn}</div>
          </div>

          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderLeft: "4px solid #dc3545"
          }}>
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Not Clocked In</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#dc3545" }}>{todaySummary.notClockedIn}</div>
          </div>

          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 20,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
            borderLeft: "4px solid #ffc107"
          }}>
            <div style={{ fontSize: 14, color: "#6c757d", marginBottom: 5 }}>Clocked Out</div>
            <div style={{ fontSize: 32, fontWeight: "bold", color: "#ffc107" }}>{todaySummary.clockedOut}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 20,
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: 15 }}>🔍 Filters</h3>
        <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, color: "#6c757d" }}>
              Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ced4da",
                borderRadius: 5,
                fontSize: 14
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", marginBottom: 5, fontSize: 14, color: "#6c757d" }}>
              User ID (optional):
            </label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Filter by user ID"
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ced4da",
                borderRadius: 5,
                fontSize: 14
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={() => {
                setSelectedDate(new Date().toISOString().split('T')[0]);
                setFilterUserId('');
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 5,
                cursor: "pointer"
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Today's Active Sessions */}
      {todaySummary && todaySummary.records.length > 0 && (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: 20,
          marginBottom: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ marginBottom: 15 }}>👥 Today's Sessions</h3>
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
                      {record.employee ? `${record.employee.firstName} ${record.employee.lastName}` : 'Unknown'}
                      <br />
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        ID: {record.employee?.employeeId || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>{formatTime(record.clockIn)}</td>
                    <td style={{ padding: 12 }}>
                      {record.clockOut ? formatTime(record.clockOut) : '-'}
                    </td>
                    <td style={{ padding: 12 }}>
                      {formatDuration(record.duration)}
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {record.clockOut ? (
                        <span style={{
                          padding: "5px 10px",
                          backgroundColor: "#ffc107",
                          color: "#000",
                          borderRadius: 15,
                          fontSize: 12,
                          fontWeight: "bold"
                        }}>
                          Clocked Out
                        </span>
                      ) : (
                        <span style={{
                          padding: "5px 10px",
                          backgroundColor: "#28a745",
                          color: "white",
                          borderRadius: 15,
                          fontSize: 12,
                          fontWeight: "bold"
                        }}>
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

      {/* All Records */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: 15 }}>📋 Attendance Records</h3>
        
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
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Distance</th>
                  <th style={{ padding: 12, textAlign: "left", fontSize: 14 }}>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => (
                  <tr key={record._id || idx} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: 12 }}>
                      {record.employeeId ? `${record.employeeId.firstName} ${record.employeeId.lastName}` : 'Unknown'}
                      <br />
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        ID: {record.employeeId?.employeeId || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{
                        padding: "5px 10px",
                        backgroundColor: record.action === 'clock-in' ? "#28a745" : "#dc3545",
                        color: "white",
                        borderRadius: 15,
                        fontSize: 12,
                        fontWeight: "bold"
                      }}>
                        {record.action === 'clock-in' ? '🟢 Clock In' : '🔴 Clock Out'}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ color: record.distance <= 100 ? "#28a745" : "#dc3545" }}>
                        {record.distance}m
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 12, color: "#6c757d" }}>
                      {record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div style={{
        marginTop: 20,
        padding: 10,
        textAlign: "center",
        fontSize: 12,
        color: "#6c757d"
      }}>
        🔄 Auto-refreshing every 30 seconds
      </div>
    </div>
  );
}

export default BiometricsMonitor;
