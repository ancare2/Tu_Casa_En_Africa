const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

dotenv.config();

const app = express();

// Middleware para logs básicos y CORS explícito
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} from origin: ${req.headers.origin}`);
  res.header('Access-Control-Allow-Origin', '*'); // permitir cualquier origen (o especifica tu dominio)
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    console.log('Responding to OPTIONS preflight');
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('❌ ERROR: La variable OPENROUTER_API_KEY no está definida.');
  process.exit(1);
}

app.post('/api/generate', async (req, res) => {
  console.log('Recibida solicitud /api/generate');

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
        ]
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});







