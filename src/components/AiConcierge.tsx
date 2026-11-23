import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FormEvent, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isStaticGitHubPagesHost } from '../lib/runtime';
import { AiPublicConfig, RestaurantSettings } from '../types';
import type { OrbState } from './three/AiOrb3D';

const LazyAiOrb3D = lazy(() => import('./three/AiOrb3D'));

interface AiConciergeProps {
  settings: RestaurantSettings;
  aiPublicConfig: AiPublicConfig;
  externalOpenSignal?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolsUsed?: string[];
  whatsappUrl?: string;
  reservationId?: string;
  escalationId?: string;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstanceLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructorLike;
  webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
}

type MicPermissionState = 'unknown' | 'granted' | 'prompt' | 'denied' | 'unsupported';

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithSpeechRecognition;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const TOOL_LABELS: Record<string, string> = {
  getRestaurantInformation: 'Checked Venue Info',
  getMenu: 'Checked Live Menu',
  getMenuItemDetails: 'Checked Dish Details',
  checkOpeningHours: 'Checked Hours',
  checkTableAvailability: 'Checked Seating',
  createReservationRequest: 'Logged Pending Request',
  getUpcomingEvents: 'Checked Events',
  sendWhatsAppEnquiry: 'Prepared WhatsApp',
  requestHumanAssistance: 'Notified Staff Inbox',
};

const SUGGESTED_QUESTIONS = [
  'What dishes are customer favourites and what is on the menu?',
  'Do you have upstairs terrace tables available this weekend?',
  'What are your opening hours and location in Kasoa?',
  'Can you log a table reservation request for Friday evening?',
];

type LiveVoiceStage =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEAKING'
  | 'ERROR'
  | 'DISCONNECTED';

interface VoiceDiagnostics {
  micPermission: MicPermissionState;
  micStreamStatus: string;
  audioContextState: string;
  inputSampleRate: number | null;
  resamplingStatus: string;
  wsState: string;
  geminiSessionStatus: string;
  outgoingChunks: number;
  incomingChunks: number;
  vadState: string;
  playbackState: string;
  lastError: string;
}

const INITIAL_DIAGNOSTICS: VoiceDiagnostics = {
  micPermission: 'unknown',
  micStreamStatus: 'inactive',
  audioContextState: 'not-initialized',
  inputSampleRate: null,
  resamplingStatus: 'inactive',
  wsState: 'CLOSED',
  geminiSessionStatus: 'idle',
  outgoingChunks: 0,
  incomingChunks: 0,
  vadState: 'idle',
  playbackState: 'idle',
  lastError: 'None',
};

const PCM_CAPTURE_WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(2048);
    this._offset = 0;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      this._buffer[this._offset++] = channel[i];
      if (this._offset >= this._buffer.length) {
        this.port.postMessage(this._buffer.slice(0));
        this._offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

function resampleLinearTo16k(input: Float32Array, sourceRate: number): Float32Array {
  if (!input.length || sourceRate === 16000 || sourceRate <= 0) return input;
  const ratio = sourceRate / 16000;
  const outputLen = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLen);
  for (let i = 0; i < outputLen; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const s0 = input[Math.min(idx, input.length - 1)];
    const s1 = input[Math.min(idx + 1, input.length - 1)];
    output[i] = s0 + (s1 - s0) * frac;
  }
  return output;
}

