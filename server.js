import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ text: '❌ El campo "prompt" es obligatorio.' });
  }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta del API:', errorText);
      return res.status(response.status).json({ text: `❌ Error del API: ${response.status}` });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (text) {
      res.json({ text });
    } else {
      console.error('⚠️ Respuesta inesperada:', data);
      res.status(500).json({ text: '⚠️ No se recibió una respuesta válida de la IA.' });
    }
  } catch (err) {
    console.error('❌ Error al consultar OpenRouter:', err);
    res.status(500).json({ text: '❌ Error al consultar la IA.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});

