import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Permitir solo GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://ancare2.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end(); // Responder preflight
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ text: 'Método no permitido' });
  }

  const { prompt, datos } = req.body;

  if (!prompt) {
    return res.status(400).json({ text: 'Prompt es obligatorio' });
  }

  try {
    // Si no hay datos, solo enviamos prompt a OpenAI
    const bodyToSend = datos
      ? { prompt, datos }
      : { prompt };

    const response = await fetch('https://tucasaenafrica-africa.up.railway.app/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyToSend)
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('Error en proxy:', err);
    res.status(500).json({ text: 'Error en proxy' });
  }
}
