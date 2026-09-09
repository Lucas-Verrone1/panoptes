'use client'

import { PageHeader } from './PageHeader'
import { ThemeToggle } from './ThemeToggle'
import { AccessibilitySettings } from './AccessibilityMenu'

export function SettingsClient(){return <><PageHeader title="Configurações" description="Preferências da interface e experiência do Panoptes."/><div className="grid-two"><section className="panel panel-pad settings-card"><div><strong>Tema da interface</strong><p>Alterne entre tema claro e escuro. A preferência é salva neste navegador.</p></div><ThemeToggle compact/></section><section className="panel panel-pad settings-card"><div><strong>Navegação acessível</strong><p>Foco visível, redução de movimento, navegação por teclado e atalhos estão disponíveis em toda a aplicação.</p></div><a href="/manual" className="secondary-button">Ver manual</a></section></div><div style={{marginTop:16}}><AccessibilitySettings/></div></>}
