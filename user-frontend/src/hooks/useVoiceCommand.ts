import { useState, useCallback, useEffect, useRef } from 'react'

export interface VoiceCommand {
  action: 'ON' | 'OFF'
  motor?: 'motor1' | 'motor2' | 'motor'
}

interface VoiceCommandState {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export const useVoiceCommand = (
  onCommand: (command: VoiceCommand) => void,
  language: string = 'uz'
): VoiceCommandState => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<any>(null)
  const onCommandRef = useRef(onCommand)

  // Keep onCommand ref updated
  useEffect(() => {
    onCommandRef.current = onCommand
  }, [onCommand])

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in your browser')
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = false
    recognitionInstance.interimResults = false
    
    // Set language based on current language
    const langMap: Record<string, string> = {
      'uz': 'uz-UZ',
      'ru': 'ru-RU',
      'en': 'en-US'
    }
    recognitionInstance.lang = langMap[language] || 'uz-UZ'

    recognitionInstance.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim()
      setTranscript(transcript)
      parseCommand(transcript)
    }

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setError(`Voice recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognitionInstance.onend = () => {
      setIsListening(false)
    }

    const parseCommand = (text: string) => {
      const upperText = text.toUpperCase()
      
      // Motor selection
      let motor: 'motor1' | 'motor2' | 'motor' | undefined = undefined
      if (upperText.includes('MOTOR 1') || upperText.includes('BIRINCHI MOTOR') || upperText.includes('MOTOR BIR') || upperText.includes('NASOS 1') || upperText.includes('BIRINCHI NASOS')) {
        motor = 'motor1'
      } else if (upperText.includes('MOTOR 2') || upperText.includes('IKKINCHI MOTOR') || upperText.includes('MOTOR IKKI') || upperText.includes('NASOS 2') || upperText.includes('IKKINCHI NASOS')) {
        motor = 'motor2'
      } else if (upperText.includes('MOTOR') || upperText.includes('NASOS')) {
        motor = 'motor'
      }

      // Action detection (Uzbek, Russian, English)
      const onCommands = [
        'ON', 'YOQ', 'YOQISH', 'OCH', 'OCHISH', 'START', 'BOSHLASH', 'ISHLAT',
        'ВКЛЮЧИТЬ', 'ВКЛЮЧИ', 'ВКЛЮЧ', 'НАЧАТЬ', 'ОТКРЫТЬ'
      ]
      const offCommands = [
        'OFF', 'OCHIR', 'OCHIRISH', 'YOP', 'YOPISH', 'STOP', 'TOXTAT', 'TOXTATISH',
        'ВЫКЛЮЧИТЬ', 'ВЫКЛЮЧИ', 'ВЫКЛЮЧ', 'ОСТАНОВИТЬ', 'ЗАКРЫТЬ'
      ]

      const isOn = onCommands.some(cmd => upperText.includes(cmd))
      const isOff = offCommands.some(cmd => upperText.includes(cmd))

      if (isOn) {
        onCommandRef.current({ action: 'ON', motor })
      } else if (isOff) {
        onCommandRef.current({ action: 'OFF', motor })
      }
    }

    setRecognition(recognitionInstance)

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.start()
      } catch (err) {
        console.error('Failed to start recognition:', err)
        setError('Failed to start voice recognition')
      }
    }
  }, [recognition, isListening])

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }, [recognition, isListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    clearTranscript,
  }
}

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null
  onend: ((this: SpeechRecognition, ev: Event) => any) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
