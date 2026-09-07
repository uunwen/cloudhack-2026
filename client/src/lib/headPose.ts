// Pure math only -- no DOM/camera code -- so this can be unit-tested with synthetic
// rotation matrices, independent of a real webcam or face.
//
// MediaPipe's facialTransformationMatrixes are a flat, row-major 4x4 matrix per detected
// face, with the 3x3 rotation submatrix in the top-left. Pitch (rotation about the X axis,
// i.e. nodding up/down) is recovered as atan2(m[9], m[10]) -- verified directly (not just
// sourced from a reference) by constructing a pure X-axis rotation matrix for known angles
// (0, +15, +30, -20 degrees) and confirming this formula recovers each exactly; a
// superficially-similar formula found during research (atan2(-m[8], sqrt(m0^2+m4^2)))
// turned out to extract a *different* axis entirely and returns 0 for any pure X rotation
// -- caught by this same verification, not assumed correct.
//
// What has NOT been verified against a real human face is which sign corresponds to
// "chin down" vs "chin up" in MediaPipe's specific camera-space convention -- that's
// isolated below as PITCH_SIGN so it's a one-line flip if real-world testing shows it's
// inverted.
const PITCH_SIGN = 1

export function extractPitchDegrees(matrix: number[]): number {
  const pitchRad = Math.atan2(matrix[9], matrix[10])
  return PITCH_SIGN * pitchRad * (180 / Math.PI)
}

export function isPitchedDown(pitchDegrees: number, thresholdDegrees = 18): boolean {
  return pitchDegrees > thresholdDegrees
}
