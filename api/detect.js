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

    // Debugging log (remove in production)
    console.log('Uploaded files:', JSON.stringify(files, null, 2));

    if (!files || !files.file || !files.file[0]) {
      return res.status(400).json({ error: 'No valid file uploaded' });
    }

    const uploadedFile = files.file[0];
    if (!uploadedFile.filepath) {
      return res.status(400).json({ error: 'File has no path' });
    }

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
        file: fileBuffer.toString('base64'),
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Ultralytics API error: ${apiResponse.status} - ${errorText}`);
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
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
