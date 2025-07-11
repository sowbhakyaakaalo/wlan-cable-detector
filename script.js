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
  if (!data.images) {
    alert('No detection results!');
    return;
  }

  ctx.lineWidth = 2;
  ctx.font = '18px Arial';
  ctx.strokeStyle = 'lime';
  ctx.fillStyle = 'lime';

  data.images[0].results.forEach(result => {
    const box = result.box;
    let x, y, w, h;

    if (box.width && box.height) {
      x = box.x;
      y = box.y;
      w = box.width;
      h = box.height;
    } else if (box.x1 !== undefined) {
      x = box.x1;
      y = box.y1;
      w = box.x2 - box.x1;
      h = box.y2 - box.y1;
    }

    ctx.strokeRect(x, y, w, h);
    ctx.fillText(result.name, x + 5, y - 5);
  });
}


startCamera();
