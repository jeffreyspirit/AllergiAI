"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, HeartPulse, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { ALLERGEN_DB, ALL_ALLERGEN_ALIASES } from "@/lib/allergenDB"

interface AllergyListProps {
  allergies: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onAddMany: (names: string[]) => void
  onRemoveMany: (names: string[]) => void
}

const CATEGORY_META: Record<string, { label: string; color: string; dot: string }> = {
  preservative: { label: "Preservative", color: "bg-violet-100 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  fragrance:    { label: "Fragrance",    color: "bg-pink-100 text-pink-700 border-pink-200",       dot: "bg-pink-500" },
  surfactant:   { label: "Surfactant",   color: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500" },
  uv_filter:    { label: "UV Filter",    color: "bg-amber-100 text-amber-700 border-amber-200",    dot: "bg-amber-500" },
  colorant:     { label: "Colorant",     color: "bg-red-100 text-red-700 border-red-200",          dot: "bg-red-500" },
  solvent:      { label: "Solvent",      color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  emollient:    { label: "Emollient",    color: "bg-sky-100 text-sky-700 border-sky-200",          dot: "bg-sky-500" },
  topical_drug: { label: "Topical Drug", color: "bg-rose-100 text-rose-700 border-rose-200",       dot: "bg-rose-500" },
  metal:        { label: "Metal",        color: "bg-slate-100 text-slate-700 border-slate-200",    dot: "bg-slate-500" },
  rubber_chemical: { label: "Rubber",   color: "bg-zinc-100 text-zinc-700 border-zinc-200",        dot: "bg-zinc-500" },
  botanical:    { label: "Botanical",    color: "bg-lime-100 text-lime-700 border-lime-200",       dot: "bg-lime-500" },
  chemical:     { label: "Chemical",     color: "bg-teal-100 text-teal-700 border-teal-200",       dot: "bg-teal-500" },
}

const SEVERITY_COLOR: Record<string, string> = {
  high: "text-red-600", medium: "text-amber-600", low: "text-emerald-600",
}

export function AllergyList({ allergies, onAdd, onRemove }: AllergyListProps) {
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Autocomplete from DermNet DB
  const suggestions = useMemo(() => {
    const q = input.toLowerCase().trim()
    if (q.length < 2) return []
    return ALL_ALLERGEN_ALIASES
      .filter(a => a.includes(q) && !allergies.map(x => x.toLowerCase()).includes(a))
      .slice(0, 7)
  }, [input, allergies])

  const handleAdd = (name: string) => {
    const trimmed = name.trim()
    if (trimmed) { onAdd(trimmed); setInput(""); setShowSuggestions(false) }
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleAdd(input) }

  // Enrich each saved allergy with DB record
  const enriched = allergies.map(a => {
    const lower = a.toLowerCase()
    const record = ALLERGEN_DB.find(r =>
      r.name === lower || r.aliases.some(al => al === lower || al.includes(lower) || lower.includes(al))
    )
    return { name: a, record }
  })

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Card className="glass-card border border-border/50 shadow-xl rounded-3xl overflow-hidden">
        <div className="px-6 py-5 border-b border-border/40 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-black">My Allergy List</CardTitle>
            <CardDescription>
              {allergies.length === 0
                ? "Add substances you are sensitive to"
                : `${allergies.length} substance${allergies.length > 1 ? "s" : ""} being monitored`}
            </CardDescription>
          </div>
          {allergies.length > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-2xl px-3 py-1.5">
              <span className="text-xl font-black text-primary">{allergies.length}</span>
              <span className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">tracked</span>
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Input + autocomplete */}
          <div className="relative mb-5">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search DermNet contact allergens…"
                  value={input}
                  onChange={e => { setInput(e.target.value); setShowSuggestions(true) }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => setShowSuggestions(true)}
                  className="rounded-2xl border-border/60 focus-visible:ring-primary h-12"
                  autoComplete="off"
                />
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-border/60 shadow-xl overflow-hidden z-50"
                    >
                      {suggestions.map((s, i) => {
                        const rec = ALLERGEN_DB.find(r => r.name === s || r.aliases.includes(s))
                        const meta = rec ? CATEGORY_META[rec.category] : null
                        return (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-primary/5 hover:text-primary transition-colors flex items-center gap-2"
                            onMouseDown={() => handleAdd(s)}
                          >
                            <ChevronRight className="w-3 h-3 text-primary/50 flex-shrink-0" />
                            <span className="capitalize flex-1">{s}</span>
                            {meta && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                                {meta.label}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <Button type="submit" className="rounded-2xl h-12 px-5 shadow-lg shadow-primary/20 hero-gradient border-0">
                <Plus className="w-5 h-5" />
              </Button>
            </form>
          </div>

          {/* Allergen list */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {enriched.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14">
                  <div className="text-5xl mb-4">🛡️</div>
                  <p className="font-bold text-foreground/70">Your list is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Search above — data sourced from DermNet NZ contact allergens
                  </p>
                </motion.div>
              ) : (
                enriched.map(({ name, record }) => {
                  const meta = record ? CATEGORY_META[record.category] : null
                  return (
                    <motion.div
                      key={name}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className="group"
                    >
                      <div className={`flex items-start justify-between p-4 rounded-2xl border transition-all hover:shadow-sm ${
                        record ? "bg-muted/30 border-border/50 hover:border-border" : "bg-muted/20 border-border/30 hover:border-border/60"
                      }`}>
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${meta?.dot ?? "bg-primary"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground capitalize text-sm">{name}</span>
                              {meta && (
                                <Badge className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${meta.color}`}>
                                  {meta.label}
                                </Badge>
                              )}
                              {record && (
                                <span className={`text-[9px] font-black uppercase tracking-wider ${SEVERITY_COLOR[record.severity]}`}>
                                  {record.severity} risk
                                </span>
                              )}
                            </div>
                            {record?.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                {record.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0 ml-2"
                          onClick={() => onRemove(name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-2">
        💡 <strong>{ALLERGEN_DB.length} contact allergens</strong> sourced from{" "}
        <a href="https://dermnetnz.org/topics/contact-allergens" target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2">DermNet NZ</a>
      </div>
    </div>
  )
}
