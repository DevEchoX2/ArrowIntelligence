
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { geminiService } from './backend';

// --- Icons ---
const Icons = {
  Plus: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>,
  Sidebar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>,
  Send: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  Logo: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  Phone: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Video: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Mic: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>,
  MicOff: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  Globe: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Eye: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

// --- Raw Audio Utils ---
function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

// --- Component: Syntax Highlighted Code ---
const EnhancedCodeBlock = ({ children }: { children: string }) => {
  const code = children.trim();
  const lines = code.split('\n');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Improved Robust Syntax Highlighting
  const highlightedCode = useMemo(() => {
    return code
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/(\/\/.*)/g, '<span class="token-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token-string">$1</span>')
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|await|async|try|catch|new|this|throw|break|continue|case|switch|default|delete|in|of|void|yield|do)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/\b(string|number|boolean|any|void|null|undefined|Array|Promise|Record|Partial|Omit|Pick|unknown|never|object|symbol)\b/g, '<span class="token-type">$1</span>')
      .replace(/\b(true|false)\b/g, '<span class="token-boolean">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')
      .replace(/\b([a-zA-Z_]\w*)(?=\s*\()/g, '<span class="token-function">$1</span>')
      .replace(/(\+\+|--|===|!==|==|!=|>=|<=|=>|&&|\|\||[+\-*/%&|^!~=<>])/g, '<span class="token-operator">$1</span>')
      .replace(/([\[\]{}()])/g, '<span class="token-bracket">$1</span>');
  }, [code]);

  return (
    <div className="relative group/code">
      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover/code:opacity-100 transition-all duration-300">
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-1.5 glass-effect text-[10px] font-bold rounded-lg border border-white/10 hover:border-[var(--primary)] transition-all"
        >
          {copied ? <Icons.Check /> : <Icons.Copy />}
          {copied ? "Synced" : "Copy Code"}
        </button>
      </div>
      <div className="code-container">
        <div className="line-numbers">
          {lines.map((_, i) => (
            <span key={i} className="line-number" />
          ))}
        </div>
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </div>
    </div>
  );
};

