import { useState, useEffect } from 'react';

export function useClientSession() {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);

  // Cargar datos al montar el componente (lado del cliente)
  useEffect(() => {
    const loadSession = () => {
      if (typeof window !== 'undefined') {
        const savedName = localStorage.getItem('mili_client_name') || '';
        const savedPhone = localStorage.getItem('mili_client_phone') || '';
        const savedEmail = localStorage.getItem('mili_client_email') || '';

        setClientName(savedName);
        setClientPhone(savedPhone);
        setClientEmail(savedEmail);
        setIsRegistered(!!(savedName && savedPhone));
      }
    };

    setTimeout(loadSession, 0);
  }, []);

  const saveSession = (name, phone, email = '') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mili_client_name', name);
      localStorage.setItem('mili_client_phone', phone);
      localStorage.setItem('mili_client_email', email);
    }
    setClientName(name);
    setClientPhone(phone);
    setClientEmail(email);
    setIsRegistered(!!(name && phone));
  };

  const clearSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mili_client_name');
      localStorage.removeItem('mili_client_phone');
      localStorage.removeItem('mili_client_email');
    }
    setClientName('');
    setClientPhone('');
    setClientEmail('');
    setIsRegistered(false);
  };

  return {
    clientName,
    clientPhone,
    clientEmail,
    isRegistered,
    setClientName,
    setClientPhone,
    setClientEmail,
    saveSession,
    clearSession,
  };
}
