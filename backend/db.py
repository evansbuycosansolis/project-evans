# backend/db.py
from sqlmodel import create_engine

sqlite_file_name = "db.sqlite3"
engine = create_engine(f"sqlite:///{sqlite_file_name}", echo=False)
