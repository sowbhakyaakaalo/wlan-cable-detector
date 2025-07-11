let usingFrontCamera = false;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const switchBtn = document.getElementById('switch');
const detectBtn = document.getElementById('detect');
const uploadInput = document.getElementById('upload');

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
  captureAndDetect(video);
};

uploadInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width > 640 ? 640 : img.width;
      canvas.height = img.height * (canvas.width / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      sendToAPI();
    };
    img.src = URL.createObjectURL(file);
  }
});

function captureAndDetect(source) {
  const scale = 640 / source.videoWidth;
  const width = 640;
  const height = source.videoHeight * scale;

  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(source, 0, 0, width, height);
  sendToAPI();
}

async function sendToAPI() {
  canvas.toBlob(async blob => {
    const formData = new FormData();
    formData.append('file', blob);

    const res = await fetch('/api/detect', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    drawBoxes(data);
  }, 'image/jpeg');
}

function drawBoxes(data) {
  if (!data.images) return;

  data.images[0].results.forEach(result => {
    const box = result.box;
    const name = result.name;

    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    ctx.fillStyle = 'lime';
    ctx.font = '18px Arial';
    ctx.fillText(name, box.x + 5, box.y - 5);
  });
}

startCamera();
