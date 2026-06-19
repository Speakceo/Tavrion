import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Phone, Mic, MicOff, PhoneOff, Send, TrendingUp, Award, Clock, Sparkles, DollarSign, MapPin, Shield, Users, FileText, AlertCircle, X, Briefcase, Home, Heart, Accessibility, Globe, Moon, Zap } from 'lucide-react';
import { openaiService } from '../services/openai';
import type { MockCallSession } from '../types';

type ScenarioType = 'budget_concern' | 'location_specific' | 'safety_parent' | 'amenities_luxury' | 'urgent_booking' | 'payment_issues' | 'roommate_issues' | 'lease_negotiation' | 'maintenance_complaints' | 'cancellation_refund' | 'group_booking' | 'pet_friendly' | 'accessibility_needs' | 'cultural_dietary' | 'late_night_inquiry' | 'competitive_offer';

interface Message {
  role: 'agent' | 'customer';
  message: string;
  timestamp: Date;
}

const scenarios = [
  {
    type: 'budget_concern' as ScenarioType,
    title: 'Budget-Conscious Student',
    character: 'Priya',
    description: 'Price-sensitive student comparing options and worried about hidden costs',
    icon: DollarSign,
    color: 'emerald',
    difficulty: 'Medium'
  },
  {
    type: 'location_specific' as ScenarioType,
    title: 'Location-Focused Student',
    character: 'Jake',
    description: 'Concerned about distance to campus, neighborhood safety, and local amenities',
    icon: MapPin,
    color: 'blue',
    difficulty: 'Easy'
  },
  {
    type: 'safety_parent' as ScenarioType,
    title: 'Concerned Parent',
    character: 'Mrs. Chen',
    description: 'Protective parent worried about daughter\'s safety and accommodation security',
    icon: Shield,
    color: 'rose',
    difficulty: 'Hard'
  },
  {
    type: 'amenities_luxury' as ScenarioType,
    title: 'Premium Seeker',
    character: 'Mohammed',
    description: 'High expectations for amenities, quality, and service standards',
    icon: Award,
    color: 'violet',
    difficulty: 'Medium'
  },
  {
    type: 'urgent_booking' as ScenarioType,
    title: 'Urgent Booking',
    character: 'Lisa',
    description: 'Stressed student with immediate accommodation needs and scam concerns',
    icon: Clock,
    color: 'amber',
    difficulty: 'Hard'
  },
  {
    type: 'payment_issues' as ScenarioType,
    title: 'Payment Complications',
    character: 'Raj',
    description: 'International student facing guarantor and payment transfer challenges',
    icon: Users,
    color: 'cyan',
    difficulty: 'Medium'
  },
  {
    type: 'roommate_issues' as ScenarioType,
    title: 'Roommate Concerns',
    character: 'Sofia',
    description: 'PhD student with bad roommate history seeking control over living arrangements',
    icon: Users,
    color: 'teal',
    difficulty: 'Medium'
  },
  {
    type: 'lease_negotiation' as ScenarioType,
    title: 'Lease Negotiation',
    character: 'David',
    description: 'Experienced mature student who knows tenant rights and negotiates terms',
    icon: FileText,
    color: 'slate',
    difficulty: 'Hard'
  },
  {
    type: 'maintenance_complaints' as ScenarioType,
    title: 'Maintenance Worries',
    character: 'Emma',
    description: 'Student with past maintenance nightmares needing response time reassurance',
    icon: AlertCircle,
    color: 'orange',
    difficulty: 'Easy'
  },
  {
    type: 'cancellation_refund' as ScenarioType,
    title: 'Cancellation Anxiety',
    character: 'Marcus',
    description: 'Risk-averse student worried about visa rejection and deposit loss',
    icon: X,
    color: 'red',
    difficulty: 'Medium'
  },
  {
    type: 'group_booking' as ScenarioType,
    title: 'Group Booking',
    character: 'Aisha',
    description: 'Organizer seeking group discount and coordinating multiple friends',
    icon: Users,
    color: 'indigo',
    difficulty: 'Medium'
  },
  {
    type: 'pet_friendly' as ScenarioType,
    title: 'Emotional Support Pet',
    character: 'Tom',
    description: 'Grad student with service dog facing discrimination and legal concerns',
    icon: Heart,
    color: 'pink',
    difficulty: 'Hard'
  },
  {
    type: 'accessibility_needs' as ScenarioType,
    title: 'Accessibility Requirements',
    character: 'Fatima',
    description: 'Wheelchair user tired of false accessibility claims needing specifics',
    icon: Accessibility,
    color: 'purple',
    difficulty: 'Hard'
  },
  {
    type: 'cultural_dietary' as ScenarioType,
    title: 'Cultural & Dietary Needs',
    character: 'Hassan',
    description: 'Muslim student requiring halal kitchen and prayer space',
    icon: Globe,
    color: 'green',
    difficulty: 'Medium'
  },
  {
    type: 'late_night_inquiry' as ScenarioType,
    title: 'Late Night Inquiry',
    character: 'Alex',
    description: 'Busy professional expecting service outside business hours',
    icon: Moon,
    color: 'navy',
    difficulty: 'Easy'
  },
  {
    type: 'competitive_offer' as ScenarioType,
    title: 'Competitive Offer',
    character: 'Nina',
    description: 'Savvy negotiator with multiple offers seeking best deal',
    icon: Zap,
    color: 'yellow',
    difficulty: 'Hard'
  }
];

