import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeAudio } from './api'

export type MicConsentStatus = 'idle' | 'requesting' | 'granted' | 'denied'

export function useMicRecorder() {
  const [consentStatus, setConsentStatus] = useState<MicConsentStatus>('idle')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const requestAccess = useCallback(async (): Promise<boolean> => {
    setConsentStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      setConsentStatus('granted')
      return true
    } catch (err) {
      console.error('Microphone access failed:', err)
      setConsentStatus('denied')
      return false
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return
    chunksRef.current = []
    setError(null)

    const recorder = new MediaRecorder(streamRef.current)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.start()
    recorderRef.current = recorder
    setIsRecording(true)
  }, [])

  const stopRecording = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }

      recorder.onstop = async () => {
        setIsRecording(false)
        setIsTranscribing(true)
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
          const text = await transcribeAudio(blob)
          resolve(text)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not transcribe that recording.')
          resolve(null)
        } finally {
          setIsTranscribing(false)
        }
      }
      recorder.stop()
    })
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return {
    consentStatus,
    requestAccess,
    isRecording,
    isTranscribing,
    error,
    startRecording,
    stopRecording,
  }
}
