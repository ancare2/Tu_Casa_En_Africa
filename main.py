import tkinter as tk
from tkinter import filedialog, messagebox, Text
from PIL import Image, ImageTk
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
import torch
import numpy as np
import os

class OCRApp:
    def __init__(self, root):
        self.root = root
        self.root.title("OCR - Tu casa en África")
        self.root.geometry("700x500")
        self.root.configure(bg="#f5f5f5")

        # Logo
        logo_path = r"C:\Users\X415\Desktop\Tu casa en Africa\logo.jpg"
        if os.path.exists(logo_path):
            try:
                logo_img = Image.open(logo_path).resize((150, 150), Image.Resampling.LANCZOS)
                self.logo = ImageTk.PhotoImage(logo_img)
                tk.Label(root, image=self.logo, bg="#f5f5f5").pack(pady=10)
            except Exception as e:
                print("Error cargando logo:", e)

        tk.Label(root, text="OCR de Registros Médicos", font=("Arial", 18, "bold"), bg="#f5f5f5").pack(pady=5)
        tk.Label(root, text="Selecciona una imagen de un registro para extraer texto.",
                 font=("Arial", 12), bg="#f5f5f5").pack(pady=5)

        tk.Button(root, text="Seleccionar Imagen", command=self.load_image,
                  bg="#4CAF50", fg="white", font=("Arial", 12), padx=10, pady=5).pack(pady=10)

        self.result_text = Text(root, height=10, wrap="word", font=("Arial", 11))
        self.result_text.pack(padx=20, pady=10, fill="both", expand=True)

        # Cargar el modelo y el procesador de Hugging Face
        self.processor = TrOCRProcessor.from_pretrained("microsoft/trocr-base-printed")
        self.model = VisionEncoderDecoderModel.from_pretrained("microsoft/trocr-base-printed")

    def load_image(self):
        file_path = filedialog.askopenfilename(filetypes=[("Imágenes", "*.png *.jpg *.jpeg")])
        if not file_path:
            return

        try:
            # Cargar la imagen usando PIL
            image = Image.open(file_path)

            # Preprocesar la imagen y convertirla a un tensor
            pixel_values = self.processor(images=image, return_tensors="pt").pixel_values

            # Realizar la inferencia (OCR)
            generated_ids = self.model.generate(pixel_values)

            # Decodificar los resultados generados (el texto extraído)
            text = self.processor.decode(generated_ids[0], skip_special_tokens=True)

            # Mostrar el texto extraído en la interfaz gráfica
            self.result_text.delete(1.0, tk.END)
            self.result_text.insert(tk.END, text)

        except Exception as e:
            messagebox.showerror("Error", f"No se pudo procesar la imagen:\n{e}")


if __name__ == "__main__":
    root = tk.Tk()
    app = OCRApp(root)
    root.mainloop()