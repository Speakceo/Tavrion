import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Radio, Mic, PhoneOff, TrendingUp, Award, Clock, AlertCircle, Sparkles, DollarSign, MapPin, Shield, Users, FileText, X, Heart, Accessibility, Globe, Moon, Zap, Star } from 'lucide-react';

type ScenarioType = 'budget_concern' | 'location_specific' | 'safety_parent' | 'amenities_luxury' | 'urgent_booking' | 'payment_issues' | 'roommate_issues' | 'lease_negotiation' | 'maintenance_complaints' | 'cancellation_refund' | 'group_booking' | 'pet_friendly' | 'accessibility_needs' | 'cultural_dietary' | 'late_night_inquiry' | 'competitive_offer';

interface Message {
  role: 'agent' | 'customer';
  message: string;
  timestamp: Date;
}

interface LiveCallSession {
  id: string;
  user_id: string;
  scenario_type: ScenarioType;
  scenario_details: any;
  duration: number;
  transcript: Message[];
  score?: number;
  feedback?: any;
  completed_at: string;
}

const scenarios = [
  {
    type: 'budget_concern' as ScenarioType,
    title: 'Budget-Conscious Student',
    character: 'Priya',
    description: 'Price-sensitive student comparing options and worried about hidden costs',
    icon: DollarSign,
    systemPrompt: 'You are Priya, a 19-year-old international student from India on a tight budget. Every dollar matters to you. You compare everything, ask about hidden fees, mention cheaper options you found online, and get nervous when prices seem too high. You want accommodation but are scared of overspending. React with relief when things are affordable, concern when they\'re expensive. Be polite but persistent about costs. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'nova'
  },
  {
    type: 'location_specific' as ScenarioType,
    title: 'Location-Focused Student',
    character: 'Jake',
    description: 'Concerned about distance to campus, neighborhood safety, and local amenities',
    icon: MapPin,
    systemPrompt: 'You are Jake, a student very concerned about location. Ask about distance to campus, public transportation, neighborhood safety, nearby grocery stores, and local amenities. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Easy',
    voice: 'onyx'
  },
  {
    type: 'safety_parent' as ScenarioType,
    title: 'Concerned Parent',
    character: 'Mrs. Chen',
    description: 'Protective parent worried about daughter\'s safety and accommodation security',
    icon: Shield,
    systemPrompt: 'You are Mrs. Chen, a protective mother booking accommodation for your 18-year-old daughter who will be living alone for the first time in a foreign country. You need to be ABSOLUTELY certain she will be safe. You ask detailed questions about locks, security cameras, who has access to buildings, emergency procedures, lighting, and neighborhood safety. You won\'t accept vague answers like "it\'s safe" - you need specific details. Show anxiety about your daughter\'s safety. Keep responses 1-3 sentences. Only relax when given concrete security information.',
    difficulty: 'Hard',
    voice: 'shimmer'
  },
  {
    type: 'amenities_luxury' as ScenarioType,
    title: 'Premium Seeker',
    character: 'Mohammed',
    description: 'High expectations for amenities, quality, and service standards',
    icon: Award,
    systemPrompt: 'You are Mohammed, a student with high expectations for quality. Ask about premium amenities, room quality, maintenance standards, and service levels. You are willing to pay more for better quality. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'onyx'
  },
  {
    type: 'urgent_booking' as ScenarioType,
    title: 'Urgent Booking',
    character: 'Lisa',
    description: 'Stressed student with immediate accommodation needs and scam concerns',
    icon: Clock,
    systemPrompt: 'You are Lisa, a panicked student who just got accepted off a waitlist and needs to move in within 3-4 days. You\'re stressed, speaking quickly, and worried you\'ll get scammed because you have to decide so fast. You keep asking "how quickly can I move in?" and "is this legitimate?" You want to believe them but you\'re scared. Show urgency and anxiety. Get frustrated if the agent is too slow or unclear. Keep responses 2-3 sentences.',
    difficulty: 'Hard',
    voice: 'nova'
  },
  {
    type: 'payment_issues' as ScenarioType,
    title: 'Payment Complications',
    character: 'Raj',
    description: 'International student facing guarantor and payment transfer challenges',
    icon: Users,
    systemPrompt: 'You are Raj, an international student with payment concerns. Ask about guarantor requirements, international payment methods, currency conversion, and payment schedules. Express concern about financial logistics. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'onyx'
  },
  {
    type: 'roommate_issues' as ScenarioType,
    title: 'Roommate Concerns',
    character: 'Sofia',
    description: 'PhD student with bad roommate history seeking control over living arrangements',
    icon: Users,
    systemPrompt: 'You are Sofia, a PhD student who had bad roommate experiences. Ask about roommate matching process, private room options, quiet hours, and whether you can choose roommates. Express concern about compatibility. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'shimmer'
  },
  {
    type: 'lease_negotiation' as ScenarioType,
    title: 'Lease Negotiation',
    character: 'David',
    description: 'Experienced mature student who knows tenant rights and negotiates terms',
    icon: FileText,
    systemPrompt: 'You are David, a 28-year-old mature student who has rented many places before and knows his rights. You\'re confident and assertive. You question anything that seems unfair, reference tenant laws, and negotiate professionally. You push back on unreasonable deposits, ask about lease break clauses, and want flexibility. You\'re friendly but firm - you won\'t be taken advantage of. If the agent gives you a standard "that\'s just our policy," challenge it respectfully. Keep responses 2-3 sentences.',
    difficulty: 'Hard',
    voice: 'onyx'
  },
  {
    type: 'maintenance_complaints' as ScenarioType,
    title: 'Maintenance Worries',
    character: 'Emma',
    description: 'Student with past maintenance nightmares needing response time reassurance',
    icon: AlertCircle,
    systemPrompt: 'You are Emma, a student who had terrible maintenance experiences before. Ask about maintenance response times, how to report issues, past maintenance problems, and express anxiety about potential issues. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Easy',
    voice: 'nova'
  },
  {
    type: 'cancellation_refund' as ScenarioType,
    title: 'Cancellation Anxiety',
    character: 'Marcus',
    description: 'Risk-averse student worried about visa rejection and deposit loss',
    icon: X,
    systemPrompt: 'You are Marcus, a risk-averse student worried about visa rejection. Ask repeatedly about cancellation policy, refund terms, what happens if visa is rejected, and express anxiety about losing money. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'onyx'
  },
  {
    type: 'group_booking' as ScenarioType,
    title: 'Group Booking',
    character: 'Aisha',
    description: 'Organizer seeking group discount and coordinating multiple friends',
    icon: Users,
    systemPrompt: 'You are Aisha, organizing accommodation for you and 3-4 friends. Ask about group discounts, nearby rooms, group booking process, and coordinating multiple applications. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'shimmer'
  },
  {
    type: 'pet_friendly' as ScenarioType,
    title: 'Emotional Support Pet',
    character: 'Tom',
    description: 'Grad student with service dog facing discrimination and legal concerns',
    icon: Heart,
    systemPrompt: 'You are Tom, a grad student with a registered emotional support dog. Assert your legal rights, ask about pet policies, express frustration if you sense discrimination, and provide documentation readiness. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Hard',
    voice: 'onyx'
  },
  {
    type: 'accessibility_needs' as ScenarioType,
    title: 'Accessibility Requirements',
    character: 'Fatima',
    description: 'Wheelchair user tired of false accessibility claims needing specifics',
    icon: Accessibility,
    systemPrompt: 'You are Fatima, a 21-year-old wheelchair user who is EXHAUSTED from landlords claiming places are "accessible" when they\'re not. You\'ve been burned before. You ask hyper-specific questions: exact door widths in centimeters, threshold heights, grab bar locations, shower chair space, turning radius in bathrooms. When agents say "yes it\'s accessible," you respond with skepticism and demand specifics. You\'re polite but direct - you NEED real measurements and details, not promises. Show frustration with vague answers but relief with concrete information. Keep responses 2-3 sentences.',
    difficulty: 'Hard',
    voice: 'shimmer'
  },
  {
    type: 'cultural_dietary' as ScenarioType,
    title: 'Cultural & Dietary Needs',
    character: 'Hassan',
    description: 'Muslim student requiring halal kitchen and prayer space',
    icon: Globe,
    systemPrompt: 'You are Hassan, a Muslim student with specific cultural needs. Ask about halal kitchen facilities, prayer space, cultural diversity in building, and whether your needs can be accommodated. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Medium',
    voice: 'onyx'
  },
  {
    type: 'late_night_inquiry' as ScenarioType,
    title: 'Late Night Inquiry',
    character: 'Alex',
    description: 'Busy professional expecting service outside business hours',
    icon: Moon,
    systemPrompt: 'You are Alex, a busy professional student contacting late at night. Express frustration about difficulty reaching someone, ask about 24/7 support, and mention you can only communicate outside business hours. Keep responses natural and conversational, 1-3 sentences max.',
    difficulty: 'Easy',
    voice: 'alloy'
  },
  {
    type: 'competitive_offer' as ScenarioType,
    title: 'Competitive Offer',
    character: 'Nina',
    description: 'Savvy negotiator with multiple offers seeking best deal',
    icon: Zap,
    systemPrompt: 'You are Nina, a confident 22-year-old grad student who has THREE other accommodation offers and you know it gives you leverage. You casually mention what competitors are offering ("XYZ Housing is giving me a $200 discount..." or "ABC Apartments includes utilities..."). You\'re not rude but you\'re definitely negotiating. You want the best deal and you\'re not afraid to play offers against each other. If they match or beat other offers, you\'re ready to commit. Show interest but make it clear you have options. Keep responses 2-3 sentences.',
    difficulty: 'Hard',
    voice: 'nova'
  }
];

