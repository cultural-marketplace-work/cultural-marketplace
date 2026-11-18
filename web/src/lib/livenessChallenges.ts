import type { Category, NormalizedLandmark } from '@mediapipe/tasks-vision';

export type LivenessChallenge = 'blink_twice' | 'turn_both_sides';

export interface LivenessSession {
  order: LivenessChallenge[];
  completed: LivenessChallenge[];
  baselineSamples: number[];
  yawBaseline: number | null;
  blinkCount: number;
  eyesClosed: boolean;
  turnStage: 0 | 1 | 2;
  firstTurnDirection: -1 | 1 | null;
  centerFrames: number;
}

export function createLivenessSession(challengeOrder?: readonly LivenessChallenge[]): LivenessSession {
  const validOrder = challengeOrder?.length === 2 &&
    challengeOrder.includes('blink_twice') &&
    challengeOrder.includes('turn_both_sides');
  let order: LivenessChallenge[];
  if (validOrder) {
    order = [...challengeOrder];
  } else {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    order = random[0] % 2 === 0
      ? ['blink_twice', 'turn_both_sides']
      : ['turn_both_sides', 'blink_twice'];
  }
  return {
    order,
    completed: [],
    baselineSamples: [],
    yawBaseline: null,
    blinkCount: 0,
    eyesClosed: false,
    turnStage: 0,
    firstTurnDirection: null,
    centerFrames: 0,
  };
}

export function currentLivenessPrompt(session: LivenessSession): string {
  if (session.completed.length === session.order.length) return 'Liveness challenges complete.';
  if (session.baselineSamples.length < 12) return 'Look straight at the camera and hold still.';
  const challenge = session.order[session.completed.length];
  if (challenge === 'blink_twice') return `Blink naturally (${session.blinkCount}/2).`;
  if (session.turnStage === 0) return 'Turn your head slightly to either side.';
  if (session.turnStage === 1) return 'Now turn your head to the opposite side.';
  return 'Return your face to the center.';
}

export function processLivenessFrame(
  session: LivenessSession,
  faces: NormalizedLandmark[][],
  blendshapes: Category[],
): { completed: boolean; passed: boolean } {
  if (session.completed.length === session.order.length) return { completed: false, passed: true };
  if (faces.length !== 1) return { completed: false, passed: false };

  const landmarks = faces[0];
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  if (!leftEye || !rightEye || !nose || rightEye.x === leftEye.x) {
    return { completed: false, passed: false };
  }

  const noseRatio = (nose.x - leftEye.x) / (rightEye.x - leftEye.x);
  if (session.baselineSamples.length < 12) {
    session.baselineSamples.push(noseRatio);
    if (session.baselineSamples.length === 12) {
      session.yawBaseline = session.baselineSamples.reduce((sum, value) => sum + value, 0) / 12;
    }
    return { completed: false, passed: false };
  }

  const challenge = session.order[session.completed.length];
  if (challenge === 'blink_twice') {
    const leftBlink = blendshapes.find((category) => category.categoryName === 'eyeBlinkLeft')?.score ?? 0;
    const rightBlink = blendshapes.find((category) => category.categoryName === 'eyeBlinkRight')?.score ?? 0;
    if (leftBlink > 0.55 && rightBlink > 0.55) {
      session.eyesClosed = true;
    } else if (session.eyesClosed && leftBlink < 0.25 && rightBlink < 0.25) {
      session.eyesClosed = false;
      session.blinkCount += 1;
      if (session.blinkCount >= 2) {
        session.completed.push(challenge);
        session.turnStage = 0;
        return { completed: true, passed: session.completed.length === session.order.length };
      }
    }
    return { completed: false, passed: false };
  }

  const delta = noseRatio - (session.yawBaseline ?? noseRatio);
  if (session.turnStage === 0) {
    if (Math.abs(delta) > 0.075) {
      session.firstTurnDirection = delta > 0 ? 1 : -1;
      session.turnStage = 1;
    }
    return { completed: false, passed: false };
  }
  if (session.turnStage === 1) {
    if (session.firstTurnDirection !== null && delta * session.firstTurnDirection < -0.075) {
      session.turnStage = 2;
    }
    return { completed: false, passed: false };
  }
  if (Math.abs(delta) < 0.035) {
    session.centerFrames += 1;
    if (session.centerFrames >= 3) {
      session.completed.push(challenge);
      session.blinkCount = 0;
      return { completed: true, passed: session.completed.length === session.order.length };
    }
  } else {
    session.centerFrames = 0;
  }
  return { completed: false, passed: false };
}
