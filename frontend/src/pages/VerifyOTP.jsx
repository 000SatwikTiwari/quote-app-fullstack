import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Zap, RefreshCcw } from 'lucide-react';
import api from '../services/api';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (!email) navigate('/register');
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => clearInterval(t);
    }
  }, [cooldown]);

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { toast.error('Please enter the full 6-digit OTP'); return; }
    setLoading(true);
    try {
      await api.post('/verify-otp', { email, otp: code });
      toast.success('Account verified! Please sign in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/resend-otp', { email });
      toast.success('New OTP sent!');
      setCooldown(60);
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <Zap size={26} className="text-black fill-black" />
          </div>
          <span className="text-3xl font-extrabold text-white tracking-tight">
            Quote<span className="text-primary">APP</span>
          </span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Verify Email</h1>
          <p className="text-textSecondary text-sm mb-2">
            We sent a 6-digit OTP to
          </p>
          <p className="text-primary text-sm font-semibold mb-7 truncate">{email}</p>

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputsRef.current[idx] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(e.target.value, idx)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  className="w-11 h-14 text-center text-xl font-bold bg-black border border-border rounded-xl text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || otp.join('').length < 6}
              className="w-full bg-primary hover:bg-primaryHover text-black font-bold py-3 rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
              ) : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-5 text-center">
            {cooldown > 0 ? (
              <p className="text-textSecondary text-sm">Resend in {cooldown}s</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-primary hover:underline text-sm flex items-center gap-1.5 mx-auto"
              >
                <RefreshCcw size={14} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending…' : 'Resend OTP'}
              </button>
            )}
          </div>

          <p className="text-center text-textSecondary text-sm mt-4">
            <Link to="/login" className="text-primary hover:underline">← Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
