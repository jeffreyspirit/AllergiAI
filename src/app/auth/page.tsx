"use client"

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <ShieldCheck className="text-white w-8 h-8" />
        </div>
        <span className="text-3xl font-black tracking-tight text-slate-800">AllergiAI</span>
      </div>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="text-center pb-2 pt-8">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Join the community for safer product choices</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          {process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http') ? (
            <Auth
              supabaseClient={supabase}
              appearance={{ 
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'oklch(0.65 0.15 150)',
                      brandAccent: 'oklch(0.55 0.15 150)',
                      inputBackground: 'white',
                      inputBorder: 'oklch(0.92 0.03 150)',
                      inputText: 'black',
                      inputPlaceholder: 'oklch(0.45 0.05 150)',
                    },
                    radii: {
                      borderRadiusButton: '1rem',
                    },
                  }
                }
              }}
              providers={['google', 'github']}
              redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard`}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-amber-600 font-medium">Running in Test Mode without Database</p>
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full bg-primary text-white font-bold rounded-2xl h-12 hover:bg-primary/90 transition-colors"
              >
                Enter Test Dashboard
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="mt-8 text-sm text-slate-400 text-center max-w-xs leading-relaxed">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
