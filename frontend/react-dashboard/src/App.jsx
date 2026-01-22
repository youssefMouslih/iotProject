import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import './App.css'
import plotlyFactory from 'react-plotly.js/factory'
import PlotlyBasic from 'plotly.js-basic-dist'
import HistoricalAnalyticsComponent from './HistoricalAnalytics.jsx'
import EmailAlertsComponent from './EmailAlerts.jsx'

const createPlotlyComponent = plotlyFactory.default || plotlyFactory
const Plot = createPlotlyComponent(PlotlyBasic)

function Metrics({ status, latest, threshold, minThreshold, connectionStatus }) {
  const getStatusColor = (isAlert) => isAlert ? '#ff4444' : '#44ff44'
  
  const isInAlert = latest?.temperature > threshold || latest?.temperature < minThreshold
  
  return (
    <div className="metrics">
      <div className={`alert-banner ${isInAlert ? 'active' : ''}`}>
        {isInAlert ? (
          <>
            <span className="alert-icon">⚠️</span>
            <span className="alert-text">
              ALERT: Temperature {latest?.temperature > threshold ? 'HIGH' : 'LOW'} - {latest?.temperature?.toFixed(1)}°C
            </span>
          </>
        ) : (
          <span className="status-text">System Normal</span>
        )}
      </div>
      
      <div className="connection-status">
        <span className={`status-indicator ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '🟢' : '🔴'}
        </span>
        <span>Connection: {connectionStatus}</span>
      </div>
      
      <div className="metric-cards">
        <div className="metric-card">
          <div className="metric-label">Temperature</div>
          <div className="metric-value" style={{color: getStatusColor(isInAlert)}}>
            {latest?.temperature?.toFixed(1) ?? '--'}°C
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Humidity</div>
          <div className="metric-value">{latest?.humidity?.toFixed(1) ?? '--'}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Status</div>
          <div className="metric-value" style={{color: getStatusColor(status?.alert)}}>
            {status?.alert ? 'ALERT' : 'OK'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Source</div>
          <div className="metric-value">{latest?.temperature_source || 'N/A'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outdoor Temp</div>
          <div className="metric-value">{latest?.outdoor_temperature != null ? (Number.isFinite(latest.outdoor_temperature) ? `${latest.outdoor_temperature.toFixed(1)}°C` : `${latest.outdoor_temperature}°C`) : '--°C'}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Weather</div>
          <div className="metric-value">{latest?.weather_condition || 'N/A'}</div>
        </div>
      </div>
      
      <div className="threshold-info">
        <div className="threshold-range">
          <span>Range: {minThreshold}°C - {threshold}°C</span>
        </div>
      </div>
    </div>
  )
}

function Sidebar({ 
  currentPage, 
  setCurrentPage, 
  threshold, 
  minThreshold, 
  setThreshold, 
  setMinThreshold,
  showSettings,
  setShowSettings,
  sidebarVisible,
  setSidebarVisible,
  // connectionStatus,
}) {
  const updateThreshold = async (newThreshold) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/config/thresholds`, {
        max_threshold: newThreshold,
        min_threshold: minThreshold
      })
    } catch (error) {
      console.error('Failed to update threshold:', error)
    }
  }

  const updateMinThreshold = async (newMinThreshold) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/config/thresholds`, {
        max_threshold: threshold,
        min_threshold: newMinThreshold
      })
    } catch (error) {
      console.error('Failed to update min threshold:', error)
    }
  }

  return (
    <div className={`sidebar ${sidebarVisible ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <h2>Dashboard Monitor</h2>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? '⚙️' : '⚙️'}
        </button>
          {/* mobile close */}
          <button className="mobile-close" onClick={() => setSidebarVisible(false)} aria-label="Close menu">✕</button>
        </div>
      </div>
      
      {/* <div className="connection-status">
        <span className={`status-indicator ${connectionStatus}`}>
          {connectionStatus === 'connected' ? '🟢' : '🔴'}
        </span>
        <span>{connectionStatus}</span>
      </div> */}
      
      <div className="navigation">
        <button 
          className={currentPage === 'live' ? 'active' : ''}
          onClick={() => setCurrentPage('live')}
        >
          📊 Live Dashboard
        </button>
        <button 
          className={currentPage === 'historical' ? 'active' : ''}
          onClick={() => setCurrentPage('historical')}
        >
          📈 Historical Analytics
        </button>
        <button 
          className={currentPage === 'email' ? 'active' : ''}
          onClick={() => setCurrentPage('email')}
        >
          📧 Email Alerts
        </button>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <div className="settings-section">
            <h3>Alert Configuration</h3>
            <div className="setting-group">
              <label>Max Temperature Threshold (°C)</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => {
                  const newThreshold = parseFloat(e.target.value)
                  setThreshold(newThreshold)
                  updateThreshold(newThreshold)
                }}
                min={minThreshold + 1}
                max={100}
                step={0.1}
              />
            </div>
            <div className="setting-group">
              <label>Min Temperature Threshold (°C)</label>
              <input
                type="number"
                value={minThreshold}
                onChange={(e) => {
                  const newMinThreshold = parseFloat(e.target.value)
                  setMinThreshold(newMinThreshold)
                  updateMinThreshold(newMinThreshold)
                }}
                min={-50}
                max={threshold - 1}
                step={0.1}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LiveChart({ data, threshold, minThreshold }) {
  const chartData = [
    {
      x: (data || []).filter(d => d && d.timestamp && !Number.isNaN(new Date(d.timestamp).getTime())).map(d => new Date(d.timestamp)),
      y: (data || []).filter(d => d && d.timestamp && !Number.isNaN(new Date(d.timestamp).getTime())).map(d => d.temperature),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Temperature',
      line: { color: '#1f77b4' },
      yaxis: 'y'
    },
    {
      x: (data || []).filter(d => d && d.timestamp && !Number.isNaN(new Date(d.timestamp).getTime())).map(d => new Date(d.timestamp)),
      y: (data || []).filter(d => d && d.timestamp && !Number.isNaN(new Date(d.timestamp).getTime())).map(d => d.humidity),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Humidity',
      line: { color: '#2ca02c' },
      yaxis: 'y2'
    }
  ]

  const layout = {
    title: 'Live Sensor Data',
    xaxis: { title: 'Time' },
    yaxis: { title: 'Temperature (°C)', range: [minThreshold - 5, threshold + 5] },
    yaxis2: { title: 'Humidity (%)', overlaying: 'y', side: 'right' },
    shapes: [
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: threshold,
        y1: threshold,
        yref: 'y',
        line: { color: '#ff0000', width: 2, dash: 'dash' }
      },
      {
        type: 'line',
        x0: 0,
        x1: 1,
        xref: 'paper',
        y0: minThreshold,
        y1: minThreshold,
        yref: 'y',
        line: { color: '#0000ff', width: 2, dash: 'dash' }
      }
    ],
    height: 400
  }

  return (
    <div className="chart-container">
      <Plot data={chartData} layout={layout} useResizeHandler style={{ width: '100%', height: '400px' }} />
    </div>
  )
}

