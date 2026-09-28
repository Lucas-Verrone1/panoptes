'use client'

import {
  Accessibility, Activity, Award, Bell, BookOpen, Bot, BrainCircuit, ChartNoAxesCombined, Check, ChevronDown,
  ChevronsLeft, ChevronsRight, CircleHelp, Database, FileSearch, FileText, FolderGit2,
  CheckCircle2, Clock, ExternalLink, Home, Inbox, Keyboard, Languages, Link, LoaderCircle, Menu, MessageSquare, MessagesSquare, Mic, Moon, RefreshCw, Search, Settings2, ShieldCheck, Square,
  Sparkles, Sun, Ticket, Trophy, Type, Upload, UploadCloud, UserRound, Users, X, XCircle, type LucideProps
} from 'lucide-react'

const icons = {
  accessibility: Accessibility, activity: Activity, award: Award, bell: Bell, 'book-open': BookOpen, bot: Bot, 'brain-circuit': BrainCircuit,
  'chart-no-axes-combined': ChartNoAxesCombined, check: Check, 'chevron-down': ChevronDown,
  'chevrons-left': ChevronsLeft, 'chevrons-right': ChevronsRight, 'circle-help': CircleHelp,
  'check-circle-2': CheckCircle2, clock: Clock, database: Database, 'external-link': ExternalLink, 'file-search': FileSearch, 'file-text': FileText, 'folder-git-2': FolderGit2,
  home: Home, keyboard: Keyboard, languages: Languages, link: Link, menu: Menu, 'message-square': MessageSquare,
  'messages-square': MessagesSquare, moon: Moon, search: Search, 'settings-2': Settings2,
  inbox: Inbox, 'loader-circle': LoaderCircle, mic: Mic, 'refresh-cw': RefreshCw, 'shield-check': ShieldCheck, sparkles: Sparkles, square: Square, sun: Sun, ticket: Ticket, zendesk: Ticket, trophy: Trophy, type: Type,
  upload: Upload, 'upload-cloud': UploadCloud, 'user-round': UserRound, users: Users, x: X, 'x-circle': XCircle,
}

export type IconName = keyof typeof icons

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = icons[name]
  return <Component aria-hidden="true" focusable="false" {...props} />
}
