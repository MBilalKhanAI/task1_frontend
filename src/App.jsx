// App.jsx - React Frontend for Pakistani Legal Petition System
import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Download, CheckCircle, AlertCircle, Loader, Upload, Eye, Shield, Database, BookOpen, Scale } from 'lucide-react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://backend-9kol.onrender.com/api/v1';

// ============================================================================
// API SERVICE
// ============================================================================

const API = {
  async generatePetition(data) {
    const response = await fetch(`${API_BASE_URL}/petitions/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.detail || 'Failed to generate petition';
      throw new Error(message);
    }
    return payload;
  },

  async chat(message, sessionId) {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.detail || 'Chat failed';
      throw new Error(message);
    }
    return payload;
  },

  async finalizePetition(draftId, approverData) {
    const response = await fetch(`${API_BASE_URL}/petitions/${draftId}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approverData)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.detail || 'Failed to finalize';
      throw new Error(message);
    }
    return payload;
  },

  async downloadDocx(draftId) {
    const response = await fetch(`${API_BASE_URL}/petitions/${draftId}/docx`);
    if (!response.ok) throw new Error('Failed to download DOCX');
    return response.blob();
  },

  async getTemplates() {
    const response = await fetch(`${API_BASE_URL}/templates`);
    if (!response.ok) throw new Error('Failed to get templates');
    return response.json();
  },

  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  }
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const PetitionChatbot = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [currentDraft, setCurrentDraft] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const [templates, setTemplates] = useState([]);

  const [caseData, setCaseData] = useState({
    case_type: 'civil_revision',
    jurisdiction: 'Lahore High Court',
    facts: '',
    parties: {
      petitioner: '',
      respondent: ''
    },
    prayers: '',
    annexures: []
  });

  const messagesEndRef = useRef(null);

  // Initialize system
  useEffect(() => {
    checkSystemHealth();
    loadTemplates();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkSystemHealth = async () => {
    try {
      const health = await API.healthCheck();
      setSystemStatus(health);
      
      if (health.status === 'healthy') {
        addSystemMessage('System initialized successfully! Ready to draft petitions.');
      } else {
        addSystemMessage('Warning: System health check failed. Some features may not work.', 'warning');
      }
    } catch (error) {
      addSystemMessage('Error: Cannot connect to backend server. Please ensure the server is running.', 'error');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await API.getTemplates();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const addSystemMessage = (content, type = 'system') => {
    setMessages(prev => [...prev, {
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await API.chat(currentInput, sessionId);
      
      if (!sessionId) {
        setSessionId(response.session_id);
      }

      setMessages(prev => [...prev, {
        type: 'assistant',
        content: response.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Failed to get response. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePetition = async () => {
    if (!caseData.facts.trim()) {
      alert('Please provide case facts before generating petition');
      return;
    }

    setLoading(true);
    addSystemMessage('Generating petition... This may take 30-60 seconds.');

    try {
      const draft = await API.generatePetition(caseData);
      setCurrentDraft(draft);
      setShowDraft(true);
      addSystemMessage('✓ Petition draft generated successfully! Review the draft and validation results below.');
    } catch (error) {
      addSystemMessage(`Error generating petition: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!currentDraft) return;

    const approverName = prompt('Enter your name:');
    const approverId = prompt('Enter your Bar Council ID:');

    if (!approverName || !approverId) {
      alert('Approver details required');
      return;
    }

    setLoading(true);

    try {
      const result = await API.finalizePetition(currentDraft.draft_id, {
        draft_id: currentDraft.draft_id,
        approver_name: approverName,
        approver_id: approverId,
        notes: 'Approved for filing'
      });

      alert(`Petition finalized successfully!\nDraft ID: ${result.draft_id}\nStatus: ${result.status}`);
      addSystemMessage(`Petition finalized by ${approverName} (${approverId})`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!currentDraft) return;

    try {
      const blob = await API.downloadDocx(currentDraft.draft_id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petition_${currentDraft.draft_id}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(`Error downloading DOCX: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-blue-700 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Scale className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Pakistani Legal Petition AI</h1>
                <p className="text-blue-100 text-sm">RAG-Powered • Citation-Verified • Court-Ready</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {systemStatus && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  systemStatus.status === 'healthy' 
                    ? 'bg-green-500/20 border border-green-300' 
                    : 'bg-red-500/20 border border-red-300'
                }`}>
                  {systemStatus.status === 'healthy' ? (
                    <CheckCircle className="w-5 h-5 text-green-200" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-200" />
                  )}
                  <span className="text-sm font-semibold">
                    {systemStatus.status === 'healthy' ? 'System Active' : 'System Issue'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Case Input */}
        <div className="lg:col-span-1 space-y-6">
          {/* System Info Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-600">
            <h3 className="font-bold text-lg mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-indigo-600" />
              System Status
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">OpenAI:</span>
                <span className={`font-semibold ${systemStatus?.openai === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus?.openai || 'checking...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pinecone:</span>
                <span className={`font-semibold ${systemStatus?.pinecone === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {systemStatus?.pinecone || 'checking...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Templates:</span>
                <span className="font-semibold text-blue-600">{templates.length} loaded</span>
              </div>
            </div>
          </div>

          {/* Case Information Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Case Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Case Type
                </label>
                <select
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={caseData.case_type}
                  onChange={(e) => setCaseData(prev => ({ ...prev, case_type: e.target.value }))}
                >
                  <option value="civil_revision">Civil Revision Petition</option>
                  <option value="constitutional_writ">Constitutional Writ</option>
                  <option value="criminal_bail">Bail Application</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Jurisdiction
                </label>
                <select
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={caseData.jurisdiction}
                  onChange={(e) => setCaseData(prev => ({ ...prev, jurisdiction: e.target.value }))}
                >
                  <option value="Lahore High Court">Lahore High Court</option>
                  <option value="Sindh High Court">Sindh High Court</option>
                  <option value="Islamabad High Court">Islamabad High Court</option>
                  <option value="Peshawar High Court">Peshawar High Court</option>
                  <option value="Supreme Court">Supreme Court of Pakistan</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Petitioner Name
                </label>
                <input
                  type="text"
                  placeholder="Enter petitioner name"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={caseData.parties.petitioner}
                  onChange={(e) => setCaseData(prev => ({ 
                    ...prev, 
                    parties: { ...prev.parties, petitioner: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Respondent Name
                </label>
                <input
                  type="text"
                  placeholder="Enter respondent name"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={caseData.parties.respondent}
                  onChange={(e) => setCaseData(prev => ({ 
                    ...prev, 
                    parties: { ...prev.parties, respondent: e.target.value }
                  }))}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Facts of the Case
                </label>
                <textarea
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-40 resize-none"
                  placeholder="Provide detailed chronological facts with dates, events, and relevant circumstances..."
                  value={caseData.facts}
                  onChange={(e) => setCaseData(prev => ({ ...prev, facts: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {caseData.facts.length} characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Relief Sought (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent h-24 resize-none"
                  placeholder="Describe the relief you are seeking..."
                  value={caseData.prayers}
                  onChange={(e) => setCaseData(prev => ({ ...prev, prayers: e.target.value }))}
                />
              </div>

              <button
                onClick={handleGeneratePetition}
                disabled={loading || !caseData.facts.trim()}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Generating Petition...
                  </>
                ) : (
                  <>
                    <BookOpen className="w-5 h-5 mr-2" />
                    Generate Petition
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Middle/Right Panel - Chat & Draft */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chat Interface */}
          <div className="bg-white rounded-xl shadow-lg flex flex-col" style={{ height: '500px' }}>
            <div className="border-b px-6 py-4 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h2 className="font-bold text-lg flex items-center">
                <Send className="w-5 h-5 mr-2 text-indigo-600" />
                AI Legal Assistant
              </h2>
              <p className="text-sm text-gray-600 mt-1">Ask questions about Pakistani law and petition drafting</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-12">
                  <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Start a conversation with the AI assistant</p>
                  <p className="text-sm mt-2">Ask about legal procedures, case requirements, or petition drafting</p>
                </div>
              )}
              
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3/4 rounded-xl p-4 shadow-md ${
                      msg.type === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white'
                        : msg.type === 'error'
                        ? 'bg-red-50 text-red-900 border-2 border-red-200'
                        : msg.type === 'warning'
                        ? 'bg-yellow-50 text-yellow-900 border-2 border-yellow-200'
                        : 'bg-gray-50 text-gray-900 border-2 border-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-2 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-4 bg-gray-50">
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Ask about legal procedures, statutes, or petition requirements..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Petition Draft Preview */}
          {showDraft && currentDraft && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center">
                  <Eye className="w-6 h-6 mr-3 text-indigo-600" />
                  Petition Draft Preview
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center shadow-md hover:shadow-lg transition-all"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Finalize & Sign
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center shadow-md hover:shadow-lg transition-all"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download DOCX
                  </button>
                </div>
              </div>

              {/* Validation Results */}
              <div className="mb-6">
                <div className={`p-5 rounded-xl border-2 ${
                  currentDraft.validation.overall_score >= 0.9
                    ? 'bg-green-50 border-green-300'
                    : currentDraft.validation.overall_score >= 0.75
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Validation Results</h3>
                    <div className="text-2xl font-bold">
                      {(currentDraft.validation.overall_score * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentDraft.validation.checks.map((check, idx) => (
                      <div key={idx} className="flex items-start">
                        {check.status === 'pass' ? (
                          <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                        ) : check.status === 'warn' ? (
                          <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{check.check_name.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-sm text-gray-700">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Petition Content */}
              <div className="border-2 border-gray-200 rounded-xl p-8 bg-white shadow-inner">
                <div className="space-y-8">
                  {currentDraft.sections.map((section, idx) => {
                    const sectionTitle = section.section_name || section.title || section.label || `Section ${idx + 1}`;
                    const sectionContent = section.content || section.text || '';

                    return (
                      <div key={idx} className={`${idx < currentDraft.sections.length - 1 ? 'pb-8 border-b border-gray-300' : ''}`}>
                        <h3 className="text-2xl font-bold text-indigo-700 mb-6 pb-3 border-b-2 border-indigo-500 uppercase tracking-wide">
                          {sectionTitle}
                        </h3>
                        <div
                          className="petition-content text-gray-800 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: sectionContent }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Provenance & Citations */}
              <div className="mt-6 p-5 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Legal Sources & Citations ({currentDraft.provenance.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {currentDraft.provenance.map((source, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-blue-900 text-sm">{source.source_title}</p>
                          <p className="text-gray-600 text-xs mt-1">
                            {source.section} • Page {source.page_num} • 
                            <span className="ml-1 font-semibold text-green-600">
                              Relevance: {(source.similarity_score * 100).toFixed(0)}%
                            </span>
                          </p>
                          <p className="text-gray-700 text-xs mt-2 italic leading-relaxed">
                            "{source.text_excerpt}"
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-700">Draft ID:</span>
                    <span className="ml-2 text-gray-600 font-mono text-xs">{currentDraft.draft_id}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Template:</span>
                    <span className="ml-2 text-gray-600">{currentDraft.template_version}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-600">{new Date(currentDraft.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">Coverage:</span>
                    <span className="ml-2 text-green-600 font-semibold">
                      {(currentDraft.coverage_score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PetitionChatbot;