function App() {
  // Get API URL - prioritize env variable, then compute from current location
  const getDefaultApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) return envUrl;
    
    // Fallback: use current host with port 8003
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8003`;
  };
  
  const [baseUrl, setBaseUrl] = useState(getDefaultApiUrl())
  const [threshold, setThreshold] = useState(35)
  const [minThreshold, setMinThreshold] = useState(10)
  const [status, setStatus] = useState(null)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [currentPage, setCurrentPage] = useState('live')
  const [showSettings, setShowSettings] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [alertAudio, setAlertAudio] = useState(null)
  const [currentAlertState, setCurrentAlertState] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState(['admin@example.com'])
  const [newRecipient, setNewRecipient] = useState('')
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)

  // Initialize alert audio
  useEffect(() => {
    const createBeep = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext
        if (!AudioContextClass) {
          console.log('Web Audio API not supported')
          return null
        }
        const audioContext = new AudioContextClass()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.1
        
        return { oscillator, gainNode, audioContext }
      } catch (error) {
        console.log('Failed to create audio context:', error)
        return null
      }
    }

    setAlertAudio(createBeep())
  }, [])

  // WebSocket connection for live updates - FIXED
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current) {
        wsRef.current.close()
      }

      // Extract hostname and port from baseUrl
      const wsUrl = baseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
      const ws = new WebSocket(`${wsUrl}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          
          // Handle ping messages (keep-alive)
          if (message.type === 'ping') {
            console.log('Ping received from server')
            return
          }
          
          // Handle sensor update messages
          if (message.type === 'sensor_update' && message.data) {
            const newData = message.data
            
            // Update latest data
            setLatest(newData)
            
            // Update history (keep last 100 points)
            setHistory(prev => {
              const updated = [...prev, newData]
              return updated.slice(-100)
            })
            
            // Check for alerts and play audio
            const isAlert = newData.temperature > threshold || newData.temperature < minThreshold
            
            if (isAlert && !currentAlertState && emailAlertsEnabled) {
              // Start beeping
              const beep = () => {
                if (alertAudio && alertAudio.oscillator) {
                  try {
                    const newOscillator = alertAudio.audioContext.createOscillator()
                    const newGainNode = alertAudio.audioContext.createGain()
                    
                    newOscillator.connect(newGainNode)
                    newGainNode.connect(alertAudio.audioContext.destination)
                    
                    newOscillator.frequency.value = 800
                    newOscillator.type = 'sine'
                    newGainNode.gain.value = 0.1
                    
                    newOscillator.start()
                    setTimeout(() => {
                      newOscillator.stop()
                    }, 200)
                  } catch (error) {
                    console.log('Audio beep failed:', error)
                  }
                }
              }
              beep()
            }
            
            setCurrentAlertState(isAlert)
          }
        } catch (error) {
          console.error('WebSocket message error:', error)
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setConnectionStatus('disconnected')
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...')
          connectWebSocket()
        }, 5000)
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      // Safely close audio context if created
      try {
        if (alertAudio?.audioContext && alertAudio.audioContext.state !== 'closed') {
          alertAudio.audioContext.close()
        }
      } catch (e) {
        // no-op
      }
    }
  }, [baseUrl, threshold, minThreshold, emailAlertsEnabled])

  const fetchStatus = async () => {
    try {
      const resp = await axios.get(`${baseUrl}/status`)
      setStatus(resp.data)
      setThreshold(resp.data.threshold || 35)
      setMinThreshold(resp.data.min_threshold || 10)
    } catch (error) {
      console.error('Failed to fetch status:', error)
    }
  }

  const fetchLatest = async () => {
    try {
      const resp = await axios.get(`${baseUrl}/data/latest`)
      setLatest(resp.data)
    } catch (error) {
      console.error('Failed to fetch latest data:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const resp = await axios.get(`${baseUrl}/data/history?limit=100`)
      setHistory(resp.data || [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setHistory([])
    }
  }

  const addEmailRecipient = () => {
    if (newRecipient && !emailRecipients.includes(newRecipient)) {
      setEmailRecipients([...emailRecipients, newRecipient])
      setNewRecipient('')
    }
  }

  const removeEmailRecipient = (recipient) => {
    setEmailRecipients(emailRecipients.filter(r => r !== recipient))
  }

  // Initial data fetch
  useEffect(() => {
    fetchStatus()
    fetchLatest()
    fetchHistory()
    
    // Poll for new data every 2 seconds as fallback/supplement to WebSocket
    const pollInterval = setInterval(() => {
      fetchLatest()
      fetchHistory() // Also refresh history every 5 seconds for chart updates
    }, 2000)
    
    return () => clearInterval(pollInterval)
  }, [])

  return (
    <div className="app">
      {/* Mobile header */}
      <header className="mobile-header">
        <button className="hamburger" onClick={() => setSidebarVisible(!sidebarVisible)} aria-label="Open menu">☰</button>
        <div className="mobile-title">Dashboard Monitor</div>
      </header>

      <Sidebar 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        threshold={threshold}
        minThreshold={minThreshold}
        setThreshold={setThreshold}
        setMinThreshold={setMinThreshold}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        connectionStatus={connectionStatus}
        emailRecipients={emailRecipients}
        setEmailRecipients={setEmailRecipients}
        newRecipient={newRecipient}
        setNewRecipient={setNewRecipient}
        addEmailRecipient={addEmailRecipient}
        removeEmailRecipient={removeEmailRecipient}
        emailAlertsEnabled={emailAlertsEnabled}
        setEmailAlertsEnabled={setEmailAlertsEnabled}
        sidebarVisible={sidebarVisible}
        setSidebarVisible={setSidebarVisible}
      />
      
      <div className="main-content">
        {currentPage === 'live' ? (
          <>
            <Metrics 
              status={status} 
              latest={latest} 
              threshold={threshold}
              minThreshold={minThreshold}
              connectionStatus={connectionStatus}
            />
            
            <div className="charts">
              <LiveChart 
                data={history} 
                threshold={threshold}
                minThreshold={minThreshold}
              />
            </div>
          </>
        ) : currentPage === 'historical' ? (
          <HistoricalAnalyticsComponent
            baseUrl={baseUrl}
          />
        ) : currentPage === 'email' ? (
          <EmailAlertsComponent
            baseUrl={baseUrl}
            emailRecipients={emailRecipients}
            setEmailRecipients={setEmailRecipients}
            newRecipient={newRecipient}
            setNewRecipient={setNewRecipient}
            addEmailRecipient={addEmailRecipient}
            removeEmailRecipient={removeEmailRecipient}
            emailAlertsEnabled={emailAlertsEnabled}
            setEmailAlertsEnabled={setEmailAlertsEnabled}
          />
        ) : null}
      </div>
    </div>
  )
}

export default App