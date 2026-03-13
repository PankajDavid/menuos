import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

export default function EmailTemplates() {
  const qc = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [previewVars, setPreviewVars] = useState({});
  const [testEmail, setTestEmail] = useState('');
  const [previewData, setPreviewData] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: platformApi.getEmailTemplates,
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }) => platformApi.updateEmailTemplate(key, data),
    onSuccess: () => {
      qc.invalidateQueries(['email-templates']);
      setEditMode(false);
    },
  });

  const previewMutation = useMutation({
    mutationFn: ({ key, variables }) => platformApi.previewEmailTemplate(key, variables),
    onSuccess: (data) => setPreviewData(data),
  });

  const sendTestMutation = useMutation({
    mutationFn: ({ key, to, variables }) => platformApi.sendTestEmail(key, to, variables),
  });

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setFormData({
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      is_active: template.is_active
    });
    // Initialize preview variables
    const vars = {};
    (template.variables || []).forEach(v => vars[v] = `{{${v}}}`);
    setPreviewVars(vars);
    setEditMode(true);
    setPreviewData(null);
  };

  const handleSave = () => {
    updateMutation.mutate({
      key: selectedTemplate.key,
      data: formData
    });
  };

  const handlePreview = () => {
    previewMutation.mutate({
      key: selectedTemplate.key,
      variables: previewVars
    });
  };

  const handleSendTest = () => {
    if (!testEmail) return;
    sendTestMutation.mutate({
      key: selectedTemplate.key,
      to: testEmail,
      variables: previewVars
    });
  };

  const handleToggle = (template) => {
    updateMutation.mutate({
      key: template.key,
      data: { is_active: !template.is_active }
    });
  };

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>📧 Email Templates</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Customize email notifications sent to users and customers</p>

      {!editMode ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {templates.map((template) => (
            <div 
              key={template.key} 
              style={{ 
                background: '#1e293b', 
                borderRadius: 12, 
                padding: 24,
                border: template.is_active ? '2px solid #16A34A' : '2px solid #dc2626'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{template.name}</h3>
                  <p style={{ color: '#64748b', fontSize: 14 }}>Key: <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: 4 }}>{template.key}</code></p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: 12, 
                    fontSize: 12, 
                    fontWeight: 600,
                    background: template.is_active ? '#dcfce7' : '#fee2e2',
                    color: template.is_active ? '#16A34A' : '#dc2626'
                  }}>
                    {template.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div style={{ background: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Subject:</div>
                <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{template.subject}</div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Variables:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(template.variables || []).map(v => (
                    <code key={v} style={{ background: '#334155', padding: '4px 10px', borderRadius: 6, color: '#C8A84B', fontSize: 12 }}>
                      {'{{' + v + '}}'}
                    </code>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => handleEdit(template)}
                  style={{
                    padding: '8px 16px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Edit Template
                </button>
                <button
                  onClick={() => handleToggle(template)}
                  disabled={updateMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    background: template.is_active ? '#dc2626' : '#16A34A',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {template.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Editing: {selectedTemplate.name}</h2>
            <button
              onClick={() => setEditMode(false)}
              style={{
                padding: '8px 16px',
                background: '#334155',
                border: 'none',
                borderRadius: 6,
                color: '#e2e8f0',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ← Back to List
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Editor */}
            <div>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Template Content</h3>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 14
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>HTML Body</label>
                  <textarea
                    value={formData.body_html}
                    onChange={(e) => setFormData({ ...formData, body_html: e.target.value })}
                    rows={10}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6 }}>Plain Text Body (optional)</label>
                  <textarea
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 14,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    style={{
                      padding: '10px 20px',
                      background: '#16A34A',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{
                      padding: '10px 20px',
                      background: 'transparent',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#94a3b8',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Preview Variables */}
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Preview Variables</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {Object.entries(previewVars).map(([key, value]) => (
                    <div key={key}>
                      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                        {'{{' + key + '}}'}
                      </label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => setPreviewVars({ ...previewVars, [key]: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 6,
                          color: '#e2e8f0',
                          fontSize: 14
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  style={{
                    marginTop: 16,
                    padding: '10px 20px',
                    background: '#2563EB',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Generate Preview
                </button>
              </div>
            </div>

            {/* Preview */}
            <div>
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Preview</h3>
                {previewData ? (
                  <div>
                    <div style={{ background: '#0f172a', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Subject:</div>
                      <div style={{ color: '#e2e8f0' }}>{previewData.subject}</div>
                    </div>
                    <div 
                      style={{ 
                        background: '#fff', 
                        color: '#1e293b', 
                        padding: 20, 
                        borderRadius: 6,
                        minHeight: 200
                      }}
                      dangerouslySetInnerHTML={{ __html: previewData.body_html }}
                    />
                  </div>
                ) : (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
                    Click "Generate Preview" to see how the email will look
                  </div>
                )}
              </div>

              {/* Send Test */}
              <div style={{ background: '#1e293b', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Send Test Email</h3>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      color: '#e2e8f0',
                      fontSize: 14
                    }}
                  />
                  <button
                    onClick={handleSendTest}
                    disabled={sendTestMutation.isPending || !testEmail}
                    style={{
                      padding: '10px 20px',
                      background: '#7C3AED',
                      border: 'none',
                      borderRadius: 6,
                      color: '#fff',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Send Test
                  </button>
                </div>
                {sendTestMutation.isSuccess && (
                  <div style={{ marginTop: 12, padding: 12, background: '#052e16', borderRadius: 6, color: '#22c55e', fontSize: 14 }}>
                    ✓ Test email prepared successfully!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
