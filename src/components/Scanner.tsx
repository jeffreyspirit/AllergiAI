"use client"

import { useState, useRef } from "react"
import { createWorker } from "tesseract.js"
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, Info, ScanLine, Globe, FlaskConical, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"
import { lookupAllergen, KnownAllergen } from "@/lib/allergenDB"

// ─── Types ───────────────────────────────────────────────────────────────────
interface Ingredient {
  name: string
  nameEn?: string
  isAllergen: boolean
  dbRecord?: KnownAllergen    // enriched from local DB
  description?: string
}

interface ScannerProps {
  allergies: string[]
}

type DetectedLang = "en" | "th" | "zh" | "mixed" | "unknown"

// ─── Chinese → English micro-dictionary ─────────────────────────────────────
const ZH_TO_EN: Record<string, string> = {
  "水": "water", "甘油": "glycerin", "乙醇": "alcohol", "丁二醇": "butylene glycol",
  "透明质酸钠": "sodium hyaluronate", "玻尿酸": "hyaluronic acid", "尿素": "urea",
  "维生素C": "vitamin c", "维生素E": "vitamin e", "维生素B3": "niacinamide",
  "烟酰胺": "niacinamide", "视黄醇": "retinol", "对苯二酚": "hydroquinone",
  "氧化锌": "zinc oxide", "二氧化钛": "titanium dioxide", "乳木果油": "shea butter",
  "霍霍巴油": "jojoba oil", "玫瑰果油": "rosehip oil", "苯氧乙醇": "phenoxyethanol",
  "卡波姆": "carbomer", "黄原胶": "xanthan gum", "角鲨烷": "squalane",
  "神经酰胺": "ceramide", "胶原蛋白": "collagen", "辅酶Q10": "coenzyme q10",
  "绿茶提取物": "green tea extract", "芦荟": "aloe vera", "洋甘菊": "chamomile",
  "乳酸": "lactic acid", "水杨酸": "salicylic acid", "柠檬酸": "citric acid",
  "硬脂酸": "stearic acid", "棕榈酸": "palmitic acid", "矿物油": "mineral oil",
  "石蜡": "paraffin", "地蜡": "ozokerite", "二甲硅油": "dimethicone",
  "聚二甲基硅氧烷": "polydimethylsiloxane", "丙二醇": "propylene glycol",
  "氯化钠": "sodium chloride", "EDTA二钠": "disodium edta",
  "对羟基苯甲酸甲酯": "methylparaben", "对羟基苯甲酸丙酯": "propylparaben",
}

function translateZhToken(token: string): string | null {
  for (const [zh, en] of Object.entries(ZH_TO_EN)) {
    if (token.includes(zh)) return en
  }
  return null
}

// ─── Language detection — picks DOMINANT script only ────────────────────────
function detectLanguage(text: string): DetectedLang {
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const thCount = (text.match(/[\u0e00-\u0e7f]/g) || []).length
  const enCount = (text.match(/[a-zA-Z]/g) || []).length

  // Determine dominant script by whichever character count wins
  const max = Math.max(zhCount, thCount, enCount)
  if (max === 0) return "unknown"
  if (max === zhCount && zhCount > 8) return "zh"
  if (max === thCount && thCount > 8) return "th"
  if (enCount > 8) return "en"
  return "unknown"
}

const LANG_LABELS: Record<DetectedLang, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇬🇧" },
  th: { label: "Thai", flag: "🇹🇭" },
  zh: { label: "Chinese", flag: "🇨🇳" },
  mixed: { label: "Multilingual", flag: "🌐" },
  unknown: { label: "Unknown", flag: "❓" },
}

