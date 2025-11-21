import { useState, useCallback, useEffect } from 'react'

interface VoiceCommandState {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export const useVoiceCommand = (
  onCommand: (command: 'ON' | 'OFF') => void
): VoiceCommandState => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null)

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Voice recognition is not supported in your browser')
      return
    }

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = false
    recognitionInstance.interimResults = false
    recognitionInstance.lang = 'en-US' // Can be changed based on language

    recognitionInstance.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript.trim().toUpperCase()
      setTranscript(transcript)

      // Parse commands
      if (transcript.includes('ON') || transcript.includes('START') || transcript.includes('OPEN')) {
        onCommand('ON')
      } else if (
        transcript.includes('OFF') ||
        transcript.includes('STOP') ||
        transcript.includes('CLOSE')
      ) {
        onCommand('OFF')
      }
    }

    recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error)
      setError(`Voice recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognitionInstance.onend = () => {
      setIsListening(false)
    }

    setRecognition(recognitionInstance)

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop()
      }
    }
  }, [onCommand])

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

