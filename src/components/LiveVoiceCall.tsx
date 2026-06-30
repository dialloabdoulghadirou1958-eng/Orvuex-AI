import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Radio, AlertCircle, Sparkles, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveVoiceCallProps {
  geminiApiKey: string;
  onClose: () => void;
  onSaveMessage?: (text: string, isUser: boolean) => void;
}

type CallStatus = 'connecting' | 'ready' | 'speaking' | 'listening' | 'error';
type VoiceName = 'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

const VOICES: { id: VoiceName; label: string; gender: string; description: string }[] = [
  { id: 'Aoede', label: 'Aoede', gender: 'Féminin', description: 'Voix claire, posée et professionnelle' },
  { id: 'Puck', label: 'Puck', gender: 'Masculin', description: 'Chaleureux, amical et dynamique' },
  { id: 'Charon', label: 'Charon', gender: 'Masculin', description: 'Grave, sérieux et apaisant' },
  { id: 'Kore', label: 'Kore', gender: 'Féminin', description: 'Douce, amicale et spontanée' },
  { id: 'Fenrir', label: 'Fenrir', gender: 'Masculin', description: 'Moderne, direct et énergique' },
];

// Sequential PCM player queue with interruption support to avoid audio gaps or overlap clicks
class PCMPlayer {
  private sampleRate: number;
  private audioCtx: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor(sampleRate = 24000, existingCtx?: AudioContext) {
    this.sampleRate = sampleRate;
    if (existingCtx) {
      this.audioCtx = existingCtx;
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: this.sampleRate });
      this.nextPlayTime = this.audioCtx.currentTime;
    }
  }

  playChunk(base64Data: string, onAmplitude?: (amp: number) => void) {
    try {
      if (!this.audioCtx) this.init();
      if (this.audioCtx!.state === 'suspended') {
        this.audioCtx!.resume();
      }

      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);

      let sum = 0;
      for (let i = 0; i < int16.length; i++) {
        const val = int16[i] / 32768.0;
        float32[i] = val;
        sum += val * val;
      }

      // Calculate Root Mean Square (RMS) for precise real-time AI mouth amplitude
      const rms = Math.sqrt(sum / (int16.length || 1));
      if (onAmplitude) {
        onAmplitude(rms);
      }

      const audioBuffer = this.audioCtx!.createBuffer(1, float32.length, this.sampleRate);
      audioBuffer.copyToChannel(float32, 0);

      const source = this.audioCtx!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioCtx!.destination);

      const now = this.audioCtx!.currentTime;
      const playTime = Math.max(now, this.nextPlayTime);
      source.start(playTime);

      this.activeSources.push(source);
      source.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== source);
      };

      const chunkDuration = audioBuffer.duration;
      this.nextPlayTime = playTime + chunkDuration;
    } catch (err) {
      console.error("Error playing back audio chunk:", err);
    }
  }

  stop() {
    this.activeSources.forEach(s => {
      try {
        s.stop();
      } catch (e) {}
    });
    this.activeSources = [];
    this.nextPlayTime = 0;
  }

  close() {
    this.stop();
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export function LiveVoiceCall({ geminiApiKey, onClose, onSaveMessage }: LiveVoiceCallProps) {
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceName>('Aoede');
  const [userAmplitude, setUserAmplitude] = useState(0);
  const [aiAmplitude, setAiAmplitude] = useState(0);
  const [transcript, setTranscript] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pcmPlayerRef = useRef<PCMPlayer | null>(null);
  const audioContextInputRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const textEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the transcripts container
  useEffect(() => {
    textEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, status]);

  // Connect to Gemini Live API WebSocket and set up mic/audio
  useEffect(() => {
    let active = true;

    // Create the AudioContexts synchronously right here, inside the user gesture call stack
    const inputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const outputAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    // Explicitly resume them immediately
    if (inputAudioCtx.state === 'suspended') inputAudioCtx.resume().catch(console.error);
    if (outputAudioCtx.state === 'suspended') outputAudioCtx.resume().catch(console.error);

    audioContextInputRef.current = inputAudioCtx;

    async function startSession() {
      try {
        // Initialize PCM Player at 24kHz for model audio output using pre-created context
        const pcmPlayer = new PCMPlayer(24000, outputAudioCtx);
        pcmPlayerRef.current = pcmPlayer;

        // Establish connection to Multimodal Live API
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${geminiApiKey}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!active) return;
          
          // 1. Send setup parameters to initiate the multimodal session with specified voice configuration
          const setupMsg = {
            setup: {
              model: "gemini-2.0-flash-exp",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: selectedVoice
                    }
                  }
                }
              }
            }
          };
          ws.send(JSON.stringify(setupMsg));
        };

        ws.onmessage = async (event) => {
          if (!active) return;
          try {
            const data = JSON.parse(event.data);
            console.log("WebSocket message received:", data); // Add this log
            
            if (data.setupComplete) {
              setStatus('ready');
              
              // 2. Setup completed, request mic access and begin recording (passing pre-created context)
              await initMicrophone(ws, inputAudioCtx);
            }

            if (data.serverContent) {
              const { modelTurn, interrupted, turnComplete, inputTranscription } = data.serverContent;

              // Dynamically update the user's real-time transcript when speech transcription completes
              if (inputTranscription && inputTranscription.text) {
                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'user') {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'user', text: inputTranscription.text };
                    return updated;
                  } else {
                    return [...prev, { role: 'user', text: inputTranscription.text }];
                  }
                });
              }

              if (interrupted) {
                // If user speaks while the model is outputting, immediately stop playback (barge-in)
                pcmPlayer.stop();
                setAiAmplitude(0);
                setStatus('listening');
                
                setTranscript(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'assistant' && !last.text.endsWith(' [interrompu]')) {
                    const updated = [...prev];
                    updated[updated.length - 1] = { ...last, text: last.text + ' [interrompu]' };
                    return updated;
                  }
                  return prev;
                });
              }

              if (modelTurn && modelTurn.parts) {
                setStatus('speaking');
                modelTurn.parts.forEach((part: any) => {
                  // Text transcription portion of the model's audio response
                  if (part.text) {
                    setTranscript(prev => {
                      const last = prev[prev.length - 1];
                      if (last && last.role === 'assistant') {
                        const updated = [...prev];
                        // If it is interrupted, start a new one, else append
                        if (last.text.endsWith(' [interrompu]')) {
                          return [...prev, { role: 'assistant', text: part.text }];
                        }
                        updated[updated.length - 1] = { role: 'assistant', text: last.text + part.text };
                        return updated;
                      } else {
                        return [...prev, { role: 'assistant', text: part.text }];
                      }
                    });
                  }

                  // Audio PCM data chunk (24kHz, Int16 PCM)
                  if (part.inlineData && part.inlineData.data) {
                    pcmPlayer.playChunk(part.inlineData.data, (amplitude) => {
                      if (active) setAiAmplitude(amplitude);
                    });
                  }
                });
              }

              if (turnComplete) {
                setStatus('listening');
                setAiAmplitude(0);
              }
            }
          } catch (e) {
            console.error("Error parsing WebSocket message:", e);
          }
        };

        ws.onerror = (err) => {
          if (!active) return;
          console.error("WebSocket error:", err);
          setErrorMsg("Une erreur de connexion au serveur Gemini Live est survenue.");
          setStatus('error');
        };

        ws.onclose = (event) => {
          if (!active) return;
          console.log("WebSocket closed:", event);
          if (status !== 'error') {
            setErrorMsg("La connexion au service vocal a été interrompue.");
            setStatus('error');
          }
        };

      } catch (err: any) {
        console.error("Failed to start voice call", err);
        setErrorMsg(err.message || "Impossible d'accéder au microphone ou de se connecter.");
        setStatus('error');
      }
    }

    startSession();

    return () => {
      active = false;
      cleanup();
    };
  }, [geminiApiKey, selectedVoice]);

  // Clean up resources on unmount or manual disconnection
  const cleanup = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    if (pcmPlayerRef.current) {
      try { pcmPlayerRef.current.close(); } catch (e) {}
      pcmPlayerRef.current = null;
    }
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (audioContextInputRef.current) {
      try { audioContextInputRef.current.close(); } catch (e) {}
      audioContextInputRef.current = null;
    }
    if (mediaStreamRef.current) {
      try { mediaStreamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
      mediaStreamRef.current = null;
    }
  };

  // Setup input microphone and pipe Int16 PCM chunks into the WebSocket
  const initMicrophone = async (ws: WebSocket, existingCtx: AudioContext) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = existingCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        try {
          if (ws.readyState !== WebSocket.OPEN) return;

          const inputData = e.inputBuffer.getChannelData(0);
          
          // Calculate microphone amplitude for visualizer animations
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / (inputData.length || 1));
          setUserAmplitude(rms);

          // If muted, skip sending data to the server
          if (isMuted) return;

          // Downsample/Convert Float32 samples to 16kHz Int16 PCM array
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Convert Int16 buffer to Base64
          const buffer = pcmData.buffer;
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);

          // Send PCM chunk
          ws.send(JSON.stringify({
            realtimeInput: {
              audio: {
                mimeType: "audio/pcm;rate=16000",
                data: base64
              }
            }
          }));
        } catch (err) {
          console.error("Audio process error:", err);
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch (err) {
      console.error("Microphone initialization error:", err);
      setErrorMsg("Veuillez autoriser l'accès à votre microphone pour démarrer l'appel.");
      setStatus('error');
    }
  };

  // Handle mute toggles
  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    if (!isMuted) {
      setUserAmplitude(0);
    }
  };

  // Dynamic visualizer animations based on active amplitudes
  const currentAmp = status === 'speaking' ? aiAmplitude : userAmplitude;
  const pulseScale = 1 + Math.min(0.5, currentAmp * 3);
  const glowShadow = status === 'speaking' 
    ? `0 0 ${30 + currentAmp * 150}px rgba(99, 102, 241, ${0.4 + currentAmp * 0.6})`
    : `0 0 ${30 + currentAmp * 150}px rgba(168, 85, 247, ${0.4 + currentAmp * 0.6})`;

  return (
    <div className="absolute inset-0 bg-zinc-950/98 backdrop-blur-3xl z-50 flex flex-col justify-between items-center p-4 md:p-8 overflow-hidden font-sans select-none text-zinc-100">
      
      {/* Header Info */}
      <div className="w-full max-w-3xl flex justify-between items-center shrink-0 mt-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-sm font-semibold tracking-wider uppercase text-zinc-400">orvuex live voice</span>
        </div>
        
        {/* Connection status badge */}
        <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
          status === 'connecting' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
          status === 'ready' || status === 'listening' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          status === 'speaking' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
          'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          <Radio className={`w-3.5 h-3.5 ${status === 'speaking' ? 'animate-pulse' : ''}`} />
          {status === 'connecting' && 'Connexion...'}
          {status === 'ready' && 'Prêt'}
          {status === 'listening' && (isMuted ? 'Micro coupé' : 'À l\'écoute')}
          {status === 'speaking' && 'Gemini répond...'}
          {status === 'error' && 'Erreur'}
        </div>
      </div>

      {/* Center Dynamic Pulsing Orb */}
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-2xl relative">
        <AnimatePresence mode="wait">
          {status === 'error' ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center max-w-md px-6 py-8 bg-zinc-900/40 border border-zinc-800 rounded-3xl backdrop-blur-xl"
            >
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Impossible de continuer</h3>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">{errorMsg}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-sm transition-all"
              >
                Fermer l'appel
              </button>
            </motion.div>
          ) : (
            <div key="orb" className="flex flex-col items-center justify-center w-full">
              
              {/* Orb Visualization container */}
              <div className="relative w-72 h-72 flex items-center justify-center">
                
                {/* Outermost rotating wave halo */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                  className="absolute inset-0 rounded-full border border-dashed border-zinc-800/60"
                  style={{ transform: `scale(${pulseScale * 1.05})` }}
                />

                {/* Medium glowing background pulse */}
                <div 
                  className="absolute w-52 h-52 rounded-full bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-xl transition-all duration-100"
                  style={{ transform: `scale(${pulseScale})` }}
                />

                {/* Core animated interactive orb */}
                <motion.div
                  style={{
                    scale: pulseScale,
                    boxShadow: glowShadow,
                  }}
                  className={`w-40 h-40 rounded-full bg-gradient-to-br transition-all duration-75 flex items-center justify-center border ${
                    status === 'speaking'
                      ? 'from-indigo-500 via-indigo-600 to-indigo-700 border-indigo-400/30'
                      : isMuted 
                      ? 'from-zinc-700 via-zinc-800 to-zinc-900 border-zinc-600/20'
                      : 'from-purple-500 via-purple-600 to-purple-700 border-purple-400/30'
                  }`}
                >
                  {/* Subtle micro-gradient sphere core */}
                  <div className="w-[96%] h-[96%] rounded-full bg-zinc-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
                    {status === 'connecting' ? (
                      <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
                    ) : status === 'speaking' ? (
                      <Volume2 className="w-8 h-8 text-indigo-400 animate-bounce" />
                    ) : isMuted ? (
                      <MicOff className="w-8 h-8 text-zinc-500" />
                    ) : (
                      <Mic className="w-8 h-8 text-purple-400 animate-pulse" />
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Running Transcript Display Area */}
              <div className="w-full mt-10 h-32 overflow-y-auto px-4 md:px-8 border-t border-zinc-900/30 pt-4 flex flex-col space-y-3 scrollbar-none">
                {transcript.length === 0 ? (
                  <div className="text-zinc-500 text-sm text-center italic mt-4">
                    {status === 'connecting' ? 'Initialisation...' : 'Dites quelque chose, je vous écoute...'}
                  </div>
                ) : (
                  transcript.slice(-3).map((line, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex flex-col ${line.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <span className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${line.role === 'user' ? 'text-purple-400' : 'text-indigo-400'}`}>
                        {line.role === 'user' ? 'Vous' : 'Gemini'}
                      </span>
                      <p className={`text-sm md:text-base leading-relaxed ${line.role === 'user' ? 'text-zinc-300 text-right font-medium' : 'text-zinc-100 font-semibold'}`}>
                        {line.text}
                      </p>
                    </motion.div>
                  ))
                )}
                <div ref={textEndRef} />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Voice Selection & Controls */}
      <div className="w-full max-w-xl flex flex-col gap-6 items-center shrink-0 mb-4 z-10">
        
        {/* Voice Selector Row */}
        {status !== 'error' && (
          <div className="w-full bg-zinc-900/40 border border-zinc-900 p-3.5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personnalité de la voix</span>
            </div>
            
            <div className="flex gap-2 justify-between overflow-x-auto pb-1 scrollbar-hide">
              {VOICES.map((voice) => {
                const isSelected = selectedVoice === voice.id;
                return (
                  <button
                    key={voice.id}
                    onClick={() => {
                      if (status !== 'connecting') {
                        setSelectedVoice(voice.id);
                        // Stop current playback so changes apply instantly
                        if (pcmPlayerRef.current) {
                          pcmPlayerRef.current.stop();
                        }
                      }
                    }}
                    className={`flex-1 min-w-[76px] py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center flex flex-col items-center justify-center gap-0.5 ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                        : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>{voice.label}</span>
                    <span className="text-[9px] opacity-60 font-normal">{voice.gender}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex items-center justify-center gap-6">
          
          {/* Mute Button */}
          {status !== 'error' && (
            <button
              onClick={handleToggleMute}
              className={`p-4 rounded-full border transition-all cursor-pointer shadow-lg ${
                isMuted 
                  ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 scale-100' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 scale-100 hover:scale-105'
              }`}
              title={isMuted ? "Activer le micro" : "Couper le micro"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={() => {
              // Optionally save the final transcription back into the main chat window before exiting
              if (transcript.length > 0 && onSaveMessage) {
                // Compile transcript summary or add lines
                const compiledTranscript = transcript
                  .map(t => `${t.role === 'user' ? 'Utilisateur' : 'Gemini (Live Voice)'}: ${t.text}`)
                  .join('\n\n');
                
                onSaveMessage(
                  `📞 **Rapport d'appel vocal Live**\n\n${compiledTranscript}`, 
                  false
                );
              }
              onClose();
            }}
            className="p-4 bg-red-600 hover:bg-red-500 text-white rounded-full transition-all cursor-pointer scale-100 hover:scale-110 shadow-lg shadow-red-950/20 flex items-center justify-center"
            title="Terminer l'appel"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
