from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import easyocr
import uvicorn
import base64
import io
from PIL import Image
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading EasyOCR models for EN, TH, ZH...")
# Load EasyOCR with English, Thai, and Simplified Chinese to match our app's needs
reader = easyocr.Reader(['en', 'th', 'ch_sim'])
print("Models loaded successfully.")

class ImagePayload(BaseModel):
    image_base64: str

@app.post("/scan")
async def scan_image(payload: ImagePayload):
    try:
        # Extract base64 data
        b64_data = payload.image_base64.split(",")[1] if "," in payload.image_base64 else payload.image_base64
        image_bytes = base64.b64decode(b64_data)
        
        # Load image with PIL
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)
        
        # Process with EasyOCR
        # paragraph=True joins lines into logical paragraphs, which helps with ingredients
        results = reader.readtext(image_np, detail=0, paragraph=True)
        text = "\n".join(results)
        
        return {"text": text, "status": "success"}
    except Exception as e:
        print(f"Error processing image: {e}")
        return {"text": "", "status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
