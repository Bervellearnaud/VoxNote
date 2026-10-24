import { useState, useEffect, useRef, useCallback } from 'react';

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const ERROR_MESSAGES = {
  'not-allowed':
    "Accès au microphone refusé. Autorisez l'accès au micro dans votre navigateur (si l'application est affichée dans un aperçu intégré, ouvrez-la dans un nouvel onglet).",
  'service-not-allowed':
    "Le service de reconnaissance vocale n'est pas autorisé dans ce contexte. Essayez avec Google Chrome, Edge ou Safari dans un onglet dédié.",
  'audio-capture':
    'Aucun microphone détecté. Vérifiez que votre microphone est bien connecté et activé.',
  network:
    'Erreur réseau avec le service de reconnaissance vocale du navigateur. Vérifiez votre connexion internet.',
  'language-not-supported':
    "La langue sélectionnée n'est pas prise en charge par votre navigateur.",
};

/**
 * Hook personnalisé gérant la transcription vocale en direct via l'API Web Speech native.
 *
 * @param {Object} options
 * @param {(text: string) => void} options.onFinalTranscript Callback appelé à chaque segment finalisé
 * @param {string} [options.defaultLang='fr-FR'] Code langue BCP-47 par défaut
 */
export function useSpeechRecognition({ onFinalTranscript, defaultLang = 'fr-FR' }) {
  const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
  const isSupported = Boolean(SpeechRecognitionCtor);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState(null);
  const [language, setLanguage] = useState(defaultLang);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    setInterimTranscript('');
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore si déjà arrêté
      }
    }
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setSpeechError(
        "Votre navigateur ne supporte pas l'API Web Speech. Utilisez Google Chrome, Microsoft Edge ou Safari."
      );
      return;
    }

    setSpeechError(null);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
    }

    const recognition = new Recognition();
    recognition.lang = language;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    recognition.onresult = (event) => {
      let finalChunk = '';
      let interimChunk = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interimChunk += transcript;
        }
      }

      setInterimTranscript(interimChunk);

      if (finalChunk.trim()) {
        onFinalTranscriptRef.current?.(finalChunk.trim());
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      const fatalErrors = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'];
      if (fatalErrors.includes(event.error)) {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
        setInterimTranscript('');
      }

      setSpeechError(
        ERROR_MESSAGES[event.error] ||
          `Erreur lors de la reconnaissance vocale (${event.error}).`
      );
    };

    recognition.onend = () => {
      setInterimTranscript('');
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          shouldKeepListeningRef.current = false;
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    shouldKeepListeningRef.current = true;

    try {
      recognition.start();
    } catch {
      shouldKeepListeningRef.current = false;
      setIsListening(false);
      setSpeechError(
        'Impossible de démarrer le microphone. Vérifiez les permissions audio de votre navigateur.'
      );
    }
  }, [language]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Si l'utilisateur change de langue pendant l'écoute, redémarrer proprement avec la nouvelle langue
  const changeLanguage = useCallback(
    (newLang) => {
      setLanguage(newLang);
      if (shouldKeepListeningRef.current && recognitionRef.current) {
        shouldKeepListeningRef.current = false;
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        setIsListening(false);
        setInterimTranscript('');
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    speechError,
    setSpeechError,
    language,
    changeLanguage,
    startListening,
    stopListening,
    toggleListening,
  };
}
