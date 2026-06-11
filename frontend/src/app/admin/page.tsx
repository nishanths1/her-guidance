"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';
import api from '@/lib/axios';
import { ShieldAlert, Bell, Users, Activity, CheckCircle, Clock, MapPin, AudioLines, Camera, Lock } from 'lucide-react';
import Map from '@/components/Map';
import toast from 'react-hot-toast';

const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000');

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);

  // SMS State
  const [smsTo, setSmsTo] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'live' | 'all'>('live');

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsTo || !smsMessage) return;
    
    setIsSendingSMS(true);
    try {
      const res = await api.post('/sms/send', { to: smsTo, message: smsMessage });
      if (res.data.mocked) {
        toast.success("SMS Mocked successfully! (Check server console. Add Twilio keys to .env for real SMS)");
      } else {
        toast.success("SMS Sent Successfully to cellular network!");
      }
      setSmsTo('');
      setSmsMessage('');
    } catch (error: any) {
      console.error("SMS Failed", error);
      toast.error(error.response?.data?.message || "Failed to send SMS.");
    } finally {
      setIsSendingSMS(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }

    fetchAlerts();

    // Socket listeners
    socket.on('new_alert', (data) => {
      const audio = new Audio('/alert-sound.mp3'); 
      audio.play().catch(e => console.log("Audio play blocked by browser:", e));
      
      toast.error(`NEW SOS ALERT: ${data.user?.name} in Danger! Threat: ${data.threatLevel?.toUpperCase()}`, {
        duration: 8000,
        icon: '🚨'
      });

      setAlerts((prev) => [data, ...prev]);
    });

    socket.on('location_updated', (data) => {
      setAlerts(prevAlerts => prevAlerts.map(alert => 
        alert._id === data.alertId ? { ...alert, location: data.location } : alert
      ));
    });

    return () => {
      socket.off('new_alert');
      socket.off('location_updated');
    };
  }, [user, router]);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch (error) {
      console.error("Failed to fetch alerts", error);
    }
  };

  const resolveAlert = async (id: string) => {
    try {
      await api.put(`/alerts/${id}/resolve`);
      toast.success("Incident resolved and closed.");
      fetchAlerts(); 
    } catch (error) {
      console.error("Failed to resolve alert", error);
      toast.error("Failed to resolve incident.");
    }
  };

  const triggerLockdown = (alertId: string, userId: string) => {
    socket.emit('lost_device_lockdown', { alertId, userId });
    toast.success("Lockdown signal sent to device.");
  };

  const activeAlertsCount = alerts.filter(a => a.status === 'active' || !a.status).length;
  const resolvedAlertsCount = alerts.filter(a => a.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col h-auto md:h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-12">
          <div className="bg-pink-500 p-2 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">HER<br/>GUARDIAN</h1>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setActiveTab('live')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'live' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-5 h-5" />
            Live Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'all' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Bell className="w-5 h-5" />
            All Alerts History
          </button>
        </nav>

        <div className="mt-auto pt-8 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold">
              {user?.name?.[0] || 'A'}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">Command Center</p>
            </div>
          </div>
          <button onClick={logout} className="w-full text-left text-sm text-red-400 hover:text-red-300 font-medium px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Emergency Command Center</h2>
            <p className="text-slate-400 text-sm mt-1">Real-time monitoring and dispatch</p>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-red-500/20 p-4 rounded-xl text-red-400">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Active SOS Alerts</p>
              <h3 className="text-3xl font-bold text-white">{activeAlertsCount}</h3>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="bg-green-500/20 p-4 rounded-xl text-green-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Resolved Cases</p>
              <h3 className="text-3xl font-bold text-white">{resolvedAlertsCount}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Alerts List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-400" />
                {activeTab === 'live' ? 'Live Incident Feed' : 'All Alerts History'}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {alerts.filter(a => activeTab === 'all' || a.status === 'active' || !a.status).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                  <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
                  <p>No incidents found.</p>
                </div>
              ) : (
                alerts
                  .filter(a => activeTab === 'all' || a.status === 'active' || !a.status)
                  .map((alert, i) => {
                    const isActive = alert.status === 'active' || !alert.status;
                    const threatColor = alert.threatLevel === 'critical' ? 'text-red-500' : 'text-orange-400';
                    
                    return (
                    <div key={alert._id || i} className={`p-4 rounded-xl border ${isActive ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">{alert.user?.name || 'Unknown User'}</h4>
                          <p className="text-xs text-slate-400">{alert.user?.phone}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-md font-bold ${isActive ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {isActive ? 'CRITICAL' : 'RESOLVED'}
                          </span>
                          {isActive && (
                            <p className={`text-xs mt-1 font-bold ${threatColor}`}>
                              AI THREAT: {alert.threatLevel?.toUpperCase() || 'MODERATE'}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <MapPin className="w-4 h-4 text-purple-400" />
                          <span>Lat: {alert.location?.lat?.toFixed(4)}, Lng: {alert.location?.lng?.toFixed(4)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Clock className="w-4 h-4 text-pink-400" />
                          <span>{new Date(alert.createdAt || alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* Evidence Section */}
                      {((alert.audioUrls && alert.audioUrls.length > 0) || (alert.photoUrls && alert.photoUrls.length > 0) || (alert.videoUrls && alert.videoUrls.length > 0)) && (
                        <div className="mb-4 bg-slate-950 p-4 rounded-xl border border-slate-700/50">
                          <h5 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Collected Evidence</h5>
                          
                          {/* Videos */}
                          {alert.videoUrls && alert.videoUrls.length > 0 && (
                            <div className="mb-4 space-y-2">
                              <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                                <Camera className="w-3 h-3" /> Video Recordings ({alert.videoUrls.length})
                              </p>
                              {alert.videoUrls.map((video: string, idx: number) => (
                                <div key={idx} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                                  <span className="text-[10px] text-slate-500 p-2 block bg-slate-900/50">Video Clip #{idx + 1}</span>
                                  <video controls playsInline className="w-full aspect-video bg-black" src={video}>
                                    Your browser does not support the video element.
                                  </video>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Photos */}
                          {alert.photoUrls && alert.photoUrls.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-2">
                                <Camera className="w-3 h-3" /> Photographic Evidence
                              </p>
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {alert.photoUrls.map((photo: string, idx: number) => (
                                  <img 
                                    key={idx} 
                                    src={photo} 
                                    alt={`Evidence ${idx + 1}`} 
                                    className="h-24 w-auto rounded-lg border border-slate-700 object-cover"
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Audio */}
                          {alert.audioUrls && alert.audioUrls.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
                                <AudioLines className="w-3 h-3" /> Audio Recordings ({alert.audioUrls.length})
                              </p>
                              {alert.audioUrls.map((audio: string, idx: number) => (
                                <div key={idx} className="bg-slate-900 rounded-lg p-2 border border-slate-800">
                                  <span className="text-[10px] text-slate-500 mb-1 block">Recording #{idx + 1}</span>
                                  <audio controls className="w-full h-8" src={audio}>
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700/50">
                        {isActive && alert._id && (
                          <>
                            <button 
                              onClick={() => triggerLockdown(alert._id, alert.user?._id)}
                              className="w-full bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <Lock className="w-4 h-4" /> Lost Device Lockdown Override
                            </button>
                            <button 
                              onClick={() => resolveAlert(alert._id)}
                              className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" /> Mark Incident Resolved
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Map View */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden h-[600px] relative flex flex-col">
            <div className="p-4 border-b border-slate-800 absolute top-0 left-0 w-full z-10 bg-slate-900/80 backdrop-blur-md flex justify-between items-center">
              <h3 className="text-white font-medium flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-400" />
                Live Tracking Map
              </h3>
            </div>
            <div className="flex-1 w-full h-full relative z-0">
               <Map alerts={alerts.filter(a => a.status === 'active' || !a.status)} />
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* SMS Dispatch */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
              Quick SMS Dispatch
            </h3>
            <p className="text-sm text-slate-400 mb-6">Send an immediate SMS alert to emergency contacts or field officers.</p>
            
            <form onSubmit={handleSendSMS} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Recipient Phone Number (with Country Code)</label>
                <input 
                  type="text" 
                  placeholder="+1234567890" 
                  value={smsTo}
                  onChange={(e) => setSmsTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Message</label>
                <textarea 
                  placeholder="Type emergency message here..." 
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[100px] resize-none"
                  required
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={isSendingSMS}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSendingSMS ? 'Sending Protocol...' : 'Send Emergency SMS'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
