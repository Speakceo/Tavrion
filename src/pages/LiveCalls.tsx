import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Radio, Mic, PhoneOff, TrendingUp, Award, Clock, AlertCircle, Sparkles, Star } from 'lucide-react';
import { openaiService } from '../services/openai';
import { fetchOrgMockScenarios, getScenarioIcon } from '../utils/mockCallScenarios';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';
import { getEvaluationRubric } from '../utils/orgSettings';
import type { MockScenarioRow } from '../data/defaultMockScenarios';

interface Message {
  role: 'agent' | 'customer';
  message: string;
  timestamp: Date;
}

interface LiveCallSession {
  id: string;
  user_id: string;
  scenario_type: string;
  scenario_details: any;
  duration: number;
  transcript: Message[];
  score?: number;
  feedback?: any;
  completed_at: string;
}

export function LiveCalls() {
  const { profile, organization } = useAuth();
  const [orgScenarios, setOrgScenarios] = useState<MockScenarioRow[]>([]);
  const [sessions, setSessions] = useState<LiveCallSession[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [inCall, setInCall] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [autoTrainMode, setAutoTrainMode] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const maxAutoTrainTurns = 10;
  const processingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [callQualityRating, setCallQualityRating] = useState<number>(0);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const activeScenario = orgScenarios.find((s) => s.scenario_key === selectedScenario);
  const scenarioByKey = (key: string | null | undefined) =>
    orgScenarios.find((s) => s.scenario_key === key);

  useEffect(() => {
    if (!profile?.organization_id) return;
    fetchOrgMockScenarios(profile.organization_id).then(setOrgScenarios).catch(console.error);
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchSessions();

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

  const fetchSessions = async () => {
    if (!profile) return;

    let query = supabase
      .from('live_call_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    query = applyOrgScope(query, profile);

    const { data } = await query;
    if (data) setSessions(data);
  };

  const speakText = async (text: string, voice: string = 'nova') => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(true);

      const validVoice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice)
        ? (voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer')
        : 'nova';
      const audioBlob = await openaiService.textToSpeech(text, validVoice);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error speaking text:', error);
      setIsPlaying(false);
    }
  };

  const getAIResponse = async (conversationHistory: Message[], isNewCall: boolean = false): Promise<string> => {
    try {
      if (!profile) throw new Error('User profile not found');

      return await openaiService.mockCallAgent({
        scenarioType: selectedScenario!,
        systemPrompt: activeScenario?.system_prompt,
        userMessage: conversationHistory.length > 0
          ? conversationHistory[conversationHistory.length - 1].message
          : '',
        conversationHistory: conversationHistory.map((msg) => ({
          role: msg.role,
          message: msg.message,
        })),
        userId: profile.id,
        isNewCall,
      });
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  };

  const getAgentResponse = async (conversationHistory: Message[]): Promise<string> => {
    try {
      if (!activeScenario) throw new Error('Scenario not found');

      const conversationLog = conversationHistory.slice(-6).map(msg =>
        `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.message}`
      ).join('\n');

      return await openaiService.chatTutor({
        userMessage: `Respond professionally as the accommodation agent. The customer just said: "${conversationHistory[conversationHistory.length - 1].message}"`,
        context: `Scenario: ${activeScenario.title} — ${activeScenario.description}. Customer character: ${activeScenario.character_name}.\n\nRecent conversation:\n${conversationLog}\n\nKeep response to 2-3 sentences about student accommodation only.`,
        userRole: 'sales_agent',
      });
    } catch (error) {
      console.error('Error getting agent response:', error);
      return 'Thank you for your question. Let me help you with that. What specific information would you like to know about our accommodation options?';
    }
  };

  const handleRecordToggle = async () => {
    if (isTyping || isTranscribing || processingRef.current || isPlaying) return;

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
              setIsTranscribing(true);
              const text = await openaiService.speechToText(audioBlob);
              if (text?.trim()) {
                await sendMessageFromUser(text.trim());
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

  const sendMessageFromUser = async (message: string) => {
    if (!message.trim() || isTyping || processingRef.current) return;

    processingRef.current = true;

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

      await speakText(aiResponse, activeScenario?.voice || 'nova');
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      alert(error.message || 'Failed to get response. Please try again.');
    } finally {
      setIsTyping(false);
      processingRef.current = false;
    }
  };

  const handleAutoTrain = async (currentMessages: Message[]) => {
    if (processingRef.current || turnCount >= maxAutoTrainTurns) {
      if (turnCount >= maxAutoTrainTurns) {
        await endCall();
      }
      return;
    }

    processingRef.current = true;
    const lastMessage = currentMessages[currentMessages.length - 1];

    if (lastMessage.role === 'customer') {
      setIsTyping(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const agentResponse = await getAgentResponse(currentMessages);

        const agentMessage: Message = {
          role: 'agent',
          message: agentResponse,
          timestamp: new Date()
        };

        const updatedMessages = [...currentMessages, agentMessage];
        setMessages(updatedMessages);
        setTurnCount(prev => prev + 1);

        setIsTyping(false);
        processingRef.current = false;

        if (autoTrainMode && turnCount + 1 < maxAutoTrainTurns) {
          setTimeout(() => handleAutoTrain(updatedMessages), 2000);
        }
      } catch (error) {
        console.error('Error in auto-train agent response:', error);
        setIsTyping(false);
        processingRef.current = false;
      }
    } else if (lastMessage.role === 'agent') {
      setIsTyping(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        const customerResponse = await getAIResponse(currentMessages, false);

        const customerMessage: Message = {
          role: 'customer',
          message: customerResponse,
          timestamp: new Date()
        };

        const updatedMessages = [...currentMessages, customerMessage];
        setMessages(updatedMessages);

        await speakText(customerResponse, activeScenario?.voice || 'nova');

        setIsTyping(false);
        processingRef.current = false;

        if (autoTrainMode && turnCount < maxAutoTrainTurns) {
          setTimeout(() => handleAutoTrain(updatedMessages), 2000);
        }
      } catch (error) {
        console.error('Error in auto-train customer response:', error);
        setIsTyping(false);
        processingRef.current = false;
      }
    }
  };

  const startCall = async () => {
    if (!selectedScenario || !profile || processingRef.current) return;

    processingRef.current = true;
    setInCall(true);
    setCallStartTime(new Date());
    setMessages([]);
    setShowResults(false);
    setIsTranscribing(false);
    setIsRecording(false);
    setTurnCount(0);

    try {
      const greeting = await getAIResponse([], true);

      const initialMessage = {
        role: 'customer' as const,
        message: greeting,
        timestamp: new Date()
      };

      setMessages([initialMessage]);

      await speakText(greeting, activeScenario?.voice || 'nova');

      processingRef.current = false;

      if (autoTrainMode) {
        setTimeout(() => handleAutoTrain([initialMessage]), 3000);
      }
    } catch (error: any) {
      setInCall(false);
      processingRef.current = false;
      alert(error.message || 'Failed to start call. Please try again.');
    }
  };

  const evaluateCall = async (transcript: Message[]) => {
    return openaiService.evaluateMockCall({
      scenarioType: selectedScenario!,
      transcript: transcript.map((msg) => ({ role: msg.role, message: msg.message })),
      evaluationRubric: getEvaluationRubric(organization),
    });
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
    setAutoTrainMode(false);
    processingRef.current = false;

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
      const result = await evaluateCall(messages);

      setEvaluation(result);

      const duration = callStartTime ? Math.round((new Date().getTime() - callStartTime.getTime()) / 1000) : 0;

      await supabase.from('live_call_sessions').insert({
        user_id: profile!.id,
        organization_id: orgIdForInsert(profile),
        scenario_type: selectedScenario!,
        scenario_details: {
          character: activeScenario?.character_name
        },
        duration,
        transcript: messages,
        score: result.score,
        feedback: result,
        completed_at: new Date().toISOString()
      });

      await fetchSessions();
      setShowResults(true);
      setShowRatingModal(true);
    } catch (error) {
      console.error('Error ending call:', error);
    } finally {
      setIsTyping(false);
      setInCall(false);
    }
  };

  const submitCallRating = async (rating: number) => {
    setCallQualityRating(rating);
    setShowRatingModal(false);

    if (!profile || sessions.length === 0) return;

    const latestSession = sessions[0];
    await supabase
      .from('live_call_sessions')
      .update({
        scenario_details: {
          ...latestSession.scenario_details,
          call_quality_rating: rating
        }
      })
      .eq('id', latestSession.id);

    await fetchSessions();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-3">
              <Radio className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-90">Live Call Practice</span>
            </div>
            <h1 className="text-4xl font-bold mb-2">Real-Time Voice Training with AI</h1>
            <p className="text-orange-100 text-lg">Practice realistic customer scenarios with OpenAI-powered voice conversations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-600 p-3 rounded-xl shadow-lg">
                <Radio className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-orange-900 mb-2">{sessions.length}</div>
            <div className="text-sm font-medium text-orange-700">Total Live Practice Calls</div>
          </div>

          <div className="group bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-pink-200">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-pink-600 p-3 rounded-xl shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
            </div>
            <div className="text-4xl font-bold text-pink-900 mb-2">{averageScore}%</div>
            <div className="text-sm font-medium text-pink-700">Average Performance</div>
          </div>
        </div>

        {!inCall && !showResults && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-orange-600" />
                <h2 className="text-2xl font-bold text-gray-900">Choose Your Scenario</h2>
              </div>
            </div>
            <p className="text-gray-600 mb-6">Select a scenario configured for your organisation and practice with live voice interaction powered by OpenAI</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {orgScenarios.map((scenario) => {
                const Icon = getScenarioIcon(scenario.icon_name);
                return (
                <button
                  key={scenario.scenario_key}
                  onClick={() => setSelectedScenario(scenario.scenario_key)}
                  className={`p-5 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    selectedScenario === scenario.scenario_key
                      ? 'border-orange-600 bg-orange-50 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="bg-gray-100 p-3 rounded-lg inline-block mb-3">
                    <Icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-900">{scenario.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2 font-medium">{scenario.character_name}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{scenario.description}</p>
                </button>
              );})}
            </div>

            {selectedScenario && (
              <div className="pt-6 border-t border-gray-200 space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <h3 className="text-lg font-bold text-gray-900">Auto-Training Mode</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        AI agent will automatically respond to the customer without your input. Perfect for watching and learning!
                      </p>
                    </div>
                    <button
                      onClick={() => setAutoTrainMode(!autoTrainMode)}
                      className={`ml-6 relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                        autoTrainMode ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                          autoTrainMode ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <button
                  onClick={startCall}
                  className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-orange-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
                >
                  <Radio className="w-6 h-6" />
                  <span>{autoTrainMode ? 'Start Auto-Training Call' : 'Start Live Call with Voice'}</span>
                </button>
                <p className="text-center text-sm text-gray-500">
                  {autoTrainMode
                    ? 'AI agent will automatically handle the call for 10 turns - great for learning!'
                    : 'Powered by OpenAI — voice recording, Whisper speech-to-text, and text-to-speech'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {inCall && (
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-pink-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Live Call in Progress</h2>
                  <p className="text-orange-100">
                    {activeScenario?.title} - {activeScenario?.character_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-400 text-white">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>LIVE — OpenAI Voice</span>
                    </div>
                    {autoTrainMode && (
                      <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-purple-500 text-white">
                        <Sparkles className="w-3 h-3" />
                        <span>AUTO-TRAINING ({turnCount}/{maxAutoTrainTurns})</span>
                      </div>
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
                        ? 'bg-orange-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="text-xs font-medium mb-1 opacity-75">
                      {msg.role === 'agent' ? 'You' : activeScenario?.character_name}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              {(isTyping || isPlaying) && (
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

            {!autoTrainMode && (
              <div className="p-6 bg-white border-t border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className={`px-6 py-3 rounded-xl flex items-center space-x-3 ${
                      isTranscribing
                        ? 'bg-blue-50 border-2 border-blue-400'
                        : isRecording
                        ? 'bg-red-50 border-2 border-red-500'
                        : isTyping || isPlaying
                        ? 'bg-gray-50 border-2 border-gray-300'
                        : 'bg-green-50 border-2 border-green-500'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        isTranscribing
                          ? 'bg-blue-500 animate-pulse'
                          : isRecording
                          ? 'bg-red-500 animate-pulse'
                          : isTyping || isPlaying
                          ? 'bg-gray-400 animate-pulse'
                          : 'bg-green-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700">
                        {isTranscribing
                          ? 'Transcribing with Whisper AI...'
                          : isRecording
                          ? 'Recording - Click to stop'
                          : isPlaying
                          ? 'AI is speaking...'
                          : isTyping
                          ? 'AI is thinking...'
                          : 'Ready - Click to record your response'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleRecordToggle}
                      disabled={isTyping || isTranscribing || isPlaying}
                      className={`w-32 h-32 rounded-full flex items-center justify-center transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecording
                          ? 'bg-red-500 shadow-2xl shadow-red-500/50 scale-110'
                          : 'bg-orange-600 hover:bg-orange-700 shadow-lg'
                      }`}
                    >
                      <Mic className="w-16 h-16 text-white" />
                    </button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600 font-medium">
                      {isRecording ? 'Click again to stop and transcribe' : 'Click to start recording your response'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isRecording ? 'Recording...' : 'AI will respond with voice using OpenAI TTS'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {autoTrainMode && (
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-t border-purple-200">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
                    <h3 className="text-lg font-bold text-gray-900">Auto-Training Mode Active</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Watch the AI agent automatically handle the call. The conversation will run for {maxAutoTrainTurns} turns.
                  </p>
                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">
                        {isTyping || isPlaying ? 'AI is processing...' : 'Conversation in progress...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <p className="text-gray-700 leading-relaxed">
                  {typeof evaluation.feedback === 'string'
                    ? evaluation.feedback
                    : 'Call completed successfully.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {Array.isArray(evaluation.strengths) && evaluation.strengths.map((strength: any, idx: number) => (
                      <li key={idx} className="text-sm text-green-800 flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>{typeof strength === 'string' ? strength : 'Professional approach'}</span>
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
                    {Array.isArray(evaluation.improvements) && evaluation.improvements.map((improvement: any, idx: number) => (
                      <li key={idx} className="text-sm text-blue-800 flex items-start">
                        <span className="text-blue-600 mr-2">→</span>
                        <span>{typeof improvement === 'string' ? improvement : 'Continue practicing'}</span>
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
                  className="flex-1 px-6 py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
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
              <h2 className="text-2xl font-bold text-gray-900">Recent Live Practice Sessions</h2>
              <p className="text-gray-600 text-sm mt-1">Review your progress and performance</p>
            </div>
            <div className="divide-y divide-gray-200">
              {sessions.slice(0, 5).map((session) => {
                const scenario = scenarioByKey(session.scenario_type);
                const SessionIcon = scenario ? getScenarioIcon(scenario.icon_name) : Radio;
                return (
                  <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <SessionIcon className="w-5 h-5 text-gray-600" />
                          <h3 className="text-lg font-semibold text-gray-900">
                            {scenario?.title || 'Live Practice Call'}
                          </h3>
                          {session.score && (
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              session.score >= 80 ? 'bg-green-100 text-green-700' :
                              session.score >= 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {session.score}%
                            </span>
                          )}
                          <span className="text-xs px-3 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                            {formatDuration(session.duration)}
                          </span>
                          {session.scenario_details?.call_quality_rating && (
                            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                              <Star className="w-3 h-3 text-yellow-600 fill-yellow-600" />
                              <span className="text-xs font-medium text-yellow-700">
                                {session.scenario_details.call_quality_rating}/5
                              </span>
                            </div>
                          )}
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

        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-br from-orange-100 to-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-10 h-10 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Rate Call Quality</h3>
                <p className="text-gray-600">How realistic and helpful was this training call?</p>
              </div>

              <div className="flex justify-center space-x-3 mb-8">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => submitCallRating(rating)}
                    className="group transform transition-all hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-12 h-12 transition-all ${
                        callQualityRating >= rating || !callQualityRating
                          ? 'text-orange-400 hover:text-orange-500 fill-orange-400 hover:fill-orange-500'
                          : 'text-gray-300 hover:text-orange-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex justify-between text-xs text-gray-500 mb-6">
                <span>Not Realistic</span>
                <span>Very Realistic</span>
              </div>

              <button
                onClick={() => setShowRatingModal(false)}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Skip Rating
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
