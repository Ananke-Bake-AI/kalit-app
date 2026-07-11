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
};

const TABLE: Record<string, Strings> = { fr, en };

/** Renvoie les chaînes pour une locale (fallback anglais). */
export function stringsFor(lang?: string): Strings {
  const code = (lang || 'en').slice(0, 2).toLowerCase();
  return TABLE[code] ?? en;
}

export const StringsContext = createContext<Strings>(en);
export const useStrings = () => useContext(StringsContext);
