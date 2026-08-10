import axios from 'axios';

const API_BASE_URL = 'http://localhost:5050/api/spin';

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
