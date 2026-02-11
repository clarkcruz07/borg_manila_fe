import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";

function Assets({ token }) {
  const [activeTab, setActiveTab] = useState("requests");
  const [requests, setRequests] = useState([]);
  const [assets, setAssets] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [deployingRequest, setDeployingRequest] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [isIT, setIsIT] = useState(false);
  const [selectedAssetForDeploy, setSelectedAssetForDeploy] = useState("");
  const [deployNotes, setDeployNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [deployMode, setDeployMode] = useState("existing"); // "existing" or "new"
  const [newAssetData, setNewAssetData] = useState({
    assetTag: "",
    brand: "",
    model: "",
    serialNumber: "",
    specifications: "",
    purchaseDate: "",
    purchaseCost: "",
    warrantyExpiry: "",
    location: "",
  });
  
  const [requestFormData, setRequestFormData] = useState({
    assetType: "Laptop",
    specifications: "",
    justification: "",
    priority: "Medium",
  });
  
  const [assetFormData, setAssetFormData] = useState({
    assetTag: "",
    assetType: "Laptop",
    brand: "",
    model: "",
    serialNumber: "",
    specifications: "",
    purchaseDate: "",
    purchaseCost: "",
    warrantyExpiry: "",
    status: "Available",
    location: "",
    notes: "",
  });
  
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assets/requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRequests(data.requests);
      setIsIT(data.isIT);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAssets(data.assets);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRequests();
      if (activeTab === "inventory") {
        await fetchAssets();
      }
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (activeTab === "inventory" && assets.length === 0) {
      fetchAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!requestFormData.justification.trim()) {
      setFormError("Justification is required");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/assets/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestFormData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setFormSuccess("Asset request submitted successfully!");
      fetchRequests();
      setTimeout(() => {
        setShowRequestForm(false);
        setRequestFormData({
          assetType: "Laptop",
          specifications: "",
          justification: "",
          priority: "Medium",
        });
        setFormSuccess("");
      }, 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assets/requests/${requestId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Request approved successfully!");
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectingRequest) return;
    
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/assets/requests/${rejectingRequest._id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rejectionReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Request rejected");
      fetchRequests();
      setShowRejectModal(false);
      setRejectingRequest(null);
      setRejectionReason("");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeployRequest = async () => {
    if (!deployingRequest) return;
    
    // Validate based on mode
    if (deployMode === "new") {
      if (!newAssetData.assetTag || !newAssetData.brand || !newAssetData.model) {
        alert("Asset Tag, Brand, and Model are required for new asset");
        return;
      }
    }
    
    try {
      setSubmitting(true);
      const payload = {
        itNotes: deployNotes,
      };
      
      if (deployMode === "existing" && selectedAssetForDeploy) {
        payload.assetId = selectedAssetForDeploy;
      } else if (deployMode === "new") {
        payload.newAsset = {
          ...newAssetData,
          assetType: deployingRequest.assetType, // Use the requested asset type
        };
      }
      
      const response = await fetch(`${API_BASE_URL}/api/assets/requests/${deployingRequest._id}/deploy`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Request deployed successfully!");
      fetchRequests();
      fetchAssets();
      setShowDeployModal(false);
      setDeployingRequest(null);
      setSelectedAssetForDeploy("");
      setDeployNotes("");
      setDeployMode("existing");
      setNewAssetData({
        assetTag: "",
        brand: "",
        model: "",
        serialNumber: "",
        specifications: "",
        purchaseDate: "",
        purchaseCost: "",
        warrantyExpiry: "",
        location: "",
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAsset = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!assetFormData.assetTag || !assetFormData.assetType) {
      setFormError("Asset tag and type are required");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingAsset
        ? `${API_BASE_URL}/api/assets/${editingAsset._id}`
        : `${API_BASE_URL}/api/assets`;
      const method = editingAsset ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...assetFormData,
          purchaseCost: assetFormData.purchaseCost ? parseFloat(assetFormData.purchaseCost) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setFormSuccess(editingAsset ? "Asset updated successfully!" : "Asset added successfully!");
      fetchAssets();
      setTimeout(() => handleCloseAssetForm(), 2000);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setAssetFormData({
      assetTag: asset.assetTag || "",
      assetType: asset.assetType || "Laptop",
      brand: asset.brand || "",
      model: asset.model || "",
      serialNumber: asset.serialNumber || "",
      specifications: asset.specifications || "",
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "",
      purchaseCost: asset.purchaseCost || "",
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split("T")[0] : "",
      status: asset.status || "Available",
      location: asset.location || "",
      notes: asset.notes || "",
    });
    setShowAssetForm(true);
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm("Are you sure you want to delete this asset?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Asset deleted successfully!");
      fetchAssets();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseAssetForm = () => {
    setShowAssetForm(false);
    setEditingAsset(null);
    setFormSuccess("");
    setFormError("");
    setAssetFormData({
      assetTag: "",
      assetType: "Laptop",
      brand: "",
      model: "",
      serialNumber: "",
      specifications: "",
      purchaseDate: "",
      purchaseCost: "",
      warrantyExpiry: "",
      status: "Available",
      location: "",
      notes: "",
    });
  };

  const openDeployModal = async (request) => {
    setDeployingRequest(request);
    setShowDeployModal(true);
    // Fetch available assets of the requested type
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assets/inventory/available?assetType=${request.assetType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok) {
        setAvailableAssets(data);
      }
    } catch (err) {
      console.error("Error fetching available assets:", err);
    }
  };

  const openRejectModal = (request) => {
    setRejectingRequest(request);
    setShowRejectModal(true);
  };

  const assetTypes = ["Laptop", "Desktop", "Monitor", "Phone", "Tablet", "Keyboard", "Mouse", "Headset", "Webcam", "Docking Station", "Other"];
  const priorities = ["Low", "Medium", "High", "Urgent"];
  const statuses = ["Available", "Assigned", "Maintenance", "Retired", "Lost/Stolen"];
  const requestStatuses = ["All", "Pending", "Approved", "Rejected", "Deployed"];

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === "All" || req.status === filterStatus;
    const matchesSearch =
      req.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.requestedBy && `${req.requestedBy.firstName} ${req.requestedBy.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (status) => {
    const colors = {
      Pending: { bg: "#fff3cd", text: "#856404" },
      Approved: { bg: "#cce5ff", text: "#004085" },
      Rejected: { bg: "#f8d7da", text: "#721c24" },
      Deployed: { bg: "#d4edda", text: "#155724" },
    };
    return colors[status] || { bg: "#e9ecef", text: "#495057" };
  };

  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? 15 : 0 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: isMobile ? 20 : 30,
        flexWrap: "wrap",
        gap: 10,
      }}>
        <h2 style={{ marginBottom: isMobile ? 20 : 0, fontSize: isMobile ? 20 : 24 }}>Asset Management</h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(250px, 1fr))",
            gap: isMobile ? 15 : 20,
            marginBottom: 30
          }}></div>
        {activeTab === "requests" && (
          <button
            onClick={() => setShowRequestForm(true)}
            style={{
              padding: isMobile ? "8px 16px" : "10px 20px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            + Request Asset
          </button>
        )}
        {activeTab === "inventory" && isIT && (
          <button
            onClick={() => setShowAssetForm(true)}
            style={{
              padding: isMobile ? "8px 16px" : "10px 20px",
              backgroundColor: "#28a745",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            + Add to Inventory
          </button>
        )}
      </div>

      {error && (
        <div style={{
          padding: isMobile ? 12 : 15,
          backgroundColor: "#f8d7da",
          color: "#721c24",
          borderRadius: 4,
          marginBottom: 20,
          fontSize: isMobile ? 13 : 14,
        }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 20,
        borderBottom: "2px solid #dee2e6",
      }}>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: isMobile ? "8px 16px" : "10px 20px",
            backgroundColor: "transparent",
            color: activeTab === "requests" ? "#007bff" : "#6c757d",
            border: "none",
            borderBottom: activeTab === "requests" ? "3px solid #007bff" : "3px solid transparent",
            cursor: "pointer",
            fontSize: isMobile ? 14 : 16,
            fontWeight: activeTab === "requests" ? "bold" : "normal",
          }}
        >
          {isIT ? "Asset Requests" : "Assigned Assets"}
        </button>
        {isIT && (
          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              padding: isMobile ? "8px 16px" : "10px 20px",
              backgroundColor: "transparent",
              color: activeTab === "inventory" ? "#007bff" : "#6c757d",
              border: "none",
              borderBottom: activeTab === "inventory" ? "3px solid #007bff" : "3px solid transparent",
              cursor: "pointer",
              fontSize: isMobile ? 14 : 16,
              fontWeight: activeTab === "inventory" ? "bold" : "normal",
            }}
          >
            Inventory Management
          </button>
        )}
      </div>

      {/* Filters */}
      {activeTab === "requests" && (
        <div style={{ display: "flex", gap: 15, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: 250,
              padding: isMobile ? "8px 12px" : "10px 15px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: isMobile ? 13 : 14,
            }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: isMobile ? "8px 12px" : "10px 15px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            {requestStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      )}

      {activeTab === "inventory" && (
        <div style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: isMobile ? "8px 12px" : "10px 15px",
              border: "1px solid #ddd",
              borderRadius: 4,
              fontSize: isMobile ? 13 : 14,
            }}
          />
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <>
          {filteredRequests.length === 0 ? (
            <div style={{
              padding: isMobile ? 30 : 40,
              textAlign: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: 4,
              color: "#6c757d",
              fontSize: isMobile ? 13 : 14,
            }}>
              {searchTerm || filterStatus !== "All" ? "No requests match your filters" : "No asset requests yet"}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              {filteredRequests.map((request) => {
                const statusColor = getStatusColor(request.status);
                return (
                  <div
                    key={request._id}
                    style={{
                      backgroundColor: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: isMobile ? 20 : 30,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: isMobile ? 16 : 18 }}>{request.assetType}</h3>
                        <div style={{ fontSize: isMobile ? 13 : 14, color: "#6c757d" }}>
                          Requested by: {request.requestedBy?.firstName} {request.requestedBy?.lastName}
                          {request.requestedBy?.department && ` (${request.requestedBy.department})`}
                        </div>
                        <div style={{ fontSize: isMobile ? 11 : 12, color: "#6c757d", marginTop: 5 }}>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: 4,
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: "bold",
                      }}>
                        {request.status}
                      </div>
                    </div>

                    <div style={{ fontSize: isMobile ? 13 : 14, marginBottom: 15 }}>
                      {request.specifications && (
                        <div style={{ marginBottom: 8 }}>
                          <strong>Specifications:</strong> {request.specifications}
                        </div>
                      )}
                      {request.rejectionReason && (
                        <div style={{ marginBottom: 8, color: "#721c24" }}>
                          <strong>Rejection Reason:</strong> {request.rejectionReason}
                        </div>
                      )}
                      {request.itNotes && (
                        <div style={{ marginBottom: 8 }}>
                          <strong>IT Notes:</strong> {request.itNotes}
                        </div>
                      )}
                      {request.assignedAsset && (
                        <div style={{ marginBottom: 8 }}>
                          <strong>Assigned Asset:</strong>
                          <div style={{ marginTop: 5, fontSize: isMobile ? 13 : 14, marginLeft: 10 }}>
                            <div><strong>Product:</strong> {request.assignedAsset.assetType}</div>
                            <div><strong>Brand:</strong> {request.assignedAsset.brand}</div>
                            <div><strong>Model:</strong> {request.assignedAsset.model}</div>
                            <div><strong>Tag:</strong> {request.assignedAsset.assetTag}</div>
                            <div><strong>Serial:</strong> {request.assignedAsset.serialNumber || "N/A"}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {isIT && request.status === "Pending" && (
                      <div style={{ display: "flex", gap: 10, paddingTop: 15, borderTop: "1px solid #eee" }}>
                        <button
                          onClick={() => handleApproveRequest(request._id)}
                          style={{
                            flex: 1,
                            padding: isMobile ? "8px 12px" : "10px 14px",
                            backgroundColor: "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: isMobile ? 13 : 14,
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openRejectModal(request)}
                          style={{
                            flex: 1,
                            padding: isMobile ? "8px 12px" : "10px 14px",
                            backgroundColor: "#dc3545",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: isMobile ? 13 : 14,
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {isIT && request.status === "Approved" && (
                      <div style={{ paddingTop: 15, borderTop: "1px solid #eee" }}>
                        <button
                          onClick={() => openDeployModal(request)}
                          style={{
                            width: "100%",
                            padding: isMobile ? "8px 12px" : "10px 14px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          Deploy Asset
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Inventory Tab */}
      {activeTab === "inventory" && isIT && (
        <>
          {filteredAssets.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: 4,
              color: "#6c757d",
            }}>
              {searchTerm ? "No assets match your search" : "No assets in inventory"}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(350px, 1fr))",
              gap: 20,
            }}>
              {filteredAssets.map((asset) => (
                <div
                  key={asset._id}
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 20,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 15 }}>
                    <div>
                      <h3 style={{ margin: "0 0 5px 0", fontSize: 18 }}>{asset.assetTag}</h3>
                      <div style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        backgroundColor: asset.status === "Available" ? "#d4edda" : asset.status === "Assigned" ? "#cce5ff" : "#fff3cd",
                        color: asset.status === "Available" ? "#155724" : asset.status === "Assigned" ? "#004085" : "#856404",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: "bold",
                      }}>
                        {asset.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 14, marginBottom: 15 }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Type:</strong> {asset.assetType}
                    </div>
                    {asset.brand && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Brand:</strong> {asset.brand}
                      </div>
                    )}
                    {asset.model && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Model:</strong> {asset.model}
                      </div>
                    )}
                    {asset.serialNumber && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Serial #:</strong> {asset.serialNumber}
                      </div>
                    )}
                    {asset.assignedTo && (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Assigned to:</strong> {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 15, paddingTop: 15, borderTop: "1px solid #eee" }}>
                    <button
                      onClick={() => handleEditAsset(asset)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset._id)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        backgroundColor: "#dc3545",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Request Asset Form Modal */}
      {showRequestForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 30,
            maxWidth: 500,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h2 style={{ marginTop: 0 }}>Request Asset</h2>

            {formError && (
              <div style={{
                padding: 15,
                backgroundColor: "#f8d7da",
                color: "#721c24",
                borderRadius: 4,
                marginBottom: 20,
              }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{
                padding: 15,
                backgroundColor: "#d4edda",
                color: "#155724",
                borderRadius: 4,
                marginBottom: 20,
              }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitRequest}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Asset Type *
                </label>
                <select
                  value={requestFormData.assetType}
                  onChange={(e) => setRequestFormData({ ...requestFormData, assetType: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                  required
                >
                  {assetTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Preferred Specifications
                </label>
                <textarea
                  value={requestFormData.specifications}
                  onChange={(e) => setRequestFormData({ ...requestFormData, specifications: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    minHeight: 60,
                  }}
                  placeholder="e.g., Intel i7, 16GB RAM, 512GB SSD"
                />
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Justification *
                </label>
                <textarea
                  value={requestFormData.justification}
                  onChange={(e) => setRequestFormData({ ...requestFormData, justification: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    minHeight: 80,
                  }}
                  placeholder="Explain why you need this asset..."
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Priority
                </label>
                <select
                  value={requestFormData.priority}
                  onChange={(e) => setRequestFormData({ ...requestFormData, priority: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: submitting ? "#6c757d" : "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false);
                    setFormError("");
                    setFormSuccess("");
                  }}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* Deploy Modal - continues in next message due to length*/}
      {showDeployModal && deployingRequest && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 30,
            maxWidth: 600,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h2 style={{ marginTop: 0 }}>Deploy Asset</h2>
            <p>Deploy asset for: <strong>{deployingRequest.requestedBy?.firstName} {deployingRequest.requestedBy?.lastName}</strong></p>
            <p>Requested: <strong>{deployingRequest.assetType}</strong></p>

            {/* Mode Selection */}
            <div style={{ marginBottom: 20, display: "flex", gap: 15 }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="existing"
                  checked={deployMode === "existing"}
                  onChange={(e) => setDeployMode(e.target.value)}
                  style={{ marginRight: 5 }}
                />
                Select Existing Asset
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="new"
                  checked={deployMode === "new"}
                  onChange={(e) => setDeployMode(e.target.value)}
                  style={{ marginRight: 5 }}
                />
                Create New Asset
              </label>
            </div>

            {/* Existing Asset Selection */}
            {deployMode === "existing" && (
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Select Asset
                </label>
                <select
                  value={selectedAssetForDeploy}
                  onChange={(e) => setSelectedAssetForDeploy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  <option value="">-- Select an asset --</option>
                  {availableAssets.map((asset) => (
                    <option key={asset._id} value={asset._id}>
                      {asset.assetTag} - {asset.brand} {asset.model} ({asset.serialNumber})
                    </option>
                  ))}
                </select>
                {availableAssets.length === 0 && (
                  <div style={{ fontSize: 12, color: "#dc3545", marginTop: 5 }}>
                    No available assets in inventory. Switch to "Create New Asset" mode.
                  </div>
                )}
              </div>
            )}

            {/* New Asset Form */}
            {deployMode === "new" && (
              <div style={{ marginBottom: 15, maxHeight: "300px", overflowY: "auto", padding: "0 5px" }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Asset Tag <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newAssetData.assetTag}
                    onChange={(e) => setNewAssetData({ ...newAssetData, assetTag: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="e.g., LAP-2024-001"
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Brand <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newAssetData.brand}
                    onChange={(e) => setNewAssetData({ ...newAssetData, brand: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="e.g., Dell, HP, Lenovo"
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Model <span style={{ color: "#dc3545" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newAssetData.model}
                    onChange={(e) => setNewAssetData({ ...newAssetData, model: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="e.g., ThinkPad X1"
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={newAssetData.serialNumber}
                    onChange={(e) => setNewAssetData({ ...newAssetData, serialNumber: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="e.g., SN123456789"
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Specifications
                  </label>
                  <textarea
                    value={newAssetData.specifications}
                    onChange={(e) => setNewAssetData({ ...newAssetData, specifications: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                      minHeight: 50,
                    }}
                    placeholder="e.g., Intel i7, 16GB RAM, 512GB SSD"
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={newAssetData.purchaseDate}
                      onChange={(e) => setNewAssetData({ ...newAssetData, purchaseDate: e.target.value })}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                      Purchase Cost
                    </label>
                    <input
                      type="number"
                      value={newAssetData.purchaseCost}
                      onChange={(e) => setNewAssetData({ ...newAssetData, purchaseCost: e.target.value })}
                      style={{
                        width: "100%",
                        padding: 8,
                        border: "1px solid #ddd",
                        borderRadius: 4,
                        fontSize: 14,
                      }}
                      placeholder="Amount"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Warranty Expiry
                  </label>
                  <input
                    type="date"
                    value={newAssetData.warrantyExpiry}
                    onChange={(e) => setNewAssetData({ ...newAssetData, warrantyExpiry: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                  />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={newAssetData.location}
                    onChange={(e) => setNewAssetData({ ...newAssetData, location: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="e.g., Office 3rd Floor"
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                IT Notes
              </label>
              <textarea
                value={deployNotes}
                onChange={(e) => setDeployNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                  minHeight: 60,
                }}
                placeholder="Add any notes about the deployment..."
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleDeployRequest}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  backgroundColor: submitting ? "#6c757d" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 16,
                }}
              >
                {submitting ? "Deploying..." : "Deploy"}
              </button>
              <button
                onClick={() => {
                  setShowDeployModal(false);
                  setDeployingRequest(null);
                  setSelectedAssetForDeploy("");
                  setDeployNotes("");
                  setDeployMode("existing");
                  setNewAssetData({
                    assetTag: "",
                    brand: "",
                    model: "",
                    serialNumber: "",
                    specifications: "",
                    purchaseDate: "",
                    purchaseCost: "",
                    warrantyExpiry: "",
                    location: "",
                  });
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 16,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && rejectingRequest && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 30,
            maxWidth: 500,
            width: "100%",
          }}>
            <h2 style={{ marginTop: 0 }}>Reject Request</h2>
            <p>Reject request from: <strong>{rejectingRequest.requestedBy?.firstName} {rejectingRequest.requestedBy?.lastName}</strong></p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  fontSize: 14,
                  minHeight: 80,
                }}
                placeholder="Explain why this request is being rejected..."
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleRejectRequest}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  backgroundColor: submitting ? "#6c757d" : "#dc3545",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 16,
                }}
              >
                {submitting ? "Rejecting..." : "Reject Request"}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 20px",
                  backgroundColor: "#6c757d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontSize: 16,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

{/* Asset Form Modal - For IT inventory management */}
{showAssetForm && isIT && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            padding: 30,
            maxWidth: 600,
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h2 style={{ marginTop: 0 }}>{editingAsset ? "Edit Asset" : "Add Asset to Inventory"}</h2>

            {formError && (
              <div style={{
                padding: 15,
                backgroundColor: "#f8d7da",
                color: "#721c24",
                borderRadius: 4,
                marginBottom: 20,
              }}>
                {formError}
              </div>
            )}

            {formSuccess && (
              <div style={{
                padding: 15,
                backgroundColor: "#d4edda",
                color: "#155724",
                borderRadius: 4,
                marginBottom: 20,
              }}>
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitAsset}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Asset Tag *
                </label>
                <input
                  type="text"
                  value={assetFormData.assetTag}
                  onChange={(e) => setAssetFormData({ ...assetFormData, assetTag: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                  required
               />
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Asset Type *
                </label>
                <select
                  value={assetFormData.assetType}
                  onChange={(e) => setAssetFormData({ ...assetFormData, assetType: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                  required
                >
                  {assetTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Brand
                  </label>
                  <input
                    type="text"
                    value={assetFormData.brand}
                    onChange={(e) => setAssetFormData({ ...assetFormData, brand: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={assetFormData.model}
                    onChange={(e) => setAssetFormData({ ...assetFormData, model: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Serial Number
                </label>
                <input
                  type="text"
                  value={assetFormData.serialNumber}
                  onChange={(e) => setAssetFormData({ ...assetFormData, serialNumber: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Specifications
                </label>
                <textarea
                  value={assetFormData.specifications}
                  onChange={(e) => setAssetFormData({ ...assetFormData, specifications: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    minHeight: 60,
                  }}
                  placeholder="e.g., Intel i7, 16GB RAM, 512GB SSD"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={assetFormData.purchaseDate}
                    onChange={(e) => setAssetFormData({ ...assetFormData, purchaseDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                    Purchase Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetFormData.purchaseCost}
                    onChange={(e) => setAssetFormData({ ...assetFormData, purchaseCost: e.target.value })}
                    style={{
                      width: "100%",
                      padding: 10,
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      fontSize: 14,
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Warranty Expiry
                </label>
                <input
                  type="date"
                  value={assetFormData.warrantyExpiry}
                  onChange={(e) => setAssetFormData({ ...assetFormData, warrantyExpiry: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Status
                </label>
                <select
                  value={assetFormData.status}
                  onChange={(e) => setAssetFormData({ ...assetFormData, status: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Location
                </label>
                <input
                  type="text"
                  value={assetFormData.location}
                  onChange={(e) => setAssetFormData({ ...assetFormData, location: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                  placeholder="e.g., Office, Warehouse"
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
                  Notes
                </label>
                <textarea
                  value={assetFormData.notes}
                  onChange={(e) => setAssetFormData({ ...assetFormData, notes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 4,
                    fontSize: 14,
                    minHeight: 60,
                  }}
                  placeholder="Additional information..."
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: submitting ? "#6c757d" : "#28a745",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                >
                  {submitting ? "Saving..." : editingAsset ? "Update Asset" : "Add Asset"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseAssetForm}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px 20px",
                    backgroundColor: "#6c757d",
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontSize: 16,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;
