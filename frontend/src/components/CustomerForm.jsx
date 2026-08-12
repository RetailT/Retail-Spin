import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Accepts Sri Lankan mobile/landline numbers: 07XXXXXXXX, 0XXXXXXXXX, or 94XXXXXXXXX
const PHONE_REGEX = /^(0\d{9}|94\d{9})$/;

// onValidationResult(message | null, source): 'form' when triggered by this form's own
// button, 'wheel' when triggered via submitFromWheel (the wheel's center hub).
// The parent uses `source` to decide WHERE to render the error, and because it's a
// single state slot, showing one automatically clears/replaces the other.
const CustomerForm = forwardRef(function CustomerForm({ onSubmit, disabled, resetSignal, onValidationResult }, ref) {
  const [customerName, setCustomerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [phoneNo, setPhoneNo] = useState('');

  const nameInputRef = useRef(null);

  // Focus the first field the moment this form mounts (i.e. right when the page loads),
  // so the cashier can start typing the customer name immediately without clicking in.
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (resetSignal === undefined || resetSignal === null) return;
    setCustomerName('');
    setInvoiceNo('');
    setPhoneNo('');
    onValidationResult?.(null, null);
    // Also re-focus the name field after a spin finishes, ready for the next customer.
    nameInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

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

  // Form's own "Spin Now" button (and Enter key) — error (if any) renders BELOW THE FORM.
  const handleSubmit = () => {
    if (disabled) return;
    const validationError = validate();
    onValidationResult?.(validationError || null, validationError ? 'form' : null);
    if (validationError) return;
    onSubmit(buildPayload());
  };

  // Wheel's center hub — error (if any) renders BELOW THE WHEEL instead.
  const submitFromWheel = () => {
    if (disabled) return;
    const validationError = validate();
    onValidationResult?.(validationError || null, validationError ? 'wheel' : null);
    if (validationError) return;
    onSubmit(buildPayload());
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
    submitFromWheel
  }));

  // Pressing Enter in any field submits the form, same as clicking "Spin Now".
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-sm mx-auto shadow-card border border-gray-100">
      <h2 className="text-gray-900 text-xl font-bold mb-5">Customer Details</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Customer Name</label>
          <input
            ref={nameInputRef}
            type="text"
            placeholder="e.g. Kasun Perera"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Invoice No</label>
          <input
            type="text"
            placeholder="e.g. INV-10234"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Phone No</label>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="e.g. 0771234567"
            value={phoneNo}
            onChange={handlePhoneChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full px-4 py-3 text-base rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={disabled}
          className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-base py-3.5 rounded-xl shadow-md shadow-primary/30 transition"
        >
          {disabled ? 'Spinning…' : 'Spin Now'}
        </button>
      </div>
    </div>
  );
});

export default CustomerForm;