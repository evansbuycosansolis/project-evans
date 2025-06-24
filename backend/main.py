# /backend/main.py

from fastapi import FastAPI, File, Form, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from sqlmodel import SQLModel, create_engine, Session
from models.transcript import Transcript
from db import engine
from routes import llama
from routes import pdf_upload
import requests
import os
import tempfile

sqlite_file_name = "db.sqlite3"
engine = create_engine(f"sqlite:///{sqlite_file_name}")

app = FastAPI()
app.include_router(llama.router, prefix="/api")
app.include_router(pdf_upload.router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

WHISPER_MODEL_SIZE = "base"
whisper_model = WhisperModel(WHISPER_MODEL_SIZE, device="cpu")

@app.post("/api/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    web_transcript: str = Form(""),
    use_webspeech: bool = Query(True, description="Enable Web Speech transcript"),
    use_whisper: bool = Query(True, description="Enable Whisper transcript"),
    use_llama: bool = Query(True, description="Enable Llama refinement"),
):
    result = {}

    # --- Web Speech transcript ---
    if use_webspeech:
        print("\n=== [DEBUG] Web Speech API Transcript ===")
        print(web_transcript)
        result["web_speech_transcript"] = web_transcript
    else:
        web_transcript = ""
        result["web_speech_transcript"] = None

    # --- Whisper transcript ---
    whisper_text = ""
    if use_whisper:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmpfile:
            tmpfile.write(await audio.read())
            temp_audio_path = tmpfile.name
        segments, info = whisper_model.transcribe(temp_audio_path)
        whisper_text = " ".join([seg.text for seg in segments])
        result["whisper_transcript"] = whisper_text
        os.remove(temp_audio_path)
    else:
        result["whisper_transcript"] = None

    # --- Llama (refine Whisper only) ---
    llama_refined = None
    llama_prompt = None
    if use_llama:
        llama_prompt = (
            "Please refine and correct the following transcript produced by an automatic speech recognition system. "
            "Fix any mistakes, add punctuation, and make it sound natural. Only return the improved transcript.\n\n"
            f"Transcript (from Whisper): {whisper_text}\n"
        )
        print("\n=== [DEBUG] Sending Prompt to Llama ===")
        print(llama_prompt)
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3", "prompt": llama_prompt, "stream": False},
                timeout=180
            )
            response_json = response.json()
            if "response" in response_json:
                llama_refined = response_json["response"].strip()
            else:
                print("Llama/Ollama backend error:", response_json)
                llama_refined = "[ERROR: Llama/Ollama did not return a 'response' key. See backend logs.]"
        except Exception as e:
            print("Exception calling Llama/Ollama:", e)
            llama_refined = f"[ERROR: Exception calling Llama/Ollama: {e}]"
        print("\n=== [DEBUG] Llama Refined Transcript ===")
        print(llama_refined)
        result["final_transcript"] = llama_refined
        result["llama_prompt"] = llama_prompt
    else:
        result["final_transcript"] = whisper_text or web_transcript or ""
        result["llama_prompt"] = None

    return result

@app.get("/")
def root():
    return {"message": "Hello, Project EVANS!"}