export function LiveCalls() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<LiveCallSession[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);
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

    const { data } = await supabase
      .from('live_call_sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (data) setSessions(data);
  };

  const speakText = async (text: string, voice: string = 'nova') => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(true);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'text-to-speech',
          text: text,
          voice: voice
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
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

  const analyzeAgentResponse = (agentMessage: string): string => {
    const msg = agentMessage.toLowerCase();

    if (msg.includes('unfortunately') || msg.includes('not available') || msg.includes('cannot') || msg.includes('can\'t')) {
      return '\n\nIMPORTANT: The agent just declined or said something is unavailable. Show disappointment or concern. Either ask for alternatives or express how important this is to you.';
    }

    if (msg.includes('$') || msg.includes('price') || msg.includes('cost') || msg.includes('per month') || msg.includes('deposit')) {
      return '\n\nIMPORTANT: The agent mentioned pricing. React based on your character - is it affordable? too expensive? Ask what\'s included or if there are any discounts.';
    }

    if (msg.includes('?')) {
      return '\n\nIMPORTANT: The agent asked YOU a question. Answer it directly and naturally, then you can add your own question or concern if relevant.';
    }

    if (msg.length < 30) {
      return '\n\nIMPORTANT: The agent gave a very brief response. Press for more specific details or clarification about what you care about.';
    }

    if (msg.includes('available') || msg.includes('we have') || msg.includes('we offer') || msg.includes('we can')) {
      return '\n\nIMPORTANT: The agent is offering something. Show interest but ask practical follow-up questions relevant to your specific concerns.';
    }

    return '';
  };

  const getAIResponse = async (conversationHistory: Message[], isNewCall: boolean = false): Promise<string> => {
    try {
      const scenario = scenarios.find(s => s.type === selectedScenario);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      if (isNewCall) {
        const messages = [
          {
            role: 'system',
            content: `${scenario.systemPrompt}

CRITICAL: You are calling AmberStudent, a student accommodation booking platform. You are ONLY interested in finding and booking student housing through AmberStudent. DO NOT discuss any other topics or services.

You are ${scenario.character} making your FIRST call to AmberStudent accommodation service. Start naturally with a brief greeting and IMMEDIATELY express your primary concern about STUDENT ACCOMMODATION. Be authentic and show your personality. Keep it to 1-2 sentences maximum.

Example style (adapt to your character):
- "Hi, I'm looking for student accommodation but I'm really worried about [main concern]"
- "Hello! I need help finding a place near my university. The thing is, [specific situation/concern]"

REMEMBER: You are ONLY here to discuss AmberStudent's accommodation services. Stay focused on housing-related topics like pricing, location, safety, amenities, booking process, lease terms, move-in dates, etc.

Be natural, direct, and show emotion. Start your call now:`
          },
          {
            role: 'user',
            content: 'Begin the call now.'
          }
        ];

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'chat',
            messages: messages,
            model: 'anthropic/claude-3.5-sonnet',
            temperature: 0.8,
            max_tokens: 150
          })
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        return data.message || 'Hello, I have a question about accommodation.';
      }

      const lastMessage = conversationHistory[conversationHistory.length - 1];
      const conversationLog = conversationHistory.slice(-6).map(msg =>
        `${msg.role === 'agent' ? 'Agent' : scenario.character}: ${msg.message}`
      ).join('\n');

      const agentResponseQuality = analyzeAgentResponse(lastMessage.message);

      const messages = [
        {
          role: 'system',
          content: `${scenario.systemPrompt}

CRITICAL: You are calling AmberStudent about STUDENT ACCOMMODATION ONLY. If the agent goes off-topic or discusses anything other than housing services, redirect the conversation back to accommodation immediately. Say something like "That's nice, but what about the accommodation?" or "I really need to focus on finding housing first."

CONTEXT - You are in the middle of a phone call with an AmberStudent agent about STUDENT HOUSING:
${conversationLog}

The agent just said: "${lastMessage.message}"

Respond NATURALLY as ${scenario.character}. React authentically based on:
1. What the agent ACTUALLY said (helpful? vague? addressing your concern?)
2. Your character's personality and emotional state
3. The conversation flow
4. WHETHER THEY ARE STAYING ON-TOPIC (student accommodation services)

RESPONSE RULES:
- Acknowledge what the agent said (positive or negative)
- Show genuine emotion (worry, relief, skepticism, excitement) when appropriate
- Ask follow-up questions that YOUR character would naturally ask ABOUT ACCOMMODATION
- If the agent avoided your question, press them for specifics
- If something doesn't match your needs, say so clearly
- If the agent discusses anything other than student housing, redirect immediately
- Be conversational - 1-3 sentences maximum
- Sound like a real person on a real phone call about finding student housing
${agentResponseQuality}`
        },
        {
          role: 'user',
          content: 'Respond to the agent naturally based on what they just said.'
        }
      ];

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: messages,
          model: 'anthropic/claude-3.5-sonnet',
          temperature: 0.8,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      return data.message || 'I see. Can you tell me more about that?';
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      throw error;
    }
  };

  const getAgentResponse = async (conversationHistory: Message[]): Promise<string> => {
    try {
      const scenario = scenarios.find(s => s.type === selectedScenario);
      if (!scenario) throw new Error('Scenario not found');

      const conversationLog = conversationHistory.slice(-6).map(msg =>
        `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.message}`
      ).join('\n');

      const messages = [
        {
          role: 'system',
          content: `You are a highly skilled customer service agent for AmberStudent, a student accommodation booking platform. Your ONLY job is to help students find and book STUDENT ACCOMMODATION.

CRITICAL: ONLY discuss student accommodation services. Topics you can discuss:
- Accommodation pricing, features, and amenities
- Location and proximity to universities
- Safety and security features
- Booking process and lease terms
- Payment options and schedules
- Move-in dates and availability
- Roommate matching and room types
- Maintenance and support services
- Cancellation and refund policies

DO NOT discuss any other topics or services. If the customer asks about something unrelated, politely redirect to accommodation services.

Key skills:
- Be empathetic and understanding of student concerns about HOUSING
- Provide specific, actionable information about ACCOMMODATION (mention real features, pricing ranges like $800-1500/month, timelines)
- Address objections professionally with concrete solutions related to HOUSING
- Build trust through detailed, honest answers about ACCOMMODATION SERVICES
- Use a warm, conversational tone
- Close positively when appropriate

Current scenario: ${scenario.title} - ${scenario.description}
Character: ${scenario.character}

Recent conversation about STUDENT ACCOMMODATION:
${conversationLog}

The customer just said: "${conversationHistory[conversationHistory.length - 1].message}"

Provide a helpful, professional response ABOUT STUDENT ACCOMMODATION. Be specific with housing details. Keep it natural and conversational (2-3 sentences max). Address their housing concerns directly and make them feel heard.`
        },
        {
          role: 'user',
          content: 'Respond to the customer professionally and helpfully.'
        }
      ];

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: messages,
          model: 'openai/gpt-4o',
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get agent response');
      }

      const data = await response.json();
      return data.message || 'Thank you for your question. How can I help you further?';
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
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                const base64Audio = reader.result?.toString().split(',')[1];

                if (base64Audio) {
                  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({
                      action: 'speech-to-text',
                      audioData: base64Audio
                    })
                  });

                  if (response.ok) {
                    const data = await response.json();
                    if (data.text && data.text.trim()) {
                      await sendMessageFromUser(data.text.trim());
                    }
                  } else {
                    alert('Failed to transcribe audio. Please try again.');
                  }
                }
              };
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

      const scenario = scenarios.find(s => s.type === selectedScenario);
      await speakText(aiResponse, scenario?.voice || 'nova');
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

        const scenario = scenarios.find(s => s.type === selectedScenario);
        await speakText(customerResponse, scenario?.voice || 'nova');

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

      const scenario = scenarios.find(s => s.type === selectedScenario);
      await speakText(greeting, scenario?.voice || 'nova');

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

  const evaluateCall = async (transcript: Message[]): Promise<any> => {
    try {
      const scenario = scenarios.find(s => s.type === selectedScenario);
      const conversationLog = transcript.map(msg =>
        `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.message}`
      ).join('\n');

      const messages = [
        {
          role: 'system',
          content: `You are evaluating a customer service call for AmberStudent student accommodation booking. The scenario was: ${scenario?.title} - ${scenario?.description}

Conversation transcript:
${conversationLog}

Evaluate the agent's performance on handling this STUDENT ACCOMMODATION call. Consider:
- Did the agent stay focused on AmberStudent's student housing services?
- Were they empathetic and understanding of student concerns?
- Did they provide specific, helpful information about accommodation?
- Did they address the customer's unique scenario effectively?
- Was the conversation professional and natural?
- Did they handle objections or concerns well?

Provide:
1. A score from 0-100
2. Brief overall feedback (2-3 sentences) about their accommodation sales skills
3. 3 key strengths specific to this housing scenario
4. 3 areas for improvement in student accommodation sales

Format your response as JSON:
{
  "score": <number>,
  "feedback": "<string>",
  "strengths": ["<string>", "<string>", "<string>"],
  "improvements": ["<string>", "<string>", "<string>"]
}`
        },
        {
          role: 'user',
          content: 'Evaluate the call performance now.'
        }
      ];

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/live-call-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: messages,
          model: 'openai/gpt-4o',
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonMatch = data.message.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return {
        score: 75,
        feedback: 'Call completed. Good effort in handling the customer interaction.',
        strengths: [
          'Professional communication',
          'Engaged with customer concerns',
          'Maintained conversation flow'
        ],
        improvements: [
          'Provide more specific details',
          'Address objections more directly',
          'Show more empathy'
        ]
      };
    } catch (error) {
      console.error('Error evaluating call:', error);
      return {
        score: 70,
        feedback: 'Call completed successfully.',
        strengths: ['Engaged with customer', 'Professional approach', 'Clear communication'],
        improvements: ['Provide more details', 'Handle objections better', 'Be more proactive']
      };
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
        scenario_type: selectedScenario!,
        scenario_details: {
          character: scenarios.find(s => s.type === selectedScenario)?.character
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
            <p className="text-orange-100 text-lg">Practice realistic AmberStudent scenarios with OpenRouter AI-powered voice conversations</p>
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
            <p className="text-gray-600 mb-6">Select a realistic AmberStudent customer situation to practice with live voice interaction powered by OpenRouter AI</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.type}
                  onClick={() => setSelectedScenario(scenario.type)}
                  className={`p-5 rounded-xl border-2 transition-all text-left hover:scale-105 ${
                    selectedScenario === scenario.type
                      ? 'border-orange-600 bg-orange-50 shadow-lg'
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
                    : 'Powered by OpenRouter AI - Voice Recording, Speech-to-Text (Whisper), Text-to-Speech (OpenAI) & Claude 3.5 Sonnet'
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
                    {scenarios.find(s => s.type === selectedScenario)?.title} - {scenarios.find(s => s.type === selectedScenario)?.character}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-400 text-white">
                      <Radio className="w-3 h-3 animate-pulse" />
                      <span>LIVE - OpenRouter AI + OpenAI Voice</span>
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
                      {msg.role === 'agent' ? 'You' : scenarios.find(s => s.type === selectedScenario)?.character}
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
                const scenario = scenarios.find(s => s.type === session.scenario_type);
                return (
                  <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {scenario && <scenario.icon className="w-5 h-5 text-gray-600" />}
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
