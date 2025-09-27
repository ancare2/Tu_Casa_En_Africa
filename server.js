from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
import sys

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Ajusta el origen si quieres restringirlo

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("❌ ERROR: La variable OPENROUTER_API_KEY no está definida.")
    sys.exit(1)

@app.route("/api/generate", methods=["POST"])
def generate():
    print(f"[LOG] Recibida solicitud POST /api/generate")
    
    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    
    if not prompt:
        print('❌ No se recibió "prompt" en la petición')
        return jsonify({"text": '❌ El campo "prompt" es obligatorio.'}), 400

    print("Enviando prompt a OpenRouter API:", prompt)

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/gpt-3.5-turbo",
        "messages": [
            {
                "role": "system",
                "content": "Eres un asistente que ayuda a analizar registros médicos de pacientes desde una hoja de cálculo."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": int(os.getenv("MAX_TOKENS", 800))  # Límite seguro
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        print("Respuesta recibida del API, status:", response.status_code)

        # Primero capturamos 402 (no hay créditos)
        if response.status_code == 402:
            return jsonify({
                "text": "❌ Error: se necesita introducir más crédito para continuar preguntando."
            }), 402

        # Otros errores
        if response.status_code != 200:
            print("❌ Error en la respuesta del API:", response.text)
            return jsonify({
                "text": f"❌ Error: se necesita introducir más crédito para continuar preguntando."
            }), response.status_code

        data = response.json()
        print("Datos recibidos:", data)

        text = data.get("choices", [{}])[0].get("message", {}).get("content")
        if text:
            print("Respuesta procesada correctamente, enviando texto al cliente.")
            return jsonify({"text": text})
        else:
            print("⚠️ Respuesta inesperada del API:", data)
            return jsonify({
                "text": "⚠️ No se recibió una respuesta válida de la IA."
            }), 500

    except Exception as err:
        print("❌ Error al consultar OpenRouter:", err)
        return jsonify({"text": "❌ Error al consultar la IA."}), 500

if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 3000))
    print(f"✅ Servidor escuchando en http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT)





