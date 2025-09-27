app.post('/api/generate', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Recibida solicitud POST /api/generate`);

  const { prompt } = req.body;

  if (!prompt) {
    console.warn('❌ No se recibió "prompt" en la petición');
    return res.status(400).json({ text: '❌ El campo "prompt" es obligatorio.' });
  }

  console.log('Enviando prompt a OpenRouter API:', prompt);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Eres un asistente que ayuda a analizar registros médicos de pacientes desde una hoja de cálculo.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: parseInt(process.env.MAX_TOKENS || "800") // <- límite seguro para no gastar todos los créditos
      })
    });

    console.log('Respuesta recibida del API, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta del API:', errorText);
      return res.status(response.status).json({ text: `❌ Error del API: ${response.status}` });
    }

    const data = await response.json();
    console.log('Datos recibidos:', data);

    const text = data?.choices?.[0]?.message?.content;

    if (text) {
      console.log('Respuesta procesada correctamente, enviando texto al cliente.');
      res.json({ text });
    } else {
      console.error('⚠️ Respuesta inesperada del API:', data);
      res.status(500).json({ text: '⚠️ No se recibió una respuesta válida de la IA.' });
    }
  } catch (err) {
    console.error('❌ Error al consultar OpenRouter:', err);
    res.status(500).json({ text: '❌ Error al consultar la IA.' });
  }
});






