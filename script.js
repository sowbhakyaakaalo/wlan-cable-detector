const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const uploadInput = document.getElementById('uploadInput');
const canvas = document.getElementById('canvas');
const result = document.getElementById('result');

// Start camera
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => { video.srcObject = stream; })
  .catch(err => console.error("Camera error:", err));

// When capture button is clicked
captureBtn.onclick = async () => {
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(async (blob) => {
    await sendToAPI(blob);
  }, 'image/jpeg');
};

// When file is uploaded
uploadInput.onchange = async (event) => {
  const file = event.target.files[0];
  if (file) {
    await sendToAPI(file);
  }
};

// Send to backend
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
}

