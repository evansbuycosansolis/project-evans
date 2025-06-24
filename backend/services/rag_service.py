# backend/services/rag_service.py

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings

# 1. Load and split docs (PDF)
def load_and_split_pdf(pdf_path):
    loader = PyPDFLoader(pdf_path)
    docs = loader.load_and_split()
    return docs

# 2. Embed with Ollama and store FAISS index
def embed_and_store(docs, vector_db_path='faiss_index'):
    embeddings = OllamaEmbeddings(model="nomic-embed-text")  # or your preferred Ollama model
    db = FAISS.from_documents(docs, embeddings)
    db.save_local(vector_db_path)
    return db

# 3. Load FAISS index (allow dangerous deserialization for local/trusted files)
def load_db(vector_db_path='faiss_index'):
    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    db = FAISS.load_local(
        vector_db_path,
        embeddings,
        allow_dangerous_deserialization=True  # FIX: allow loading pickle files you trust
    )
    return db

# 4. Retrieve relevant context (RAG)
def get_relevant_context(query, db, k=4):
    docs = db.similarity_search(query, k=k)
    context = "\n\n".join([d.page_content for d in docs])
    return context
