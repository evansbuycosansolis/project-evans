from fastapi import APIRouter, Body
from sqlmodel import Session
from models.transcript import Transcript
from main import engine

router = APIRouter()

@router.post("/transcript_feedback")
async def transcript_feedback(
    whisper_text: str = Body(...),
    llama_output: str = Body(...),
    feedback: str = Body(...)
):
    with Session(engine) as session:
        transcript = session.query(Transcript).filter(
            Transcript.whisper_text == whisper_text,
            Transcript.llama_output == llama_output
        ).first()
        if transcript:
            transcript.feedback = feedback
            session.commit()
            return {"message": "Feedback saved."}
        else:
            return {"message": "Transcript not found, feedback not saved."}
