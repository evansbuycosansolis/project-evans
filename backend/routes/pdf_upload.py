# /backend/routes/pdf_upload.py

from fastapi import APIRouter, UploadFile, File
import os
from services import rag_service
from fastapi.responses import JSONResponse

router = APIRouter()
UPLOAD_FOLDER = "ref_pdfs"
VECTOR_DB_PATH = "faiss_index"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@router.post("/upload_pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        with open(filepath, "wb") as f:
            f.write(await file.read())
        # Trigger rebuild of the FAISS index
        docs = rag_service.load_and_split_pdf(filepath)
        rag_service.embed_and_store(docs, VECTOR_DB_PATH)
        return JSONResponse(
            content={"status": "success", "message": "PDF embedded and indexed successfully!"}
        )
    except Exception as e:
        return JSONResponse(
            content={"status": "error", "message": str(e)},
            status_code=500
        )
