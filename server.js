import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

dotenv.config();
const app = express();

// --- CORS: solo frontend deployado ---
const allowedOrigin = 'https://tucasaenafrica-africa.up.railway.app';
app.use(cors({ origin: allowedOrigin }));
app.use(bodyParser.json());

// --- Variables de entorno ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SECRET_TOKEN = process.env.SECRET_TOKEN || null;

console.log('🔑 OpenAI API Key cargada?', !!OPENAI_API_KEY);

// --- Función helper para enviar prompt a OpenAI ---
async function fetchOpenAI(prompt) {
  console.log('📨 Enviando prompt a OpenAI (longitud:', prompt.length, 'caracteres)');
  
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

  console.log('🔹 Status de respuesta OpenAI:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error del API OpenAI:', errorText);
    throw new Error(`OpenAI Error: ${response.status}`);
  }

  const data = await response.json();
  console.log('🔹 Datos completos de OpenAI:', JSON.stringify(data, null, 2));

  return data?.choices?.[0]?.message?.content || null;
}

// --- Ruta POST ---
app.post('/api/generate', async (req, res) => {
  console.log('➡️ Nueva petición a /api/generate');
  console.log('Cuerpo recibido:', req.body);

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
    // --- Trocear datos en lotes de 50 ---
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < datos.length; i += BATCH_SIZE) {
      batches.push(datos.slice(i, i + BATCH_SIZE));
    }

    console.log('📦 Número de lotes creados:', batches.length);

    const resúmenesParciales = [];
    for (let i = 0; i < batches.length; i++) {
      console.log(`➡️ Procesando lote ${i + 1}/${batches.length}`);
      const batchPrompt = `${prompt}\n\nDatos del lote ${i + 1}:\n${JSON.stringify(batches[i])}`;
      const resumen = await fetchOpenAI(batchPrompt);
      if (!resumen) {
        console.error('⚠️ Lote sin respuesta:', i + 1, 'Contenido del lote:', batches[i]);
      } else {
        console.log('✅ Resumen parcial recibido:', resumen.slice(0, 200), '...'); // solo los primeros 200 chars
      }
      resúmenesParciales.push(resumen);
    }

    // --- Combinar resúmenes parciales ---
    const resumenFinalPrompt = `Combina estos resúmenes parciales en un resumen global único, coherente y profesional:\n${JSON.stringify(resúmenesParciales)}`;
    console.log('📨 Prompt final para combinar resúmenes (longitud:', resumenFinalPrompt.length, ')');

    const resumenGlobal = await fetchOpenAI(resumenFinalPrompt);

    if (!resumenGlobal) {
      console.error('⚠️ No se recibió resumen global');
      return res.status(500).json({ text: '⚠️ No se recibió respuesta válida de la IA.' });
    }

    console.log('✅ Resumen global generado con éxito');
    res.json({ text: resumenGlobal });

  } catch (err) {
    console.error('❌ Error al conectar con OpenAI:', err);
    res.status(500).json({ text: '❌ Error al conectar con la IA.' });
  }
});

// --- Puerto ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor escuchando en http://localhost:${PORT}`));

