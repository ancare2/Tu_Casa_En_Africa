import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// --- Cargar variables de entorno solo en desarrollo ---
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('✅ Variables cargadas desde .env');
}

// --- DEBUG: imprimir variable OPENAI_API_KEY ---
console.log('🔍 DEBUG: process.env.OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY ? '[OK]' : '[NO DEFINIDA]');
console.log('🔍 DEBUG: NODE_ENV:', process.env.NODE_ENV);

const app = express();

// --- Comprobar variable de entorno ---
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: La variable OPENAI_API_KEY no está definida. Revisa tu configuración en Railway.');
  process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// --- CORS: permitir GitHub Pages y tu dominio deployado ---
const allowedOrigins = [
  'https://ancare2.github.io',
  'https://tucasaenafrica-africa.up.railway.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (ej: Postman) y los que están en allowedOrigins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-api-key']
}));

app.use(bodyParser.json());

// --- Helper para enviar prompt a OpenAI ---
async function fetchOpenAI(prompt) {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || null;
}

// --- Ruta POST ---
app.post('/api/generate', async (req, res) => {
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
      const batchPrompt = `${prompt}\n\nDatos del lote ${i+1}:\n${JSON.stringify(batches[i])}`;
      const resumen = await fetchOpenAI(batchPrompt);
      resúmenesParciales.push(resumen);
    }

    const resumenFinalPrompt = `Combina estos resúmenes parciales en un resumen global único, coherente y profesional:\n${JSON.stringify(resúmenesParciales)}`;
    const resumenGlobal = await fetchOpenAI(resumenFinalPrompt);

    if (!resumenGlobal) {
      return res.status(500).json({ text: '⚠️ No se recibió respuesta válida de la IA.' });
    }

    res.json({ text: resumenGlobal });
  } catch (err) {
    console.error('❌ Error en la generación:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`✅ Servidor escuchando en http://0.0.0.0:${PORT}`));




