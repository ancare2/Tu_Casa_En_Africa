import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

// --- CORS: solo permite el frontend deployado en Railway ---
const allowedOrigin = 'https://tucasaenafrica-africa.up.railway.app';
app.use(cors({
  origin: allowedOrigin
}));

app.use(bodyParser.json());

// --- Variables de entorno ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SECRET_TOKEN = process.env.SECRET_TOKEN || null;

// --- Ruta POST para generar texto ---
app.post('/api/generate', async (req, res) => {
  console.log('➡️ Nueva petición a /api/generate');
  console.log('Cuerpo de la petición:', req.body);

  // Validar token si se configuró
  if (SECRET_TOKEN) {
    const token = req.headers['x-api-key'];
    console.log('Token recibido:', token);
    if (token !== SECRET_TOKEN) {
      console.error('❌ Token inválido');
      return res.status(401).json({ text: '❌ Acceso denegado. Token inválido.' });
    }
  }

  const { prompt } = req.body;
  if (!prompt) {
    console.error('❌ Prompt vacío');
    return res.status(400).json({ text: '❌ El campo "prompt" es obligatorio.' });
  }

  try {
    console.log('➡️ Enviando petición a OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Eres un asistente que ayuda a analizar registros médicos de pacientes." },
          { role: "user", content: prompt }
        ],
        max_tokens: 800
      })
    });

    console.log('Status de la respuesta OpenAI:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del API OpenAI:', errorText);
      return res.status(response.status).json({ text: `❌ Error del API OpenAI: ${response.status}` });
    }

    const data = await response.json();
    console.log('Respuesta completa de OpenAI:', JSON.stringify(data, null, 2));

    const text = data?.choices?.[0]?.message?.content;

    if (text) {
      console.log('✅ Respuesta extraída:', text);
      res.json({ text });
    } else {
      console.error('⚠️ Respuesta inesperada de OpenAI:', data);
      res.status(500).json({ text: '⚠️ No se recibió respuesta válida de la IA.' });
    }

  } catch (err) {
    console.error('❌ Error al conectar con OpenAI:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor escuchando en http://localhost:${PORT}`));




