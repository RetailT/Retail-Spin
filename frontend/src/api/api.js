import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5050/api/spin').replace(/\/+$/, '');

// Reads ?company=XXX from the current page URL and attaches it to every
// API call, so the backend knows which shop's data to use — this is the
// ONLY thing that identifies the shop now, not IP address.
function getCompanyParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('company') || '';
}

export const fetchSpinItems = async () => {
  const res = await axios.get(`${API_BASE_URL}/items`, {
    params: { company: getCompanyParam() }
  });
  return res.data;
};

export const playSpin = async ({ customerName, invoiceNo, phoneNo }) => {
  const res = await axios.post(
    `${API_BASE_URL}/play`,
    { customerName, invoiceNo, phoneNo },
    { params: { company: getCompanyParam() } }
  );
  return res.data;
};