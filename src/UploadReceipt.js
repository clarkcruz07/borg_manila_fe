import { useEffect, useMemo, useRef, useState } from "react";
import { listReceipts, saveReceipt, uploadReceipt, getJobStatus, cancelJob } from "./api";

function UploadReceipt({ token, userId }) {
  const [files, setFiles] = useState([]); // <-- multiple files
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]); // <-- multiple results
  const [savingAll, setSavingAll] = useState(false);
  const [savedReceipts, setSavedReceipts] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [errorUpload, setErrorUpload] = useState("");
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [pendingJobs, setPendingJobs] = useState([]); // Track jobs being polled
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const fileInputRef = useRef();      
  const cameraInputRef = useRef();    
  const abortControllerRef = useRef(null); // For canceling uploads
  const pollingIntervalRef = useRef(null); // For job status polling

  // Handle mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Clean up abort controller and polling on unmount or page refresh
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      if (!token) return;
      try {
        setSavedLoading(true);
        setSavedError("");
        const res = await listReceipts(token);
        setSavedReceipts(res.data.receipts || []);
      } catch (e) {
        setSavedError(e?.response?.data?.error || e.message || "Failed to load saved receipts");
      } finally {
        setSavedLoading(false);
      }
    };

    loadSaved();
  }, [token]);

  // Handle multiple file selection
  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selected]);
    // Reset input value to allow re-uploading the same file
    e.target.value = '';
  };

  // Remove file from selection
  const handleRemoveFile = async (idx) => {
    // Check if this file has a pending/processing job
    const jobForFile = pendingJobs.find(job => job.index === idx);
    
    // Also check if result has jobId (for completed jobs)
    const resultWithJobId = results[idx]?.jobId;
    const jobIdToCancel = jobForFile?.jobId || resultWithJobId;
    
    if (jobIdToCancel) {
      // Cancel the job
      try {
        console.log(`Attempting to cancel job: ${jobIdToCancel}`);
        await cancelJob(jobIdToCancel, token);
        console.log(`Job ${jobIdToCancel} cancelled and files deleted`);
        
        // Remove from pending jobs
        setPendingJobs(prev => prev.filter(j => j.jobId !== jobIdToCancel));
      } catch (error) {
        console.error("Failed to cancel job:", error);
      }
    } else {
      console.log(`No job found for index ${idx}`);
    }
    
    // Remove file and result
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResults(prev => prev.filter((_, i) => i !== idx));
    
    // Reset input values to allow re-uploading
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const submitReceipt = async () => {
    if (!files.length) return alert("Please select or capture receipts");

    setLoading(true);
    setResults([]); // Clear previous results
    setErrorUpload("");

    // Create new AbortController for this upload session
    abortControllerRef.current = new AbortController();

    try {
      // Initialize results array with placeholders
      setResults(new Array(files.length).fill(null));
      setProcessingProgress({ current: 0, total: files.length });

      const jobIds = [];

      // Upload all files and get job IDs
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        
        // Update progress
        setProcessingProgress({ current: idx + 1, total: files.length });
        
        try {
          const res = await uploadReceipt(file, token, abortControllerRef.current.signal);
          jobIds.push({
            jobId: res.data.jobId,
            originalName: file.name,
            index: idx
          });
        } catch (error) {
          console.error(`Upload failed for file ${idx + 1}:`, error);
          setResults(prev => {
            const updated = [...prev];
            updated[idx] = { error: error.message || "Upload failed" };
            return updated;
          });
        }
      }

      // Start polling for job results
      if (jobIds.length > 0) {
        setPendingJobs(jobIds);
        startPolling(jobIds);
      }

      setErrorUpload(`Uploaded ${jobIds.length} file(s). Processing in background...`);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        console.log("Upload canceled");
        setResults([]);
        setFiles([]);
        setErrorUpload("");
      } else {
        console.error("Upload error:", err);
        setErrorUpload(err.message || "Upload failed");
      }
    } finally {
      setLoading(false);
      setProcessingProgress({ current: 0, total: 0 });
      abortControllerRef.current = null;
    }
  };

  const startPolling = (jobIds) => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const jobsToCheck = [...jobIds]; // Make a copy

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      // Check if there are still jobs to poll
      if (jobsToCheck.length === 0) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setErrorUpload("");
        return;
      }

      // Process each remaining job
      for (let i = jobsToCheck.length - 1; i >= 0; i--) {
        const job = jobsToCheck[i];
        
        try {
          const res = await getJobStatus(job.jobId, token);
          const jobData = res.data;

          if (jobData.status === 'completed') {
            // Update result with jobId
            setResults(prev => {
              const updated = [...prev];
              updated[job.index] = { ...jobData.result, jobId: job.jobId };
              return updated;
            });

            // Remove from pending jobs and tracking array
            setPendingJobs(prev => prev.filter(j => j.jobId !== job.jobId));
            jobsToCheck.splice(i, 1);
            
          } else if (jobData.status === 'failed') {
            // Update with error
            setResults(prev => {
              const updated = [...prev];
              updated[job.index] = { error: jobData.error || "Processing failed" };
              return updated;
            });

            // Remove from pending jobs and tracking array
            setPendingJobs(prev => prev.filter(j => j.jobId !== job.jobId));
            jobsToCheck.splice(i, 1);
          }
          // If status is 'pending' or 'processing', keep polling
        } catch (error) {
          console.error(`Failed to get status for job ${job.jobId}:`, error);
          // Keep job in array to retry
        }
      }
    }, 2000);
  };

  const handleSaveAll = async () => {
    if (!results.length || results.some(r => !r)) {
      alert("Please wait for all receipts to finish processing");
      return;
    }

    try {
      setSavingAll(true);
      const saved = [];
      const duplicates = [];
      
      // Save all receipts sequentially
      for (let idx = 0; idx < results.length; idx++) {
        const res = results[idx];
        try {
          const receiptRes = await saveReceipt(
            {
              filePath: res.filePath,
              originalName: res.originalName,
              extracted: res.extracted,
              jobId: res.jobId, // Pass jobId to delete after save
            },
            token
          );
          saved.push(receiptRes.data);
        } catch (e) {
          // Check if it's a duplicate error (409)
          if (e?.response?.status === 409) {
            const errorMsg = e?.response?.data?.error || "Duplicate receipt";
            duplicates.push(`Receipt #${idx + 1}: ${errorMsg}`);
          } else {
            // Other errors - still track but don't stop the process
            duplicates.push(`Receipt #${idx + 1}: ${e?.response?.data?.error || e.message || "Save failed"}`);
          }
        }
      }

      // Add successfully saved receipts to the list
      if (saved.length > 0) {
        setSavedReceipts((prev) => [...saved, ...prev]);
      }

      // Show results message
      let message = "";
      if (saved.length > 0 && duplicates.length === 0) {
        message = `Successfully saved ${saved.length} receipt(s) to database`;
        // Clear results after successful save
        setResults([]);
        setFiles([]);
      } else if (saved.length > 0 && duplicates.length > 0) {
        message = `Saved ${saved.length} receipt(s). ${duplicates.length} duplicate(s) skipped:\n${duplicates.join("\n")}`;
        // Keep results visible so user can see which ones failed
      } else {
        message = `No receipts saved. All were duplicates:\n${duplicates.join("\n")}`;
      }
      
      setErrorUpload(message);
    } catch (e) {
      alert(e?.response?.data?.error || e.message || "Save failed");
    } finally {
      setSavingAll(false);
    }
  };

  const groupedSaved = useMemo(() => {
    // Group by monthYearKey (YYYY-MM). If missing, group to "Unknown Month".
    const groups = new Map();
    for (const r of savedReceipts) {
      const key = r.monthYearKey || "Unknown Month";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    
    // Format month-year keys to readable format (e.g., "2025-01" -> "January 2025")
    const formatMonthYear = (key) => {
      if (key === "Unknown Month") return "Unknown Month";
      try {
        const [year, month] = key.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch {
        return key;
      }
    };
    
    // Sort keys descending; keep Unknown Month last
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === "Unknown Month") return 1;
      if (b === "Unknown Month") return -1;
      return b.localeCompare(a);
    });
    
    // Calculate total for each month-year group
    return keys.map((k) => {
      const items = groups.get(k);
      // Sum up amountDue values (parse as float, handle currency symbols)
      const total = items.reduce((sum, r) => {
        const amountStr = r.extracted?.amountDue || "0";
        // Remove common currency symbols and parse
        const amount = parseFloat(amountStr.replace(/[₱$,\s]/g, "")) || 0;
        return sum + amount;
      }, 0);
      
      return {
        monthYearKey: k,
        displayLabel: formatMonthYear(k),
        items,
        total: total.toFixed(2),
      };
    });
  }, [savedReceipts]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <h2 style={{ marginBottom: isMobile ? 20 : 30, fontSize: isMobile ? 20 : 24 }}>Reimbursements</h2>

      {/* Saved receipts accordion */}
      <div style={{ marginTop: 10, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: isMobile ? 18 : 20 }}>Saved Receipts</h3>
        {savedLoading && <div style={{ color: "#666" }}>Loading saved receipts...</div>}
        {savedError && <div style={{ color: "#b00020" }}>{savedError}</div>}

        {!savedLoading && !savedError && groupedSaved.length === 0 && (
          <div style={{ color: "#666" }}>No saved receipts yet.</div>
        )}

        {!savedLoading && !savedError && groupedSaved.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {groupedSaved.map((group) => (
              <details key={group.monthYearKey} style={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 12px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                <summary style={{
                  cursor: "pointer",
                  fontWeight: 700,
                  padding: "6px 0",
                  outline: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>{group.displayLabel} ({group.items.length})</span>
                  <span style={{ color: "#28a745", fontWeight: 700 }}>
                    ₱{parseFloat(group.total).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </summary>

                <div style={{ 
                  marginTop: 10, 
                  display: "grid", 
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", 
                  gap: 12 
                }}>
                  {group.items.map((r) => (
                    <div key={r._id} style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: "#fafafa",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: isMobile ? 14 : 15 }}>
                        {r.extracted?.shopName || "Unknown shop"}
                      </div>
                      <div style={{ fontSize: isMobile ? 12 : 13, color: "#555" }}>
                        <div><strong>Date:</strong> {r.extracted?.date || "—"}</div>
                        <div><strong>Address:</strong> {r.extracted?.address || "—"}</div>
                        <div><strong>TIN:</strong> {r.extracted?.tinNumber || "—"}</div>
                        <div><strong>Total:</strong> {r.extracted?.amountDue || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Show selected files first if any */}
      {files.length > 0 && (
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: 8,
          padding: 15,
          marginBottom: 20
        }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: 16 }}>Selected Files ({files.length})</h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {files.map((f, idx) => (
              <li key={idx} style={{ marginBottom: 5 }}>
                {f.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Desktop upload */}
      {!isMobile && (
        <>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            hidden
            onChange={handleFiles}
          />
          <div
            onClick={() => fileInputRef.current.click()}
            style={{
              border: "2px dashed #007bff",
              padding: isMobile ? 20 : 40,
              cursor: "pointer",
              textAlign: "center",
              marginBottom: 20,
              borderRadius: 8,
              backgroundColor: "#f0f8ff",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e6f3ff";
              e.currentTarget.style.borderColor = "#0056b3";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f8ff";
              e.currentTarget.style.borderColor = "#007bff";
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 10 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#007bff" }}>
              Click to select receipt images
            </div>
            <div style={{ fontSize: 14, color: "#6c757d", marginTop: 8 }}>
              You can select multiple files at once
            </div>
          </div>
        </>
      )}

      {/* Mobile: both upload and camera */}
      {isMobile && (
        <div style={{ marginBottom: 20, display: "flex", gap: 10, flexDirection: "column" }}>
          {/* Camera */}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={cameraInputRef}
            hidden
            onChange={handleFiles}
          />
          <button
            onClick={() => cameraInputRef.current.click()}
            style={{
              padding: "16px 20px",
              backgroundColor: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10
            }}
          >
            <span style={{ fontSize: 24 }}>📸</span>
            Take Photo
          </button>

          {/* Upload from gallery */}
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            hidden
            onChange={handleFiles}
          />
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              padding: "16px 20px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10
            }}
          >
            <span style={{ fontSize: 24 }}>📁</span>
            Choose from Gallery
          </button>
        </div>
      )}
      
      {/* Process button - only show when files are selected */}
      {files.length > 0 && (
        <button
          onClick={submitReceipt}
          disabled={loading}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 20,
            padding: "16px 24px",
            backgroundColor: loading ? "#6c757d" : "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 18,
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
          }}
        >
          {loading ? "Processing..." : `Process ${files.length} Receipt${files.length > 1 ? 's' : ''}`}
        </button>
      )}
      
      {errorUpload && (
        <div style={{
          backgroundColor: "#e7f3ff",
          color: "#000",
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #b3d9ff"
        }}>
          {errorUpload}
        </div>
      )}
      {/* Full-page loader */}
      {loading && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
          color: "#fff",
          flexDirection: "column"
        }}>
          <div className="spinner" style={{
            border: "6px solid #f3f3f3",
            borderTop: "6px solid #007bff",
            borderRadius: "50%",
            width: 50,
            height: 50,
            animation: "spin 1s linear infinite"
          }}></div>
          <p style={{ marginTop: 10, textAlign: "center" }}>
            {processingProgress.total > 0 
              ? `Uploading ${processingProgress.current} of ${processingProgress.total}...`
              : "Uploading receipts..."}
          </p>
          {pendingJobs.length > 0 && (
            <p style={{ fontSize: 14, marginTop: 5, color: "#bbb", textAlign: "center" }}>
              {pendingJobs.length} receipt(s) processing in background...
            </p>
          )}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Display results */}
      {results.length > 0 && (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
            gap: isMobile ? 15 : 20,
            marginTop: 30
          }}>
            {results.map((res, idx) => (
              <div key={idx} style={{ 
                padding: isMobile ? 15 : 20,
                backgroundColor: "#f8f9fa",
                borderRadius: 8,
                border: "1px solid #e0e0e0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: isMobile ? 200 : 250,
                position: "relative"
              }}>
                {/* Remove button at top right */}
                <button
                  onClick={() => handleRemoveFile(idx)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: "600",
                    zIndex: 1
                  }}
                >
                  ✕ Remove
                </button>
                <div>
                  <h4 style={{ marginTop: 0, marginBottom: 15, fontSize: isMobile ? 15 : 16, paddingRight: 80 }}>Receipt #{idx + 1}</h4>
                  {res ? (
                    <>
                      <p style={{ margin: "8px 0", fontSize: isMobile ? 13 : 14 }}><strong>Shop:</strong> {res.extracted.shopName || "Not found"}</p>
                      <p style={{ margin: "8px 0", fontSize: isMobile ? 13 : 14 }}><strong>Date:</strong> {res.extracted.date || "Not found"}</p>
                      <p style={{ margin: "8px 0", fontSize: isMobile ? 13 : 14 }}><strong>Address:</strong> {res.extracted.address || "Not found"}</p>
                      <p style={{ margin: "8px 0", fontSize: isMobile ? 13 : 14 }}><strong>TIN Number:</strong> {res.extracted.tinNumber || "Not found"}</p>
                    </>
                  ) : (
                    <p style={{ color: "#999", fontStyle: "italic", fontSize: isMobile ? 13 : 14 }}>Processing...</p>
                  )}
                </div>
                {res && (
                  <div style={{ borderTop: "2px solid #ddd", paddingTop: 15, marginTop: 15 }}>
                    <p style={{ margin: 0, fontSize: isMobile ? 15 : 16, color: "#28a745", fontWeight: "bold" }}><strong>Total:</strong> {res.extracted.amountDue || "Not found"}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Save All button */}
          {results.every(r => r !== null) && (
            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button
                onClick={handleSaveAll}
                disabled={savingAll || results.length === 0}
                style={{
                  padding: "12px 24px",
                  borderRadius: 6,
                  border: "none",
                  cursor: savingAll || results.length === 0 ? "not-allowed" : "pointer",
                  backgroundColor: savingAll ? "#6c757d" : "#28a745",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {savingAll ? "Saving All..." : `Save All ${results.length} Receipt(s) to Database`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UploadReceipt;
