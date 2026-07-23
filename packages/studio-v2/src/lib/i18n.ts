import { createContext, useContext } from 'react';

// i18n autonome du studio v2 : toutes les chaînes visibles, fr/en. La locale
// vient de la route (/[locale]/…) et est fournie via <StringsProvider>.
export interface Strings {
  newProject: string;
  preview: string;
  files: string;
  publish: string;
  republish: string;
  queuedLabel: string;
  publishing: string;
  online: string;
  onlineSite: string;
  refresh: string;
  openTab: string;
  building: string;
  buildingSub: string;
  suggestTitle: string;
  suggestSub: string;
  suggestions: string[];
  previewWaiting: string;
  noFiles: string;
  searchPlaceholder: string;
  ready: string;
  archived: string;
  answerFreely: string;
  thinking: string;
  refinement: string;
  toolDetails: string;
  noArgs: string;
  ctxUsed: string;
  composerPlaceholder: string;
  attach: string;
  attachNoVision: string;
  agentModel: string;
  navProjects: string;
  navChat: string;
  navPreview: string;
  navigation: string;
  you: string;
  collaborator: string;
  menu: { more: string; rename: string; share: string; domain: string; download: string; invite: string; github: string; openTab: string; refresh: string };
  modelUnavailable: string;
  modelOffline: string;
  sharedProject: string;
  previewTips: string[];
  preview2: {
    noSiteTitle: string; noSiteSub: string; describeCta: string; examplesCta: string;
    buildingTitle: string; buildingSub: string; activityLabel: string; comingUp: string;
    modifying: string; updated: string; respondingChat: string; tipLabel: string;
  };
  act: {
    think: string; write: string; edit: string; read: string; bash: string; search: string;
    navigate: string; screenshot: string; resize: string; console: string; assets: string; task: string; tool: string;
  };
  validate: string;
  running: string;
  stop: string;
  send: string;
  noProjects: string;
  cantPublish: string;
  dropHere: string;
  untitled: string;
  errorLabel: string;
  upgrade: string;
  modelLocked: string;
  freeModel: { title: string; body: string };
  recents: string;
  pinned: string;
  pin: string;
  unpin: string;
  downloadZip: string;
  activity: {
    thinking: string; writing: string; write: string; edit: string; read: string;
    bash: string; task: string; browser: string; assets: string; tool: string;
    working: string; starting: string; uploading: string; compacting: string;
  };
  errors: { rate: string; credits: string; timeout: string; cyber: string; overloaded: string; provider: string; auth: string; contextFull: string; oom: string; network: string; refusalGeneric: string; invalidModel: string; infra: string; clone: string; usageLimit: string; usageLimitSoon: string; generic: string; upload: string };
  del: {
    title: string; sessionOnly: string; sessionOnlyHint: string;
    projectToo: string; projectTooHint: string; plainHint: string;
    cancel: string; confirm: string; deleting: string;
  };
  deployBlocked: { title: string; body: string; close: string };
  storage: { label: string; almostFull: string; blockedTitle: string; blockedBody: string; close: string };
  usage: { label: string; low: string };
  fullscreen: string;
  precision: { label: string; hint: string };
  promptQuality: string;
  promptLevels: { low: string; mid: string; high: string };
  domain: {
    manage: string; title: string; sub: string; placeholder: string;
    connect: string; connecting: string; active: string; pending: string;
    dnsHint: string; cloudflareHint: string; verifying: string; visit: string; remove: string; error: string;
  };
  pub: {
    publishing: string; publishingSub: string; okTitle: string; okSub: string; visit: string;
    tooLargeTitle: string; tooLargeSub: string; errTitle: string; errSub: string; retry: string; close: string;
  };
  stats: {
    details: string; unit: string; title: string; credits: string; duration: string;
    realTotal: string; input: string; output: string; cacheRead: string; cacheWrite: string;
    gateway: string; close: string;
  };
  share: {
    button: string; title: string; consent: string; create: string; anyone: string;
    copied: string; copy: string; copiedBtn: string; open: string; stop: string; close: string;
  };
  invite: {
    button: string; title: string; sub: string; roleLabel: string; viewer: string; editor: string;
    viewerHint: string; editorHint: string; emailLabel: string; emailPlaceholder: string;
    create: string; creating: string; linkReady: string; copy: string; copied: string;
    activeTitle: string; noInvites: string; revoke: string; anyoneCan: string; boundTo: string; close: string;
  };
  github: {
    title: string; sub: string; loading: string; connectedHint: string; disconnect: string;
    needApp: string; notConfigured: string; installApp: string; account: string; searchRepo: string;
    loadingRepos: string; noRepos: string; privateBadge: string; manageRepos: string; connectFailed: string;
    importCta: string; willImport: string; remove: string;
  };
  theme: { toggle: string; light: string; dark: string };
}

