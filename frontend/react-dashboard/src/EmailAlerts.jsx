import { useEffect, useState } from 'react'
import axios from 'axios'
import './EmailAlerts.css'

export default function EmailAlerts({ 
  baseUrl,
  emailRecipients,
  setEmailRecipients,
  newRecipient,
  setNewRecipient,
  addEmailRecipient,
  removeEmailRecipient,
  emailAlertsEnabled,
  setEmailAlertsEnabled
}) {
  const [testEmail, setTestEmail] = useState('')
  const [emailAlerts, setEmailAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchEmailAlerts = async () => {
    setLoading(true)
    try {
      const resp = await axios.get(`${baseUrl}/alerts/email/recent`)
      setEmailAlerts(resp.data || [])
    } catch (error) {
      console.error('Failed to fetch email alerts:', error)
      setEmailAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter an email address')
      return
    }
    
    try {
      await axios.post(`${baseUrl}/send_email_alert`, { 
        recipient: testEmail,
        subject: 'Test Alert from IoT Monitor',
        message: 'This is a test email alert from your IoT monitoring system.'
      })
      alert('Test email sent successfully')
      setTestEmail('')
    } catch (error) {
      console.error('Failed to send test email:', error)
      alert('Failed to send test email')
    }
  }

  useEffect(() => {
    fetchEmailAlerts()
  }, [])

  return (
    <div className="email-alerts">
      <div className="alerts-header">
        <h1>Email Alert Management</h1>
        <p>Configure and manage your IoT monitoring email alerts</p>
      </div>

      <div className="alerts-content">
        {/* Email Alerts Toggle */}
        <div className="alert-toggle-section">
          <h3>Email Alerts Status</h3>
          <div className="email-toggle">
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={emailAlertsEnabled}
                onChange={e => setEmailAlertsEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-label">
              {emailAlertsEnabled ? 'Email Alerts Enabled' : 'Email Alerts Disabled'}
            </span>
          </div>
        </div>

        {/* Recipient Management */}
        <div className="recipient-section">
          <h3>Email Recipients</h3>
          <div className="recipient-management">
            <div className="recipient-input-group">
              <input 
                type="email" 
                value={newRecipient}
                onChange={e => setNewRecipient(e.target.value)}
                placeholder="Enter email address"
                className="email-input"
              />
              <button 
                onClick={addEmailRecipient}
                className="add-recipient-btn"
                disabled={!newRecipient}
              >
                Add Recipient
              </button>
            </div>
            
            {emailRecipients.length > 0 && (
              <div className="recipients-list">
                <h4>Current Recipients:</h4>
                {emailRecipients.map((recipient, index) => (
                  <div key={index} className="recipient-item">
                    <span className="recipient-email">{recipient}</span>
                    <button 
                      onClick={() => removeEmailRecipient(recipient)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Test Email Section */}
        <div className="test-email-section">
          <h3>Send Test Email</h3>
          <div className="test-email-form">
            <input 
              type="email" 
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="test-email-input"
            />
            <button 
              onClick={sendTestEmail}
              className="send-test-btn"
              disabled={!testEmail}
            >
              Send Test Email
            </button>
          </div>
        </div>

        {/* Recent Email Alerts */}
        <div className="recent-alerts-section">
          <div className="section-header">
            <h3>Recent Email Alerts</h3>
            <button 
              onClick={fetchEmailAlerts}
              className="refresh-btn"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          
          {loading ? (
            <div className="loading-message">
              <p>Loading email alerts...</p>
            </div>
          ) : emailAlerts.length === 0 ? (
            <div className="no-alerts-message">
              <p>No recent email alerts found.</p>
            </div>
          ) : (
            <div className="alerts-table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailAlerts.map((alert, index) => (
                    <tr key={index}>
                      <td>{new Date(alert.timestamp).toLocaleString()}</td>
                      <td>{alert.recipient}</td>
                      <td>{alert.subject}</td>
                      <td>
                        <span className={`status ${alert.status?.toLowerCase() || 'sent'}`}>
                          {alert.status || 'Sent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}