// src/hooks/useSpeechToText.ts
import { useState, useRef, useCallback } from "react";

export function useSpeechToText(lang = "en-US") {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [isBrowserSupported, setIsBrowserSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const forceStop = useRef(false);

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsBrowserSupported(false);
      return;
    }
    setIsBrowserSupported(true);
    forceStop.current = false;
    if (!recognitionRef.current) {
      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.interimResults = false;
      rec.continuous = true; // important!
      rec.onresult = (event: any) => {
        let final = "";
        for (let i = 0; i < event.results.length; ++i) {
          final += event.results[i][0].transcript;
        }
        setTranscript(final.trim());
      };
      // If auto-stop (end of speech), restart unless user stopped
      rec.onend = () => {
        setListening(false);
        if (!forceStop.current) {
          rec.start();
          setListening(true);
        }
      };
      recognitionRef.current = rec;
    }
    recognitionRef.current.start();
    setListening(true);
  }, [lang]);

  // Stop listening
  const stopListening = useCallback(() => {
    forceStop.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => setTranscript(""), []);

  return { transcript, listening, startListening, stopListening, clearTranscript, isBrowserSupported: true };
}
