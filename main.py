import chainlit as cl
import speech_recognition as sr
import pandas as pd
import os
import asyncio
import httpx
from dotenv import load_dotenv
import os

ARCHIVO_EXCEL = "formulario.xlsx"
CAMPOS = ["Pueblo", "Nombre Persona", "Motivo Consulta", "Diagnóstico", "Tratamiento"]
formulario = {campo: "" for campo in CAMPOS}

grabando = False
campo_actual = None
campo_editando = None


load_dotenv()
HF_API_TOKEN = os.getenv("HF_API_TOKEN")


def inicializar_excel():
    if not os.path.exists(ARCHIVO_EXCEL):
        df = pd.DataFrame([formulario])
        df.to_excel(ARCHIVO_EXCEL, index=False)

def actualizar_excel():
    if os.path.exists(ARCHIVO_EXCEL):
        df_existente = pd.read_excel(ARCHIVO_EXCEL)
        df_actualizado = pd.concat([df_existente, pd.DataFrame([formulario])], ignore_index=True)
    else:
        df_actualizado = pd.DataFrame([formulario])
    df_actualizado.to_excel(ARCHIVO_EXCEL, index=False)

async def pulir_texto_con_ia(texto: str) -> str:
    url = "https://api-inference.huggingface.co/models/google/flan-t5-base"
    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}
    payload = {"inputs": f"summarize: {texto}"}

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            print(f"Error HTTP: {e.response.status_code}")
            return texto

        salida = response.json()

    if isinstance(salida, list) and "generated_text" in salida[0]:
        return salida[0]["generated_text"]
    else:
        return texto

def reconocer_voz_continuo():
    global grabando
    r = sr.Recognizer()
    texto_completo = ""
    with sr.Microphone() as source:
        print("🎙️ Ajustando para ruido ambiental...")
        r.adjust_for_ambient_noise(source, duration=1.5)
        r.energy_threshold = 300
        print("🎙️ Empieza a hablar...")

        while grabando:
            try:
                audio = r.listen(source, timeout=5, phrase_time_limit=10)
                texto = r.recognize_google(audio, language="es-ES")
                print(f"Escuchado: {texto}")
                if "parar" in texto.lower():
                    print("Detectado 'parar', terminando grabación.")
                    break
                texto_completo += texto + " "
            except sr.WaitTimeoutError:
                print("⏰ No se detectó voz, sigo esperando...")
            except sr.UnknownValueError:
                print("No entendí, continúa hablando...")
            except sr.RequestError as e:
                print(f"Error de servicio: {e}")
                break

    return texto_completo.strip()

@cl.on_chat_start
async def start():
    inicializar_excel()
    await cl.Message(content="🩺 Formulario de Consulta Médica por Voz").send()
    await mostrar_botones()

async def mostrar_botones():
    actions = [
        cl.Action(name="empezar_grabacion", label=campo, payload={"campo": campo})
        for campo in CAMPOS
    ]
    actions.append(cl.Action(name="detener_grabacion", label="Detener Grabación", payload={}))
    await cl.Message(content="Haz clic en un botón para empezar a hablar o para detener la grabación:", actions=actions).send()

@cl.action_callback("empezar_grabacion")
async def manejar_empezar_grabacion(action: cl.Action):
    global grabando, campo_actual, campo_editando
    campo_actual = action.payload["campo"]
    campo_editando = None

    if grabando:
        await cl.Message(content="⚠️ Ya estás grabando, detén la grabación antes de empezar otra.").send()
        return

    grabando = True
    await cl.Message(content=f"🎤 Empezando grabación para **{campo_actual}**. Habla cuando quieras...").send()

    texto_bruto = await asyncio.to_thread(reconocer_voz_continuo)

    grabando = False

    texto_pulido = await pulir_texto_con_ia(texto_bruto)

    formulario[campo_actual] = texto_pulido
    actualizar_excel()

    actions = [
        cl.Action(name="editar_texto", label="Editar texto", payload={"campo": campo_actual}),
        cl.Action(name="regrabar_texto", label="Regrabar voz", payload={"campo": campo_actual}),
        cl.Action(name="mostrar_botones", label="Volver a opciones", payload={})
    ]
    await cl.Message(content=f"✅ **{campo_actual}** actualizado:\n\n{texto_pulido}", actions=actions).send()

@cl.action_callback("regrabar_texto")
async def manejar_regrabar_texto(action: cl.Action):
    global grabando, campo_actual, campo_editando
    campo_actual = action.payload["campo"]
    campo_editando = None

    if grabando:
        await cl.Message(content="⚠️ Ya estás grabando, detén la grabación antes de empezar otra.").send()
        return

    grabando = True
    await cl.Message(content=f"🎤 Regrabando para **{campo_actual}**. Habla cuando quieras...").send()

    texto_bruto = await asyncio.to_thread(reconocer_voz_continuo)

    grabando = False

    texto_pulido = await pulir_texto_con_ia(texto_bruto)

    formulario[campo_actual] = texto_pulido
    actualizar_excel()

    actions = [
        cl.Action(name="editar_texto", label="Editar texto", payload={"campo": campo_actual}),
        cl.Action(name="regrabar_texto", label="Regrabar voz", payload={"campo": campo_actual}),
        cl.Action(name="mostrar_botones", label="Volver a opciones", payload={})
    ]
    await cl.Message(content=f"✅ **{campo_actual}** actualizado con la regrabación:\n\n{texto_pulido}", actions=actions).send()

@cl.action_callback("detener_grabacion")
async def manejar_detener_grabacion(action: cl.Action):
    global grabando
    if grabando:
        grabando = False

@cl.action_callback("editar_texto")
async def manejar_editar_texto(action: cl.Action):
    global campo_editando
    campo_editando = action.payload["campo"]
    texto_actual = formulario[campo_editando]
    await cl.Message(content=f"✍️ Escribe el nuevo texto para **{campo_editando}** (envía el mensaje). Texto actual:\n\n{texto_actual}").send()

@cl.on_message
async def recibir_texto_editado(message: cl.Message):
    global campo_editando
    if campo_editando is None:
        return

    texto_nuevo = message.content.strip()
    formulario[campo_editando] = texto_nuevo
    actualizar_excel()
    await cl.Message(content=f"✅ Texto para **{campo_editando}** actualizado correctamente:\n\n{texto_nuevo}").send()
    campo_editando = None
    await mostrar_botones()
