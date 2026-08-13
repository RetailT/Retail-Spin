import React, { useEffect, useRef, useState } from 'react';
import SpinWheel, { buildWheelSegments } from './components/SpinWheel';
import CustomerForm from './components/CustomerForm';
import ResultModal from './components/ResultModal';
import WinCelebration from './components/WinCelebration';
import { playSpin, fetchSpinItems } from './api/api';

export default function App() {
  const [spinning, setSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeItems, setActiveItems] = useState([]);
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [itemsLoadError, setItemsLoadError] = useState('');
  // Company name resolved server-side (via caller IP -> tb_SERVER_DETAILS),
  // shown in the header so it's clear which shop this spin instance belongs to.
  const [companyName, setCompanyName] = useState('');

  const [validation, setValidation] = useState({ message: '', source: null });

  const formRef = useRef(null);
  const wheelRef = useRef(null);

  const segments = buildWheelSegments(activeItems);

  const loadActiveItems = async () => {
    try {
      const data = await fetchSpinItems();
      setActiveItems(data.items || []);
      setCompanyName(data.companyName || '');
      setItemsLoadError('');
    } catch (err) {
      console.error('Failed to load active items:', err);
      setItemsLoadError('Could not load prizes. Please refresh the page.');
    } finally {
      setItemsLoaded(true);
    }
  };

  useEffect(() => {
    loadActiveItems();
  }, []);

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

      let idx;
      if (res.isWinner) {
        const matchedIndex = segments.findIndex(
          (seg) => seg.isWin && seg.itemId === res.wonItemId
        );
        idx = matchedIndex !== -1 ? matchedIndex : 0;
      } else {
        const loseIndices = segments
          .map((seg, i) => (!seg.isWin ? i : null))
          .filter((i) => i !== null);
        idx = loseIndices[Math.floor(Math.random() * loseIndices.length)];
      }

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
    loadActiveItems();
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
          {companyName && (
            <p className="text-2xl sm:text-3xl font-extrabold tracking-widest text-primary uppercase mb-2">
              {companyName}
            </p>
          )}
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

        {errorMsg && (
          <p className="w-full max-w-sm text-red-500 text-sm font-medium text-center bg-red-50 border border-red-100 rounded-lg px-3 py-2 -mt-4">
            {errorMsg}
          </p>
        )}

        {showCelebration && (
          <WinCelebration
            itemName={result.wonItemName}
            onDismiss={() => setResult(null)}
          />
        )}

        {!itemsLoaded ? (
          <div className="w-[92vw] max-w-[26rem] sm:max-w-[30rem] aspect-square mx-auto flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm font-medium">Loading prizes…</p>
          </div>
        ) : itemsLoadError ? (
          <div className="w-[92vw] max-w-[26rem] sm:max-w-[30rem] aspect-square mx-auto flex flex-col items-center justify-center gap-3 text-center px-6">
            <p className="text-red-500 text-sm font-medium">{itemsLoadError}</p>
          </div>
        ) : (
          <SpinWheel
            ref={wheelRef}
            segments={segments}
            targetIndex={targetIndex}
            spinToken={spinToken}
            isSpinning={spinning}
            onSpinComplete={handleSpinComplete}
            onCenterClick={handleCenterClick}
          />
        )}

        {validation.source === 'wheel' && (
          <p className="w-full max-w-sm text-red-500 text-sm font-medium text-center bg-red-50 border border-red-100 rounded-lg px-3 py-2 -mt-4">
            {validation.message}
          </p>
        )}
      </div>

      <ResultModal result={showModal ? result : null} onClose={handleModalClose} />
    </div>
  );
}