export function MockCalls() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<MockCallSession[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
  const [inCall, setInCall] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    fetchSessions();
    audioRef.current = new Audio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRecordToggle = async () => {
    if (isTyping || isTranscribing) return;

    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          if (audioBlob.size > 1000) {
            try {
              const transcription = await openaiService.speechToText(audioBlob);

              if (transcription.trim()) {
                await sendMessageAuto(transcription);
              }
            } catch (error) {
              console.error('Error transcribing audio:', error);
              alert('Failed to transcribe audio. Please try again.');
            }
          }

          setIsTranscribing(false);
          audioChunksRef.current = [];
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Could not access microphone. Please grant permission and try again.');
      }
    } else {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;

      setIsRecording(false);
      setIsTranscribing(true);

      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const fetchSessions = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('mock_call_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (data) setSessions(data);
  };

  const speakText = async (text: string) => {
    if (!voiceEnabled || !audioRef.current) return;

    try {
      audioRef.current.pause();
      const audioBlob = await openaiService.textToSpeech(text, 'nova');
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      await audioRef.current.play();
    } catch (error) {
      console.error('Error speaking text:', error);
    }
  };

  const startCall = async () => {
    if (!selectedScenario || !profile) return;

    setInCall(true);
    setCallStartTime(new Date());
    setMessages([]);
    setShowResults(false);
    setIsTranscribing(false);
    setIsRecording(false);

    try {
      const greeting = await getAIResponse([], true);

      const initialMessage = {
        role: 'customer' as const,
        message: greeting,
        timestamp: new Date()
      };

      setMessages([initialMessage]);

      if (voiceEnabled) {
        await speakText(greeting);
      }
    } catch (error: any) {
      setInCall(false);
      alert(error.message || 'Failed to start call. Please try again.');
    }
  };

  const endCall = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsTranscribing(false);
    setIsRecording(false);

    if (audioRef.current) {
      audioRef.current.pause();
    }

    if (messages.length < 2) {
      setInCall(false);
      setMessages([]);
      return;
    }

    setIsTyping(true);

    try {
      const result = await openaiService.evaluateMockCall({
        scenarioType: selectedScenario!,
        transcript: messages
      });

      setEvaluation(result);

      await supabase.from('mock_call_sessions').insert({
        user_id: profile!.id,
        scenario_type: selectedScenario!,
        scenario_details: {
          character: scenarios.find(s => s.type === selectedScenario)?.character
        },
        transcript: messages,
        score: result.score,
        feedback: result,
        completed_at: new Date().toISOString()
      });

      await fetchSessions();
      setShowResults(true);
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setIsTyping(false);
      setInCall(false);
    }
  };

  const getAIResponse = async (conversationHistory: Message[], isNewCall: boolean = false): Promise<string> => {
    try {
      if (!profile) {
        throw new Error('User profile not found');
      }

      const response = await openaiService.mockCallAgent({
        scenarioType: selectedScenario!,
        userMessage: conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1].message : '',
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          message: msg.message
        })),
        userId: profile.id,
        isNewCall: isNewCall
      });
      return response;
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  };

  const sendMessageAuto = async (message: string) => {
    if (!message.trim() || isTyping) return;

    const newMessage: Message = {
      role: 'agent',
      message: message.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setIsTyping(true);

    try {
      const aiResponse = await getAIResponse(updatedMessages, false);

      const aiMessage = {
        role: 'customer' as const,
        message: aiResponse,
        timestamp: new Date()
      };

      setMessages([...updatedMessages, aiMessage]);

      if (voiceEnabled) {
        await speakText(aiResponse);
      }
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      alert(error.message || 'Failed to get response. Please try again.');
    } finally {
      setIsTyping(false);
    }
  };

  const averageScore = sessions.length > 0
    ? Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length)
    : 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-700 bg-green-100';
      case 'Medium': return 'text-amber-700 bg-amber-100';
      case 'Hard': return 'text-rose-700 bg-rose-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-3">
              <Phone className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-90">AI Mock Calls</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Practice Real Conversations</h1>
            <p className="text-blue-100 text-lg">Master objection handling with realistic AI-powered scenarios</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg">
                <Phone className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-900 mb-2">{sessions.length}</div>
            <div className="text-sm font-medium text-blue-700">Total Practice Calls</div>
          </div>

          <div className="group bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-600 p-3 rounded-xl shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-emerald-900 mb-2">{averageScore}%</div>
            <div className="text-sm font-medium text-emerald-700">Average Performance</div>
          </div>
        </div>

        {!inCall && !showResults && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Scenario</h2>
              </div>
              <div className="flex items-center">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Voice Mode (AI speaks responses)</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Select a realistic customer situation to practice your sales and support skills</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.type}
                  onClick={() => setSelectedScenario(scenario.type)}
                  className={`p-5 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    selectedScenario === scenario.type
                      ? 'border-blue-600 bg-blue-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="bg-gray-100 p-3 rounded-lg inline-block mb-3">
                    <scenario.icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900">{scenario.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 font-medium">{scenario.character}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{scenario.description}</p>
                </button>
              ))}
            </div>

            {selectedScenario && (
              <div className="pt-6 border-t border-gray-200">
                <button
                  onClick={startCall}
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                >
                  <Phone className="w-6 h-6" />
                  <span>Start Mock Call</span>
                </button>
                <p className="text-center text-sm text-gray-500 mt-4">
                  {voiceEnabled
                    ? 'Voice Recording Mode - Click to start/stop recording, AI responds with voice'
                    : 'Voice Recording Mode - Click to start recording, click again to stop and send'}
                </p>
              </div>
            )}
          </div>
        )}

        {inCall && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Live Call in Progress</h2>
                  <p className="text-blue-100">
                    {scenarios.find(s => s.type === selectedScenario)?.title} - {scenarios.find(s => s.type === selectedScenario)?.character}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-400 text-white">
                      <Mic className="w-3 h-3" />
                      <span>Voice Recording Mode</span>
                    </div>
                    {voiceEnabled && (
                      <span className="text-blue-200 text-xs">+ AI Voice Response</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={endCall}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                  <span>End Call</span>
                </button>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-6 bg-gray-50 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-lg px-6 py-3 rounded-2xl ${
                      msg.role === 'agent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {msg.role === 'agent' ? 'You' : scenarios.find(s => s.type === selectedScenario)?.character}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-lg px-6 py-3 rounded-2xl bg-white border border-gray-200">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-gray-200">
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className={`px-6 py-3 rounded-xl flex items-center space-x-3 ${
                    isTranscribing
                      ? 'bg-blue-50 border-2 border-blue-400'
                      : isRecording
                      ? 'bg-red-50 border-2 border-red-500'
                      : isTyping
                      ? 'bg-gray-50 border-2 border-gray-300'
                      : 'bg-green-50 border-2 border-green-500'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      isTranscribing
                        ? 'bg-blue-500 animate-pulse'
                        : isRecording
                        ? 'bg-red-500 animate-pulse'
                        : isTyping
                        ? 'bg-gray-400 animate-pulse'
                        : 'bg-green-500'
                    }`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      {isTranscribing
                        ? 'Transcribing and sending...'
                        : isRecording
                        ? 'Recording - Click to stop'
                        : isTyping
                        ? 'AI is responding...'
                        : 'Ready - Click to record'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleRecordToggle}
                    disabled={isTyping || isTranscribing}
                    className={`w-32 h-32 rounded-full flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isRecording
                        ? 'bg-red-500 shadow-2xl shadow-red-500/50 scale-110'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg'
                    }`}
                  >
                    <Mic className="w-16 h-16 text-white" />
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-600 font-medium">
                    {isRecording ? 'Click again to stop and send' : 'Click to start recording'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isRecording ? 'Recording in progress...' : 'Your message will be transcribed automatically'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showResults && evaluation && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white text-center">
              <Award className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-2">Call Complete!</h2>
              <div className="text-6xl font-bold my-4">{evaluation.score}%</div>
              <p className="text-emerald-100 text-lg">Performance Score</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Overall Feedback</h3>
                <p className="text-gray-700 leading-relaxed">{evaluation.feedback}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.strengths?.map((strength: string, idx: number) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {evaluation.improvements?.map((improvement: string, idx: number) => (
                      <li key={idx} className="text-sm text-blue-800 flex items-start">
                        <span className="text-blue-600 mr-2">→</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 flex space-x-4">
                <button
                  onClick={() => {
                    setShowResults(false);
                    setSelectedScenario(null);
                    setEvaluation(null);
                  }}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Practice Another Scenario
                </button>
              </div>
            </div>
          </div>
        )}

        {sessions.length > 0 && !inCall && !showResults && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Recent Practice Sessions</h2>
              <p className="text-gray-600 text-sm mt-1">Review your progress and performance</p>
            </div>
            <div className="divide-y divide-gray-200">
              {sessions.slice(0, 5).map((session) => {
                const scenario = scenarios.find(s => s.type === session.scenario_type);
                return (
                  <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {scenario && <scenario.icon className="w-5 h-5 text-gray-600" />}
                          <h3 className="text-lg font-semibold text-gray-900">
                            {scenario?.title || 'Practice Call'}
                          </h3>
                          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            (session.score ?? 0) >= 80 ? 'bg-green-100 text-green-700' :
                            (session.score ?? 0) >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {session.score}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(session.completed_at).toLocaleDateString()} at {new Date(session.completed_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
