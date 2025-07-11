export const config = {
  api: {
    bodyParser: false,
  },
};

// Use explicit require syntax with proper error handling
let formidable;
try {
  formidable = require('formidable');
} catch (e) {
  console.error('Failed to require formidable:', e);
  formidable = require('formidable').default || require('formidable');
}

const fs = require('fs');
const fetch = require('node-fetch');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const form = new formidable.IncomingForm();
    
    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    if (!files?.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileBuffer = fs.readFileSync(files.file[0].filepath);

    const response = await fetch('https://predict.ultralytics.com', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ULTRA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ULTRA_MODEL_URL,
        imgsz: 640,
        conf: 0.25,
        iou: 0.45,
        file: fileBuffer.toString('base64'),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json(data);

    // Clean up temp file
    fs.unlink(files.file[0].filepath, () => {});

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({
      error: 'Detection failed',
      details: error.message,
    });
  }
}
