import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { setStoredToken } from './auth';


function Login({ onLogin }: { onLogin: (token: string) => void }){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>){
        e.preventDefault();
        const res = await fetch('api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if(!res.ok) {
            console.log('response failed for login', res.statusText)
            return;
        }
        const token = await res.text()
        setStoredToken(token)
        onLogin(token)
    }
    
        
    
    return (
        <div>
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button type="submit">Login</button>
            </form>
            <button type="button" onClick={() => navigate('/register')}>
                Need an account? Register
            </button>
        </div>
    );
}
export default Login;