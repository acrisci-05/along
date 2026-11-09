import type { AppState, Chat, User } from '../types'

const H = 3_600_000
const M = 60_000

const users: User[] = [
  {
    id: 'u-giulia', name: 'Giulia', age: 24, city: 'Napoli', hue: 12, emoji: '🍜',
    bio: 'Food designer di giorno, cacciatrice di brodi tonkotsu di sera. Parlo con le mani.',
    interests: ['ramen', 'fotografia analogica', 'city pop', 'cucina', 'mercati'],
    thisOrThat: { question: 'Pizza fritta o al forno?', a: 'Fritta', b: 'Al forno' },
    verified: true,
    work: 'Food designer', languages: ['Italiano', 'Inglese', 'Napoletano'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date', 'friends'], distanceKm: 1.2, look: { skin: 1, hair: 'long', hairColor: '#3b2416', shirt: '#FF806D', earring: true },
  },
  {
    id: 'u-marco', name: 'Marco', age: 27, city: 'Napoli', hue: 88, emoji: '🎾',
    bio: 'Ingegnere, padel 4 volte a settimana, cerco sempre il quarto. Rovescio discutibile.',
    interests: ['padel', 'running', 'podcast', 'birra artigianale', 'F1'],
    thisOrThat: { question: 'Mare o montagna?', a: 'Mare', b: 'Montagna' },
    work: 'Ingegnere', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['friends'], distanceKm: 4.8, look: { skin: 2, hair: 'short', hairColor: '#1d1410', shirt: '#D7FF66', beard: true },
  },
  {
    id: 'u-sofia', name: 'Sofia', age: 22, city: 'Napoli', hue: 330, emoji: '🎬',
    bio: 'Studio cinema. Guardo tutto in lingua originale, sì anche i cartoni. Popcorn salati, mai dolci.',
    interests: ['Nolan', 'cinema d’autore', 'vinili', 'scrittura', 'serie tv'],
    thisOrThat: { question: 'Alba o tramonto?', a: 'Alba', b: 'Tramonto' },
    verified: true,
    work: 'Studio cinema al DAMS', languages: ['Italiano', 'Inglese', 'Francese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date', 'friends'], distanceKm: 2.1, look: { skin: 0, hair: 'bob', hairColor: '#7a2e1f', shirt: '#8B5CF6', glasses: true },
  },
  {
    id: 'u-luca', name: 'Luca', age: 25, city: 'Milano', hue: 265, emoji: '🎮',
    bio: 'Main Sage su Valorant, Diamond su Rocket League. Cerco un duo serale chill, no tossici.',
    interests: ['Valorant', 'Rocket League', 'synthwave', 'anime', 'streaming'],
    thisOrThat: { question: 'Caffè al bar o a casa?', a: 'Al bar', b: 'A casa' },
    work: 'Sviluppatore web', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['friends'], distanceKm: 660, look: { skin: 1, hair: 'wavy', hairColor: '#2a1d14', shirt: '#22d3ee' },
  },
  {
    id: 'u-chiara', name: 'Chiara', age: 23, city: 'Napoli', hue: 190, emoji: '📚',
    bio: 'Medicina, quinto anno. Pomodoro technique e tisane. Cerco compagni di studio silenziosi ma presenti.',
    interests: ['studio', 'yoga', 'libri', 'podcast', 'tè'],
    thisOrThat: { question: 'Cinema o serie in pigiama?', a: 'Cinema', b: 'Serie in pigiama' },
    verified: true,
    work: 'Studio medicina', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['friends'], distanceKm: 0.8, look: { skin: 2, hair: 'bun', hairColor: '#4a2a18', shirt: '#06B6D4', glasses: true },
  },
  {
    id: 'u-davide', name: 'Davide', age: 26, city: 'Roma', hue: 35, emoji: '✈️',
    bio: 'Product manager nomade. A fine mese vado a Valencia: cerco crew per paella e tramonti alla Malvarrosa.',
    interests: ['viaggi', 'surf', 'paella', 'fotografia', 'lingue'],
    thisOrThat: { question: 'Sfogliatella riccia o frolla?', a: 'Riccia', b: 'Frolla' },
    work: 'Product manager', languages: ['Italiano', 'Inglese', 'Spagnolo'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['date', 'friends'], distanceKm: 190, look: { skin: 3, hair: 'curly', hairColor: '#120c08', shirt: '#F5C451', beard: true },
  },
  {
    id: 'u-nina', name: 'Nina', age: 29, city: 'Bologna', hue: 280, emoji: '🎧',
    bio: 'DJ amatoriale e collezionista di vinili. Scambio playlist notturne con chiunque abbia gusto (o coraggio).',
    interests: ['vinili', 'city pop', 'synthwave', 'jazz', 'serie tv'],
    thisOrThat: { question: 'Cane o gatto?', a: 'Cane', b: 'Gatto' },
    work: 'DJ e grafica', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date', 'friends'], distanceKm: 480, look: { skin: 4, hair: 'curly', hairColor: '#0d0907', shirt: '#c084fc', earring: true },
  },
  {
    id: 'u-kenji', name: 'Kenji', age: 28, city: 'Torino', hue: 150, emoji: '🌙',
    bio: 'Traduttore, nottambulo. Chiacchiere su libri, Murakami e domande esistenziali dopo mezzanotte.',
    interests: ['libri', 'Murakami', 'jazz', 'scrittura', 'anime'],
    thisOrThat: { question: 'Messaggi o vocali?', a: 'Messaggi', b: 'Vocali' },
    verified: true,
    work: 'Traduttore', languages: ['Italiano', 'Giapponese', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['date'], distanceKm: 760, look: { skin: 1, hair: 'short', hairColor: '#0b0b0f', shirt: '#334155', glasses: true },
  },
  {
    id: 'u-elena', name: 'Elena', age: 24, city: 'Barcellona', hue: 0, emoji: '🌶️',
    bio: 'Napoletana a Barcellona da 3 anni. Ti porto nei bar de tapas dove vanno i locali, non i turisti.',
    interests: ['tapas', 'viaggi', 'lingue', 'mercati', 'fotografia analogica'],
    thisOrThat: { question: 'Piano preciso o improvvisare?', a: 'Piano preciso', b: 'Improvviso' },
    work: 'Guida turistica', languages: ['Italiano', 'Spagnolo', 'Inglese', 'Napoletano'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date', 'friends'], distanceKm: 1100, look: { skin: 2, hair: 'wavy', hairColor: '#24140c', shirt: '#ef4444', earring: true },
  },
  {
    id: 'u-tommaso', name: 'Tommaso', age: 30, city: 'Napoli', hue: 210, emoji: '🌅',
    bio: 'Architetto, camminatore seriale. Tramonti, scalinate e conversazioni lente.',
    interests: ['camminate', 'architettura', 'fotografia', 'running', 'podcast'],
    thisOrThat: { question: 'Serata in casa o fuori fino a tardi?', a: 'In casa', b: 'Fuori fino a tardi' },
    verified: true,
    work: 'Architetto', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['date', 'friends'], distanceKm: 3.5, look: { skin: 1, hair: 'buzz', hairColor: '#6b4a2b', shirt: '#0ea5e9', beard: true },
  },
  {
    id: 'u-martina', name: 'Martina', age: 26, city: 'Napoli', hue: 345, emoji: '🍕',
    bio: 'Restauratrice di affreschi. Cerco qualcuno che regga una passeggiata di 3 ore e una pizza fritta alla fine.',
    interests: ['arte', 'camminate', 'pizza fritta', 'vinili', 'Nolan'],
    thisOrThat: { question: 'Lungomare a piedi o in bici?', a: 'A piedi', b: 'In bici' },
    verified: true,
    work: 'Restauratrice', languages: ['Italiano', 'Napoletano', 'Francese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date'], distanceKm: 1.6, look: { skin: 1, hair: 'wavy', hairColor: '#5a2a14', shirt: '#F5C451', earring: true },
  },
  {
    id: 'u-federico', name: 'Federico', age: 28, city: 'Napoli', hue: 25, emoji: '🎸',
    bio: 'Chitarrista in una band che nessuno conosce (ancora). Cucino una carbonara che fa piangere i romani.',
    interests: ['musica live', 'cucina', 'synthwave', 'padel', 'serie tv'],
    thisOrThat: { question: 'Libro o podcast?', a: 'Libro', b: 'Podcast' },
    work: 'Musicista e cuoco', languages: ['Italiano', 'Napoletano'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['date', 'friends'], distanceKm: 2.4, look: { skin: 2, hair: 'long', hairColor: '#1a120c', shirt: '#111827', beard: true },
  },
  {
    id: 'u-aurora', name: 'Aurora', age: 23, city: 'Napoli', hue: 300, emoji: '🌙',
    bio: 'Studio astrofisica, vivo di notte. Ti spiego le costellazioni dal Belvedere se mi offri un caffè.',
    interests: ['stelle', 'libri', 'Murakami', 'camminate', 'jazz'],
    thisOrThat: { question: 'Concerto: prima fila o bar in fondo?', a: 'Prima fila', b: 'Bar in fondo' },
    verified: true,
    work: 'Studio astrofisica', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['date', 'friends'], distanceKm: 3.1, look: { skin: 3, hair: 'long', hairColor: '#0f0a08', shirt: '#8B5CF6', glasses: true },
  },
  {
    id: 'u-samuele', name: 'Samuele', age: 27, city: 'Napoli', hue: 140, emoji: '🧗',
    bio: 'Arrampicata, sentieri e colazioni infinite. Cerco gente con cui fare cose all’aperto senza prendersi sul serio.',
    interests: ['arrampicata', 'camminate', 'running', 'podcast', 'ramen'],
    thisOrThat: { question: 'Colazione dolce o salata?', a: 'Dolce', b: 'Salata' },
    verified: true,
    work: 'Istruttore di arrampicata', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['friends', 'date'], distanceKm: 5.2, look: { skin: 4, hair: 'buzz', hairColor: '#0d0907', shirt: '#22c55e' },
  },
  {
    id: 'u-irene', name: 'Irene', age: 25, city: 'Napoli', hue: 50, emoji: '📷',
    bio: 'Fotografa di matrimoni (ironico, lo so). Il weekend scatto in analogico per i vicoli e cerco modelli involontari.',
    interests: ['fotografia analogica', 'mercati', 'city pop', 'ramen', 'cinema d’autore'],
    thisOrThat: { question: 'Viaggio: zaino in spalla o hotel comodo?', a: 'Zaino in spalla', b: 'Hotel comodo' },
    work: 'Fotografa', languages: ['Italiano', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['friends', 'date'], distanceKm: 1.9, look: { skin: 0, hair: 'short', hairColor: '#d6a65c', shirt: '#f472b6', earring: true },
  },
  {
    id: 'u-omar', name: 'Omar', age: 29, city: 'Milano', hue: 200, emoji: '☕',
    bio: 'Barista specialty e nottambulo. Scambio vocali lunghi su libri, caffè e città dove vorrei vivere.',
    interests: ['caffè', 'libri', 'viaggi', 'jazz', 'synthwave'],
    thisOrThat: { question: 'Gelato: cono o coppetta?', a: 'Cono', b: 'Coppetta' },
    verified: true,
    work: 'Barista specialty', languages: ['Italiano', 'Arabo', 'Inglese'], smoke: 'no', drink: 'a volte',
    gender: 'm', intent: ['date', 'friends'], distanceKm: 660, look: { skin: 3, hair: 'curly', hairColor: '#120c08', shirt: '#F6F4EF', beard: true },
  },
  {
    id: 'u-lea', name: 'Léa', age: 26, city: 'Lisbona', hue: 180, emoji: '🌊',
    bio: 'Italo-francese a Lisbona, surf all’alba e fado la sera. Cerco pen-pal per scambiarci città e canzoni.',
    interests: ['surf', 'viaggi', 'lingue', 'vinili', 'scrittura'],
    thisOrThat: { question: 'Primo appuntamento: aperitivo o passeggiata?', a: 'Aperitivo', b: 'Passeggiata' },
    work: 'Copywriter', languages: ['Italiano', 'Francese', 'Portoghese'], smoke: 'no', drink: 'a volte',
    gender: 'f', intent: ['friends', 'date'], distanceKm: 2200, look: { skin: 2, hair: 'wavy', hairColor: '#b07a3f', shirt: '#06B6D4' },
  },
  {
    id: 'u-matteo', name: 'Matteo', age: 17, city: 'Napoli', hue: 205, emoji: '⚽',
    bio: 'Quinto anno di liceo scientifico. Calcetto il sabato e videogiochi la sera. Cerco gente per il torneo di quartiere.',
    interests: ['calcetto', 'videogiochi', 'serie tv', 'musica', 'padel'],
    thisOrThat: { question: 'Città o paesino?', a: 'Città', b: 'Paesino' },
    verified: true,
    work: 'Liceo scientifico', languages: ['Italiano', 'Inglese'],
    gender: 'm', intent: ['friends'], distanceKm: 2.2, look: { skin: 1, hair: 'short', hairColor: '#3b2416', shirt: '#2f5d8a' },
  },
  {
    id: 'u-ludovica', name: 'Ludovica', age: 16, city: 'Napoli', hue: 320, emoji: '🎨',
    bio: 'Disegno fumetti e leggo manga. Cerco qualcuno per andare al Comicon o anche solo per disegnare insieme al parco.',
    interests: ['fumetti', 'disegno', 'anime', 'libri', 'musica'],
    thisOrThat: { question: 'Mattiniero o nottambulo?', a: 'Mattiniero', b: 'Nottambulo' },
    verified: true,
    work: 'Liceo artistico', languages: ['Italiano', 'Inglese'],
    gender: 'f', intent: ['friends'], distanceKm: 1.4, look: { skin: 0, hair: 'bob', hairColor: '#6b3a1f', shirt: '#a3445e' },
  },
  {
    id: 'u-gaia', name: 'Gaia', age: 17, city: 'Napoli', hue: 160, emoji: '🏐',
    bio: 'Pallavolo tre volte a settimana, il resto del tempo musica e gelato. Organizzo uscite di gruppo, mai da sola.',
    interests: ['pallavolo', 'musica', 'serie tv', 'camminate', 'fotografia'],
    thisOrThat: { question: 'Pizza a portafoglio o al tavolo?', a: 'A portafoglio', b: 'Al tavolo' },
    verified: true,
    work: 'Liceo linguistico', languages: ['Italiano', 'Inglese', 'Spagnolo'],
    gender: 'f', intent: ['friends'], distanceKm: 3.0, look: { skin: 2, hair: 'long', hairColor: '#2a1d14', shirt: '#3f7d5e' },
  },
]

export function createMe(): User {
  return {
    id: 'me', name: 'Alex', age: 25, city: 'Napoli', hue: 72, emoji: '⚡',
    bio: 'Nuovo in città, voglia di conoscere persone vere. Ramen, cinema in lingua originale e camminate lunghe.',
    interests: ['ramen', 'Nolan', 'synthwave', 'camminate', 'libri', 'padel'],
    thisOrThat: { question: 'Pizza fritta o al forno?', a: 'Fritta', b: 'Al forno' },
    gender: 'nb', intent: ['date', 'friends'], look: { skin: 1, hair: 'wavy', hairColor: '#2b1a10', shirt: '#24473a' },
  }
}

const msg = (from: string, text: string, at: number) => ({ id: `m-${Math.random().toString(36).slice(2, 9)}`, from, kind: 'text' as const, text, at })

const chats = (now: number): Chat[] => [
  {
    id: 'c-sofia', peerIds: ['u-sofia'], title: 'Sofia', status: 'active', createdAt: now - 20 * H, unread: 1,
    messages: [
      { id: 'm1', from: 'system', kind: 'system', text: 'È un match! Rompi il ghiaccio.', at: now - 20 * H },
      { id: 'm2', from: 'me', kind: 'dilemma', question: 'Cinema o serie in pigiama?', text: 'Cinema', at: now - 20 * H },
      msg('u-sofia', 'Cinema, ottima scelta. In lingua originale però!', now - 19 * H),
      msg('me', 'Sempre. Interstellar o Inception?', now - 18 * H),
      msg('u-sofia', 'Inception, così Interstellar ci distrugge dopo 😄', now - 40 * M),
    ],
  },
  {
    id: 'c-marco', peerIds: ['u-marco'], title: 'Marco', status: 'active', createdAt: now - 30 * H, unread: 0,
    messages: [
      { id: 'm3', from: 'system', kind: 'system', text: 'È un match! Rompi il ghiaccio.', at: now - 30 * H },
      msg('u-marco', 'Ehi! Anche tu a padel? Cerco sempre il quarto', now - 29 * H),
      { id: 'm4', from: 'u-marco', kind: 'voice', duration: 14, wave: [3, 6, 9, 5, 8, 10, 7, 4, 6, 9, 5, 3, 7, 8, 4, 6, 9, 7, 5, 3], at: now - 3 * H },
    ],
  },
  {
    id: 'c-luca', peerIds: ['u-luca'], title: 'Luca', status: 'waiting', createdAt: now - 3 * H, unread: 0,
    incoming: { question: 'Pizza fritta o al forno?', pick: 'Fritta' },
    messages: [],
  },
]

export const DEMO_VERSION = 6

export const todayKey = () => new Date().toLocaleDateString('sv-SE')
export const DAILY_LIMIT = 20

export function createInitialState(): AppState {
  const now = Date.now()
  return {
    version: DEMO_VERSION,
    me: createMe(),
    users: Object.fromEntries(users.map((u) => [u.id, u])),
    chats: chats(now),
    lifetime: false,
    onboarded: false,
    swipes: {},
    swipeHistory: [],
    likesIn: [
      { id: 'l-1', userId: 'u-federico', question: 'Pizza fritta o al forno?', pick: 'Fritta', at: now - 40 * M, status: 'new' },
      { id: 'l-2', userId: 'u-aurora', at: now - 3 * H, status: 'new' },
      { id: 'l-3', userId: 'u-omar', question: 'Pizza fritta o al forno?', pick: 'Al forno', at: now - 9 * H, status: 'new' },
    ],
    likesOut: [],
    prefs: { intent: 'date', show: 'all', ageMin: 20, ageMax: 35, readReceipts: true, typingIndicator: true },
    daily: { day: todayKey(), seen: 0, liked: 0, matches: 0 },
    blocked: [],
    reports: [],
  }
}

export const THIS_OR_THAT: Array<{ question: string; a: string; b: string }> = [
  { question: 'Pizza fritta o al forno?', a: 'Fritta', b: 'Al forno' },
  { question: 'Mare o montagna?', a: 'Mare', b: 'Montagna' },
  { question: 'Alba o tramonto?', a: 'Alba', b: 'Tramonto' },
  { question: 'Caffè al bar o a casa?', a: 'Al bar', b: 'A casa' },
  { question: 'Cinema o serie in pigiama?', a: 'Cinema', b: 'Serie in pigiama' },
  { question: 'Sfogliatella riccia o frolla?', a: 'Riccia', b: 'Frolla' },
  { question: 'Cane o gatto?', a: 'Cane', b: 'Gatto' },
  { question: 'Messaggi o vocali?', a: 'Messaggi', b: 'Vocali' },
  { question: 'Piano preciso o improvvisare?', a: 'Piano preciso', b: 'Improvviso' },
  { question: 'Serata in casa o fuori fino a tardi?', a: 'In casa', b: 'Fuori fino a tardi' },
  { question: 'Lungomare a piedi o in bici?', a: 'A piedi', b: 'In bici' },
  { question: 'Libro o podcast?', a: 'Libro', b: 'Podcast' },
  { question: 'Concerto: prima fila o bar in fondo?', a: 'Prima fila', b: 'Bar in fondo' },
  { question: 'Colazione dolce o salata?', a: 'Dolce', b: 'Salata' },
  { question: 'Viaggio: zaino in spalla o hotel comodo?', a: 'Zaino in spalla', b: 'Hotel comodo' },
  { question: 'Gelato: cono o coppetta?', a: 'Cono', b: 'Coppetta' },
  { question: 'Primo appuntamento: aperitivo o passeggiata?', a: 'Aperitivo', b: 'Passeggiata' },
  { question: 'Città o paesino?', a: 'Città', b: 'Paesino' },
  { question: 'Mattiniero o nottambulo?', a: 'Mattiniero', b: 'Nottambulo' },
  { question: 'Pizza a portafoglio o al tavolo?', a: 'A portafoglio', b: 'Al tavolo' },
]

export const PASSION_CATEGORIES: Array<{ name: string; items: string[] }> = [
  { name: 'Cibo', items: ['ramen', 'pizza fritta', 'cucina', 'mercati', 'caffè', 'tapas', 'paella', 'birra artigianale', 'tè'] },
  { name: 'Sport', items: ['padel', 'running', 'calcetto', 'pallavolo', 'arrampicata', 'yoga', 'surf', 'F1'] },
  { name: 'Cultura', items: ['libri', 'cinema d’autore', 'Nolan', 'arte', 'fotografia analogica', 'fotografia', 'scrittura', 'Murakami', 'fumetti', 'architettura', 'stelle'] },
  { name: 'Musica', items: ['vinili', 'city pop', 'synthwave', 'jazz', 'musica live', 'Valorant'] },
  { name: 'Uscite', items: ['camminate', 'viaggi', 'serie tv', 'videogiochi', 'podcast', 'lingue', 'anime', 'studio'] },
]

export const LANGUAGES = ['Italiano', 'Napoletano', 'Inglese', 'Spagnolo', 'Francese', 'Tedesco', 'Portoghese', 'Giapponese', 'Arabo', 'Cinese']

export const FAREWELL = 'È stato un piacere conoscerti, ma non sento la scintilla giusta. Ti auguro il meglio!'

export const FAREWELLS = [
  { label: 'Non sento la scintilla', text: 'È stato un piacere conoscerti, ma non sento la scintilla giusta. Ti auguro il meglio!' },
  { label: 'Non è il momento giusto', text: 'Mi ha fatto piacere parlare con te, ma non è il momento giusto per me. Buona fortuna!' },
  { label: 'Cerchiamo cose diverse', text: 'Credo che cerchiamo cose diverse, e preferisco dirtelo subito. In bocca al lupo!' },
]

export const AUTO_REPLIES: string[] = [
  'Ahah mi piace come ragioni 😄',
  'Ok, segnato! Dimmi tu quando ti torna meglio.',
  'Vero! Raccontami di più.',
  'Ti mando un vocale appena esco da lavoro 🎙️',
  'Questa me la salvo. Tu cosa stai ascoltando adesso?',
  'Domanda seria: qual è la tua ora preferita della giornata?',
]

/** demo people who like you back */
export const INCOMING_POOL = ['u-kenji', 'u-nina', 'u-chiara', 'u-davide', 'u-tommaso']

export { H, M }
