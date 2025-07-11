// ✅ api/detect.js
import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data'; // ✅ Make sure you installed this!

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const form = new formidable.IncomingForm();

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error parsing the file.' });
      }

      const file = fs.createReadStream(files.file[0].filepath);

      const formData = new FormData();
      formData.append('file', file);

      // ✅ ✅ ✅ THIS WAS MISSING!
      formData.append('model', process.env.ULTRA_MODEL_URL);

      const response = await fetch('https://predict.ultralytics.com', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ULTRA_API_KEY,
          ...formData.getHeaders(), // ✅ Required for multipart upload!
        },
        body: formData,
      });

      const data = await response.json();
      res.status(200).json(data);
    });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
