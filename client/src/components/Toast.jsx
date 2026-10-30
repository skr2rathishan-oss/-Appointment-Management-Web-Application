import { useCallback, useEffect, useState } from 'react';

const TOAST_MS = 4000;

// const [toast, showToast] = useToast(); showToast('Visit cancelled'); <Toast message={toast} />
export function useToast() {
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message]);

  const show = useCallback((text) => setMessage(text), []);
  return [message, show];
}

export default function Toast({ message }) {
  if (!message) return null;
  return <div className="toast" role="status">{message}</div>;
}
