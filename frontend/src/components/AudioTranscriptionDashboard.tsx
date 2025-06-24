// frontend/src/components/AudioTranscriptionDashboards.tsx
import React, { useState, useRef } from "react";
import { useSpeechToText } from "../hooks/useSpeechToText";

interface WebSpeechBoxProps {
  webTranscript: string;
  setWebTranscript: React.Dispatch<React.SetStateAction<string>>;
}
interface WhisperBoxProps {
  whisperTranscript: string;
  setWhisperTranscript: React.Dispatch<React.SetStateAction<string>>;
}
interface LlamaBoxProps {
  webTranscript: string;
  whisperTranscript: string;
  onClearAll: () => void;
}

const PdfUploadBox: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      setMsg("Please select a PDF.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8080/api/upload_pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMsg(data.message);
      setFile(null);
    } catch {
      setMsg("Upload failed. Backend not reachable?");
    }
    setLoading(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={e => setFile(e.target.files?.[0] || null)}
        value={file ? undefined : ""}
      />
      <button onClick={handleUpload} disabled={loading}>{loading ? "Uploading..." : "Upload PDF"}</button>
      <div style={{ color: msg.includes("success") ? "green" : msg ? "red" : "black" }}>{msg}</div>
    </div>
  );
};

const LlamaBox: React.FC<LlamaBoxProps> = ({ webTranscript, whisperTranscript, onClearAll }) => {
  const [llamaOutput, setLlamaOutput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleLlama = async () => {
    if (!webTranscript && !whisperTranscript) {
      alert("No transcript available!");
      return;
    }
    setLlamaOutput("Processing...");
    const formData = new FormData();
    formData.append("audio", new Blob(), "blank.wav");
    formData.append("web_transcript", webTranscript);
    formData.append("whisper_transcript", whisperTranscript);
    const res = await fetch("http://localhost:8080/api/llama_use", { method: "POST", body: formData });
    const data = await res.json();
    setLlamaOutput(data.final_transcript || "[no output]");
  };

  const handleClear = () => {
    setLlamaOutput("");
    onClearAll();
  };

  const handleFeedbackSubmit = async () => {
    const res = await fetch("http://localhost:8080/api/transcript_feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        whisper_text: whisperTranscript,
        llama_output: llamaOutput,
        feedback,
      }),
    });
    const data = await res.json();
    setFeedbackMsg(data.message || "Feedback submitted!");
  };

  return (
    <div style={{ border: "2px solid #b10dc9", borderRadius: 8, padding: 16, width: 350, marginBottom: 18 }}>
      <h3>Llama</h3>
      <button onClick={handleLlama}>Llama Transcribe (Enhance Whisper Transcription)</button>
      <button onClick={handleClear} style={{ marginLeft: 8 }}>Clear</button>
      <br />
      <textarea value={llamaOutput} readOnly style={{ width: "100%", minHeight: 60, marginTop: 8 }} placeholder="Llama Output (refined)" />
      <textarea
        placeholder="Your feedback/correction here..."
        value={feedback}
        onChange={e => setFeedback(e.target.value)}
        style={{ width: "100%", minHeight: 40, marginTop: 8 }}
      />
      <button onClick={handleFeedbackSubmit} style={{ marginTop: 4 }}>Submit Feedback</button>
      <div>{feedbackMsg}</div>
    </div>
  );
};

const WebSpeechBox: React.FC<WebSpeechBoxProps> = ({ webTranscript, setWebTranscript }) => {
  const { transcript, listening, startListening, stopListening, isBrowserSupported, clearTranscript } = useSpeechToText("en-US");
  React.useEffect(() => { setWebTranscript(transcript); }, [transcript, setWebTranscript]);
  return (
    <div style={{ border: "2px solid #0074d9", borderRadius: 8, padding: 16, width: 350, marginBottom: 18 }}>
      <h3>Web Speech</h3>
      <button onClick={startListening} disabled={listening || !isBrowserSupported}>Start</button>
      <button onClick={stopListening} disabled={!listening}>Stop</button>
      <button onClick={clearTranscript}>Clear</button>
      <br />
      <textarea value={webTranscript} readOnly style={{ width: "100%", minHeight: 60, marginTop: 8 }} placeholder="Web Speech Output" />
    </div>
  );
};

const WhisperBox: React.FC<WhisperBoxProps> = ({ whisperTranscript, setWhisperTranscript }) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [output, setOutput] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStart = async () => {
    setOutput("");
    setAudioBlob(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    recorder.ondataavailable = (e: BlobEvent) => audioChunksRef.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      setAudioBlob(blob);
      stream.getTracks().forEach(track => track.stop());
    };
    recorder.start();
    setRecording(true);
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return alert("Record audio first!");
    setOutput("Transcribing...");
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.wav");
    formData.append("web_transcript", "");
    const res = await fetch("http://localhost:8080/api/transcribe?use_webspeech=0&use_whisper=1&use_llama=0", { method: "POST", body: formData });
    const data = await res.json();
    setOutput(data.whisper_transcript || data.final_transcript || "[no output]");
    setWhisperTranscript(data.whisper_transcript || data.final_transcript || "");
  };

  const handleClear = () => {
    setAudioBlob(null);
    setOutput("");
    setWhisperTranscript("");
  };

  return (
    <div style={{ border: "2px solid #2ecc40", borderRadius: 8, padding: 16, width: 350, marginBottom: 18 }}>
      <h3>Whisper</h3>
      <button onClick={handleStart} disabled={recording}>Record</button>
      <button onClick={handleStop} disabled={!recording}>Stop</button>
      <button onClick={handleClear}>Clear</button>
      <button onClick={handleTranscribe} disabled={!audioBlob}>Transcribe</button>
      <br />
      <textarea value={output} readOnly style={{ width: "100%", minHeight: 60, marginTop: 8 }} placeholder="Whisper Output" />
      {audioBlob && <audio controls src={URL.createObjectURL(audioBlob)} />}
    </div>
  );
};

const AudioTranscriptionDashboard: React.FC = () => {
  const [webTranscript, setWebTranscript] = useState("");
  const [whisperTranscript, setWhisperTranscript] = useState("");
  const handleClearAll = () => { setWebTranscript(""); setWhisperTranscript(""); };
  return (
    <div>
      <h1>Medical E.V.A.N.S</h1>
      <h2>Medical- Empathetic Voice-over Assistant for Nurturing Symptomatologist</h2>
      <PdfUploadBox />
      <h3>Transcription Components:</h3>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <WebSpeechBox webTranscript={webTranscript} setWebTranscript={setWebTranscript} />
        <WhisperBox whisperTranscript={whisperTranscript} setWhisperTranscript={setWhisperTranscript} />
        <LlamaBox webTranscript={webTranscript} whisperTranscript={whisperTranscript} onClearAll={handleClearAll} />
      </div>
    </div>
  );
};

export default AudioTranscriptionDashboard;
