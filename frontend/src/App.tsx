import React, { useEffect } from 'react';
import AudioTranscriptionDashboard from './components/AudioTranscriptionDashboard';

function App() {
  useEffect(() => {
    fetch("http://localhost:8080/")
      .then(res => res.json())
      .then(data => console.log(data))
      .catch(err => {
        console.error("Fetch error:", err);
        alert("Error: " + err);
      });
  }, []);

  return (
    <div>
      <AudioTranscriptionDashboard />
    </div>
  );
}

export default App;
