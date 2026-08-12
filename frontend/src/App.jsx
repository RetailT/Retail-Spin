import React, { useRef, useState } from 'react';
import SpinWheel, { WHEEL_SEGMENTS } from './components/SpinWheel';
import CustomerForm from './components/CustomerForm';
import ResultModal from './components/ResultModal';
import WinCelebration from './components/WinCelebration';
import { playSpin } from './api/api';

export default function App() {
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [validation, setValidation] = useState({ message: '', source: null });

  const formRef = useRef(null);
  const wheelRef = useRef(null);

  const handleValidationResult = (message, source) => {
    setValidation({ message: message || '', source: message ? source : null });
  };

  const handleCustomerSubmit = async (customer) => {
    setErrorMsg('');
    setShowModal(false);
    setResult(null);
    setSpinning(true);
    wheelRef.current?.scrollIntoView();

    try {
      const res = await playSpin(customer);
      const idx = res.isWinner ? 0 : 1 + Math.floor(Math.random() * 9);

      setTargetIndex(idx);
      setResult(res);
      setSpinToken((t) => (t || 0) + 1);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Spin failed. Please try again.';
      setErrorMsg(msg);
      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setResetSignal((t) => t + 1);
  };

  const handleCenterClick = () => {
    formRef.current?.submitFromWheel();
  };

  const formDisabled = spinning || showModal;

  const showCelebration = !spinning && result?.isWinner;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight">
            Gift Item Spin
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Enter customer details and spin to win a gift
          </p>
        </div>

        <CustomerForm
          ref={formRef}
          onSubmit={handleCustomerSubmit}
          disabled={formDisabled}
          resetSignal={resetSignal}
          onValidationResult={handleValidationResult}
        />

        {validation.source === 'form' && (
          <p className="w-full max-w-sm text-red-500 text-sm font-medium text-center bg-red-50 border border-red-100 rounded-lg px-3 py-2 -mt-4">
            {validation.message}
          </p>
        )}

        {showCelebration && (
          <WinCelebration
            itemName={result.wonItemName}
            onDismiss={() => setResult(null)}
          />
        )}

        <SpinWheel
          ref={wheelRef}
          segments={WHEEL_SEGMENTS}
          targetIndex={targetIndex}
          spinToken={spinToken}
          isSpinning={spinning}
          onSpinComplete={handleSpinComplete}
          onCenterClick={handleCenterClick}
        />

        {validation.source === 'wheel' && (
          <p className="w-full max-w-sm text-red-500 text-sm font-medium text-center bg-red-50 border border-red-100 rounded-lg px-3 py-2 -mt-4">
            {validation.message}
          </p>
        )}

        {errorMsg && (
          <p className="text-red-500 font-medium text-center max-w-sm text-sm">{errorMsg}</p>
        )}
      </div>

      <ResultModal result={showModal ? result : null} onClose={handleModalClose} />
    </div>
  );
}