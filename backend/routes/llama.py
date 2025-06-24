# /backend/routes/llama.py

from fastapi import APIRouter, Form
from services.rag_service import load_db, get_relevant_context
import requests
from sqlmodel import Session
from models.transcript import Transcript
from main import engine
from datetime import datetime
import os

router = APIRouter()
vector_db_path = "faiss_index"

def try_load_db():
    faiss_file = os.path.join(vector_db_path, "index.faiss")
    if os.path.exists(faiss_file):
        return load_db(vector_db_path)
    return None

def save_transcript(whisper_text, llama_output):
    with Session(engine) as session:
        transcript = Transcript(
            timestamp=str(datetime.now()),
            whisper_text=whisper_text,
            llama_output=llama_output
        )
        session.add(transcript)
        session.commit()

@router.post("/llama_use")
async def llama_use(
    whisper_transcript: str = Form(...)
):
    db = try_load_db()
    if db is None:
        return {"final_transcript": "[ERROR: Vector index not found. Please upload a PDF to build the index first.]"}

    rag_context = get_relevant_context(whisper_transcript, db)

    prompt = (
        "You are a medical documentation assistant. "
        "Given the following transcript from a doctor-patient conversation, "
        "and these medical references, correct errors, add punctuation, clarify as needed, and format as a SOAP note. "
        "=== TRANSCRIPT ===\n"
        f"{whisper_transcript.strip()}\n"
        "=== MEDICAL REFERENCE ===\n"
        f"{rag_context}\n"
        "Return only the improved and formatted transcript."
    )

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3:latest", "prompt": prompt, "stream": False},
            timeout=180
        )
        response.raise_for_status()
        response_json = response.json()
        if "response" in response_json:
            output = response_json["response"].strip()
        else:
            output = f"[ERROR: Ollama returned no 'response' key. Full reply: {response_json}]"
    except Exception as e:
        output = f"[ERROR: Failed to call Ollama. Details: {str(e)}]"

    save_transcript(whisper_text=whisper_transcript, llama_output=output.strip())

    return {"final_transcript": output.strip()}
