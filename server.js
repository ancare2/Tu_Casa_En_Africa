import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv'; // ⚠️ necesario

// --- Cargar variables de entorno solo en desarrollo ---
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  console.log('✅ Variables cargadas desde .env');
}

// --- DEBUG: imprimir variable OPENAI_API_KEY ---
console.log('🔍 DEBUG: process.env.OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY ? '[OK]' : '[NO DEFINIDA]');
  console.log('🔍 DEBUG: NODE_ENV:', process.env.NODE_ENV);
  console.log('🔍 Variables de entorno:', process.env);

const app = express();

// --- Comprobar variable de entorno ---
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: La variable OPENAI_API_KEY no está definida. Revisa tu configuración en Railway.');
  process.exit(1); // Detiene la app si no hay API key
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SECRET_TOKEN = process.env.SECRET_TOKEN || null;

console.log('🔑 OPENAI_API_KEY está definida ✅');

// --- CORS: solo frontend deployado ---
const allowedOrigin = 'https://tucasaenafrica-africa.up.railway.app';
app.use(cors({ origin: allowedOrigin }));

app.use(bodyParser.json());

// --- Helper para enviar prompt a OpenAI ---
async function fetchOpenAI(prompt) {
  console.log('➡️ Enviando prompt a OpenAI (truncado a 500 chars):');
  console.log(prompt.slice(0, 500) + (prompt.length > 500 ? '... [truncado]' : ''));

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': Bearer ${OPENAI_API_KEY},
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

  console.log('Status OpenAI:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error del API OpenAI:', errorText);
    throw new Error(OpenAI Error: ${response.status});
  }

  const data = await response.json();
  console.log('Respuesta OpenAI (truncada a 500 chars):', JSON.stringify(data).slice(0, 500));

  return data?.choices?.[0]?.message?.content || null;
}

// --- Ruta POST ---
app.post('/api/generate', async (req, res) => {
  console.log('➡️ Nueva petición a /api/generate');

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
      console.log(➡️ Procesando lote ${i+1}/${batches.length} (registros: ${batches[i].length}));
      const batchPrompt = ${prompt}\n\nDatos del lote ${i+1}:\n${JSON.stringify(batches[i])};
      const resumen = await fetchOpenAI(batchPrompt);
      if (!resumen) {
        console.error(⚠️ Lote ${i+1} sin respuesta);
      } else {
        console.log(✅ Lote ${i+1} procesado);
      }
      resúmenesParciales.push(resumen);
    }

    console.log('➡️ Combinando resúmenes parciales...');
    const resumenFinalPrompt = Combina estos resúmenes parciales en un resumen global único, coherente y profesional:\n${JSON.stringify(resúmenesParciales)};
    const resumenGlobal = await fetchOpenAI(resumenFinalPrompt);

    if (!resumenGlobal) {
      console.error('⚠️ No se recibió resumen global');
      return res.status(500).json({ text: '⚠️ No se recibió respuesta válida de la IA.' });
    }

    console.log('✅ Resumen global generado');
    res.json({ text: resumenGlobal });

  } catch (err) {
    console.error('❌ Error en la generación:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(✅ Servidor escuchando en http://0.0.0.0:${PORT}));
