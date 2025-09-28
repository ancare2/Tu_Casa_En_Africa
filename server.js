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
  console.error('❌ ERROR: La variable OPENAI_API_KEY no está definida en Railway.');
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SECRET_TOKEN = process.env.SECRET_TOKEN || null;

// --- CORS manual con logs ---
const allowedOrigins = [
  'https://tucasaenafrica-africa.up.railway.app',
  'https://ancare2.github.io'
];

app.use((req, res, next) => {
  console.log('🌐 Nueva request:', req.method, 'Origin:', req.headers.origin, 'URL:', req.originalUrl);

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log('✅ Origin permitido:', origin);
  } else {
    console.log('⚠️ Origin NO permitido:', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-api-key');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    console.log('🔹 Respondiendo preflight OPTIONS');
    return res.sendStatus(204);
  }

  next();
});

// --- Body parser ---
app.use(bodyParser.json());

// --- Helper para OpenAI ---
async function fetchOpenAI(prompt) {
  console.log('➡️ Enviando prompt a OpenAI (truncado a 500 chars):', prompt.slice(0, 500));

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

  console.log('Status OpenAI:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error OpenAI:', errorText);
    throw new Error(`OpenAI Error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🔹 Respuesta OpenAI (truncada 500 chars):', JSON.stringify(data).slice(0, 500));
  return data?.choices?.[0]?.message?.content || null;
}

// --- Ruta POST /api/generate ---
app.post('/api/generate', async (req, res) => {
  console.log('➡️ POST /api/generate recibida');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  if (SECRET_TOKEN) {
    const token = req.headers['x-api-key'];
    console.log('Token recibido:', token);
    if (token !== SECRET_TOKEN) {
      console.error('❌ Token inválido');
      return res.status(401).json({ text: '❌ Acceso denegado. Token inválido.' });
    }
  }

  const { prompt, datos } = req.body;
  if (!prompt || !Array.isArray(datos) || datos.length === 0) {
    console.error('❌ Prompt vacío o datos no válidos');
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
      console.log(`➡️ Procesando lote ${i + 1}/${batches.length} (registros: ${batches[i].length})`);
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




