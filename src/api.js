import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
export const uploadReceipt = (file, token, signal) => {
  const formData = new FormData();
  formData.append("receipt", file);

  return axios.post(`${API_BASE_URL}/api/receipts/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
};

export const saveReceipt = ({ filePath, originalName, extracted, jobId }, token) => {
  return axios.post(
    `${API_BASE_URL}/api/receipts`,
    { filePath, originalName, extracted, jobId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
};

export const listReceipts = (token) => {
  return axios.get(`${API_BASE_URL}/api/receipts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getJobStatus = (jobId, token) => {
  return axios.get(`${API_BASE_URL}/api/receipts/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const cancelJob = (jobId, token) => {
  return axios.delete(`${API_BASE_URL}/api/receipts/jobs/${jobId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getUserJobs = (token, status = null) => {
  const params = status ? { status } : {};
  return axios.get(`${API_BASE_URL}/api/receipts/jobs`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params,
  });
};