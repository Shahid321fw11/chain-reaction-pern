import React, { useState } from 'react';
import axios from 'axios';

function App() {
  // State to toggle between Login and Signup mode
  const [isLogin, setIsLogin] = useState(true); 
  
  // Form data states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear old messages

    // Determine which URL to hit based on the mode
    // Note: Change 'register' to 'signup' if your backend route is named differently!
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'; 
    const url = `http://localhost:5000${endpoint}`;

    try {
      const response = await axios.post(url, { email, password });
      setMessage(response.data.message || (isLogin ? "Login successful!" : "Account created successfully!"));
      
      // If signup was successful, automatically flip them to the login screen
      if (!isLogin) {
        setIsLogin(true);
        setPassword(''); // Clear password for security
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Chain Reaction</h2>
      <h3>{isLogin ? 'Welcome Back' : 'Create an Account'}</h3>
      
      <form onSubmit={handleSubmit} style={{ display: 'inline-block', textAlign: 'left', background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
        <div>
          <label>Email:</label><br />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '200px', padding: '5px' }}
          />
        </div>
        <br />
        <div>
          <label>Password:</label><br />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '200px', padding: '5px' }}
          />
        </div>
        <br />
        <button type="submit" style={{ width: '100%', padding: '8px', cursor: 'pointer' }}>
          {isLogin ? 'Log In' : 'Sign Up'}
        </button>
      </form>

      {/* The message display */}
      {message && <p style={{ marginTop: '20px', fontWeight: 'bold', color: 'blue' }}>{message}</p>}

      {/* The Toggle Button */}
      <div style={{ marginTop: '20px' }}>
        <p>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(''); // clear messages when switching
            }}
            style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {isLogin ? 'Sign up here' : 'Log in here'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default App;