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

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('model', process.env.ULTRA_MODEL_URL);
    formData.append('imgsz', '640');
    formData.append('conf', '0.25');
    formData.append('iou', '0.45');
    formData.append('file', new Blob([fileBuffer]), uploadedFile.originalFilename);

    const apiResponse = await fetch('https://predict.ultralytics.com', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ULTRA_API_KEY,
      },
      body: formData
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
