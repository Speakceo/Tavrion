import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Send, Bot, User } from 'lucide-react';
import { ChatMessage } from '../types';
import { OpenAIService } from '../services/openai';
import { getAiTutorContext } from '../utils/orgSettings';

export function AITutor() {
  const { profile, organization } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    clearAndStartFresh();
  }, [profile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearAndStartFresh = async () => {
    if (!profile) return;

    // Delete all previous chat history for this user
    await supabase
      .from('ai_chat_history')
      .delete()
      .eq('user_id', profile.id);

    // Start with empty messages
    setMessages([]);
  };

  const fetchChatHistory = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    await supabase.from('ai_chat_history').insert({
      user_id: profile.id,
      message: userMessage,
      role: 'user',
      context: {}
    });

    await fetchChatHistory();

    try {
      const openai = new OpenAIService();
      const assistantResponse = await openai.chatTutor({
        userMessage,
        userRole: profile.role || 'employee',
        context: getAiTutorContext(organization),
        conversationHistory: messages.slice(-12).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.message || (m as any).content || '',
        })),
      });

      await supabase.from('ai_chat_history').insert({
        user_id: profile.id,
        message: assistantResponse,
        role: 'assistant',
        context: {}
      });
    } catch (error: any) {
      console.error('AI Tutor error:', error);
      await supabase.from('ai_chat_history').insert({
        user_id: profile.id,
        message: `I apologize, but I encountered an error: ${error.message}. Please try again or contact support if the issue persists.`,
        role: 'assistant',
        context: {}
      });
    }

    await fetchChatHistory();
    setLoading(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Tutor</h1>
          <p className="text-gray-600">Get help with your courses and learning</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-16rem)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Start a conversation with your AI tutor!</p>
                <p className="text-sm text-gray-400 mt-2">Ask questions about course content, SOPs, or best practices</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Bot className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`max-w-2xl px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.message}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="bg-gray-100 p-2 rounded-lg">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-lg">
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

          <form onSubmit={sendMessage} className="p-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your courses..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
