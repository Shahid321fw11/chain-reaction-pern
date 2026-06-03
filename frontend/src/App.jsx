import React, { useState } from 'react';
import axios from 'axios';
import './App.css';
import Game from './Game'; 

function App() {
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // State to track if the user is logged in
  const [loggedInUser, setLoggedInUser] = useState(null); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(''); 
    
    // Change 'register' to 'signup' if your backend route is named differently
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'; 
    const url = `http://localhost:5000${endpoint}`;

    try {
      const response = await axios.post(url, { email, password });
      setMessage(response.data.message);
      
      if (isLogin) {
        // If login is successful, save the user to state to switch the screen
        setLoggedInUser(email);
      } else {
        // If signup is successful, flip back to login mode
        setIsLogin(true);
        setPassword(''); 
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong.");
    }
  };

  // IF THE USER IS LOGGED IN, SHOW THE GAME INSTEAD OF THE LOGIN FORM
  if (loggedInUser) {
    return <Game userEmail={loggedInUser} />;
  }

  // OTHERWISE, SHOW THE LOGIN/SIGNUP FORM
  return (
    <div className="app-container">
      <div className="auth-card">
        <h2 className="title">Chain Reaction</h2>
        <h3 className="subtitle">{isLogin ? 'Welcome Back' : 'Initialize Account'}</h3>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="Enter your email" 
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="Enter your password" 
            />
          </div>
          
          <button type="submit" className="primary-btn">
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <div className="toggle-section">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={() => { 
                setIsLogin(!isLogin); 
                setMessage(''); 
              }} 
              className="toggle-btn"
            >
              {isLogin ? 'Sign up here' : 'Log in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;