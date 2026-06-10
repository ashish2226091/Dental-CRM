import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  ArrowRight, 
  Sparkles, 
  RefreshCw, 
  Lock, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface LoginOnboardingProps {
  onLoginSuccess: (user: {
    email: string;
    mobile_no: string;
    first_name: string;
    last_name: string;
    gender: string;
    age_dob: string;
    type: 'doctor' | 'staff';
  }) => void;
}

export default function LoginOnboarding({ onLoginSuccess }: LoginOnboardingProps) {
  // 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Registration steps: 1 (Contact), 2 (OTP code input), 3 (Personal Details)
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Female');
  const [age, setAge] = useState('');
  const [roleType, setRoleType] = useState<'doctor' | 'staff'>('staff');

  // Login specific states
  const [loginEmailOrMobile, setLoginEmailOrMobile] = useState('');
  const [loginOtpSent, setLoginOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);

  // Fast demo bypass selections
  const handleQuickDemoLogin = async (type: 'doctor' | 'staff') => {
    setLoading(true);
    setErrorMsg('');
    try {
      const emailOrMobile = type === 'doctor' ? 'doctor@dentacare.com' : 'staff@dentacare.com';
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrMobile })
      });
      const data = await response.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setErrorMsg(data.error || 'Failed to login with demo credentials.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Network connectivity issue.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP for Registration
  const handleRegisterSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !mobileNo.trim()) {
      setErrorMsg('Please enter both your unique Email Address and Mobile Number.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedOtp(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mobile_no: mobileNo, isLogin: false })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        setSimulatedOtp(data.otp);
        setSuccessMsg(`OTP generated! ${data.message}`);
        setRegisterStep(2);
      } else {
        setErrorMsg(data.error || 'Failed to initiate verification.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Could not reach the authentication server.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Registration OTP
  const handleRegisterVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg('Email & Mobile verified successfully. Please fill your practice profile details.');
        setRegisterStep(3);
      } else {
        setErrorMsg(data.error || 'Verification code failed. Please check the code.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error checking security code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Register
  const handleRegisterComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !age.trim()) {
      setErrorMsg('Please complete all personal and clinical identifier details.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await fetch('/api/auth/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          mobile_no: mobileNo,
          first_name: firstName,
          last_name: lastName,
          gender,
          age_dob: age,
          type: roleType
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMsg(data.message);
        // Automatically sign them in!
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to save practitioner profile.');
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('Error finishing team onboarding.');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmailOrMobile.trim()) {
      setErrorMsg('Please provide your Email Address or Mobile Number.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // If OTP hasn't been requested yet, let's trigger it for secure login
    if (!loginOtpSent) {
      try {
        const response = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmailOrMobile, mobile_no: loginEmailOrMobile, isLogin: true })
        });
        const data = await response.json();
        
        if (response.ok && data.success) {
          setLoginOtpSent(true);
          setSimulatedOtp(data.otp);
          setSuccessMsg(`Login OTP sent! ${data.message}`);
        } else {
          // Fallback check: if user wanted passwordless fast check on login
          setErrorMsg(data.error || 'Authentication profile not found.');
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('Network error initiating secure login sequence.');
      } finally {
        setLoading(false);
      }
    } else {
      // OTP resides sent, now check OTP to finish login
      if (!loginOtp.trim()) {
        setErrorMsg('Please type the OTP security key.');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrMobile: loginEmailOrMobile, otp: loginOtp })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          onLoginSuccess(data.user);
        } else {
          setErrorMsg(data.error || 'Incorrect security code. Please check and retry.');
        }
      } catch (e) {
        console.error(e);
        setErrorMsg('Error logging into Practice Management.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div id="auth-main-container" className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-fadeIn">
        
        {/* Brand Banner Block */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2 border-b border-slate-800">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-md">D</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">DentaCare Intel Portal</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Practice Management Hub & AI CRM Engine</p>
          </div>
        </div>

        {/* Tab Selector switcher */}
        <div className="p-2 bg-slate-100 flex gap-2 border-b border-secondary-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMsg('');
              setSuccessMsg('');
              setSimulatedOtp(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            <Lock className="h-3.5 w-3.5 inline mr-1.5 align-text-bottom text-indigo-650" />
            Sign In
          </button>
          
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setRegisterStep(1);
              setErrorMsg('');
              setSuccessMsg('');
              setSimulatedOtp(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-805'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 inline mr-1.5 align-text-bottom text-indigo-500" />
            Onboard Practice
          </button>
        </div>

        {/* Body content form wrappers */}
        <div className="p-6 sm:p-8">
          
          {/* Status Alert Panels */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[11px] font-semibold text-red-700 leading-snug">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] font-semibold text-emerald-805 leading-snug">
              ✓ {successMsg}
            </div>
          )}

          {/* SIMULATED OTP CARD indicator - Extremely helpful for test reviews without physical cell network */}
          {simulatedOtp && (
            <div className="mb-5 p-4 bg-indigo-50 border border-indigo-150 rounded-2xl">
              <span className="text-[9px] font-black tracking-widest text-indigo-700 block uppercase mb-1.5">Demo Gateway Notification</span>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                We've mocked a delivery to your destination. Please enter this verification code below:
              </p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-sm font-extrabold font-mono tracking-widest text-indigo-900 bg-white border border-indigo-200 px-4 py-1.5 rounded-xl">
                  {simulatedOtp}
                </span>
                <span className="text-[9px] text-slate-400 font-bold italic animate-pulse">Waiting for validation...</span>
              </div>
            </div>
          )}

          {/* MODE 1: LOGIN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 leading-relaxed text-center mb-1">
                Enter your registered Email ID or Mobile No. to trigger a secure mobile login.
              </p>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Registered Email or Mobile</label>
                <div className="relative">
                  <input
                    type="text"
                    value={loginEmailOrMobile}
                    onChange={(e) => setLoginEmailOrMobile(e.target.value)}
                    disabled={loginOtpSent}
                    placeholder="e.g. staff@dentacare.com or 9876543210"
                    className="w-full text-xs pl-9 pr-4 py-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white font-medium"
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-none" />
                </div>
              </div>

              {loginOtpSent && (
                <div className="animate-fadeIn">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">6-Digit Login Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      value={loginOtp}
                      onChange={(e) => setLoginOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full text-xs pl-9 pr-4 py-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-slate-100 focus:border-slate-800 bg-white font-mono tracking-widest text-center text-lg font-bold"
                    />
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
              >
                {loading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : loginOtpSent ? (
                  <>
                    Verify & Access DentaCare Workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Send Login Code
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-150"></div>
                <span className="flex-shrink mx-4 text-[10px] text-slate-400 uppercase tracking-widest font-black">Or instant review bypass</span>
                <div className="flex-grow border-t border-slate-150"></div>
              </div>

              {/* Instant demo profiles selection */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('staff')}
                  className="p-3 bg-indigo-50/50 hover:bg-slate-100 border border-indigo-150 rounded-2xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-left"
                >
                  <User className="h-4 w-4 text-indigo-650" />
                  <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wide">Clara Oswald</span>
                  <span className="text-[8px] text-slate-405 leading-none">Practice Staff Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('doctor')}
                  className="p-3 bg-indigo-50/50 hover:bg-slate-100 border border-indigo-150 rounded-2xl flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-left"
                >
                  <ShieldCheck className="h-4 w-4 text-indigo-700" />
                  <span className="text-[10px] font-black text-indigo-900 uppercase tracking-wide">Dr. Jenkins</span>
                  <span className="text-[8px] text-slate-405 leading-none">Senior Doctor Admin</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: ONBOARDING PIPELINE */}
          {authMode === 'register' && (
            <div>
              {/* Stepper Progress Indicator */}
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${registerStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>1</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Contact</span>
                </div>
                <div className="flex-1 h-0.5 mx-2 bg-slate-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${registerStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>2</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">OTP Verification</span>
                </div>
                <div className="flex-1 h-0.5 mx-2 bg-slate-200"></div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${registerStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>3</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450">Profile Details</span>
                </div>
              </div>

              {/* STEP 1: Email & Mobile Capture */}
              {registerStep === 1 && (
                <form onSubmit={handleRegisterSendOtp} className="flex flex-col gap-4 animate-fadeIn">
                  <p className="text-xs text-slate-500 leading-relaxed text-center mb-1">
                    Provide your primary email address and cell mobile number. This handles credential locking.
                  </p>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Unique Email ID</label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. contact@doctorfirst.com"
                        className="w-full text-xs pl-9 pr-4 py-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white font-medium"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Mobile Number (Cell No.)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={mobileNo}
                        onChange={(e) => setMobileNo(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full text-xs pl-9 pr-4 py-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white font-medium"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    {loading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Verify credentials via OTP
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: OTP Entry Verification */}
              {registerStep === 2 && (
                <form onSubmit={handleRegisterVerifyOtp} className="flex flex-col gap-4 animate-fadeIn">
                  <p className="text-xs text-slate-500 leading-relaxed text-center mb-1">
                    An OTP key was triggered. Input the verification code below to process credentials locking securely.
                  </p>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Verification OTP Code</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Type 6-digit OTP code"
                        className="w-full text-xs pl-9 pr-4 py-3 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 bg-white font-mono tracking-widest text-center text-lg font-extrabold text-indigo-900"
                      />
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterStep(1);
                        setSimulatedOtp(null);
                        setErrorMsg('');
                        setSuccessMsg('');
                      }}
                      className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center border-0"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                    >
                      {loading ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          Verify Credentials
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: Personal & Role Profiles */}
              {registerStep === 3 && (
                <form onSubmit={handleRegisterComplete} className="flex flex-col gap-4 animate-fadeIn">
                  <p className="text-xs text-slate-500 leading-relaxed text-center mb-1">
                    Otp verified! Configure your practitioner name and workspace delegation.
                  </p>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">First Name</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. John"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Last Name</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Doe"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none bg-white text-slate-800 font-semibold cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Neutral">Neutral</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Age/Experience (Years)</label>
                      <input
                        type="number"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 34"
                        className="w-full text-xs p-2.5 border border-slate-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Team Assignment Type</label>
                    <div className="grid grid-cols-2 gap-3.5 mt-1">
                      <label className={`p-3 border rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer transition-all ${roleType === 'staff' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-205 hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="roleType"
                          value="staff"
                          checked={roleType === 'staff'}
                          onChange={() => setRoleType('staff')}
                          className="sr-only"
                        />
                        <User className={`h-5 w-5 ${roleType === 'staff' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">Support Staff</span>
                        <span className="text-[8px] text-slate-400 text-center leading-normal">Front Desk / Clinic Manager</span>
                      </label>

                      <label className={`p-3 border rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer transition-all ${roleType === 'doctor' ? 'border-indigo-650 bg-indigo-50/50' : 'border-slate-205 hover:bg-slate-50'}`}>
                        <input
                          type="radio"
                          name="roleType"
                          value="doctor"
                          checked={roleType === 'doctor'}
                          onChange={() => setRoleType('doctor')}
                          className="sr-only"
                        />
                        <ShieldCheck className={`h-5 w-5 ${roleType === 'doctor' ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">Doctor / Dentist</span>
                        <span className="text-[8px] text-slate-400 text-center leading-normal">MD / Senior Dentist Admin</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    {loading ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        Configure Practice Profile & Access CRM
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
