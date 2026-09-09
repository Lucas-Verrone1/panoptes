import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ProjectProvider } from '@/components/ProjectProvider'
import { AccessibilityProvider } from '@/components/AccessibilityProvider'
import { LibrasBridge } from '@/components/LibrasBridge'

export const metadata: Metadata = {
  title: 'Panoptes',
  description: 'Gestão de conhecimento, documentação e IA para projetos.',
}

const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('panoptes-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;

    var fontSize = localStorage.getItem('panoptes-font-size');
    if (fontSize === 'xxsmall' || fontSize === 'small' || fontSize === 'default' || fontSize === 'medium' || fontSize === 'large' || fontSize === 'xlarge' || fontSize === 'xxlarge') {
      document.documentElement.dataset.fontSize = fontSize;
    } else {
      document.documentElement.dataset.fontSize = 'default';
    }
  } catch(e) {
    document.documentElement.dataset.fontSize = 'default';
  }
})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo principal</a>
        <AuthProvider><ProjectProvider><AccessibilityProvider>{children}<LibrasBridge /></AccessibilityProvider></ProjectProvider></AuthProvider>
      </body>
    </html>
  )
}
