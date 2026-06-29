import { useState, useCallback, useRef } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T) {
  // Lecture UNIQUE au démarrage de l'application (optimisation RAM/Batterie)
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      // Si aucune donnée n'existe, on initialise avec la valeur par défaut sûre
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Erreur lors de la lecture du localStorage:', error);
      return initialValue;
    }
  });

  // Utilisation d'une ref pour garder une trace du timeout asynchrone
  const timeoutRef = useRef<number | null>(null);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue(prevValue => {
        const valueToStore = value instanceof Function ? value(prevValue) : value;
        
        // Sauvegarde locale et privée dans le sandbox de l'application mobile
        // Synchronisation asynchrone en arrière-plan pour économiser la batterie du smartphone
        if (typeof window !== 'undefined') {
          if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current);
          }
          
          timeoutRef.current = window.setTimeout(() => {
            try {
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (err) {
              console.error('Erreur lors de la sauvegarde en arrière-plan:', err);
            }
          }, 300); // Délai de 300ms pour ne pas surcharger les écritures (I/O)
        }
        
        return valueToStore;
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'état:", error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}
