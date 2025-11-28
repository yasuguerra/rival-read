from anthropic import AnthropicVertex
import os

# Reemplaza 'TU_ID_DE_PROYECTO_GCP' con tu Project ID real de Google Cloud
# y asegúrate de que tu terminal esté autenticada (Paso 4 de la lista anterior).
PROJECT_ID = "spiread-production"
REGION = "global" # o la región donde habilitaste el modelo si no es global

# Inicializa el cliente que se autentica automáticamente usando las credenciales locales de gcloud
client = AnthropicVertex(region=REGION, project_id=PROJECT_ID)

# Llama al modelo específico Claude Opus 4.5
message = client.messages.create(
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "¡Hola! ¿Puedes ayudarme a instalar Claude Opus 4.5 en mi IDE?"}
    ],
    model="claude-opus-4-5@20251101"
)

# Imprime la respuesta del modelo Opus 4.5
print("Respuesta de Claude Opus 4.5:")
print(message.content[0].text)
