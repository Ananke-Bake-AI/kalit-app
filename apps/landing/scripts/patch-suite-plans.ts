/**
 * One-shot patcher: writes the `suitePlans` translations into each
 * lib/page-strings/<locale>.json so the Flow + Pentest plan cards render
 * in the visitor's locale. Re-runnable — existing keys get overwritten.
 *
 * Run: pnpm tsx scripts/patch-suite-plans.ts
 */
import fs from "node:fs"
import path from "node:path"

interface Plan {
  name: string
  tagline: string
  features: string[]
  buttonText: string
}

interface SuitePlans {
  perMonth: string
  toStart: string
  launchPick: string
  flow: {
    starter: Plan
    launch: Plan
    launchPro: Plan
  }
  pentest: {
    preview: Plan
    prelaunchScan: Plan
    securityPro: Plan
  }
}

const TRANSLATIONS: Record<string, SuitePlans> = {
  fr: {
    perMonth: "par mois",
    toStart: "pour commencer",
    launchPick: "Choix lancement",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Pour tester Flow et publier une première page.",
        features: [
          "Accès à Kalit Flow",
          "75 crédits / mois",
          "Landing pages générées par IA",
          "Aperçus en direct",
          "Support de domaine personnalisé"
        ],
        buttonText: "Commencer avec Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Pour les fondateurs qui préparent un lancement public.",
        features: [
          "Flow + Kalit Studio",
          "350 crédits / mois",
          "Déploiement et redéploiement de pages",
          "Fichiers de projet et exports",
          "Support prioritaire"
        ],
        buttonText: "Construire mon site de lancement"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Pour les équipes qui veulent landing pages + revue de sécurité.",
        features: [
          "Flow + accès Pentest",
          "1 200 crédits / mois",
          "Scan de sécurité pré-lancement",
          "Export de rapport",
          "Onboarding personnalisé"
        ],
        buttonText: "Lancer avec scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Pour examiner le workflow et des rapports d'exemple.",
        features: [
          "Rapport d'exemple de vulnérabilités",
          "Aperçu du workspace",
          "Planification de scope dans Studio",
          "Saisie de cibles autorisées",
          "Mise à niveau quand prêt à scanner"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Scan pré-lancement",
        tagline: "Pour une app, API ou cible staging avant le lancement.",
        features: [
          "Profils de scan rapide ou standard",
          "Flux des phases en direct",
          "Vulnérabilités avec preuves",
          "Export de rapport PDF/HTML",
          "Recommandations de remédiation"
        ],
        buttonText: "Démarrer le scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Pour scans approfondis, retests et équipes de lancement.",
        features: [
          "Profils de scan approfondi et ciblé",
          "Plusieurs workspaces",
          "Retest des vulnérabilités",
          "Sessions de conseil",
          "Support prioritaire"
        ],
        buttonText: "Sécuriser mon lancement"
      }
    }
  },
  es: {
    perMonth: "por mes",
    toStart: "para empezar",
    launchPick: "Elección de lanzamiento",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Para probar Flow y publicar una primera página.",
        features: [
          "Acceso a Kalit Flow",
          "75 créditos / mes",
          "Landing pages generadas por IA",
          "Vistas previas en vivo",
          "Soporte de dominio personalizado"
        ],
        buttonText: "Empezar con Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Para fundadores que preparan un lanzamiento público.",
        features: [
          "Flow + Kalit Studio",
          "350 créditos / mes",
          "Despliegue y redespliegue de páginas",
          "Archivos de proyecto y exportaciones",
          "Soporte prioritario"
        ],
        buttonText: "Construir mi sitio de lanzamiento"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Para equipos que quieren landing pages más revisión de seguridad.",
        features: [
          "Acceso a Flow + Pentest",
          "1.200 créditos / mes",
          "Escaneo de seguridad pre-lanzamiento",
          "Exportación de informe",
          "Onboarding personalizado"
        ],
        buttonText: "Lanzar con escaneo"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Para revisar el flujo de trabajo e informes de muestra.",
        features: [
          "Informe de hallazgos de muestra",
          "Vista previa del workspace",
          "Planificación de scope en Studio",
          "Captura de objetivos autorizados",
          "Actualizar cuando esté listo para escanear"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Escaneo pre-lanzamiento",
        tagline: "Para una app, API u objetivo de staging antes del lanzamiento.",
        features: [
          "Perfiles de escaneo rápido o estándar",
          "Flujo de fases en vivo",
          "Hallazgos con evidencia",
          "Exportación de informe PDF/HTML",
          "Guía de remediación"
        ],
        buttonText: "Iniciar escaneo"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Para escaneos más profundos, retests y equipos de lanzamiento.",
        features: [
          "Perfiles de escaneo profundo y dirigido",
          "Múltiples workspaces",
          "Retests de hallazgos",
          "Sesiones de asesoría",
          "Soporte prioritario"
        ],
        buttonText: "Asegurar mi lanzamiento"
      }
    }
  },
  de: {
    perMonth: "pro Monat",
    toStart: "zum Starten",
    launchPick: "Launch-Wahl",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Zum Testen von Flow und Veröffentlichen einer ersten Seite.",
        features: [
          "Kalit Flow-Zugang",
          "75 Credits / Monat",
          "KI-generierte Landing Pages",
          "Live-Vorschau",
          "Unterstützung für eigene Domains"
        ],
        buttonText: "Mit Flow starten"
      },
      launch: {
        name: "Launch",
        tagline: "Für Founder, die einen öffentlichen Launch vorbereiten.",
        features: [
          "Flow + Kalit Studio",
          "350 Credits / Monat",
          "Seiten deployen und neu deployen",
          "Projektdateien und Exporte",
          "Priority-Support"
        ],
        buttonText: "Meine Launch-Site bauen"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Für Teams, die Launch-Seiten plus Security-Review wollen.",
        features: [
          "Flow + Pentest-Zugang",
          "1.200 Credits / Monat",
          "Pre-Launch-Security-Scan",
          "Bericht-Export",
          "Individuelles Onboarding"
        ],
        buttonText: "Mit Scan launchen"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Zum Sichten des Workflows und Beispielberichten.",
        features: [
          "Beispiel-Findings-Bericht",
          "Workspace-Vorschau",
          "Scope-Planung im Studio",
          "Eingabe autorisierter Ziele",
          "Upgrade, wenn du scannen willst"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Pre-Launch-Scan",
        tagline: "Für eine App, API oder Staging-Ziel vor dem Launch.",
        features: [
          "Quick- oder Standard-Scan-Profile",
          "Live-Phasen-Feed",
          "Findings mit Beweisen",
          "PDF/HTML-Bericht-Export",
          "Behebungshinweise"
        ],
        buttonText: "Scan starten"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Für tiefere Scans, Retests und Launch-Teams.",
        features: [
          "Deep- und Targeted-Scan-Profile",
          "Mehrere Workspaces",
          "Findings-Retests",
          "Advisory-Runs",
          "Priority-Support"
        ],
        buttonText: "Meinen Launch absichern"
      }
    }
  },
  pt: {
    perMonth: "por mês",
    toStart: "para começar",
    launchPick: "Escolha de lançamento",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Para testar o Flow e publicar uma primeira página.",
        features: [
          "Acesso a Kalit Flow",
          "75 créditos / mês",
          "Landing pages geradas por IA",
          "Pré-visualizações em direto",
          "Suporte de domínio personalizado"
        ],
        buttonText: "Começar com Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Para fundadores a preparar um lançamento público.",
        features: [
          "Flow + Kalit Studio",
          "350 créditos / mês",
          "Deploy e redeploy de páginas",
          "Ficheiros de projeto e exports",
          "Suporte prioritário"
        ],
        buttonText: "Construir o meu site de lançamento"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Para equipas que querem landing pages mais revisão de segurança.",
        features: [
          "Acesso a Flow + Pentest",
          "1.200 créditos / mês",
          "Scan de segurança pré-lançamento",
          "Export de relatório",
          "Onboarding personalizado"
        ],
        buttonText: "Lançar com scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Para rever o fluxo de trabalho e relatórios de exemplo.",
        features: [
          "Relatório de exemplo de vulnerabilidades",
          "Pré-visualização do workspace",
          "Planeamento de scope no Studio",
          "Registo de alvos autorizados",
          "Atualizar quando estiver pronto a scan"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Scan pré-lançamento",
        tagline: "Para uma app, API ou alvo de staging antes do lançamento.",
        features: [
          "Perfis de scan rápido ou padrão",
          "Feed de fases em direto",
          "Vulnerabilidades com evidência",
          "Export de relatório PDF/HTML",
          "Orientação de remediação"
        ],
        buttonText: "Iniciar scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Para scans mais profundos, retests e equipas de lançamento.",
        features: [
          "Perfis de scan profundo e direcionado",
          "Múltiplos workspaces",
          "Retests de vulnerabilidades",
          "Sessões de consultoria",
          "Suporte prioritário"
        ],
        buttonText: "Proteger o meu lançamento"
      }
    }
  },
  it: {
    perMonth: "al mese",
    toStart: "per iniziare",
    launchPick: "Scelta di lancio",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Per testare Flow e pubblicare una prima pagina.",
        features: [
          "Accesso a Kalit Flow",
          "75 crediti / mese",
          "Landing page generate da IA",
          "Anteprime live",
          "Supporto dominio personalizzato"
        ],
        buttonText: "Inizia con Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Per founder che preparano un lancio pubblico.",
        features: [
          "Flow + Kalit Studio",
          "350 crediti / mese",
          "Deploy e redeploy delle pagine",
          "File di progetto ed esportazioni",
          "Supporto prioritario"
        ],
        buttonText: "Costruisci il mio sito di lancio"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Per team che vogliono landing page più revisione di sicurezza.",
        features: [
          "Accesso Flow + Pentest",
          "1.200 crediti / mese",
          "Scan di sicurezza pre-lancio",
          "Esportazione report",
          "Onboarding personalizzato"
        ],
        buttonText: "Lancia con scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Per esaminare il workflow e report di esempio.",
        features: [
          "Report di findings di esempio",
          "Anteprima del workspace",
          "Pianificazione dello scope in Studio",
          "Acquisizione di target autorizzati",
          "Aggiornare quando pronto a scansionare"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Scan pre-lancio",
        tagline: "Per una app, API o target di staging prima del lancio.",
        features: [
          "Profili di scan rapido o standard",
          "Feed delle fasi in tempo reale",
          "Findings con evidenze",
          "Esportazione report PDF/HTML",
          "Linee guida di remediation"
        ],
        buttonText: "Avvia scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Per scan più profondi, retest e team di lancio.",
        features: [
          "Profili di scan profondi e mirati",
          "Più workspace",
          "Retest dei findings",
          "Sessioni di advisory",
          "Supporto prioritario"
        ],
        buttonText: "Proteggi il mio lancio"
      }
    }
  },
  nl: {
    perMonth: "per maand",
    toStart: "om te beginnen",
    launchPick: "Launch-keuze",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Om Flow te testen en een eerste pagina live te zetten.",
        features: [
          "Toegang tot Kalit Flow",
          "75 credits / maand",
          "AI-gegenereerde landingspagina's",
          "Live previews",
          "Ondersteuning voor eigen domeinen"
        ],
        buttonText: "Start met Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Voor founders die een publieke launch voorbereiden.",
        features: [
          "Flow + Kalit Studio",
          "350 credits / maand",
          "Pagina's deployen en opnieuw deployen",
          "Projectbestanden en exports",
          "Priority-ondersteuning"
        ],
        buttonText: "Bouw mijn launch-site"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Voor teams die launchpagina's plus security-review willen.",
        features: [
          "Flow + Pentest-toegang",
          "1.200 credits / maand",
          "Pre-launch security-scan",
          "Rapportexport",
          "Aangepaste onboarding"
        ],
        buttonText: "Launch met scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Om de workflow en voorbeeldrapporten te bekijken.",
        features: [
          "Voorbeeldrapport van findings",
          "Workspace-preview",
          "Scope-planning in Studio",
          "Geautoriseerde-doelen intake",
          "Upgraden zodra je klaar bent om te scannen"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Pre-launch scan",
        tagline: "Voor één app, API of staging-doel vóór de launch.",
        features: [
          "Quick- of standaard-scanprofielen",
          "Live fase-feed",
          "Findings met bewijs",
          "PDF/HTML-rapportexport",
          "Remediation-richtlijnen"
        ],
        buttonText: "Start scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Voor diepere scans, retests en launch-teams.",
        features: [
          "Diepe en doelgerichte scanprofielen",
          "Meerdere workspaces",
          "Retests van findings",
          "Advisory-runs",
          "Priority-ondersteuning"
        ],
        buttonText: "Beveilig mijn launch"
      }
    }
  },
  sv: {
    perMonth: "per månad",
    toStart: "för att börja",
    launchPick: "Launch-val",
    flow: {
      starter: {
        name: "Starter",
        tagline: "För att testa Flow och släppa en första sida.",
        features: [
          "Åtkomst till Kalit Flow",
          "75 krediter / månad",
          "AI-genererade landningssidor",
          "Live-förhandsvisningar",
          "Stöd för anpassade domäner"
        ],
        buttonText: "Börja med Flow"
      },
      launch: {
        name: "Launch",
        tagline: "För founders som förbereder en offentlig lansering.",
        features: [
          "Flow + Kalit Studio",
          "350 krediter / månad",
          "Distribuera och omdistribuera sidor",
          "Projektfiler och exporter",
          "Prioriterad support"
        ],
        buttonText: "Bygg min lanseringssida"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "För team som vill ha lanseringssidor plus säkerhetsgranskning.",
        features: [
          "Flow + Pentest-åtkomst",
          "1 200 krediter / månad",
          "Säkerhetsscan före lansering",
          "Rapportexport",
          "Anpassad onboarding"
        ],
        buttonText: "Lansera med scan"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "För att granska arbetsflödet och exempelrapporter.",
        features: [
          "Exempelrapport för fynd",
          "Workspace-förhandsvisning",
          "Scope-planering i Studio",
          "Intag av auktoriserade mål",
          "Uppgradera när du är redo att scanna"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Pre-launch-scan",
        tagline: "För en app, API eller staging-mål före lansering.",
        features: [
          "Snabb- eller standardscan-profiler",
          "Live fas-flöde",
          "Fynd med bevis",
          "PDF/HTML-rapportexport",
          "Åtgärdsvägledning"
        ],
        buttonText: "Starta scan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "För djupare scanningar, omtester och lanseringsteam.",
        features: [
          "Djupa och riktade scan-profiler",
          "Flera workspaces",
          "Omtester av fynd",
          "Advisory-körningar",
          "Prioriterad support"
        ],
        buttonText: "Säkra min lansering"
      }
    }
  },
  pl: {
    perMonth: "miesięcznie",
    toStart: "na start",
    launchPick: "Wybór na launch",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Aby przetestować Flow i wydać pierwszą stronę.",
        features: [
          "Dostęp do Kalit Flow",
          "75 kredytów / miesiąc",
          "Landing page generowane przez AI",
          "Podgląd na żywo",
          "Wsparcie własnych domen"
        ],
        buttonText: "Zacznij z Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Dla founderów przygotowujących publiczny launch.",
        features: [
          "Flow + Kalit Studio",
          "350 kredytów / miesiąc",
          "Deploy i redeploy stron",
          "Pliki projektu i eksporty",
          "Wsparcie priorytetowe"
        ],
        buttonText: "Zbuduj moją stronę launchu"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Dla zespołów chcących stron launchu plus przegląd bezpieczeństwa.",
        features: [
          "Dostęp do Flow + Pentest",
          "1 200 kredytów / miesiąc",
          "Skan bezpieczeństwa przed launchem",
          "Eksport raportu",
          "Niestandardowy onboarding"
        ],
        buttonText: "Wystartuj ze skanem"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Do przeglądu workflow i przykładowych raportów.",
        features: [
          "Przykładowy raport findings",
          "Podgląd workspace",
          "Planowanie zakresu w Studio",
          "Rejestracja autoryzowanych celów",
          "Upgrade gdy gotowy do skanu"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Skan przed launchem",
        tagline: "Dla jednej aplikacji, API lub celu staging przed launchem.",
        features: [
          "Profile szybkiego lub standardowego skanu",
          "Strumień faz na żywo",
          "Findings z dowodami",
          "Eksport raportu PDF/HTML",
          "Wskazówki naprawcze"
        ],
        buttonText: "Rozpocznij skan"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Do głębszych skanów, retestów i zespołów launchowych.",
        features: [
          "Profile głębokiego i celowanego skanu",
          "Wiele workspace'ów",
          "Retesty findings",
          "Sesje doradcze",
          "Wsparcie priorytetowe"
        ],
        buttonText: "Zabezpiecz mój launch"
      }
    }
  },
  tr: {
    perMonth: "aylık",
    toStart: "başlamak için",
    launchPick: "Lansman seçimi",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Flow'u test etmek ve ilk sayfayı yayınlamak için.",
        features: [
          "Kalit Flow erişimi",
          "75 kredi / ay",
          "AI tarafından üretilmiş landing sayfaları",
          "Canlı önizlemeler",
          "Özel alan adı desteği"
        ],
        buttonText: "Flow ile başla"
      },
      launch: {
        name: "Launch",
        tagline: "Halka açık lansman hazırlayan founder'lar için.",
        features: [
          "Flow + Kalit Studio",
          "350 kredi / ay",
          "Sayfaları deploy et ve yeniden deploy et",
          "Proje dosyaları ve dışa aktarımlar",
          "Öncelikli destek"
        ],
        buttonText: "Lansman sitemi inşa et"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Lansman sayfaları artı güvenlik incelemesi isteyen ekipler için.",
        features: [
          "Flow + Pentest erişimi",
          "1.200 kredi / ay",
          "Lansman öncesi güvenlik taraması",
          "Rapor dışa aktarımı",
          "Özel onboarding"
        ],
        buttonText: "Taramayla lanse et"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "İş akışını ve örnek raporları incelemek için.",
        features: [
          "Örnek bulgu raporu",
          "Workspace önizlemesi",
          "Studio'da kapsam planlaması",
          "Yetkili hedef girişi",
          "Tarama hazır olduğunda yükselt"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Lansman öncesi tarama",
        tagline: "Lansmandan önce tek uygulama, API veya staging hedefi için.",
        features: [
          "Hızlı veya standart tarama profilleri",
          "Canlı faz akışı",
          "Kanıtlarla bulgular",
          "PDF/HTML rapor dışa aktarımı",
          "İyileştirme rehberi"
        ],
        buttonText: "Taramayı başlat"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Daha derin taramalar, yeniden testler ve lansman ekipleri için.",
        features: [
          "Derin ve hedeflenmiş tarama profilleri",
          "Birden fazla workspace",
          "Bulgu yeniden testleri",
          "Danışmanlık koşumları",
          "Öncelikli destek"
        ],
        buttonText: "Lansmanımı güvenle"
      }
    }
  },
  ja: {
    perMonth: "月額",
    toStart: "開始",
    launchPick: "ローンチ向き",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Flowを試して、最初のページを公開するための料金。",
        features: [
          "Kalit Flowへのアクセス",
          "75クレジット / 月",
          "AI生成のランディングページ",
          "ライブプレビュー",
          "カスタムドメインサポート"
        ],
        buttonText: "Flowを始める"
      },
      launch: {
        name: "Launch",
        tagline: "公開ローンチを準備するファウンダー向け。",
        features: [
          "Flow + Kalit Studio",
          "350クレジット / 月",
          "ページのデプロイと再デプロイ",
          "プロジェクトファイルとエクスポート",
          "優先サポート"
        ],
        buttonText: "ローンチサイトを構築"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "ローンチページとセキュリティレビューを望むチーム向け。",
        features: [
          "Flow + Pentestアクセス",
          "1,200クレジット / 月",
          "ローンチ前セキュリティスキャン",
          "レポートのエクスポート",
          "カスタムオンボーディング"
        ],
        buttonText: "スキャン付きローンチ"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "ワークフローとサンプルレポートをレビューするため。",
        features: [
          "サンプル発見事項レポート",
          "ワークスペースプレビュー",
          "Studio内でのスコープ計画",
          "認可された対象の登録",
          "スキャン準備ができたらアップグレード"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "ローンチ前スキャン",
        tagline: "ローンチ前の1つのアプリ、API、ステージング対象のため。",
        features: [
          "クイックまたは標準スキャンプロファイル",
          "ライブフェーズフィード",
          "証拠付き発見事項",
          "PDF/HTMLレポートエクスポート",
          "修復ガイダンス"
        ],
        buttonText: "スキャン開始"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "より深いスキャン、再テスト、ローンチチームのため。",
        features: [
          "ディープおよびターゲットスキャンプロファイル",
          "複数のワークスペース",
          "発見事項の再テスト",
          "アドバイザリーラン",
          "優先サポート"
        ],
        buttonText: "ローンチを保護"
      }
    }
  },
  ko: {
    perMonth: "월",
    toStart: "시작",
    launchPick: "런치 추천",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Flow를 테스트하고 첫 페이지를 출시하기 위해.",
        features: [
          "Kalit Flow 접근",
          "월 75 크레딧",
          "AI 생성 랜딩 페이지",
          "실시간 미리보기",
          "사용자 도메인 지원"
        ],
        buttonText: "Flow로 시작"
      },
      launch: {
        name: "Launch",
        tagline: "공개 런치를 준비하는 파운더를 위한.",
        features: [
          "Flow + Kalit Studio",
          "월 350 크레딧",
          "페이지 배포 및 재배포",
          "프로젝트 파일 및 내보내기",
          "우선 지원"
        ],
        buttonText: "런치 사이트 구축"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "런치 페이지와 보안 검토를 원하는 팀을 위한.",
        features: [
          "Flow + Pentest 접근",
          "월 1,200 크레딧",
          "런치 전 보안 스캔",
          "보고서 내보내기",
          "사용자 정의 온보딩"
        ],
        buttonText: "스캔과 함께 런치"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "워크플로우와 샘플 보고서를 검토하기 위해.",
        features: [
          "샘플 발견 사항 보고서",
          "워크스페이스 미리보기",
          "Studio에서 스코프 계획",
          "승인된 대상 입력",
          "스캔 준비 시 업그레이드"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "런치 전 스캔",
        tagline: "런치 전 하나의 앱, API, 스테이징 대상을 위한.",
        features: [
          "빠른 또는 표준 스캔 프로파일",
          "실시간 단계 피드",
          "증거가 있는 발견 사항",
          "PDF/HTML 보고서 내보내기",
          "수정 가이드"
        ],
        buttonText: "스캔 시작"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "더 깊은 스캔, 재테스트, 런치 팀을 위한.",
        features: [
          "딥 및 타겟 스캔 프로파일",
          "여러 워크스페이스",
          "발견 사항 재테스트",
          "자문 실행",
          "우선 지원"
        ],
        buttonText: "런치 보호"
      }
    }
  },
  zh: {
    perMonth: "每月",
    toStart: "开始",
    launchPick: "发布之选",
    flow: {
      starter: {
        name: "Starter",
        tagline: "用于测试 Flow 并发布第一个页面。",
        features: [
          "Kalit Flow 访问",
          "每月 75 积分",
          "AI 生成的着陆页",
          "实时预览",
          "自定义域名支持"
        ],
        buttonText: "用 Flow 开始"
      },
      launch: {
        name: "Launch",
        tagline: "为准备公开发布的创始人。",
        features: [
          "Flow + Kalit Studio",
          "每月 350 积分",
          "部署和重新部署页面",
          "项目文件和导出",
          "优先支持"
        ],
        buttonText: "构建我的发布站点"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "为想要发布页面加安全审查的团队。",
        features: [
          "Flow + Pentest 访问",
          "每月 1,200 积分",
          "发布前安全扫描",
          "报告导出",
          "自定义入门培训"
        ],
        buttonText: "扫描后发布"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "用于查看工作流和示例报告。",
        features: [
          "示例发现报告",
          "工作空间预览",
          "Studio 中的范围规划",
          "授权目标录入",
          "准备好扫描时升级"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "发布前扫描",
        tagline: "用于发布前一个应用、API 或暂存目标。",
        features: [
          "快速或标准扫描配置",
          "实时阶段流",
          "带证据的发现",
          "PDF/HTML 报告导出",
          "修复指导"
        ],
        buttonText: "开始扫描"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "用于更深入的扫描、重新测试和发布团队。",
        features: [
          "深度和针对性扫描配置",
          "多个工作空间",
          "发现的重新测试",
          "咨询运行",
          "优先支持"
        ],
        buttonText: "保护我的发布"
      }
    }
  },
  ru: {
    perMonth: "в месяц",
    toStart: "для начала",
    launchPick: "Выбор лонча",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Для тестирования Flow и публикации первой страницы.",
        features: [
          "Доступ к Kalit Flow",
          "75 кредитов / месяц",
          "Лендинг-страницы, сгенерированные ИИ",
          "Живой предпросмотр",
          "Поддержка пользовательских доменов"
        ],
        buttonText: "Начать с Flow"
      },
      launch: {
        name: "Launch",
        tagline: "Для founders, готовящих публичный лонч.",
        features: [
          "Flow + Kalit Studio",
          "350 кредитов / месяц",
          "Деплой и редеплой страниц",
          "Файлы проекта и экспорты",
          "Приоритетная поддержка"
        ],
        buttonText: "Построить мой лонч-сайт"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "Для команд, которым нужны лонч-страницы плюс security-ревью.",
        features: [
          "Flow + доступ к Pentest",
          "1 200 кредитов / месяц",
          "Pre-launch security-скан",
          "Экспорт отчёта",
          "Индивидуальный onboarding"
        ],
        buttonText: "Запустить со сканом"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "Для обзора workflow и примеров отчётов.",
        features: [
          "Образец отчёта о находках",
          "Предпросмотр workspace",
          "Планирование scope в Studio",
          "Приём авторизованных целей",
          "Обновление, когда готов сканировать"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "Pre-launch-скан",
        tagline: "Для одного приложения, API или staging-цели перед лончем.",
        features: [
          "Quick- или standard-профили скана",
          "Лента фаз в реальном времени",
          "Находки с доказательствами",
          "Экспорт отчёта PDF/HTML",
          "Руководство по remediation"
        ],
        buttonText: "Запустить скан"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "Для глубоких сканов, ретестов и команд лонча.",
        features: [
          "Глубокие и целевые профили скана",
          "Несколько workspace",
          "Ретесты находок",
          "Advisory-сессии",
          "Приоритетная поддержка"
        ],
        buttonText: "Защитить мой лонч"
      }
    }
  },
  ar: {
    perMonth: "شهرياً",
    toStart: "للبدء",
    launchPick: "اختيار الإطلاق",
    flow: {
      starter: {
        name: "Starter",
        tagline: "لاختبار Flow وإطلاق صفحة أولى.",
        features: [
          "وصول إلى Kalit Flow",
          "75 رصيد / شهر",
          "صفحات هبوط مولّدة بالذكاء الاصطناعي",
          "معاينات مباشرة",
          "دعم نطاقات مخصصة"
        ],
        buttonText: "ابدأ مع Flow"
      },
      launch: {
        name: "Launch",
        tagline: "للمؤسسين الذين يحضّرون إطلاقاً علنياً.",
        features: [
          "Flow + Kalit Studio",
          "350 رصيد / شهر",
          "نشر وإعادة نشر الصفحات",
          "ملفات المشروع والتصدير",
          "دعم ذو أولوية"
        ],
        buttonText: "ابنِ موقع إطلاقي"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "للفِرق التي تريد صفحات إطلاق مع مراجعة أمنية.",
        features: [
          "وصول إلى Flow + Pentest",
          "1,200 رصيد / شهر",
          "فحص أمني قبل الإطلاق",
          "تصدير التقرير",
          "تأهيل مخصص"
        ],
        buttonText: "أطلِق مع فحص"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "لمراجعة سير العمل وتقارير العينة.",
        features: [
          "تقرير نتائج عينة",
          "معاينة الـ workspace",
          "تخطيط النطاق في Studio",
          "إدخال الأهداف المصرّح بها",
          "ترقية عند الجاهزية للفحص"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "فحص ما قبل الإطلاق",
        tagline: "لتطبيق أو API أو هدف staging واحد قبل الإطلاق.",
        features: [
          "ملفات فحص سريع أو قياسي",
          "تغذية مراحل مباشرة",
          "نتائج مع أدلة",
          "تصدير تقرير PDF/HTML",
          "إرشادات الإصلاح"
        ],
        buttonText: "ابدأ الفحص"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "لفحوصات أعمق وإعادة اختبارات وفِرق إطلاق.",
        features: [
          "ملفات فحص عميقة وموجَّهة",
          "workspaces متعددة",
          "إعادة اختبار النتائج",
          "جلسات استشارية",
          "دعم ذو أولوية"
        ],
        buttonText: "أمّن إطلاقي"
      }
    }
  },
  hi: {
    perMonth: "प्रति माह",
    toStart: "शुरू करने के लिए",
    launchPick: "लॉन्च की पसंद",
    flow: {
      starter: {
        name: "Starter",
        tagline: "Flow का परीक्षण करने और पहला पेज शिप करने के लिए।",
        features: [
          "Kalit Flow एक्सेस",
          "75 क्रेडिट / महीना",
          "AI-जनरेटेड लैंडिंग पेज",
          "लाइव प्रीव्यू",
          "कस्टम डोमेन सपोर्ट"
        ],
        buttonText: "Flow के साथ शुरू करें"
      },
      launch: {
        name: "Launch",
        tagline: "सार्वजनिक लॉन्च की तैयारी करने वाले फ़ाउंडर्स के लिए।",
        features: [
          "Flow + Kalit Studio",
          "350 क्रेडिट / महीना",
          "पेज डिप्लॉय और रीडिप्लॉय",
          "प्रोजेक्ट फ़ाइलें और एक्सपोर्ट",
          "प्राथमिकता सपोर्ट"
        ],
        buttonText: "मेरी लॉन्च साइट बनाएं"
      },
      launchPro: {
        name: "Launch Pro",
        tagline: "लॉन्च पेज प्लस सुरक्षा समीक्षा चाहने वाली टीमों के लिए।",
        features: [
          "Flow + Pentest एक्सेस",
          "1,200 क्रेडिट / महीना",
          "लॉन्च से पहले सुरक्षा स्कैन",
          "रिपोर्ट एक्सपोर्ट",
          "कस्टम ऑनबोर्डिंग"
        ],
        buttonText: "स्कैन के साथ लॉन्च करें"
      }
    },
    pentest: {
      preview: {
        name: "Preview",
        tagline: "वर्कफ़्लो और नमूना रिपोर्ट की समीक्षा के लिए।",
        features: [
          "नमूना findings रिपोर्ट",
          "वर्कस्पेस प्रीव्यू",
          "Studio में स्कोप प्लानिंग",
          "अधिकृत लक्ष्य इनटेक",
          "स्कैन के लिए तैयार होने पर अपग्रेड"
        ],
        buttonText: "Preview Pentest"
      },
      prelaunchScan: {
        name: "लॉन्च से पहले स्कैन",
        tagline: "लॉन्च से पहले एक ऐप, API या स्टेजिंग लक्ष्य के लिए।",
        features: [
          "त्वरित या मानक स्कैन प्रोफ़ाइल",
          "लाइव चरण फ़ीड",
          "साक्ष्य के साथ findings",
          "PDF/HTML रिपोर्ट एक्सपोर्ट",
          "उपचार मार्गदर्शन"
        ],
        buttonText: "स्कैन शुरू करें"
      },
      securityPro: {
        name: "Security Pro",
        tagline: "गहरे स्कैन, पुनःपरीक्षण और लॉन्च टीमों के लिए।",
        features: [
          "गहरे और लक्षित स्कैन प्रोफ़ाइल",
          "कई वर्कस्पेस",
          "findings के पुनःपरीक्षण",
          "सलाहकार रन",
          "प्राथमिकता सपोर्ट"
        ],
        buttonText: "मेरा लॉन्च सुरक्षित करें"
      }
    }
  }
}

function main() {
  const dir = path.join(__dirname, "..", "lib", "page-strings")
  for (const [code, translation] of Object.entries(TRANSLATIONS)) {
    const file = path.join(dir, `${code}.json`)
    if (!fs.existsSync(file)) {
      console.error(`✗ ${code}.json missing — skipping`)
      continue
    }
    const raw = fs.readFileSync(file, "utf8")
    const data = JSON.parse(raw) as Record<string, unknown>
    data.suitePlans = translation
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8")
    console.log(`✓ ${code}.json — suitePlans added`)
  }
}

main()
