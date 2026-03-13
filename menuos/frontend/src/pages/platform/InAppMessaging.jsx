import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const STATUS_COLORS = {
  open: { bg: '#dcfce7', text: '#166534' },
  closed: { bg: '#e2e8f0', text: '#475569' },
  archived: { bg: '#fef3c7', text: '#92400e' }
};

const PRIORITY_COLORS = {
  low: { bg: '#e2e8f0', text: '#475569' },
  normal: { bg: '#dbeafe', text: '#1e40af' },
  high: { bg: '#fed7aa', text: '#9a3412' },
  urgent: { bg: '#fecaca', text: '#991b1b' }
};

export default function InAppMessaging({ restaurants }) {
  const qc = useQueryClient();
  const messagesEndRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [newConvSubject, setNewConvSubject] = useState('');
  const [newConvContent, setNewConvContent] = useState('');
  const [newConvPriority, setNewConvPriority] = useState('normal');
  const [selectedRestaurant, setSelectedRestaurant] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['messaging-stats'],
    queryFn: platformApi.getMessagingStats,
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', statusFilter, priorityFilter],
    queryFn: () => platformApi.getConversations({ status: statusFilter, priority: priorityFilter }),
  });

  const { data: conversationDetail, refetch: refetchDetail } = useQuery({
    queryKey: ['conversation', selectedConversation?.id],
    queryFn: () => platformApi.getConversation(selectedConversation.id),
    enabled: !!selectedConversation,
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, content }) => platformApi.sendMessage(id, content),
    onSuccess: () => {
      refetchDetail();
      setNewMessage('');
      qc.invalidateQueries(['conversations']);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => platformApi.createConversation(data),
    onSuccess: () => {
      qc.invalidateQueries(['conversations', 'messaging-stats']);
      setShowNewConvModal(false);
      setNewConvSubject('');
      setNewConvContent('');
      setSelectedRestaurant('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => platformApi.updateConversation(id, data),
    onSuccess: () => qc.invalidateQueries(['conversations', 'conversation']),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationDetail?.messages]);

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMutation.mutate({ id: selectedConversation.id, content: newMessage });
  };

  const handleCreateConversation = () => {
    if (!selectedRestaurant || !newConvSubject.trim() || !newConvContent.trim()) return;
    createMutation.mutate({
      restaurant_id: selectedRestaurant,
      subject: newConvSubject,
      content: newConvContent,
      priority: newConvPriority
    });
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>💬 In-App Messaging</h1>
          <p style={{ color: '#64748b' }}>Direct communication with restaurant users</p>
        </div>
        <button
          onClick={() => setShowNewConvModal(true)}
          style={{
            padding: '10px 20px',
            background: '#C8A84B',
            border: 'none',
            borderRadius: 8,
            color: '#0f172a',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + New Conversation
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#16A34A' }}>{stats.open_conversations || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Open</div>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{stats.unread_messages || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Unread</div>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#C8A84B' }}>{stats.urgent_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Urgent</div>
          </div>
          <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
              {Math.round((stats.avg_response_time_seconds || 0) / 60)}m
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>Avg Response</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Conversation List */}
        <div style={{ width: 350, background: '#1e293b', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          {/* Filters */}
          <div style={{ padding: 16, borderBottom: '1px solid #334155', display: 'flex', gap: 8 }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 13 }}
            >
              <option value="">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {conversations.map((conv) => {
              const statusColors = STATUS_COLORS[conv.status];
              const priorityColors = PRIORITY_COLORS[conv.priority];
              const isSelected = selectedConversation?.id === conv.id;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: 16,
                    borderBottom: '1px solid #334155',
                    cursor: 'pointer',
                    background: isSelected ? '#0f172a' : 'transparent',
                    borderLeft: isSelected ? '3px solid #C8A84B' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      fontWeight: 600,
                      background: priorityColors.bg,
                      color: priorityColors.text,
                      textTransform: 'uppercase'
                    }}>
                      {conv.priority}
                    </span>
                    {conv.unread_count > 0 && (
                      <span style={{
                        background: '#dc2626',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4, fontSize: 14 }}>{conv.subject}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{conv.restaurant_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.last_message}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                      background: statusColors.bg,
                      color: statusColors.text,
                      textTransform: 'capitalize'
                    }}>
                      {conv.status}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>{formatTime(conv.last_message_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, background: '#1e293b', borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation ? (
            <>
              {/* Header */}
              <div style={{ padding: 20, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{selectedConversation.subject}</div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>{selectedConversation.restaurant_name} • {selectedConversation.user_name}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={selectedConversation.status}
                    onChange={(e) => updateMutation.mutate({ id: selectedConversation.id, data: { status: e.target.value } })}
                    style={{ padding: '6px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <select
                    value={selectedConversation.priority}
                    onChange={(e) => updateMutation.mutate({ id: selectedConversation.id, data: { priority: e.target.value } })}
                    style={{ padding: '6px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                {conversationDetail?.messages?.map((msg) => {
                  const isAdmin = msg.sender_type === 'platform_admin';
                  return (
                    <div key={msg.id} style={{ marginBottom: 16, display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: 12,
                        borderRadius: 12,
                        background: isAdmin ? '#C8A84B' : '#0f172a',
                        color: isAdmin ? '#0f172a' : '#e2e8f0'
                      }}>
                        <div style={{ fontSize: 12, marginBottom: 4, opacity: 0.7 }}>
                          {isAdmin ? 'You' : msg.sender_name} • {formatTime(msg.created_at)}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: 20, borderTop: '1px solid #334155' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    style={{
                      flex: 1,
                      padding: 12,
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#e2e8f0',
                      resize: 'none',
                      height: 60
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    style={{
                      padding: '12px 24px',
                      background: '#C8A84B',
                      border: 'none',
                      borderRadius: 8,
                      color: '#0f172a',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConvModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            padding: 32,
            width: '100%',
            maxWidth: 500
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>New Conversation</h2>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Restaurant</label>
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0'
                }}
              >
                <option value="">Select a restaurant...</option>
                {restaurants?.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Subject</label>
              <input
                type="text"
                value={newConvSubject}
                onChange={(e) => setNewConvSubject(e.target.value)}
                placeholder="Enter subject..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Priority</label>
              <select
                value={newConvPriority}
                onChange={(e) => setNewConvPriority(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0'
                }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 8 }}>Message</label>
              <textarea
                value={newConvContent}
                onChange={(e) => setNewConvContent(e.target.value)}
                placeholder="Type your message..."
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  minHeight: 100,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={handleCreateConversation}
                disabled={!selectedRestaurant || !newConvSubject.trim() || !newConvContent.trim() || createMutation.isPending}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#C8A84B',
                  border: 'none',
                  borderRadius: 8,
                  color: '#0f172a',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Create Conversation
              </button>
              <button
                onClick={() => setShowNewConvModal(false)}
                style={{
                  padding: '12px 24px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: 8,
                  color: '#e2e8f0',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
