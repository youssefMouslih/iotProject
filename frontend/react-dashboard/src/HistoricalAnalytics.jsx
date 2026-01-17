import { useEffect, useMemo, useState } from 'react'
import plotlyFactory from 'react-plotly.js/factory'
import PlotlyBasic from 'plotly.js-basic-dist'
import axios from 'axios'
import './HistoricalAnalytics.css'

const createPlotlyComponent = plotlyFactory.default || plotlyFactory
const Plot = createPlotlyComponent(PlotlyBasic)

export default function HistoricalAnalytics({ baseUrl }) {
  const [filters, setFilters] = useState({
    sensorSource: '',
    startDate: '',
    endDate: '',
    alertState: '',
    alertType: ''
  })
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [chartType, setChartType] = useState('scatter')
  const [activeCharts, setActiveCharts] = useState({
    timeSeries: true,
    sensorComparison: true,
    heatmap: false,
    distribution: false,
    alertTimeline: false,
    hourlyAverage: false,
    sensorHealth: false
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.sensorSource) params.append('temperature_source', filters.sensorSource)
      if (filters.startDate) params.append('start', filters.startDate.split('T')[0])
      if (filters.endDate) params.append('end', filters.endDate.split('T')[0])
      if (filters.alertState) params.append('alert', filters.alertState)
      if (filters.alertType) params.append('alert_cause', filters.alertType)
      
      console.log('Fetching analytics data with params:', params.toString())
      const resp = await axios.get(`${baseUrl}/analytics/search?${params.toString()}`)
      console.log('Analytics data received:', resp.data?.length, 'records')
      setData(resp.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (filters.sensorSource) params.append('temperature_source', filters.sensorSource)
      if (filters.startDate) params.append('start', filters.startDate.split('T')[0])
      if (filters.endDate) params.append('end', filters.endDate.split('T')[0])
      if (filters.alertState) params.append('alert', filters.alertState)
      if (filters.alertType) params.append('alert_cause', filters.alertType)
      
      const resp = await axios.get(`${baseUrl}/analytics/export?${params.toString()}`)
      const blob = new Blob([resp.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `iot_data_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to export data:', error)
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      sensorSource: '',
      startDate: '',
      endDate: '',
      alertState: '',
      alertType: ''
    })
  }

  const toggleChart = (chartName) => {
    setActiveCharts(prev => ({...prev, [chartName]: !prev[chartName]}))
  }

  useEffect(() => {
    fetchData()
  }, [filters])

  // Time Series Plot
  const timeSeriesData = useMemo(() => {
    const timestamps = data.map(r => new Date(r.timestamp))
    const temperatures = data.map(r => r.temperature ?? null)
    const humidity = data.map(r => r.humidity ?? null)
    const outdoorTemp = data.map(r => r.outdoor_temperature ?? null)
    
    return [
      {
        x: timestamps,
        y: temperatures,
        type: chartType,
        mode: chartType === 'scatter' ? 'markers' : 'lines',
        name: 'Indoor Temp (°C)',
        marker: { color: '#1f77b4', size: 4 },
        line: { width: 2 }
      },
      {
        x: timestamps,
        y: outdoorTemp,
        type: chartType,
        mode: chartType === 'scatter' ? 'markers' : 'lines',
        name: 'Outdoor Temp (°C)',
        marker: { color: '#ff7f0e', size: 4 },
        line: { width: 2 }
      },
      {
        x: timestamps,
        y: humidity,
        type: chartType,
        mode: chartType === 'scatter' ? 'markers' : 'lines',
        name: 'Humidity (%)',
        yaxis: 'y2',
        marker: { color: '#2ca02c', size: 4 },
        line: { width: 2 }
      }
    ]
  }, [data, chartType])

  // Sensor Comparison
  const comparisonData = useMemo(() => {
    const sources = {}
    data.forEach(record => {
      const source = record.temperature_source || 'Unknown'
      if (!sources[source]) sources[source] = []
      sources[source].push(record)
    })

    const colors = { 'DS18B20': '#e74c3c', 'DHT': '#3498db', 'Unknown': '#95a5a6' }
    return Object.entries(sources).map(([source, records]) => ({
      x: records.map(r => new Date(r.timestamp)),
      y: records.map(r => r.temperature ?? null),
      type: chartType,
      mode: chartType === 'scatter' ? 'markers' : 'lines',
      name: source,
      marker: { color: colors[source] || '#' + Math.floor(Math.random()*16777215).toString(16), size: 4 }
    }))
  }, [data, chartType])

  // Temperature Heatmap (hourly aggregation)
  const heatmapData = useMemo(() => {
    if (data.length === 0) return []
    
    const hourlyData = {}
    data.forEach(r => {
      const date = new Date(r.timestamp)
      const day = date.toISOString().split('T')[0]
      const hour = date.getHours()
      
      if (!hourlyData[day]) hourlyData[day] = {}
      if (!hourlyData[day][hour]) hourlyData[day][hour] = []
      hourlyData[day][hour].push(r.temperature)
    })

    const days = Object.keys(hourlyData).sort()
    const hours = Array.from({length: 24}, (_, i) => i)
    const z = days.map(day => 
      hours.map(hour => {
        const temps = hourlyData[day]?.[hour] || []
        return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null
      })
    )

    return [{
      x: hours,
      y: days,
      z: z,
      type: 'heatmap',
      colorscale: 'RdYlBu',
      reversescale: true,
      hoverongaps: false,
      colorbar: { title: 'Temp (°C)' }
    }]
  }, [data])

  // Temperature Distribution (Histogram)
  const distributionData = useMemo(() => {
    const temps = data.map(r => r.temperature).filter(t => t != null)
    const humidity = data.map(r => r.humidity).filter(h => h != null)
    
    return [
      {
        x: temps,
        type: 'histogram',
        name: 'Temperature',
        marker: { color: '#1f77b4' },
        opacity: 0.7,
        nbinsx: 30
      },
      {
        x: humidity,
        type: 'histogram',
        name: 'Humidity',
        marker: { color: '#2ca02c' },
        opacity: 0.7,
        nbinsx: 30,
        yaxis: 'y2'
      }
    ]
  }, [data])

  // Alert Timeline
  const alertTimelineData = useMemo(() => {
    const alerts = data.filter(r => r.alert === 1)
    const timestamps = alerts.map(r => new Date(r.timestamp))
    const temps = alerts.map(r => r.temperature)
    const causes = alerts.map(r => r.alert_cause || 'UNKNOWN')
    
    const causeColors = {
      'HIGH_TEMP': '#e74c3c',
      'LOW_TEMP': '#3498db',
      'SENSOR_FAULT': '#f39c12',
      'UNKNOWN': '#95a5a6'
    }
    
    return [{
      x: timestamps,
      y: temps,
      type: 'scatter',
      mode: 'markers',
      name: 'Alerts',
      marker: {
        size: 12,
        color: causes.map(c => causeColors[c] || causeColors.UNKNOWN),
        symbol: 'x'
      },
      text: causes,
      hovertemplate: '<b>%{text}</b><br>Temp: %{y:.1f}°C<br>Time: %{x}<extra></extra>'
    }]
  }, [data])

  // Hourly Average Chart
  const hourlyAverageData = useMemo(() => {
    const hourlyStats = {}
    
    data.forEach(r => {
      const hour = new Date(r.timestamp).getHours()
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { temps: [], humidity: [] }
      }
      if (r.temperature != null) hourlyStats[hour].temps.push(r.temperature)
      if (r.humidity != null) hourlyStats[hour].humidity.push(r.humidity)
    })

    const hours = Array.from({length: 24}, (_, i) => i)
    const avgTemps = hours.map(h => {
      const temps = hourlyStats[h]?.temps || []
      return temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : null
    })
    const avgHumidity = hours.map(h => {
      const hums = hourlyStats[h]?.humidity || []
      return hums.length > 0 ? hums.reduce((a, b) => a + b, 0) / hums.length : null
    })

    return [
      {
        x: hours,
        y: avgTemps,
        type: 'bar',
        name: 'Avg Temperature (°C)',
        marker: { color: '#1f77b4' }
      },
      {
        x: hours,
        y: avgHumidity,
        type: 'bar',
        name: 'Avg Humidity (%)',
        marker: { color: '#2ca02c' },
        yaxis: 'y2'
      }
    ]
  }, [data])

  // Sensor Health Dashboard
  const sensorHealthData = useMemo(() => {
    const ds18b20Ok = data.filter(r => r.ds18b20_ok === true).length
    const ds18b20Fail = data.filter(r => r.ds18b20_ok === false).length
    const dhtOk = data.filter(r => r.dht_ok === true).length
    const dhtFail = data.filter(r => r.dht_ok === false).length
    const disagreements = data.filter(r => r.sensor_disagreement === true).length

    return [
      {
        labels: ['DS18B20 OK', 'DS18B20 Fail', 'DHT OK', 'DHT Fail', 'Disagreements'],
        values: [ds18b20Ok, ds18b20Fail, dhtOk, dhtFail, disagreements],
        type: 'pie',
        marker: {
          colors: ['#2ecc71', '#e74c3c', '#3498db', '#e67e22', '#f39c12']
        },
        hole: 0.4
      }
    ]
  }, [data])

  const stats = useMemo(() => {
    if (data.length === 0) return null
    
    const temps = data.map(r => r.temperature).filter(t => t != null)
    const alerts = data.filter(r => r.alert === 1)
    
    return {
      totalRecords: data.length,
      avgTemp: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      minTemp: Math.min(...temps).toFixed(1),
      maxTemp: Math.max(...temps).toFixed(1),
      alertCount: alerts.length,
      alertRate: ((alerts.length / data.length) * 100).toFixed(1)
    }
  }, [data])

  return (
    <div className="historical-analytics">
      <div className="analytics-header">
        <h2>Historical Analytics</h2>
        <div className="analytics-subtitle">
          Analyze historical sensor data with advanced filtering and visualization
        </div>
      </div>

      {loading && (
        <div className="loading-message">
          <p>Loading data...</p>
        </div>
      )}

      <div className="analytics-content">
        <div className="filters-section">
          <h3>Data Filters</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Sensor Source</label>
              <select 
                value={filters.sensorSource}
                onChange={e => setFilters({...filters, sensorSource: e.target.value})}
              >
                <option value="">All Sensors</option>
                <option value="DS18B20">DS18B20</option>
                <option value="DHT">DHT</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Start Date</label>
              <input 
                type="datetime-local" 
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input 
                type="datetime-local" 
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
            <div className="filter-group">
              <label>Alert State</label>
              <select 
                value={filters.alertState}
                onChange={e => setFilters({...filters, alertState: e.target.value})}
              >
                <option value="">All</option>
                <option value="true">Alert Active</option>
                <option value="false">No Alert</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Alert Type</label>
              <select 
                value={filters.alertType}
                onChange={e => setFilters({...filters, alertType: e.target.value})}
              >
                <option value="">All</option>
                <option value="HIGH_TEMP">High Temperature</option>
                <option value="LOW_TEMP">Low Temperature</option>
                <option value="SENSOR_FAULT">Sensor Fault</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Chart Type</label>
              <select 
                value={chartType}
                onChange={e => setChartType(e.target.value)}
              >
                <option value="scatter">Scatter Plot</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>
          </div>
          <div className="filter-actions">
            <button onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
            <button onClick={resetFilters}>Reset Filters</button>
            <button onClick={exportCSV} disabled={exporting || data.length === 0}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {stats && (
          <div className="stats-section">
            <h3>Summary Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Records</div>
                <div className="stat-value">{stats.totalRecords}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Avg Temperature</div>
                <div className="stat-value">{stats.avgTemp}°C</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Min/Max Temp</div>
                <div className="stat-value">{stats.minTemp}°C / {stats.maxTemp}°C</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Alerts</div>
                <div className="stat-value">{stats.alertCount}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Alert Rate</div>
                <div className="stat-value">{stats.alertRate}%</div>
              </div>
            </div>
          </div>
        )}

        {!loading && data.length === 0 && (
          <div className="no-data-message">
            <p>No data found. Try adjusting your filters or loading data first.</p>
          </div>
        )}

        {data.length > 0 && (
          <>
            <div className="chart-toggles">
              <h3>Select Charts to Display</h3>
              <div className="toggle-grid">
                <label>
                  <input type="checkbox" checked={activeCharts.timeSeries} onChange={() => toggleChart('timeSeries')} />
                  Time Series Analysis
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.sensorComparison} onChange={() => toggleChart('sensorComparison')} />
                  Sensor Comparison
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.heatmap} onChange={() => toggleChart('heatmap')} />
                  Temperature Heatmap
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.distribution} onChange={() => toggleChart('distribution')} />
                  Distribution Analysis
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.alertTimeline} onChange={() => toggleChart('alertTimeline')} />
                  Alert Timeline
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.hourlyAverage} onChange={() => toggleChart('hourlyAverage')} />
                  Hourly Averages
                </label>
                <label>
                  <input type="checkbox" checked={activeCharts.sensorHealth} onChange={() => toggleChart('sensorHealth')} />
                  Sensor Health
                </label>
              </div>
            </div>

            <div className="charts-section">
              {activeCharts.timeSeries && (
                <div className="chart-container">
                  <h4>Time Series Analysis</h4>
                  <Plot 
                    data={timeSeriesData} 
                    layout={{
                      title: 'Temperature & Humidity Over Time',
                      hovermode: 'x unified',
                      xaxis: { title: 'Time' },
                      yaxis: { title: 'Temperature (°C)' },
                      yaxis2: { title: 'Humidity (%)', overlaying: 'y', side: 'right' },
                      height: 400,
                      showlegend: true
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Ce graphique montre comment la température et l'humidité évoluent dans le temps. La <strong>ligne/points bleus</strong> représente 
                      la température intérieure (axe gauche), la <strong>ligne/points orange</strong> montre la température extérieure (axe gauche), 
                      et la <strong>ligne/points verts</strong> affiche le pourcentage d'humidité (axe droit). Recherchez :
                    </p>
                    <ul>
                      <li><strong>Tendances :</strong> Les motifs ascendants ou descendants indiquent des cycles de chauffage/refroidissement</li>
                      <li><strong>Pics :</strong> Les changements soudains peuvent indiquer des ouvertures de portes, des problèmes système ou des changements météo</li>
                      <li><strong>Corrélation :</strong> Voyez comment la température intérieure est liée aux conditions extérieures</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.sensorComparison && (
                <div className="chart-container">
                  <h4>Sensor Source Comparison</h4>
                  <Plot 
                    data={comparisonData} 
                    layout={{
                      title: 'Temperature by Sensor Source',
                      hovermode: 'x unified',
                      xaxis: { title: 'Time' },
                      yaxis: { title: 'Temperature (°C)' },
                      height: 400,
                      showlegend: true
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Ce graphique compare les lectures de différents capteurs de température (<strong style={{color: '#e74c3c'}}>DS18B20</strong> 
                      en rouge et <strong style={{color: '#3498db'}}>DHT</strong> en bleu). Utilisez-le pour :
                    </p>
                    <ul>
                      <li><strong>Vérifier la Précision :</strong> Les deux capteurs doivent afficher des lectures similaires s'ils fonctionnent correctement</li>
                      <li><strong>Identifier les Défaillances :</strong> De grandes différences entre capteurs indiquent une défaillance potentielle</li>
                      <li><strong>Suivre la Fiabilité :</strong> Voyez quel capteur fournit des données plus cohérentes au fil du temps</li>
                      <li><strong>Basculement de Capteur :</strong> Remarquez quand le système bascule entre capteurs en raison de défaillances</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.heatmap && (
                <div className="chart-container">
                  <h4>Temperature Heatmap (Daily x Hourly)</h4>
                  <Plot 
                    data={heatmapData} 
                    layout={{
                      title: 'Temperature Distribution by Day and Hour',
                      xaxis: { title: 'Hour of Day' },
                      yaxis: { title: 'Date' },
                      height: 500
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '500px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Cette carte thermique visualise les motifs de température à travers les jours (axe vertical) et les heures (axe horizontal). 
                      Les <strong style={{color: '#e74c3c'}}>couleurs rouges/chaudes</strong> indiquent des températures plus élevées, tandis que 
                      les <strong style={{color: '#3498db'}}>couleurs bleues/froides</strong> montrent des températures plus basses. Utilisez ceci pour :
                    </p>
                    <ul>
                      <li><strong>Motifs Quotidiens :</strong> Identifiez quelles heures sont typiquement les plus chaudes/froides chaque jour</li>
                      <li><strong>Tendances Hebdomadaires :</strong> Comparez les motifs de température entre différents jours de la semaine</li>
                      <li><strong>Anomalies :</strong> Repérez les événements de température inhabituels (carrés rouge foncé ou bleu foncé)</li>
                      <li><strong>Efficacité CVC :</strong> Voyez si les systèmes de chauffage/refroidissement maintiennent des motifs cohérents</li>
                      <li><strong>Occupation :</strong> Les changements de température sont souvent corrélés aux heures d'occupation du bâtiment</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.distribution && (
                <div className="chart-container">
                  <h4>Distribution Analysis</h4>
                  <Plot 
                    data={distributionData} 
                    layout={{
                      title: 'Temperature & Humidity Distribution',
                      xaxis: { title: 'Value' },
                      yaxis: { title: 'Frequency (Temperature)' },
                      yaxis2: { title: 'Frequency (Humidity)', overlaying: 'y', side: 'right' },
                      height: 400,
                      barmode: 'overlay',
                      showlegend: true
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Cet histogramme montre à quelle fréquence différentes valeurs de température et d'humidité se produisent. 
                      La <strong>hauteur de chaque barre</strong> indique la fréquence (combien de fois cette valeur a été enregistrée). Utilisez ceci pour :
                    </p>
                    <ul>
                      <li><strong>Plage Normale :</strong> Les barres les plus hautes montrent vos niveaux de température/humidité les plus courants</li>
                      <li><strong>Dispersion :</strong> Une large distribution signifie une grande variabilité ; étroite signifie des conditions stables</li>
                      <li><strong>Pics Multiples :</strong> Deux pics peuvent indiquer différents modes de fonctionnement (jour/nuit, occupé/vacant)</li>
                      <li><strong>Valeurs Aberrantes :</strong> Les petites barres loin du centre montrent des événements extrêmes rares</li>
                      <li><strong>Vérification Cible :</strong> Vérifiez si la plupart des lectures se situent dans votre plage de confort souhaitée</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.alertTimeline && (
                <div className="chart-container">
                  <h4>Alert Timeline</h4>
                  <Plot 
                    data={alertTimelineData} 
                    layout={{
                      title: 'Temperature Alerts Over Time',
                      xaxis: { title: 'Time' },
                      yaxis: { title: 'Temperature (°C)' },
                      height: 400,
                      showlegend: false
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Ce graphique montre uniquement les moments où des alertes ont été déclenchées. Chaque <strong>marqueur X</strong> représente 
                      un événement d'alerte, codé par couleur selon le type : <strong style={{color: '#e74c3c'}}>TEMP_HAUTE (rouge)</strong>, 
                      <strong style={{color: '#3498db'}}> TEMP_BASSE (bleu)</strong>, et 
                      <strong style={{color: '#f39c12'}}> DÉFAUT_CAPTEUR (orange)</strong>. Utilisez ceci pour :
                    </p>
                    <ul>
                      <li><strong>Fréquence d'Alerte :</strong> Voyez à quelle fréquence les alertes se produisent et si elles augmentent au fil du temps</li>
                      <li><strong>Regroupement d'Alertes :</strong> Plusieurs alertes rapprochées peuvent indiquer un problème sérieux</li>
                      <li><strong>Cause Racine :</strong> Identifiez ce qui a déclenché les alertes (panne d'équipement, météo, heure de la journée)</li>
                      <li><strong>Temps de Réponse :</strong> Mesurez combien de temps il faut pour résoudre les conditions d'alerte</li>
                      <li><strong>Maintenance Préventive :</strong> Les motifs peuvent aider à prédire et prévenir les alertes futures</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.hourlyAverage && (
                <div className="chart-container">
                  <h4>Hourly Averages</h4>
                  <Plot 
                    data={hourlyAverageData} 
                    layout={{
                      title: 'Average Temperature & Humidity by Hour of Day',
                      xaxis: { title: 'Hour of Day', dtick: 1 },
                      yaxis: { title: 'Avg Temperature (°C)' },
                      yaxis2: { title: 'Avg Humidity (%)', overlaying: 'y', side: 'right' },
                      height: 400,
                      showlegend: true
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Ce graphique à barres montre la température moyenne (barres bleues, axe gauche) et l'humidité (barres vertes, axe droit) 
                      pour chaque heure de la journée (0-23). Utilisez ceci pour :
                    </p>
                    <ul>
                      <li><strong>Cycles Quotidiens :</strong> Identifiez les motifs naturels de température/humidité tout au long de la journée</li>
                      <li><strong>Heures de Pointe :</strong> Voyez quand les températures sont typiquement les plus hautes et les plus basses</li>
                      <li><strong>Optimisation d'Horaire :</strong> Ajustez les horaires CVC en fonction du moment où le chauffage/refroidissement est le plus nécessaire</li>
                      <li><strong>Efficacité Énergétique :</strong> Ciblez les mesures d'économie d'énergie pendant les heures avec des conditions stables</li>
                      <li><strong>Planification de Confort :</strong> Planifiez l'occupation pendant les heures avec des conditions optimales</li>
                      <li><strong>Tôt le Matin :</strong> Les heures 0-6 montrent souvent les températures les plus basses ; 14-16 les plus hautes</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeCharts.sensorHealth && (
                <div className="chart-container">
                  <h4>Sensor Health Overview</h4>
                  <Plot 
                    data={sensorHealthData} 
                    layout={{
                      title: 'Sensor Status Distribution',
                      height: 400,
                      showlegend: true
                    }}
                    useResizeHandler 
                    style={{ width: '100%', height: '400px' }}
                  />
                  <div className="chart-explanation">
                    <h5>📖 Comment Lire Ce Graphique :</h5>
                    <p>
                      Ce graphique circulaire/en anneau montre la santé globale de votre système de capteurs. Chaque segment représente 
                      une catégorie différente d'état de capteur avec son pourcentage du total des lectures :
                    </p>
                    <ul>
                      <li><strong style={{color: '#2ecc71'}}>DS18B20 OK (Vert) :</strong> Lectures réussies du capteur de température DS18B20</li>
                      <li><strong style={{color: '#e74c3c'}}>DS18B20 Échec (Rouge) :</strong> Lectures DS18B20 échouées (affiche souvent -127°C)</li>
                      <li><strong style={{color: '#3498db'}}>DHT OK (Bleu) :</strong> Lectures réussies du capteur DHT (temp + humidité)</li>
                      <li><strong style={{color: '#e67e22'}}>DHT Échec (Orange) :</strong> Lectures DHT échouées (valeurs NaN)</li>
                      <li><strong style={{color: '#f39c12'}}>Désaccords (Jaune) :</strong> Moments où les deux capteurs fonctionnaient mais différaient de &gt;2°C</li>
                    </ul>
                    <p>
                      <strong>Système Sain :</strong> Devrait avoir &gt;95% de lectures OK et &lt;5% d'échecs. 
                      Des taux d'échec élevés ou des désaccords indiquent qu'une maintenance est nécessaire.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}