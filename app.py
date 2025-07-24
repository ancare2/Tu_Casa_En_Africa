from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import speech_recognition as sr
import tempfile

app = FastAPI()

# Permitir CORS para que el frontend pueda hacer requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Cambia esto por seguridad en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/voz")
async def procesar_audio(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await file.read())
        tmp.flush()

        r = sr.Recognizer()
        with sr.AudioFile(tmp.name) as source:
            audio = r.record(source)
            try:
                texto = r.recognize_google(audio, language="es-ES")
                return {"transcripcion": texto}
            except sr.UnknownValueError:
                return {"transcripcion": "No se entendió el audio"}
            except sr.RequestError:
                return {"transcripcion": "Error con el servicio de reconocimiento"}

