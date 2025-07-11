let usingFrontCamera = false;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const switchBtn = document.getElementById('switch');
const detectBtn = document.getElementById('detect');
const uploadInput = document.getElementById('upload');

// Camera setup
async function startCamera() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: {
      facingMode: usingFrontCamera ? 'user' : 'environment',
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  };

  try {
    window.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = window.stream;
    video.onloadedmetadata = () => {
      video.play();
    };
  } catch (err) {
    console.error('Camera error:', err);
    alert('Could not access the camera. Please check permissions.');
  }
}

// Switch camera
switchBtn.onclick = () => {
  usingFrontCamera = !usingFrontCamera;
  startCamera();
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
    displayResults(data); // Add this line to show text results
    
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
  
  if (!data || !data.results || data.results.length === 0) {
    console.log('No detections found');
    return;
  }

  ctx.lineWidth = 3;
  ctx.font = '16px Arial';
  ctx.strokeStyle = '#00FF00';
  ctx.fillStyle = '#00FF00';

  data.results.forEach(result => {
    const { box, name, confidence } = result;
    
    // Convert box coordinates to canvas dimensions
    const x = box.x1 * canvas.width;
    const y = box.y1 * canvas.height;
    const width = (box.x2 - box.x1) * canvas.width;
    const height = (box.y2 - box.y1) * canvas.height;
    
    // Draw bounding box
    ctx.strokeRect(x, y, width, height);
    
    // Draw label background
    const text = `${name} (${(confidence * 100).toFixed(1)}%)`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 1, y - 20, textWidth + 10, 20);
    
    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, x + 5, y - 5);
  });
}

// NEW FUNCTION: Display text results
function displayResults(data) {
  // Create or get results container
  let resultsContainer = document.getElementById('results');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'results';
    document.body.appendChild(resultsContainer);
  }

  // Clear previous results
  resultsContainer.innerHTML = '';

  if (!data || !data.results || data.results.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No cables detected</div>';
    return;
  }

  // Add each result
  data.results.forEach(result => {
    const resultElement = document.createElement('div');
    resultElement.className = 'result';
    
    const status = result.confidence > 0.5 ? 'CONNECTED' : 'DISCONNECTED';
    const confidence = Math.round(result.confidence * 100);
    
    resultElement.innerHTML = `
      <div class="status ${status.toLowerCase()}">${status}</div>
      <div class="confidence">Confidence: ${confidence}%</div>
      <div class="type">Type: ${result.name || 'WLAN Cable'}</div>
    `;
    
    resultsContainer.appendChild(resultElement);
  });
}

// Initialize
startCamera();
