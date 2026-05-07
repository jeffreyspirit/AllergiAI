"use client"

import { useState, useEffect } from "react"
import { Scanner } from "@/components/Scanner"
import { AllergyList } from "@/components/AllergyList"
import { ShieldCheck, ListChecks, Scan, LogOut, User, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

export default function Dashboard() {
  const [allergies, setAllergies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [activeTab, setActiveTab] = useState<"scanner" | "allergies">("scanner")
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
          fetchAllergies(session.user.id)
        } else {
          setIsTestMode(true)
          const localData = localStorage.getItem("care_test_allergies")
          if (localData) {
            setAllergies(JSON.parse(localData))
          } else {
            const initial = ["paraben", "fragrance"]
            setAllergies(initial)
            localStorage.setItem("care_test_allergies", JSON.stringify(initial))
          }
          setLoading(false)
        }
      } catch {
        setIsTestMode(true)
        setLoading(false)
      }
    }
    checkUser()
  }, [])

  const fetchAllergies = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("allergies").select("substance_name").eq("user_id", userId)
      if (error) throw error
      setAllergies(data.map((a: any) => a.substance_name))
    } catch {
      setIsTestMode(true)
    } finally {
      setLoading(false)
    }
  }

  const addAllergy = async (name: string) => {
    const lowerName = name.toLowerCase()
    if (allergies.includes(lowerName)) return
    if (isTestMode) {
      const newList = [...allergies, lowerName]
      setAllergies(newList)
      localStorage.setItem("care_test_allergies", JSON.stringify(newList))
      toast.success(`Added ${name}`)
      return
    }
    try {
      const { error } = await supabase
        .from("allergies").insert([{ user_id: user.id, substance_name: lowerName }])
      if (error) throw error
      setAllergies([...allergies, lowerName])
      toast.success(`Added ${name}`)
    } catch { toast.error("Failed to add allergy") }
  }

  const addAllergies = async (names: string[]) => {
    const toAdd = names.map(n => n.toLowerCase()).filter(n => !allergies.includes(n))
    if (!toAdd.length) return
    if (isTestMode) {
      const newList = [...allergies, ...toAdd]
      setAllergies(newList)
      localStorage.setItem("care_test_allergies", JSON.stringify(newList))
      toast.success(`Added ${toAdd.length} allergens`)
      return
    }
    try {
      const { error } = await supabase.from("allergies")
        .insert(toAdd.map(n => ({ user_id: user.id, substance_name: n })))
      if (error) throw error
      setAllergies([...allergies, ...toAdd])
      toast.success(`Added ${toAdd.length} allergens`)
    } catch { toast.error("Failed to add allergens") }
  }

  const removeAllergy = async (name: string) => {
    if (isTestMode) {
      const newList = allergies.filter(a => a !== name)
      setAllergies(newList)
      localStorage.setItem("care_test_allergies", JSON.stringify(newList))
      toast.success(`Removed ${name}`)
      return
    }
    try {
      const { error } = await supabase
        .from("allergies").delete().eq("user_id", user.id).eq("substance_name", name)
      if (error) throw error
      setAllergies(allergies.filter(a => a !== name))
      toast.success(`Removed ${name}`)
    } catch { toast.error("Failed to remove allergy") }
  }

  const removeAllergies = async (names: string[]) => {
    const toRemove = names.map(n => n.toLowerCase()).filter(n => allergies.includes(n))
    if (!toRemove.length) return
    if (isTestMode) {
      const newList = allergies.filter(a => !toRemove.includes(a))
      setAllergies(newList)
      localStorage.setItem("care_test_allergies", JSON.stringify(newList))
      toast.success(`Removed ${toRemove.length} allergens`)
      return
    }
    try {
      const { error } = await supabase
        .from("allergies").delete().eq("user_id", user.id).in("substance_name", toRemove)
      if (error) throw error
      setAllergies(allergies.filter(a => !toRemove.includes(a)))
      toast.success(`Removed ${toRemove.length} allergens`)
    } catch { toast.error("Failed to remove allergens") }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full hero-gradient flex items-center justify-center shadow-2xl shadow-primary/30">
              <ShieldCheck className="w-9 h-9 text-white" />
            </div>
          </div>
          <p className="text-muted-foreground font-semibold tracking-wide animate-pulse">Initializing AllergiAI…</p>
        </div>
      </div>
    )
  }

  const displayName = isTestMode ? "Guest" : (user?.email?.split("@")[0] || "User")

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="orb w-[600px] h-[600px] bg-sky-400 top-[-150px] right-[-120px]" />
        <div className="orb w-[400px] h-[400px] bg-cyan-400 bottom-[-60px] left-[-100px]" />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP / TABLET LANDSCAPE (lg+) — Sidebar layout
          ═══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex h-screen overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-72 xl:w-80 flex flex-col border-r border-border/60 glass-card shrink-0 z-20">
          {/* Logo */}
          <div className="px-6 py-6 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 hero-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight">AllergiAI</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Scanner</span>
                </div>
              </div>
            </div>
          </div>

          {/* User card */}
          <div className="px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
              <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="hero-gradient text-white font-bold text-sm">
                  {displayName[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{displayName}</p>
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                  {isTestMode ? "Offline / Test" : "Premium"}
                </p>
              </div>
              {isTestMode && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-bold shrink-0">Test</Badge>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-border/40">
            <div className="bg-primary/8 rounded-2xl p-3 text-center border border-primary/10">
              <div className="text-2xl font-black text-primary">{allergies.length}</div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Tracked</div>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3 text-center border border-emerald-100">
              <div className="text-2xl font-black text-emerald-600">3</div>
              <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Languages</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="px-4 py-4 flex flex-col gap-1.5 flex-1">
            {([
              { id: "scanner",   icon: Scan,       label: "Ingredient Scanner", desc: "Scan product labels" },
              { id: "allergies", icon: ListChecks,  label: "My Allergy List",    desc: "Manage substances" },
            ] as const).map(({ id, icon: Icon, label, desc }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200 ${
                  activeTab === id
                    ? "hero-gradient text-white shadow-lg shadow-primary/25"
                    : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${activeTab === id ? "text-white" : ""}`} />
                <div>
                  <div className={`text-sm font-bold leading-tight ${activeTab === id ? "text-white" : ""}`}>{label}</div>
                  <div className={`text-[10px] mt-0.5 ${activeTab === id ? "text-white/70" : "text-muted-foreground"}`}>{desc}</div>
                </div>
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <div className="px-5 pb-6">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 rounded-2xl text-muted-foreground hover:text-destructive hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="flex-1 overflow-y-auto">
          {/* Hero strip */}
          <div className="hero-gradient px-8 py-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
            />
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-[.2em] mb-1">Welcome back</p>
              <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight">
                Hello, <span className="text-white/80">{displayName}</span> 👋
              </h1>
              <p className="text-white/60 mt-2 text-sm max-w-lg">
                AI-powered ingredient scanner — detect contact allergens across EN, TH &amp; ZH labels instantly.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 xl:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "scanner"
                  ? <Scanner allergies={allergies} />
                  : <AllergyList allergies={allergies} onAdd={addAllergy} onRemove={removeAllergy} onAddMany={addAllergies} onRemoveMany={removeAllergies} />
                }
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          TABLET PORTRAIT (md–lg) — Top nav + full content
          ═══════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex lg:hidden flex-col min-h-screen">
        {/* Navbar */}
        <header className="sticky top-0 z-50 border-b border-border/60 glass-card">
          <div className="px-6 h-18 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 hero-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight">AllergiAI</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Live Scanner</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isTestMode && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold">⚡ Test</Badge>}
              <div className="text-right">
                <p className="text-sm font-bold">{displayName}</p>
                <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">{isTestMode ? "Offline" : "Premium"}</p>
              </div>
              <Avatar className="h-10 w-10 border-2 border-white shadow-md">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="hero-gradient text-white font-bold text-sm">{displayName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="hero-gradient px-6 py-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
          />
          <div className="relative z-10 flex items-center justify-between gap-6">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-[.2em] mb-1">Welcome back</p>
              <h1 className="text-3xl font-black text-white tracking-tight">Hello, <span className="text-white/80">{displayName}</span> 👋</h1>
              <p className="text-white/60 mt-2 text-sm">AI contact allergen scanner — EN · TH · ZH</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-center border border-white/20">
                <div className="text-2xl font-black text-white">{allergies.length}</div>
                <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">Tracked</div>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 text-center border border-white/20">
                <div className="text-2xl font-black text-emerald-300">3</div>
                <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">Languages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 pt-6 flex justify-center">
          <div className="glass-card shadow-xl p-1.5 rounded-2xl flex gap-1 border-border/40">
            {([
              { id: "scanner",   icon: Scan,       label: "Scanner" },
              { id: "allergies", icon: ListChecks,  label: "Allergy List" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === id ? "hero-gradient text-white shadow-lg shadow-primary/30" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <main className="px-6 py-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {activeTab === "scanner"
                ? <Scanner allergies={allergies} />
                : <AllergyList allergies={allergies} onAdd={addAllergy} onRemove={removeAllergy} onAddMany={addAllergies} onRemoveMany={removeAllergies} />
              }
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE (< md) — Bottom tab nav
          ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* Navbar */}
        <header className="sticky top-0 z-50 border-b border-border/60 glass-card">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 hero-gradient rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <ShieldCheck className="text-white w-5 h-5" />
              </div>
              <span className="text-lg font-black tracking-tight">AllergiAI</span>
              {isTestMode && <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] font-bold">Test</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-9 w-9 border-2 border-white shadow-md">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="hero-gradient text-white font-bold text-xs">{displayName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive w-8 h-8" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="hero-gradient px-4 py-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.1) 1px,transparent 1px)", backgroundSize: "30px 30px" }}
          />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Hello, {displayName} 👋</h1>
              <p className="text-white/60 text-xs mt-1">EN · TH · ZH label scanner</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2.5 text-center border border-white/20 shrink-0">
              <div className="text-xl font-black text-white">{allergies.length}</div>
              <div className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Tracked</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 pt-5 pb-28">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {activeTab === "scanner"
                ? <Scanner allergies={allergies} />
                : <AllergyList allergies={allergies} onAdd={addAllergy} onRemove={removeAllergy} onAddMany={addAllergies} onRemoveMany={removeAllergies} />
              }
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <div className="glass-card shadow-2xl rounded-3xl px-2 py-2 flex items-center gap-1 border-border/40">
            {([
              { id: "scanner",   icon: Scan,       label: "Scan" },
              { id: "allergies", icon: ListChecks,  label: "List" },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-7 rounded-2xl transition-all duration-300 ${
                  activeTab === id ? "hero-gradient text-white shadow-lg shadow-primary/40" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            ))}
            <button onClick={handleSignOut}
              className="flex flex-col items-center gap-1 py-2.5 px-5 rounded-2xl text-muted-foreground hover:text-destructive transition-colors">
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold">Exit</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