function float32ToPcm16Base64(input: Float32Array): string {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodePcm16Base64(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const byteLen = binary.length;
  const sampleCount = Math.floor(byteLen / 2);
  const bytes = new Uint8Array(sampleCount * 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(new ArrayBuffer(sampleCount * 4));
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return samples;
}

function computeRms(samples: Float32Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 4.5);
}

export function AiConcierge({
  settings,
  aiPublicConfig,
  externalOpenSignal = 0,
}: AiConciergeProps) {
  const staticHost = isStaticGitHubPagesHost();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [sessionId, setSessionId] = useState(() => `web-${Math.random().toString(36).slice(2, 10)}`);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `Akwaaba to Chop 'n Chill Restaurant & Lounge, Kasoa. I'm your ${aiPublicConfig.receptionistName || 'AI Concierge'}. Ask me about our menu, customer favourites, seating areas, upcoming live-band nights, or table reservation requests.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');

  // Human handoff panel state
  const [handoffState, setHandoffState] = useState<{
    loading: boolean;
    doneId?: string;
    whatsappUrl?: string;
    error?: string;
  }>({ loading: false });

  // Web Speech API Voice-to-Text Dictation state (for Text Chat input)
  const [speechSupported] = useState<boolean>(() => Boolean(getSpeechRecognitionConstructor()));
  const [speechListening, setSpeechListening] = useState(false);
  const [speechInterim, setSpeechInterim] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [micPermissionState, setMicPermissionState] = useState<MicPermissionState>(() =>
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? 'unknown'
      : 'unsupported'
  );

  // Voice Receptionist state (7 explicit lifecycle states)
  const [micConsentOpen, setMicConsentOpen] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceStage, setVoiceStage] = useState<LiveVoiceStage>('IDLE');
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveUserDraft, setLiveUserDraft] = useState('');
  const [liveAssistantDraft, setLiveAssistantDraft] = useState('');
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(INITIAL_DIAGNOSTICS);

  // Refs for WebSocket, SpeechRecognition & AudioContext callbacks (never stale closures)
  const wsRef = useRef<WebSocket | null>(null);
  const sessionReadyRef = useRef(false);
  const sessionAckTimeoutRef = useRef<number | null>(null);
  const isStartingVoiceRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const speechWaveTimerRef = useRef<number | null>(null);
  const liveUserDraftRef = useRef('');
  const liveAssistantDraftRef = useRef('');
  const voiceActiveRef = useRef(false);
  const micMutedRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const zeroGainRef = useRef<GainNode | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const scrollBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalOpenSignal > 0) {
      setOpen(true);
    }
  }, [externalOpenSignal]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;
    let cancelled = false;
    let statusObj: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        if (cancelled) return;
        statusObj = status;
        setMicPermissionState(status.state);
        status.onchange = () => {
          if (!cancelled) {
            setMicPermissionState(status.state);
          }
        };
      })
      .catch(() => {
        // Browsers like Safari may not support permissions.query({ name: 'microphone' })
      });
    return () => {
      cancelled = true;
      if (statusObj) {
        statusObj.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    voiceActiveRef.current = voiceActive;
  }, [voiceActive]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, liveUserDraft, liveAssistantDraft, speechInterim, open]);

  const updateDiagnostics = useCallback((patch: Partial<VoiceDiagnostics>) => {
    setDiagnostics((prev) => ({ ...prev, ...patch }));
  }, []);

  const refreshMicDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === 'audioinput');
      setMicDevices(inputs);
    } catch {
      // ignore enumeration failures before permission
    }
  }, []);

  useEffect(() => {
    if (open && mode === 'voice') {
      refreshMicDevices();
    }
  }, [open, mode, refreshMicDevices]);

  useEffect(() => {
    updateDiagnostics({ micPermission: micPermissionState });
  }, [micPermissionState, updateDiagnostics]);

  const stopVoiceSession = useCallback(
    (finalStage: 'IDLE' | 'DISCONNECTED' | 'ERROR' = 'DISCONNECTED', errorMsg?: string) => {
      intentionalCloseRef.current = finalStage !== 'ERROR';
      isStartingVoiceRef.current = false;
      sessionReadyRef.current = false;

      if (sessionAckTimeoutRef.current !== null) {
        window.clearTimeout(sessionAckTimeoutRef.current);
        sessionAckTimeoutRef.current = null;
      }

      if (workletNodeRef.current) {
        try {
          workletNodeRef.current.port.onmessage = null;
          workletNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        workletNodeRef.current = null;
      }

      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {
          // ignore
        }
        processorRef.current.onaudioprocess = null;
        processorRef.current = null;
      }

      if (zeroGainRef.current) {
        try {
          zeroGainRef.current.disconnect();
        } catch {
          // ignore
        }
        zeroGainRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      activeSourcesRef.current.forEach((src) => {
        try {
          src.stop();
        } catch {
          // ignore
        }
      });
      activeSourcesRef.current.clear();

      if (inputAudioCtxRef.current) {
        inputAudioCtxRef.current.close().catch(() => {});
        inputAudioCtxRef.current = null;
      }
      if (outputAudioCtxRef.current) {
        outputAudioCtxRef.current.close().catch(() => {});
        outputAudioCtxRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        try {
          ws.close();
        } catch {
          // ignore
        }
      }

      nextPlaybackTimeRef.current = 0;
      liveUserDraftRef.current = '';
      liveAssistantDraftRef.current = '';
      voiceActiveRef.current = false;
      setVoiceActive(false);
      setVoiceConnecting(false);
      setVoiceStage(finalStage);
      setAudioLevel(0);
      setLiveUserDraft('');
      setLiveAssistantDraft('');
      updateDiagnostics({
        micStreamStatus: 'inactive',
        audioContextState: 'closed',
        resamplingStatus: 'inactive',
        wsState: 'CLOSED',
        geminiSessionStatus: finalStage === 'ERROR' ? 'error' : 'closed',
        vadState: 'idle',
        playbackState: 'idle',
        ...(errorMsg ? { lastError: errorMsg } : {}),
      });
    },
    [updateDiagnostics]
  );

  const stopReadAloud = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMsgId(null);
  }, []);

  const toggleReadAloud = useCallback(
    (msgId: string, text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (speakingMsgId === msgId) {
        stopReadAloud();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = navigator.language || 'en-US';
      utterance.rate = 1.0;
      utterance.onend = () => setSpeakingMsgId(null);
      utterance.onerror = () => setSpeakingMsgId(null);
      setSpeakingMsgId(msgId);
      window.speechSynthesis.speak(utterance);
    },
    [speakingMsgId, stopReadAloud]
  );

  const stopSpeechDictation = useCallback((abortImmediately = false) => {
    if (speechWaveTimerRef.current !== null) {
      window.clearInterval(speechWaveTimerRef.current);
      speechWaveTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        if (abortImmediately) {
          rec.abort();
        } else {
          rec.stop();
        }
      } catch {
        // Ignore already-stopped SpeechRecognition instance
      }
    }
    setSpeechListening(false);
    setSpeechInterim('');
    setAudioLevel((prev) => (voiceActiveRef.current ? prev : 0));
  }, []);

  const cleanupRefs = useRef({
    stopReadAloud,
    stopSpeechDictation,
    stopVoiceSession,
  });
  cleanupRefs.current = {
    stopReadAloud,
    stopSpeechDictation,
    stopVoiceSession,
  };

  useEffect(() => {
    return () => {
      cleanupRefs.current.stopReadAloud();
      cleanupRefs.current.stopSpeechDictation(true);
      cleanupRefs.current.stopVoiceSession();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (speechListening) stopSpeechDictation(true);
      if (speakingMsgId) stopReadAloud();
    }
  }, [open, speechListening, speakingMsgId, stopSpeechDictation, stopReadAloud]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const orbState: OrbState = useMemo(() => {
    if (sending || voiceStage === 'CONNECTING' || voiceStage === 'PROCESSING') return 'thinking';
    if (speechListening) return 'listening';
    if (speakingMsgId || voiceStage === 'SPEAKING') return 'speaking';
    if (voiceStage === 'LISTENING' && !micMuted) return 'listening';
    return 'idle';
  }, [sending, voiceStage, speechListening, speakingMsgId, micMuted]);

  const sendMessageText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;
    setChatError('');

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');

    if (staticHost) {
      const q = trimmed.toLowerCase();
      const waDigits = settings.whatsappNumber.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(
        `Hello Chop 'n Chill Kasoa, enquiry: ${trimmed}`
      )}`;
      let reply = `We're located at ${settings.address} (Kasoa, Ghana). You can explore our full menu, gallery, and reservation request form on this page, or reach our host desk directly on ${settings.phone}.`;
      if (q.includes('hour') || q.includes('open') || q.includes('location') || q.includes('where')) {
        reply = `Location: ${settings.address} (Google Maps: ${settings.googleMapsUrl}). Hours: ${settings.openingHours}`;
      } else if (q.includes('menu') || q.includes('food') || q.includes('dish') || q.includes('jollof') || q.includes('banku')) {
        reply = `Guest favourites include Banku with Grilled Fish, Assorted Fried Rice, Assorted Jollof Rice, Chicken Kebab, and Samosas. Open the Menu page to filter dishes and build an Order Enquiry Tray, or call ${settings.phone} for today's GH₵ pricing.`;
      } else if (q.includes('book') || q.includes('table') || q.includes('reserv') || q.includes('terrace')) {
        reply = `We offer Indoor Dining, Outdoor Dining, and an Upstairs Terrace. Submit a pending table request anytime on the Reservations page or message our host team directly on WhatsApp (${settings.phone}).`;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `${reply}\n\nNote: Live AI chat responses run on our full-stack server; on static preview you can connect instantly via WhatsApp or phone.`,
          whatsappUrl,
        },
      ]);
      return;
    }

    setSending(true);

    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: trimmed,
          history: messages.slice(-12).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = (await resp.json()) as {
        sessionId?: string;
        reply?: string;
        toolsUsed?: string[];
        whatsappUrl?: string;
        reservationId?: string;
        escalationId?: string;
        error?: string;
      };
      if (data.sessionId) setSessionId(data.sessionId);
      if (!resp.ok || !data.reply) {
        setChatError(
          data.error ||
            `Could not reach ${aiPublicConfig.receptionistName}. Please call ${settings.phone} or use WhatsApp below.`
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply || '',
          toolsUsed: data.toolsUsed,
          whatsappUrl: data.whatsappUrl,
          reservationId: data.reservationId,
          escalationId: data.escalationId,
        },
      ]);
    } catch {
      setChatError(
        `Connection interrupted. You can reach our host team directly on ${settings.phone} or WhatsApp.`
      );
    } finally {
      setSending(false);
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendMessageText(input);
  };

  const handleClearChat = () => {
    stopReadAloud();
    if (speechListening) stopSpeechDictation(true);
    setChatError('');
    setSpeechError('');
    setHandoffState({ loading: false });
    setSessionId(`web-${Math.random().toString(36).slice(2, 10)}`);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `Conversation cleared. How can ${aiPublicConfig.receptionistName} help you plan your visit to Chop 'n Chill Kasoa?`,
      },
    ]);
  };

  const handleRequestHumanStaff = async () => {
    if (staticHost) {
      const waDigits = settings.whatsappNumber.replace(/\D/g, '');
      setHandoffState({
        loading: false,
        doneId: 'DIRECT-CONTACT',
        whatsappUrl: `https://wa.me/${waDigits}?text=${encodeURIComponent(
          "Hello Chop 'n Chill Kasoa, I would like to speak with staff."
        )}`,
      });
      return;
    }
    setHandoffState({ loading: true });
    const summaryText = messages
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Guest' : 'AI'}: ${m.text}`)
      .join(' | ');
    try {
      const resp = await fetch('/api/ai/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reason: 'Guest requested human staff assistance from AI Concierge',
          summary: summaryText || 'Guest requested direct staff follow-up.',
        }),
      });
      const data = (await resp.json()) as {
        escalation?: { id: string };
        whatsappUrl?: string;
        error?: string;
      };
      if (!resp.ok) {
        setHandoffState({ loading: false, error: data.error || 'Could not log handoff.' });
        return;
      }
      setHandoffState({
        loading: false,
        doneId: data.escalation?.id,
        whatsappUrl: data.whatsappUrl,
      });
    } catch {
      setHandoffState({ loading: false, error: 'Network error sending staff notification.' });
    }
  };

  const startSpeechDictation = async () => {
    if (speechListening) {
      stopSpeechDictation(false);
      return;
    }

    setSpeechError('');
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setSpeechError(
        'Voice-to-text dictation is not supported in this browser. Try Chrome/Edge or use Live Voice.'
      );
      return;
    }

    if (voiceActive || voiceConnecting) {
      stopVoiceSession();
    }

    // Request/verify microphone permission first and release probe tracks immediately
    // so SpeechRecognition never collides with an open MediaStream on the mic hardware.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        probeStream.getTracks().forEach((track) => track.stop());
        setMicPermissionState('granted');
      } catch (err) {
        const errName = err instanceof Error ? err.name : '';
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setMicPermissionState('denied');
          setSpeechError(
            'Microphone access is blocked. Please allow microphone permission in your browser address bar and try again.'
          );
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setSpeechError('No microphone device was found. Please check your audio input or type your message.');
        } else {
          setSpeechError('Could not access microphone for dictation. Please type your message below.');
        }
        return;
      }
    }

    try {
      const recognition = new RecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setSpeechListening(true);
        setSpeechError('');
        let tick = 0;
        speechWaveTimerRef.current = window.setInterval(() => {
          tick += 0.35;
          setAudioLevel(0.28 + Math.abs(Math.sin(tick)) * 0.42);
        }, 90);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0]?.transcript || '';
          if (result.isFinal) {
            finalChunk += transcript;
          } else {
            interimChunk += transcript;
          }
        }
        if (finalChunk.trim()) {
          setInput((prev) => {
            const cleaned = finalChunk.trim();
            return prev.trim() ? `${prev.trim()} ${cleaned}` : cleaned;
          });
        }
        setSpeechInterim(interimChunk.trim());
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const code = event.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setMicPermissionState('denied');
          setSpeechError(
            'Microphone permission was denied. Enable microphone access in your browser site settings.'
          );
        } else if (code === 'audio-capture') {
          setSpeechError('Microphone audio capture failed. Verify another app is not locking your mic.');
        } else if (code === 'no-speech') {
          setSpeechError('No speech detected. Tap the microphone and speak clearly when ready.');
        } else if (code === 'network') {
          setSpeechError('Speech recognition network error. Check your internet connection or type below.');
        } else if (code !== 'aborted') {
          setSpeechError('Voice dictation interrupted. You can continue typing or tap the microphone again.');
        }
        stopSpeechDictation(true);
      };

      recognition.onend = () => {
        stopSpeechDictation(false);
      };

      recognition.start();
    } catch {
      setSpeechError('Unable to start voice dictation in this browser.');
      stopSpeechDictation(true);
    }
  };

  const handleFinishSpeakingTurn = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !sessionReadyRef.current) return;
    wsRef.current.send(JSON.stringify({ audioStreamEnd: true }));
    setVoiceStage('PROCESSING');
    updateDiagnostics({ vadState: 'manual-stream-end-sent' });
  }, [updateDiagnostics]);

  const startVoiceSession = async () => {
    if (isStartingVoiceRef.current) return;
    if (voiceActive || voiceConnecting) {
      stopVoiceSession('IDLE');
    }
    stopSpeechDictation(true);
    setMicConsentOpen(false);
    setVoiceError('');

    if (staticHost) {
      const msg =
        'Real-time Live Voice requires the full-stack backend server and is not available on static GitHub Pages hosting. Please use WhatsApp or call us directly.';
      setVoiceError(msg);
      setVoiceStage('IDLE');
      updateDiagnostics({ lastError: msg });
      return;
    }

    if (!aiPublicConfig.voiceEnabled) {
      const msg = 'Live voice interaction is currently disabled by Chop n Chill management.';
      setVoiceError(msg);
      setVoiceStage('ERROR');
      updateDiagnostics({ lastError: msg });
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      const msg = 'This browser does not support live microphone capture. Please use text chat or call us.';
      setVoiceError(msg);
      setVoiceStage('ERROR');
      updateDiagnostics({ micPermission: 'unsupported', lastError: msg });
      return;
    }

    isStartingVoiceRef.current = true;
    intentionalCloseRef.current = false;
    setVoiceConnecting(true);
    setVoiceStage('CONNECTING');
    setDiagnostics({
      ...INITIAL_DIAGNOSTICS,
      micPermission: micPermissionState,
      geminiSessionStatus: 'connecting',
      wsState: 'CONNECTING',
      vadState: 'initializing',
      lastError: 'None',
    });

    try {
      // Create & resume AudioContexts SYNCHRONOUSLY inside user gesture before awaiting getUserMedia
      // so Chrome/Safari autoplay protection never suspends playback!
      const inputCtx = new AudioContext();
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      void inputCtx.resume().catch(() => {});
      void outputCtx.resume().catch(() => {});
      nextPlaybackTimeRef.current = outputCtx.currentTime;

      updateDiagnostics({
        audioContextState: `in:${inputCtx.state} / out:${outputCtx.state}`,
        inputSampleRate: inputCtx.sampleRate,
        resamplingStatus:
          inputCtx.sampleRate === 16000
            ? 'exact 16kHz pass-through'
            : `linear ${inputCtx.sampleRate}Hz -> 16000Hz`,
      });

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        ...(selectedMicId ? { deviceId: { exact: selectedMicId } } : {}),
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      } catch (err) {
        if (err instanceof Error && err.name === 'OverconstrainedError' && selectedMicId) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } else {
          throw err;
        }
      }

      mediaStreamRef.current = stream;
      setMicPermissionState('granted');
      await refreshMicDevices();

      const track = stream.getAudioTracks()[0];
      const trackLabel = track?.label || 'Default Microphone';
      if (!track || track.readyState !== 'live') {
        throw new Error('Microphone track did not enter live state.');
      }

      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      updateDiagnostics({
        micPermission: 'granted',
        micStreamStatus: `live (${trackLabel})`,
        audioContextState: `in:${inputCtx.state} / out:${outputCtx.state}`,
      });

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/ai-live`);
      wsRef.current = ws;

      // Guard against silent server stalls where session ack never arrives
      sessionAckTimeoutRef.current = window.setTimeout(() => {
        if (!sessionReadyRef.current && wsRef.current === ws) {
          const timeoutMsg = 'Gemini Live session handshake timed out. Please check network or try again.';
          setVoiceError(timeoutMsg);
          stopVoiceSession('ERROR', timeoutMsg);
        }
      }, 12000);

      ws.onopen = () => {
        updateDiagnostics({ wsState: 'OPEN', geminiSessionStatus: 'awaiting-setup-ack' });
      };

      const processMicFrame = (rawSamples: Float32Array) => {
        const curWs = wsRef.current;
        const curTrack = mediaStreamRef.current?.getAudioTracks()[0];
        if (
          !curWs ||
          curWs.readyState !== WebSocket.OPEN ||
          !sessionReadyRef.current ||
          !curTrack ||
          curTrack.readyState !== 'live'
        ) {
          return;
        }
        if (micMutedRef.current) {
          setAudioLevel(0);
          return;
        }
        const resampled = resampleLinearTo16k(rawSamples, inputCtx.sampleRate);
        const rms = computeRms(resampled);
        if (activeSourcesRef.current.size === 0) {
          setAudioLevel(rms);
        }
        const b64 = float32ToPcm16Base64(resampled);
        curWs.send(JSON.stringify({ audio: b64, mimeType: 'audio/pcm;rate=16000' }));
        setDiagnostics((prev) => ({
          ...prev,
          outgoingChunks: prev.outgoingChunks + 1,
          vadState: rms > 0.04 ? 'speech-detected' : prev.vadState === 'manual-stream-end-sent' ? 'manual-stream-end-sent' : 'auto-server-vad',
        }));
      };

      // Capture pipeline: prefer modern AudioWorkletNode with fallback to zero-gain ScriptProcessorNode
      const source = inputCtx.createMediaStreamSource(stream);
      const zeroGain = inputCtx.createGain();
      zeroGain.gain.value = 0;
      zeroGain.connect(inputCtx.destination);
      zeroGainRef.current = zeroGain;

      let workletAttached = false;
      if (typeof AudioWorkletNode !== 'undefined' && inputCtx.audioWorklet) {
        try {
          const blobUrl = URL.createObjectURL(
            new Blob([PCM_CAPTURE_WORKLET_CODE], { type: 'application/javascript' })
          );
          await inputCtx.audioWorklet.addModule(blobUrl);
          URL.revokeObjectURL(blobUrl);
          const workletNode = new AudioWorkletNode(inputCtx, 'pcm-capture-processor');
          workletNode.port.onmessage = (ev: MessageEvent<Float32Array>) => {
            if (ev.data) processMicFrame(ev.data);
          };
          source.connect(workletNode);
          workletNode.connect(zeroGain);
          workletNodeRef.current = workletNode;
          workletAttached = true;
        } catch {
          workletAttached = false;
        }
      }

      if (!workletAttached) {
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          processMicFrame(e.inputBuffer.getChannelData(0));
        };
        source.connect(processor);
        processor.connect(zeroGain);
      }

      ws.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            ready?: boolean;
            sessionId?: string;
            model?: string;
            vadMode?: string;
            audio?: string;
            inputTranscript?: string;
            outputTranscript?: string;
            interrupted?: boolean;
            turnComplete?: boolean;
            toolActive?: string;
            code?: string;
            error?: string;
            closed?: boolean;
          };

          if (payload.error) {
            setVoiceError(payload.error);
            stopVoiceSession('ERROR', payload.error);
            return;
          }

          if (payload.ready) {
            if (sessionAckTimeoutRef.current !== null) {
              window.clearTimeout(sessionAckTimeoutRef.current);
              sessionAckTimeoutRef.current = null;
            }
            sessionReadyRef.current = true;
            isStartingVoiceRef.current = false;
            voiceActiveRef.current = true;
            setVoiceConnecting(false);
            setVoiceActive(true);
            setVoiceStage(micMutedRef.current ? 'PROCESSING' : 'LISTENING');
            updateDiagnostics({
              geminiSessionStatus: `ready (${payload.model || 'gemini-3.8-live'})`,
              vadState: payload.vadMode === 'automatic' ? 'auto-server-vad' : 'ready',
              audioContextState: `in:${inputCtx.state} / out:${outputCtx.state}`,
            });
          }

          if (payload.inputTranscript) {
            liveUserDraftRef.current += payload.inputTranscript;
            setLiveUserDraft(liveUserDraftRef.current);
            if (activeSourcesRef.current.size === 0) {
              setVoiceStage('PROCESSING');
            }
          }

          if (payload.toolActive) {
            setVoiceStage('PROCESSING');
          }

          if (payload.outputTranscript) {
            liveAssistantDraftRef.current += payload.outputTranscript;
            setLiveAssistantDraft(liveAssistantDraftRef.current);
          }

          if (payload.interrupted) {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // ignore
              }
            });
            activeSourcesRef.current.clear();
            if (outputAudioCtxRef.current) {
              nextPlaybackTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
            setVoiceStage(micMutedRef.current ? 'PROCESSING' : 'LISTENING');
            updateDiagnostics({ playbackState: 'interrupted-flushed' });
          }

          if (payload.audio && outputAudioCtxRef.current) {
            const ctx = outputAudioCtxRef.current;
            try {
              if (ctx.state === 'suspended') {
                await ctx.resume();
              }
              const samples = decodePcm16Base64(payload.audio);
              if (samples.length > 0) {
                setAudioLevel(computeRms(samples));
                setVoiceStage('SPEAKING');

                const buffer = ctx.createBuffer(1, samples.length, 24000);
                buffer.getChannelData(0).set(samples);
                const src = ctx.createBufferSource();
                src.buffer = buffer;
                src.connect(ctx.destination);

                const startAt = Math.max(ctx.currentTime + 0.015, nextPlaybackTimeRef.current);
                src.start(startAt);
                nextPlaybackTimeRef.current = startAt + buffer.duration;
                activeSourcesRef.current.add(src);
                setDiagnostics((prev) => ({
                  ...prev,
                  incomingChunks: prev.incomingChunks + 1,
                  playbackState: `playing (${ctx.state})`,
                  audioContextState: `in:${inputAudioCtxRef.current?.state || 'closed'} / out:${ctx.state}`,
                }));
                src.onended = () => {
                  activeSourcesRef.current.delete(src);
                  if (activeSourcesRef.current.size === 0 && sessionReadyRef.current) {
                    setAudioLevel(0);
                    setVoiceStage(micMutedRef.current ? 'PROCESSING' : 'LISTENING');
                    updateDiagnostics({ playbackState: 'idle' });
                  }
                };
              }
            } catch (playbackErr) {
              const pMsg =
                playbackErr instanceof Error ? playbackErr.message : 'Audio output playback failed.';
              setVoiceError(`Audio playback failed: ${pMsg}`);
              updateDiagnostics({ playbackState: 'error', lastError: pMsg });
            }
          }

          if (payload.turnComplete) {
            const committedUser = liveUserDraftRef.current.trim();
            const committedAssistant = liveAssistantDraftRef.current.trim();
            liveUserDraftRef.current = '';
            liveAssistantDraftRef.current = '';
            setLiveUserDraft('');
            setLiveAssistantDraft('');
            if (committedUser || committedAssistant) {
              setMessages((prev) => {
                const next = [...prev];
                const ts = Date.now();
                if (committedUser) {
                  next.push({ id: `vu-${ts}`, role: 'user', text: committedUser });
                }
                if (committedAssistant) {
                  next.push({ id: `va-${ts + 1}`, role: 'assistant', text: committedAssistant });
                }
                return next;
              });
            }
            if (activeSourcesRef.current.size === 0 && sessionReadyRef.current) {
              setVoiceStage(micMutedRef.current ? 'PROCESSING' : 'LISTENING');
              updateDiagnostics({ vadState: 'auto-server-vad' });
            }
          }

          if (payload.closed) {
            stopVoiceSession('DISCONNECTED');
          }
        } catch {
          // Ignore malformed WS frame
        }
      };

      ws.onerror = () => {
        if (wsRef.current !== ws) return;
        const msg = 'WebSocket error connecting to live voice concierge service.';
        setVoiceError(msg);
        stopVoiceSession('ERROR', msg);
      };

      ws.onclose = (ev) => {
        if (wsRef.current === ws) {
          if (!intentionalCloseRef.current && !sessionReadyRef.current) {
            const msg = ev.reason || 'Live voice session closed before handshake completed.';
            setVoiceError(msg);
            stopVoiceSession('ERROR', msg);
          } else {
            stopVoiceSession('DISCONNECTED');
          }
        }
      };
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      let msg = 'Unable to access microphone or start voice session. Text chat remains available.';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicPermissionState('denied');
        msg =
          'Microphone permission was denied. Click the lock/settings icon in your browser address bar, set Microphone to Allow, and try again.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = 'No microphone was found on this device. Connect a microphone or check Windows/system sound settings.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = 'Microphone is currently locked by another app or browser tab. Close the other capture and retry.';
      } else if (err instanceof Error && err.message) {
        msg = err.message;
      }
      setVoiceError(msg);
      stopVoiceSession('ERROR', msg);
    }
  };

  return (
    <>
      {/* Floating AI Concierge Trigger (coordinated on bottom-left/right cleanly; placed bottom-right with WhatsApp dock) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${aiPublicConfig.receptionistName}`}
        className="fixed bottom-4 left-4 z-30 inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-sm bg-[#141414]/95 border border-[#C9A45C]/55 text-[#F8F4EC] hover:border-[#DFC082] hover:bg-[#1B1B1B] transition-all shadow-2xl min-h-[48px] group"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-[#101010] border border-[#C9A45C]/30">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-[#DFC082]">
                <Sparkles className="w-4 h-4" />
              </div>
            }
          >
            <LazyAiOrb3D state={open ? orbState : 'idle'} size="sm" className="w-full h-full" />
          </Suspense>
        </div>
        <div className="text-left">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#DFC082]">
            {aiPublicConfig.receptionistName}
          </span>
          <span className="block text-[11px] text-[#B8B0A0]">
            {aiPublicConfig.voiceEnabled ? 'Text & Live Voice' : 'Text Receptionist'}
          </span>
        </div>
      </button>

      {/* Elevated Conversational Concierge Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:justify-start sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Chop 'n Chill Autonomous AI Concierge"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[460px] h-[90svh] sm:h-[680px] max-h-[92svh] bg-[#121212] border border-[#C9A45C]/40 rounded-t-md sm:rounded-sm shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#181818] border-b border-[#F8F4EC]/10 flex items-center justify-between gap-3 shrink-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9A45C]">
                  Chop 'n Chill · Kasoa
                </p>
                <h2 className="font-display text-lg font-semibold text-[#F8F4EC]">
                  {aiPublicConfig.receptionistName}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Clear conversation"
                  aria-label="Clear conversation"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#C8BFA8] hover:text-[#F8F4EC] hover:border-[#C9A45C]"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Concierge"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-sm border border-[#F8F4EC]/15 text-[#F8F4EC] hover:border-[#C9A45C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 3D Animated AI Orb Stage (No CSS backdrop-filter over canvas) */}
            <div
              className={`relative h-36 bg-gradient-to-b border-b flex items-center justify-between px-5 shrink-0 transition-colors ${
                orbState === 'listening'
                  ? 'from-[#173C30]/65 via-[#111C18] to-[#121212] border-[#34D399]/40'
                  : 'from-[#173C30]/35 via-[#121212] to-[#121212] border-[#F8F4EC]/10'
              }`}
            >
              <div className="relative w-36 h-32">
                <Suspense
                  fallback={
                    <div className="w-full h-full flex items-center justify-center text-[#C9A45C]">
                      <Sparkles className="w-8 h-8" />
                    </div>
                  }
                >
                  <LazyAiOrb3D state={orbState} audioLevel={audioLevel} size="lg" className="w-full h-full" />
                </Suspense>
                {orbState === 'listening' && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 flex items-end gap-1 h-4 px-2 py-0.5 rounded-sm bg-[#101010]/85 border border-[#34D399]/40"
                  >
                    {[0.45, 0.9, 0.65, 1, 0.55].map((scale, idx) => (
                      <span
                        key={idx}
                        className="w-0.5 rounded-full bg-[#34D399] transition-all duration-150"
                        style={{
                          height: `${Math.max(4, Math.round((0.35 + audioLevel * 0.65) * scale * 12))}px`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1 pl-2 space-y-2.5">
                <div>
                  <p
                    className={`text-[11px] uppercase tracking-[0.14em] font-semibold ${
                      orbState === 'listening'
                        ? 'text-[#6EE7B7]'
                        : mode === 'voice' && voiceStage === 'ERROR'
                        ? 'text-red-300'
                        : 'text-[#C9A45C]'
                    }`}
                  >
                    Status · {mode === 'voice' ? voiceStage : orbState.toUpperCase()}
                  </p>
                  <p className="text-xs text-[#C8BFA8] mt-0.5 leading-relaxed">
                    {speechListening
                      ? 'Dictating to chat… tap mic again to stop.'
                      : mode === 'voice'
                      ? voiceStage === 'CONNECTING'
                        ? 'Initializing mic & Gemini Live session…'
                        : voiceStage === 'LISTENING'
                        ? 'Microphone active & streaming live…'
                        : voiceStage === 'PROCESSING'
                        ? 'Processing your speech…'
                        : voiceStage === 'SPEAKING'
                        ? 'Playing spoken reply (24 kHz)…'
                        : voiceStage === 'ERROR'
                        ? 'Voice error — check notice below.'
                        : voiceStage === 'DISCONNECTED'
                        ? 'Live voice session ended.'
                        : 'Ready for real-time voice conversation.'
                      : orbState === 'speaking'
                      ? 'Reading reply aloud…'
                      : orbState === 'thinking'
                      ? 'Checking live restaurant records…'
                      : 'Ask about menus, tables, events, or bookings.'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceActive || voiceConnecting) stopVoiceSession('IDLE');
                      setMode('chat');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors min-h-[34px] ${
                      mode === 'chat'
                        ? 'bg-[#C9A45C] text-[#101010]'
                        : 'border border-[#F8F4EC]/20 text-[#C8BFA8] hover:text-[#F8F4EC]'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (speechListening) stopSpeechDictation(true);
                      setMode('voice');
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors min-h-[34px] ${
                      mode === 'voice'
                        ? 'bg-[#C9A45C] text-[#101010]'
                        : 'border border-[#F8F4EC]/20 text-[#C8BFA8] hover:text-[#F8F4EC]'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Live Voice</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Body Area */}
            {mode === 'voice' ? (
              <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between gap-4">
                <div className="space-y-4">
                  {staticHost ? (
                    <div className="p-4 rounded-sm bg-[#1C1C1C] border border-[#C9A45C]/35 space-y-3 text-sm text-[#C8BFA8]">
                      <p className="font-semibold text-[#F8F4EC]">
                        Live Voice Unavailable on Static Hosting
                      </p>
                      <p className="text-xs leading-relaxed">
                        Real-time Gemini Live Voice streams audio through a dedicated WebSocket backend server, which is not active on static GitHub Pages. You can still use{' '}
                        <button
                          type="button"
                          onClick={() => setMode('chat')}
                          className="text-[#DFC082] underline"
                        >
                          Concierge Chat
                        </button>
                        , send a WhatsApp enquiry, or call our Kasoa host desk directly.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-[#173C30] border border-[#C9A45C]/45 text-xs font-semibold text-[#F8F4EC] hover:bg-[#1E4D3E]"
                        >
                          <span>WhatsApp Staff</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#DFC082]" />
                        </a>
                        <a
                          href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold text-[#DFC082] hover:border-[#C9A45C]"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call {settings.phone}</span>
                        </a>
                      </div>
                    </div>
                  ) : !aiPublicConfig.voiceEnabled ? (
                    <div className="p-4 rounded-sm bg-[#1C1C1C] border border-[#C9A45C]/30 text-sm text-[#C8BFA8]">
                      Voice interaction has been paused by Chop 'n Chill management. Please switch to{' '}
                      <button
                        type="button"
                        onClick={() => setMode('chat')}
                        className="text-[#DFC082] underline"
                      >
                        Text Chat
                      </button>{' '}
                      or call <span className="text-[#F8F4EC]">{settings.phone}</span>.
                    </div>
                  ) : micConsentOpen ? (
                    <div className="p-4 rounded-sm bg-[#19231F] border border-[#C9A45C]/40 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-[#DFC082] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#F8F4EC]">
                            Microphone Permission &amp; Privacy Notice
                          </p>
                          <p className="text-xs text-[#C8BFA8] mt-1 leading-relaxed">
                            Your microphone audio streams strictly while this live voice session is active to help you with menus, availability, and reservation requests. Never speak payment card numbers or PINs aloud.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={startVoiceSession}
                          className="px-4 py-2 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-wider min-h-[40px]"
                        >
                          Allow Microphone &amp; Start
                        </button>
                        <button
                          type="button"
                          onClick={() => setMicConsentOpen(false)}
                          className="px-4 py-2 rounded-sm border border-[#F8F4EC]/20 text-xs text-[#C8BFA8] min-h-[40px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-sm bg-[#181818] border border-[#F8F4EC]/10 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#C9A45C]">
                          Real-Time Voice Receptionist
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider border ${
                            voiceStage === 'LISTENING'
                              ? 'border-[#34D399]/50 bg-[#173C30]/60 text-[#6EE7B7]'
                              : voiceStage === 'SPEAKING'
                              ? 'border-[#DFC082]/60 bg-[#2B2010] text-[#FFE09E]'
                              : voiceStage === 'PROCESSING' || voiceStage === 'CONNECTING'
                              ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                              : voiceStage === 'ERROR'
                              ? 'border-red-500/50 bg-red-950/40 text-red-200'
                              : 'border-[#F8F4EC]/15 bg-[#121212] text-[#C8BFA8]'
                          }`}
                        >
                          {voiceStage}
                        </span>
                      </div>
                      <p className="text-sm text-[#D8D0C0] leading-relaxed">
                        Speak naturally to ask about today&apos;s dishes, upstairs terrace seating, live-band nights, or submit a pending reservation request.
                      </p>

                      {micDevices.length > 0 && !voiceActive && !voiceConnecting && (
                        <div>
                          <label
                            htmlFor="voice-mic-select"
                            className="block text-[11px] uppercase tracking-[0.12em] text-[#9A9282] mb-1"
                          >
                            Microphone Input Device
                          </label>
                          <select
                            id="voice-mic-select"
                            value={selectedMicId}
                            onChange={(e) => setSelectedMicId(e.target.value)}
                            className="w-full px-3 py-2 rounded-sm bg-[#101010] border border-[#F8F4EC]/15 text-xs text-[#F8F4EC] focus:border-[#C9A45C] focus:outline-none min-h-[38px]"
                          >
                            <option value="">System Default Microphone</option>
                            {micDevices.map((d, idx) => (
                              <option key={d.deviceId || idx} value={d.deviceId}>
                                {d.label || `Microphone ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {!voiceActive && !voiceConnecting && (
                        <button
                          type="button"
                          onClick={() => {
                            if (micPermissionState === 'granted') {
                              void startVoiceSession();
                            } else {
                              setMicConsentOpen(true);
                            }
                          }}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] min-h-[46px]"
                        >
                          <Mic className="w-4 h-4" />
                          <span>
                            {voiceStage === 'DISCONNECTED' || voiceStage === 'ERROR'
                              ? 'Reconnect Voice Assistant'
                              : 'Start Voice Assistant'}
                          </span>
                        </button>
                      )}
                      {voiceConnecting && (
                        <div className="flex items-center justify-between gap-2 py-2.5 px-3 rounded-sm bg-[#121212] border border-[#C9A45C]/30 text-xs text-[#DFC082]">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Connecting microphone &amp; Gemini Live…</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => stopVoiceSession('IDLE')}
                            className="text-[11px] uppercase tracking-wider text-[#C8BFA8] hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {voiceActive && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setMicMuted((m) => {
                                  const nextMuted = !m;
                                  if (nextMuted && wsRef.current?.readyState === WebSocket.OPEN && sessionReadyRef.current) {
                                    wsRef.current.send(JSON.stringify({ audioStreamEnd: true }));
                                    setVoiceStage('PROCESSING');
                                    updateDiagnostics({ vadState: 'muted-stream-end' });
                                  } else if (!nextMuted && sessionReadyRef.current) {
                                    setVoiceStage('LISTENING');
                                    updateDiagnostics({ vadState: 'auto-server-vad' });
                                  }
                                  return nextMuted;
                                });
                              }}
                              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-sm border text-xs font-semibold uppercase tracking-wider min-h-[44px] ${
                                micMuted
                                  ? 'border-amber-500/60 bg-amber-950/30 text-amber-200'
                                  : 'border-[#C9A45C]/45 bg-[#121212] text-[#F8F4EC]'
                              }`}
                            >
                              {micMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#DFC082]" />}
                              <span>{micMuted ? 'Unmute' : 'Mute'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleFinishSpeakingTurn}
                              title="Signal end of speech immediately if room noise keeps auto-VAD open"
                              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-sm border border-[#34D399]/50 bg-[#173C30]/60 text-xs font-semibold uppercase tracking-wider text-[#6EE7B7] hover:bg-[#173C30] min-h-[44px]"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>End Turn</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => stopVoiceSession('DISCONNECTED')}
                              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-sm bg-red-900/70 border border-red-500/40 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 min-h-[44px]"
                            >
                              <Square className="w-3.5 h-3.5" />
                              <span>Stop</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {voiceError && (
                    <div className="p-3.5 rounded-sm bg-red-950/40 border border-red-700/50 text-xs text-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <span>{voiceError}</span>
                    </div>
                  )}

                  {/* Developer Live Voice Diagnostics Panel */}
                  <div className="rounded-sm border border-[#F8F4EC]/10 bg-[#141414]">
                    <button
                      type="button"
                      onClick={() => setDiagnosticsOpen((o) => !o)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.12em] text-[#B8B0A0] hover:text-[#DFC082]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#C9A45C]" />
                        <span>Developer Voice Diagnostics</span>
                      </span>
                      {diagnosticsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {diagnosticsOpen && (
                      <div className="px-3.5 pb-3 pt-1 border-t border-[#F8F4EC]/10 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-mono">
                        <div>
                          <span className="text-[#8E8677] block">Mic Permission</span>
                          <span className="text-[#E6DFD1]">{diagnostics.micPermission}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Mic Stream</span>
                          <span className="text-[#E6DFD1] truncate block">{diagnostics.micStreamStatus}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">AudioContext</span>
                          <span className="text-[#E6DFD1]">{diagnostics.audioContextState}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Input Sample Rate</span>
                          <span className="text-[#E6DFD1]">
                            {diagnostics.inputSampleRate ? `${diagnostics.inputSampleRate} Hz` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Resampling</span>
                          <span className="text-[#E6DFD1] truncate block">{diagnostics.resamplingStatus}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">WebSocket State</span>
                          <span className="text-[#E6DFD1]">{diagnostics.wsState}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Gemini Session</span>
                          <span className="text-[#E6DFD1] truncate block">{diagnostics.geminiSessionStatus}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">VAD / Playback</span>
                          <span className="text-[#E6DFD1] truncate block">
                            {diagnostics.vadState} / {diagnostics.playbackState}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Audio Chunks Out</span>
                          <span className="text-[#6EE7B7]">{diagnostics.outgoingChunks}</span>
                        </div>
                        <div>
                          <span className="text-[#8E8677] block">Audio Chunks In</span>
                          <span className="text-[#DFC082]">{diagnostics.incomingChunks}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#8E8677] block">Last Error</span>
                          <span className="text-red-300 break-words">{diagnostics.lastError}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Live Streaming Transcript Preview */}
                  {(liveUserDraft || liveAssistantDraft || messages.length > 1) && (
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9A9282]">
                        Live Conversation Transcript
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {messages.slice(-4).map((m) => (
                          <div
                            key={m.id}
                            className={`p-2.5 rounded-sm text-xs leading-relaxed ${
                              m.role === 'user'
                                ? 'bg-[#1E1E1E] text-[#F8F4EC] ml-6'
                                : 'bg-[#173C30]/35 border border-[#C9A45C]/20 text-[#E6DFD1] mr-6'
                            }`}
                          >
                            {m.text}
                          </div>
                        ))}
                        {liveUserDraft && (
                          <div className="p-2.5 rounded-sm text-xs bg-[#1E1E1E] text-[#DFC082] ml-6">
                            {liveUserDraft}
                          </div>
                        )}
                        {liveAssistantDraft && (
                          <div className="p-2.5 rounded-sm text-xs bg-[#173C30]/35 border border-[#C9A45C]/30 text-[#F8F4EC] mr-6">
                            {liveAssistantDraft}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* TEXT CHAT VIEW */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[88%] px-3.5 py-2.5 rounded-sm text-sm leading-relaxed whitespace-pre-line ${
                          m.role === 'user'
                            ? 'bg-[#C9A45C] text-[#101010] font-medium'
                            : 'bg-[#1C1C1C] border border-[#F8F4EC]/10 text-[#F8F4EC]'
                        }`}
                      >
                        {m.text}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 px-1">
                        {m.role === 'assistant' && typeof window !== 'undefined' && 'speechSynthesis' in window && (
                          <button
                            type="button"
                            onClick={() => toggleReadAloud(m.id, m.text)}
                            aria-label={speakingMsgId === m.id ? 'Stop reading reply aloud' : 'Read reply aloud'}
                            className="inline-flex items-center gap-1 text-[11px] text-[#B8B0A0] hover:text-[#DFC082] transition-colors"
                          >
                            {speakingMsgId === m.id ? (
                              <>
                                <VolumeX className="w-3 h-3 text-[#DFC082]" />
                                <span>Stop audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-[#C9A45C]" />
                                <span>Listen</span>
                              </>
                            )}
                          </button>
                        )}
                        {m.toolsUsed && m.toolsUsed.length > 0 && (
                          <p className="text-[11px] text-[#9A9282]">
                            {m.toolsUsed.map((t) => TOOL_LABELS[t] || t).join(' · ')}
                          </p>
                        )}
                      </div>

                      {m.reservationId && (
                        <div className="mt-1.5 px-3 py-2 rounded-sm bg-[#173C30]/40 border border-[#C9A45C]/30 text-xs text-[#E6DFD1]">
                          Pending Reference: <span className="font-mono text-[#DFC082]">{m.reservationId}</span> · Confirmed only once staff respond.
                        </div>
                      )}

                      {m.whatsappUrl && (
                        <a
                          href={m.whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#173C30] border border-[#C9A45C]/40 text-xs font-medium text-[#F8F4EC] hover:bg-[#1E4D3E]"
                        >
                          <span>Continue on WhatsApp</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#DFC082]" />
                        </a>
                      )}
                    </div>
                  ))}

                  {sending && (
                    <div className="flex items-center gap-2 text-xs text-[#DFC082] px-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{aiPublicConfig.receptionistName} is checking restaurant details…</span>
                    </div>
                  )}

                  {chatError && (
                    <div className="p-3 rounded-sm bg-red-950/40 border border-red-700/50 text-xs text-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                      <span>{chatError}</span>
                    </div>
                  )}

                  {/* Quick Suggested Prompts shown initially */}
                  {messages.length <= 2 && !sending && (
                    <div className="pt-2 space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[#9A9282]">
                        Suggested Questions
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {SUGGESTED_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => sendMessageText(q)}
                            className="text-left px-3 py-2 rounded-sm bg-[#181818] border border-[#F8F4EC]/10 hover:border-[#C9A45C]/50 text-xs text-[#D8D0C0] transition-colors"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={scrollBottomRef} />
                </div>

                {/* Chat Input with Web Speech Voice-to-Text Dictation */}
                <div className="border-t border-[#F8F4EC]/10 bg-[#161616] shrink-0">
                  {(speechListening || speechInterim) && (
                    <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between gap-2 text-xs text-[#6EE7B7]">
                      <span className="truncate">
                        {speechInterim ? `Hearing: "${speechInterim}"` : 'Listening for your voice… speak now'}
                      </span>
                      <button
                        type="button"
                        onClick={() => stopSpeechDictation(false)}
                        className="text-[11px] uppercase tracking-wider text-[#DFC082] hover:underline shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  )}
                  {speechError && (
                    <div className="px-3.5 pt-2 text-[11px] text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                      <span>{speechError}</span>
                    </div>
                  )}
                  <form onSubmit={handleChatSubmit} className="p-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startSpeechDictation}
                      disabled={sending}
                      aria-label={speechListening ? 'Stop voice dictation' : 'Dictate message with microphone'}
                      aria-pressed={speechListening}
                      title={
                        !speechSupported
                          ? 'Voice dictation unavailable in this browser'
                          : micPermissionState === 'denied'
                          ? 'Microphone permission blocked in browser settings'
                          : speechListening
                          ? 'Stop voice dictation'
                          : 'Speak to type your message'
                      }
                      className={`w-11 h-11 rounded-sm border inline-flex items-center justify-center transition-colors shrink-0 ${
                        speechListening
                          ? 'bg-[#173C30] border-[#34D399] text-[#6EE7B7]'
                          : micPermissionState === 'denied'
                          ? 'bg-[#1A1414] border-red-700/50 text-red-300 hover:border-red-500'
                          : 'bg-[#101010] border-[#F8F4EC]/20 text-[#DFC082] hover:border-[#C9A45C] hover:text-[#F8F4EC]'
                      } disabled:opacity-50`}
                    >
                      {speechListening ? (
                        <Square className="w-4 h-4 fill-current" />
                      ) : micPermissionState === 'denied' ? (
                        <MicOff className="w-4 h-4" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        speechListening
                          ? 'Listening… spoken words appear here'
                          : 'Ask about dishes, tables, hours, or bookings...'
                      }
                      aria-label="Message AI Concierge"
                      className="flex-1 px-3.5 py-2.5 rounded-sm bg-[#101010] border border-[#F8F4EC]/15 text-sm text-[#F8F4EC] placeholder:text-[#8E8677] focus:border-[#C9A45C] focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      aria-label="Send message"
                      className="w-11 h-11 rounded-sm bg-[#C9A45C] text-[#101010] inline-flex items-center justify-center hover:bg-[#DFC082] disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Human Staff Support Footer */}
            <div className="px-4 py-2.5 bg-[#151515] border-t border-[#F8F4EC]/10 shrink-0 space-y-2">
              {handoffState.doneId ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#E6DFD1]">
                  <span>
                    Staff notified (<span className="font-mono text-[#DFC082]">{handoffState.doneId}</span>)
                  </span>
                  <div className="flex items-center gap-2">
                    {handoffState.whatsappUrl && (
                      <a
                        href={handoffState.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-sm bg-[#173C30] border border-[#C9A45C]/40 text-[#F8F4EC]"
                      >
                        Open WhatsApp
                      </a>
                    )}
                    <a
                      href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                      className="px-2.5 py-1 rounded-sm border border-[#C9A45C]/40 text-[#DFC082]"
                    >
                      Call {settings.phone}
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={handoffState.loading}
                    onClick={handleRequestHumanStaff}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DFC082] hover:underline"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>
                      {handoffState.loading ? 'Notifying host team...' : 'Speak with Human Staff'}
                    </span>
                  </button>
                  <a
                    href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1 text-xs text-[#C8BFA8] hover:text-[#F8F4EC] tabular-nums"
                  >
                    <Phone className="w-3 h-3 text-[#C9A45C]" />
                    <span>{settings.phone}</span>
                  </a>
                </div>
              )}
              {handoffState.error && (
                <p className="text-[11px] text-red-400">{handoffState.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
