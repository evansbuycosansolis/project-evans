from sqlmodel import SQLModel, Field
from typing import Optional

class Transcript(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    timestamp: str
    whisper_text: str
    llama_output: str
    feedback: Optional[str] = None
