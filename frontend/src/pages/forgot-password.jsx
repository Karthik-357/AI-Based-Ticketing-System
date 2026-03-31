import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, KeyRound, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

function ForgotPassword() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1) // 1: email, 2: OTP, 3: new password, 4: success
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [resetToken, setResetToken] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    
    const otpRefs = useRef([])

    // Handle OTP input
    const handleOtpChange = (index, value) => {
        if (value.length > 1) {
            value = value.slice(-1)
        }
        if (!/^\d*$/.test(value)) return

        const newOtp = [...otp]
        newOtp[index] = value
        setOtp(newOtp)

        // Auto-focus next input
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus()
        }
    }

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus()
        }
    }

    const handleOtpPaste = (e) => {
        e.preventDefault()
        const pastedData = e.clipboardData.getData('text').slice(0, 6)
        if (!/^\d+$/.test(pastedData)) return
        
        const newOtp = [...otp]
        for (let i = 0; i < pastedData.length && i < 6; i++) {
            newOtp[i] = pastedData[i]
        }
        setOtp(newOtp)
        
        const focusIndex = Math.min(pastedData.length, 5)
        otpRefs.current[focusIndex]?.focus()
    }

    // Step 1: Send OTP
    const handleSendOTP = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })

            const data = await res.json()

            if (res.ok) {
                toast.success('OTP sent to your email')
                setStep(2)
            } else {
                toast.error(data.error || 'Something went wrong')
            }
        } catch (error) {
            toast.error('Failed to send OTP')
        } finally {
            setLoading(false)
        }
    }

    // Step 2: Verify OTP
    const handleVerifyOTP = async (e) => {
        e.preventDefault()
        const otpString = otp.join('')
        
        if (otpString.length !== 6) {
            toast.error('Please enter complete OTP')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString })
            })

            const data = await res.json()

            if (res.ok) {
                setResetToken(data.resetToken)
                setStep(3)
            } else {
                toast.error(data.error || 'Invalid OTP')
            }
        } catch (error) {
            toast.error('Failed to verify OTP')
        } finally {
            setLoading(false)
        }
    }

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('Passwords do not match')
            return
        }

        if (password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetToken, password })
            })

            const data = await res.json()

            if (res.ok) {
                setStep(4)
                setTimeout(() => navigate('/login'), 3000)
            } else {
                toast.error(data.error || 'Failed to reset password')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    // Step 4: Success
    if (step === 4) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="glass-panel p-8 sm:p-10 w-full max-w-md relative z-10 mx-4 text-center">
                    <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-sm">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Password Reset!</h2>
                    <p className="text-slate-500 mb-6">
                        Your password has been successfully reset. Redirecting to login...
                    </p>
                    <Link
                        to="/login"
                        className="glass-button-primary inline-flex items-center gap-2 px-6 py-3"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="glass-panel p-8 sm:p-10 w-full max-w-md relative z-10 mx-4">
                {/* Step 1: Email */}
                {step === 1 && (
                    <>
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Mail className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-center text-slate-800 tracking-tight">Forgot Password?</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 text-center">
                                Enter your email and we'll send you an OTP.
                            </p>
                        </div>

                        <form onSubmit={handleSendOTP} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="glass-input"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="glass-button-primary w-full py-3 mt-2 text-[13px] tracking-wide"
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>

                            <div className="text-center pt-2">
                                <Link
                                    to="/login"
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    </>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <>
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <KeyRound className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-center text-slate-800 tracking-tight">Enter OTP</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 text-center">
                                We sent a 6-digit code to <span className="text-slate-700">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(el) => (otpRefs.current[index] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                        onPaste={handleOtpPaste}
                                        className="w-12 h-14 text-center text-xl font-bold glass-input"
                                    />
                                ))}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="glass-button-primary w-full py-3 mt-2 text-[13px] tracking-wide"
                            >
                                {loading ? 'Verifying...' : 'Verify OTP'}
                            </button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Change Email
                                </button>
                            </div>
                        </form>
                    </>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <>
                        <div className="flex flex-col items-center justify-center mb-8">
                            <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Lock className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-center text-slate-800 tracking-tight">New Password</h2>
                            <p className="text-sm font-medium text-slate-500 mt-1 text-center">
                                Enter your new password below.
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="glass-input"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="glass-input"
                                    placeholder="••••••••"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="glass-button-primary w-full py-3 mt-2 text-[13px] tracking-wide"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword
