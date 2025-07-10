const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const uploadInput = document.getElementById('uploadInput');
const canvas = document.getElementById('canvas');
const result = document.getElementById('result');

// Start the camera feed
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    console.error("Camera error:", err);
  });

// Capture from live camera
captureBtn.onclick = async () => {
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async (blob) => {
    await sendToAPI(blob);
  }, 'image/jpeg');
};

// Upload image file
uploadInput.onchange = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await sendToAPI(file);
  }
};

// Send to Ultralytics API through your serverless function
async function sendToAPI(imageFile) {
  result.innerText = "Detecting...";

  const formData = new FormData();
  formData.append('file', imageFile);

  const res = await fetch('/api/detect', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  result.innerText = JSON.stringify(data, null, 2);

  // Draw the uploaded image or snapshot to canvas
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // === Draw bounding boxes if present ===
    if (data.image && data.image[0] && data.image[0].objects) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.font = '16px Arial';
      ctx.fillStyle = 'red';

      data.image[0].objects.forEach(obj => {
        // NOTE: Adjust box format if needed!
        const [x, y, w, h] = obj.box;  // This depends on your API’s box format
        ctx.strokeRect(x, y, w, h);
        ctx.fillText(`${obj.name} (${(obj.confidence * 100).toFixed(1)}%)`, x, y - 5);
      });
    }
  };

  img.src = URL.createObjectURL(imageFile);
}
