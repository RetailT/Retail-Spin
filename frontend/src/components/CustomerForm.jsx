import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

// Accepts Sri Lankan mobile/landline numbers: 07XXXXXXXX, 0XXXXXXXXX, or 94XXXXXXXXX
const PHONE_REGEX = /^(0\d{9}|94\d{9})$/;

const CustomerForm = forwardRef(function CustomerForm({ onSubmit, disabled, resetSignal }, ref) {
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (resetSignal === undefined || resetSignal === null) return;
    setCustomerName('');
    setInvoiceNo('');
    setPhoneNo('');
    setError('');
  }, [resetSignal]);

  // Strip anything that isn't a digit as the user types — no letters/symbols possible
  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    setPhoneNo(digitsOnly.slice(0, 11)); // 11 max covers the 94-prefixed format
  };

  // Pure validation — returns an error message string, or null if everything's valid.
  const validate = () => {
    if (!customerName.trim() || !invoiceNo.trim() || !phoneNo.trim()) {
      return 'Please fill in customer name, invoice number and phone number.';
    }
    if (!PHONE_REGEX.test(phoneNo)) {
      return 'Please enter a valid phone number (e.g. 0771234567).';
    }
    return null;
  };

  const buildPayload = () => ({
    customerName: customerName.trim(),
    invoiceNo: invoiceNo.trim(),
    phoneNo
  });

  // Used by the form's own "Spin Now" button — shows the error inline, inside the form.
  const handleSubmit = () => {
    if (disabled) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(buildPayload());
  };

  useImperativeHandle(ref, () => ({
    // Form's own button uses this — error shows inline in the form (unchanged behavior).
    submit: handleSubmit,

    // The wheel's center "SPIN" button uses this instead — it does NOT show the error
    // inline in the form; it returns the error message so the caller (App) can render
    // it below the wheel. Returns null when the submit actually went through.
    submitFromWheel: () => {
      if (disabled) return null;
      const validationError = validate();
      if (validationError) {
        setError(''); // keep the form's own error area clear, App will show it instead
        return validationError;
      }
      setError('');
      onSubmit(buildPayload());
      return null;
    }
  }));

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm mx-auto shadow-card border border-gray-100">
      <h2 className="text-gray-900 text-lg font-bold mb-4">Customer Details</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Customer Name</label>
          <input
            type="text"
            placeholder="e.g. Kasun Perera"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            disabled={disabled}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Invoice No</label>
          <input
            type="text"
            placeholder="e.g. INV-10234"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            disabled={disabled}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Phone No</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 0771234567"
            value={phoneNo}
            onChange={handlePhoneChange}
            disabled={disabled}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-md shadow-primary/30 transition"
        >
          {disabled ? 'Spinning…' : 'Spin Now'}
        </button>
      </div>
    </div>
  );
});

export default CustomerForm;