// ─── Noise / non-ingredient patterns ────────────────────────────────────────
const NOISE_PATTERNS = [
  // Pure numbers or numbers with units (nutrition facts style)
  /^\d+(\.\d+)?\s*(%|g|mg|ml|kcal|cal|kj|kJ|oz|lb|µg|iu|IU)?$/,
  // Token ends with amount like "120 2%" or "13g 2" or "11g 3%"
  /\d+\s*(g|mg|ml|%|kcal|kj)\s*\d*$/i,
  // Fraction
  /^\d+\s*\/\s*\d+/,
  // NRV / RDA reference values
  /\bnrv\b|\brda\b|\bdv\b|\b%dv\b/i,
  // URL / contact
  /www\.|@|©|®|™/,
  // Pure symbols/numbers with no letters
  /^[^a-zA-Z\u0e00-\u0e7f\u4e00-\u9fff]+$/,
  // Batch / expiry / location codes
  /\breference\b|\bbatch\b|\bexp\b|\bexpiry\b|\bloc\b/i,
  /^\d{4,}/,
  /\b(ndc|tel|fax|po box|made in|distributed|manufactured)\b/i,
  /[=~_\[\]{}|<>\\]{2,}/,
  // Nutrition fact table headers / row labels
  /^(energy|protein|fat|carbohydrate|sugar|sodium|fibre|fiber|calories|cholesterol|calcium|iron|vitamin)s?$/i,
  // Chinese nutrition table header
  /营养成分表|项目|能量|蛋白质|脂肪|碳水化合物|糖|钠|膳食纤维|营养素参考值/,
  // Mixed-script OCR garbage: token has both Thai + Chinese or very short mixed chars
  // e.g. "มย", "Eb", "Bien", "Erfe(Uresetd)" when followed by a number
  /^[a-z]{1,4}\s*\d/i,  // "Eb 13g", "Bien 11g"
]

function isNoiseToken(token: string): boolean {
  if (token.length < 2 || token.length > 60) return true
  const words = token.split(/\s+/)
  if (words.length > 6) return true  // likely a sentence
  for (const p of NOISE_PATTERNS) {
    if (p.test(token)) return true
  }
  // Reject if token contains both Thai and Chinese chars — OCR cross-contamination
  const hasThai = /[\u0e00-\u0e7f]/.test(token)
  const hasZh   = /[\u4e00-\u9fff]/.test(token)
  if (hasThai && hasZh) return true
  return false
}

// ─── Ingredient zone extraction ──────────────────────────────────────────────
const INGREDIENT_KEYWORDS = {
  active:   ["active ingredient", "active ingredients"],
  inactive: ["inactive ingredient", "inactive ingredients"],
  generic:  [
    "ingredients:", "ingredients", "ingredient:", "ingredient",
    "ส่วนประกอบ:", "ส่วนประกอบ", "ส่วนผสม",
    // Use 配料 (ingredients/recipe) NOT 成分 (composition) for food products
    "配料:", "配料", "成分:", "成分",
    "ingrédients", "ingredientes", "zutat", "ingredienti",
  ],
  stopwords: [
    "warnings", "warning", "directions", "direction", "questions",
    "comments?", "purpose", "uses", "distributed by", "manufactured by",
    "made in", "store at", "keep out", "www.", "may contain",
    "drug facts", "other information", "for external use",
    "stop use", "ask a doctor",
    // Nutrition table section headers — stop before these
    "nutrition facts", "nutrition information", "nutritional information",
    "supplement facts",
    "营养成分表", "营养成分", "营养素参考值",  // Chinese nutrition table
    "ข้อมูลโภชนาการ",                        // Thai nutrition label
    "amount per serving", "serving size", "daily value",
  ],
}

function extractSection(lower: string, startKw: string, stopwords: string[]): string {
  const idx = lower.indexOf(startKw)
  if (idx === -1) return ""
  let end = lower.length
  for (const sw of stopwords) {
    const si = lower.indexOf(sw, idx + startKw.length)
    if (si !== -1 && si < end) end = si
  }
  return lower.substring(idx + startKw.length, end).replace(/^[\s:;=\-，]+/, "")
}

