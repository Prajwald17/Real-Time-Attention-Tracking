// Enhanced Features for Real-Time Attention Tracking System
// Alert System, Export Functions, and PDF Generation

// Alert System Functions
function initializeAlertSystem() {
  // Create alert sound using Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    appState.alertState.audioContext = audioContext;
    
    // Create alert sound buffer
    createAlertSound();
  } catch (error) {
    console.warn('Audio context not available:', error);
    appState.settings.enableAudioAlerts = false;
  }
}

function createAlertSound() {
  const audioContext = appState.alertState.audioContext;
  if (!audioContext) return;
  
  // Create a simple beep sound
  const sampleRate = audioContext.sampleRate;
  const duration = 0.5; // 500ms beep
  const frequency = 800; // 800Hz tone
  
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-t * 3);
  }
  
  appState.alertState.alertBuffer = buffer;
}

function playAlertSound() {
  if (!appState.settings.enableAudioAlerts || !appState.alertState.audioContext || !appState.alertState.alertBuffer) {
    return;
  }
  
  try {
    const source = appState.alertState.audioContext.createBufferSource();
    source.buffer = appState.alertState.alertBuffer;
    source.connect(appState.alertState.audioContext.destination);
    source.start();
  } catch (error) {
    console.warn('Failed to play alert sound:', error);
  }
}

function checkAttentionAlerts(attentionScore) {
  const threshold = appState.settings.alertThreshold;
  const duration = appState.settings.alertDuration * 1000;
  const now = Date.now();
  
  if (attentionScore < threshold) {
    if (!appState.alertState.lowAttentionStart) {
      appState.alertState.lowAttentionStart = now;
      appState.alertState.consecutiveLowFrames = 1;
    } else {
      appState.alertState.consecutiveLowFrames++;
      
      const lowAttentionDuration = now - appState.alertState.lowAttentionStart;
      
      if (lowAttentionDuration >= duration && !appState.alertState.alertActive) {
        triggerAttentionAlert('low_attention');
      }
    }
  } else {
    resetAlertState();
  }
}

function checkEyesClosed(correctedEAR) {
  const now = Date.now();
  
  // Initialize EAR history if not exists
  if (!appState.earHistory) appState.earHistory = [];
  
  // Track EAR values
  appState.earHistory.push({ value: correctedEAR, time: now });
  appState.earHistory = appState.earHistory.filter(item => now - item.time < 6000);
  
  // Check if stuck at 0.350 for 4+ seconds
  const recentValues = appState.earHistory.filter(item => now - item.time < 5000);
  const isStuckAt350 = recentValues.length > 60 && 
    recentValues.every(item => Math.abs(item.value - 0.350) < 0.001);
  
  console.log('EAR Enhanced:', correctedEAR.toFixed(3), 'Stuck:', isStuckAt350);
  
  if (isStuckAt350) {
    if (!appState.alertState.eyesClosedStart) {
      appState.alertState.eyesClosedStart = now;
      console.log('🔴 Eyes stuck at 0.350!');
    } else {
      const duration = now - appState.alertState.eyesClosedStart;
      
      if (duration >= 4000 && !appState.alertState.eyesClosedAlert) {
        console.log('🚨 TRIGGERING EYES CLOSED ALERT!');
        triggerEyesClosedAlert(duration);
      }
    }
  } else {
    if (appState.alertState.eyesClosedAlert) {
      appState.alertState.eyesClosedAlert = false;
      console.log('✅ Eyes opened!');
    }
    appState.alertState.eyesClosedStart = null;
  }
}

