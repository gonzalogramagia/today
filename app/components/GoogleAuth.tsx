'use client'

import { useState, useEffect } from 'react'
import { LogOut, Lock } from 'lucide-react'
import { Language, dictionary } from '../data/i18n'

interface GoogleAuthProps {
    lang: Language;
    variant?: 'icon' | 'full';
}

export default function GoogleAuth({ lang, variant = 'icon' }: GoogleAuthProps) {
    const t = dictionary[lang]
    const comingSoon = lang === 'en' ? 'Available soon' : 'Próximamente'

    const GoogleIcon = () => (
        <svg viewBox="0 0 24 24" className="w-full h-full grayscale opacity-50">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )

    if (variant === 'icon') {
        return (
            <div className="group relative flex items-center h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl shadow-sm opacity-60 cursor-not-allowed overflow-visible gap-2.5">
                <div className="w-5 h-5 flex-shrink-0">
                    <GoogleIcon />
                </div>
                <span className="text-xs font-bold text-zinc-400 whitespace-nowrap">
                    {lang === 'en' ? 'Sign in' : 'Iniciar sesión'}
                </span>
                <Lock size={12} className="text-zinc-400" />
                
                {/* Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {comingSoon}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full">
            <div className="flex items-center justify-center gap-3 w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl opacity-60 cursor-not-allowed mt-4 group">
                <div className="w-6 h-6">
                    <GoogleIcon />
                </div>
                <span className="font-bold text-zinc-400">
                    {t.signInWithGoogle}
                </span>
                <div className="p-1 px-2 border border-zinc-300 rounded-md bg-white shadow-sm flex items-center gap-1">
                    <Lock size={12} className="text-zinc-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                        Soon
                    </span>
                </div>
            </div>
        </div>
    )
}
