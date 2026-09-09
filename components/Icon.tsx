'use client'

import {
  Accessibility, Activity, Award, Bell, Bot, BrainCircuit, ChartNoAxesCombined, Check, ChevronDown,
  ChevronsLeft, ChevronsRight, CircleHelp, Database, FileSearch, FileText, FolderGit2,
  Home, Keyboard, Languages, Link, Menu, MessageSquare, MessagesSquare, Moon, Search, Settings2, ShieldCheck,
  Sparkles, Sun, Trophy, Type, UploadCloud, UserRound, Users, X, type LucideProps
} from 'lucide-react'

const icons = {
  accessibility: Accessibility, activity: Activity, award: Award, bell: Bell, bot: Bot, 'brain-circuit': BrainCircuit,
  'chart-no-axes-combined': ChartNoAxesCombined, check: Check, 'chevron-down': ChevronDown,
  'chevrons-left': ChevronsLeft, 'chevrons-right': ChevronsRight, 'circle-help': CircleHelp,
  database: Database, 'file-search': FileSearch, 'file-text': FileText, 'folder-git-2': FolderGit2,
  home: Home, keyboard: Keyboard, languages: Languages, link: Link, menu: Menu, 'message-square': MessageSquare,
  'messages-square': MessagesSquare, moon: Moon, search: Search, 'settings-2': Settings2,
  'shield-check': ShieldCheck, sparkles: Sparkles, sun: Sun, trophy: Trophy, type: Type,
  'upload-cloud': UploadCloud, 'user-round': UserRound, users: Users, x: X,
}

export type IconName = keyof typeof icons

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = icons[name]
  return <Component aria-hidden="true" focusable="false" {...props} />
}