const fr: Strings = {
  newProject: 'Nouveau projet',
  preview: 'Aperçu',
  files: 'Fichiers',
  publish: 'Publier',
  republish: 'Republier',
  queuedLabel: '{n} en file — partira après le tour en cours',
  publishing: 'Publication…',
  online: 'en ligne',
  onlineSite: 'Site en ligne',
  refresh: 'Rafraîchir',
  openTab: 'Ouvrir dans un onglet',
  building: 'Construction en cours',
  buildingSub: "L'agent écrit les premiers fichiers — l'aperçu s'affichera tout seul.",
  suggestTitle: 'Que veux-tu construire ?',
  suggestSub: 'Décris ton idée dans le chat, ou pars d’un exemple :',
  suggestions: [
    'Une landing page pour mon restaurant italien',
    'Un portfolio minimaliste pour photographe',
    'Un dashboard SaaS avec authentification',
    'Une page de vente pour une app mobile',
    'Un site vitrine pour un cabinet d’avocats',
    'Audite la sécurité de mon site web',
  ],
  previewWaiting: 'Préparation de l’aperçu…',
  noFiles: 'Aucun fichier pour l’instant.',
  searchPlaceholder: 'Rechercher…',
  ready: 'prêt',
  archived: 'archivé',
  answerFreely: 'ou réponds librement ci-dessous',
  thinking: 'réflexion',
  refinement: 'Prompt affiné par le système — voir ce qui a été ajouté',
  toolDetails: 'Voir les détails du tool call',
  noArgs: '(aucun argument)',
  ctxUsed: 'Contexte utilisé',
  composerPlaceholder: 'Décris ce que tu veux construire…',
  attach: 'Joindre un fichier',
  attachNoVision: "Ce modèle ne lit pas les images. Choisis un modèle avec vision pour joindre une image.",
  agentModel: "Modèle de l'agent",
  navProjects: 'Projets',
  navChat: 'Chat',
  navPreview: 'Aperçu',
  navigation: 'Navigation',
  you: 'Vous',
  collaborator: 'Collaborateur',
  menu: { more: 'Options', rename: 'Renommer', share: 'Partager', domain: 'Gérer le domaine…', download: 'Télécharger le .zip', invite: 'Inviter des collaborateurs…', github: 'Connecter GitHub…', openTab: 'Ouvrir dans un onglet', refresh: 'Rafraîchir l’aperçu' },
  modelUnavailable: 'Modèle indisponible pour le moment',
  modelOffline: 'indispo',
  sharedProject: 'Projet partagé avec toi',
  previewTips: [
    "Colle l'URL d'un site que tu aimes : l'agent peut s'en inspirer pour le style.",
    'Sois précis sur le style et l\'audience — « épuré, pour du B2B tech » bat « joli site ».',
    'Glisse-dépose tes images dans le chat, elles sont intégrées automatiquement.',
    'Dis « ajoute une section FAQ » (ou tarifs, contact…) pour itérer sans tout redécrire.',
    'Après publication, connecte ton propre nom de domaine en quelques minutes.',
    'Une couleur ou une mise en page ne te plaît pas ? Dis-le simplement, pas besoin de recommencer.',
    'Invite un collaborateur en lecture ou en édition pour bosser à plusieurs sur le projet.',
    'Tu peux continuer à écrire pendant que l\'agent travaille — ton message partira juste après.',
  ],
  preview2: {
    noSiteTitle: 'Pas encore de site pour ce projet',
    noSiteSub: 'L\'agent t\'a répondu dans le chat. Quand tu es prêt·e, décris le site à construire et il apparaîtra ici en direct.',
    describeCta: 'Décrire mon site',
    examplesCta: 'Voir des exemples',
    buildingTitle: 'Génération en cours',
    buildingSub: 'L\'aperçu apparaîtra tout seul dès que le site est servable.',
    activityLabel: 'Activité de l\'agent',
    comingUp: '{n} à venir',
    modifying: 'L\'agent modifie ton site',
    updated: 'Aperçu à jour',
    respondingChat: 'L\'agent te répond dans le chat',
    tipLabel: 'Astuce',
  },
  act: {
    think: 'Réfléchit…', write: 'Écrit', edit: 'Modifie', read: 'Lit', bash: 'Lance', search: 'Cherche',
    navigate: 'Regarde', screenshot: 'Capture l\'aperçu', resize: 'Teste en', console: 'Vérifie la console',
    assets: 'Cherche des images', task: 'Délègue à', tool: 'Outil',
  },
  validate: 'Valider',
  running: 'en cours',
  stop: 'Stop',
  send: 'Envoyer',
  noProjects: 'Aucun projet',
  cantPublish: 'Termine ton projet avant de le publier',
  dropHere: 'Déposez vos fichiers ici',
  untitled: 'Sans titre',
  errorLabel: 'Erreur',
  upgrade: 'Passer à une offre supérieure',
  modelLocked: 'Débloquez ce modèle avec une offre supérieure',
  freeModel: {
    title: 'Généré avec le modèle gratuit',
    body: '{model} est le modèle gratuit de Kalit. Les offres payantes débloquent des modèles bien plus capables, pour un design et un code nettement meilleurs.',
  },
  recents: 'Récents',
  pinned: 'Épinglés',
  pin: 'Épingler',
  unpin: 'Désépingler',
  downloadZip: 'Télécharger le ZIP',
  activity: {
    thinking: 'réfléchit', writing: 'rédige la réponse', write: 'écrit un fichier',
    edit: 'modifie un fichier', read: 'lit un fichier', bash: 'exécute une commande',
    task: 'délègue à un sous-agent', browser: 'pilote le navigateur', assets: 'cherche des assets',
    tool: 'outil', working: 'travaille', starting: 'démarre', uploading: 'téléverse les fichiers',
    compacting: 'résume la conversation…',
  },
  errors: {
    rate: 'Le service est momentanément saturé (limite de débit). Réessaie dans quelques instants.',
    credits: 'Crédits insuffisants pour lancer ce projet.',
    timeout: 'Le service met trop de temps à répondre. Réessaie.',
    cyber: '{model} a bloqué ce projet : son garde-fou de sécurité le considère comme un sujet cybersécurité. Essaie un autre modèle (via le sélecteur) ou un projet différent.',
    overloaded: 'Le service Claude est temporairement surchargé. Réessaie dans un instant.',
    provider: 'Le fournisseur du modèle sélectionné est momentanément indisponible. Réessaie ou choisis un autre modèle.',
    auth: "Problème d'authentification côté service — ce n'est pas ta faute. On corrige ; réessaie dans quelques minutes ou contacte le support.",
    contextFull: 'Le projet est devenu trop volumineux pour ce modèle. Démarre un nouveau projet ou choisis un modèle à plus grande fenêtre de contexte.',
    oom: 'La génération a dépassé la mémoire disponible. Simplifie la demande ou découpe-la en étapes.',
    network: 'Problème réseau temporaire pendant la génération. Réessaie.',
    refusalGeneric: '{model} a refusé cette demande (garde-fou de sécurité). Reformule ou essaie un autre modèle.',
    invalidModel: "Ce modèle ne supporte pas cette opération (ex. images). Choisis un autre modèle.",
    infra: "Erreur d'infrastructure au lancement de la génération. Réessaie ; si ça persiste, contacte le support.",
    clone: 'Impossible de cloner le dépôt (accès refusé ou dépôt introuvable). Vérifie la connexion GitHub.',
    usageLimit: "Limite d'usage Claude atteinte sur l'abonnement partagé ({reset}). Réessayer maintenant ne changera rien — choisis un autre modèle (ex. DeepSeek ou Kimi) ou attends le reset.",
    usageLimitSoon: 'reset bientôt',
    generic: 'Une erreur est survenue pendant la génération. Réessaie.',
    upload: "L'upload des fichiers a échoué (réseau ou fichier trop lourd). Réessaie.",
  },
  del: {
    title: 'Supprimer cette session ?',
    sessionOnly: 'Supprimer la session seule',
    sessionOnlyHint: 'Garde le projet lié (fichiers, archive, site en ligne).',
    projectToo: 'Supprimer le projet + la session',
    projectTooHint: "Supprime le projet, son archive et le site publié s'il existe. Irréversible.",
    plainHint: 'Supprime la conversation et ses messages.',
    cancel: 'Annuler',
    confirm: 'Supprimer',
    deleting: 'Suppression…',
  },
  deployBlocked: {
    title: 'Publication indisponible pour ce projet',
    body: "Pour le moment, seuls les projets front-end (site statique ou application web) peuvent être publiés. Ce projet ressemble à un backend — le déploiement des backends arrivera plus tard.",
    close: 'Compris',
  },
  storage: {
    label: 'Stockage',
    almostFull: 'Stockage bientôt plein',
    blockedTitle: 'Limite de stockage atteinte',
    blockedBody: "Tu as atteint la limite de stockage de ton offre. Supprime un projet pour libérer de l'espace, ou passe à une offre supérieure pour créer de nouveaux projets. Tes projets existants restent modifiables.",
    close: 'Compris',
  },
  usage: { label: 'Crédits', low: 'Crédits bientôt épuisés' },
  fullscreen: 'Plein écran',
  precision: { label: 'Precision', hint: 'Mode Precision (Pro) — vérification visuelle de chaque composant pour un rendu quasi sans bug. Plus lent et plus coûteux.' },
  promptQuality: 'Indicateur de richesse du prompt (clic pour activer/désactiver)',
  promptLevels: { low: 'prompt succinct — ajoute du détail pour un meilleur rendu', mid: 'prompt correct — plus de direction = mieux', high: 'prompt riche — rendu optimal' },
  domain: {
    manage: 'Domaine',
    title: 'Domaine personnalisé',
    sub: 'Relie ton propre nom de domaine à ce site publié.',
    placeholder: 'exemple.com',
    connect: 'Connecter',
    connecting: 'Connexion…',
    active: 'Actif',
    pending: 'En attente',
    dnsHint: 'Ajoute ces enregistrements chez ton registrar. La vérification peut prendre quelques minutes.',
    cloudflareHint: 'Domaine derrière Cloudflare ? Passe l’enregistrement en « DNS only » (nuage gris), ou mets SSL/TLS sur « Full » — sinon tu auras une boucle de redirection (ERR_TOO_MANY_REDIRECTS).',
    verifying: 'Vérification du DNS en cours…',
    visit: 'Visiter',
    remove: 'Retirer',
    error: "Impossible de connecter ce domaine.",
  },
  pub: {
    publishing: 'Publication…',
    publishingSub: 'Déploiement de ton site, quelques secondes…',
    okTitle: 'Site publié',
    okSub: 'Ton site est en ligne. Tu peux maintenant lier un domaine personnalisé depuis le bouton « Domaine ».',
    visit: 'Voir le site',
    tooLargeTitle: 'Site trop volumineux',
    tooLargeSub: 'Le déploiement fait {size} Mo (limite {limit} Mo). Réduis le poids des images pour pouvoir publier.',
    errTitle: 'Échec de la publication',
    errSub: "La publication a échoué. Réessaie dans un instant.",
    retry: 'Réessayer',
    close: 'Fermer',
  },
  stats: {
    details: 'Détails de la consommation',
    unit: 'token kalit',
    title: 'Consommation du tour',
    credits: 'Token Kalit',
    duration: 'Durée du run',
    realTotal: 'Tokens réels (total)',
    input: '· entrée',
    output: '· sortie',
    cacheRead: '· cache (lecture)',
    cacheWrite: '· cache (écriture)',
    gateway: 'Détail par type non remonté par ce modèle.',
    close: 'Fermer',
  },
  share: {
    button: 'Partager',
    title: 'Partager cette conversation',
    consent: "Tout le contenu de cette conversation jusqu'à maintenant deviendra visible par quiconque a le lien. Les tours suivants resteront privés.",
    create: 'Créer un lien public',
    anyone: 'Toute personne disposant de ce lien peut voir cette conversation.',
    copied: 'Lien public copié dans le presse-papiers.',
    copy: 'Copier',
    copiedBtn: 'Copié',
    open: 'Ouvrir',
    stop: 'Arrêter le partage',
    close: 'Fermer',
  },
  invite: {
    button: 'Inviter',
    title: 'Travailler à plusieurs',
    sub: 'Invite quelqu’un à collaborer sur ce projet. Il pourra l’ouvrir depuis son propre compte.',
    roleLabel: 'Rôle',
    viewer: 'Lecture',
    editor: 'Édition',
    viewerHint: 'Peut voir le projet et son aperçu.',
    editorHint: 'Peut voir et modifier le projet.',
    emailLabel: 'E-mail (optionnel)',
    emailPlaceholder: 'lié à cette adresse, ou vide pour un lien ouvert',
    create: 'Créer le lien',
    creating: 'Création…',
    linkReady: 'Lien d’invitation prêt — envoie-le à ton collaborateur :',
    copy: 'Copier',
    copied: 'Copié',
    activeTitle: 'Invitations actives',
    noInvites: 'Aucune invitation active.',
    revoke: 'Révoquer',
    anyoneCan: 'Toute personne avec le lien',
    boundTo: 'Réservé à',
    close: 'Fermer',
  },
  github: {
    title: 'Connecter un dépôt GitHub',
    sub: 'Lie un dépôt à ce projet : l’agent pourra livrer ton code via une pull request. Kalit gère l’authentification, tu ne fournis aucun token.',
    loading: 'Chargement…',
    connectedHint: 'L’agent livrera sur la branche {branch} via une pull request.',
    disconnect: 'Déconnecter',
    needApp: 'Installe l’app GitHub Kalit sur le dépôt de ton choix pour le connecter.',
    notConfigured: 'L’intégration GitHub n’est pas configurée sur ce serveur.',
    installApp: 'Installer l’app GitHub',
    account: 'Compte',
    searchRepo: 'Rechercher un dépôt…',
    loadingRepos: 'Chargement des dépôts…',
    noRepos: 'Aucun dépôt accessible. Ajoute-en via « Gérer les dépôts ».',
    privateBadge: 'privé',
    manageRepos: 'Gérer les dépôts…',
    connectFailed: 'La connexion a échoué. Réessaie.',
    importCta: 'Importer un dépôt GitHub',
    willImport: 'sera importé et cloné à ton premier message',
    remove: 'Retirer',
  },
  theme: { toggle: 'Changer de thème', light: 'Thème clair', dark: 'Thème sombre' },
};