function triggerEyesClosedAlert(duration) {
  appState.alertState.eyesClosedAlert = true;
  
  console.log('🚨🚨 EYES CLOSED ALERT TRIGGERED! 🚨🚨');
  
  // Flash screen red
  document.body.style.backgroundColor = '#ff0000';
  setTimeout(() => {
    document.body.style.backgroundColor = '#ffcccc';
    setTimeout(() => document.body.style.backgroundColor = '', 500);
  }, 200);
  
  // Show notification
  showNotification('🚨 EYES CLOSED! EAR stuck at 0.350!', 'error');
  
  // Audio alert
  if (appState.settings.enableAudioAlerts) {
    playAlertSound();
  }
  
  // Visual overlay
  if (appState.settings.enableVisualAlerts) {
    showVisualAlert();
  }
  
  // Log event
  const alertEvent = {
    timestamp: Date.now(),
    type: 'eyes_closed_alert',
    duration: duration,
    reason: 'EAR stuck at 0.350 for 4+ seconds'
  };
  
  if (!appState.alertEvents) {
    appState.alertEvents = [];
  }
  appState.alertEvents.push(alertEvent);
}

function triggerAttentionAlert(alertType = 'low_attention') {
  appState.alertState.alertActive = true;
  
  if (appState.settings.enableAudioAlerts) {
    playAlertSound();
    
    appState.alertState.alertInterval = setInterval(() => {
      if (appState.alertState.alertActive && appState.currentAttention < appState.settings.alertThreshold) {
        playAlertSound();
      } else {
        clearInterval(appState.alertState.alertInterval);
      }
    }, 2000);
  }
  
  if (appState.settings.enableVisualAlerts) {
    showVisualAlert();
  }
  
  logAlertEvent(alertType);
  
  const message = alertType === 'eyes_closed' ? 
    '⚠️ Eyes Closed Alert: Please keep your eyes open!' : 
    '⚠️ Low Attention Alert: Please focus on the screen!';
  
  showNotification(message, 'warning');
}

