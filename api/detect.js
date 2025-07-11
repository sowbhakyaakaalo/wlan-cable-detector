export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';
import fs from 'fs';

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

    if (!files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file as a Buffer
    const fileBuffer = fs.readFileSync(files.file[0].filepath);

    // Send to Ultralytics API
    const apiUrl = 'https://predict.ultralytics.com';
    const response = await fetch(apiUrl, {
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
        file: fileBuffer.toString('base64'), // Send as base64
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json(data);

    // Clean up the temp file
    fs.unlink(files.file[0].filepath, () => {});

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({
      error: 'Detection failed',
      details: error.message,
    });
  }
}
