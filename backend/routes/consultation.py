from fastapi import APIRouter, Body

router = APIRouter()

@router.post("/transcript")
async def receive_transcript(transcript: str = Body(...)):
    print(f"Received transcript: {transcript}")
    return {"received": transcript}
