import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    fetch("http://localhost:8000/")
      .then(res => res.json())
      .then(data => console.log(data)); // Should print: { message: "Welcome to Project EVANS backend!" }
  }, []);

  return <div>Project EVANS Frontend</div>;
}

export default App;
