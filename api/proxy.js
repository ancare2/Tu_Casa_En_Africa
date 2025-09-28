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

  if (!prompt || !Array.isArray(datos)) {
    return res.status(400).json({ text: 'Prompt y datos son obligatorios' });
  }

  try {
    // Aquí llamamos a tu backend en Railway o directamente a OpenAI
    const response = await fetch('https://tucasaenafrica-africa.up.railway.app/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, datos })
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error('Error en proxy:', err);
    res.status(500).json({ text: 'Error en proxy' });
  }
}
