const video = document.getElementById('video');
const videoCanvas = document.getElementById('videoCanvas');
const videoCtx = videoCanvas.getContext('2d');
const detectBtn = document.getElementById('detectBtn');

const uploadInput = document.getElementById('uploadInput');
const uploadCanvas = document.getElementById('uploadCanvas');
const uploadCtx = uploadCanvas.getContext('2d');

// Start video stream
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
    video.play();
  });

// Set canvas size to video size
video.addEventListener('loadedmetadata', () => {
  videoCanvas.width = video.videoWidth;
  videoCanvas.height = video.videoHeight;
});

// Handle camera detect
detectBtn.addEventListener('click', () => {
  videoCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);
  videoCanvas.toBlob(blob => {
    sendImage(blob, videoCtx, videoCanvas);
  }, 'image/jpeg');
});

// Handle upload detect
uploadInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    uploadCanvas.width = img.width;
    uploadCanvas.height = img.height;
    uploadCtx.drawImage(img, 0, 0);
    imgToBlob(img).then(blob => sendImage(blob, uploadCtx, uploadCanvas));
  };
  img.src = URL.createObjectURL(file);
});

// Send image to Ultralytics API
async function sendImage(blob, ctx, canvas) {
  const formData = new FormData();
  formData.append('file', blob);

  const response = await fetch('/api/detect', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  drawBoxes(result, ctx, canvas);
}

// Draw bounding boxes & labels
function drawBoxes(result, ctx, canvas) {
  ctx.lineWidth = 2;
  ctx.font = "16px Arial";
  ctx.strokeStyle = "#00FF00";
  ctx.fillStyle = "#00FF00";

  result.images[0].results.forEach(det => {
    const [x1, y1, x2, y2] = [det.box.x, det.box.y, det.box.width, det.box.height];
    ctx.beginPath();
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
    ctx.fillText(`${det.name} (${(det.confidence * 100).toFixed(1)}%)`, x1, y1 - 5);
  });
}

// Helper: convert image to blob
function imgToBlob(img) {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;
  tempCanvas.getContext('2d').drawImage(img, 0, 0);
  return new Promise(resolve => tempCanvas.toBlob(resolve, 'image/jpeg'));
}