function findBestKeyword(lower: string, keywords: string[]): { idx: number; len: number } {
  let bestIdx = -1
  let bestLen = 0
  for (const kw of keywords) {
    const idx = lower.indexOf(kw)
    if (idx !== -1 && (bestIdx === -1 || idx < bestIdx || (idx === bestIdx && kw.length > bestLen))) {
      bestIdx = idx
      bestLen = kw.length
    }
  }
  return { idx: bestIdx, len: bestLen }
}

function parseIngredientZone(rawText: string): string[] {
  const lower = rawText.toLowerCase()
  let zone = ""

  // Try active + inactive sections
  const idxActive = findBestKeyword(lower, INGREDIENT_KEYWORDS.active)
  const idxInactive = findBestKeyword(lower, INGREDIENT_KEYWORDS.inactive)

  if (idxActive.idx !== -1 && idxInactive.idx !== -1) {
    const activeStops = [...INGREDIENT_KEYWORDS.stopwords, "inactive ingredient"]
    const activeText = extractSection(lower, lower.substring(idxActive.idx, idxActive.idx + idxActive.len), activeStops)
    const inactiveText = extractSection(lower, lower.substring(idxInactive.idx, idxInactive.idx + idxInactive.len), INGREDIENT_KEYWORDS.stopwords)
    zone = activeText + "," + inactiveText
  } else if (idxInactive.idx !== -1) {
    zone = extractSection(lower, lower.substring(idxInactive.idx, idxInactive.idx + idxInactive.len), INGREDIENT_KEYWORDS.stopwords)
  } else if (idxActive.idx !== -1) {
    zone = extractSection(lower, lower.substring(idxActive.idx, idxActive.idx + idxActive.len), INGREDIENT_KEYWORDS.stopwords)
  } else {
    const { idx, len } = findBestKeyword(lower, INGREDIENT_KEYWORDS.generic)
    if (idx !== -1) {
      zone = extractSection(lower, lower.substring(idx, idx + len), INGREDIENT_KEYWORDS.stopwords)
    } else {
      zone = lower  // fallback: try whole text
    }
  }

  // Also handle Chinese comma「、」and fullwidth comma「，」
  const raw = zone
    .split(/[,\n\t|·•、，;]+/)
    .map(t => t.trim())
    .filter(t => !isNoiseToken(t))

  return Array.from(new Set(raw))
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Scanner({ allergies }: ScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState("")
  const [results, setResults] = useState<Ingredient[] | null>(null)
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [detectedLang, setDetectedLang] = useState<DetectedLang | null>(null)
  const [scanError, setScanError] = useState<"low_quality" | "no_text" | "no_ingredients" | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const processImage = async (imageSrc: string) => {
    setImagePreview(imageSrc)
    setIsProcessing(true)
    setProgress(0)
    setScanError(null)
    setProgressMsg("Initializing OCR engine…")
    setResults(null)
    setDetectedLang(null)

    try {
      // ── Pass 1: tri-language probe to detect dominant script ───────────────
      // Must include chi_sim+tha or Chinese/Thai chars are never seen by OCR
      setProgressMsg("Detecting language…")
      const probe = await createWorker("eng+chi_sim+tha", 1)
      const { data: probeData } = await probe.recognize(imageSrc)
      await probe.terminate()

      const probeText = probeData.text
      const probeConf  = probeData.confidence

      // Detect dominant language FIRST (before quality gate, so ZH labels aren't rejected)
      const lang = detectLanguage(probeText)
      setDetectedLang(lang)

      // Quality gate — Chinese OCR always returns low confidence, so skip for ZH/TH
      const isLatin = lang === "en" || lang === "unknown"
      if (isLatin && probeConf < 20 && probeText.trim().length < 30) {
        setScanError("low_quality")
        return
      }
      if (probeText.trim().length < 5) {
        setScanError("no_text")
        return
      }

      // ── Pass 2: re-scan with targeted single-language model ────────────────
      const langModel: Record<string, string> = {
        zh: "chi_sim",
        th: "tha",
        en: "eng",
        unknown: "eng",
        mixed: "eng+chi_sim+tha",
      }
      const ocrLang = langModel[lang] ?? "eng"

      setProgressMsg(`Scanning with ${LANG_LABELS[lang]?.label ?? "auto"} model…`)

      const worker = await createWorker(ocrLang, 1, {
        logger: m => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100))
            setProgressMsg(`Reading label… ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      const { data } = await worker.recognize(imageSrc)
      await worker.terminate()

      const finalText = data.text
      const finalConf  = data.confidence

      // Quality gate on final pass — again skip for non-Latin scripts
      if (isLatin && finalConf < 25 && finalText.trim().length < 40) {
        setScanError("low_quality")
        return
      }

      setProgressMsg("Analysing ingredients…")

      // ── Parse ingredient zone ──────────────────────────────────────────────
      const tokens = parseIngredientZone(finalText)

      if (tokens.length === 0) {
        setScanError("no_ingredients")
        return
      }

      const EXACT_IGNORE = new Set(["active", "inactive", "purpose", "uses", "warnings", "directions", "s", "ee"])

      const processed: Ingredient[] = tokens
        .filter(t => !EXACT_IGNORE.has(t))
        .map(name => {
          let nameEn: string | undefined
          if (/[\u4e00-\u9fff]/.test(name)) {
            const translated = translateZhToken(name)
            if (translated) nameEn = translated
          }
          const checkName = nameEn || name
          const isAllergen = allergies.some(a =>
            checkName.toLowerCase().includes(a.toLowerCase())
          )
          // Enrich from local DB
          const dbRecord = lookupAllergen(checkName) ?? undefined
          return {
            name,
            nameEn,
            isAllergen,
            dbRecord,
            description: dbRecord?.description ?? "An ingredient found on the product label.",
          }
        })

      setResults(processed)
    } catch (err) {
      console.error("OCR Error:", err)
      setScanError("low_quality")
    } finally {
      setIsProcessing(false)
      setProgressMsg("")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => {
        if (ev.target?.result) processImage(ev.target.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const hasMatch = results?.some(i => i.isAllergen)
  const safeCount = results?.filter(i => !i.isAllergen).length ?? 0
  const allergenCount = results?.filter(i => i.isAllergen).length ?? 0

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Scan Error Feedback ── */}
      <AnimatePresence>
        {scanError && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-3xl border overflow-hidden shadow-lg"
          >
            {scanError === "low_quality" && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 p-6 flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📷</span>
                </div>
                <div>
                  <h3 className="font-black text-amber-800 text-lg">Image Too Blurry or Dark</h3>
                  <p className="text-amber-700/80 text-sm mt-1 leading-relaxed">
                    The scanner couldn't read this label clearly. Try again with a <strong>sharper, well-lit photo</strong> taken close-up and at a straight angle.
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-amber-700/70">
                    <li>• Hold the camera steady — avoid motion blur</li>
                    <li>• Good lighting — avoid shadows over the text</li>
                    <li>• Get closer to fill the frame with the label</li>
                  </ul>
                </div>
              </div>
            )}
            {scanError === "no_text" && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 p-6 flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔍</span>
                </div>
                <div>
                  <h3 className="font-black text-slate-700 text-lg">No Text Found</h3>
                  <p className="text-slate-600/80 text-sm mt-1 leading-relaxed">
                    The image doesn't appear to contain readable text. Make sure you're scanning the <strong>ingredient label</strong> side of the product.
                  </p>
                </div>
              </div>
            )}
            {scanError === "no_ingredients" && (
              <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200 p-6 flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h3 className="font-black text-sky-800 text-lg">No Ingredients Section Found</h3>
                  <p className="text-sky-700/80 text-sm mt-1 leading-relaxed">
                    Text was detected but no ingredient list was found. Make sure the image includes the <strong>"Ingredients" section</strong> of the label (not the front or nutritional facts panel).
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Upload Card ── */}
      <Card className="border border-border/50 shadow-xl glass-card rounded-3xl overflow-hidden">
        {/* Card header stripe */}
        <div className="hero-gradient px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Ingredient Scanner</h2>
            <p className="text-white/60 text-xs">Supports EN · TH · ZH labels</p>
          </div>
          {detectedLang && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-auto flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1 border border-white/25"
            >
              <Globe className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white text-xs font-bold">
                {LANG_LABELS[detectedLang].flag} {LANG_LABELS[detectedLang].label}
              </span>
            </motion.div>
          )}
        </div>

        <CardContent className="p-5 sm:p-7 flex flex-col gap-5">
          {/* Image preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/30 group"
              >
                <img
                  src={imagePreview}
                  alt="Scanned product label"
                  className="w-full max-h-64 object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                    {/* Scanning beam */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent scan-line" />
                    <ScanLine className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                )}
                <button
                  onClick={() => { setImagePreview(null); setResults(null); setDetectedLang(null) }}
                  className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-28 sm:h-32 border-dashed border-2 rounded-2xl flex flex-col gap-2 hover:bg-primary/5 hover:border-primary transition-all group"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="w-5 h-5 text-primary" />
              </div>
              <span className="font-semibold text-sm text-muted-foreground group-hover:text-foreground">Upload Photo</span>
              <span className="text-[10px] text-muted-foreground/60">Gallery / Files</span>
            </Button>
            <Button
              variant="default"
              className="h-28 sm:h-32 rounded-2xl flex flex-col gap-2 hero-gradient border-0 shadow-lg shadow-primary/30 hover:opacity-90 transition-all"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isProcessing}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-sm text-white">Take Photo</span>
              <span className="text-[10px] text-white/60">Use Camera</span>
            </Button>
          </div>

          {/* Gallery file input */}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          {/* Camera capture input — opens camera directly on mobile */}
          <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />

          {/* Progress bar */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col gap-3"
              >
                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full hero-gradient"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>{progressMsg}</span>
                  </div>
                  <span className="font-bold text-primary">{progress}%</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Status banner */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className={`relative overflow-hidden p-5 sm:p-6 rounded-3xl flex items-center gap-4 shadow-lg ${
                hasMatch
                  ? "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200"
                  : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200"
              }`}
            >
              <div className="absolute right-0 top-0 opacity-10 text-[100px] leading-none font-black select-none">
                {hasMatch ? "!" : "✓"}
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${hasMatch ? "bg-white/20" : "bg-white/20"}`}>
                {hasMatch
                  ? <AlertCircle className="w-7 h-7 text-white" />
                  : <CheckCircle2 className="w-7 h-7 text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black leading-tight">
                  {hasMatch ? "⚠ Allergen Detected!" : "✓ Product Looks Safe"}
                </h3>
                <p className="text-white/75 text-sm mt-0.5">
                  {hasMatch
                    ? `${allergenCount} allergen${allergenCount > 1 ? "s" : ""} matched your profile.`
                    : "No allergens matched in the ingredient list."}
                </p>
              </div>
            </motion.div>

            {/* Analysis card */}
            <Card className="border border-border/50 shadow-xl glass-card rounded-3xl overflow-hidden">
              {/* Header with stats */}
              <div className="px-5 sm:px-7 py-5 border-b border-border/40 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black text-foreground">Ingredient Analysis</CardTitle>
                  <CardDescription className="mt-0.5">
                    {results.length} ingredients extracted
                    {detectedLang && ` · ${LANG_LABELS[detectedLang].flag} ${LANG_LABELS[detectedLang].label}`}
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="text-2xl font-black text-emerald-600">{safeCount}</div>
                    <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Safe</div>
                  </div>
                  <div className="text-center px-4 py-2 bg-red-50 rounded-2xl border border-red-100">
                    <div className="text-2xl font-black text-red-600">{allergenCount}</div>
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Alert</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-6">
                <motion.div
                  className="flex flex-col gap-2"
                  variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.04 } }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {results.map((item, idx) => (
                    <motion.button
                      key={idx}
                      variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0 } }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border text-left transition-shadow hover:shadow-md ${
                        item.isAllergen
                          ? "bg-red-50 border-red-200 hover:border-red-300 hover:bg-red-100/80"
                          : "bg-emerald-50/60 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                      onClick={() => setSelectedIngredient(item)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isAllergen ? "bg-red-500" : "bg-emerald-500"}`} />
                        <div className="min-w-0">
                          <span className={`font-semibold capitalize text-sm block ${item.isAllergen ? "text-red-800" : "text-emerald-800"}`}>
                            {item.name}
                          </span>
                          {item.nameEn && (
                            <span className="text-xs text-muted-foreground mt-0.5 block">
                              🇬🇧 {item.nameEn}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {item.isAllergen ? (
                          <>
                            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Allergen</span>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Safe</span>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!selectedIngredient} onOpenChange={() => setSelectedIngredient(null)}>
        <DialogContent className="rounded-3xl border border-border/50 glass-card max-w-sm sm:max-w-md mx-4">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge className={`rounded-full font-bold text-xs ${selectedIngredient?.isAllergen ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                {selectedIngredient?.isAllergen ? "⚠ Allergen" : "✓ Safe"}
              </Badge>
              {selectedIngredient?.dbRecord && (
                  <Badge className="rounded-full bg-primary/10 text-primary border-primary/20 font-semibold text-xs">
                  {{ preservative: "🧪 Preservative", fragrance: "🌸 Fragrance", surfactant: "🫧 Surfactant", uv_filter: "☀️ UV Filter", colorant: "🎨 Colorant", solvent: "💧 Solvent", emollient: "🧈 Emollient", active: "⚗️ Active", drug: "💊 OTC Drug", environmental: "🌿 Environmental", protein: "🌱 Botanical" }[selectedIngredient.dbRecord.category] ?? selectedIngredient.dbRecord.category}
                  </Badge>
              )}
              {selectedIngredient?.dbRecord && (
                <Badge className={`rounded-full font-bold text-xs ${selectedIngredient.dbRecord.severity === "high" ? "bg-red-50 text-red-600 border-red-200" : selectedIngredient.dbRecord.severity === "medium" ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
                  {selectedIngredient.dbRecord.severity === "high" ? "🔴" : selectedIngredient.dbRecord.severity === "medium" ? "🟡" : "🟢"} {selectedIngredient.dbRecord.severity} risk
                </Badge>
              )}
              {selectedIngredient?.nameEn && (
                <Badge className="rounded-full bg-blue-50 text-blue-600 border-blue-100 font-semibold text-xs">🇬🇧 EN</Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-black capitalize text-foreground">{selectedIngredient?.name}</DialogTitle>
            {selectedIngredient?.nameEn && (
              <p className="text-sm text-primary font-semibold mt-0.5">🇬🇧 {selectedIngredient.nameEn}</p>
            )}
            <DialogDescription className="text-muted-foreground leading-relaxed pt-2 text-sm">
              {selectedIngredient?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedIngredient?.dbRecord?.aliases && selectedIngredient.dbRecord.aliases.length > 1 && (
            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Also appears on labels as</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedIngredient.dbRecord.aliases.slice(0, 8).map((alias, i) => (
                  <span key={i} className="text-xs bg-background rounded-lg px-2 py-0.5 border border-border/50 capitalize">{alias}</span>
                ))}
              </div>
            </div>
          )}
          <div className="p-3.5 bg-muted/30 rounded-2xl text-xs text-muted-foreground italic border border-border/30">
            ⚕️ For informational purposes only. Always consult a qualified healthcare professional.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
