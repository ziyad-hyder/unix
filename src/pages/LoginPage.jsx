import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  School, User, Lock, KeyRound, ArrowRight, CheckCircle, 
  AlertCircle, RefreshCw, Layers, Eye, EyeOff, CheckCircle2 
} from 'lucide-react';

const CAMPUSES = [
  { id: 'kitsw', name: 'KITS Warangal', domain: '@kitsw.ac.in' },
];

export default function LoginPage() {
  const { isAuthenticated, login, registerRequestOtp, registerVerifyOtp, registerConfirm } = useAuth();
  const navigate = useNavigate();

  // Mode: 'SIGN_IN' | 'SIGN_UP'
  const [authMode, setAuthMode] = useState('SIGN_IN');

  // Sign In state
  const [loginCampus, setLoginCampus] = useState(CAMPUSES[0].id);
  const [loginRollNumber, setLoginRollNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state: 1 (Details) -> 2 (Verify OTP) -> 3 (Create Password)
  const [signUpStep, setSignUpStep] = useState(1);
  const [signUpCampus, setSignUpCampus] = useState(CAMPUSES[0].id);
  const [signUpRollNumber, setSignUpRollNumber] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpOtp, setSignUpOtp] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Feedback & Rate Limiting
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const selectedLoginCampus = CAMPUSES.find((c) => c.id === loginCampus) || CAMPUSES[0];
  const selectedSignUpCampus = CAMPUSES.find((c) => c.id === signUpCampus) || CAMPUSES[0];

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const resetErrors = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 1. Handle Sign In (Password)
  const handleSignIn = async (e) => {
    e.preventDefault();
    resetErrors();

    const cleanRoll = loginRollNumber.trim().toLowerCase().replace(/@.*$/, '');
    if (!cleanRoll) {
      setErrorMessage('Please enter your student roll number or ID.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    try {
      setLoading(true);
      await login(cleanRoll, loginPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      if (err.status === 429) {
        const match = err.message.match(/(\d+)\s*second/i);
        if (match) setCooldown(parseInt(match[1], 10));
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up Step 1: Request OTP
  const handleSignUpRequestOtp = async (e) => {
    e.preventDefault();
    resetErrors();

    const cleanRoll = signUpRollNumber.trim().toLowerCase().replace(/@.*$/, '');
    if (!cleanRoll || cleanRoll.length < 3) {
      setErrorMessage('Please enter a valid student roll number (e.g. b24cs052).');
      return;
    }
    if (!signUpFullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const constructedEmail = `${cleanRoll}${selectedSignUpCampus.domain}`;
    setSignUpEmail(constructedEmail);

    try {
      setLoading(true);
      const res = await registerRequestOtp(cleanRoll, constructedEmail, signUpFullName.trim());
      setSuccessMessage(res?.message || 'Verification code dispatched to your campus email.');
      setCooldown(60);
      setSignUpStep(2);
    } catch (err) {
      if (err.status === 409) {
        setErrorMessage('An account already exists with this roll number. Please sign in.');
      } else if (err.status === 429) {
        const match = err.message.match(/(\d+)\s*second/i);
        if (match) setCooldown(parseInt(match[1], 10));
      } else {
        setErrorMessage(err.message || 'Failed to request registration code.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Sign Up Step 2: Verify OTP
  const handleSignUpVerifyOtp = async (e) => {
    e.preventDefault();
    resetErrors();

    const cleanOtp = signUpOtp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter the 6-digit numeric verification code.');
      return;
    }

    try {
      setLoading(true);
      await registerVerifyOtp(signUpEmail, cleanOtp);
      setSuccessMessage('Code verified successfully. Please create your password.');
      setSignUpStep(3);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Sign Up Step 3: Create Password & Complete Registration
  const handleSignUpComplete = async (e) => {
    e.preventDefault();
    resetErrors();

    if (!signUpPassword || signUpPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (signUpPassword !== signUpConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    const cleanRoll = signUpRollNumber.trim().toLowerCase().replace(/@.*$/, '');

    try {
      setLoading(true);
      await registerConfirm(cleanRoll, signUpEmail, signUpFullName.trim(), signUpOtp.trim(), signUpPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header / Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20 mb-4">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome to <span className="text-brand-600">UniX</span>
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          KITSW Campus Resource Sharing & Marketplace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200/80 rounded-3xl">
          
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGN_IN');
                resetErrors();
              }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'SIGN_IN'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGN_UP');
                setSignUpStep(1);
                resetErrors();
              }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'SIGN_UP'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Notifications */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: SIGN IN (Roll Number + Password) */}
          {/* ================================================================= */}
          {authMode === 'SIGN_IN' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Campus
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <select
                    value={loginCampus}
                    onChange={(e) => setLoginCampus(e.target.value)}
                    className="block w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium cursor-pointer"
                  >
                    {CAMPUSES.map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name} ({campus.domain})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Roll Number / Student ID
                </label>
                <div className="flex rounded-xl shadow-2xs border border-slate-200 overflow-hidden bg-slate-50/50 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                  <div className="pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginRollNumber}
                    onChange={(e) => setLoginRollNumber(e.target.value.replace(/@.*$/, ''))}
                    placeholder="e.g. b24cs052"
                    className="block w-full pl-2.5 pr-2 py-2 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
                  />
                  <div className="inline-flex items-center px-3 bg-slate-100/90 border-l border-slate-200 text-xs font-mono font-semibold text-slate-600 select-none">
                    {selectedLoginCampus.domain}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cooldown > 0 || !loginRollNumber.trim() || !loginPassword}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{cooldown > 0 ? `Wait ${cooldown}s` : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('SIGN_UP');
                    setSignUpStep(1);
                    resetErrors();
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                >
                  New student? Create an account
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: CREATE ACCOUNT (3-Step: Details -> Verify OTP -> Set Password) */}
          {/* ================================================================= */}
          {authMode === 'SIGN_UP' && (
            <div>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  signUpStep >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>1</div>
                <div className={`h-0.5 w-6 ${signUpStep >= 2 ? 'bg-brand-600' : 'bg-slate-200'}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  signUpStep >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>2</div>
                <div className={`h-0.5 w-6 ${signUpStep >= 3 ? 'bg-brand-600' : 'bg-slate-200'}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  signUpStep >= 3 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>3</div>
              </div>

              {/* STEP 1: Details */}
              {signUpStep === 1 && (
                <form onSubmit={handleSignUpRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Campus
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <School className="w-4 h-4" />
                      </div>
                      <select
                        value={signUpCampus}
                        onChange={(e) => setSignUpCampus(e.target.value)}
                        className="block w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium cursor-pointer"
                      >
                        {CAMPUSES.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name} ({campus.domain})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Roll Number / Student ID
                    </label>
                    <div className="flex rounded-xl shadow-2xs border border-slate-200 overflow-hidden bg-slate-50/50 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
                      <div className="pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={signUpRollNumber}
                        onChange={(e) => setSignUpRollNumber(e.target.value.replace(/@.*$/, ''))}
                        placeholder="e.g. b24cs052"
                        className="block w-full pl-2.5 pr-2 py-2 text-sm bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
                      />
                      <div className="inline-flex items-center px-3 bg-slate-100/90 border-l border-slate-200 text-xs font-mono font-semibold text-slate-600 select-none">
                        {selectedSignUpCampus.domain}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Verification code will be sent to this campus email.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cooldown > 0 || !signUpRollNumber.trim() || !signUpFullName.trim()}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{cooldown > 0 ? `Wait ${cooldown}s` : 'Send Verification Code'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP First */}
              {signUpStep === 2 && (
                <form onSubmit={handleSignUpVerifyOtp} className="space-y-4">
                  <div className="text-center pb-1">
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit verification code sent to:
                    </p>
                    <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">{signUpEmail}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={signUpOtp}
                        onChange={(e) => setSignUpOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="block w-full pl-9 pr-3 py-2 text-center tracking-[0.4em] text-base font-mono font-bold border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || signUpOtp.length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSignUpStep(1);
                        setSignUpOtp('');
                        resetErrors();
                      }}
                      className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Change Details
                    </button>

                    <button
                      type="button"
                      disabled={loading || cooldown > 0}
                      onClick={handleSignUpRequestOtp}
                      className="text-brand-600 hover:text-brand-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Create Password (Only after OTP verification) */}
              {signUpStep === 3 && (
                <form onSubmit={handleSignUpComplete} className="space-y-4">
                  <div className="text-center pb-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Code Verified</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Now create a password for your account:
                    </p>
                    <p className="text-xs font-mono font-semibold text-slate-800 mt-0.5">{signUpEmail}</p>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Create Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        minLength={6}
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !signUpPassword || signUpPassword.length < 6}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Complete Registration & Sign In'}
                  </button>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setSignUpStep(2);
                        resetErrors();
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      Back to verification code
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Protected by Kakatiya Institute of Technology & Science verified campus auth.
        </p>
      </div>
    </div>
  );
}
