from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, AIMessage

def noisy_transcript_checker(output):
    if len(output.split()) < 5 or "unclear" in output.lower():
        return True
    return False

def medical_terms_checker(output, required_terms=None):
    required_terms = required_terms or ["pain", "diagnosis", "treatment", "allergy"]
    for term in required_terms:
        if term not in output.lower():
            return False
    return True

def transcript_enhancement_flow(whisper_transcript, db, get_relevant_context, llama_api_func):
    # 1. Retrieve context
    rag_context = get_relevant_context(whisper_transcript, db)

    # 2. Generate Llama output
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
    llama_output = llama_api_func(prompt)

    # 3. Check for noise or missing medical terms
    if noisy_transcript_checker(llama_output):
        return "Transcript too noisy, please re-record or clarify."
    if not medical_terms_checker(llama_output):
        return "Some required medical terms are missing. Please review."

    # 4. If passes, return result
    return llama_output
