import { useState, useEffect } from "react";
import jsPDF from "jspdf";

function ManagerReimbursements({ token }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupedByUser, setGroupedByUser] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUsers, setExpandedUsers] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://borg-manila-be.onrender.com";
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split("T")[0]);
    setEndDate(lastDay.toISOString().split("T")[0]);
  }, []);

  const fetchReceipts = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(
        `${API_BASE_URL}/api/receipts/manager/all?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch receipts");
      }

      const data = await response.json();
      setReceipts(data.receipts || []);
      groupReceiptsByUser(data.receipts || []);
    } catch (err) {
      setError(err.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  const groupReceiptsByUser = (receiptsList) => {
    const grouped = {};
    
    receiptsList.forEach(receipt => {
      const userKey = receipt.userId?._id || "unknown";
      const userName = receipt.userId 
        ? `${receipt.userId.firstName || ""} ${receipt.userId.lastName || ""}`.trim() || receipt.userId.email
        : "Unknown User";
      
      if (!grouped[userKey]) {
        grouped[userKey] = {
          userId: userKey,
          userName: userName,
          userEmail: receipt.userId?.email || "",
          receipts: [],
          totalAmount: 0
        };
      }
      
      grouped[userKey].receipts.push(receipt);
      
      // Calculate total amount
      const amountStr = receipt.extracted?.amountDue || "0";
      const amount = parseFloat(amountStr.replace(/[₱$,\s]/g, "")) || 0;
      grouped[userKey].totalAmount += amount;
    });

    const groupedArray = Object.values(grouped).sort((a, b) => 
      a.userName.localeCompare(b.userName)
    );
    
    setGroupedByUser(groupedArray);
  };

  const toggleUserExpanded = (userId) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Filter users based on search term
  const filteredUsers = groupedByUser.filter(user =>
    user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePDF = async (userGroup) => {
    if (!userGroup || !userGroup.receipts.length) {
      alert("No receipts to export");
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    pdf.setFontSize(18);
    pdf.text("Reimbursement Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.text(`Date Range: ${startDate} to ${endDate}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // User header
    pdf.setFontSize(14);
    pdf.setFont(undefined, "bold");
    pdf.text(`Employee: ${userGroup.userName}`, 15, yPosition);
    yPosition += 7;
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(`Email: ${userGroup.userEmail}`, 15, yPosition);
    yPosition += 7;
    
    pdf.setFont(undefined, "bold");
    pdf.text(`Total: PHP ${userGroup.totalAmount.toFixed(2)}`, 15, yPosition);
    yPosition += 10;

    // Receipts
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    // Loop through receipts for this user
    for (let i = 0; i < userGroup.receipts.length; i++) {
      const receipt = userGroup.receipts[i];
      
      // Check page space before each receipt
      if (yPosition > pageHeight - 100) {
        pdf.addPage();
        yPosition = 20;
      }

      // Receipt info
      pdf.setFontSize(11);
      pdf.setFont(undefined, "bold");
      pdf.text(`Receipt #${i + 1}`, 15, yPosition);
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      yPosition += 6;
      
      pdf.text(`Shop: ${receipt.extracted?.shopName || "N/A"}`, 20, yPosition);
      yPosition += 5;
      
      pdf.text(`Date: ${receipt.extracted?.date || "N/A"}`, 20, yPosition);
      yPosition += 5;
      
      pdf.text(`Address: ${receipt.extracted?.address || "N/A"}`, 20, yPosition);
      yPosition += 5;
      
      pdf.text(`TIN: ${receipt.extracted?.tinNumber || "N/A"}`, 20, yPosition);
      yPosition += 5;
      
      const amount = receipt.extracted?.amountDue || "0";
      pdf.setFont(undefined, "bold");
      pdf.text(`Amount: ${amount}`, 20, yPosition);
      pdf.setFont(undefined, "normal");
      yPosition += 8;

      // Add image if available
      if (receipt.filePath) {
        try {
          // Load image and add to PDF
          const imageUrl = `${API_BASE_URL}/uploads/${encodeURI(receipt.filePath)}`;
          const imgData = await loadImageAsDataURL(imageUrl);
          
          const imgWidth = 80;
          const imgHeight = 100;
          
          // Check if image fits on current page
          if (yPosition + imgHeight > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.addImage(imgData, "JPEG", 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } catch (imgError) {
          console.error("Error loading image:", receipt.filePath, imgError);
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text("(Image not available)", 20, yPosition);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          yPosition += 8;
        }
      }
      
      yPosition += 5; // Space between receipts
    }

    // Save PDF with employee name
    const fileName = `Reimbursement_${userGroup.userName.replace(/\s+/g, "_")}_${startDate}_to_${endDate}.pdf`;
    pdf.save(fileName);
  };

  const loadImageAsDataURL = (imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = (err) => {
        console.error("Failed to load image:", imageUrl);
        reject(err);
      };
      
      img.src = imageUrl;
    });
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <h2 style={{ fontSize: isMobile ? 20 : 24 }}>Manager Reimbursements Report</h2>
      <p style={{ color: "#666", marginBottom: 20, fontSize: isMobile ? 13 : 14 }}>
        View and export reimbursement receipts submitted by all employees
      </p>

      {/* Date Range Picker */}
      <div style={{
        backgroundColor: "#fff",
        padding: isMobile ? 15 : 20,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: 20
      }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto", 
          gap: 15, 
          alignItems: "end" 
        }}>
          <div>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: isMobile ? 8 : 10,
                borderRadius: 4,
                border: "1px solid #ddd",
                fontSize: isMobile ? 13 : 14,
                boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 5, fontWeight: 600, fontSize: isMobile ? 13 : 14 }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                padding: isMobile ? 8 : 10,
                borderRadius: 4,
                border: "1px solid #ddd",
                fontSize: isMobile ? 13 : 14,
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            onClick={fetchReceipts}
            disabled={loading}
            style={{
              padding: isMobile ? "10px 20px" : "11px 30px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: isMobile ? 13 : 14,
              whiteSpace: "nowrap",
              opacity: loading ? 0.6 : 1,
              width: isMobile ? "100%" : "auto"
            }}
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: 15,
            padding: 10,
            backgroundColor: "#f8d7da",
            color: "#721c24",
            borderRadius: 4,
            fontSize: isMobile ? 13 : 14
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {receipts.length > 0 && (
        <div style={{
          backgroundColor: "#e7f3ff",
          padding: isMobile ? 15 : 20,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #b3d9ff",
          fontSize: isMobile ? 13 : 15
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Summary:</strong> Found {receipts.length} receipt(s) from {groupedByUser.length} employee(s)
          </div>
          <div>
            <strong>Total Amount:</strong> <span style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, color: "#007bff" }}>₱{groupedByUser.reduce((sum, user) => sum + user.totalAmount, 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      {!loading && groupedByUser.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="🔍 Search by employee name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: isMobile ? "12px 16px" : "14px 18px",
              borderRadius: 6,
              border: "2px solid #ddd",
              fontSize: isMobile ? 13 : 15,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              boxSizing: "border-box",
              transition: "border-color 0.2s"
            }}
            onFocus={(e) => e.target.style.borderColor = "#007bff"}
            onBlur={(e) => e.target.style.borderColor = "#ddd"}
          />
        </div>
      )}

      {/* Grouped Results by User */}
      {loading && <div style={{ textAlign: "center", padding: 40 }}>Loading receipts...</div>}
      
      {!loading && receipts.length === 0 && startDate && endDate && (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          No receipts found for the selected date range
        </div>
      )}

      {!loading && filteredUsers.length === 0 && groupedByUser.length > 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
          No employees match your search
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredUsers.map((userGroup) => {
            const isExpanded = expandedUsers.has(userGroup.userId);
            
            return (
              <div
                key={userGroup.userId}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  overflow: "hidden",
                  border: "1px solid #e0e0e0"
                }}
              >
                {/* Collapsible Header */}
                <div
                  onClick={() => toggleUserExpanded(userGroup.userId)}
                  style={{
                    backgroundColor: "#007bff",
                    color: "#fff",
                    padding: isMobile ? "12px 15px" : "15px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    flexDirection: isMobile ? "column" : "row",
                    gap: isMobile ? 10 : 0
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#0056b3"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#007bff"}
                >
                  <div style={{ flex: 1, width: isMobile ? "100%" : "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: isMobile ? 16 : 18 }}>{isExpanded ? "▼" : "▶"}</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: isMobile ? 14 : 16 }}>{userGroup.userName}</h3>
                        <p style={{ margin: "3px 0 0 0", fontSize: isMobile ? 11 : 12, opacity: 0.9 }}>
                          {userGroup.userEmail}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 15 : 20, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
                    <div style={{ textAlign: isMobile ? "left" : "right" }}>
                      <div style={{ fontSize: isMobile ? 11 : 12, opacity: 0.9 }}>
                        {userGroup.receipts.length} receipt(s)
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        ₱{userGroup.totalAmount.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generatePDF(userGroup);
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: "nowrap"
                      }}
                    >
                      📄 Export PDF
                    </button>
                  </div>
                </div>

                {/* Expandable Content */}
                {isExpanded && (
                  <div style={{ padding: 20, backgroundColor: "#f8f9fa" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {userGroup.receipts.map((receipt, idx) => (
                        <div
                          key={receipt._id}
                          style={{
                            backgroundColor: "#fff",
                            border: "1px solid #e0e0e0",
                            borderRadius: 6,
                            padding: 15,
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto",
                            gap: 15,
                            alignItems: "start"
                          }}
                        >
                          {/* Receipt Number */}
                          <div style={{
                            backgroundColor: "#007bff",
                            color: "#fff",
                            borderRadius: "50%",
                            width: isMobile ? 32 : 36,
                            height: isMobile ? 32 : 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: isMobile ? 12 : 14
                          }}>
                            {idx + 1}
                          </div>

                          {/* Receipt Details */}
                          <div style={{ fontSize: isMobile ? 12 : 13 }}>
                            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: isMobile ? 14 : 15, color: "#333" }}>
                              {receipt.extracted?.shopName || "Unknown Shop"}
                            </div>
                            <div style={{ 
                              display: "grid", 
                              gridTemplateColumns: isMobile ? "1fr" : "100px 1fr", 
                              gap: isMobile ? "4px" : "6px 12px", 
                              color: "#555" 
                            }}>
                              {isMobile ? (
                                <>
                                  <div><strong>Date:</strong> {receipt.extracted?.date || "N/A"}</div>
                                  <div><strong>Address:</strong> {receipt.extracted?.address || "N/A"}</div>
                                  <div><strong>TIN:</strong> {receipt.extracted?.tinNumber || "N/A"}</div>
                                </>
                              ) : (
                                <>
                                  <strong>Date:</strong>
                                  <span>{receipt.extracted?.date || "N/A"}</span>
                                  
                                  <strong>Address:</strong>
                                  <span>{receipt.extracted?.address || "N/A"}</span>
                                  
                                  <strong>TIN:</strong>
                                  <span>{receipt.extracted?.tinNumber || "N/A"}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div style={{
                            textAlign: isMobile ? "left" : "right",
                            paddingLeft: isMobile ? 0 : 15,
                            paddingTop: isMobile ? 10 : 0,
                            borderLeft: isMobile ? "none" : "2px solid #28a745",
                            borderTop: isMobile ? "2px solid #28a745" : "none",
                            width: isMobile ? "100%" : "auto"
                          }}>
                            <div style={{ fontSize: isMobile ? 10 : 11, color: "#666", marginBottom: 4 }}>
                              Amount
                            </div>
                            <div style={{
                              fontWeight: 700,
                              color: "#28a745",
                              fontSize: isMobile ? 16 : 18
                            }}>
                              {receipt.extracted?.amountDue || "N/A"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ManagerReimbursements;
