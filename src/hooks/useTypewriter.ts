import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  speed?: number;
}

export function useTypewriter(incomingText: string, isStreaming: boolean, options: UseTypewriterOptions = {}) {
  const [displayedText, setDisplayedText] = useState(incomingText);
  
  const bufferRef = useRef('');
  const displayedRef = useRef(incomingText);
  const lastTickRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  // Handle incoming text changes
  useEffect(() => {
    if (!isStreaming) {
      // Si le stream est inactif, on met à jour directement
      displayedRef.current = incomingText;
      bufferRef.current = '';
      setDisplayedText(incomingText);
      return;
    }

    if (incomingText.startsWith(displayedRef.current)) {
      // On ajoute seulement la différence au buffer
      bufferRef.current = incomingText.slice(displayedRef.current.length);
    } else {
      // Cas où le texte a été complètement remplacé (ex: nouvelle réponse)
      displayedRef.current = incomingText;
      bufferRef.current = '';
      setDisplayedText(incomingText);
    }
  }, [incomingText, isStreaming]);

  const flush = useCallback(() => {
    if (bufferRef.current.length > 0) {
      displayedRef.current += bufferRef.current;
      bufferRef.current = '';
      setDisplayedText(displayedRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      // Flush du buffer à la fin du stream
      flush();
      return;
    }

    const processBuffer = (time: number) => {
      if (!lastTickRef.current) lastTickRef.current = time;
      const deltaTime = time - lastTickRef.current;
      
      const buffer = bufferRef.current;
      
      if (buffer.length > 0) {
        const bufferSize = buffer.length;
        let charsToTake = 1;
        let currentDelay = 15; // Délai de base par caractère (~60 chars/sec)

        // Vitesse adaptative en fonction de la taille du buffer
        if (bufferSize > 150) {
          charsToTake = Math.ceil(bufferSize / 8);
          currentDelay = 0; // Mode "rattrapage rapide"
        } else if (bufferSize > 50) {
          charsToTake = Math.ceil(bufferSize / 15);
          currentDelay = 0;
        } else {
          // Effet typewriter naturel avec micro-délais
          const nextChar = buffer[0];
          if (['.', '!', '?'].includes(nextChar)) {
            currentDelay = 350; // Pause longue
          } else if (nextChar === ',') {
            currentDelay = 150; // Pause courte
          } else if (nextChar === '\n') {
            currentDelay = 250; // Pause à la ligne
          }
        }

        if (deltaTime >= currentDelay) {
          const chunk = buffer.slice(0, charsToTake);
          displayedRef.current += chunk;
          bufferRef.current = buffer.slice(charsToTake);
          setDisplayedText(displayedRef.current);
          lastTickRef.current = time;
        }
      } else {
        // On garde le timer à jour même si le buffer est vide
        lastTickRef.current = time;
      }

      rafIdRef.current = requestAnimationFrame(processBuffer);
    };

    rafIdRef.current = requestAnimationFrame(processBuffer);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isStreaming, flush]);

  return displayedText;
}
