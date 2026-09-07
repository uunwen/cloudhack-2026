import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import { extractPitchDegrees, isPitchedDown } from './headPose'

const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'

const CHECK_INTERVAL_MS = 1500
const SUSTAINED_THRESHOLD_MS = 4000
const PITCH_THRESHOLD_DEGREES = 18

export type InterventionType = 'ghosting' | 'doomscroll'

export interface AttentionEvent {
  type: InterventionType
}

export function useAttentionMonitor() {
  const [consentStatus, setConsentStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')
  const [triggeredEvent, setTriggeredEvent] = useState<AttentionEvent | null>(null)
  const [isCurrentlyAttentive, setIsCurrentlyAttentive] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const noFaceSinceRef = useRef<number | null>(null)
  const pitchedDownSinceRef = useRef<number | null>(null)
  const hasPendingEventRef = useRef(false)

  const runCheck = useCallback(() => {
    const video = videoRef.current
    const landmarker = landmarkerRef.current
    if (!video || !landmarker || video.readyState < 2) return

    let result: FaceLandmarkerResult
    try {
      result = landmarker.detectForVideo(video, performance.now())
    } catch {
      return
    }

    const now = Date.now()
    const hasFace = result.faceLandmarks && result.faceLandmarks.length > 0

    if (!hasFace) {
      noFaceSinceRef.current ??= now
      pitchedDownSinceRef.current = null
      setIsCurrentlyAttentive(false)

      if (!hasPendingEventRef.current && now - noFaceSinceRef.current >= SUSTAINED_THRESHOLD_MS) {
        hasPendingEventRef.current = true
        setTriggeredEvent({ type: 'ghosting' })
      }
      return
    }

    noFaceSinceRef.current = null
    const matrix = result.facialTransformationMatrixes?.[0]?.data
    const pitchedDown = matrix ? isPitchedDown(extractPitchDegrees(matrix), PITCH_THRESHOLD_DEGREES) : false

    if (pitchedDown) {
      pitchedDownSinceRef.current ??= now
      setIsCurrentlyAttentive(false)

      if (!hasPendingEventRef.current && now - pitchedDownSinceRef.current >= SUSTAINED_THRESHOLD_MS) {
        hasPendingEventRef.current = true
        setTriggeredEvent({ type: 'doomscroll' })
      }
    } else {
      pitchedDownSinceRef.current = null
      setIsCurrentlyAttentive(true)
    }
  }, [])

  const requestAccess = useCallback(async (): Promise<boolean> => {
    setConsentStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
      landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_ASSET_PATH },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFacialTransformationMatrixes: true,
      })

      intervalRef.current = setInterval(runCheck, CHECK_INTERVAL_MS)
      setConsentStatus('granted')
      return true
    } catch (err) {
      console.error('Attention monitor setup failed:', err)
      setConsentStatus('denied')
      return false
    }
  }, [runCheck])

  const clearTriggeredEvent = useCallback(() => {
    hasPendingEventRef.current = false
    noFaceSinceRef.current = null
    pitchedDownSinceRef.current = null
    setTriggeredEvent(null)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
  }, [])

  useEffect(() => stop, [stop])

  return {
    videoRef,
    consentStatus,
    requestAccess,
    triggeredEvent,
    clearTriggeredEvent,
    isCurrentlyAttentive,
    stop,
  }
}
