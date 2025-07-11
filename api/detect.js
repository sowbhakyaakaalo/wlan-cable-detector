export const config = {
  api: {
    bodyParser: false,
  },
};

const formidable = require('formidable');
const fs = require('fs');
const fetch = require('node-fetch');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const form = formidable();
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    if (!files?.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    const fileBuffer = fs.readFileSync(uploadedFile.filepath);

    const apiResponse = await fetch('https://predict.ultralytics.com', {
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
        file: {
          name: uploadedFile.originalFilename,
          data: fileBuffer.toString('base64'),
          type: uploadedFile.mimetype
        }
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Ultralytics API Error:', errorText);
      throw new Error(`API Error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    res.status(200).json(data);

    // Clean up
    fs.unlink(uploadedFile.filepath, () => {});

  } catch (error) {
    console.error('Full error:', error);
    res.status(500).json({
      error: 'Detection failed',
      details: error.message,
    });
  }
}
