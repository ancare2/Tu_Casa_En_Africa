import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Permitir GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', 'https://ancare2.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ text: 'Método no permitido' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ text: 'Prompt es obligatorio' });

  // DEBUG: logear prompt
  console.log('🔹 Prompt recibido:', prompt.slice(0, 200) + (prompt.length > 200 ? '...' : ''));

  try {
    // Llamar a OpenAI directamente
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Eres un asistente que ayuda a analizar registros médicos de pacientes.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();

    // DEBUG: logear respuesta
    console.log('🔹 Respuesta de OpenAI:', data);

    const text = data?.choices?.[0]?.message?.content || '';
    res.json({ text });

  } catch (err) {
    console.error('❌ Error en proxy:', err);
    res.status(500).json({ text: 'Error en proxy' });
  }
}

