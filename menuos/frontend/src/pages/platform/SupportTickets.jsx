import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const STATUS_COLORS = {
  open: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  in_progress: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  waiting: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  resolved: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  closed: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' }
};

const PRIORITY_COLORS = {
  urgent: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16A34A'
};

const CATEGORY_LABELS = {
  general: 'General',
  billing: 'Billing',
  technical: 'Technical',
  feature_request: 'Feature Request',
  bug: 'Bug Report'
};

export default function SupportTickets() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', filters],
    queryFn: () => platformApi.getSupportTickets(filters),
  });

  const { data: stats } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: platformApi.getTicketStats,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => platformApi.updateTicket(id, data),
    onSuccess: () => qc.invalidateQueries(['support-tickets', 'ticket-stats']),
  });

  const handleStatusChange = (ticketId, status) => {
    updateMutation.mutate({ id: ticketId, data: { status } });
  };

  const handlePriorityChange = (ticketId, priority) => {
    updateMutation.mutate({ id: ticketId, data: { priority } });
  };

  const handleAssign = (ticketId, assignedTo) => {
    updateMutation.mutate({ id: ticketId, data: { assigned_to: assignedTo } });
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1400 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🎫 Support Tickets</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Manage customer support requests</p>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{stats.open_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Open Tickets</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{stats.urgent_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Urgent</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ea580c' }}>{stats.high_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>High Priority</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{stats.in_progress_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>In Progress</div>
          </div>
          <div style={{ background: '#1e293b', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{stats.resolved_count || 0}</div>
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Resolved</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
        >
          <option value="">All Categories</option>
          <option value="general">General</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="feature_request">Feature Request</option>
          <option value="bug">Bug Report</option>
        </select>
        <button
          onClick={() => setFilters({ status: '', priority: '', category: '' })}
          style={{ padding: '10px 16px', background: '#334155', border: 'none', borderRadius: 8, color: '#e2e8f0', cursor: 'pointer' }}
        >
          Clear Filters
        </button>
      </div>

      {/* Tickets Table */}
      <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Ticket', 'User/Restaurant', 'Subject', 'Category', 'Priority', 'Status', 'Assigned', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const statusColors = STATUS_COLORS[ticket.status];
                return (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#C8A84B' }}>{ticket.ticket_number}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{ticket.user_name || 'Unknown'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{ticket.user_email}</div>
                      {ticket.restaurant_name && (
                        <div style={{ fontSize: 11, color: '#2563EB' }}>🏪 {ticket.restaurant_name}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: 300 }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ticket.subject}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: '#334155', color: '#e2e8f0' }}>
                        {CATEGORY_LABELS[ticket.category]}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={ticket.priority}
                        onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: PRIORITY_COLORS[ticket.priority] + '20',
                          color: PRIORITY_COLORS[ticket.priority],
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: statusColors.bg,
                          color: statusColors.text,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {ticket.assigned_to_name ? (
                        <span style={{ color: '#16A34A', fontSize: 13 }}>👤 {ticket.assigned_to_name}</span>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: 13 }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                        style={{
                          padding: '6px 12px',
                          background: selectedTicket?.id === ticket.id ? '#C8A84B' : '#334155',
                          border: 'none',
                          borderRadius: 6,
                          color: selectedTicket?.id === ticket.id ? '#0f172a' : '#e2e8f0',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {selectedTicket?.id === ticket.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
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
          zIndex: 1000,
          padding: 32
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: 16,
            width: '100%',
            maxWidth: 800,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: 24, borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{selectedTicket.subject}</h2>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ color: '#64748b', fontSize: 13 }}>#{selectedTicket.ticket_number}</span>
                    <span style={{ color: '#64748b', fontSize: 13 }}>by {selectedTicket.user_name}</span>
                    <span style={{ color: '#64748b', fontSize: 13 }}>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: '#0f172a', padding: 20, borderRadius: 8, marginBottom: 24 }}>
                <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{selectedTicket.description}</p>
              </div>

              {/* Messages would go here - simplified for now */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Conversation</h3>
                <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
                  Messages feature coming soon...
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                  style={{
                    padding: '10px 20px',
                    background: '#16A34A',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                  style={{
                    padding: '10px 20px',
                    background: '#64748b',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Close Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
