from fastapi import FastAPI
from routes.consultation import router as consultation_router
app.include_router(consultation_router, prefix="/consultation")



app = FastAPI()   # <--- THIS must be here

@app.get("/")
def read_root():
    return {"message": "Hello, Project EVANS!"}
