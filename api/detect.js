export default async function handler(req, res) {
  if (req.method === 'POST') {
    const formData = new FormData();
    formData.append('file', req.body);

    const response = await fetch("https://predict.ultralytics.com", {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ULTRA_API_KEY
      },
      body: req
    });

    const data = await response.json();
    res.status(200).json(data);
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

