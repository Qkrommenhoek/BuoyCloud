import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setStoredToken } from './auth';

/** Lands here after the Google OAuth handshake completes; the backend appends #token=... or ?error=... */
function OAuthRedirect({ onLogin }: { onLogin: (token: string) => void }) {
    const navigate = useNavigate();

    useEffect(() => {
        const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
        if (token) {
            setStoredToken(token);
            onLogin(token);
            navigate('/', { replace: true });
            return;
        }
        navigate('/login', { replace: true });
    }, [navigate, onLogin]);

    return <div>Signing in...</div>;
}
export default OAuthRedirect;
