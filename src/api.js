import axios from "axios";

//const API_BASE_URL = "http://localhost:5000";
const API_BASE_URL = "https://borg-manila-be.onrender.com";
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

export const saveReceipt = ({ filePath, originalName, extracted }, token) => {
  return axios.post(
    `${API_BASE_URL}/api/receipts`,
    { filePath, originalName, extracted },
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