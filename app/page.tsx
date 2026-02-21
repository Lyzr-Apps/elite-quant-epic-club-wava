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
import {
  FiUpload, FiCopy, FiCheck, FiX, FiClock,
  FiTrendingUp, FiTrendingDown, FiActivity, FiBarChart2,
  FiTarget, FiAlertTriangle, FiChevronRight,
  FiChevronDown, FiSearch, FiTrash2, FiRefreshCw, FiImage
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

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function parseConfidence(val?: string): number {
  if (!val) return 0
  const num = parseFloat(val)
  return isNaN(num) ? 0 : Math.min(10, Math.max(0, num))
}

function getConfidenceColor(score: number): string {
  if (score >= 8) return 'text-green-400'
  if (score >= 5) return 'text-amber-400'
  return 'text-red-400'
}

function getConfidenceBg(score: number): string {
  if (score >= 8) return 'bg-green-500'
  if (score >= 5) return 'bg-amber-500'
  return 'bg-red-500'
}

function getVibeColor(vibe?: string): string {
  const v = (vibe ?? '').toLowerCase()
  if (v.includes('bullish')) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (v.includes('bearish')) return 'bg-red-500/20 text-red-400 border-red-500/30'
  return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
}

function getSignalColor(signal?: string): { bg: string; text: string; border: string } {
  const s = (signal ?? '').toUpperCase()
  if (s.includes('CE')) return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/40' }
  if (s.includes('PE')) return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/40' }
  return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/40' }
}

function formatSignalForCopy(data: SignalData): string {
  const lines = [
    `=== ELITE DERIVATIVES QUANT SIGNAL ===`,
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
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ===================== SUB-COMPONENTS =====================

function SignalHeader({ data }: { data: SignalData }) {
  const vibeColor = getVibeColor(data?.market_vibe)
  const [now, setNow] = useState('')

  useEffect(() => {
    setNow(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))
  }, [])

  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs font-mono">{data?.instrument ?? 'N/A'}</Badge>
        <Badge variant="outline" className="text-xs font-mono">{data?.timeframe ?? 'N/A'}</Badge>
        <Badge variant="outline" className="text-xs font-mono">{data?.strategy_type ?? 'N/A'}</Badge>
        <Badge className={cn('text-xs border', vibeColor)}>{data?.market_vibe ?? 'N/A'}</Badge>
      </div>
      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
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

  return (
    <Card className={cn('border-2', signalColors.border, signalColors.bg)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(data?.signal_type ?? '').toUpperCase().includes('CE') ? (
              <FiTrendingUp className="w-6 h-6 text-green-400" />
            ) : (data?.signal_type ?? '').toUpperCase().includes('PE') ? (
              <FiTrendingDown className="w-6 h-6 text-red-400" />
            ) : (
              <FiActivity className="w-6 h-6 text-blue-400" />
            )}
            <span className={cn('text-2xl font-bold tracking-tight', signalColors.text)}>
              {data?.signal_type ?? 'N/A'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Confidence</div>
            <div className={cn('text-xl font-bold', confColor)}>{confidence}/10</div>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className={cn('h-full rounded-full transition-all', confBg)} style={{ width: `${confidence * 10}%` }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <DataCell label="Strike" value={data?.strike_price} highlight />
          <DataCell label="Entry" value={data?.entry_price} />
          <DataCell label="Target 1" value={data?.target_1} accent />
          <DataCell label="Target 2" value={data?.target_2} accent />
          <DataCell label="SL 1" value={data?.stop_loss_1} destructive />
          <DataCell label="SL 2" value={data?.stop_loss_2} destructive />
          <DataCell label="R:R Ratio" value={data?.risk_reward_ratio} highlight />
          <DataCell label="Trend" value={data?.trend_direction} />
        </div>

        {data?.confidence_reasoning && (
          <div className="mt-2 p-2 rounded bg-muted/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Confidence Reasoning</p>
            <p className="text-xs leading-relaxed">{data.confidence_reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DataCell({ label, value, highlight, accent, destructive }: { label: string; value?: string; highlight?: boolean; accent?: boolean; destructive?: boolean }) {
  const valClass = highlight
    ? 'text-primary font-semibold'
    : accent
    ? 'text-green-400 font-semibold'
    : destructive
    ? 'text-red-400 font-semibold'
    : 'text-foreground'

  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn('text-sm font-mono', valClass)}>{value ?? 'N/A'}</p>
    </div>
  )
}

function TechnicalGrid({ data }: { data: SignalData }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FiBarChart2 className="w-4 h-4 text-primary" />
          Technical Confluence
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {data?.technical_confluence && (
          <div className="p-2 rounded bg-primary/10 border border-primary/20">
            <p className="text-xs leading-relaxed">{data.technical_confluence}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <TechItem label="EMA Analysis" value={data?.ema_analysis} />
          <TechItem label="RSI" value={data?.rsi_value} />
          <TechItem label="MACD" value={data?.macd_analysis} />
          <TechItem label="Candlestick Patterns" value={data?.candlestick_patterns} />
          <TechItem label="Volume Analysis" value={data?.volume_analysis} />
        </div>

        <Separator className="bg-border" />

        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Price Levels</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <DataCell label="Current Price" value={data?.current_price} highlight />
            <DataCell label="Day High" value={data?.day_high} />
            <DataCell label="Day Low" value={data?.day_low} />
            <DataCell label="PDH" value={data?.pdh} />
            <DataCell label="PDL" value={data?.pdl} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="p-2 rounded bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Support Levels</p>
            <p className="text-xs font-mono text-green-400">{data?.support_levels ?? 'N/A'}</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Resistance Levels</p>
            <p className="text-xs font-mono text-red-400">{data?.resistance_levels ?? 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TechItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="p-2 rounded bg-muted/50">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-xs leading-relaxed">{value ?? 'N/A'}</p>
    </div>
  )
}

function OptionChainSection({ data }: { data: SignalData }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FiTarget className="w-4 h-4 text-primary" />
          Option Chain Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <DataCell label="Max Pain" value={data?.option_chain_max_pain} highlight />
          <DataCell label="PCR" value={data?.option_chain_pcr} />
          <DataCell label="Highest OI CE" value={data?.option_chain_highest_oi_ce} />
          <DataCell label="Highest OI PE" value={data?.option_chain_highest_oi_pe} />
        </div>
        {data?.option_chain_oi_interpretation && (
          <div className="mt-2 p-2 rounded bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">OI Interpretation</p>
            <p className="text-xs leading-relaxed">{data.option_chain_oi_interpretation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SentimentSection({ data }: { data: SignalData }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <FiActivity className="w-4 h-4 text-primary" />
          Market Sentiment
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <DataCell label="GIFT Nifty" value={data?.gift_nifty_level} />
          <DataCell label="US Futures" value={data?.us_futures} />
          <DataCell label="Crude Oil" value={data?.crude_oil} />
          <DataCell label="FII/DII Data" value={data?.fii_dii_data} />
          <DataCell label="Overall Sentiment" value={data?.overall_sentiment} highlight />
        </div>
        {data?.sentiment_summary && (
          <div className="mt-2 p-2 rounded bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sentiment Summary</p>
            <p className="text-xs leading-relaxed">{data.sentiment_summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RationaleSection({ data }: { data: SignalData }) {
  return (
    <div className="space-y-2">
      {data?.trade_rationale && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <FiChevronRight className="w-4 h-4 text-primary" />
              Trade Rationale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {renderMarkdown(data.trade_rationale)}
          </CardContent>
        </Card>
      )}

      {data?.risk_factors && (
        <Card className="border-red-500/20">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-1.5 text-red-400">
              <FiAlertTriangle className="w-4 h-4" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {renderMarkdown(data.risk_factors)}
          </CardContent>
        </Card>
      )}

      {data?.disclaimer && (
        <div className="p-2 rounded bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Disclaimer</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{data.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

function LoadingOverlay({ step, progress }: { step: number; progress: number }) {
  return (
    <Card className="border-primary/30">
      <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <div className="text-center space-y-2 w-full max-w-xs">
          <p className="text-sm font-medium">{LOADING_STEPS[step] ?? 'Processing...'}</p>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
        <div className="flex flex-col gap-1 w-full max-w-xs">
          {LOADING_STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {i < step ? (
                <FiCheck className="w-3 h-3 text-green-400 flex-shrink-0" />
              ) : i === step ? (
                <div className="w-3 h-3 rounded-full border border-primary border-t-transparent animate-spin flex-shrink-0" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
              )}
              <span className={cn(i <= step ? 'text-foreground' : 'text-muted-foreground/50')}>{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function HistoryCard({ item, expanded, onToggle }: { item: SignalHistoryItem; expanded: boolean; onToggle: () => void }) {
  const signalColors = getSignalColor(item.signal?.signal_type)
  const [ts, setTs] = useState('')

  useEffect(() => {
    setTs(new Date(item.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }))
  }, [item.timestamp])

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs border', signalColors.bg, signalColors.text, signalColors.border)}>
            {item.signal?.signal_type ?? 'N/A'}
          </Badge>
          <span className="text-sm font-mono">{item.instrument}</span>
          <span className="text-xs text-muted-foreground">{item.signal?.strike_price ?? ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{ts}</span>
          {expanded ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <CardContent className="p-3 pt-0 space-y-3 border-t border-border">
          <SignalBlock data={item.signal} />
          <TechnicalGrid data={item.signal} />
          <OptionChainSection data={item.signal} />
          <SentimentSection data={item.signal} />
          <RationaleSection data={item.signal} />
        </CardContent>
      )}
    </Card>
  )
}

function AgentStatusPanel({ activeAgentId, isGenerating }: { activeAgentId: string | null; isGenerating: boolean }) {
  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Agent Status</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', isGenerating ? 'bg-green-400 animate-pulse' : 'bg-muted-foreground/40')} />
          <span className="text-xs font-mono">Signal Orchestrator Manager</span>
          {isGenerating && <span className="text-[10px] text-primary">Active</span>}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Coordinates chart analysis, sentiment, and signal generation</p>
      </CardContent>
    </Card>
  )
}

// ===================== MAIN PAGE =====================

export default function Page() {
  // Navigation
  const [activeNav, setActiveNav] = useState<'dashboard' | 'history'>('dashboard')

  // Instrument
  const [instrument, setInstrument] = useState<'Nifty 50' | 'Bank Nifty'>('Nifty 50')

  // File uploads
  const [chartFiles, setChartFiles] = useState<FilePreview[]>([])
  const [optionChainFile, setOptionChainFile] = useState<FilePreview | null>(null)

  // Notes
  const [notes, setNotes] = useState('')

  // Signal generation
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [signalResult, setSignalResult] = useState<SignalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Copy
  const [copied, setCopied] = useState(false)
  const [savedToHistory, setSavedToHistory] = useState(false)

  // Sample data toggle
  const [showSample, setShowSample] = useState(false)

  // History
  const [history, setHistory] = useState<SignalHistoryItem[]>([])
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'CE' | 'PE'>('all')
  const [historyInstrumentFilter, setHistoryInstrumentFilter] = useState<'all' | 'Nifty 50' | 'Bank Nifty'>('all')
  const [historySearch, setHistorySearch] = useState('')

  // Refs
  const chartInputRef = useRef<HTMLInputElement>(null)
  const ocInputRef = useRef<HTMLInputElement>(null)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('signal_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Progress animation
  useEffect(() => {
    if (isGenerating) {
      const stepTargets = [15, 35, 60, 85, 100]
      const target = stepTargets[loadingStep] ?? 100

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= target - 2) return prev
          return prev + 0.5
        })
      }, 100)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setLoadingProgress(0)
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [isGenerating, loadingStep])

  // Handle chart file selection
  const handleChartFiles = useCallback((files: FileList | null) => {
    if (!files) return
    const validFiles: FilePreview[] = []
    const MAX_FILES = 5
    const MAX_SIZE = 10 * 1024 * 1024

    const currentCount = chartFiles.length
    for (let i = 0; i < files.length && currentCount + validFiles.length < MAX_FILES; i++) {
      const file = files[i]
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) continue
      if (file.size > MAX_SIZE) continue
      validFiles.push({ file, preview: URL.createObjectURL(file) })
    }
    setChartFiles(prev => [...prev, ...validFiles])
    setError(null)
  }, [chartFiles.length])

  // Handle option chain file
  const handleOCFile = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) return
    if (file.size > 10 * 1024 * 1024) return
    setOptionChainFile({ file, preview: URL.createObjectURL(file) })
    setError(null)
  }, [])

  // Remove chart file
  const removeChartFile = useCallback((idx: number) => {
    setChartFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[idx]) URL.revokeObjectURL(newFiles[idx].preview)
      newFiles.splice(idx, 1)
      return newFiles
    })
  }, [])

  // Remove OC file
  const removeOCFile = useCallback(() => {
    if (optionChainFile) URL.revokeObjectURL(optionChainFile.preview)
    setOptionChainFile(null)
  }, [optionChainFile])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleChartDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleChartFiles(e.dataTransfer.files)
  }, [handleChartFiles])

  const handleOCDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    handleOCFile(e.dataTransfer.files)
  }, [handleOCFile])

  // Generate signal
  const handleGenerateSignal = async () => {
    setIsGenerating(true)
    setError(null)
    setSignalResult(null)
    setCopied(false)
    setSavedToHistory(false)
    setLoadingStep(0)
    setLoadingProgress(0)
    setActiveAgentId(MANAGER_AGENT_ID)

    try {
      // Step 1: Upload files
      setLoadingStep(1)
      const allFiles: File[] = chartFiles.map(fp => fp.file)
      if (optionChainFile) allFiles.push(optionChainFile.file)

      const uploadResult = await uploadFiles(allFiles)

      if (!uploadResult.success) {
        setError('Failed to upload charts. Please try again.')
        setIsGenerating(false)
        setActiveAgentId(null)
        return
      }

      // Step 2: Analyzing
      setLoadingStep(2)

      const message = `Analyze the uploaded chart images for ${instrument}. ${optionChainFile ? 'Option chain screenshot is also included.' : ''}${notes ? ` Trader notes: ${notes}` : ''} Generate a comprehensive trading signal.`

      // Step 3: Scanning markets
      setLoadingStep(3)

      const result = await callAIAgent(message, MANAGER_AGENT_ID, {
        assets: uploadResult.asset_ids,
      })

      // Step 4: Generating signal
      setLoadingStep(4)
      setLoadingProgress(90)

      if (result.success) {
        let signalData = result?.response?.result

        // Handle string responses
        if (typeof signalData === 'string') {
          try {
            signalData = JSON.parse(signalData)
          } catch {
            // Try raw_response
            if (result.raw_response) {
              try {
                const raw = JSON.parse(result.raw_response)
                signalData = raw?.result || raw?.response?.result || raw
              } catch {
                // leave as is
              }
            }
          }
        }

        // Also check if empty
        if (!signalData || (typeof signalData === 'object' && Object.keys(signalData).length === 0)) {
          if (result.raw_response) {
            try {
              const raw = JSON.parse(result.raw_response)
              signalData = raw?.result || raw?.response?.result || raw
            } catch {
              // leave as is
            }
          }
        }

        setSignalResult(signalData as SignalData)
        setLoadingProgress(100)
      } else {
        setError(result.error || 'Failed to generate signal. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }

  // Copy signal
  const handleCopy = async () => {
    const data = showSample ? SAMPLE_SIGNAL : signalResult
    if (!data) return
    const text = formatSignalForCopy(data)
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Save to history
  const handleSaveToHistory = () => {
    const data = showSample ? SAMPLE_SIGNAL : signalResult
    if (!data) return
    const item: SignalHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      instrument: data?.instrument || instrument,
      signal: data,
    }
    const updated = [item, ...history]
    setHistory(updated)
    try {
      localStorage.setItem('signal_history', JSON.stringify(updated))
    } catch {
      // storage full
    }
    setSavedToHistory(true)
    setTimeout(() => setSavedToHistory(false), 2000)
  }

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    try {
      localStorage.setItem('signal_history', JSON.stringify(updated))
    } catch {
      // ignore
    }
  }

  // New analysis
  const handleNewAnalysis = () => {
    chartFiles.forEach(fp => URL.revokeObjectURL(fp.preview))
    if (optionChainFile) URL.revokeObjectURL(optionChainFile.preview)
    setChartFiles([])
    setOptionChainFile(null)
    setNotes('')
    setSignalResult(null)
    setError(null)
    setCopied(false)
    setSavedToHistory(false)
    setShowSample(false)
  }

  // The active signal data (sample or real)
  const displayData = showSample ? SAMPLE_SIGNAL : signalResult
  const hasSignal = displayData !== null

  // Filtered history
  const filteredHistory = history.filter(item => {
    if (historyFilter !== 'all') {
      const st = (item.signal?.signal_type ?? '').toUpperCase()
      if (historyFilter === 'CE' && !st.includes('CE')) return false
      if (historyFilter === 'PE' && !st.includes('PE')) return false
    }
    if (historyInstrumentFilter !== 'all' && item.instrument !== historyInstrumentFilter) return false
    if (historySearch) {
      const search = historySearch.toLowerCase()
      const haystack = `${item.instrument} ${item.signal?.signal_type ?? ''} ${item.signal?.strike_price ?? ''}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Fixed Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FiActivity className="w-5 h-5 text-primary" />
                <h1 className="text-base font-bold tracking-tight">Elite Derivatives Quant</h1>
              </div>
              <Separator orientation="vertical" className="h-5 bg-border" />
              <div className="flex items-center gap-1 bg-muted rounded-sm p-0.5">
                <button onClick={() => setInstrument('Nifty 50')} className={cn('px-3 py-1 text-xs font-medium rounded-sm transition-colors', instrument === 'Nifty 50' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  NIFTY 50
                </button>
                <button onClick={() => setInstrument('Bank Nifty')} className={cn('px-3 py-1 text-xs font-medium rounded-sm transition-colors', instrument === 'Bank Nifty' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  BANK NIFTY
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-toggle" checked={showSample} onCheckedChange={setShowSample} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-48 border-r border-border bg-card/50 flex flex-col shrink-0">
            <nav className="p-2 space-y-1">
              <button onClick={() => setActiveNav('dashboard')} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors', activeNav === 'dashboard' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                <FiBarChart2 className="w-4 h-4" />
                Signal Dashboard
              </button>
              <button onClick={() => setActiveNav('history')} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm transition-colors', activeNav === 'history' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50')}>
                <FiClock className="w-4 h-4" />
                Signal History
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">{history.length}</Badge>
                )}
              </button>
            </nav>
            <div className="mt-auto p-2">
              <AgentStatusPanel activeAgentId={activeAgentId} isGenerating={isGenerating} />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            {activeNav === 'dashboard' ? (
              <div className="flex flex-col lg:flex-row h-full">
                {/* Left Column - Input Panel */}
                <div className="w-full lg:w-[40%] border-r border-border p-4 space-y-4 overflow-y-auto">
                  {/* Instrument display */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{instrument}</Badge>
                    <span className="text-xs text-muted-foreground">Options Signal Generator</span>
                  </div>

                  {/* Chart Upload Zone */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Upload Chart(s) - supports 1m to 1hr timeframes
                    </Label>
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleChartDrop}
                      onClick={() => chartInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-sm p-4 cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 min-h-[120px]"
                    >
                      <FiUpload className="w-6 h-6 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground text-center">
                        Drag & drop or click to upload<br />
                        PNG/JPG, max 5 files, 10MB each
                      </p>
                      <input
                        ref={chartInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        multiple
                        onChange={(e) => handleChartFiles(e.target.files)}
                        className="hidden"
                      />
                    </div>
                    {chartFiles.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {chartFiles.map((fp, idx) => (
                          <div key={idx} className="relative group rounded-sm overflow-hidden border border-border">
                            <img src={fp.preview} alt={`Chart ${idx + 1}`} className="w-full h-16 object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={(e) => { e.stopPropagation(); removeChartFile(idx) }} className="p-1 bg-red-500/80 rounded-sm">
                                <FiX className="w-3 h-3 text-white" />
                              </button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                              <p className="text-[9px] text-white truncate">{fp.file.name}</p>
                              <p className="text-[8px] text-white/60">{formatFileSize(fp.file.size)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{chartFiles.length}/5 charts uploaded</p>
                  </div>

                  {/* Option Chain Upload */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Option Chain Screenshot (optional)
                    </Label>
                    {!optionChainFile ? (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleOCDrop}
                        onClick={() => ocInputRef.current?.click()}
                        className="border border-dashed border-border rounded-sm p-3 cursor-pointer hover:border-primary/50 transition-colors flex items-center gap-2"
                      >
                        <FiImage className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Upload option chain screenshot</p>
                        <input
                          ref={ocInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={(e) => handleOCFile(e.target.files)}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="relative group rounded-sm overflow-hidden border border-border">
                        <img src={optionChainFile.preview} alt="Option Chain" className="w-full h-20 object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={removeOCFile} className="p-1 bg-red-500/80 rounded-sm">
                            <FiX className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 flex items-center justify-between">
                          <p className="text-[9px] text-white truncate">{optionChainFile.file.name}</p>
                          <p className="text-[8px] text-white/60">{formatFileSize(optionChainFile.file.size)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Trader Notes (optional)
                    </Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                      placeholder="E.g., Expecting breakout above 24500..."
                      className="text-sm bg-input border-border"
                      maxLength={200}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{notes.length}/200</p>
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="p-2 rounded-sm bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                      <FiAlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">{error}</p>
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateSignal}
                    disabled={isGenerating || (chartFiles.length === 0 && !showSample)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        Generating Signal...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FiActivity className="w-4 h-4" />
                        Generate Signal
                      </span>
                    )}
                  </Button>

                  {chartFiles.length === 0 && !showSample && (
                    <p className="text-[10px] text-muted-foreground text-center">Upload at least one chart to enable signal generation</p>
                  )}
                </div>

                {/* Right Column - Signal Output */}
                <div className="flex-1 overflow-y-auto">
                  <ScrollArea className="h-full">
                    <div className="p-4 space-y-3">
                      {isGenerating ? (
                        <LoadingOverlay step={loadingStep} progress={loadingProgress} />
                      ) : hasSignal ? (
                        <>
                          {/* Signal Header */}
                          <SignalHeader data={displayData} />

                          {/* Action Bar */}
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={handleCopy} className="text-xs gap-1.5">
                              {copied ? <FiCheck className="w-3 h-3 text-green-400" /> : <FiCopy className="w-3 h-3" />}
                              {copied ? 'Copied' : 'Copy Signal'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleSaveToHistory} className="text-xs gap-1.5" disabled={savedToHistory}>
                              {savedToHistory ? <FiCheck className="w-3 h-3 text-green-400" /> : <FiClock className="w-3 h-3" />}
                              {savedToHistory ? 'Saved' : 'Save to History'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleNewAnalysis} className="text-xs gap-1.5">
                              <FiRefreshCw className="w-3 h-3" />
                              New Analysis
                            </Button>
                          </div>

                          {/* Signal Block */}
                          <SignalBlock data={displayData} />

                          {/* Technical Confluence */}
                          <TechnicalGrid data={displayData} />

                          {/* Option Chain */}
                          <OptionChainSection data={displayData} />

                          {/* Sentiment */}
                          <SentimentSection data={displayData} />

                          {/* Trade Rationale & Risk */}
                          <RationaleSection data={displayData} />
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                            <FiBarChart2 className="w-8 h-8 text-muted-foreground/50" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-sm font-medium">No Signal Generated</h3>
                            <p className="text-xs text-muted-foreground max-w-xs">
                              Upload a chart image and click Generate Signal to get a comprehensive options trading signal with technicals, option chain analysis, and market sentiment.
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Or toggle &quot;Sample Data&quot; in the header to preview a sample signal.
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              /* History View */
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Signal History</h2>
                  <span className="text-xs text-muted-foreground">{filteredHistory.length} signal{filteredHistory.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-sm p-0.5">
                    {(['all', 'CE', 'PE'] as const).map(f => (
                      <button key={f} onClick={() => setHistoryFilter(f)} className={cn('px-2 py-1 text-xs rounded-sm transition-colors', historyFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        {f === 'all' ? 'All' : `BUY ${f}`}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 bg-muted rounded-sm p-0.5">
                    {(['all', 'Nifty 50', 'Bank Nifty'] as const).map(f => (
                      <button key={f} onClick={() => setHistoryInstrumentFilter(f)} className={cn('px-2 py-1 text-xs rounded-sm transition-colors', historyInstrumentFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                        {f === 'all' ? 'All' : f}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 min-w-[150px] max-w-xs">
                    <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search signals..."
                      className="text-xs pl-7 h-7 bg-input border-border"
                    />
                  </div>
                </div>

                {/* History List */}
                {filteredHistory.length > 0 ? (
                  <div className="space-y-2">
                    {filteredHistory.map(item => (
                      <div key={item.id} className="relative group">
                        <HistoryCard
                          item={item}
                          expanded={expandedHistoryId === item.id}
                          onToggle={() => setExpandedHistoryId(prev => prev === item.id ? null : item.id)}
                        />
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="absolute top-2 right-10 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-sm bg-destructive/10 hover:bg-destructive/20"
                        >
                          <FiTrash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <FiClock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">No Signals in History</h3>
                      <p className="text-xs text-muted-foreground max-w-xs">
                        {history.length > 0
                          ? 'No signals match your current filters.'
                          : 'Head to the dashboard to create your first signal.'}
                      </p>
                    </div>
                    {history.length === 0 && (
                      <Button size="sm" variant="outline" onClick={() => setActiveNav('dashboard')} className="text-xs gap-1.5">
                        <FiBarChart2 className="w-3 h-3" />
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
    </ErrorBoundary>
  )
}
