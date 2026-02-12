import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import LoadingSpinner from "./LoadingSpinner";

const OFFICE_LOCATION = {
  latitude: 14.5829394,
  longitude: 121.0554831,
  radius: 100 // meters
};

function Dashboard({ token, userRole, userId }) {
  const [receiptsCount, setReceiptsCount] = useState(0);
  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Attendance states
  const [currentLocation, setCurrentLocation] = useState(null);
  const [withinRange, setWithinRange] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [error, setError] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [lastClockIn, setLastClockIn] = useState(null);
  const locationWatchIdRef = useRef(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [clockInStatus, setClockInStatus] = useState(null);
  const [workMode, setWorkMode] = useState('Office');
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [loadingStep, setLoadingStep] = useState(null);
  
  const API_BASE_URL = process.env.REACT_APP_API_BASE_UR || process.env.REACT_APP_API_BASE_URL;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
  }, []);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    setLoadingLocation(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });

        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        );

        setWithinRange(dist <= OFFICE_LOCATION.radius);
        setLoadingLocation(false);
      },
      (err) => {
        console.error('Location error:', err);
        if (workMode === 'Office') {
          setError(`Location error: ${err.message}. Please ensure location services are enabled.`);
        }
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      }
    );
  }, [calculateDistance, workMode]);

  // Start continuous location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });

        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        );

        setWithinRange(dist <= OFFICE_LOCATION.radius);
        setLoadingLocation(false);
      },
      (err) => {
        console.error('Location tracking error:', err);
        if (workMode === 'Office') {
          setError(`Location tracking error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 10000,
      }
    );

    locationWatchIdRef.current = watchId;
    setIsTrackingLocation(true);
  }, [calculateDistance, workMode]);

  // Stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
      setIsTrackingLocation(false);
    }
  }, []);

  // Fetch clock status from backend
  const fetchClockStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/attendance/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClockedIn(response.data.clockedIn);
      if (response.data.lastClockIn) {
        setLastClockIn(new Date(response.data.lastClockIn).toLocaleString());
      }
    } catch (err) {
      console.error('Failed to fetch clock status:', err);
    }
  }, [token, API_BASE_URL]);

  // Start camera for selfie
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      alert('Unable to access camera. Please grant camera permission.');
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && stream) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        setCapturedImage(blob);
        stopCamera();
        
        if (pendingAction === 'clock-in') {
          performClockIn(blob);
        } else if (pendingAction === 'clock-out') {
          performClockOut(blob);
        }
        setPendingAction(null);
      }, 'image/jpeg', 0.8);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
    setPendingAction(null);
    setLoadingStep(null);
  };

  // Setup video stream when camera is shown
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error('Video play error:', err);
      });
    }
  }, [showCamera, stream]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Auto-fetch location and status on mount
  useEffect(() => {
    fetchClockStatus();
    
    if (workMode === 'WFH') {
      setError(null);
      stopLocationTracking();
    }
    
    if (workMode === 'Office') {
      getCurrentLocation();
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [workMode, fetchClockStatus, getCurrentLocation, startLocationTracking, stopLocationTracking]);

  // Perform the actual clock in API call
  const performClockIn = async (imageBlob) => {
    setLoadingStep('Submitting attendance...');
    try {
      const formData = new FormData();
      formData.append('workMode', workMode);
      formData.append('biometricVerified', 'false');
      
      if (workMode === 'Office' && currentLocation) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('accuracy', '10');
      } else if (workMode === 'WFH' && currentLocation) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('accuracy', '10');
      }
      
      if (imageBlob) {
        formData.append('biometricImage', imageBlob, 'selfie.jpg');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/attendance/clock-in`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setClockedIn(true);
      setLastClockIn(new Date(response.data.timestamp).toLocaleString());
      setClockInStatus(`✅ ${response.data.message}\nTime: ${new Date(response.data.timestamp).toLocaleString()}`);
      
      setCapturedImage(null);
      setLoadingStep(null);
    } catch (err) {
      console.error('Clock in error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to clock in';
      alert(`❌ ${errorMsg}`);
      setCapturedImage(null);
      setLoadingStep(null);
    }
  };

  // Perform the actual clock out API call
  const performClockOut = async (imageBlob) => {
    setLoadingStep('Submitting attendance...');
    try {
      const formData = new FormData();
      formData.append('workMode', workMode);
      formData.append('biometricVerified', 'false');
      
      if (workMode === 'Office' && currentLocation) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('accuracy', '10');
      } else if (workMode === 'WFH' && currentLocation) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('accuracy', '10');
      }
      
      if (imageBlob) {
        formData.append('biometricImage', imageBlob, 'selfie.jpg');
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/attendance/clock-out`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setClockedIn(false);
      const clockOutTime = new Date(response.data.timestamp).toLocaleString();
      setClockInStatus(`✅ ${response.data.message}\nTime: ${clockOutTime}\nDuration: ${response.data.duration} minutes`);
      
      setCapturedImage(null);
      setLoadingStep(null);
    } catch (err) {
      console.error('Clock out error:', err);
      const errorMsg = err.response?.data?.error || 'Failed to clock out';
      alert(`❌ ${errorMsg}`);
      setCapturedImage(null);
      setLoadingStep(null);
    }
  };

  // Handle Clock In
  const handleClockIn = async () => {
    if (workMode === 'Office') {
      if (!withinRange) {
        setClockInStatus(`You must be within ${OFFICE_LOCATION.radius}m of the office to clock in as Office mode`);
        setLoadingStep(null);
        return;
      }

      if (!currentLocation) {
        setClockInStatus('Location not available. Please wait...');
        setLoadingStep(null);
        return;
      }
    }

    setLoadingStep('Capturing photo...');
    setPendingAction('clock-in');
    await startCamera();
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    if (workMode === 'Office') {
      if (!withinRange) {
        setClockInStatus(`You must be within ${OFFICE_LOCATION.radius}m of the office to clock out as Office mode`);
        setLoadingStep(null);
        return;
      }

      if (!currentLocation) {
        setClockInStatus('Location not available. Please wait...');
        setLoadingStep(null);
        return;
      }
    }

    setLoadingStep('Capturing photo...');
    setPendingAction('clock-out');
    await startCamera();
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const startDate = firstDay.toISOString().split("T")[0];
        const endDate = lastDay.toISOString().split("T")[0];

        if (userRole === 1) {
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
            
            const managerReceipts = allData.receipts?.filter(
              receipt => receipt.userId?._id === userId
            );
            setReceiptsCount(managerReceipts?.length || 0);
          }
        } else {
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

    fetchData();
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
      {/* Loading Overlay */}
      {loadingStep && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: isMobile ? 20 : 40,
            textAlign: "center",
            maxWidth: isMobile ? '90%' : 400,
            width: '100%',
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              width: isMobile ? 50 : 60,
              height: isMobile ? 50 : 60,
              border: `${isMobile ? '5' : '6'}px solid #f3f3f3`,
              borderTop: `${isMobile ? '5' : '6'}px solid #dc3545`,
              borderRadius: "50%",
              margin: "0 auto 25px",
              animation: "spin 1s linear infinite"
            }} />
            
            <h3 style={{ 
              margin: 0, 
              fontSize: isMobile ? 16 : 20, 
              color: "#333",
              fontWeight: 600,
              marginBottom: 10
            }}>
              {loadingStep}
            </h3>
            
            <p style={{ 
              margin: 0, 
              fontSize: isMobile ? 12 : 14, 
              color: "#6c757d"
            }}>
              Please wait, do not navigate away
            </p>
          </div>
          
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Camera Interface */}
      {showCamera && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.9)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 10000,
          padding: 20
        }}>
          <h3 style={{
            color: "#fff",
            marginBottom: 20,
            fontSize: isMobile ? 18 : 22,
            textAlign: "center"
          }}>
            📸 Take a Selfie for Attendance
          </h3>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              maxWidth: isMobile ? "100%" : "600px",
              height: isMobile ? "auto" : "auto",
              maxHeight: isMobile ? "50vh" : "70vh",
              borderRadius: 8,
              marginBottom: 20
            }}
          />
          <p style={{
            color: "#fff",
            marginBottom: 15,
            fontSize: isMobile ? 12 : 14,
            textAlign: "center"
          }}>
            After capturing, your attendance will be submitted automatically
          </p>
          <div style={{ display: "flex", flexDirection: isMobile ? 'column' : ' row', gap: 15, width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={capturePhoto}
              style={{
                padding: isMobile ? "10px 20px" : "12px 30px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                width: isMobile ? '100%' : 'auto'
              }}
            >
              📸 Capture Photo
            </button>
            <button
              onClick={stopCamera}
              style={{
                padding: isMobile ? "10px 20px" : "12px 30px",
                backgroundColor: "#dc3545",
                color: "#fff",
                border: "none",
                borderRadius: 5,
                fontSize: isMobile ? 14 : 16,
                cursor: "pointer",
                width: isMobile ? '100%' : 'auto'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading dashboard data..." />
      ) : (
        <>
          <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>Dashboard</h2>

          {/* Attendance Clock In/Out Section */}
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: isMobile ? 15 : 25,
            marginBottom: 30,
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: isMobile ? 18 : 20 }}>Attendance</h3>
            
            {clockInStatus && (
              <div style={{ 
                color: "rgb(114, 28, 36)", 
                padding: isMobile ? 10 : 12, 
                backgroundColor: "rgb(253, 236, 239)", 
                borderRadius: 5, 
                marginBottom: 15,
                fontSize: isMobile ? 12 : 14
              }}>
                <strong>{clockInStatus}</strong> 
              </div>
            )}
            
            {error && (
              <div style={{ 
                color: "#dc3545", 
                padding: isMobile ? 10 : 12, 
                backgroundColor: "#f8d7da", 
                borderRadius: 5, 
                marginBottom: 15,
                fontSize: isMobile ? 12 : 14
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Work Mode Selection */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 10, fontSize: isMobile ? 14 : 16 }}>Select Work Mode:</h4>
              <div style={{ display: "flex", flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 20 }}>
                <label style={{ display: "flex", alignItems: "center", cursor: clockedIn ? "not-allowed" : "pointer", opacity: clockedIn ? 0.5 : 1 }}>
                  <input
                    type="radio"
                    value="Office"
                    checked={workMode === 'Office'}
                    onChange={(e) => setWorkMode(e.target.value)}
                    disabled={clockedIn}
                    style={{ marginRight: 8, width: 18, height: 18, cursor: clockedIn ? "not-allowed" : "pointer" }}
                  />
                  <span style={{ fontSize: isMobile ? 14 : 15 }}>🏢 Office</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", cursor: clockedIn ? "not-allowed" : "pointer", opacity: clockedIn ? 0.5 : 1 }}>
                  <input
                    type="radio"
                    value="WFH"
                    checked={workMode === 'WFH'}
                    onChange={(e) => setWorkMode(e.target.value)}
                    disabled={clockedIn}
                    style={{ marginRight: 8, width: 18, height: 18, cursor: clockedIn ? "not-allowed" : "pointer" }}
                  />
                  <span style={{ fontSize: isMobile ? 14 : 15 }}>🏠 Work From Home</span>
                </label>
              </div>
              <div style={{ 
                fontSize: isMobile ? 11 : 13, 
                color: clockedIn ? "#856404" : "#6c757d", 
                marginTop: 10, 
                backgroundColor: clockedIn ? "#fff3cd" : "transparent", 
                padding: clockedIn ? 8 : 0, 
                borderRadius: clockedIn ? 4 : 0 
              }}>
                {clockedIn 
                  ? '🔒 Work mode is locked once clocked in. Please clock out first to change mode.' 
                  : workMode === 'Office' 
                    ? '⚠️ Office mode requires you to be within office location radius' 
                    : '✓ WFH mode does not require location verification'}
              </div>
            </div>

            {/* Attendance Status */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", 
              gap: isMobile ? 15 : 20,
              marginBottom: 20
            }}>
              <div style={{ padding: isMobile ? 12 : 15, backgroundColor: "#f8f9fa", borderRadius: 8 }}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                  Location Status
                </div>
                <div style={{ fontSize: isMobile ? 13 : 14 }}>
                  {workMode === 'WFH' ? (
                    <span style={{ color: "#6c757d" }}>🏠 Not required</span>
                  ) : currentLocation ? (
                    <div>
                      <span style={{ color: "#333" }}>📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}</span>
                      {isTrackingLocation && (
                        <div style={{ fontSize: isMobile ? 10 : 11, color: "#28a745", marginTop: 3 }}>
                          🔄 Auto-tracking
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#6c757d" }}>
                      {loadingLocation ? '🔄 Loading...' : 'No location'}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ padding: isMobile ? 12 : 15, backgroundColor: "#f8f9fa", borderRadius: 8 }}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                  Last Action
                </div>
                <div style={{ fontSize: isMobile ? 13 : 14 }}>
                  {lastClockIn || <span style={{ color: "#6c757d" }}>-</span>}
                </div>
              </div>

              <div style={{ padding: isMobile ? 12 : 15, backgroundColor: "#f8f9fa", borderRadius: 8 }}>
                <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                  Status
                </div>
                <div>
                  {workMode === 'WFH' ? (
                    <span style={{
                      padding: "6px 14px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      borderRadius: 15,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: "bold",
                      display: "inline-block"
                    }}>
                      WFH Mode
                    </span>
                  ) : withinRange ? (
                    <span style={{
                      color: "#dc3545",
                      borderRadius: 15,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: "bold"
                    }}>
                      In Range
                    </span>
                  ) : (
                    <span style={{
                      color: "#dc3545",
                      borderRadius: 15,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: "bold"
                    }}>
                      Out of Range
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Clock In/Out Buttons */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 15 }}>
              <button
                onClick={handleClockIn}
                disabled={(workMode === 'Office' && !withinRange) || clockedIn}
                style={{
                  flex: 1,
                  padding: isMobile ? "12px 20px" : "14px 20px",
                  backgroundColor: clockedIn ? "#6c757d" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: ((workMode === 'Office' && !withinRange) || clockedIn) ? "not-allowed" : "pointer",
                  opacity: ((workMode === 'Office' && !withinRange) || clockedIn) ? 0.6 : 1,
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: "bold",
                }}
              >
                {clockedIn ? "✅ Clocked In" : "Clock In"}
              </button>

              <button
                onClick={handleClockOut}
                disabled={(workMode === 'Office' && !withinRange) || !clockedIn}
                style={{
                  flex: 1,
                  padding: isMobile ? "12px 20px" : "14px 20px",
                  backgroundColor: !clockedIn ? "#6c757d" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: ((workMode === 'Office' && !withinRange) || !clockedIn) ? "not-allowed" : "pointer",
                  opacity: ((workMode === 'Office' && !withinRange) || !clockedIn) ? 0.6 : 1,
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: "bold",
                }}
              >
                {!clockedIn ? "Not Clocked In" : "Clock Out"}
              </button>
            </div>

            {/* Instructions */}
            <div style={{
              marginTop: 20,
              padding: isMobile ? 10 : 12,
              backgroundColor: "#f3f3f3",
              borderRadius: 5,
              fontSize: isMobile ? 11 : 13,
              color: "#000",
            }}>
              <strong>ℹ️ How it works:</strong>
              <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: isMobile ? 20 : 30, fontSize: isMobile ? 11 : 13 }}>
                <li><strong>Office Mode:</strong> Location tracking required. Must be within {OFFICE_LOCATION.radius}m of office.</li>
                <li><strong>WFH Mode:</strong> No location verification required.</li>
                <li>Take a selfie for verification when clocking in or out.</li>
              </ul>
            </div>
          </div>

          {/* Summary Cards */}
          {/* Summary Cards */}
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
              Clock in/out for the day, track your leaves and reimbursements, and manage your tasks.
              Use the sidebar to navigate to different sections of the application.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
