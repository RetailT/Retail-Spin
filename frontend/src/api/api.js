import axios from 'axios';

// In production (Vercel), REACT_APP_API_URL points to your deployed backend.
// Locally, it falls back to your dev backend on port 5050.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5050/api/spin';

export const fetchSpinItems = async () => {
  const res = await axios.get(`${API_BASE_URL}/items`);
  return res.data;
};

export const playSpin = async ({ customerName, invoiceNo, phoneNo }) => {
  const res = await axios.post(`${API_BASE_URL}/play`, {
    customerName,
    invoiceNo,
    phoneNo
  });
  return res.data;
};