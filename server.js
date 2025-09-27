import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();
const app = express();
app.use(cors());
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ text: '❌ El campo "prompt" es obligatorio.' });

  try {
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

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (text) res.json({ text });
    else res.status(500).json({ text: '⚠️ No se recibió respuesta válida de la IA.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor escuchando en http://localhost:${PORT}`));


