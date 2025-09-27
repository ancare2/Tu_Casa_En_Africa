from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
import sys

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

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
        return jsonify({"text": "❌ El campo 'prompt' es obligatorio."}), 400

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "openai/gpt-3.5-turbo",
        "messages": [
            {"role": "system", "content": "Eres un asistente que ayuda a analizar registros médicos de pacientes desde una hoja de cálculo."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": int(os.getenv("MAX_TOKENS", 800))
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        print("Respuesta recibida del API, status:", response.status_code)

        # Intentar leer JSON aunque sea error
        try:
            data_json = response.json()
        except Exception:
            data_json = {}

        # Capturar cualquier indicio de falta de créditos
        if response.status_code == 402 or data_json.get("error", {}).get("code") == 402:
            # FORZAMOS 200 para que el frontend siempre reciba nuestro mensaje
            return jsonify({
                "text": "❌ Error: se necesita introducir más crédito para continuar preguntando."
            }), 200

        # Otros errores
        if response.status_code != 200:
            return jsonify({
                "text": "❌ Error: ocurrió un problema con la IA."
            }), 200  # <- también forzamos 200

        # Extraer texto normal
        text = data_json.get("choices", [{}])[0].get("message", {}).get("content")
        if text:
            return jsonify({"text": text})
        else:
            return jsonify({"text": "⚠️ No se recibió una respuesta válida de la IA."}), 500

    except Exception as err:
        print("❌ Error al consultar OpenRouter:", err)
        # Mensaje consistente sobre créditos incluso si hay excepción
        return jsonify({"text": "❌ Error: se necesita introducir más crédito para continuar preguntando."}), 200

if __name__ == "__main__":
    PORT = int(os.getenv("PORT", 3000))
    print(f"✅ Servidor escuchando en http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT)



