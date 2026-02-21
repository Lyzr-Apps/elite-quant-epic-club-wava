'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent, uploadFiles } from '@/lib/aiAgent'
import { copyToClipboard } from '@/lib/clipboard'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  FiUpload, FiCopy, FiCheck, FiX, FiClock,
  FiTrendingUp, FiTrendingDown, FiActivity, FiBarChart2,
  FiTarget, FiAlertTriangle, FiChevronRight,
  FiChevronDown, FiSearch, FiTrash2, FiRefreshCw, FiImage,
  FiZap, FiShield, FiLayers, FiGlobe, FiEye
} from 'react-icons/fi'

// ===================== CONSTANTS =====================

const MANAGER_AGENT_ID = '699984fce6cce9ba73b56e32'

const LOADING_STEPS = [
  'Preparing upload...',
  'Uploading charts...',
  'Analyzing chart patterns...',
  'Scanning market sentiment...',
  'Generating trading signal...',
]

// ===================== TYPES =====================

interface SignalData {
  signal_type?: string
  instrument?: string
  strategy_type?: string
  timeframe?: string
  market_vibe?: string
  strike_price?: string
  entry_price?: string
  target_1?: string
  target_2?: string
  stop_loss_1?: string
  stop_loss_2?: string
  risk_reward_ratio?: string
  confidence_score?: string
  confidence_reasoning?: string
  current_price?: string
  trend_direction?: string
  day_high?: string
  day_low?: string
  pdh?: string
  pdl?: string
  support_levels?: string
  resistance_levels?: string
  ema_analysis?: string
  rsi_value?: string
  macd_analysis?: string
  candlestick_patterns?: string
  volume_analysis?: string
  option_chain_max_pain?: string
  option_chain_pcr?: string
  option_chain_highest_oi_ce?: string
  option_chain_highest_oi_pe?: string
  option_chain_oi_interpretation?: string
  gift_nifty_level?: string
  us_futures?: string
  crude_oil?: string
  fii_dii_data?: string
  overall_sentiment?: string
  sentiment_summary?: string
  technical_confluence?: string
  trade_rationale?: string
  risk_factors?: string
  disclaimer?: string
}

interface SignalHistoryItem {
  id: string
  timestamp: string
  instrument: string
  signal: SignalData
}

interface FilePreview {
  file: File
  preview: string
}

// ===================== SAMPLE DATA =====================

const SAMPLE_SIGNAL: SignalData = {
  signal_type: 'BUY CE',
  instrument: 'Nifty 50',
  strategy_type: 'Intraday',
  timeframe: '15m',
  market_vibe: 'Bullish',
  strike_price: '24500 CE',
  entry_price: '185-195',
  target_1: '225',
  target_2: '260',
  stop_loss_1: '160',
  stop_loss_2: '145',
  risk_reward_ratio: '1:2.5',
  confidence_score: '8',
  confidence_reasoning: 'Strong bullish confluence with EMA crossover on 15m, RSI above 60 with room to run, MACD histogram turning positive. Price respecting PDH as support. Volume confirming breakout. Option chain PCR supportive of upside move.',
  current_price: '24485',
  trend_direction: 'Uptrend',
  day_high: '24520',
  day_low: '24380',
  pdh: '24450',
  pdl: '24280',
  support_levels: '24450, 24400, 24350',
  resistance_levels: '24520, 24580, 24650',
  ema_analysis: '9 EMA > 21 EMA > 50 EMA on 15m chart. Price trading above all EMAs. Bullish alignment across timeframes.',
  rsi_value: '62 - Bullish momentum, not overbought',
  macd_analysis: 'MACD line crossed above signal line. Histogram turning green. Bullish crossover confirmed.',
  candlestick_patterns: 'Bullish engulfing at PDH support. Morning star pattern on 15m timeframe.',
  volume_analysis: 'Above average volume on breakout candle. Volume confirming price action. OBV trending up.',
  option_chain_max_pain: '24400',
  option_chain_pcr: '1.25 - Mildly bullish',
  option_chain_highest_oi_ce: '24600 CE - 45L OI',
  option_chain_highest_oi_pe: '24400 PE - 52L OI',
  option_chain_oi_interpretation: 'Strong PE writing at 24400 suggests support. CE OI building at 24600 acts as resistance. PCR above 1.2 is bullish.',
  gift_nifty_level: '+65 points, indicating gap-up opening',
  us_futures: 'S&P 500 futures +0.3%, Nasdaq +0.5%. Positive overnight cue.',
  crude_oil: '$78.50 - Stable, no headwinds for Indian markets',
  fii_dii_data: 'FII: +1200 Cr (Cash) | DII: +800 Cr. Net positive flows supporting bullish bias.',
  overall_sentiment: 'Moderately Bullish',
  sentiment_summary: 'Global cues positive with GIFT Nifty indicating gap-up. FII flows supportive. Crude stable. Technical setup aligning with sentiment for an intraday bullish play.',
  technical_confluence: '7/8 factors aligned bullish: EMA stack, RSI momentum, MACD crossover, candlestick pattern, volume confirmation, PCR supportive, price above PDH.',
  trade_rationale: 'Strong intraday setup with bullish EMA alignment on 15m. Price broke above PDH 24450 with volume confirmation. Bullish engulfing pattern at support. MACD crossover aligns with momentum. Option chain data with PCR 1.25 supports upside. Entry at 185-195 premium with SL at 160 gives favorable risk-reward of 1:2.5.',
  risk_factors: 'Key resistance at 24520 day high - watch for rejection. If Nifty breaks below 24450 PDH, setup invalidated. Global events or sudden FII selling could reverse sentiment. Keep strict SL at 160.',
  disclaimer: 'This signal is for educational purposes only and does not constitute financial advice. Trading in derivatives involves substantial risk. Past performance is not indicative of future results. Always do your own analysis before trading.',
}

