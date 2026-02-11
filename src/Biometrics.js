import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

// API Base URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_BASE_UR || process.env.REACT_APP_API_BASE_URL;

// Company location (replace with your actual office coordinates)
const OFFICE_LOCATION = {
  latitude: 14.5829394,  // Example: Manila coordinates
  longitude: 121.0554831,
  radius: 100 // meters - adjust based on your needs
};

function Biometrics({ token, userId, userRole }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [withinRange, setWithinRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clockedIn, setClockedIn] = useState(false);
  const [lastClockIn, setLastClockIn] = useState(null);
  const [locationWatchId, setLocationWatchId] = useState(null);
  const [clockInStatus, setClockInStatus] = useState(null);
  
  // New states for work mode and camera
  const [workMode, setWorkMode] = useState('Office'); // 'Office' or 'WFH'
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'clock-in' or 'clock-out'
  const [loadingStep, setLoadingStep] = useState(null); // Loading step message
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });

        // Calculate distance from office
        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        );

        setDistance(Math.round(dist));
        setWithinRange(dist <= OFFICE_LOCATION.radius);
        setLoading(false);
      },
      (err) => {
        console.error('Location error:', err);
        if (workMode === 'Office') {
          setError(`Location error: ${err.message}. Please ensure location services are enabled.`);
        } else {
          // For WFH mode, location errors are not critical
          console.log('Location unavailable but not required for WFH mode');
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: false, // Use network location for faster response
        timeout: 30000, // Increased to 30 seconds
        maximumAge: 60000, // Allow cached location up to 1 minute old
      }
    );
  };

  // Start continuous location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });

        // Calculate distance from office
        const dist = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        );

        setDistance(Math.round(dist));
        setWithinRange(dist <= OFFICE_LOCATION.radius);
        setLoading(false);
      },
      (err) => {
        console.error('Location tracking error:', err);
        if (workMode === 'Office') {
          setError(`Location tracking error: ${err.message}`);
        }
      },
      {
        enableHighAccuracy: false, // Use network location for faster response
        timeout: 30000, // Increased to 30 seconds
        maximumAge: 10000, // Update every 10 seconds
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

  // Fetch clock status from backend
  const fetchClockStatus = async () => {
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
  };

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
        
        // Automatically proceed with pending action
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
    setPendingAction(null); // Clear pending action if user cancels
    setLoadingStep(null); // Clear loading state
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

  // Auto-fetch location and status on mount, start continuous tracking
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchClockStatus();
    
    // Clear location errors when switching to WFH mode
    if (workMode === 'WFH') {
      setError(null);
      stopLocationTracking();
    }
    
    // Only track location if Office mode is selected
    if (workMode === 'Office') {
      getCurrentLocation();
      startLocationTracking();
    }

    return () => {
      stopLocationTracking();
    };
  }, [workMode]); // Re-run when work mode changes

  // Perform the actual clock in API call
  const performClockIn = async (imageBlob) => {
    setLoadingStep('Submitting attendance...');
    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('workMode', workMode);
      formData.append('biometricVerified', 'false');
      
      if (workMode === 'Office' && currentLocation) {
        formData.append('latitude', currentLocation.latitude);
        formData.append('longitude', currentLocation.longitude);
        formData.append('accuracy', '10');
      } else if (workMode === 'WFH' && currentLocation) {
        // For WFH, send location as reference only (not validated)
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
      
      // Reset states
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
      // Prepare form data
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
      
      // Reset states
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
    // Step 1: For Office mode, check location
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

    // Step 2: Capture photo - will auto-proceed after capture
    setLoadingStep('Capturing photo...');
    setPendingAction('clock-in');
    await startCamera();
  };

  // Handle Clock Out
  const handleClockOut = async () => {
    // Step 1: For Office mode, check location
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

    // Step 2: Capture photo - will auto-proceed after capture
    setLoadingStep('Capturing photo...');
    setPendingAction('clock-out');
    await startCamera();
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 10 : 0 }}>
      <h2 style={{ marginBottom: 20, fontSize: isMobile ? 20 : 24 }}>Attendance</h2>

      {/* Full-Page Loading Overlay */}
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
            {/* Loading Spinner */}
            <div style={{
              width: isMobile ? 50 : 60,
              height: isMobile ? 50 : 60,
              border: `${isMobile ? '5' : '6'}px solid #f3f3f3`,
              borderTop: `${isMobile ? '5' : '6'}px solid #dc3545`,
              borderRadius: "50%",
              margin: "0 auto 25px",
              animation: "spin 1s linear infinite"
            }} />
            
            {/* Loading Step Text */}
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
          
          {/* Add spinner animation */}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Attendance Table */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: isMobile ? 12 : 20,
          marginBottom: 20,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        
        {clockInStatus && (
         <div style={{ color: "rgb(114, 28, 36)", padding: 10, backgroundColor: "rgb(253, 236, 239)", borderRadius: 5, marginBottom: 15 }}>
           <strong>{clockInStatus}</strong> 
          </div>
        )}
        {error && (
          <div style={{ color: "#dc3545", padding: 10, backgroundColor: "#f8d7da", borderRadius: 5, marginBottom: 15 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Work Mode Selection */}
        <div style={{ marginBottom: 20, padding: isMobile ? 10 : 15}}>
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
          <div style={{ fontSize: isMobile ? 11 : 13, color: clockedIn ? "#856404" : "#6c757d", marginTop: 10, backgroundColor: clockedIn ? "#fff3cd" : "transparent", padding: clockedIn ? 8 : 0, borderRadius: clockedIn ? 4 : 0 }}>
            {clockedIn 
              ? '🔒 Work mode is locked once clocked in. Please clock out first to change mode.' 
              : workMode === 'Office' 
                ? '⚠️ Office mode requires you to be within office location radius' 
                : '✓ WFH mode does not require location verification'}
          </div>
        </div>

        {/* Captured Image Preview */}
        {capturedImage && (
          <div style={{ marginBottom: 15, padding: 10, backgroundColor: "#d4edda", color: "#155724", borderRadius: 5 }}>
            ✅ Selfie captured
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
            <div style={{ display: "flex", flexDirection: isMobile ? 'column' : 'row', gap: 15, width: isMobile ? '100%' : 'auto' }}>
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

        {isMobile ? (
          /* Mobile Card Layout */
          <div style={{ 
            padding: 12, 
            backgroundColor: "#f8f9fa", 
            borderRadius: 8,
            border: "1px solid #dee2e6"
          }}>
            {/* Location Status Card */}
            <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: "1px solid #dee2e6" }}>
              <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Location Status
              </div>
              <div>
                {workMode === 'WFH' ? (
                  <span style={{ fontSize: 13, color: "#6c757d" }}>
                    🏠 Location not required for WFH
                  </span>
                ) : currentLocation ? (
                  <div>
                    <span style={{ fontSize: 13, color: "#333" }}>
                      📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                    </span>
                    {locationWatchId && (
                      <div style={{ fontSize: 11, color: "#28a745", marginTop: 3 }}>
                        🔄 Auto-tracking
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: "#6c757d", fontSize: 14 }}>
                    {loading ? '🔄 Loading...' : 'No location'}
                  </span>
                )}
              </div>
            </div>

            
            {/* Last Action Card */}
            <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: "1px solid #dee2e6" }}>
              <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Last Action
              </div>
              <div>
                {lastClockIn ? (
                  <span style={{ fontSize: 14 }}>{lastClockIn}</span>
                ) : (
                  <span style={{ color: "#6c757d", fontSize: 14 }}>-</span>
                )}
              </div>
            </div>

            {/* Status Card */}
            <div style={{ marginBottom: 20, paddingBottom: 15, borderBottom: "1px solid #dee2e6" }}>
              <div style={{ fontSize: 11, color: "#6c757d", marginBottom: 5, fontWeight: 600, textTransform: "uppercase" }}>
                Status
              </div>
              <div>
                {workMode === 'WFH' ? (
                  <span style={{
                    padding: "6px 14px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    borderRadius: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    display: "inline-block"
                  }}>
                    WFH Mode
                  </span>
                ) : withinRange ? (
                  <span style={{
                    color: "#dc3545",
                    borderRadius: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    display: "inline-block"
                  }}>
                    In Range
                  </span>
                ) : (
                  <span style={{
                    color: "#dc3545",
                    borderRadius: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    display: "inline-block"
                  }}>
                    Out of Range
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleClockIn}
                disabled={(workMode === 'Office' && !withinRange) || clockedIn}
                style={{
                  padding: "14px 20px",
                  backgroundColor: clockedIn ? "#6c757d" : "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: ((workMode === 'Office' && !withinRange) || clockedIn) ? "not-allowed" : "pointer",
                  opacity: ((workMode === 'Office' && !withinRange) || clockedIn) ? 0.6 : 1,
                  fontSize: 15,
                  fontWeight: "bold",
                  width: "100%",
                  minHeight: 44
                }}
              >
                {clockedIn ? "✅ Clocked In" : "Clock In"}
              </button>

              <button
                onClick={handleClockOut}
                disabled={(workMode === 'Office' && !withinRange) || !clockedIn}
                style={{
                  padding: "14px 20px",
                  backgroundColor: !clockedIn ? "#6c757d" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 5,
                  cursor: ((workMode === 'Office' && !withinRange) || !clockedIn) ? "not-allowed" : "pointer",
                  opacity: ((workMode === 'Office' && !withinRange) || !clockedIn) ? 0.6 : 1,
                  fontSize: 15,
                  fontWeight: "bold",
                  width: "100%",
                  minHeight: 44
                }}
              >
                {!clockedIn ? "Not Clocked In" : "Clock Out"}
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Table Layout */
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                <th style={{ padding: 12, textAlign: "left", fontSize: 14, width: "20%" }}>Location Status</th>
                <th style={{ padding: 12, textAlign: "left", fontSize: 14, width: "20%" }}>Last Action</th>
                <th style={{ padding: 12, textAlign: "center", fontSize: 14, width: "15%" }}>Status</th>
                <th style={{ padding: 12, textAlign: "center", fontSize: 14, width: "30%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #dee2e6" }}>
                <td style={{ padding: 12 }}>
                  {workMode === 'WFH' ? (
                    <span style={{ fontSize: 13, color: "#6c757d" }}>
                      🏠 Location not required for WFH
                    </span>
                  ) : currentLocation ? (
                    <div>
                      <span style={{ fontSize: 12, color: "#6c757d" }}>
                        📍 {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                      </span>
                      {locationWatchId && (
                        <div style={{ fontSize: 11, color: "#28a745", marginTop: 3 }}>
                          🔄 Auto-tracking
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: "#6c757d", fontSize: 14 }}>
                      {loading ? '🔄 Loading...' : 'No location'}
                    </span>
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
                  {workMode === 'WFH' ? (
                    <span style={{
                      padding: "5px 12px",
                      backgroundColor: "#dc3545",
                      color: "white",
                      borderRadius: 15,
                      fontSize: 12,
                      fontWeight: "bold"
                    }}>
                      WFH Mode
                    </span>
                  ) : withinRange ? (
                    <span style={{
                      padding: "5px 12px",
                      color: "#dc3545",
                      borderRadius: 15,
                      fontSize: 12,
                      fontWeight: "bold"
                    }}>
                      In Range
                    </span>
                  ) : (
                    <span style={{
                      padding: "5px 12px",
                      color: "#dc3545",
                      borderRadius: 15,
                      fontSize: 12,
                      fontWeight: "bold"
                    }}>
                      Out of Range
                    </span>
                  )}
                </td>
                <td style={{ padding: 12, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button
                      onClick={handleClockIn}
                      disabled={(workMode === 'Office' && !withinRange) || clockedIn}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: clockedIn ? "#6c757d" : "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: 5,
                        cursor: ((workMode === 'Office' && !withinRange) || clockedIn) ? "not-allowed" : "pointer",
                        opacity: ((workMode === 'Office' && !withinRange) || clockedIn) ? 0.6 : 1,
                        fontSize: 13,
                        fontWeight: "bold"
                      }}
                    >
                      {clockedIn ? "Clocked In" : "Clock In"}
                    </button>

                    <button
                      onClick={handleClockOut}
                      disabled={(workMode === 'Office' && !withinRange) || !clockedIn}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: !clockedIn ? "#6c757d" : "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: 5,
                        cursor: ((workMode === 'Office' && !withinRange) || !clockedIn) ? "not-allowed" : "pointer",
                        opacity: ((workMode === 'Office' && !withinRange) || !clockedIn) ? 0.6 : 1,
                        fontSize: 13,
                        fontWeight: "bold"
                      }}
                    >
                      {!clockedIn ? "Not Clocked In" : "Clock Out"}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: 20,
          padding: isMobile ? 12 : 15,
          backgroundColor: "#f3f3f3",
          borderRadius: 5,
          fontSize: isMobile ? 13 : 14,
          color: "#000",
        }}
      >
        <strong>ℹ️ How it works:</strong>
        <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: isMobile ? 20 : 40 }}>
          <li><strong>Office Mode:</strong> Location tracking is required. You must be within {OFFICE_LOCATION.radius}m of the office to clock in/out.</li>
          <li><strong>WFH Mode:</strong> No location verification required. You can clock in/out from anywhere.</li>
          <li>Choose your work mode before clocking in. The mode is locked until you clock out.</li>
          <li>Take a selfie for verification when clocking in or out.</li>
        </ul>
      </div>
    </div>
  );
}

export default Biometrics;