const en: Strings = {
  newProject: 'New project',
  preview: 'Preview',
  files: 'Files',
  publish: 'Publish',
  republish: 'Republish',
  queuedLabel: '{n} queued — will send after the current turn',
  publishing: 'Publishing…',
  online: 'live',
  onlineSite: 'Live site',
  refresh: 'Refresh',
  openTab: 'Open in a new tab',
  building: 'Building',
  buildingSub: 'The agent is writing the first files — the preview will appear on its own.',
  suggestTitle: 'What do you want to build?',
  suggestSub: 'Describe your idea in the chat, or start from an example:',
  suggestions: [
    'A landing page for my Italian restaurant',
    'A minimalist portfolio for a photographer',
    'A SaaS dashboard with authentication',
    'A sales page for a mobile app',
    'A one-page site for a law firm',
    'Run a security audit on my website',
  ],
  previewWaiting: 'Preparing the preview…',
  noFiles: 'No files yet.',
  searchPlaceholder: 'Search…',
  ready: 'ready',
  archived: 'archived',
  answerFreely: 'or reply freely below',
  thinking: 'thinking',
  refinement: 'Prompt refined by the system — see what was added',
  toolDetails: 'View tool call details',
  noArgs: '(no arguments)',
  ctxUsed: 'Context used',
  composerPlaceholder: 'Describe what you want to build…',
  attach: 'Attach a file',
  attachNoVision: "This model can't read images. Pick a vision model to attach one.",
  agentModel: 'Agent model',
  navProjects: 'Projects',
  navChat: 'Chat',
  navPreview: 'Preview',
  navigation: 'Navigation',
  you: 'You',
  collaborator: 'Collaborator',
  menu: { more: 'Options', rename: 'Rename', share: 'Share', domain: 'Manage domain…', download: 'Download .zip', invite: 'Invite collaborators…', github: 'Connect GitHub…', openTab: 'Open in new tab', refresh: 'Refresh preview' },
  modelUnavailable: 'Model currently unavailable',
  modelOffline: 'offline',
  sharedProject: 'Shared with you',
  previewTips: [
    "Paste the URL of a site you like — the agent can draw inspiration from its style.",
    'Be specific about style and audience — "clean, for a B2B tech audience" beats "make it nice".',
    'Drag and drop your images into the chat — they get placed automatically.',
    'Say "add an FAQ section" (or pricing, contact…) to iterate without rewriting everything.',
    'Once published, connect your own domain name in just a few minutes.',
    'Not sold on a color or layout? Just say so — no need to start over.',
    'Invite a collaborator as viewer or editor to work on the project together.',
    'You can keep typing while the agent works — your message sends right after.',
  ],
  preview2: {
    noSiteTitle: 'Nothing to preview for this project yet',
    noSiteSub: 'The agent replied in the chat. When you\'re ready, describe the site to build and it\'ll appear here live.',
    describeCta: 'Describe my site',
    examplesCta: 'See examples',
    buildingTitle: 'Generating',
    buildingSub: 'Your preview will appear on its own as soon as the site is servable.',
    activityLabel: 'Agent activity',
    comingUp: '{n} coming up',
    modifying: 'The agent is editing your site',
    updated: 'Preview updated',
    respondingChat: 'The agent is replying in the chat',
    tipLabel: 'Tip',
  },
  act: {
    think: 'Thinking…', write: 'Writes', edit: 'Edits', read: 'Reads', bash: 'Runs', search: 'Searches',
    navigate: 'Looks at', screenshot: 'Captures the preview', resize: 'Tests at', console: 'Checks the console',
    assets: 'Searches images', task: 'Delegates to', tool: 'Tool',
  },
  validate: 'Confirm',
  running: 'running',
  stop: 'Stop',
  send: 'Send',
  noProjects: 'No projects yet',
  cantPublish: 'Finish your project before publishing',
  dropHere: 'Drop your files here',
  untitled: 'Untitled',
  errorLabel: 'Error',
  upgrade: 'Upgrade your plan',
  modelLocked: 'Unlock this model with a higher plan',
  freeModel: {
    title: 'Built with the free model',
    body: '{model} is the free model. Paid plans unlock far more capable models, with much better design and code.',
  },
  recents: 'Recents',
  pinned: 'Pinned',
  pin: 'Pin',
  unpin: 'Unpin',
  downloadZip: 'Download ZIP',
  activity: {
    thinking: 'thinking', writing: 'writing the response', write: 'writing a file',
    edit: 'editing a file', read: 'reading a file', bash: 'running a command',
    task: 'delegating to a subagent', browser: 'driving the browser', assets: 'searching assets',
    tool: 'tool', working: 'working', starting: 'starting', uploading: 'uploading files',
    compacting: 'compacting conversation…',
  },
  errors: {
    rate: 'The service is momentarily saturated (rate limit). Try again in a moment.',
    credits: 'Not enough credits to start this project.',
    timeout: 'The service is taking too long to respond. Try again.',
    cyber: '{model} blocked this project: its safety guardrail flags it as a cybersecurity topic. Try a different model (via the selector) or another project.',
    overloaded: 'Claude is temporarily overloaded. Try again in a moment.',
    provider: "The selected model's provider is momentarily unavailable. Retry or pick another model.",
    auth: "Service-side authentication problem — not on your end. We're on it; retry shortly or contact support.",
    contextFull: 'This project has grown too large for this model. Start a new project or pick a larger-context model.',
    oom: 'The build ran out of memory. Simplify the request or split it into steps.',
    network: 'Temporary network problem during generation. Try again.',
    refusalGeneric: '{model} declined this request (safety guardrail). Rephrase or try another model.',
    invalidModel: "This model doesn't support this operation (e.g. images). Pick another model.",
    infra: 'Infrastructure error starting the build. Retry; if it persists, contact support.',
    clone: "Couldn't clone the repository (access denied or not found). Check the GitHub connection.",
    usageLimit: "Claude usage limit reached on the shared subscription ({reset}). Retrying now won't help — pick another model (e.g. DeepSeek or Kimi) or wait for the reset.",
    usageLimitSoon: 'resets soon',
    generic: 'An error occurred during generation. Try again.',
    upload: 'File upload failed (network or file too large). Try again.',
  },
  del: {
    title: 'Delete this session?',
    sessionOnly: 'Delete session only',
    sessionOnlyHint: 'Keeps the linked project (files, archive, live site).',
    projectToo: 'Delete project + session',
    projectTooHint: 'Removes the project, its archive and the live site if any. Irreversible.',
    plainHint: 'Removes the chat and its messages.',
    cancel: 'Cancel',
    confirm: 'Delete',
    deleting: 'Deleting…',
  },
  deployBlocked: {
    title: 'This project can’t be published yet',
    body: 'For now, only front-end projects (a static site or web app) can be published. This one looks like a backend — backend hosting is coming later.',
    close: 'Got it',
  },
  storage: {
    label: 'Storage',
    almostFull: 'Storage almost full',
    blockedTitle: 'Storage limit reached',
    blockedBody: "You've reached your plan's storage limit. Delete a project to free up space, or upgrade your plan to start new ones. Your existing projects stay editable.",
    close: 'Got it',
  },
  usage: { label: 'Credits', low: 'Credits almost used up' },
  fullscreen: 'Fullscreen',
  precision: { label: 'Precision', hint: 'Precision mode (Pro) — visually verifies every component for a near-zero-bug render. Slower and more expensive.' },
  promptQuality: 'Prompt richness indicator (click to toggle)',
  promptLevels: { low: 'thin prompt — add detail for a better result', mid: 'decent prompt — more direction helps', high: 'rich prompt — best result' },
  domain: {
    manage: 'Domain',
    title: 'Custom domain',
    sub: 'Link your own domain name to this published site.',
    placeholder: 'example.com',
    connect: 'Connect',
    connecting: 'Connecting…',
    active: 'Active',
    pending: 'Pending',
    dnsHint: 'Add these records at your registrar. Verification can take a few minutes.',
    cloudflareHint: 'Domain behind Cloudflare? Set the record to “DNS only” (grey cloud), or switch SSL/TLS to “Full” — otherwise you’ll get a redirect loop (ERR_TOO_MANY_REDIRECTS).',
    verifying: 'Verifying DNS…',
    visit: 'Visit',
    remove: 'Remove',
    error: "Couldn't connect that domain.",
  },
  pub: {
    publishing: 'Publishing…',
    publishingSub: 'Deploying your site, this takes a few seconds…',
    okTitle: 'Site published',
    okSub: 'Your site is live. You can now link a custom domain from the “Domain” button.',
    visit: 'View site',
    tooLargeTitle: 'Site too large',
    tooLargeSub: 'The deploy is {size} MB (limit {limit} MB). Reduce your image weight to publish.',
    errTitle: 'Publish failed',
    errSub: 'Publishing failed. Please try again in a moment.',
    retry: 'Retry',
    close: 'Close',
  },
  stats: {
    details: 'Consumption details',
    unit: 'kalit tokens',
    title: 'Turn usage',
    credits: 'Kalit Tokens',
    duration: 'Run duration',
    realTotal: 'Real tokens (total)',
    input: '· input',
    output: '· output',
    cacheRead: '· cache (read)',
    cacheWrite: '· cache (write)',
    gateway: 'Per-type breakdown not reported by this model.',
    close: 'Close',
  },
  share: {
    button: 'Share',
    title: 'Share this conversation',
    consent: 'Everything in this conversation up to now will be visible to anyone with the link. Later turns stay private.',
    create: 'Create public link',
    anyone: 'Anyone with this link can see this conversation.',
    copied: 'Public link copied to your clipboard.',
    copy: 'Copy',
    copiedBtn: 'Copied',
    open: 'Open',
    stop: 'Stop sharing',
    close: 'Close',
  },
  invite: {
    button: 'Invite',
    title: 'Work together',
    sub: 'Invite someone to collaborate on this project. They’ll be able to open it from their own account.',
    roleLabel: 'Role',
    viewer: 'Viewer',
    editor: 'Editor',
    viewerHint: 'Can view the project and its preview.',
    editorHint: 'Can view and edit the project.',
    emailLabel: 'Email (optional)',
    emailPlaceholder: 'bind to this address, or leave empty for an open link',
    create: 'Create link',
    creating: 'Creating…',
    linkReady: 'Invite link ready — send it to your collaborator:',
    copy: 'Copy',
    copied: 'Copied',
    activeTitle: 'Active invitations',
    noInvites: 'No active invitations.',
    revoke: 'Revoke',
    anyoneCan: 'Anyone with the link',
    boundTo: 'Bound to',
    close: 'Close',
  },
  github: {
    title: 'Connect a GitHub repository',
    sub: 'Link a repo to this project so the agent can deliver your code as a pull request. Kalit handles authentication — you never provide a token.',
    loading: 'Loading…',
    connectedHint: 'The agent will deliver to the {branch} branch as a pull request.',
    disconnect: 'Disconnect',
    needApp: 'Install the Kalit GitHub app on the repository you want, then connect it.',
    notConfigured: 'GitHub integration is not configured on this server.',
    installApp: 'Install GitHub app',
    account: 'Account',
    searchRepo: 'Search a repository…',
    loadingRepos: 'Loading repositories…',
    noRepos: 'No accessible repositories. Add some via “Manage repositories”.',
    privateBadge: 'private',
    manageRepos: 'Manage repositories…',
    connectFailed: 'Connection failed. Please try again.',
    importCta: 'Import a GitHub repository',
    willImport: 'will be imported and cloned on your first message',
    remove: 'Remove',
  },
  theme: { toggle: 'Toggle theme', light: 'Light theme', dark: 'Dark theme' },
};

const TABLE: Record<string, Strings> = { fr, en };

/** Renvoie les chaînes pour une locale (fallback anglais). */
export function stringsFor(lang?: string): Strings {
  const code = (lang || 'en').slice(0, 2).toLowerCase();
  return TABLE[code] ?? en;
}

export const StringsContext = createContext<Strings>(en);
export const useStrings = () => useContext(StringsContext);
