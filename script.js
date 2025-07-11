let usingFrontCamera = false;
let stream = null;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const switchBtn = document.getElementById('switch');
const detectBtn = document.getElementById('detect');
const uploadInput = document.getElementById('upload');

// Enhanced camera setup with mobile support
async function startCamera() {
  // Stop existing stream
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: {
      facingMode: usingFrontCamera ? 'user' : { exact: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
      .catch(() => navigator.mediaDevices.getUserMedia({ video: true })); // Fallback
    
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();
  } catch (err) {
    console.error('Camera error:', err);
    alert('Camera access denied. Please enable camera permissions.');
  }
}

// Mobile-friendly camera switch
switchBtn.onclick = async () => {
  usingFrontCamera = !usingFrontCamera;
  switchBtn.disabled = true;
  try {
    await startCamera();
  } finally {
    switchBtn.disabled = false;
  }
};

// Capture and detect
detectBtn.onclick = () => {
  captureAndDetect(video);
};

// Handle file upload
uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 640;
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      sendToAPI();
    };
    img.src = URL.createObjectURL(file);
  }
});

function captureAndDetect(source) {
  const maxWidth = 640;
  const scale = maxWidth / source.videoWidth;
  canvas.width = maxWidth;
  canvas.height = source.videoHeight * scale;
  
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  sendToAPI();
}

async function sendToAPI() {
  try {
    detectBtn.disabled = true;
    detectBtn.textContent = 'Processing...';
    
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });
    
    const formData = new FormData();
    formData.append('file', blob, 'detection.jpg');
    
    const response = await fetch('/api/detect', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    drawBoxes(data);
    displayResults(data);
    
  } catch (error) {
    console.error('Detection error:', error);
    alert('Detection failed: ' + error.message);
  } finally {
    detectBtn.disabled = false;
    detectBtn.textContent = '✅ Capture & Detect';
  }
}

function drawBoxes(data) {
  // Clear previous drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  if (!data?.results?.length) {
    return;
  }

  ctx.lineWidth = 3;
  ctx.font = '16px Arial';

  data.results.forEach(result => {
    const { box, name, confidence } = result;
    const isConnected = confidence > 0.5;
    
    // Set colors based on connection status
    ctx.strokeStyle = isConnected ? '#4CAF50' : '#F44336';
    ctx.fillStyle = isConnected ? '#4CAF50' : '#F44336';
    
    // Convert box coordinates
    const x = box.x1 * canvas.width;
    const y = box.y1 * canvas.height;
    const width = (box.x2 - box.x1) * canvas.width;
    const height = (box.y2 - box.y1) * canvas.height;
    
    // Draw bounding box
    ctx.strokeRect(x, y, width, height);
    
    // Draw label background
    const text = `${isConnected ? 'CONNECTED' : 'DISCONNECTED'} (${Math.round(confidence * 100)}%)`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 1, y - 20, textWidth + 10, 20);
    
    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + 5, y - 5);
  });
}

function displayResults(data) {
  const resultsContainer = document.getElementById('results') || createResultsContainer();
  resultsContainer.innerHTML = '';
  
  if (!data?.results?.length) {
    resultsContainer.innerHTML = '<div class="no-results">No cables detected</div>';
    return;
  }

  data.results.forEach(result => {
    const resultElement = document.createElement('div');
    resultElement.className = `result ${result.confidence > 0.5 ? 'connected' : 'disconnected'}`;
    
    resultElement.innerHTML = `
      <div class="status">${result.confidence > 0.5 ? 'CONNECTED' : 'DISCONNECTED'}</div>
      <div class="confidence">Confidence: ${Math.round(result.confidence * 100)}%</div>
      <div class="coordinates">Position: (${Math.round(result.box.x1 * 100)}, ${Math.round(result.box.y1 * 100)})</div>
    `;
    
    resultsContainer.appendChild(resultElement);
  });
}

function createResultsContainer() {
  const container = document.createElement('div');
  container.id = 'results';
  container.className = 'results-container';
  document.body.appendChild(container);
  return container;
}

// Initialize
startCamera();
