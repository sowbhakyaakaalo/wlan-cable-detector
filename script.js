let usingFrontCamera = false;

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const switchBtn = document.getElementById('switch');
const detectBtn = document.getElementById('detect');

async function startCamera() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
  }

  const constraints = {
    video: {
      facingMode: usingFrontCamera ? 'user' : 'environment'
    }
  };

  try {
    window.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = window.stream;
  } catch (err) {
    alert('Camera error: ' + err);
  }
}

switchBtn.onclick = () => {
  usingFrontCamera = !usingFrontCamera;
  startCamera();
};

detectBtn.onclick = async () => {
  // Resize capture to 640px width
  const scale = 640 / video.videoWidth;
  const width = 640;
  const height = video.videoHeight * scale;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(video, 0, 0, width, height);

  canvas.toBlob(async blob => {
    const formData = new FormData();
    formData.append('file', blob);

    const res = await fetch('/api/detect', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    // Draw boxes
    data.images[0].results.forEach(result => {
      const box = result.box;
      const name = result.name;

      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);

      ctx.fillStyle = 'lime';
      ctx.font = '18px Arial';
      ctx.fillText(name, box.x, box.y - 5);
    });
  }, 'image/jpeg');
};

startCamera();
