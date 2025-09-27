from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from gpt4all import GPT4All

# Inicializar Flask
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Inicializar modelo local GPT4All
# Asegúrate de tener el archivo del modelo en la misma carpeta o ruta correcta
model = GPT4All("gpt4all-lora-quantized.bin")  

# URL de Google Sheets publicada como CSV
URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR4bGXwxxSijeccznOH3IuAj-2iecQcoLtUta_dAjTPo2V-MQX2abUUDWCLzOrvMFacQEH5wq5EOaKW/pub?gid=1393541842&single=true&output=csv"

# Cargar datos de pacientes en memoria
try:
    df_pacientes = pd.read_csv(URL_CSV)
    print(f"✅ Cargados {len(df_pacientes)} pacientes desde Google Sheets")
except Exception as e:
    print("❌ Error al cargar Google Sheets:", e)
    df_pacientes = pd.DataFrame()  # Tabla vacía si falla

@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json()
    pregunta = data.get("prompt", "").strip()

    if not pregunta:
        return jsonify({"text": "❌ El campo 'prompt' es obligatorio"}), 400

    # Crear prompt completo combinando la pregunta y todos los pacientes
    prompt_full = f"Pregunta: {pregunta}\nPacientes:\n{df_pacientes.to_dict(orient='records')}"

    try:
        # Generar respuesta usando GPT4All local
        respuesta = model.generate(prompt_full)
        return jsonify({"text": respuesta})
    except Exception as e:
        print("❌ Error al generar respuesta:", e)
        return jsonify({"text": "❌ Error al procesar la IA local"}), 500

if __name__ == "__main__":
    PORT = 5000
    print(f"✅ Servidor Flask corriendo en http://0.0.0.0:{PORT}")
    app.run(host="0.0.0.0", port=PORT)