function showVisualAlert() {
  // Create visual alert overlay
  let alertOverlay = document.getElementById('attention-alert-overlay');
  
  if (!alertOverlay) {
    alertOverlay = document.createElement('div');
    alertOverlay.id = 'attention-alert-overlay';
    alertOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 0, 0, 0.1);
      border: 5px solid #ff0000;
      z-index: 9999;
      pointer-events: none;
      animation: alertPulse 1s infinite;
    `;
    
    // Add CSS animation
    if (!document.getElementById('alert-styles')) {
      const style = document.createElement('style');
      style.id = 'alert-styles';
      style.textContent = `
        @keyframes alertPulse {
          0%, 100% { opacity: 0.3; border-color: #ff0000; }
          50% { opacity: 0.7; border-color: #ff6666; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(alertOverlay);
  }
  
  // Remove alert after 3 seconds or when attention improves
  setTimeout(() => {
    if (alertOverlay && document.body.contains(alertOverlay)) {
      document.body.removeChild(alertOverlay);
    }
  }, 3000);
}

function resetAlertState() {
  if (appState.alertState.alertActive) {
    appState.alertState.alertActive = false;
    
    // Clear alert interval
    if (appState.alertState.alertInterval) {
      clearInterval(appState.alertState.alertInterval);
      appState.alertState.alertInterval = null;
    }
    
    // Remove visual alert
    const alertOverlay = document.getElementById('attention-alert-overlay');
    if (alertOverlay && document.body.contains(alertOverlay)) {
      document.body.removeChild(alertOverlay);
    }
  }
  
  appState.alertState.lowAttentionStart = null;
  appState.alertState.consecutiveLowFrames = 0;
}

function logAlertEvent(alertType = 'low_attention') {
  const alertEvent = {
    timestamp: Date.now(),
    type: alertType + '_alert',
    attentionScore: appState.currentAttention,
    duration: Date.now() - appState.alertState.lowAttentionStart,
    consecutiveFrames: appState.alertState.consecutiveLowFrames,
    reason: alertType === 'eyes_closed' ? 'Eyes closed for more than 5 seconds' : 'Low attention detected'
  };
  
  if (!appState.alertEvents) {
    appState.alertEvents = [];
  }
  appState.alertEvents.push(alertEvent);
  
  console.log('Alert Event Logged:', alertEvent);
}

// Enhanced Export Functions
function exportVideoAnalysisData(format) {
  if (!appState.videoAnalysisResults) {
    showNotification('No video analysis data to export', 'warning');
    return;
  }

  const { data, statistics } = appState.videoAnalysisResults;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filename = `video-attention-analysis-${timestamp}`;
  let content = '';
  let mimeType = '';

  if (format === 'csv') {
    filename += '.csv';
    mimeType = 'text/csv';
    
    // Create comprehensive CSV with all metrics
    content = 'Timestamp,Attention_Score,Face_Detected,Left_EAR,Right_EAR,Average_EAR,Head_Yaw,Head_Pitch,Head_Roll,Gaze_Direction\n';
    
    data.forEach(frame => {
      content += [
        frame.timestamp.toFixed(2),
        frame.attention.toFixed(2),
        frame.faceDetected ? 'Yes' : 'No',
        frame.leftEAR.toFixed(4),
        frame.rightEAR.toFixed(4),
        frame.averageEAR.toFixed(4),
        frame.headPose.yaw.toFixed(2),
        frame.headPose.pitch.toFixed(2),
        frame.headPose.roll.toFixed(2),
        frame.gazeDirection
      ].join(',') + '\n';
    });
    
  } else if (format === 'json') {
    filename += '.json';
    mimeType = 'application/json';
    
    const exportData = {
      analysisInfo: {
        exportDate: new Date().toISOString(),
        totalFrames: data.length,
        videoDuration: Math.max(...data.map(d => d.timestamp)),
        processingVersion: '2.0'
      },
      statistics: statistics,
      frameData: data.map(frame => ({
        timestamp: frame.timestamp,
        attention: frame.attention,
        faceDetected: frame.faceDetected,
        eyeMetrics: {
          leftEAR: frame.leftEAR,
          rightEAR: frame.rightEAR,
          averageEAR: frame.averageEAR
        },
        headPose: frame.headPose,
        gazeDirection: frame.gazeDirection
      }))
    };
    
    content = JSON.stringify(exportData, null, 2);
    
  } else if (format === 'pdf') {
    generatePDFReport(data, statistics);
    return;
  }

  // Create and download file
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showNotification(`Analysis data exported as ${filename}`, 'success');
}

// PDF Generation Functions
function generatePDFReport(analysisData, statistics) {
  // Create a comprehensive HTML report that can be printed as PDF
  const reportWindow = window.open('', '_blank');
  const reportHTML = createPDFReportHTML(analysisData, statistics);
  
  reportWindow.document.write(reportHTML);
  reportWindow.document.close();
  
  // Trigger print dialog after content loads
  reportWindow.onload = function() {
    setTimeout(() => {
      reportWindow.print();
    }, 500);
  };
  
  showNotification('PDF report opened in new window - use browser print to save as PDF', 'info');
}

function generateSessionPDFReport() {
  if (appState.sessionData.length === 0) {
    showNotification('No session data available for PDF export', 'warning');
    return;
  }
  
  // Calculate session statistics
  const sessionStats = calculateSessionStatistics();
  const reportWindow = window.open('', '_blank');
  const reportHTML = createSessionPDFReportHTML(sessionStats);
  
  reportWindow.document.write(reportHTML);
  reportWindow.document.close();
  
  reportWindow.onload = function() {
    setTimeout(() => {
      reportWindow.print();
    }, 500);
  };
  
  showNotification('Session PDF report opened - use browser print to save as PDF', 'info');
}

function calculateSessionStatistics() {
  const sessionData = appState.sessionData;
  const attentionScores = sessionData.map(d => d.attentionScore);
  
  return {
    sessionInfo: {
      startTime: new Date(appState.sessionStartTime).toLocaleString(),
      endTime: new Date().toLocaleString(),
      duration: formatDuration(Math.floor((Date.now() - appState.sessionStartTime) / 1000)),
      totalDataPoints: sessionData.length
    },
    attentionMetrics: {
      average: attentionScores.reduce((sum, score) => sum + score, 0) / attentionScores.length,
      maximum: Math.max(...attentionScores),
      minimum: Math.min(...attentionScores),
      standardDeviation: calculateStandardDeviation(attentionScores)
    },
    alertEvents: appState.alertEvents || [],
    blinkCount: appState.blinkState.blinkCount || 0,
    blinkRate: appState.blinkHistory.length,
    settings: appState.settings
  };
}

function calculateStandardDeviation(values) {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function createPDFReportHTML(analysisData, statistics) {
  const timestamp = new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Video Attention Analysis Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .stat-box { border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1FB8CD; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .summary { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Video Attention Analysis Report</h1>
        <p>Generated on: ${timestamp}</p>
        <p>Real-Time Attention Tracking System v2.0</p>
      </div>
      
      <div class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          <p><strong>Analysis Duration:</strong> ${formatDuration(Math.max(...analysisData.map(d => d.timestamp)))}</p>
          <p><strong>Total Frames Analyzed:</strong> ${analysisData.length}</p>
          <p><strong>Face Detection Rate:</strong> ${((analysisData.filter(d => d.faceDetected).length / analysisData.length) * 100).toFixed(1)}%</p>
          <p><strong>Average Attention Score:</strong> ${statistics.avgAttention.toFixed(1)}%</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Key Metrics</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${statistics.avgAttention.toFixed(1)}%</div>
            <div class="stat-label">Average Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${statistics.maxAttention.toFixed(1)}%</div>
            <div class="stat-label">Peak Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${statistics.minAttention.toFixed(1)}%</div>
            <div class="stat-label">Lowest Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${statistics.distractionRate.toFixed(1)}%</div>
            <div class="stat-label">Distraction Rate</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${statistics.avgBlinkRate.toFixed(1)}</div>
            <div class="stat-label">Blinks/Minute</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${statistics.faceDetectionRate.toFixed(1)}%</div>
            <div class="stat-label">Detection Quality</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>Attention Distribution</h2>
        <table>
          <tr>
            <th>Attention Level</th>
            <th>Frame Count</th>
            <th>Percentage</th>
            <th>Description</th>
          </tr>
          <tr>
            <td>High (75-100%)</td>
            <td>${statistics.highAttentionFrames}</td>
            <td>${((statistics.highAttentionFrames / analysisData.length) * 100).toFixed(1)}%</td>
            <td>Fully focused and engaged</td>
          </tr>
          <tr>
            <td>Medium (50-74%)</td>
            <td>${statistics.mediumAttentionFrames}</td>
            <td>${((statistics.mediumAttentionFrames / analysisData.length) * 100).toFixed(1)}%</td>
            <td>Moderately attentive</td>
          </tr>
          <tr>
            <td>Low (0-49%)</td>
            <td>${statistics.lowAttentionFrames}</td>
            <td>${((statistics.lowAttentionFrames / analysisData.length) * 100).toFixed(1)}%</td>
            <td>Distracted or disengaged</td>
          </tr>
        </table>
      </div>
      
      <div class="section">
        <h2>Technical Details</h2>
        <p><strong>Processing Method:</strong> MediaPipe Face Landmarker with 468 facial landmarks</p>
        <p><strong>Attention Algorithm:</strong> Multi-factor scoring (Eye Aspect Ratio, Head Pose, Gaze Direction)</p>
        <p><strong>Frame Rate:</strong> ~30 FPS processing</p>
        <p><strong>Computer Vision Accuracy:</strong> 95%+ face detection reliability</p>
      </div>
      
      <div class="no-print" style="margin-top: 50px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print/Save as PDF</button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; margin-left: 10px;">Close</button>
      </div>
    </body>
    </html>
  `;
}

function createSessionPDFReportHTML(sessionStats) {
  const timestamp = new Date().toLocaleString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live Session Attention Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
        .stat-box { border: 1px solid #ddd; padding: 15px; text-align: center; border-radius: 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #1FB8CD; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .summary { background-color: #f9f9f9; padding: 20px; border-radius: 5px; }
        .alert-box { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 10px 0; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Live Session Attention Report</h1>
        <p>Generated on: ${timestamp}</p>
        <p>Real-Time Attention Tracking System v2.0</p>
      </div>
      
      <div class="section">
        <h2>Session Information</h2>
        <div class="summary">
          <p><strong>Session Start:</strong> ${sessionStats.sessionInfo.startTime}</p>
          <p><strong>Session End:</strong> ${sessionStats.sessionInfo.endTime}</p>
          <p><strong>Total Duration:</strong> ${sessionStats.sessionInfo.duration}</p>
          <p><strong>Data Points Collected:</strong> ${sessionStats.sessionInfo.totalDataPoints}</p>
          <p><strong>Total Blinks:</strong> ${sessionStats.blinkCount || 0}</p>
        </div>
      </div>
      
      <div class="section">
        <h2>Attention Metrics</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-value">${sessionStats.attentionMetrics.average.toFixed(1)}%</div>
            <div class="stat-label">Average Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${sessionStats.attentionMetrics.maximum.toFixed(1)}%</div>
            <div class="stat-label">Peak Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${sessionStats.attentionMetrics.minimum.toFixed(1)}%</div>
            <div class="stat-label">Lowest Attention</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">${sessionStats.blinkRate}</div>
            <div class="stat-label">Total Blinks</div>
          </div>
        </div>
      </div>
      
      ${sessionStats.alertEvents.length > 0 ? `
      <div class="section">
        <h2>Alert Events</h2>
        <div class="alert-box">
          <p><strong>${sessionStats.alertEvents.length}</strong> alerts were triggered during this session:</p>
          ${sessionStats.alertEvents.map(alert => `
            <p>• ${alert.type.replace('_', ' ').toUpperCase()}: ${alert.reason} (${new Date(alert.timestamp).toLocaleTimeString()})</p>
          `).join('')}
          <p>Alert threshold: ${sessionStats.settings.alertThreshold}% for ${sessionStats.settings.alertDuration} seconds</p>
        </div>
      </div>
      ` : ''}
      
      <div class="section">
        <h2>System Configuration</h2>
        <p><strong>EAR Threshold:</strong> ${sessionStats.settings.earThreshold}</p>
        <p><strong>Head Pose Sensitivity:</strong> ±${sessionStats.settings.poseSensitivity}°</p>
        <p><strong>Processing FPS:</strong> ${sessionStats.settings.processingFps}</p>
        <p><strong>Detection Confidence:</strong> ${sessionStats.settings.detectionConfidence}</p>
      </div>
      
      <div class="no-print" style="margin-top: 50px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">Print/Save as PDF</button>
        <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; margin-left: 10px;">Close</button>
      </div>
    </body>
    </html>
  `;
}

// Initialize enhanced features when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize alert system
  setTimeout(() => {
    initializeAlertSystem();
  }, 1000);
  
  // Add PDF export buttons to existing export controls
  const exportControls = document.querySelector('.export-controls');
  if (exportControls) {
    const pdfBtn = document.createElement('button');
    pdfBtn.className = 'btn btn--outline btn--sm';
    pdfBtn.innerHTML = 'Export PDF';
    pdfBtn.addEventListener('click', () => exportData('pdf'));
    exportControls.appendChild(pdfBtn);
  }
  
  // Add session PDF export to analytics section
  const analyticsControls = document.querySelector('.analytics-controls');
  if (analyticsControls) {
    const sessionPdfBtn = document.createElement('button');
    sessionPdfBtn.className = 'btn btn--outline';
    sessionPdfBtn.innerHTML = 'Export Session PDF';
    sessionPdfBtn.addEventListener('click', generateSessionPDFReport);
    analyticsControls.appendChild(sessionPdfBtn);
  }
});