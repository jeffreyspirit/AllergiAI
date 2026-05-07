import Link from "next/link"
import { ShieldCheck, ArrowRight, HeartPulse, Sparkles, Scan, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />

      <nav className="relative max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-800">AllergiAI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#" className="hover:text-primary transition-colors">How it works</Link>
          <Link href="#" className="hover:text-primary transition-colors">Safety</Link>
        </div>
        <Link href="/dashboard">
          <Button className="rounded-2xl px-6 h-12 shadow-lg shadow-primary/20 group">
            Get Started
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </nav>

      <main className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-bold animate-bounce">
              <Sparkles className="w-4 h-4" />
              Your Personal Ingredient Guardian
            </div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Safety in every <span className="text-primary">Scan.</span>
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Instantly identify allergens in food and cosmetics using AI. Protecting your health has never been this simple, fast, and free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/dashboard">
                <Button size="lg" className="rounded-3xl px-10 h-16 text-lg font-bold shadow-2xl shadow-primary/30">
                  Start Scanning Now
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="rounded-3xl px-10 h-16 text-lg font-bold border-2">
                Watch Demo
              </Button>
            </div>
            
            <div className="pt-8 flex items-center justify-center lg:justify-start gap-8 text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">100% Private</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Thai/EN/CN Support</span>
              </div>
            </div>
          </div>

          <div className="relative">
            {/* Hero Image Mockup */}
            <div className="relative z-10 bg-white p-4 rounded-[3rem] shadow-2xl border border-slate-100 rotate-2 hover:rotate-0 transition-transform duration-500 max-w-md mx-auto">
              <div className="bg-slate-50 rounded-[2.5rem] overflow-hidden aspect-[9/19] relative">
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                      <Scan className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-48 bg-slate-200 rounded-full mx-auto" />
                      <div className="h-4 w-32 bg-slate-200 rounded-full mx-auto" />
                      <div className="h-4 w-40 bg-slate-200 rounded-full mx-auto" />
                    </div>
                    <div className="w-full p-4 bg-white rounded-3xl shadow-lg border border-red-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-red-600 uppercase">Warning</div>
                        <div className="text-sm font-bold text-slate-800">Match Found: Paraben</div>
                      </div>
                    </div>
                 </div>
              </div>
            </div>
            {/* Floating elements around hero */}
            <div className="absolute top-1/2 -right-8 w-24 h-24 bg-accent/20 rounded-3xl blur-xl animate-pulse" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
          </div>
        </div>
      </main>

      <section className="bg-slate-50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-black text-slate-900">How it Works</h2>
            <p className="text-slate-500">Three simple steps to safety</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: HeartPulse, title: "Create List", desc: "Add ingredients you are allergic to in your profile." },
              { icon: Smartphone, title: "Take Photo", desc: "Snap a photo of any product ingredient label." },
              { icon: ShieldCheck, title: "Get Results", desc: "Instantly see if the product is safe for you." }
            ].map((step, i) => (
              <div key={i} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 text-center group hover:shadow-xl transition-all">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                <p className="text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
