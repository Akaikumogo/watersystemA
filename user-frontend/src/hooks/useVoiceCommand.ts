import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

export interface VoiceCommand {
  action: 'ON' | 'OFF';
  motor?: 'motor1' | 'motor2' | 'motor';
}

interface VoiceCommandState {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

function parseVoiceTranscript(
  text: string,
  onCommand: (command: VoiceCommand) => void
) {
  const upperText = text.toUpperCase().trim();

  const motorOnKeywords = [
    'MOTOR ON',
    'MOTOR YOQ',
    'MOTOR OCH',
    'NASOS YOQ',
    'NASOS OCH',
    'НАСОС ВКЛЮЧИТЬ',
    'НАСОС ВКЛЮЧИ',
    'МОТОР ВКЛЮЧИТЬ',
    'МОТОР ВКЛЮЧИ',
    'ON',
    'YOQ',
    'OCH'
  ];

  const motorOffKeywords = [
    'MOTOR OFF',
    'MOTOR OCHIR',
    'MOTOR YOP',
    'MOTOR STOP',
    'MOTOR TOXTAT',
    'NASOS OCHIR',
    'NASOS YOP',
    'NASOS STOP',
    'НАСОС ВЫКЛЮЧИТЬ',
    'НАСОС ВЫКЛЮЧИ',
    'МОТОР ВЫКЛЮЧИТЬ',
    'МОТОР ВЫКЛЮЧИ',
    'OFF',
    'OCHIR',
    'YOP',
    'STOP',
    'TOXTAT'
  ];

  const isMotorOn = motorOnKeywords.some(
    (keyword) =>
      upperText === keyword ||
      upperText.startsWith(keyword + ' ') ||
      upperText.endsWith(' ' + keyword) ||
      upperText.includes(' ' + keyword + ' ')
  );

  const isMotorOff = motorOffKeywords.some(
    (keyword) =>
      upperText === keyword ||
      upperText.startsWith(keyword + ' ') ||
      upperText.endsWith(' ' + keyword) ||
      upperText.includes(' ' + keyword + ' ')
  );

  let motor: 'motor1' | 'motor2' | 'motor' | undefined;
  if (/\bMOTOR\s*1\b|\bNASOS\s*1\b/i.test(text)) {
    motor = 'motor1';
  } else if (/\bMOTOR\s*2\b|\bNASOS\s*2\b/i.test(text)) {
    motor = 'motor2';
  }

  if (isMotorOn) {
    onCommand({ action: 'ON', motor });
  } else if (isMotorOff) {
    onCommand({ action: 'OFF', motor });
  }
}

export const useVoiceCommand = (
  onCommand: (command: VoiceCommand) => void,
  language: string = 'uz'
): VoiceCommandState => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const onCommandRef = useRef(onCommand);
  const nativeSessionRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    if (isNative) {
      let cancelled = false;
      (async () => {
        try {
          const { available } = await SpeechRecognition.available();
          if (cancelled) return;
          if (!available) {
            setError(t('device.voiceUnsupportedDevice'));
          }
        } catch {
          if (!cancelled) {
            setError(t('device.voiceUnsupportedDevice'));
          }
        }
      })();
      return () => {
        cancelled = true;
        SpeechRecognition.stop().catch(() => undefined);
      };
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setError(t('device.voiceUnsupportedBrowser'));
      return;
    }

    const recognitionInstance = new SpeechRecognitionClass();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;

    const langMap: Record<string, string> = {
      uz: 'uz-UZ',
      ru: 'ru-RU',
      en: 'en-US'
    };
    recognitionInstance.lang = langMap[language] || 'uz-UZ';

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript.trim();
      setTranscript(text);
      parseVoiceTranscript(text, onCommandRef.current);
    };

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setError(t('device.voiceErrorWithReason', { reason: event.error }));
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);

    return () => {
      recognitionInstance.stop();
    };
  }, [language, isNative, t]);

  const startListening = useCallback(() => {
    if (isNative) {
      if (nativeSessionRef.current) return;
      nativeSessionRef.current = true;
      setError(null);
      (async () => {
        try {
          const perm = await SpeechRecognition.requestPermissions();
          if (perm.speechRecognition !== 'granted') {
            setError(t('device.voicePermissionDenied'));
            return;
          }
          const { available } = await SpeechRecognition.available();
          if (!available) {
            setError(t('device.voiceUnsupportedDevice'));
            return;
          }
          setIsListening(true);
          const langMap: Record<string, string> = {
            uz: 'uz-UZ',
            ru: 'ru-RU',
            en: 'en-US'
          };
          const { matches } = await SpeechRecognition.start({
            language: langMap[language] || 'en-US',
            maxResults: 5,
            partialResults: false,
            popup: true,
            prompt: t('device.speakNow')
          });
          const text = (matches?.[0] ?? '').trim();
          setTranscript(text);
          if (text) {
            parseVoiceTranscript(text, onCommandRef.current);
          }
        } catch (e) {
          console.error(e);
          setError(t('device.voiceError'));
        } finally {
          setIsListening(false);
          nativeSessionRef.current = false;
        }
      })();
      return;
    }

    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError(t('device.voiceStartFailed'));
      }
    }
  }, [
    isNative,
    language,
    recognition,
    isListening,
    t
  ]);

  const stopListening = useCallback(() => {
    if (isNative) {
      SpeechRecognition.stop().catch(() => undefined);
      return;
    }
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [isNative, recognition, isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript
  };
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
