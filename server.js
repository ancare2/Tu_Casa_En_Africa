import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// --- Cargar variables de entorno ---
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('✅ Variables cargadas desde .env');
}

// --- DEBUG ---
console.log('🔍 DEBUG: process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[OK]' : '[NO DEFINIDA]');
console.log('🔍 DEBUG: NODE_ENV:', process.env.NODE_ENV);

const app = express();

// --- Comprobar API Key ---
if (!process.env.OPENAI_API_KEY) {
  throw new Error('❌ ERROR: La variable OPENAI_API_KEY no está definida en Railway.');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- Body parser ---
app.use(bodyParser.json());

// --- Middleware CORS para pruebas (permite todo temporalmente) ---
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Temporal para GitHub Pages
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Helper para llamar a OpenAI ---
async function fetchOpenAI(prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
    throw new Error(`OpenAI Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

// --- Ruta proxy para GitHub Pages ---
app.post('/api/proxy', async (req, res) => {
  console.log('➡️ POST /api/proxy recibida');
  console.log('Body:', req.body);

  const { prompt, datos } = req.body;
  if (!prompt || !Array.isArray(datos) || datos.length === 0) {
    return res.status(400).json({ text: '❌ Prompt y datos son obligatorios.' });
  }

  try {
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < datos.length; i += BATCH_SIZE) {
      batches.push(datos.slice(i, i + BATCH_SIZE));
    }

    const resúmenesParciales = [];
    for (let i = 0; i < batches.length; i++) {
      const batchPrompt = `${prompt}\n\nDatos del lote ${i + 1}:\n${JSON.stringify(batches[i])}`;
      const resumen = await fetchOpenAI(batchPrompt);
      resúmenesParciales.push(resumen || '');
    }

    const resumenFinalPrompt = `Combina estos resúmenes parciales en un resumen global único, coherente y profesional:\n${JSON.stringify(resúmenesParciales)}`;
    const resumenGlobal = await fetchOpenAI(resumenFinalPrompt);

    res.json({ text: resumenGlobal });
  } catch (err) {
    console.error('❌ Error en la generación:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto Railway ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Servidor escuchando en http://0.0.0.0:${PORT}`));




