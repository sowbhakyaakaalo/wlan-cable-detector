export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const { readable, writable } = new TransformStream();
  const formData = await req.formData();
  const file = formData.get('file');

  const body = new FormData();
  body.set('model', process.env.ULTRA_MODEL_URL);
  body.set('imgsz', 640);
  body.set('conf', 0.25);
  body.set('iou', 0.45);
  body.set('file', file);

  const response = await fetch('https://predict.ultralytics.com', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ULTRA_API_KEY
    },
    body: body
  });

  const result = await response.text();
  const writer = writable.getWriter();
  writer.write(new TextEncoder().encode(result));
  writer.close();

  return new Response(readable, {
    headers: { "Content-Type": "application/json" }
  });
}


