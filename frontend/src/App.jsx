import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: email,
        password: password
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Chain Reaction - Login</h2>
      <form onSubmit={handleLogin} style={{ display: 'inline-block', textAlign: 'left' }}>
        <div>
          <label>Email:</label><br />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <br />
        <div>
          <label>Password:</label><br />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <br />
        <button type="submit">Log In</button>
      </form>
      {message && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{message}</p>}
    </div>
  );
}

export default App;