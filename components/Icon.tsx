'use client'

import {
  Accessibility, Activity, Award, Bell, BookOpen, Bot, BrainCircuit, ChartNoAxesCombined, Check, ChevronDown,
  ChevronsLeft, ChevronsRight, CircleHelp, Database, FileSearch, FileText, FolderGit2,
  Home, Keyboard, Languages, Link, Menu, MessageSquare, MessagesSquare, Moon, Search, Settings2, ShieldCheck,
  Sparkles, Sun, Trophy, Type, Upload, UploadCloud, UserRound, Users, X, Ticket, ExternalLink, RefreshCw, Inbox, CheckCircle2, XCircle, Clock, type LucideProps
} from 'lucide-react'


function ZendeskMark({ size = 24, ...props }: LucideProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M3 4h8v8H3z" opacity=".95"/>
      <path d="M13 12h8v8h-8z" opacity=".95"/>
      <path d="M13 4h8l-8 8z" opacity=".72"/>
      <path d="M3 20h8l-8-8z" opacity=".72"/>
    </svg>
  )
}

const icons = {
  accessibility: Accessibility, activity: Activity, award: Award, bell: Bell, 'book-open': BookOpen, bot: Bot, 'brain-circuit': BrainCircuit,
  'chart-no-axes-combined': ChartNoAxesCombined, check: Check, 'chevron-down': ChevronDown,
  'chevrons-left': ChevronsLeft, 'chevrons-right': ChevronsRight, 'circle-help': CircleHelp,
  database: Database, 'file-search': FileSearch, 'file-text': FileText, 'folder-git-2': FolderGit2,
  home: Home, keyboard: Keyboard, languages: Languages, link: Link, menu: Menu, 'message-square': MessageSquare,
  'messages-square': MessagesSquare, moon: Moon, search: Search, 'settings-2': Settings2,
  'shield-check': ShieldCheck, sparkles: Sparkles, sun: Sun, trophy: Trophy, type: Type,
  upload: Upload, 'upload-cloud': UploadCloud, 'user-round': UserRound, users: Users, x: X, ticket: Ticket, 'external-link': ExternalLink, 'refresh-cw': RefreshCw, inbox: Inbox, 'check-circle-2': CheckCircle2, 'x-circle': XCircle, clock: Clock, zendesk: ZendeskMark,
}

export type IconName = keyof typeof icons

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = icons[name]
  return <Component aria-hidden="true" focusable="false" {...props} />
}