// ===================== HELPER FUNCTIONS =====================

function parseConfidence(val?: string): number {
  if (!val) return 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : Math.min(10, Math.max(0, num))
}

function getConfidenceColor(score: number): string {
  if (score >= 8) return 'text-emerald-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function getConfidenceBg(score: number): string {
  if (score >= 8) return 'from-emerald-500 to-emerald-400'
  if (score >= 5) return 'from-amber-500 to-amber-400'
  return 'from-red-500 to-red-400'
}

function getVibeColor(vibe?: string): string {
  const v = (vibe ?? '').toLowerCase()
  if (v.includes('bullish')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (v.includes('bearish')) return 'bg-red-500/15 text-red-400 border-red-500/30'
  return 'bg-amber-500/15 text-amber-400 border-amber-500/30'
}

function getSignalColor(signal?: string): { bg: string; text: string; border: string; glow: string } {
  const s = (signal ?? '').toUpperCase()
  if (s.includes('CE')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' }
  if (s.includes('PE')) return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-red-500/20' }
  return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' }
}

function formatSignalForCopy(data: SignalData): string {
  const lines = [
    `=== MARKET SIGNAL GENERATOR by X!TX | Powered by DHR ===`,
    `Date: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
    ``,
    `SIGNAL: ${data?.signal_type ?? 'N/A'}`,
    `Instrument: ${data?.instrument ?? 'N/A'}`,
    `Strategy: ${data?.strategy_type ?? 'N/A'}`,
    `Timeframe: ${data?.timeframe ?? 'N/A'}`,
    `Market Vibe: ${data?.market_vibe ?? 'N/A'}`,
    ``,
    `--- TRADE SETUP ---`,
    `Strike: ${data?.strike_price ?? 'N/A'}`,
    `Entry: ${data?.entry_price ?? 'N/A'}`,
    `Target 1: ${data?.target_1 ?? 'N/A'}`,
    `Target 2: ${data?.target_2 ?? 'N/A'}`,
    `Stop Loss 1: ${data?.stop_loss_1 ?? 'N/A'}`,
    `Stop Loss 2: ${data?.stop_loss_2 ?? 'N/A'}`,
    `R:R Ratio: ${data?.risk_reward_ratio ?? 'N/A'}`,
    `Confidence: ${data?.confidence_score ?? 'N/A'}/10`,
    ``,
    `--- PRICE LEVELS ---`,
    `Current: ${data?.current_price ?? 'N/A'}`,
    `Day H/L: ${data?.day_high ?? 'N/A'} / ${data?.day_low ?? 'N/A'}`,
    `PDH/PDL: ${data?.pdh ?? 'N/A'} / ${data?.pdl ?? 'N/A'}`,
    `Support: ${data?.support_levels ?? 'N/A'}`,
    `Resistance: ${data?.resistance_levels ?? 'N/A'}`,
    ``,
    `--- TECHNICALS ---`,
    `EMA: ${data?.ema_analysis ?? 'N/A'}`,
    `RSI: ${data?.rsi_value ?? 'N/A'}`,
    `MACD: ${data?.macd_analysis ?? 'N/A'}`,
    `Patterns: ${data?.candlestick_patterns ?? 'N/A'}`,
    `Volume: ${data?.volume_analysis ?? 'N/A'}`,
    ``,
    `--- OPTION CHAIN ---`,
    `Max Pain: ${data?.option_chain_max_pain ?? 'N/A'}`,
    `PCR: ${data?.option_chain_pcr ?? 'N/A'}`,
    `Highest CE OI: ${data?.option_chain_highest_oi_ce ?? 'N/A'}`,
    `Highest PE OI: ${data?.option_chain_highest_oi_pe ?? 'N/A'}`,
    ``,
    `--- SENTIMENT ---`,
    `GIFT Nifty: ${data?.gift_nifty_level ?? 'N/A'}`,
    `US Futures: ${data?.us_futures ?? 'N/A'}`,
    `Crude: ${data?.crude_oil ?? 'N/A'}`,
    `FII/DII: ${data?.fii_dii_data ?? 'N/A'}`,
    `Overall: ${data?.overall_sentiment ?? 'N/A'}`,
    ``,
    `RATIONALE: ${data?.trade_rationale ?? 'N/A'}`,
    ``,
    `RISK: ${data?.risk_factors ?? 'N/A'}`,
    ``,
    `DISCLAIMER: ${data?.disclaimer ?? 'For educational purposes only.'}`,
  ]
  return lines.join('\n')
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ===================== ERROR BOUNDARY =====================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md glass-card rounded-xl">
            <FiAlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ===================== PREMIUM SUB-COMPONENTS =====================

function GlowDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', color)} />
      <span className={cn('relative inline-flex rounded-full h-2 w-2', color)} />
    </span>
  )
}

function SectionIcon({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
        <Icon className="w-3.5 h-3.5 text-primary" />
      </div>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </div>
  )
}

function SignalHeader({ data }: { data: SignalData }) {
  const vibeColor = getVibeColor(data?.market_vibe)
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))
  }, [])

  return (
    <div className="animate-float-in flex items-center justify-between flex-wrap gap-2 p-3 glass-card rounded-lg">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-xs font-mono bg-primary/5 border-primary/20">{data?.instrument ?? 'N/A'}</Badge>
        <Badge variant="outline" className="text-xs font-mono bg-secondary/50">{data?.timeframe ?? 'N/A'}</Badge>
        <Badge variant="outline" className="text-xs font-mono bg-secondary/50">{data?.strategy_type ?? 'N/A'}</Badge>
        <Badge className={cn('text-xs border font-medium', vibeColor)}>{data?.market_vibe ?? 'N/A'}</Badge>
      </div>
      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
        <FiClock className="w-3 h-3" />
        {now}
      </span>
    </div>
  )
}

function SignalBlock({ data }: { data: SignalData }) {
  const signalColors = getSignalColor(data?.signal_type)
  const confidence = parseConfidence(data?.confidence_score)
  const confColor = getConfidenceColor(confidence)
  const confBg = getConfidenceBg(confidence)
  const isCE = (data?.signal_type ?? '').toUpperCase().includes('CE')
  const isPE = (data?.signal_type ?? '').toUpperCase().includes('PE')

  return (
    <div className={cn('animate-float-in rounded-xl border-2 overflow-hidden shadow-lg transition-all duration-300', signalColors.border, signalColors.bg, `shadow-lg ${signalColors.glow}`)}>
      {/* Signal gradient top bar */}
      <div className={cn('h-1 w-full bg-gradient-to-r', isCE ? 'from-emerald-600 via-emerald-400 to-emerald-600' : isPE ? 'from-red-600 via-red-400 to-red-600' : 'from-blue-600 via-blue-400 to-blue-600')} />

      <div className="p-5 space-y-4">
        {/* Signal type and confidence header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-xl', isCE ? 'bg-emerald-500/15' : isPE ? 'bg-red-500/15' : 'bg-blue-500/15')}>
              {isCE ? (
                <FiTrendingUp className="w-8 h-8 text-emerald-400" />
              ) : isPE ? (
                <FiTrendingDown className="w-8 h-8 text-red-400" />
              ) : (
                <FiActivity className="w-8 h-8 text-blue-400" />
              )}
            </div>
            <div>
              <span className={cn('text-3xl font-bold tracking-tight block', signalColors.text, isCE ? 'signal-ce' : isPE ? 'signal-pe' : '')}>
                {data?.signal_type ?? 'N/A'}
              </span>
              <span className="text-xs text-muted-foreground font-mono mt-0.5 block">{data?.strike_price ?? ''}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Confidence</div>
            <div className={cn('text-3xl font-bold tabular-nums', confColor)}>{confidence}<span className="text-base text-muted-foreground">/10</span></div>
          </div>
        </div>

        {/* Confidence bar */}
        <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
          <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', confBg)} style={{ width: `${confidence * 10}%` }} />
        </div>

        {/* Trade parameters grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PremiumDataCell label="Entry" value={data?.entry_price} icon={<FiChevronRight className="w-3 h-3" />} />
          <PremiumDataCell label="Target 1" value={data?.target_1} variant="success" icon={<FiTarget className="w-3 h-3" />} />
          <PremiumDataCell label="Target 2" value={data?.target_2} variant="success" icon={<FiTarget className="w-3 h-3" />} />
          <PremiumDataCell label="R:R Ratio" value={data?.risk_reward_ratio} variant="primary" icon={<FiZap className="w-3 h-3" />} />
          <PremiumDataCell label="SL 1" value={data?.stop_loss_1} variant="danger" icon={<FiShield className="w-3 h-3" />} />
          <PremiumDataCell label="SL 2" value={data?.stop_loss_2} variant="danger" icon={<FiShield className="w-3 h-3" />} />
          <PremiumDataCell label="Trend" value={data?.trend_direction} icon={<FiActivity className="w-3 h-3" />} />
          <PremiumDataCell label="Strategy" value={data?.strategy_type} icon={<FiLayers className="w-3 h-3" />} />
        </div>

        {/* Confidence reasoning */}
        {data?.confidence_reasoning && (
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <FiEye className="w-3 h-3" /> Signal Reasoning
            </p>
            <p className="text-xs leading-relaxed text-foreground/80">{data.confidence_reasoning}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PremiumDataCell({ label, value, variant, icon }: { label: string; value?: string; variant?: 'success' | 'danger' | 'primary'; icon?: React.ReactNode }) {
  const valClass = variant === 'success'
    ? 'text-emerald-400'
    : variant === 'danger'
    ? 'text-red-400'
    : variant === 'primary'
    ? 'text-primary'
    : 'text-foreground'

  return (
    <div className="p-2.5 rounded-lg bg-muted/20 border border-border/30 hover:border-border/60 transition-colors group">
      <div className="flex items-center gap-1 mb-1">
        {icon && <span className="text-muted-foreground group-hover:text-foreground/60 transition-colors">{icon}</span>}
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <p className={cn('text-sm font-mono font-semibold', valClass)}>{value ?? 'N/A'}</p>
    </div>
  )
}

function TechnicalGrid({ data }: { data: SignalData }) {
  return (
    <div className="animate-float-in glass-card rounded-xl overflow-hidden" style={{ animationDelay: '0.1s' }}>
      <div className="p-4 border-b border-border/30">
        <SectionIcon icon={FiBarChart2} label="Technical Confluence" />
        {data?.technical_confluence && (
          <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
            <p className="text-xs leading-relaxed text-foreground/85">{data.technical_confluence}</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <TechItem label="EMA Analysis" value={data?.ema_analysis} icon={<FiTrendingUp className="w-3 h-3" />} />
          <TechItem label="RSI" value={data?.rsi_value} icon={<FiActivity className="w-3 h-3" />} />
          <TechItem label="MACD" value={data?.macd_analysis} icon={<FiBarChart2 className="w-3 h-3" />} />
          <TechItem label="Candlestick Patterns" value={data?.candlestick_patterns} icon={<FiEye className="w-3 h-3" />} />
          <TechItem label="Volume Analysis" value={data?.volume_analysis} icon={<FiLayers className="w-3 h-3" />} />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <FiTarget className="w-3 h-3" /> Price Levels
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
            <PremiumDataCell label="Current Price" value={data?.current_price} variant="primary" />
            <PremiumDataCell label="Day High" value={data?.day_high} />
            <PremiumDataCell label="Day Low" value={data?.day_low} />
            <PremiumDataCell label="PDH" value={data?.pdh} />
            <PremiumDataCell label="PDL" value={data?.pdl} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-widest mb-1">Support Levels</p>
            <p className="text-xs font-mono text-emerald-400">{data?.support_levels ?? 'N/A'}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15">
            <p className="text-[10px] text-red-400/70 uppercase tracking-widest mb-1">Resistance Levels</p>
            <p className="text-xs font-mono text-red-400">{data?.resistance_levels ?? 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TechItem({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/20 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-primary/60">{icon}</span>}
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-xs leading-relaxed text-foreground/80">{value ?? 'N/A'}</p>
    </div>
  )
}

function OptionChainSection({ data }: { data: SignalData }) {
  return (
    <div className="animate-float-in glass-card rounded-xl overflow-hidden" style={{ animationDelay: '0.15s' }}>
      <div className="p-4 border-b border-border/30">
        <SectionIcon icon={FiTarget} label="Option Chain Analysis" />
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <PremiumDataCell label="Max Pain" value={data?.option_chain_max_pain} variant="primary" icon={<FiTarget className="w-3 h-3" />} />
          <PremiumDataCell label="PCR" value={data?.option_chain_pcr} icon={<FiBarChart2 className="w-3 h-3" />} />
          <PremiumDataCell label="Highest OI CE" value={data?.option_chain_highest_oi_ce} variant="success" icon={<FiTrendingUp className="w-3 h-3" />} />
          <PremiumDataCell label="Highest OI PE" value={data?.option_chain_highest_oi_pe} variant="danger" icon={<FiTrendingDown className="w-3 h-3" />} />
        </div>
        {data?.option_chain_oi_interpretation && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1"><FiEye className="w-3 h-3" /> OI Interpretation</p>
            <p className="text-xs leading-relaxed text-foreground/80">{data.option_chain_oi_interpretation}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SentimentSection({ data }: { data: SignalData }) {
  return (
    <div className="animate-float-in glass-card rounded-xl overflow-hidden" style={{ animationDelay: '0.2s' }}>
      <div className="p-4 border-b border-border/30">
        <SectionIcon icon={FiGlobe} label="Market Sentiment" />
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <PremiumDataCell label="GIFT Nifty" value={data?.gift_nifty_level} icon={<FiGlobe className="w-3 h-3" />} />
          <PremiumDataCell label="US Futures" value={data?.us_futures} icon={<FiTrendingUp className="w-3 h-3" />} />
          <PremiumDataCell label="Crude Oil" value={data?.crude_oil} icon={<FiBarChart2 className="w-3 h-3" />} />
          <PremiumDataCell label="FII/DII Data" value={data?.fii_dii_data} icon={<FiLayers className="w-3 h-3" />} />
          <PremiumDataCell label="Overall Sentiment" value={data?.overall_sentiment} variant="primary" icon={<FiActivity className="w-3 h-3" />} />
        </div>
        {data?.sentiment_summary && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1"><FiEye className="w-3 h-3" /> Sentiment Summary</p>
            <p className="text-xs leading-relaxed text-foreground/80">{data.sentiment_summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function RationaleSection({ data }: { data: SignalData }) {
  return (
    <div className="animate-float-in space-y-3" style={{ animationDelay: '0.25s' }}>
      {data?.trade_rationale && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/30">
            <SectionIcon icon={FiZap} label="Trade Rationale" />
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-foreground/85">{data.trade_rationale}</p>
          </div>
        </div>
      )}

      {data?.risk_factors && (
        <div className="rounded-xl overflow-hidden border border-red-500/20 bg-red-500/5">
          <div className="p-4 border-b border-red-500/15">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
                <FiAlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-red-400">Risk Factors</span>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-red-300/80">{data.risk_factors}</p>
          </div>
        </div>
      )}

      {data?.disclaimer && (
        <div className="p-3 rounded-lg bg-muted/15 border border-border/30">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mb-1">Disclaimer</p>
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed">{data.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

function LoadingOverlay({ step, progress }: { step: number; progress: number }) {
  return (
    <div className="glass-card rounded-xl p-8 animate-pulse-glow">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Animated spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border border-primary/20 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiZap className="w-5 h-5 text-primary animate-pulse" />
          </div>
        </div>

        <div className="text-center space-y-3 w-full max-w-sm">
          <p className="text-sm font-semibold tracking-tight">{LOADING_STEPS[step] ?? 'Processing...'}</p>
          <div className="relative">
            <Progress value={progress} className="h-2" />
            <div className="absolute inset-0 animate-shimmer rounded-full" />
          </div>
          <p className="text-xs text-muted-foreground font-mono">{Math.round(progress)}%</p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-sm">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className={cn('flex items-center gap-2.5 text-xs px-3 py-1.5 rounded-md transition-all duration-300', i === step ? 'bg-primary/10 border border-primary/20' : i < step ? 'opacity-60' : 'opacity-30')}>
              {i < step ? (
                <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : i === step ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/20 flex-shrink-0" />
              )}
              <span className={cn(i <= step ? 'text-foreground' : 'text-muted-foreground/40')}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HistoryCard({ item, expanded, onToggle, onDelete }: { item: SignalHistoryItem; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const signalColors = getSignalColor(item.signal?.signal_type)
  const [ts, setTs] = useState('')
  const confidence = parseConfidence(item.signal?.confidence_score)

  useEffect(() => {
    setTs(new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))
  }, [item.timestamp])

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/20">
      <button onClick={onToggle} className="w-full p-3.5 flex items-center justify-between hover:bg-muted/10 transition-colors">
        <div className="flex items-center gap-3">
          <Badge className={cn('text-xs border font-semibold px-2.5', signalColors.bg, signalColors.text, signalColors.border)}>
            {item.signal?.signal_type ?? 'N/A'}
          </Badge>
          <span className="text-sm font-mono font-medium">{item.instrument}</span>
          <span className="text-xs text-muted-foreground font-mono">{item.signal?.strike_price ?? ''}</span>
          <Badge variant="outline" className="text-[10px] font-mono">{confidence}/10</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-muted-foreground font-mono">{ts}</span>
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all">
            <FiTrash2 className="w-3 h-3 text-destructive" />
          </button>
          {expanded ? <FiChevronDown className="w-4 h-4 text-muted-foreground" /> : <FiChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-border/30">
          <SignalBlock data={item.signal} />
          <TechnicalGrid data={item.signal} />
          <OptionChainSection data={item.signal} />
          <SentimentSection data={item.signal} />
          <RationaleSection data={item.signal} />
        </div>
      )}
    </div>
  )
}

// ===================== MAIN PAGE =====================

export default function Page() {
  const [activeNav, setActiveNav] = useState<'dashboard' | 'history'>('dashboard')
  const [instrument, setInstrument] = useState<'Nifty 50' | 'Bank Nifty'>('Nifty 50')
  const [chartFiles, setChartFiles] = useState<FilePreview[]>([])
  const [optionChainFile, setOptionChainFile] = useState<FilePreview | null>(null)
  const [notes, setNotes] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [signalResult, setSignalResult] = useState<SignalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [savedToHistory, setSavedToHistory] = useState(false)
  const [showSample, setShowSample] = useState(false)
  const [history, setHistory] = useState<SignalHistoryItem[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'CE' | 'PE'>('all')
  const [historyInstrumentFilter, setHistoryInstrumentFilter] = useState<'all' | 'Nifty 50' | 'Bank Nifty'>('all')
  const [historySearch, setHistorySearch] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const chartInputRef = useRef<HTMLInputElement>(null)
  const ocInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('signal_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) setHistory(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (isGenerating) {
      const stepTargets = [15, 35, 60, 85, 100]
      const target = stepTargets[loadingStep] ?? 100
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = setInterval(() => {
        setLoadingProgress(prev => prev >= target - 2 ? prev : prev + 0.5)
      }, 100)
    } else {
      if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null }
      setLoadingProgress(0)
    }
    return () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current) }
  }, [isGenerating, loadingStep])

  const handleChartFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const validFiles: FilePreview[] = []
    const currentCount = chartFiles.length
    for (let i = 0; i < files.length && currentCount + validFiles.length < 5; i++) {
      const file = files[i]
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) continue
      if (file.size > 10 * 1024 * 1024) continue
      validFiles.push({ file, preview: URL.createObjectURL(file) })
    }
    setChartFiles(prev => [...prev, ...validFiles])
    setError(null)
  }, [chartFiles.length])

  const handleOCFile = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) return
    if (file.size > 10 * 1024 * 1024) return
    setOptionChainFile({ file, preview: URL.createObjectURL(file) })
    setError(null)
  }, [])

  const removeChartFile = useCallback((idx: number) => {
    setChartFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[idx]) URL.revokeObjectURL(newFiles[idx].preview)
      newFiles.splice(idx, 1)
      return newFiles
    })
  }, [])

  const removeOCFile = useCallback(() => {
    if (optionChainFile) URL.revokeObjectURL(optionChainFile.preview)
    setOptionChainFile(null)
  }, [optionChainFile])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false) }, [])
  const handleChartDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); handleChartFiles(e.dataTransfer.files) }, [handleChartFiles])
  const handleOCDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); handleOCFile(e.dataTransfer.files) }, [handleOCFile])

  const handleGenerateSignal = async () => {
    setIsGenerating(true); setError(null); setSignalResult(null); setCopied(false); setSavedToHistory(false); setLoadingStep(0); setLoadingProgress(0)
    try {
      setLoadingStep(1)
      const allFiles: File[] = chartFiles.map(fp => fp.file)
      if (optionChainFile) allFiles.push(optionChainFile.file)
      const uploadResult = await uploadFiles(allFiles)
      if (!uploadResult.success) { setError('Failed to upload charts. Please try again.'); setIsGenerating(false); return }
      setLoadingStep(2)
      const message = `Analyze the uploaded chart images for ${instrument}. ${optionChainFile ? 'Option chain screenshot is also included.' : ''}${notes ? ` Trader notes: ${notes}` : ''} Generate a comprehensive trading signal.`
      setLoadingStep(3)
      const result = await callAIAgent(message, MANAGER_AGENT_ID, { assets: uploadResult.asset_ids })
      setLoadingStep(4); setLoadingProgress(90)
      if (result.success) {
        let signalData = result?.response?.result
        if (typeof signalData === 'string') { try { signalData = JSON.parse(signalData) } catch { if (result.raw_response) { try { const raw = JSON.parse(result.raw_response); signalData = raw?.result || raw?.response?.result || raw } catch {} } } }
        if (!signalData || (typeof signalData === 'object' && Object.keys(signalData).length === 0)) { if (result.raw_response) { try { const raw = JSON.parse(result.raw_response); signalData = raw?.result || raw?.response?.result || raw } catch {} } }
        setSignalResult(signalData as SignalData); setLoadingProgress(100)
      } else { setError(result.error || 'Failed to generate signal. Please try again.') }
    } catch { setError('An unexpected error occurred. Please try again.') }
    finally { setIsGenerating(false) }
  }

  const handleCopy = async () => {
    const data = showSample ? SAMPLE_SIGNAL : signalResult
    if (!data) return
    const success = await copyToClipboard(formatSignalForCopy(data))
    if (success) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  const handleSaveToHistory = () => {
    const data = showSample ? SAMPLE_SIGNAL : signalResult
    if (!data) return
    const item: SignalHistoryItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, timestamp: new Date().toISOString(), instrument: data?.instrument || instrument, signal: data }
    const updated = [item, ...history]
    setHistory(updated)
    try { localStorage.setItem('signal_history', JSON.stringify(updated)) } catch {}
    setSavedToHistory(true); setTimeout(() => setSavedToHistory(false), 2000)
  }

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    try { localStorage.setItem('signal_history', JSON.stringify(updated)) } catch {}
  }

  const handleNewAnalysis = () => {
    chartFiles.forEach(fp => URL.revokeObjectURL(fp.preview))
    if (optionChainFile) URL.revokeObjectURL(optionChainFile.preview)
    setChartFiles([]); setOptionChainFile(null); setNotes(''); setSignalResult(null); setError(null); setCopied(false); setSavedToHistory(false); setShowSample(false)
  }

  const displayData = showSample ? SAMPLE_SIGNAL : signalResult
  const hasSignal = displayData !== null

  const filteredHistory = history.filter(item => {
    if (historyFilter !== 'all') { const st = (item.signal?.signal_type ?? '').toUpperCase(); if (historyFilter === 'CE' && !st.includes('CE')) return false; if (historyFilter === 'PE' && !st.includes('PE')) return false }
    if (historyInstrumentFilter !== 'all' && item.instrument !== historyInstrumentFilter) return false
    if (historySearch) { const s = historySearch.toLowerCase(); if (!`${item.instrument} ${item.signal?.signal_type ?? ''} ${item.signal?.strike_price ?? ''}`.toLowerCase().includes(s)) return false }
    return true
  })

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          {/* Premium Header */}
          <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl">
            <div className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-4">
                {/* Logo/Brand */}
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center animate-gradient-flow">
                      <FiZap className="w-5 h-5 text-white" />
                    </div>
                    <GlowDot color="bg-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-tight leading-none">
                      Market Signal Generator <span className="text-primary">by X!TX</span>
                    </h1>
                    <p className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">Powered by DHR</p>
                  </div>
                </div>

                <div className="h-8 w-px bg-border/50" />

                {/* Instrument Toggle */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 border border-border/30">
                  <button onClick={() => setInstrument('Nifty 50')} className={cn('px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200', instrument === 'Nifty 50' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'text-muted-foreground hover:text-foreground')}>
                    NIFTY 50
                  </button>
                  <button onClick={() => setInstrument('Bank Nifty')} className={cn('px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200', instrument === 'Bank Nifty' ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : 'text-muted-foreground hover:text-foreground')}>
                    BANK NIFTY
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sample-toggle" className="text-[11px] text-muted-foreground cursor-pointer">Sample Data</Label>
                  <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
                </div>
              </div>
            </div>
            {/* Gradient line */}
            <div className="header-glow" />
          </header>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-52 border-r border-border/30 bg-card/30 backdrop-blur-sm flex flex-col shrink-0">
              <nav className="p-3 space-y-1">
                <button onClick={() => setActiveNav('dashboard')} className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200', activeNav === 'dashboard' ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm shadow-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}>
                  <FiBarChart2 className="w-4 h-4" />
                  Signal Dashboard
                </button>
                <button onClick={() => setActiveNav('history')} className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200', activeNav === 'history' ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm shadow-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30')}>
                  <FiClock className="w-4 h-4" />
                  Signal History
                  {history.length > 0 && (
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">{history.length}</Badge>
                  )}
                </button>
              </nav>

              {/* Agent Status */}
              <div className="mt-auto p-3">
                <div className="glass-card rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Agent Status</p>
                  <div className="flex items-center gap-2">
                    <GlowDot color={isGenerating ? 'bg-emerald-400' : 'bg-muted-foreground/30'} />
                    <span className="text-[11px] font-mono text-foreground/70">Signal Orchestrator</span>
                  </div>
                  {isGenerating && <p className="text-[10px] text-primary font-medium mt-1 ml-4">Processing...</p>}
                  <div className="mt-2 pt-2 border-t border-border/20">
                    <p className="text-[9px] text-muted-foreground/50">3 sub-agents: Chart Analysis, Sentiment, Signal Gen</p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              {activeNav === 'dashboard' ? (
                <div className="flex flex-col lg:flex-row h-full">
                  {/* Input Panel */}
                  <div className="w-full lg:w-[38%] border-r border-border/30 overflow-y-auto">
                    <div className="p-5 space-y-5">
                      {/* Instrument badge */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
                          <FiActivity className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">{instrument}</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">Options Signal Generator</span>
                      </div>

                      {/* Chart Upload */}
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                          <FiUpload className="w-3 h-3" /> Upload Chart(s) - 1m to 1hr timeframes
                        </Label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleChartDrop}
                          onClick={() => chartInputRef.current?.click()}
                          className={cn('border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[140px]',
                            isDragOver ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-border/50 hover:border-primary/40 hover:bg-muted/10'
                          )}
                        >
                          <div className={cn('p-3 rounded-xl transition-colors', isDragOver ? 'bg-primary/15' : 'bg-muted/30')}>
                            <FiUpload className={cn('w-7 h-7 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-medium">Drag & drop charts here</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">PNG/JPG, max 5 files, 10MB each</p>
                          </div>
                          <input ref={chartInputRef} type="file" accept="image/png,image/jpeg,image/jpg" multiple onChange={(e) => handleChartFiles(e.target.files)} className="hidden" />
                        </div>
                        {chartFiles.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {chartFiles.map((fp, idx) => (
                              <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/30 hover:border-primary/30 transition-colors">
                                <img src={fp.preview} alt={`Chart ${idx + 1}`} className="w-full h-18 object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={(e) => { e.stopPropagation(); removeChartFile(idx) }} className="p-1.5 bg-red-500/90 rounded-lg hover:bg-red-500 transition-colors">
                                    <FiX className="w-3 h-3 text-white" />
                                  </button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                                  <p className="text-[9px] text-white/90 truncate font-medium">{fp.file.name}</p>
                                  <p className="text-[8px] text-white/50">{formatFileSize(fp.file.size)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">{chartFiles.length}/5 uploaded</p>
                      </div>

                      {/* Option Chain Upload */}
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                          <FiImage className="w-3 h-3" /> Option Chain Screenshot (optional)
                        </Label>
                        {!optionChainFile ? (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={handleOCDrop}
                            onClick={() => ocInputRef.current?.click()}
                            className="border border-dashed border-border/50 rounded-lg p-3 cursor-pointer hover:border-primary/40 hover:bg-muted/10 transition-all flex items-center gap-3"
                          >
                            <div className="p-2 rounded-lg bg-muted/20">
                              <FiImage className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <p className="text-xs text-muted-foreground">Upload option chain screenshot</p>
                            <input ref={ocInputRef} type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => handleOCFile(e.target.files)} className="hidden" />
                          </div>
                        ) : (
                          <div className="relative group rounded-lg overflow-hidden border border-border/30 hover:border-primary/30 transition-colors">
                            <img src={optionChainFile.preview} alt="Option Chain" className="w-full h-20 object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={removeOCFile} className="p-1.5 bg-red-500/90 rounded-lg hover:bg-red-500 transition-colors">
                                <FiX className="w-3 h-3 text-white" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1 flex items-center justify-between">
                              <p className="text-[9px] text-white/90 truncate font-medium">{optionChainFile.file.name}</p>
                              <p className="text-[8px] text-white/50">{formatFileSize(optionChainFile.file.size)}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2 block">Trader Notes (optional)</Label>
                        <Input
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                          placeholder="E.g., Expecting breakout above 24500..."
                          className="text-sm bg-input/50 border-border/40 focus:border-primary/50 rounded-lg"
                          maxLength={200}
                        />
                        <p className="text-[10px] text-muted-foreground/50 mt-1 text-right font-mono">{notes.length}/200</p>
                      </div>

                      {/* Error */}
                      {error && (
                        <div className="p-3 rounded-lg bg-destructive/8 border border-destructive/25 flex items-start gap-2.5 animate-float-in">
                          <FiAlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-destructive font-medium">Error</p>
                            <p className="text-[11px] text-destructive/80 mt-0.5">{error}</p>
                          </div>
                        </div>
                      )}

                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerateSignal}
                        disabled={isGenerating || (chartFiles.length === 0 && !showSample)}
                        className={cn('w-full h-11 rounded-lg font-semibold text-sm transition-all duration-300',
                          isGenerating
                            ? 'bg-primary/80'
                            : chartFiles.length > 0 || showSample
                            ? 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 hover:shadow-primary/30'
                            : ''
                        )}
                      >
                        {isGenerating ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                            Generating Signal...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <FiZap className="w-4 h-4" />
                            Generate Signal
                          </span>
                        )}
                      </Button>

                      {chartFiles.length === 0 && !showSample && (
                        <p className="text-[10px] text-muted-foreground/50 text-center">Upload at least one chart to enable signal generation</p>
                      )}
                    </div>
                  </div>

                  {/* Signal Output */}
                  <div className="flex-1 overflow-y-auto">
                    <ScrollArea className="h-full">
                      <div className="p-5 space-y-4">
                        {isGenerating ? (
                          <LoadingOverlay step={loadingStep} progress={loadingProgress} />
                        ) : hasSignal ? (
                          <>
                            <SignalHeader data={displayData} />

                            {/* Action Bar */}
                            <div className="flex items-center gap-2 animate-float-in">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs gap-1.5 rounded-lg border-border/40 hover:border-primary/30 hover:bg-primary/5">
                                    {copied ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiCopy className="w-3.5 h-3.5" />}
                                    {copied ? 'Copied' : 'Copy Signal'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Copy signal to clipboard</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={handleSaveToHistory} className="text-xs gap-1.5 rounded-lg border-border/40 hover:border-primary/30 hover:bg-primary/5" disabled={savedToHistory}>
                                    {savedToHistory ? <FiCheck className="w-3.5 h-3.5 text-emerald-400" /> : <FiClock className="w-3.5 h-3.5" />}
                                    {savedToHistory ? 'Saved' : 'Save to History'}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Save signal to history</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" onClick={handleNewAnalysis} className="text-xs gap-1.5 rounded-lg border-border/40 hover:border-primary/30 hover:bg-primary/5">
                                    <FiRefreshCw className="w-3.5 h-3.5" />
                                    New Analysis
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Start a new analysis</p></TooltipContent>
                              </Tooltip>
                            </div>

                            <SignalBlock data={displayData} />
                            <TechnicalGrid data={displayData} />
                            <OptionChainSection data={displayData} />
                            <SentimentSection data={displayData} />
                            <RationaleSection data={displayData} />
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center min-h-[500px] text-center space-y-5">
                            <div className="relative">
                              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10 flex items-center justify-center">
                                <FiBarChart2 className="w-9 h-9 text-muted-foreground/40" />
                              </div>
                              <div className="absolute -top-1 -right-1">
                                <GlowDot color="bg-primary/50" />
                              </div>
                            </div>
                            <div className="space-y-2 max-w-sm">
                              <h3 className="text-base font-semibold">No Signal Generated</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                Upload a chart image and click Generate Signal to get a comprehensive options trading signal with technicals, option chain analysis, and market sentiment.
                              </p>
                            </div>
                            <p className="text-[10px] text-muted-foreground/40">
                              Or toggle &quot;Sample Data&quot; in the header to preview
                            </p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                /* History View */
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <FiClock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold">Signal History</h2>
                        <p className="text-[10px] text-muted-foreground">{filteredHistory.length} signal{filteredHistory.length !== 1 ? 's' : ''} recorded</p>
                      </div>
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/20">
                      {(['all', 'CE', 'PE'] as const).map(f => (
                        <button key={f} onClick={() => setHistoryFilter(f)} className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200', historyFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                          {f === 'all' ? 'All' : `BUY ${f}`}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/20">
                      {(['all', 'Nifty 50', 'Bank Nifty'] as const).map(f => (
                        <button key={f} onClick={() => setHistoryInstrumentFilter(f)} className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200', historyInstrumentFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                          {f === 'all' ? 'All' : f}
                        </button>
                      ))}
                    </div>
                    <div className="relative flex-1 min-w-[150px] max-w-xs">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search signals..." className="text-xs pl-8 h-8 bg-input/30 border-border/30 rounded-lg" />
                    </div>
                  </div>

                  {/* History List */}
                  {filteredHistory.length > 0 ? (
                    <div className="space-y-2.5">
                      {filteredHistory.map(item => (
                        <div key={item.id} className="group">
                          <HistoryCard
                            item={item}
                            expanded={expandedHistoryId === item.id}
                            onToggle={() => setExpandedHistoryId(prev => prev === item.id ? null : item.id)}
                            onDelete={() => handleDeleteHistory(item.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-muted/20 border border-border/20 flex items-center justify-center">
                        <FiClock className="w-7 h-7 text-muted-foreground/30" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold">No Signals in History</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {history.length > 0 ? 'No signals match your current filters.' : 'Head to the dashboard to create your first signal.'}
                        </p>
                      </div>
                      {history.length === 0 && (
                        <Button size="sm" variant="outline" onClick={() => setActiveNav('dashboard')} className="text-xs gap-1.5 rounded-lg">
                          <FiBarChart2 className="w-3.5 h-3.5" />
                          Go to Dashboard
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  )
}
