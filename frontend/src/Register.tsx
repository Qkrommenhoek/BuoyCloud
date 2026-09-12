import { useState } from "react";
import { setStoredToken } from './auth';

function Register({ onRegister }: { onRegister: (token: string) => void }){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>){
        e.preventDefault();
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if(!res.ok) {
            console.log('response failed for register')
            return;
        }
        const token = await res.text()
        setStoredToken(token)
        onRegister(token)
    }
    
        
    
    return (
        <div>
            <h1>Register</h1>
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
        </div>
    );
}
export default Register;