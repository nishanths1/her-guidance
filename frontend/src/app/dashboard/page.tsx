"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Mic, Camera, ShieldAlert, Navigation, PhoneCall, LogOut, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [isSOSActive, setIsSOSActive] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [recording, setRecording] = useState(false);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [isLockedDown, setIsLockedDown] = useState(false);

  // Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', role: '', phone: '' });

  // SMS State
  const [smsTo, setSmsTo] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  // Voice Assistant State
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pureAudioChunksRef = useRef<Blob[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Use a ref to keep track of the latest activeAlertId inside the MediaRecorder callback
  const activeAlertIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeAlertIdRef.current = activeAlertId;
  }, [activeAlertId]);

  // Voice Assistant Effect
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (isVoiceActive) toast.error("Voice Assistant is not supported in this browser.");
      setIsVoiceActive(false);
      return;
    }

    if (isVoiceActive) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        toast.success("Voice Guardian is actively listening...", { icon: '🎙️' });
      };

      recognition.onresult = (event: any) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript.toLowerCase();
        
        console.log("Voice Guardian heard:", transcript);

        if (transcript.includes('help') || transcript.includes('guardian') || transcript.includes('emergency')) {
          toast.error("VOICE COMMAND RECOGNIZED: TRIGGERING SOS!");
          startSOS(); // Trigger the actual SOS protocol
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error", event.error);
        if (event.error === 'not-allowed') {
          setIsVoiceActive(false);
          toast.error("Microphone access denied for Voice Guardian.");
        }
      };

      recognition.onend = () => {
        // Auto-restart if it stops due to silence but the toggle is still active
        if (isVoiceActive && recognitionRef.current) {
          recognitionRef.current.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      return () => {
        recognition.stop();
        recognitionRef.current = null;
      };
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    }
  }, [isVoiceActive]);

  useEffect(() => {
    if (user?.emergencyContacts) {
      setContacts(user.emergencyContacts);
    }
  }, [user]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    try {
      const updatedContacts = [...contacts, newContact];
      const res = await api.put('/auth/user/contacts', { contacts: updatedContacts });
      setContacts(res.data.emergencyContacts);
      setNewContact({ name: '', role: '', phone: '' });
      setShowAddContact(false);
      toast.success('Emergency contact added securely.');
    } catch (error) {
      toast.error('Failed to add contact.');
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsTo || !smsMessage) return;
    
    setIsSendingSMS(true);
    try {
      const res = await api.post('/sms/user-send', { to: smsTo, message: smsMessage });
      if (res.data.mocked) {
        toast.success("SMS Mocked successfully! (Check server console. Add Twilio keys to .env for real SMS)");
      } else {
        toast.success("SOS SMS Sent Successfully to cellular network!");
      }
      setSmsTo('');
      setSmsMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send SMS.");
    } finally {
      setIsSendingSMS(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
    
    // Camera Setup - Only run once
    let streamRef: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, frameRate: 15 }, // Compress video to save bandwidth
        audio: true 
      })
        .then(stream => {
          streamRef = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          
          // Setup MediaRecorder for Video + Audio with specific codecs
          let options: any = { mimeType: 'video/webm;codecs=vp8,opus' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
              options = { mimeType: 'video/mp4' };
              if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = {}; // Fallback to browser default
              }
            }
          }
          
          mediaRecorderRef.current = new MediaRecorder(stream, options);
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunksRef.current.push(e.data);
          };
          mediaRecorderRef.current.onstop = async () => {
            const rawMimeType = mediaRecorderRef.current?.mimeType || options.mimeType || 'video/webm';
            const cleanMimeType = rawMimeType.split(';')[0];
            
            const videoBlob = new Blob(audioChunksRef.current, { type: cleanMimeType });
            const reader = new FileReader();
            reader.readAsDataURL(videoBlob);
            reader.onloadend = async () => {
              const base64data = reader.result;
              const currentAlertId = activeAlertIdRef.current;
              if (currentAlertId) {
                try {
                  await api.put(`/alerts/${currentAlertId}`, { videoUrl: base64data });
                  toast.success("Video Evidence uploaded securely.");
                } catch (e) {
                  console.error("Upload failed", e);
                } finally {
                  // Don't clear activeAlertId here, wait for audio upload to finish
                }
              }
              audioChunksRef.current = []; // Reset
            };
          };

          // Setup MediaRecorder for Pure Audio
          try {
            const audioStream = new MediaStream(stream.getAudioTracks());
            audioRecorderRef.current = new MediaRecorder(audioStream);
            audioRecorderRef.current.ondataavailable = (e) => {
              if (e.data.size > 0) pureAudioChunksRef.current.push(e.data);
            };
            audioRecorderRef.current.onstop = async () => {
              const mimeType = audioRecorderRef.current?.mimeType || 'audio/webm';
              const audioBlob = new Blob(pureAudioChunksRef.current, { type: mimeType });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                const base64data = reader.result;
                const currentAlertId = activeAlertIdRef.current;
                if (currentAlertId) {
                  try {
                    await api.put(`/alerts/${currentAlertId}`, { audioUrl: base64data });
                    toast.success("Audio Evidence uploaded securely.");
                  } catch (e) {
                    console.error("Audio Upload failed", e);
                  } finally {
                    setActiveAlertId(null);
                  }
                }
                pureAudioChunksRef.current = []; // Reset
              };
            };
          } catch (e) {
            console.error("Could not setup dedicated audio recorder", e);
          }
        })
        .catch(err => {
          console.error("Media access denied:", err);
          toast.error("Please allow camera and microphone access for evidence collection.");
        });
    }

    // Lockdown Listener
    socket.on('trigger_lockdown', (data) => {
      if (data.alertId === activeAlertIdRef.current || data.userId === user?._id) {
        setIsLockedDown(true);
        toast.error("ADMIN OVERRIDE: Device is in lockdown mode.", { duration: 5000 });
      }
    });

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      socket.off('trigger_lockdown');
      if (streamRef) streamRef.getTracks().forEach(track => track.stop());
    };
  }, [user, router]); // Removed activeAlertId from dependency array

  const capturePhoto = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const findNearbySafePlaces = (lat: number, lng: number) => {
    // Mocking nearby places based on coordinates for demonstration
    // In production, use Google Places API or OSM Overpass
    setNearbyPlaces([
      { name: "Central Police Station", distance: "0.8 km", type: "police" },
      { name: "City General Hospital", distance: "1.2 km", type: "hospital" },
      { name: "Women's Help Center", distance: "2.5 km", type: "shelter" }
    ]);
  };

  const startSOS = () => {
    setIsSOSActive(true);
    setRecording(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
      audioChunksRef.current = []; // Ensure chunks are empty before new recording
      mediaRecorderRef.current.start(1000); // 1000ms timeslice is critical for WebM video playing properly in the browser
      
      if (audioRecorderRef.current && audioRecorderRef.current.state === "inactive") {
        pureAudioChunksRef.current = [];
        audioRecorderRef.current.start(1000);
      }
      
      toast.success("Recording started. Video & Audio is being collected.");
    }

    if (navigator.geolocation) {
      // Use watchPosition for continuous tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setLocation(coords);
          findNearbySafePlaces(coords.lat, coords.lng);
          
          if (!activeAlertId) {
            // Create first alert
            const photoUrl = capturePhoto(); 
            try {
              const res = await api.post('/alerts', { location: coords, photoUrl });
              setActiveAlertId(res.data._id);
              
              socket.emit('sos_alert', {
                alertId: res.data._id,
                user: { _id: user?._id, name: user?.name, phone: user?.phone || 'Unknown' },
                location: coords,
                threatLevel: res.data.threatLevel,
                timestamp: new Date()
              });
              toast.error("SOS SENT! Authorities notified.");
            } catch (error) {
              console.error("SOS Alert Failed", error);
            }
          } else {
            // Update existing alert location
            socket.emit('update_location', { alertId: activeAlertId, location: coords });
            api.put(`/alerts/${activeAlertId}`, { location: coords });
          }
        },
        (error) => {
          console.error("Location error:", error);
          toast.error("Failed to get location. Ensure GPS is enabled.");
        },
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
  };

  const stopSOS = () => {
    if (isLockedDown) {
      toast.error("Action denied: Device is locked down by Administrator.");
      return;
    }
    
    setIsSOSActive(false);
    setRecording(false);
    
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop(); // This triggers the onstop event to upload video
    }
    
    if (audioRecorderRef.current && audioRecorderRef.current.state === "recording") {
      audioRecorderRef.current.stop(); // This triggers the onstop event to upload audio
    }
    
    toast.success("SOS Deactivated. Evidence is uploading.");
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-8">
      {/* Navbar */}
      <nav className="flex justify-between items-center bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl border border-slate-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">HER GUARDIAN</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-slate-400">Protected User</p>
          </div>
          <button onClick={logout} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-xl transition-all">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {isLockedDown && (
        <div className="w-full bg-red-600/20 border border-red-500 p-4 rounded-2xl mb-8 flex items-center justify-center gap-3">
          <Shield className="w-6 h-6 text-red-500 animate-pulse" />
          <span className="text-red-400 font-bold">DEVICE LOCKED DOWN BY ADMIN FOR SECURITY. EVIDENCE COLLECTION IS ACTIVE.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main SOS Section */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
            {isSOSActive && (
              <motion.div 
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-64 h-64 bg-red-500/30 rounded-full z-0"
              />
            )}
            
            <motion.button
              whileHover={isLockedDown ? {} : { scale: 1.05 }}
              whileTap={isLockedDown ? {} : { scale: 0.95 }}
              onClick={isSOSActive ? stopSOS : startSOS}
              className={`relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${
                isSOSActive 
                  ? 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-500/50 border-4 border-red-400/50' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30 border-4 border-pink-400/30'
              } ${isLockedDown && isSOSActive ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              <AlertTriangle className={`w-16 h-16 text-white mb-2 ${isSOSActive ? 'animate-pulse' : ''}`} />
              <span className="text-2xl font-bold text-white tracking-wider">
                {isSOSActive ? (isLockedDown ? 'LOCKED' : 'STOP SOS') : 'SOS'}
              </span>
            </motion.button>
            
            <p className="mt-8 text-slate-400 text-center max-w-md">
              {isSOSActive 
                ? "Emergency alert activated. Authorities are tracking your live location and recording audio."
                : "Press the SOS button in case of emergency. It will instantly share your live location and alert nearby authorities."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center gap-4 ${recording ? 'ring-1 ring-red-500/50' : ''}`}>
              <div className={`p-3 rounded-xl ${recording ? 'bg-red-500/20 animate-pulse' : 'bg-blue-500/20'}`}>
                <Mic className={`w-6 h-6 ${recording ? 'text-red-400' : 'text-blue-400'}`} />
              </div>
              <div>
                <h3 className="text-white font-medium">Audio Recording</h3>
                <p className="text-sm text-slate-400">{recording ? 'Recording & Streaming...' : 'Ready on SOS'}</p>
              </div>
            </div>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-xl">
                <Navigation className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Live Tracking</h3>
                <p className="text-sm text-slate-400">
                  {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Awaiting GPS'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          
          {/* Voice Guardian */}
          <div className={`border rounded-3xl p-6 transition-colors ${isVoiceActive ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isVoiceActive ? 'bg-purple-500/20 animate-pulse' : 'bg-slate-800'}`}>
                  <Mic className={`w-5 h-5 ${isVoiceActive ? 'text-purple-400' : 'text-slate-400'}`} />
                </div>
                <h2 className="text-lg font-semibold text-white">Voice Guardian</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isVoiceActive}
                  onChange={(e) => setIsVoiceActive(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
              </label>
            </div>
            <p className="text-sm text-slate-400 ml-12">
              {isVoiceActive ? 'Listening in background... Say "Help me" or "Guardian" to trigger SOS.' : 'Turn on to activate hands-free SOS via voice commands.'}
            </p>
          </div>

          {/* Camera Preview */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Camera className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Live Camera</h2>
            </div>
            <div className="bg-black rounded-xl overflow-hidden aspect-video border border-slate-800 relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full ${isSOSActive ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-xs text-white font-medium">{isSOSActive ? 'RECORDING' : 'READY'}</span>
              </div>
            </div>
          </div>

          {/* Nearby Safe Places */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Nearby Safe Zones</h2>
              </div>
            </div>
            
            <div className="space-y-4">
              {nearbyPlaces.length > 0 ? (
                nearbyPlaces.map((place, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                        {place.type === 'police' ? <Shield className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{place.name}</p>
                        <p className="text-xs text-slate-400">{place.distance} away</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Trigger SOS to scan for nearby police stations and hospitals.</p>
              )}
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <PhoneCall className="w-5 h-5 text-pink-400" />
                <h2 className="text-lg font-semibold text-white">Emergency Contacts</h2>
              </div>
              <button 
                onClick={() => setShowAddContact(!showAddContact)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium bg-purple-500/10 px-3 py-1.5 rounded-lg transition-colors"
              >
                {showAddContact ? 'Cancel' : '+ Add Contact'}
              </button>
            </div>
            
            {showAddContact && (
              <form onSubmit={handleAddContact} className="mb-6 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <input 
                  type="text" placeholder="Name (e.g. John Doe)" required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <input 
                  type="text" placeholder="Role (e.g. Brother)" required value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <input 
                  type="tel" placeholder="Phone Number" required value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:border-purple-500 focus:outline-none"
                />
                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  Save Contact
                </button>
              </form>
            )}

            <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
              {contacts.length > 0 ? contacts.map((contact, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium uppercase">
                      {contact.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{contact.name}</p>
                      <p className="text-xs text-slate-400">{contact.role}</p>
                    </div>
                  </div>
                  <a 
                    href={`tel:${contact.phone}`} 
                    onClick={() => toast(`Initiating secure call to ${contact.name}...`, { icon: '📞' })}
                    className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors inline-block"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </a>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-2">No emergency contacts added yet.</p>
              )}
            </div>
          </div>

          {/* User SMS Interface */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              Direct Emergency SMS
            </h3>
            <form onSubmit={handleSendSMS} className="space-y-4">
              <input 
                type="text" 
                placeholder="Phone Number (e.g. +1234567890)" 
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                required
              />
              <textarea 
                placeholder="Type emergency message here..." 
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-sm min-h-[80px] resize-none"
                required
              ></textarea>
              <button 
                type="submit" 
                disabled={isSendingSMS}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {isSendingSMS ? 'Sending Protocol...' : 'Send SMS Warning'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
