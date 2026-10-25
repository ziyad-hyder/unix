import React, { useState, useEffect, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  School, User, Lock, KeyRound, ArrowRight, CheckCircle,
  AlertCircle, RefreshCw, Eye, EyeOff, CheckCircle2, Phone, MessageSquare, SkipForward
} from 'lucide-react';
import { UniXLogoMark } from '../components/Navbar';
import Footer from '../components/Footer';
import { normalizePhone } from '../utils/phone';
import { getFriendlyErrorMessage } from '../utils/errors';

const CAMPUSES = [
  { id: 'kitsw', name: 'KITS Warangal', domain: '@kitsw.ac.in' },
];

export default function LoginPage() {
  const { isAuthenticated, login, registerRequestOtp, registerVerifyOtp, registerConfirm, updateUserPhone } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const id = useId();
  const loginCampusId = `${id}-login-campus`;
  const loginRollId = `${id}-login-roll`;
  const loginPasswordId = `${id}-login-password`;
  const signUpCampusId = `${id}-signup-campus`;
  const signUpRollId = `${id}-signup-roll`;
  const signUpRollHelpId = `${id}-signup-roll-help`;
  const signUpNameId = `${id}-signup-name`;
  const signUpOtpId = `${id}-signup-otp`;
  const signUpPasswordId = `${id}-signup-password`;
  const signUpConfirmPasswordId = `${id}-signup-confirm-password`;
  const signUpPhoneId = `${id}-signup-phone`;
  const signUpPhoneHelpId = `${id}-signup-phone-help`;

  const fromState = location.state?.from;
  const from = fromState
    ? (typeof fromState === 'string'
        ? fromState
        : `${fromState.pathname || '/'}${fromState.search || ''}${fromState.hash || ''}`)
    : '/';
  const targetDestination = from && from !== '/login' ? from : '/';

  // Mode: 'SIGN_IN' | 'SIGN_UP'
  const [authMode, setAuthMode] = useState('SIGN_IN');

  // Sign In state
  const [loginCampus, setLoginCampus] = useState(CAMPUSES[0].id);
  const [loginRollNumber, setLoginRollNumber] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up state: 1 (Details) -> 2 (Verify OTP) -> 3 (Create Password) -> 4 (Optional WhatsApp)
  const [signUpStep, setSignUpStep] = useState(1);
  const [signUpCampus, setSignUpCampus] = useState(CAMPUSES[0].id);
  const [signUpRollNumber, setSignUpRollNumber] = useState('');
  const [signUpFullName, setSignUpFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpOtp, setSignUpOtp] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Track last OTP requested details to avoid blocking on "Change Details"
  const [lastOtpRoll, setLastOtpRoll] = useState('');
  const [lastOtpName, setLastOtpName] = useState('');

  // Feedback & Rate Limiting
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const selectedLoginCampus = CAMPUSES.find((c) => c.id === loginCampus) || CAMPUSES[0];
  const selectedSignUpCampus = CAMPUSES.find((c) => c.id === signUpCampus) || CAMPUSES[0];

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('unix_session_expired')) {
      setInfoMessage('Your session expired. Please sign in again.');
      sessionStorage.removeItem('unix_session_expired');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && signUpStep !== 4) {
      navigate(targetDestination, { replace: true });
    }
  }, [isAuthenticated, signUpStep, navigate, targetDestination]);

  useEffect(() => {
    if (loginCooldown <= 0) return;
    const timer = setInterval(() => {
      setLoginCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [loginCooldown]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const resetErrors = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setInfoMessage('');
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
      setErrorMessage(getFriendlyErrorMessage(err, 'Login failed. Please check your credentials.'));
      if (err.status === 429) {
        const match = (err.message || '').match(/(\d+)\s*second/i);
        if (match) {
          setLoginCooldown(parseInt(match[1], 10));
        } else {
          setLoginCooldown(60);
        }
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
      setLastOtpRoll(cleanRoll);
      setLastOtpName(signUpFullName.trim());
      setOtpCooldown(60);
      setSignUpStep(2);
    } catch (err) {
      if (err.status === 409) {
        setErrorMessage('An account already exists with this roll number. Please sign in.');
      } else if (err.status === 429) {
        const match = (err.message || '').match(/(\d+)\s*second/i);
        if (match) {
          const seconds = parseInt(match[1], 10);
          setOtpCooldown(seconds);
          setErrorMessage(getFriendlyErrorMessage(err, `Too many attempts. Please wait ${seconds}s and try again.`));
        } else {
          setOtpCooldown(60);
          setErrorMessage('Too many attempts. Please wait a minute and try again.');
        }
      } else {
        setErrorMessage(getFriendlyErrorMessage(err, 'Failed to request registration code.'));
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
      setErrorMessage(getFriendlyErrorMessage(err, 'Invalid verification code.'));
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
      setSuccessMessage('Account created! Add your WhatsApp number to make connecting easier.');
      setSignUpStep(4);
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Sign Up Step 4: Save WhatsApp Phone & Go to Dashboard
  const handleSavePhoneAndFinish = async (e) => {
    e.preventDefault();
    resetErrors();

    const normalizedPhone = normalizePhone(signUpPhone);
    if (!normalizedPhone) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      await updateUserPhone(normalizedPhone);
      navigate(targetDestination, { replace: true });
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Failed to update phone number.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPhone = () => {
    navigate(targetDestination, { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Header / Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <UniXLogoMark className="w-11 h-11" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">
          Welcome to <span className="text-brand-secondary">UniX</span>
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 sm:px-8 border border-brand-secondary/20 rounded-2xl">

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-lg bg-brand-primary/5 p-1 mb-6 border border-brand-secondary/15">
            <button
              type="button"
              onClick={() => {
                setAuthMode('SIGN_IN');
                resetErrors();
              }}
              className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${authMode === 'SIGN_IN'
                ? 'bg-brand-primary text-white'
                : 'text-ink-secondary hover:text-ink-primary'
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
              className={`w-1/2 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${authMode === 'SIGN_UP'
                ? 'bg-brand-primary text-white'
                : 'text-ink-secondary hover:text-ink-primary'
                }`}
            >
              Create Account
            </button>
          </div>

          {/* Notifications */}
          {infoMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>{infoMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 1: SIGN IN (Roll Number + Password) */}
          {/* ================================================================= */}
          {authMode === 'SIGN_IN' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor={loginCampusId} className="block text-xs font-semibold text-ink-primary mb-1">
                  Select Campus
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                    <School className="w-4 h-4" />
                  </div>
                  <select
                    id={loginCampusId}
                    value={loginCampus}
                    onChange={(e) => setLoginCampus(e.target.value)}
                    className="block w-full pl-9 pr-8 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium cursor-pointer"
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
                <label htmlFor={loginRollId} className="block text-xs font-semibold text-ink-primary mb-1">
                  Roll Number / Student ID
                </label>
                <div className="flex rounded-lg border border-brand-secondary/25 overflow-hidden bg-brand-bg/60 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-colors">
                  <div className="pl-3 flex items-center pointer-events-none text-ink-secondary">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id={loginRollId}
                    type="text"
                    required
                    autoComplete="username"
                    value={loginRollNumber}
                    onChange={(e) => setLoginRollNumber(e.target.value.replace(/@.*$/, ''))}
                    placeholder="e.g. b24cs052"
                    className="block w-full pl-2.5 pr-2 py-2 text-base sm:text-xs bg-transparent text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none font-mono"
                  />
                  <div className="inline-flex items-center px-2.5 bg-brand-primary/5 border-l border-brand-secondary/20 text-xs font-mono font-semibold text-ink-secondary select-none">
                    {selectedLoginCampus.domain}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor={loginPasswordId} className="block text-xs font-semibold text-ink-primary mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id={loginPasswordId}
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-9 pr-10 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-secondary hover:text-ink-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || loginCooldown > 0 || !loginRollNumber.trim() || !loginPassword}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                {loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{loginCooldown > 0 ? `Wait ${loginCooldown}s` : 'Sign In'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
                  className="text-xs text-brand-secondary hover:text-brand-primary font-medium cursor-pointer"
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
              <div className="flex items-center justify-center gap-1.5 mb-5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${signUpStep >= 1 ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-ink-secondary'
                  }`}>1</div>
                <div className={`h-0.5 w-4 ${signUpStep >= 2 ? 'bg-brand-primary' : 'bg-brand-secondary/20'}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${signUpStep >= 2 ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-ink-secondary'
                  }`}>2</div>
                <div className={`h-0.5 w-4 ${signUpStep >= 3 ? 'bg-brand-primary' : 'bg-brand-secondary/20'}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${signUpStep >= 3 ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-ink-secondary'
                  }`}>3</div>
                <div className={`h-0.5 w-4 ${signUpStep >= 4 ? 'bg-brand-primary' : 'bg-brand-secondary/20'}`} />
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${signUpStep >= 4 ? 'bg-brand-primary text-white' : 'bg-brand-primary/10 text-ink-secondary'
                  }`}>4</div>
              </div>

              {/* STEP 1: Details */}
              {signUpStep === 1 && (
                <form onSubmit={handleSignUpRequestOtp} className="space-y-4">
                  <div>
                    <label htmlFor={signUpCampusId} className="block text-xs font-semibold text-ink-primary mb-1">
                      Select Campus
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                        <School className="w-4 h-4" />
                      </div>
                      <select
                        id={signUpCampusId}
                        value={signUpCampus}
                        onChange={(e) => setSignUpCampus(e.target.value)}
                        className="block w-full pl-9 pr-8 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium cursor-pointer"
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
                    <label htmlFor={signUpRollId} className="block text-xs font-semibold text-ink-primary mb-1">
                      Roll Number / Student ID
                    </label>
                    <div className="flex rounded-lg border border-brand-secondary/25 overflow-hidden bg-brand-bg/60 focus-within:ring-2 focus-within:ring-brand-primary focus-within:border-brand-primary transition-colors">
                      <div className="pl-3 flex items-center pointer-events-none text-ink-secondary">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id={signUpRollId}
                        type="text"
                        required
                        autoComplete="username"
                        aria-describedby={signUpRollHelpId}
                        value={signUpRollNumber}
                        onChange={(e) => setSignUpRollNumber(e.target.value.replace(/@.*$/, ''))}
                        placeholder="e.g. b24cs052"
                        className="block w-full pl-2.5 pr-2 py-2 text-base sm:text-xs bg-transparent text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none font-mono"
                      />
                      <div className="inline-flex items-center px-2.5 bg-brand-primary/5 border-l border-brand-secondary/20 text-xs font-mono font-semibold text-ink-secondary select-none">
                        {selectedSignUpCampus.domain}
                      </div>
                    </div>
                    <p id={signUpRollHelpId} className="mt-1 text-[10px] text-ink-secondary">
                      Verification code will be sent to this campus email.
                    </p>
                  </div>

                  <div>
                    <label htmlFor={signUpNameId} className="block text-xs font-semibold text-ink-primary mb-1">
                      Full Name
                    </label>
                    <input
                      id={signUpNameId}
                      type="text"
                      required
                      autoComplete="name"
                      value={signUpFullName}
                      onChange={(e) => setSignUpFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (otpCooldown > 0 &&
                        signUpRollNumber.trim().toLowerCase().replace(/@.*$/, '') === lastOtpRoll &&
                        signUpFullName.trim() === lastOtpName) ||
                      !signUpRollNumber.trim() ||
                      !signUpFullName.trim()
                    }
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>
                          {otpCooldown > 0 &&
                          signUpRollNumber.trim().toLowerCase().replace(/@.*$/, '') === lastOtpRoll &&
                          signUpFullName.trim() === lastOtpName
                            ? `Wait ${otpCooldown}s`
                            : 'Send Verification Code'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: Verify OTP First */}
              {signUpStep === 2 && (
                <form onSubmit={handleSignUpVerifyOtp} className="space-y-4">
                  <div className="text-center pb-1">
                    <p className="text-xs text-ink-secondary">
                      Enter the 6-digit verification code sent to:
                    </p>
                    <p className="text-xs font-mono font-semibold text-ink-primary mt-0.5">{signUpEmail}</p>
                  </div>

                  <div>
                    <label htmlFor={signUpOtpId} className="block text-xs font-semibold text-ink-primary mb-1">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id={signUpOtpId}
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={signUpOtp}
                        onChange={(e) => setSignUpOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="block w-full pl-9 pr-3 py-2 text-center tracking-[0.4em] text-base sm:text-sm font-mono font-bold border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || signUpOtp.length !== 6}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-brand-secondary/15">
                    <button
                      type="button"
                      onClick={() => {
                        setSignUpStep(1);
                        setSignUpOtp('');
                        resetErrors();
                      }}
                      className="text-ink-secondary hover:text-ink-primary font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                    >
                      Change Details
                    </button>

                    <button
                      type="button"
                      disabled={loading || otpCooldown > 0}
                      onClick={handleSignUpRequestOtp}
                      className="text-brand-secondary hover:text-brand-primary font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                    >
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Create Password (Only after OTP verification) */}
              {signUpStep === 3 && (
                <form onSubmit={handleSignUpComplete} className="space-y-4">
                  <div className="text-center pb-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Code Verified</span>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      Now create a password for your account:
                    </p>
                    <p className="text-xs font-mono font-semibold text-ink-primary mt-0.5">{signUpEmail}</p>
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor={signUpPasswordId} className="block text-xs font-semibold text-ink-primary mb-1">
                      Create Password (min. 6 characters)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id={signUpPasswordId}
                        type={showSignUpPassword ? 'text' : 'password'}
                        required
                        autoFocus
                        minLength={6}
                        autoComplete="new-password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Create strong password"
                        className="block w-full pl-9 pr-10 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-secondary hover:text-ink-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                        aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor={signUpConfirmPasswordId} className="block text-xs font-semibold text-ink-primary mb-1">
                      Confirm Password
                    </label>
                    <input
                      id={signUpConfirmPasswordId}
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={signUpConfirmPassword}
                      onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !signUpPassword || signUpPassword.length < 6}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Complete Registration & Sign In'}
                  </button>

                  <div className="text-center pt-2 border-t border-brand-secondary/15">
                    <button
                      type="button"
                      onClick={() => {
                        setSignUpStep(2);
                        resetErrors();
                      }}
                      className="text-xs text-ink-secondary hover:text-ink-primary font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                    >
                      Back to verification code
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 4: Optional WhatsApp Contact Number */}
              {signUpStep === 4 && (
                <form onSubmit={handleSavePhoneAndFinish} className="space-y-4">
                  <div className="text-center pb-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Account Ready</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink-primary">Add Your WhatsApp Number</h3>
                    <p className="text-xs text-ink-secondary mt-1">
                      Makes connecting with students seamless once a request is accepted.
                    </p>
                  </div>

                  <div>
                    <label htmlFor={signUpPhoneId} className="block text-xs font-semibold text-ink-primary mb-1">
                      WhatsApp Phone Number
                    </label>
                    <p id={signUpPhoneHelpId} className="text-[11px] text-ink-secondary mb-1.5">
                      Needed to request or accept items. You can add it later in Profile.
                    </p>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        id={signUpPhoneId}
                        type="tel"
                        autoFocus
                        autoComplete="tel"
                        aria-describedby={signUpPhoneHelpId}
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder="10-digit mobile number (we add +91)"
                        className="block w-full pl-9 pr-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-mono font-medium"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-ink-secondary">
                      10-digit mobile number (we add +91)
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-secondary/15 flex items-start gap-2 text-[11px] text-ink-secondary leading-relaxed">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-secondary mt-0.5" />
                    <span>
                      <strong>Privacy note:</strong> Your phone number is never public. It is revealed strictly when you accept or have a request accepted.
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Number & Enter UniX'}
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipPhone}
                      className="w-full py-2 px-4 rounded-lg text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      Skip for now
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Trimmed single-line footer */}
        <Footer compact className="mt-5" />
      </div>
    </div>
  );
}

