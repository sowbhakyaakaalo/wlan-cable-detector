export const config = {
  api: {
    bodyParser: false,
  },
};

import formidable from 'formidable';
import fs from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const form = new formidable.IncomingForm();
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    if (!files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileStream = fs.createReadStream(files.file[0].filepath);
    const formData = new FormData();
    formData.append('file', fileStream);

    const apiUrl = 'https://predict.ultralytics.com';
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ULTRA_API_KEY,
      },
      body: formData
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      throw new Error(`API request failed: ${apiResponse.status} - ${errorData}`);
    }

    const data = await apiResponse.json();
    res.status(200).json(data);
    
    // Clean up the temporary file
    fs.unlink(files.file[0].filepath, () => {});
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      details: error.message 
    });
  }
}
