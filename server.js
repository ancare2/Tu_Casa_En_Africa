import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

// --- Middleware ---
app.use(cors()); // Puedes restringir el origen en producción
app.use(bodyParser.json());

// --- Ruta POST para generar texto con OpenAI ---
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ text: '❌ Prompt es obligatorio.' });
  }

  try {
    console.log('➡️ Enviando prompt a OpenAI:', prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''));

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error OpenAI:', errorText);
      return res.status(500).json({ text: `❌ Error OpenAI: ${response.status}` });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (text) {
      console.log('✅ Respuesta procesada correctamente, enviando texto al cliente.');
      res.json({ text });
    } else {
      console.error('⚠️ Respuesta inesperada de OpenAI:', data);
      res.status(500).json({ text: '⚠️ No se recibió una respuesta válida de la IA.' });
    }

  } catch (err) {
    console.error('❌ Error al consultar OpenAI:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});