const App = () => {
  const [sessions, setSessions] = useState<any[]>(() => JSON.parse(localStorage.getItem('arrow_sessions_minimal') || '[]'));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [callMode, setCallMode] = useState<'none' | 'voice' | 'video'>('none');
  const [botPfp, setBotPfp] = useState<string>(localStorage.getItem('arrow_bot_pfp_minimal') || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0NGZwaHpsN3ZidGxyMmZzdnB6bnB6bnB6bnB6bnB6bnB6bnB6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lTfuxV5K15y7du/giphy.gif');
  const [pfpType, setPfpType] = useState<'image' | 'video'>(localStorage.getItem('arrow_bot_pfp_type_minimal') as any || 'image');
  const [isMicActive, setIsMicActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // States for search, preview, settings
  const [searchTerm, setSearchTerm] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    voiceName: localStorage.getItem('arrow_voice_name') || 'Puck',
    speakingRate: parseFloat(localStorage.getItem('arrow_speaking_rate') || '1.0'),
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionPromiseRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem('arrow_sessions_minimal', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions]);

  // --- Filtered Sessions Search ---
  const filteredSessions = useMemo(() => {
    if (!searchTerm) return sessions;
    const term = searchTerm.toLowerCase();
    return sessions.filter(s => 
      s.title?.toLowerCase().includes(term) || 
      s.messages.some((m: any) => m.content.toLowerCase().includes(term))
    );
  }, [sessions, searchTerm]);

  // --- Live API Session Management ---
  const startLiveSession = async (mode: 'voice' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
      videoStreamRef.current = stream;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputContext = new AudioContext({ sampleRate: 16000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputContext.createMediaStreamSource(stream);
            const scriptProcessor = inputContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputContext.destination);
            setIsMicActive(true);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextRef.current) {
              setIsAiSpeaking(true);
              const buffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(audioContextRef.current.destination);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsAiSpeaking(false);
              };
            }
            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              setIsAiSpeaking(false);
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Signal Error:', e),
          onclose: () => {
            setCallMode('none');
            setIsMicActive(false);
            setIsAiSpeaking(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { 
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceSettings.voiceName as any } } 
          },
          systemInstruction: `You are ArrowIntelligence. You are on a live call. Be brief, professional, and focus on logical accuracy.`
        }
      });
      sessionPromiseRef.current = sessionPromise;
      setCallMode(mode);
    } catch (err) {
      console.error(err);
      alert("Neural Feed offline. Verify permissions.");
    }
  };

  const endCall = () => {
    sessionPromiseRef.current?.then((s: any) => s.close());
    videoStreamRef.current?.getTracks().forEach(t => t.stop());
    setCallMode('none');
    setIsMicActive(false);
    setIsAiSpeaking(false);
    nextStartTimeRef.current = 0;
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = { role: 'user', content: input, id: Date.now() };
    const aiMsg = { role: 'assistant', content: '', id: Date.now() + 1, isTyping: true, sources: [] };
    
    let sid = activeId;
    if (!sid) {
      sid = Date.now().toString();
      const newSess = { id: sid, title: input.slice(0, 32), messages: [userMsg, aiMsg], timestamp: Date.now() };
      setSessions([newSess, ...sessions]);
      setActiveId(sid);
    } else {
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: [...s.messages, userMsg, aiMsg] } : s));
    }

    setInput('');
    setIsTyping(true);
    setIsPreviewOpen(false);

    try {
      const history = (sessions.find(s => s.id === sid)?.messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      const stream = geminiService.streamChat('gemini-3-flash-preview', userMsg.content, history, [{ googleSearch: {} }]);
      let full = '';
      let currentSources: any[] = [];

      for await (const chunk of stream) {
        const text = (chunk as any).text || '';
        full += text;
        
        const chunks = (chunk as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
           const newSources = chunks.filter((c: any) => c.web).map((c: any) => c.web);
           currentSources = [...new Set([...currentSources, ...newSources])];
        }

        setSessions(prev => prev.map(s => s.id === sid ? {
          ...s,
          messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: full, sources: currentSources } : m)
        } : s));
      }
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, isTyping: false } : m) } : s));
    } catch (e) {
      console.error(e);
      setSessions(prev => prev.map(s => s.id === sid ? { ...s, messages: s.messages.map(m => m.id === aiMsg.id ? { ...m, content: "Neural logic failed. Connection severed.", isTyping: false } : m) } : s));
    } finally {
      setIsTyping(false);
    }
  };

  const handlePfpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setBotPfp(url);
      setPfpType(type);
      localStorage.setItem('arrow_bot_pfp_minimal', url);
      localStorage.setItem('arrow_bot_pfp_type_minimal', type);
    }
  };

  const updateVoiceSetting = (key: string, val: any) => {
    const newSettings = { ...voiceSettings, [key]: val };
    setVoiceSettings(newSettings);
    localStorage.setItem(`arrow_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`, val.toString());
  };

  const activeSession = sessions.find(s => s.id === activeId);

  return (
    <div className="flex h-screen w-full bg-[var(--bg-dark)] text-[var(--text-main)] overflow-hidden selection:bg-[var(--primary)] selection:text-white">
      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass-effect w-full max-w-sm rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h3 className="text-xl font-black tracking-tight">Audio Parameters</h3>
                <span className="text-[10px] text-[var(--primary)] font-bold tracking-[0.2em] uppercase mt-0.5">Core Voice Processor</span>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-all group">
                <Icons.X />
              </button>
            </div>
            
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] block mb-4">Neural Persona (Gender/Style)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: 'Puck', label: 'Masculine', desc: 'Authoritative' },
                    { name: 'Kore', label: 'Feminine', desc: 'Professional' },
                    { name: 'Zephyr', label: 'Fluid', desc: 'Neutral' },
                    { name: 'Charon', label: 'Basitone', desc: 'Resonant' }
                  ].map(v => (
                    <button 
                      key={v.name}
                      onClick={() => updateVoiceSetting('voiceName', v.name)}
                      className={`p-4 rounded-2xl border transition-all text-left group ${voiceSettings.voiceName === v.name ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-white shadow-[0_0_20px_rgba(16,163,127,0.1)]' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'}`}
                    >
                      <div className={`text-xs font-black ${voiceSettings.voiceName === v.name ? 'text-[var(--primary)]' : 'text-white'}`}>{v.label}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-1 font-bold group-hover:text-white/60">{v.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                   <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Speaking Velocity</label>
                   <span className="text-[10px] font-black text-[var(--primary)]">{voiceSettings.speakingRate.toFixed(1)}x</span>
                </div>
                <div className="relative flex items-center h-6">
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.0" 
                    step="0.1" 
                    value={voiceSettings.speakingRate}
                    onChange={(e) => updateVoiceSetting('speakingRate', parseFloat(e.target.value))}
                    className="w-full accent-[var(--primary)] h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowSettingsModal(false)}
              className="w-full mt-10 py-4 rounded-2xl bg-[var(--primary)] text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-[var(--primary)]/20 active:scale-95 transition-all"
            >
              Initialize Changes
            </button>
          </div>
        </div>
      )}

      {/* Call UI */}
      {callMode !== 'none' && (
        <div className="fixed inset-0 z-50 glass-effect flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="absolute top-10 left-10 flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--primary)]/20"><Icons.Logo /></div>
            <div className="flex flex-col">
              <span className="font-black text-sm uppercase tracking-widest">Neural Stream</span>
              <span className="text-[10px] text-[var(--primary)] font-bold tracking-[0.2em] uppercase">E2EE Linked</span>
            </div>
          </div>
          
          <div className="relative group">
            <div className="avatar-ring">
              <div className="avatar-inner">
                {pfpType === 'video' ? (
                  <video src={botPfp} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={botPfp} className="w-full h-full object-cover" alt="AI Avatar" />
                )}
              </div>
            </div>
            {isAiSpeaking && <div className="absolute -inset-8 border-2 border-[var(--primary)] rounded-full animate-ping opacity-10" />}
            {isAiSpeaking && <div className="absolute -inset-4 border border-[var(--primary)] rounded-full animate-pulse opacity-30" />}
            
            <label className="absolute inset-0 z-10 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-md">
              <Icons.Plus />
              <span className="text-[10px] font-black uppercase tracking-widest mt-2">Update Visual</span>
              <input type="file" className="hidden" accept="image/*,video/*,.gif" onChange={handlePfpChange} />
            </label>
          </div>

          <div className="mt-12 text-center">
            <h2 className="text-2xl font-black tracking-tight">ArrowIntelligence</h2>
            <div className="flex items-center justify-center gap-3 mt-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isAiSpeaking ? 'bg-[var(--primary)] shadow-[0_0_10px_var(--primary)] animate-pulse' : 'bg-white/10'}`} />
              <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">{isAiSpeaking ? 'Neural Signal Transmitting' : 'Waiting for Audio Input'}</p>
            </div>
          </div>

          <div className="mt-16 flex gap-6 items-center">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:border-white/30 active:scale-95 group"
            >
              <Icons.Settings />
            </button>
            <button onClick={() => setIsMicActive(!isMicActive)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMicActive ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]'}`}>
              {isMicActive ? <Icons.Mic /> : <Icons.MicOff />}
            </button>
            <button onClick={endCall} className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-600/30 hover:scale-110 active:scale-95 transition-all">
              <Icons.X />
            </button>
          </div>
          
          {callMode === 'video' && (
            <div className="absolute bottom-10 right-10 w-52 h-32 rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black">
              <video autoPlay muted ref={el => { if (el) el.srcObject = videoStreamRef.current; }} className="w-full h-full object-cover grayscale scale-x-[-1]" />
              <div className="absolute top-2 left-2 px-2 py-0.5 glass-effect rounded text-[8px] font-black uppercase">Local Input</div>
            </div>
          )}
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar-transition ${sidebarOpen ? 'w-64' : 'w-0'} bg-[var(--bg-card)] border-r border-[var(--border)] flex flex-col overflow-hidden`}>
        <div className="p-6 flex flex-col gap-5 flex-shrink-0">
          <div className="flex gap-2">
            <button onClick={() => { setActiveId(null); setInput(''); }} className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:opacity-90 active:scale-95 transition-all py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-white shadow-xl shadow-[var(--primary)]/10">
              <Icons.Plus /> New Thread
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-3 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"><Icons.Sidebar /></button>
          </div>
          
          <div className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[var(--primary)] transition-colors">
              <Icons.Search />
            </div>
            <input 
              type="text" 
              placeholder="Search cognition logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input w-full pl-10 pr-4 py-2.5 text-xs outline-none font-medium"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 scrollbar-hide py-2 space-y-1">
          <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] px-5 py-3 opacity-60">Neural Timeline</div>
          {filteredSessions.length > 0 ? (
            filteredSessions.map((s: any) => (
              <button 
                key={s.id} 
                onClick={() => setActiveId(s.id)} 
                className={`w-full p-3.5 rounded-xl mb-1 cursor-pointer transition-all flex items-center gap-3 border text-left group ${activeId === s.id ? 'bg-white/[0.04] border-white/10 shadow-inner' : 'hover:bg-white/[0.02] border-transparent'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeId === s.id ? 'bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]' : 'bg-white/10 group-hover:bg-white/30'}`} />
                <span className={`flex-1 truncate text-xs font-bold tracking-tight ${activeId === s.id ? 'text-white' : 'text-white/40 group-hover:text-white/70'}`}>{s.title || "Empty Fragment"}</span>
              </button>
            ))
          ) : (
            <div className="px-6 py-12 text-center opacity-20 flex flex-col items-center gap-3">
              <Icons.Search />
              <p className="text-[9px] uppercase font-black tracking-widest">No matching logs</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5"><Icons.Logo /></div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Prime v3.4</p>
              <p className="text-[9px] text-[var(--text-muted)] truncate font-bold">Encrypted Active</p>
            </div>
          </div>
          <button 
             onClick={() => setShowSettingsModal(true)}
             className="p-2 text-white/20 hover:text-white transition-colors"
          >
            <Icons.Settings />
          </button>
        </div>
      </aside>

      {/* Main Chat Space */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 flex items-center justify-between px-8 border-b border-[var(--border)] bg-[var(--bg-dark)]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"><Icons.Sidebar /></button>}
            <div className="flex items-center gap-3 font-black text-xs uppercase tracking-[0.3em] text-[var(--text-muted)] cursor-default select-none">
              <span className="text-[var(--primary)] drop-shadow-[0_0_10px_var(--primary-glow)]"><Icons.Logo /></span>
              ArrowIntelligence
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-1 rounded-xl mr-2">
               <button onClick={() => startLiveSession('voice')} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-all" title="Audio Stream"><Icons.Phone /></button>
               <button onClick={() => startLiveSession('video')} className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-all" title="Video Stream"><Icons.Video /></button>
            </div>
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 text-[var(--text-muted)] hover:text-white rounded-xl hover:bg-white/5 transition-all"
            >
              <Icons.Settings />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 scrollbar-hide bg-gradient-to-b from-[var(--bg-dark)] to-black">
          <div className="max-w-3xl mx-auto py-16 space-y-12">
            {(!activeSession || activeSession.messages.length === 0) ? (
              <div className="flex flex-col items-center justify-center pt-24 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--primary)] to-[#0c8a6a] text-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl shadow-[var(--primary)]/20 rotate-12"><Icons.Logo /></div>
                <h1 className="text-3xl font-black mb-3 tracking-tighter">Neural Command Initialized</h1>
                <p className="text-[var(--text-muted)] text-sm max-w-sm leading-relaxed font-medium">ArrowIntelligence is ready. Engage in high-level reasoning, code synthesis, or real-time voice interaction.</p>
                <div className="flex gap-3 mt-10">
                  <button onClick={() => startLiveSession('voice')} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Start Voice Stream</button>
                  <button onClick={() => setInput("Implement a high-performance search algorithm in Rust.")} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Coding Challenge</button>
                </div>
              </div>
            ) : (
              activeSession.messages.map((m: any) => (
                <div key={m.id} className={`flex gap-6 ${m.role === 'user' ? 'justify-end' : ''} animate-in slide-in-from-bottom-2 fade-in duration-500`}>
                  {m.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-1 border border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5"><Icons.Logo /></div>
                  )}
                  <div className={`relative ${m.role === 'user' ? 'message-user' : 'message-ai flex-1'}`}>
                    <div className="prose prose-invert prose-emerald max-w-none text-sm leading-relaxed">
                      <ReactMarkdown 
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            return !inline ? (
                              <EnhancedCodeBlock>{String(children)}</EnhancedCodeBlock>
                            ) : (
                              <code className="bg-white/10 px-1.5 py-0.5 rounded-md text-[var(--primary)] font-black text-[0.85rem]" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/5">
                          {m.sources.map((s: any, i: number) => (
                            <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-xl text-[10px] font-bold hover:bg-white/[0.08] transition-all border border-white/5 text-[var(--text-muted)] hover:text-white hover:border-white/10">
                              <Icons.Globe /> {s.title || "Signal Found"}
                            </a>
                          ))}
                        </div>
                      )}
                      {m.isTyping && !m.content && (
                        <div className="flex gap-1.5 mt-3">
                          <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={scrollRef} className="h-8" />
          </div>
        </div>

        {/* Markdown Preview Overlay - Side-by-Side Polish */}
        {isPreviewOpen && input.trim() && (
          <div className="absolute bottom-[110px] left-1/2 -translate-x-1/2 w-full max-w-4xl px-8 z-20 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="glass-effect rounded-[2rem] p-8 border border-[var(--primary)]/30 shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-y-auto max-h-[45vh] bg-[#0d0d0f]/90">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse shadow-[0_0_8px_var(--primary)]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Neural Visualization Engine</span>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} className="text-white/20 hover:text-white transition-all"><Icons.X /></button>
              </div>
              <div className="prose prose-invert prose-emerald text-sm">
                <ReactMarkdown>{input}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Input Dock */}
        <div className="p-8 pt-2">
          <div className="max-w-3xl mx-auto">
            <div className="input-dock flex items-end px-4 py-3 gap-1">
              <div className="flex flex-col gap-1 mb-1.5">
                 <button 
                  onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                  className={`p-3 rounded-xl transition-all group relative ${isPreviewOpen ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-white/20 hover:text-white/60 hover:bg-white/5'}`}
                >
                  <Icons.Eye />
                  <span className="tooltip">{isPreviewOpen ? "Close Preview" : "Neural Preview"}</span>
                </button>
              </div>
              <textarea 
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 220) + 'px'; }}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Initialize signal input..."
                className="flex-1 bg-transparent border-none outline-none resize-none px-4 py-2.5 text-[15px] placeholder:text-white/10 font-medium leading-relaxed"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className={`p-3.5 rounded-2xl transition-all active:scale-90 mb-0.5 ${input.trim() ? 'bg-[var(--primary)] text-white shadow-xl shadow-[var(--primary)]/20' : 'bg-white/5 text-white/10 cursor-not-allowed'}`}
              >
                <Icons.Send />
              </button>
            </div>
            <div className="mt-5 flex justify-center gap-10 text-[9px] font-black uppercase tracking-[0.3em] text-[var(--text-muted)] opacity-30 select-none">
              <span className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-green-500" /> Secure Node</span>
              <span>Gemini Pro Native</span>
              <span>v3.4.0 Engine</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
