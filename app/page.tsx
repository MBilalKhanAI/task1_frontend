'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown, Download, Scale, FileText, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  conversationId?: string;
  legalContext?: string[];
}

// Use same-origin proxy routes by default to avoid CORS; allow override via env
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<string | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/petition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversation_history: messages.slice(-10),
        })
      });

      if (!response.ok) throw new Error('Failed to generate petition');

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.petition,
        conversationId: data.conversation_id,
        legalContext: data.legal_context,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error generating your petition. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (rating: 'up' | 'down', message: Message) => {
    if (!message.conversationId) return;
    if (rating === 'down' && !feedbackMode) {
      setFeedbackMode(message.conversationId);
      return;
    }
    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: message.conversationId,
          rating,
          comment: feedbackComment || null,
          petition_text: message.content,
        })
      });
      setShowFeedbackSuccess(true);
      setTimeout(() => setShowFeedbackSuccess(false), 3000);
      setFeedbackMode(null);
      setFeedbackComment('');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const downloadPetition = () => {
    const petitionText = messages.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n---\n\n');
    const blob = new Blob([petitionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `petition_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Legal Petition Drafter</h1>
                <p className="text-sm text-slate-400">AI-Powered Pakistani Court Petitions</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={downloadPetition} className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">
                <Download className="w-4 h-4" />
                <span className="font-medium">Download</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {messages.length === 0 && (
          <div className="text-center py-20 space-y-8">
            <div className="inline-block p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-2xl">
              <FileText className="w-16 h-16 text-amber-500" />
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-bold text-white">Welcome to Legal Petition Drafter</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">Describe your legal case and I'll draft a formal petition specifically formatted for Pakistani courts</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-3xl mx-auto">
              {[
                { icon: Sparkles, title: 'AI-Powered', desc: 'Advanced legal AI assistance' },
                { icon: Scale, title: 'Court-Ready', desc: 'Properly formatted petitions' },
                { icon: FileText, title: 'Legal Context', desc: 'Backed by legal references' },
              ].map((feature, idx) => (
                <div key={idx} className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                  <feature.icon className="w-8 h-8 text-amber-500 mb-3 mx-auto" />
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6 mb-8 pb-44">
          {messages.map((message, idx) => (
            <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-6 py-4 ${message.role === 'user' ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-800/80 text-slate-100 border border-slate-700/50 backdrop-blur-sm'}`}>
                <div className="flex items-start space-x-3">
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mt-1">
                      <Scale className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-sm leading-relaxed">
                        {message.content}
                      </ReactMarkdown>
                    </div>

                    {message.legalContext && message.legalContext.length > 0 && (
                      <details className="mt-4 text-xs">
                        <summary className="cursor-pointer text-amber-400 hover:text-amber-300 font-medium">View Legal References ({message.legalContext.length})</summary>
                        <div className="mt-2 space-y-2 pl-4 border-l-2 border-amber-500/30">
                          {message.legalContext.map((context, i) => (
                            <div key={i} className="text-slate-400 text-xs">
                              <span className="text-amber-500 font-semibold">Reference {i + 1}:</span>
                              <p className="mt-1">{context.substring(0, 200)}...</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {message.role === 'assistant' && message.conversationId && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center space-x-2">
                        {feedbackMode === message.conversationId ? (
                          <div className="w-full space-y-2">
                            <textarea
                              value={feedbackComment}
                              onChange={(e) => setFeedbackComment(e.target.value)}
                              placeholder="What could be improved? (optional)"
                              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <button onClick={() => handleFeedback('down', message)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors">Submit</button>
                              <button onClick={() => { setFeedbackMode(null); setFeedbackComment(''); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => handleFeedback('up', message)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors group" title="Good response">
                              <ThumbsUp className="w-4 h-4 text-slate-400 group-hover:text-green-400" />
                            </button>
                            <button onClick={() => handleFeedback('down', message)} className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors group" title="Needs improvement">
                              <ThumbsDown className="w-4 h-4 text-slate-400 group-hover:text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl px-6 py-4 bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Scale className="w-4 h-4 text-white animate-pulse" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-slate-400 text-sm">Drafting your petition...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showFeedbackSuccess && (
          <div className="fixed bottom-24 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fade-in">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Thank you for your feedback!</span>
          </div>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent pt-8 pb-6">
          <div className="max-w-5xl mx-auto px-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/20">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                  placeholder="Describe your legal case in detail (e.g., 'I need a civil petition for property dispute regarding inheritance...')"
                  className="w-full px-6 py-4 bg-transparent text-white placeholder-slate-500 focus:outline-none resize-none min-h-[60px] max-h-[200px]"
                  rows={1}
                  disabled={loading}
                />
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
                  <p className="text-xs text-slate-500">Press Enter to send, Shift+Enter for new line</p>
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <span>{loading ? 'Drafting...' : 'Send'}</span>
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}


