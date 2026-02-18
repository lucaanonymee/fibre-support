import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get("/api/test")
      .then(res => setMessage(res.data.message))
      .catch(err => console.error(err));
  }, []);

  return (
    <div style={{ padding: "40px", fontSize: "24px" }}>
      <h1>MERN Test</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
