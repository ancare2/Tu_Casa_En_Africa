const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

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
        ]
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '⚠️ No se recibió respuesta útil.';
    res.json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ text: '❌ Error al consultar la IA.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});
