'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { compressImage, fileToDataUrl, dataUrlToFile } from '@/lib/imageCompress';
import { extractOcrFields, type OcrApplicantFields } from '@/lib/ocrFields';
import { VALID_ARTISAN_ID_TYPES } from '@/lib/validArtisanIdTypes';
import {
  createLivenessSession,
  currentLivenessPrompt,
  processLivenessFrame,
  type LivenessChallenge,
  type LivenessSession,
} from '@/lib/livenessChallenges';
import ArtisanHeader from '@/components/ArtisanHeader';
import type Tesseract from 'tesseract.js';
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import {
  UserRound,
  Camera,
  ImagePlus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

type Step = 'id' | 'details' | 'face' | 'credentials' | 'done';
type LivenessStatus = 'idle' | 'loading' | 'checking' | 'passed' | 'unavailable' | 'manual_review';

const DRAFT_STORAGE_KEY = 'cm_artisan_reg_draft_v2';

export default function ArtisanRegisterPage() {
  const [step, setStep] = useState<Step>('id');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    location: '',
    id_type: '',
    craft_type: '',
    business_name: '',
    indigenous_affiliation: '',
    id_number: '',
    dob: '',
  });

  const [token, setToken] = useState('');
  const [services, setServices] = useState({ ocr: true, face: false, storage: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  // OCR state
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const [cachedOcr, setCachedOcr] = useState<Partial<Record<'front' | 'back', OcrApplicantFields>> | null>(null);
  const ocrWorkerRef = useRef<Promise<Tesseract.Worker> | null>(null);

  // Files
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [proofCraft, setProofCraft] = useState<File | null>(null);
  const [affiliationProof, setAffiliationProof] = useState<File | null>(null);
  const [sample1, setSample1] = useState<File | null>(null);
  const [sample2, setSample2] = useState<File | null>(null);

  // Previews (Data URLs, safe across page reloads)
  const [idFrontPreview, setIdFrontPreview] = useState<string>('');
  const [idBackPreview, setIdBackPreview] = useState<string>('');
  const [selfiePreview, setSelfiePreview] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');
  const [affiliationProofPreview, setAffiliationProofPreview] = useState<string>('');
  const [s1Preview, setS1Preview] = useState<string>('');
  const [s2Preview, setS2Preview] = useState<string>('');

  const [faceResult, setFaceResult] = useState<'idle' | 'matching' | 'match' | 'mismatch' | 'no_face' | 'manual_review'>('idle');
  const [faceMessage, setFaceMessage] = useState<string>('');
  const [livenessStatus, setLivenessStatus] = useState<LivenessStatus>('idle');
  const [livenessMessage, setLivenessMessage] = useState('');
  const [livenessChallengeOrder, setLivenessChallengeOrder] = useState<LivenessChallenge[]>([]);
  const [livenessCompleted, setLivenessCompleted] = useState<LivenessChallenge[]>([]);

  // Input refs
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const selfieFileRef = useRef<HTMLInputElement>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const affiliationProofRef = useRef<HTMLInputElement>(null);
  const s1Ref = useRef<HTMLInputElement>(null);
  const s2Ref = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const livenessSessionRef = useRef<LivenessSession | null>(null);
  const [camOn, setCamOn] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camFacing, setCamFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string>('');

  // 1. Accidental Refresh Recovery: Restore draft on initial page mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data && typeof data === 'object') {
        if (data.form) setForm((prev) => ({ ...prev, ...data.form }));
        if (data.token) setToken(data.token);
        if (
          Array.isArray(data.livenessChallengeOrder) &&
          data.livenessChallengeOrder.length === 2 &&
          data.livenessChallengeOrder.includes('blink_twice') &&
          data.livenessChallengeOrder.includes('turn_both_sides')
        ) {
          setLivenessChallengeOrder(data.livenessChallengeOrder);
        }
        if (data.step === 'id' || data.step === 'details' || data.step === 'face' || data.step === 'credentials') {
          setStep(data.step === 'credentials' ? 'face' : data.step);
        } else if (data.step === 'verify') {
          setStep('face');
        }
        if (data.cachedOcr) setCachedOcr(data.cachedOcr);
        if (data.ocrHint) setOcrHint(data.ocrHint);

        // Restore image previews & rebuild File objects
        if (data.idFrontPreview) {
          setIdFrontPreview(data.idFrontPreview);
          const f = dataUrlToFile(data.idFrontPreview, 'id-front.jpg');
          if (f) setIdFront(f);
        }
        if (data.idBackPreview) {
          setIdBackPreview(data.idBackPreview);
          const f = dataUrlToFile(data.idBackPreview, 'id-back.jpg');
          if (f) setIdBack(f);
        }
        if (data.proofPreview) {
          setProofPreview(data.proofPreview);
          const f = dataUrlToFile(data.proofPreview, 'proof.jpg');
          if (f) setProofCraft(f);
        }
        if (data.affiliationProofPreview) {
          setAffiliationProofPreview(data.affiliationProofPreview);
          const f = dataUrlToFile(data.affiliationProofPreview, 'affiliation-proof.jpg');
          if (f) setAffiliationProof(f);
        }
        if (data.s1Preview) {
          setS1Preview(data.s1Preview);
          const f = dataUrlToFile(data.s1Preview, 'sample1.jpg');
          if (f) setSample1(f);
        }
        if (data.s2Preview) {
          setS2Preview(data.s2Preview);
          const f = dataUrlToFile(data.s2Preview, 'sample2.jpg');
          if (f) setSample2(f);
        }

        setDraftRestored(true);
      }
    } catch {
      // Ignore corrupted local storage
    }
  }, []);

  // 2. Auto-save draft changes to localStorage
  useEffect(() => {
    if (step === 'done') {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const payload = {
          step,
          form,
          token,
          cachedOcr,
          ocrHint,
          livenessChallengeOrder,
          idFrontPreview,
          idBackPreview,
          proofPreview,
          affiliationProofPreview,
          s1Preview,
          s2Preview,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Exceeded quota or private mode: ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [step, form, token, cachedOcr, ocrHint, livenessChallengeOrder, idFrontPreview, idBackPreview, proofPreview, affiliationProofPreview, s1Preview, s2Preview]);

  useEffect(() => {
    return () => {
      const workerPromise = ocrWorkerRef.current;
      ocrWorkerRef.current = null;
      if (workerPromise) {
        void workerPromise
          .then((worker) => worker.terminate())
          .catch((error) => console.error('Could not stop the local OCR worker:', error));
      }
    };
  }, []);

  function clearDraft() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setForm({
      name: '', email: '', password: '', phone: '', location: '', id_type: '', craft_type: '', business_name: '', indigenous_affiliation: '', id_number: '', dob: '',
    });
    setToken('');
    setStep('id');
    setCachedOcr(null);
    setOcrHint('');
    setIdFront(null); setIdBack(null); setSelfie(null); setProofCraft(null); setAffiliationProof(null); setSample1(null); setSample2(null);
    setIdFrontPreview(''); setIdBackPreview(''); setSelfiePreview(''); setProofPreview(''); setAffiliationProofPreview(''); setS1Preview(''); setS2Preview('');
    setLivenessStatus('idle'); setLivenessMessage(''); setLivenessChallengeOrder([]); setLivenessCompleted([]);
    setDraftRestored(false);
  }

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // 3. Fast Automatic & Editable OCR Handler
  async function handleIdUpload(rawFile: File, side: 'front' | 'back') {
    setError('');
    setOcrBusy(true);
    setOcrHint('⚡ Compressing image for fast reading…');

    try {
      // Fast canvas downscale: 6MB -> ~150KB in 30ms
      const compressed = await compressImage(rawFile, 1200, 1200, 0.8);
      const dataUrl = await fileToDataUrl(compressed);

      if (side === 'front') {
        setIdFront(compressed);
        setIdFrontPreview(dataUrl);
        if (selfie) {
          void triggerFaceMatch(selfie, compressed);
        }
      } else {
        setIdBack(compressed);
        setIdBackPreview(dataUrl);
      }

      setOcrHint('Preparing on-device OCR…');
      let workerPromise = ocrWorkerRef.current;
      if (!workerPromise) {
        workerPromise = import('tesseract.js').then(({ createWorker }) =>
          createWorker('eng', undefined, {
            logger: ({ status, progress }) => {
              if (status === 'recognizing text') {
                setOcrHint(`Reading ID on this device… ${Math.round(progress * 100)}%`);
              } else {
                setOcrHint('Preparing on-device OCR…');
              }
            },
          })
        );
        ocrWorkerRef.current = workerPromise;
      }

      let worker: Tesseract.Worker;
      try {
        worker = await workerPromise;
      } catch (error) {
        if (ocrWorkerRef.current === workerPromise) ocrWorkerRef.current = null;
        throw error;
      }

      const { data } = await worker.recognize(compressed);
      const fields = extractOcrFields(data.text);
      const applicantFields: OcrApplicantFields = {
        full_name: fields.full_name,
        id_number: fields.id_number,
        dob: fields.dob,
        address: fields.address,
      };
      setCachedOcr((prev) => ({ ...(prev || {}), [side]: applicantFields }));

      setForm((prev) => ({
        ...prev,
        name: applicantFields.full_name && !prev.name.trim() ? applicantFields.full_name : prev.name,
        id_number: applicantFields.id_number && !prev.id_number.trim() ? applicantFields.id_number : prev.id_number,
        dob: applicantFields.dob && !prev.dob.trim() ? applicantFields.dob : prev.dob,
        location: applicantFields.address && !prev.location.trim() ? applicantFields.address : prev.location,
      }));

      const itemsFound = [
        applicantFields.full_name && 'Name',
        applicantFields.id_number && 'ID number',
        applicantFields.dob && 'Date of birth',
        applicantFields.address && 'Address',
      ].filter(Boolean);

      setOcrHint(itemsFound.length
        ? `Auto-filled ${itemsFound.join(', ')}. Review and edit the details before continuing.`
        : 'No applicant details were detected. You can enter them manually.');
    } catch (error) {
      console.error('On-device ID OCR failed:', error);
      setOcrHint('On-device OCR could not read this image. Please check the photo or enter the details manually.');
    } finally {
      setOcrBusy(false);
    }
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!VALID_ARTISAN_ID_TYPES.some((idType) => idType === form.id_type)) {
      setError('Choose a valid ID type before continuing.');
      setStep('id');
      return;
    }
    if (!idFront || !idBack) {
      setError('Upload both sides of your government-issued ID before continuing.');
      setStep('id');
      return;
    }
    if (!form.location.trim()) {
      setError('Enter the address shown on your ID. If OCR missed it, type it as printed.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register-artisan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setToken(data.token);
        setLivenessChallengeOrder(data.liveness_challenge_order);
        setServices(data.services ?? { ocr: true, face: false, storage: false });
        setStep('face');
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch {
      setError('Could not validate your details. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Ensure the live video element receives the MediaStream as soon as it mounts
  useEffect(() => {
    let isCancelled = false;

    if (camOn && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;

      const markReady = () => {
        if (!isCancelled) setCamReady(true);
      };

      video.addEventListener('playing', markReady);
      video.addEventListener('canplay', markReady);
      video.addEventListener('loadedmetadata', markReady);

      video.play().then(() => {
        markReady();
      }).catch((err) => {
        console.warn('Video play warning:', err);
      });

      return () => {
        isCancelled = true;
        video.removeEventListener('playing', markReady);
        video.removeEventListener('canplay', markReady);
        video.removeEventListener('loadedmetadata', markReady);
      };
    } else if (!camOn) {
      setCamReady(false);
    }
  }, [camOn]);

  useEffect(() => {
    if (!camOn || !camReady || step !== 'face' || !videoRef.current) return;

    let cancelled = false;
    let animationFrame = 0;
    let lastVideoTime = -1;
    let lastProcessedAt = 0;
    let landmarker: FaceLandmarker | null = null;
    let lastMessage = '';

    const setPrompt = (message: string) => {
      if (message !== lastMessage) {
        lastMessage = message;
        setLivenessMessage(message);
      }
    };

    async function initialize() {
      setLivenessStatus('loading');
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm',
        );
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
        });
        if (cancelled) {
          landmarker.close();
          landmarker = null;
          return;
        }
        faceLandmarkerRef.current = landmarker;
        setLivenessStatus('checking');
        setPrompt('Look straight at the camera and hold still.');

        const inspectFrame = () => {
          if (cancelled || !landmarker || !videoRef.current) return;
          const video = videoRef.current;
          const now = performance.now();
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastProcessedAt >= 80) {
            lastVideoTime = video.currentTime;
            lastProcessedAt = now;
            try {
              const result = landmarker.detectForVideo(video, now);
              const session = livenessSessionRef.current;
              if (!session) {
                setLivenessStatus('unavailable');
                setPrompt('Restart the camera to begin the liveness check.');
                return;
              }
              if (result.faceLandmarks.length !== 1) {
                setPrompt(result.faceLandmarks.length === 0
                  ? 'Position your face in the oval.'
                  : 'Only one person should be visible in the camera.');
              } else {
                const outcome = processLivenessFrame(
                  session,
                  result.faceLandmarks,
                  result.faceBlendshapes[0]?.categories ?? [],
                );
                setPrompt(currentLivenessPrompt(session));
                if (outcome.completed) setLivenessCompleted([...session.completed]);
                if (outcome.passed) {
                  setLivenessStatus('passed');
                  setPrompt('Liveness challenges passed. Capture your selfie.');
                }
              }
            } catch (cause) {
              console.error('MediaPipe liveness check failed:', cause);
              setLivenessStatus('unavailable');
              setPrompt('The liveness check is unavailable. You may capture for manual admin review.');
              return;
            }
          }
          animationFrame = window.requestAnimationFrame(inspectFrame);
        };
        animationFrame = window.requestAnimationFrame(inspectFrame);
      } catch (cause) {
        console.error('Could not initialize MediaPipe Face Landmarker:', cause);
        if (!cancelled) {
          setLivenessStatus('unavailable');
          setPrompt('The liveness check is unavailable. You may capture for manual admin review.');
        }
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      landmarker?.close();
      if (faceLandmarkerRef.current === landmarker) faceLandmarkerRef.current = null;
    };
  }, [camOn, camReady, step]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      faceLandmarkerRef.current?.close();
      faceLandmarkerRef.current = null;
    };
  }, []);

  async function startCamera(facing?: 'user' | 'environment') {
    const targetFacing: 'user' | 'environment' =
      facing === 'user' || facing === 'environment' ? facing : camFacing;
    const livenessSession = createLivenessSession(livenessChallengeOrder);
    livenessSessionRef.current = livenessSession;
    setLivenessChallengeOrder(livenessSession.order);
    setLivenessCompleted([]);
    setLivenessStatus('loading');
    setLivenessMessage('Loading the on-device liveness check…');
    setError('');
    setCameraError('');
    setCamReady(false);

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support live camera access. Upload a selfie for manual review.');
      }

      let stream: MediaStream;
      try {
        // First try with desired facing mode & ideal resolution
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback: generic video constraint for webcams that reject facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCamFacing(targetFacing);
      setCamOn(true);

      // If video ref is already mounted in the DOM, attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().then(() => {
          setCamReady(true);
        }).catch(() => {});
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      stopCamera();
      setLivenessStatus('manual_review');
      setLivenessMessage('Live camera verification is unavailable. An uploaded selfie will require manual admin review.');
      const msg = err instanceof Error ? err.message : '';
      let formatted = 'Unable to access camera. Please check camera permissions or upload a selfie for manual review.';
      if (msg.includes('Permission') || msg.includes('NotAllowedError') || msg.includes('PermissionDeniedError')) {
        formatted = 'Camera permission was blocked. Grant camera access or upload a selfie for manual review.';
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
        formatted = 'No camera device detected. Attach a camera or upload a selfie for manual review.';
      }
      setCameraError(formatted);
      setError(formatted);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamOn(false);
    setCamReady(false);
  }

  function flipCamera() {
    const nextFacing = camFacing === 'user' ? 'environment' : 'user';
    void startCamera(nextFacing);
  }

  async function triggerFaceMatch(file: File, idFrontFile: File | null = idFront) {
    if (!idFrontFile) {
      setFaceResult('idle');
      setFaceMessage('✓ Selfie captured. (Attach ID front to compare with face.)');
      return;
    }

    setFaceResult('matching');
    setFaceMessage('🔍 Analyzing face and comparing with ID photo…');

    try {
      const fd = new FormData();
      fd.append('id_image', idFrontFile);
      fd.append('selfie', file);
      const res = await fetch('/api/auth/face-preview', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.status === 'error' || !res.ok) {
        setFaceResult('manual_review');
        setFaceMessage(data.message || 'Automatic face comparison is unavailable. An admin will review your ID and selfie.');
      } else if (data.status === 'skipped' || data.skipped) {
        setFaceResult('manual_review');
        setFaceMessage(data.message || 'ℹ️ Automated face service unavailable. Your photo will be manually verified by admin.');
      } else if (data.status === 'no_face' || data.no_face) {
        setFaceResult('no_face');
        setFaceMessage(data.message || '⚠️ No face detected in the photo. Please look directly at the camera with clear lighting.');
      } else if (data.status === 'ok' && data.match) {
        setFaceResult('match');
        setFaceMessage(data.message || '✅ Face matched your ID photo!');
      } else if (data.status === 'ok' && data.match === false) {
        setFaceResult('mismatch');
        setFaceMessage(data.message || '⚠️ Face did not match ID photo. You may retake or proceed with manual admin verification.');
      } else {
        setFaceResult('manual_review');
        setFaceMessage('The face comparison returned an unexpected response. An admin will review your ID and selfie.');
      }
    } catch {
      setFaceResult('manual_review');
      setFaceMessage('ℹ️ Automatic face check could not complete. Photo saved for manual admin review.');
    }
  }

  async function captureSelfie(matchAgainstId: boolean) {
    setError('');
    if (livenessStatus !== 'passed' && livenessStatus !== 'unavailable') {
      setError('Complete the live liveness challenges before capturing your selfie.');
      return;
    }
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera is not ready yet. Please wait a moment.');
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      setError('Camera feed is still loading. Please wait for the live video to appear.');
      return;
    }

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Sanity check: Ensure the captured frame is not pitch black / blank
    const sample = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
    let sumBrightness = 0;
    for (let i = 0; i < sample.data.length; i += 4) {
      sumBrightness += sample.data[i] + sample.data[i + 1] + sample.data[i + 2];
    }
    const avgBrightness = sumBrightness / ((sample.data.length / 4) * 3);
    if (avgBrightness < 3) {
      setError('Captured photo appears completely dark or blank. Please check camera lens/lighting and try again.');
      return;
    }

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) {
      setError('Failed to capture photo. Please try again.');
      return;
    }

    const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
    const dataUrl = await fileToDataUrl(file);
    setSelfie(file);
    setSelfiePreview(dataUrl);
    stopCamera();

    if (matchAgainstId && idFront) {
      await triggerFaceMatch(file);
    } else {
      setFaceResult('idle');
      setFaceMessage('✓ Selfie captured.');
    }
  }

  async function finalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('token', token);
      if (idFront) fd.append('id_front', idFront);
      if (idBack) fd.append('id_back', idBack);
      if (selfie) fd.append('selfie', selfie);
      if (affiliationProof) fd.append('affiliation_proof', affiliationProof);
      if (proofCraft) fd.append('proof_of_craft', proofCraft);
      if (sample1) fd.append('product_sample_1', sample1);
      if (sample2) fd.append('product_sample_2', sample2);
      fd.append('indigenous_affiliation', form.indigenous_affiliation);
      fd.append('craft_type', form.craft_type);
      fd.append('business_name', form.business_name);
      fd.append('liveness_result', JSON.stringify({
        status: livenessStatus === 'passed' ? 'passed' : 'manual_review',
        challenge_order: livenessChallengeOrder,
        challenges_completed: livenessCompleted,
      }));

      // Pass pre-extracted OCR data to eliminate duplicate remote OCR latency
      if (cachedOcr) {
        fd.append('ocr_data', JSON.stringify(cachedOcr));
      }

      let res = await fetch('/api/auth/register-artisan/captures', { method: 'POST', body: fd });
      let data = await res.json();

      // If token expired (e.g. user was idle or refreshed past 15m), seamlessly re-register details and retry once
      if (res.status === 410 || (data.message && data.message.includes('expired'))) {
        const reReg = await fetch('/api/auth/register-artisan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, liveness_challenge_order: livenessChallengeOrder.join(',') }),
        });
        const reData = await reReg.json();
        if (reData.status === 'success' && reData.token) {
          setToken(reData.token);
          setLivenessChallengeOrder(reData.liveness_challenge_order);
          fd.set('token', reData.token);
          res = await fetch('/api/auth/register-artisan/captures', { method: 'POST', body: fd });
          data = await res.json();
        }
      }

      if (data.status === 'success') {
        setDone(true);
        setStep('done');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } else {
        setError(data.message || 'Registration failed.');
      }
    } catch {
      setError('Connection interrupted. Please press Submit again — your photos and information are preserved.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
  <div className="card w-full max-w-md p-8 text-center">
    <div className="text-4xl">🧵</div>
    <h1 className="mt-3 font-serif text-2xl font-bold text-brand-900">Application received</h1>
    <p className="mt-2 text-sm text-stone-600">
      Your artisan account is pending admin approval. You&apos;ll be able to sign in once approved.
    </p>
    <p className="mt-3 text-xs text-stone-400">
      {faceResult === 'match' ? '✅ Your face was automatically verified against your ID.' : 'An admin will review your documents manually.'}
    </p>
    <Link href="/" className="btn-primary mt-6 inline-block">Back to home</Link>
  </div>
</main>   
);
  }

  const inputClass = 'input w-full';
  const labelClass = 'block text-sm font-medium text-stone-700 mt-4';

      return (
    <main className="min-h-screen bg-canvas px-4 py-10">
  <div className="mx-auto w-full max-w-xl">
    <ArtisanHeader step={step} />

      

      {/* Accidental Refresh Recovery Banner */}
      {draftRestored && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-ochre-50 p-3.5 border border-ochre-200 text-xs text-charcoal-900">
          <div className="flex items-center gap-2">
            <span></span>
            <span><b>Draft restored:</b> Form progress and document uploads were recovered. Face selfies are not saved in browser drafts; please recapture yours.</span>
          </div>
          <button
            type="button"
            onClick={clearDraft}
            className="text-ochre-800 underline font-semibold hover:text-crimson-700 ml-2 whitespace-nowrap"
          >
            Start fresh
          </button>
        </div>
      )}

     

      {(step === 'id' || step === 'details') && (
        <div className="card mt-6 p-6 space-y-6">
          {step === 'id' && (
          <div className="rounded-xl border-2 border-brand-200 bg-brand-50/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl"></span>
                  
                </div>
                <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                  Choose an accepted Philippine government ID that shows your address, then upload clear photos of both sides. An admin will verify the document.
                </p>
              </div>
              
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700" htmlFor="id_type">Valid ID type</label>
              <select
                id="id_type"
                required
                className={inputClass}
                value={form.id_type}
                onChange={(e) => set('id_type', e.target.value)}
              >
                <option value="">Choose a valid ID</option>
                {VALID_ARTISAN_ID_TYPES.map((idType) => <option key={idType} value={idType}>{idType}</option>)}
              </select>
              <p className="mt-1 text-xs text-stone-500">The ID must display your current address. If OCR cannot read it, you can enter the address manually on the next step.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Front ID */}
              <div className="rounded-lg border-2 border-dashed border-brand-300 bg-white p-3 text-center transition hover:border-brand-500">
                {idFrontPreview ? (
                  <div>
                    <img src={idFrontPreview} alt="ID Front" className="mx-auto h-20 rounded object-cover" />
                    <p className="mt-1 text-[11px] font-semibold text-ochre-800">✓ Front Attached</p>
                    <button
                      type="button"
                      className="mt-1 text-[11px] text-stone-400 underline hover:text-red-600"
                      onClick={() => { setIdFront(null); setIdFrontPreview(''); if (frontRef.current) frontRef.current.value = ''; }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center py-2">
  <svg
    viewBox="0 0 52 40"
    className="h-10 w-[52px]"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="52" height="38" rx="6" fill="#B0B0B0" />

    {/* Person silhouette */}
    <circle cx="16" cy="13" r="5" fill="white" />
    <path
      d="M7 29C7 23.5 10.5 20 16 20C21.5 20 25 23.5 25 29V31H7V29Z"
      fill="white"
    />

    {/* Information lines */}
    <path
      d="M30 17H44M30 25H44"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
</div>
                    <button
                      type="button"
                      className="btn-outline w-full text-xs py-1.5"
                      onClick={() => frontRef.current?.click()}
                    >
                      Upload Front of ID
                    </button>
                  </div>
                )}
                <input
                  ref={frontRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleIdUpload(f, 'front');
                  }}
                />
              </div>

              {/* Back ID */}
              <div className="rounded-lg border-2 border-dashed border-stone-200 bg-white p-3 text-center transition hover:border-stone-400">
                {idBackPreview ? (
                  <div>
                    <img src={idBackPreview} alt="ID Back" className="mx-auto h-20 rounded object-cover" />
                    <p className="mt-1 text-[11px] font-semibold text-ochre-800">✓ Back Attached</p>
                    <button
                      type="button"
                      className="mt-1 text-[11px] text-stone-400 underline hover:text-red-600"
                      onClick={() => { setIdBack(null); setIdBackPreview(''); if (backRef.current) backRef.current.value = ''; }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-center py-2">
                      <svg
    viewBox="0 0 52 40"
    className="h-10 w-[52px]"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="52" height="38" rx="6" fill="#B0B0B0" />

    {/* Person silhouette */}
    <circle cx="16" cy="13" r="5" fill="white" />
    <path
      d="M7 29C7 23.5 10.5 20 16 20C21.5 20 25 23.5 25 29V31H7V29Z"
      fill="white"
    />

    {/* Information lines */}
    <path
      d="M30 17H44M30 25H44"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg></div>
                    <button
                      type="button"
                      className="btn-outline w-full text-xs py-1.5"
                      onClick={() => backRef.current?.click()}
                    >
                      Upload Back of ID
                    </button>
                  </div>
                )}
                <input
                  ref={backRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleIdUpload(f, 'back');
                  }}
                />
              </div>
            </div>

            {/* OCR Live Status */}
            {ocrBusy && (
              <div className="flex items-center gap-2 text-xs text-brand-700 bg-white p-2.5 rounded-lg border border-brand-200">
                <span className="animate-spin text-sm">⏳</span>
                <span>{ocrHint || 'Reading ID details on this device…'}</span>
              </div>
            )}
            {!ocrBusy && ocrHint && (
              <p className="text-xs text-ochre-800 font-semibold bg-ochre-50 p-2.5 rounded-lg border border-ochre-200">
                {ocrHint}
              </p>
            )}
          </div>
          )}

          {/* Editable Details Form */}
          {step === 'id' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500">
                OCR reads the photo in your browser; the ID image is not sent to an OCR provider. The first use downloads the OCR engine and language data. Review the extracted details, and an admin will verify the ID.
              </p>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                className="btn-primary w-full py-3 font-bold"
                disabled={!form.id_type || !idFront || !idBack || ocrBusy}
                onClick={() => { setError(''); setStep('details'); }}
              >
                Continue to Applicant Details →
              </button>
            </div>
          )}

          {step === 'details' && <form onSubmit={submitDetails}>
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">
                Applicant Information
              </h2>
              <span className="text-xs text-stone-400">Review and edit OCR results</span>
            </div>
            <p className="text-xs text-stone-500">
              Name, ID number, birth date, and address are filled when readable on your ID. Enter your email, password, and phone number yourself.
            </p>

            <div>
              <label className={labelClass} htmlFor="name">Full Name </label>
              <input
                id="name"
                type="text"
                required
                className={inputClass}
                placeholder="Juan Dela Cruz"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="id_number">Government ID Number</label>
                <input
                  id="id_number"
                  type="text"
                  className={inputClass}
                  placeholder="e.g. 1234-5678-9012"
                  value={form.id_number}
                  onChange={(e) => set('id_number', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="dob">Date of Birth</label>
                <input
                  id="dob"
                  type="date"
                  className={inputClass}
                  value={form.dob}
                  onChange={(e) => set('dob', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="email">Email Address </label>
                <input
                  id="email"
                  type="email"
                  required
                  className={inputClass}
                  placeholder="artisan@example.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  required
                  className={inputClass}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="phone">Mobile Number (09XX…)</label>
                <input
                  id="phone"
                  type="tel"
                  className={inputClass}
                  placeholder="09171234567"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="location">Address shown on ID</label>
                <input
                  id="location"
                  type="text"
                  required
                  className={inputClass}
                  placeholder="Enter the address as printed on your ID"
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="btn-outline py-3 font-bold" disabled={busy} onClick={() => setStep('id')}>
                ← Back to ID Validation
              </button>
              <button className="btn-primary py-3 font-bold" disabled={busy} type="submit">
                {busy ? 'Validating details…' : 'Continue to Liveness & Face →'}
              </button>
            </div>
          </form>}
        </div>
      )}

      {(step === 'face' || step === 'credentials') && (
        <form onSubmit={finalSubmit} className="card mt-6 p-6 space-y-6">
          {error && <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</p>}

          {step === 'face' && (
            <>
          {/* ID Summary Check */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-stone-800">1. Government ID Verification</h2>
              <button
                type="button"
                onClick={() => setStep('details')}
                className="text-xs text-brand-600 hover:underline"
              >
                ← Edit details or change ID
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-2 text-center">
                {idFrontPreview ? (
                  <div>
                    <img src={idFrontPreview} alt="ID Front" className="mx-auto h-20 rounded object-cover" />
                    <p className="mt-1 text-xs text-ochre-800 font-semibold">✓ Front ID attached</p>
                  </div>
                ) : (
                  <button type="button" className="btn-outline w-full text-xs py-2 mt-4" onClick={() => setStep('details')}>
                    Upload Front of ID
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-2 text-center">
                {idBackPreview ? (
                  <div>
                    <img src={idBackPreview} alt="ID Back" className="mx-auto h-20 rounded object-cover" />
                    <p className="mt-1 text-xs text-ochre-800 font-semibold">✓ Back ID attached</p>
                  </div>
                ) : (
                  <button type="button" className="btn-outline w-full text-xs py-2 mt-4" onClick={() => setStep('details')}>
                    Upload Back of ID
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Selfie */}
          <div className="border-t border-stone-200 pt-5">
            <h2 className="font-semibold text-stone-800">Stage 3: Liveness &amp; Facial Verification</h2>
            <p className="mt-1 text-xs text-stone-500">
              MediaPipe Face Mesh runs in your browser and asks you to blink twice and turn your head both ways. The live camera stream and landmarks stay in your browser; the captured selfie and ID front are sent for face-to-ID comparison and private admin review. Challenge-based liveness is a screening aid, not a guarantee against spoofing.
            </p>

            <div className="mt-3 rounded-xl border-2 border-dashed border-stone-200 p-4 text-center">
              {selfiePreview ? (
                <div className="space-y-3">
                  <div className="relative mx-auto w-36 h-36 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-sm bg-stone-100">
                    <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                  </div>

                  <div className={`mx-auto max-w-sm rounded-xl border p-3 text-xs text-left ${livenessStatus === 'passed' ? 'border-ochre-300 bg-ochre-50 text-ochre-900' : 'border-stone-200 bg-stone-50 text-stone-700'}`}>
                    <p className="font-semibold">{livenessStatus === 'passed' ? 'Active liveness challenges passed' : 'Liveness requires manual review'}</p>
                    <p className="mt-1">{livenessMessage || (livenessStatus === 'passed' ? 'Blink and head-turn challenges were completed.' : 'No live challenge result was recorded.')}</p>
                  </div>

{/* Status Badge */}
<div className="mx-auto max-w-sm rounded-xl text-xs text-left">

  {faceResult === 'matching' && (
    <div className="flex items-center gap-2.5 text-primary-700 bg-primary-50 border border-primary-200 p-3 rounded-xl">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600 shrink-0" />
      <span>{faceMessage || 'Matching with ID photo…'}</span>
    </div>
  )}

  {faceResult === 'match' && (
    <div className="flex items-start gap-2.5 text-charcoal-900 bg-ochre-50 border border-ochre-300 p-3 rounded-xl">
      <CheckCircle2 size={18} className="shrink-0 text-ochre-700" />
      <div>
        <p className="font-semibold">Face matched your ID!</p>
        <p className="text-[11px] text-ochre-800 mt-0.5">
          {faceMessage || 'Biometric verification passed successfully.'}
        </p>
      </div>
    </div>
  )}

  {faceResult === 'mismatch' && (
    <div className="flex items-start gap-2.5 text-charcoal-900 bg-ochre-50 border border-ochre-300 p-3 rounded-xl">
      <AlertTriangle size={18} className="shrink-0 text-ochre-700" />
      <div>
        <p className="font-semibold">Face match score below threshold</p>
        <p className="text-[11px] text-ochre-800 mt-0.5">
          {faceMessage || 'You can retake photo or submit anyway for manual admin review.'}
        </p>
      </div>
    </div>
  )}

  {faceResult === 'no_face' && (
    <div className="flex items-start gap-2.5 text-charcoal-900 bg-ochre-50 border border-ochre-300 p-3 rounded-xl">
      <UserRound size={18} className="shrink-0 text-ochre-700" />
      <div>
        <p className="font-semibold">No face detected</p>
        <p className="text-[11px] text-ochre-800 mt-0.5">
          {faceMessage || 'Please retake with your face clearly centered in good lighting.'}
        </p>
      </div>
    </div>
  )}

  {faceResult === 'manual_review' && (
    <div className="flex items-start gap-2.5 text-stone-700 bg-stone-100 border border-stone-200 p-3 rounded-xl">
      <Info size={18} className="shrink-0 text-stone-500" />
      <div>
        <p className="font-semibold">Pending Admin Review</p>
        <p className="text-[11px] text-stone-600 mt-0.5">
          {faceMessage || 'Selfie saved. An admin will review your photo during application approval.'}
        </p>
      </div>
    </div>
  )}

  {faceResult === 'idle' && (
    <div className="flex items-center justify-center gap-1.5 text-ochre-800 font-semibold py-1">
      <CheckCircle2 size={15} />
      <span>{faceMessage || 'Selfie captured'}</span>
    </div>
  )}

</div>


                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium underline"
                    onClick={() => {
                      setSelfie(null);
                      setSelfiePreview('');
                      setFaceResult('idle');
                      setFaceMessage('');
                      setLivenessStatus('idle');
                      setLivenessMessage('');
                      setLivenessChallengeOrder([]);
                      setLivenessCompleted([]);
                    }}
                  >
                    Retake selfie
                  </button>
                </div>
              ) : camOn ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-full max-w-sm aspect-[3/4] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 shadow-lg border border-stone-700">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => setCamReady(true)}
                      onCanPlay={() => setCamReady(true)}
                      onPlaying={() => setCamReady(true)}
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Face oval alignment guide */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                      <div className="w-40 h-52 sm:w-44 sm:h-56 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                      <span className="mt-2 text-[11px] font-medium text-white/90 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {livenessMessage || 'Center your face to begin.'}
                      </span>
                    </div>

                    {/* Camera starting / loading indicator */}
                    {!camReady && (
                      <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center gap-2 text-white">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <p className="text-xs font-medium">Starting camera feed…</p>
                      </div>
                    )}
                  </div>

                  <div aria-live="polite" className="mt-3 mx-auto max-w-sm rounded-xl border border-stone-200 bg-white p-3 text-left text-xs text-stone-700">
                    <p className="font-semibold">
                      {livenessStatus === 'loading' ? 'Loading on-device liveness model…'
                        : livenessStatus === 'passed' ? 'Liveness check passed'
                          : livenessStatus === 'unavailable' ? 'Liveness check unavailable'
                            : `Liveness challenges: ${livenessCompleted.length}/${livenessChallengeOrder.length || 2}`}
                    </p>
                    <p className="mt-1">{livenessMessage || 'Keep one face centered in the oval.'}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
  <button
    type="button"
    disabled={!camReady || (livenessStatus !== 'passed' && livenessStatus !== 'unavailable')}
    className="btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={() => captureSelfie(Boolean(idFront))}
  >
    <Camera size={15} />
    {livenessStatus === 'unavailable' ? 'Capture for Manual Review' : 'Capture Live Selfie'}
  </button>

  <button
    type="button"
    className="btn-outline flex items-center gap-2 text-xs py-2 px-3"
    onClick={flipCamera}
    title="Flip camera"
  >
    <RefreshCw size={14} />
    Flip
  </button>

  <button
    type="button"
    className="btn-outline flex items-center gap-2 text-xs py-2 px-3 text-stone-500 hover:text-stone-800"
    onClick={stopCamera}
  >
    <X size={14} />
    Cancel
  </button>
</div>
                </div>
              ) : (
                <div className="py-4">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100">
  <UserRound
    size={30}
    strokeWidth={1.5}
    className="text-stone-400"
  />
</div>
                  <p className="text-xs text-stone-600 font-medium mb-3">
                    Complete the live camera challenges, or upload a selfie for manual review if your camera is unavailable.
                  </p>

                  {cameraError && (
                    <div className="mx-auto mb-3 max-w-sm rounded-xl border border-ochre-300 bg-ochre-50 p-2.5 text-xs text-charcoal-900 text-left flex items-start gap-2">
                      <span className="text-sm shrink-0">⚠️</span>
                      <p className="leading-snug text-ochre-900">{cameraError}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2">
  <button
    type="button"
    className="btn-primary flex items-center gap-2 text-xs py-2 px-4 shadow-sm"
    onClick={() => void startCamera()}
  >
    <Camera size={15} />
    Open Camera
  </button>

  <button
    type="button"
    className="btn-outline flex items-center gap-2 text-xs py-2 px-3"
    onClick={() => selfieFileRef.current?.click()}
  >
    <ImagePlus size={15} />
    Upload File
  </button>
</div>
                  <input
                    ref={selfieFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const compressed = await compressImage(f, 800, 800, 0.85);
                        const dataUrl = await fileToDataUrl(compressed);
                        setSelfie(compressed);
                        setSelfiePreview(dataUrl);
                        setLivenessStatus('manual_review');
                        setLivenessChallengeOrder([]);
                        setLivenessCompleted([]);
                        setLivenessMessage('Photo upload does not prove liveness. An admin must review it manually.');
                        if (idFront) {
                          await triggerFaceMatch(compressed);
                        } else {
                          setFaceResult('idle');
                          setFaceMessage('✓ Selfie attached. (Attach ID front to compare with face.)');
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-5">
            <button type="button" className="btn-outline py-3 font-bold" onClick={() => { stopCamera(); setStep('details'); }}>
              ← Back to Applicant Details
            </button>
            <button
              type="button"
              className="btn-primary py-3 font-bold"
              disabled={!selfie || faceResult === 'matching'}
              onClick={() => { stopCamera(); setError(''); setStep('credentials'); }}
            >
              Continue to Affiliation &amp; Craft →
            </button>
          </div>
            </>
          )}

          {/* Proof of Craft Production */}
          {step === 'credentials' && (
            <>
          <section className="space-y-4">
            <h2 className="font-semibold text-stone-800">Stage 4: Indigenous Affiliation &amp; Craft Credentials</h2>
            <p className="text-xs text-stone-500">
              Provide your community affiliation and a supporting document (such as a community endorsement or certificate). Authorized admins review this information; applications remain pending until approval.
            </p>
            <div>
              <label className={labelClass} htmlFor="indigenous_affiliation">Indigenous community / affiliation</label>
              <input
                id="indigenous_affiliation"
                type="text"
                required
                maxLength={200}
                className={inputClass}
                placeholder="Community or affiliation name"
                value={form.indigenous_affiliation}
                onChange={(e) => set('indigenous_affiliation', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="craft_type">Craft specialization</label>
              <input
                id="craft_type"
                type="text"
                required
                maxLength={100}
                className={inputClass}
                placeholder="Traditional Uway Basket Weaving"
                value={form.craft_type}
                onChange={(e) => set('craft_type', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="business_name">Shop / workshop name (optional)</label>
              <input
                id="business_name"
                type="text"
                maxLength={100}
                className={inputClass}
                placeholder="Simulao Indigenous Crafts"
                value={form.business_name}
                onChange={(e) => set('business_name', e.target.value)}
              />
            </div>
            <div>
              <p className={labelClass}>Affiliation supporting document</p>
              <p className="mb-2 text-xs text-stone-500">Upload an image of a supporting document for admin review.</p>
              {affiliationProofPreview ? (
                <div className="flex items-center gap-3">
                  <img src={affiliationProofPreview} alt="Affiliation evidence preview" className="h-20 rounded object-cover" />
                  <button
                    type="button"
                    className="text-xs text-stone-500 underline hover:text-red-600"
                    onClick={() => {
                      setAffiliationProof(null);
                      setAffiliationProofPreview('');
                      if (affiliationProofRef.current) affiliationProofRef.current.value = '';
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button type="button" className="btn-outline w-full py-2 text-xs" onClick={() => affiliationProofRef.current?.click()}>
                  Upload affiliation evidence
                </button>
              )}
              <input
                ref={affiliationProofRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const compressed = await compressImage(file, 1200, 1200, 0.8);
                    setAffiliationProof(compressed);
                    setAffiliationProofPreview(await fileToDataUrl(compressed));
                  }
                }}
              />
            </div>
          </section>
            </>
          )}

          {step === 'credentials' && (
            <>
          <div className="border-t border-stone-200 pt-5">
            <h3 className="font-semibold text-stone-800">Craft production evidence &amp; samples</h3>
            <p className="mt-1 text-xs text-stone-500">
              Attach a photo of you crafting/workshop tools and 2 samples of your authentic products.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {([
  ['proof', proofRef, proofCraft, setProofCraft, proofPreview, setProofPreview, 'Craft', 'Proof of Craft'],
  ['sample1', s1Ref, sample1, setSample1, s1Preview, setS1Preview, 'Sample', 'Product Sample 1'],
  ['sample2', s2Ref, sample2, setSample2, s2Preview, setS2Preview, 'Sample', 'Product Sample 2'],
] as const).map(([side, ref, file, setFile, preview, setPreview, icon, label]) => (
                <div key={side} className="rounded-xl border-2 border-dashed border-stone-200 p-2 text-center">
                  {preview ? (
                    <div>
                      <img src={preview} alt={label} className="mx-auto h-16 rounded object-cover" />
                      <p className="mt-1 text-xs text-ochre-800 font-bold">✓</p>
                      <button
                        type="button"
                        className="text-[11px] text-stone-400 underline hover:text-red-600"
                        onClick={() => { setFile(null); setPreview(''); if (ref.current) ref.current.value = ''; }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="py-1 text-2xl">{icon}</div>
                      <button
                        type="button"
                        className="btn-outline w-full text-[11px] py-1 px-1"
                        onClick={() => ref.current?.click()}
                      >
                        {label}
                      </button>
                    </div>
                  )}
                  <input
                    ref={ref}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const compressed = await compressImage(f, 1200, 1200, 0.8);
                        const dataUrl = await fileToDataUrl(compressed);
                        setFile(compressed);
                        setPreview(dataUrl);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-200 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn-outline py-3 font-bold" disabled={busy} onClick={() => setStep('face')}>
                ← Back to Liveness &amp; Face
              </button>
              <button
                className="btn-primary py-3 font-bold shadow-md"
                disabled={busy || !idFront || !idBack || !selfie || !affiliationProof || !proofCraft || !sample1 || !sample2}
                type="submit"
              >
                {busy ? 'Submitting application… ' : 'Submit for Admin Review →'}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-stone-400">
              Your evidence is private and will be reviewed by an admin. Your application is not automatically approved.
            </p>
          </div>
            </>
          )}
        </form>
      )}
          </div>
</main>
  );
}
