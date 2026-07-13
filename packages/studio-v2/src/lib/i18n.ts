import { createContext, useContext } from 'react';

// i18n autonome du studio v2 : toutes les chaînes visibles, fr/en. La locale
// vient de la route (/[locale]/…) et est fournie via <StringsProvider>.
export interface Strings {
  newProject: string;
  preview: string;
  files: string;
  publish: string;
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
  agentModel: string;
  navProjects: string;
  navChat: string;
  navPreview: string;
  navigation: string;
  you: string;
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
  recents: string;
  downloadZip: string;
  activity: {
    thinking: string; writing: string; write: string; edit: string; read: string;
    bash: string; task: string; browser: string; assets: string; tool: string;
    working: string; starting: string; uploading: string; compacting: string;
  };
  errors: { rate: string; credits: string; timeout: string; generic: string; upload: string };
  del: {
    title: string; sessionOnly: string; sessionOnlyHint: string;
    projectToo: string; projectTooHint: string; plainHint: string;
    cancel: string; confirm: string; deleting: string;
  };
  deployBlocked: { title: string; body: string; close: string };
  storage: { label: string; almostFull: string; blockedTitle: string; blockedBody: string; close: string };
  fullscreen: string;
  promptQuality: string;
  promptLevels: { low: string; mid: string; high: string };
  domain: {
    manage: string; title: string; sub: string; placeholder: string;
    connect: string; connecting: string; active: string; pending: string;
    dnsHint: string; verifying: string; visit: string; remove: string; error: string;
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
}

const fr: Strings = {
  newProject: 'Nouveau projet',
  preview: 'Aperçu',
  files: 'Fichiers',
  publish: 'Publier',
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
  agentModel: "Modèle de l'agent",
  navProjects: 'Projets',
  navChat: 'Chat',
  navPreview: 'Aperçu',
  navigation: 'Navigation',
  you: 'Vous',
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
  recents: 'Récents',
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
  fullscreen: 'Plein écran',
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
};

const en: Strings = {
  newProject: 'New project',
  preview: 'Preview',
  files: 'Files',
  publish: 'Publish',
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
  agentModel: 'Agent model',
  navProjects: 'Projects',
  navChat: 'Chat',
  navPreview: 'Preview',
  navigation: 'Navigation',
  you: 'You',
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
  recents: 'Recents',
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
  fullscreen: 'Fullscreen',
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
};

const TABLE: Record<string, Strings> = { fr, en };

/** Renvoie les chaînes pour une locale (fallback anglais). */
export function stringsFor(lang?: string): Strings {
  const code = (lang || 'en').slice(0, 2).toLowerCase();
  return TABLE[code] ?? en;
}

export const StringsContext = createContext<Strings>(en);
export const useStrings = () => useContext(StringsContext);
