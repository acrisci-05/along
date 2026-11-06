import type { AppState, Chat, Plan, User } from '../types'

const H = 3_600_000
const M = 60_000

export const HABITATS: Record<string, { district: string; x: number; y: number; kind: string }> = {
  'Ramen bar · Decumani': { district: 'Centro Storico', x: 58, y: 38, kind: 'food' },
  'Biblioteca Nazionale': { district: 'San Ferdinando', x: 47, y: 58, kind: 'study' },
  'Padel Club Fuorigrotta': { district: 'Fuorigrotta', x: 14, y: 62, kind: 'sport' },
  'Cinema d’essai Chiaia': { district: 'Chiaia', x: 34, y: 63, kind: 'cinema' },
  'Lungomare Caracciolo': { district: 'Chiaia', x: 30, y: 78, kind: 'walk' },
  'Belvedere di Posillipo': { district: 'Posillipo', x: 16, y: 86, kind: 'walk' },
  'Bar storico · Piazza Bellini': { district: 'Centro Storico', x: 54, y: 30, kind: 'drink' },
  'Parco della Floridiana': { district: 'Vomero', x: 32, y: 44, kind: 'walk' },
  'Palestra Vomero Fit': { district: 'Vomero', x: 38, y: 32, kind: 'sport' },
  'Mercato di Porta Nolana': { district: 'Porta Nolana', x: 76, y: 46, kind: 'food' },
}

export const DISTRICTS = [
  { name: 'Vomero', x: 34, y: 38 },
  { name: 'Centro Storico', x: 58, y: 34 },
  { name: 'Chiaia', x: 32, y: 68 },
  { name: 'San Ferdinando', x: 48, y: 62 },
  { name: 'Fuorigrotta', x: 13, y: 56 },
  { name: 'Posillipo', x: 14, y: 82 },
  { name: 'Porta Nolana', x: 78, y: 52 },
]

const users: User[] = [
  {
    id: 'u-giulia', name: 'Giulia', age: 24, city: 'Napoli', hue: 12, emoji: '🍜',
    bio: 'Food designer di giorno, cacciatrice di brodi tonkotsu di sera. Parlo con le mani.',
    interests: ['ramen', 'fotografia analogica', 'city pop', 'cucina', 'mercati'],
    habitats: ['Ramen bar · Decumani', 'Mercato di Porta Nolana'],
    dilemma: { question: 'Se prendiamo una pizza, cosa non deve MAI esserci sopra?', options: ['Ananas', 'Panna', 'Ketchup', 'Niente, sono anarchica'] },
    bestie: { worstFlaw: 'Ti fotografa il piatto per 4 minuti prima di farti mangiare.', whyGoOut: 'Conosce il posto giusto in ogni vicolo. E condivide sempre le gyoza.', redFlag: 'Ha opinioni MOLTO forti sullo spessore dei noodles.', by: 'Marta, bestie dal liceo' },
    karma: 214, badges: ['fast', 'zero'],
    gender: 'f', intent: ['date', 'friends'], distanceKm: 1.2, look: { skin: 1, hair: 'long', hairColor: '#3b2416', shirt: '#FF806D', earring: true },
  },
  {
    id: 'u-marco', name: 'Marco', age: 27, city: 'Napoli', hue: 88, emoji: '🎾',
    bio: 'Ingegnere, padel 4 volte a settimana, cerco sempre il quarto. Rovescio discutibile.',
    interests: ['padel', 'running', 'podcast', 'birra artigianale', 'F1'],
    habitats: ['Padel Club Fuorigrotta', 'Palestra Vomero Fit'],
    dilemma: { question: 'Perdi 6-0 6-0. Cosa dici al tuo compagno a fine partita?', options: ['Colpa del vento', 'Birra? Offro io', 'Rivincita. Ora.'] },
    bestie: { worstFlaw: 'Arriva 20 minuti prima e ti scrive “dove sei?”.', whyGoOut: 'Ti fa sentire un campione anche quando la palla va in tribuna.', redFlag: 'Ha un foglio Excel delle sue statistiche di padel.', by: 'Andrea, compagno di squadra' },
    karma: 188, badges: ['fast'],
    gender: 'm', intent: ['friends'], distanceKm: 4.8, look: { skin: 2, hair: 'short', hairColor: '#1d1410', shirt: '#D7FF66', beard: true },
  },
  {
    id: 'u-sofia', name: 'Sofia', age: 22, city: 'Napoli', hue: 330, emoji: '🎬',
    bio: 'Studio cinema. Guardo tutto in lingua originale, sì anche i cartoni. Popcorn salati, mai dolci.',
    interests: ['Nolan', 'cinema d’autore', 'vinili', 'scrittura', 'serie tv'],
    habitats: ['Cinema d’essai Chiaia', 'Bar storico · Piazza Bellini'],
    dilemma: { question: 'Hai 2 ore libere in una città sconosciuta senza telefono: cosa fai?', options: ['Mi perdo apposta', 'Cerco un cinema', 'Trovo un bar e parlo con chiunque'] },
    bestie: { worstFlaw: 'Ti spiega il finale del film durante i titoli di coda. Con i diagrammi.', whyGoOut: 'Ti fa vedere il mondo come un’inquadratura perfetta.', redFlag: 'Ha pianto a Interstellar. Tre volte. Al cinema.', by: 'Bea, coinquilina' },
    karma: 176, badges: ['voice', 'zero'],
    gender: 'f', intent: ['date', 'friends'], distanceKm: 2.1, look: { skin: 0, hair: 'bob', hairColor: '#7a2e1f', shirt: '#8B5CF6', glasses: true },
  },
  {
    id: 'u-luca', name: 'Luca', age: 25, city: 'Milano', hue: 265, emoji: '🎮',
    bio: 'Main Sage su Valorant, Diamond su Rocket League. Cerco un duo serale chill, no tossici.',
    interests: ['Valorant', 'Rocket League', 'synthwave', 'anime', 'streaming'],
    habitats: [],
    dilemma: { question: 'Il tuo compagno sbaglia l’ultimo round decisivo. Cosa scrivi in chat?', options: ['“ns try”', 'Silenzio stampa', '“GG, next”'] },
    bestie: { worstFlaw: 'Dice “ultima partita” alle 23 e sono le 2.', whyGoOut: 'Ti carica anche quando sei a 0-8. Pazienza infinita.', redFlag: 'Ha un nome per ogni sua tastiera meccanica.', by: 'Fede, duo storico' },
    karma: 201, badges: ['fast', 'voice'], travel: undefined,
    gender: 'm', intent: ['friends'], distanceKm: 660, look: { skin: 1, hair: 'wavy', hairColor: '#2a1d14', shirt: '#22d3ee' },
  },
  {
    id: 'u-chiara', name: 'Chiara', age: 23, city: 'Napoli', hue: 190, emoji: '📚',
    bio: 'Medicina, quinto anno. Pomodoro technique e tisane. Cerco compagni di studio silenziosi ma presenti.',
    interests: ['studio', 'yoga', 'libri', 'podcast', 'tè'],
    habitats: ['Biblioteca Nazionale', 'Parco della Floridiana'],
    dilemma: { question: 'Pausa studio ideale: 15 minuti per…', options: ['Caffè al volo', 'Camminata', 'Meme sul telefono'] },
    bestie: { worstFlaw: 'Ti fa la lezione di anatomia mentre mangi.', whyGoOut: 'Ti porta sempre uno snack anche se non l’hai chiesto.', redFlag: 'Evidenziatori in 9 colori. Codificati.', by: 'Ire, compagna di corso' },
    karma: 230, badges: ['zero', 'fast'],
    gender: 'f', intent: ['friends'], distanceKm: 0.8, look: { skin: 2, hair: 'bun', hairColor: '#4a2a18', shirt: '#06B6D4', glasses: true },
  },
  {
    id: 'u-davide', name: 'Davide', age: 26, city: 'Roma', hue: 35, emoji: '✈️',
    bio: 'Product manager nomade. A fine mese vado a Valencia: cerco crew per paella e tramonti alla Malvarrosa.',
    interests: ['viaggi', 'surf', 'paella', 'fotografia', 'lingue'],
    habitats: [],
    dilemma: { question: 'In viaggio: piano dettagliato o zaino e improvvisazione?', options: ['Excel con orari', 'Zaino e via', 'Metà e metà'] },
    bestie: { worstFlaw: 'Prenota il volo prima di chiederti se puoi venire.', whyGoOut: 'Trova sempre il localino che non c’è su nessuna guida.', redFlag: 'Ha 14 app di viaggio sul telefono.', by: 'Gio, compagno di Erasmus' },
    karma: 165, badges: ['voice'], travel: 'Valencia',
    gender: 'm', intent: ['date', 'friends'], distanceKm: 190, look: { skin: 3, hair: 'curly', hairColor: '#120c08', shirt: '#F5C451', beard: true },
  },
  {
    id: 'u-nina', name: 'Nina', age: 29, city: 'Bologna', hue: 280, emoji: '🎧',
    bio: 'DJ amatoriale e collezionista di vinili. Scambio playlist notturne con chiunque abbia gusto (o coraggio).',
    interests: ['vinili', 'city pop', 'synthwave', 'jazz', 'serie tv'],
    habitats: [],
    dilemma: { question: 'Una canzone che ascolti in loop quando nessuno ti guarda?', options: [] },
    bestie: { worstFlaw: 'Ti manda 40 canzoni alle 3 di notte e vuole un feedback.', whyGoOut: 'Ti fa scoprire la tua nuova canzone preferita ogni settimana.', redFlag: 'Giudica le persone dalla loro top 5 di Wrapped.', by: 'Ale, socio di consolle' },
    karma: 199, badges: ['voice', 'zero'],
    gender: 'f', intent: ['date', 'friends'], distanceKm: 480, look: { skin: 4, hair: 'curly', hairColor: '#0d0907', shirt: '#c084fc', earring: true },
  },
  {
    id: 'u-kenji', name: 'Kenji', age: 28, city: 'Torino', hue: 150, emoji: '🌙',
    bio: 'Traduttore, nottambulo. Chiacchiere su libri, Murakami e domande esistenziali dopo mezzanotte.',
    interests: ['libri', 'Murakami', 'jazz', 'scrittura', 'anime'],
    habitats: [],
    dilemma: { question: 'Il libro che regaleresti a uno sconosciuto per capire chi sei?', options: [] },
    bestie: { worstFlaw: 'Risponde con citazioni. Sempre.', whyGoOut: 'Ascolta davvero, e si ricorda tutto quello che dici.', redFlag: 'Sottolinea i libri. A penna.', by: 'Yuki, sorella' },
    karma: 222, badges: ['voice', 'zero'],
    gender: 'm', intent: ['date'], distanceKm: 760, look: { skin: 1, hair: 'short', hairColor: '#0b0b0f', shirt: '#334155', glasses: true },
  },
  {
    id: 'u-elena', name: 'Elena', age: 24, city: 'Barcellona', hue: 0, emoji: '🌶️',
    bio: 'Napoletana a Barcellona da 3 anni. Ti porto nei bar de tapas dove vanno i locali, non i turisti.',
    interests: ['tapas', 'viaggi', 'lingue', 'mercati', 'fotografia analogica'],
    habitats: [],
    dilemma: { question: 'Prima sera in una città nuova: dove mi porti?', options: ['Tetto con vista', 'Bar di quartiere', 'Mercato notturno'] },
    bestie: { worstFlaw: 'Parla 4 lingue. Contemporaneamente.', whyGoOut: 'Ti fa sentire a casa in una città dove non conosci nessuno.', redFlag: 'Mette il peperoncino anche sul cornetto.', by: 'Paola, amica di Erasmus' },
    karma: 187, badges: ['fast', 'voice'],
    gender: 'f', intent: ['date', 'friends'], distanceKm: 1100, look: { skin: 2, hair: 'wavy', hairColor: '#24140c', shirt: '#ef4444', earring: true },
  },
  {
    id: 'u-tommaso', name: 'Tommaso', age: 30, city: 'Napoli', hue: 210, emoji: '🌅',
    bio: 'Architetto, camminatore seriale. Tramonti, scalinate e conversazioni lente.',
    interests: ['camminate', 'architettura', 'fotografia', 'running', 'podcast'],
    habitats: ['Belvedere di Posillipo', 'Lungomare Caracciolo'],
    dilemma: { question: 'Scale o ascensore, se sono 300 gradini con vista mare?', options: ['Scale, ovvio', 'Ascensore e senso di colpa'] },
    bestie: { worstFlaw: 'Ti dice “è vicino” e sono 6 km.', whyGoOut: 'Ti mostra Napoli da angoli che non sapevi esistessero.', redFlag: 'Si ferma a commentare ogni balcone barocco.', by: 'Ste, collega' },
    karma: 205, badges: ['zero'],
    gender: 'm', intent: ['date', 'friends'], distanceKm: 3.5, look: { skin: 1, hair: 'buzz', hairColor: '#6b4a2b', shirt: '#0ea5e9', beard: true },
  },
  {
    id: 'u-martina', name: 'Martina', age: 26, city: 'Napoli', hue: 345, emoji: '🍕',
    bio: 'Restauratrice di affreschi. Cerco qualcuno che regga una passeggiata di 3 ore e una pizza fritta alla fine.',
    interests: ['arte', 'camminate', 'pizza fritta', 'vinili', 'Nolan'],
    habitats: ['Bar storico · Piazza Bellini', 'Parco della Floridiana'],
    dilemma: { question: 'Primo appuntamento: museo vuoto o mercato rumoroso?', options: ['Museo vuoto', 'Mercato rumoroso', 'Entrambi, in quest’ordine'] },
    bestie: { worstFlaw: 'Si ferma davanti a ogni chiesa. OGNI chiesa.', whyGoOut: 'Ti racconta Napoli come se fosse un romanzo.', redFlag: 'Ha litigato con una guida turistica. E ha vinto.', by: 'Fra, amica d’infanzia' },
    karma: 196, badges: ['zero', 'voice'],
    gender: 'f', intent: ['date'], distanceKm: 1.6, look: { skin: 1, hair: 'wavy', hairColor: '#5a2a14', shirt: '#F5C451', earring: true },
  },
  {
    id: 'u-federico', name: 'Federico', age: 28, city: 'Napoli', hue: 25, emoji: '🎸',
    bio: 'Chitarrista in una band che nessuno conosce (ancora). Cucino una carbonara che fa piangere i romani.',
    interests: ['musica live', 'cucina', 'synthwave', 'padel', 'serie tv'],
    habitats: ['Bar storico · Piazza Bellini', 'Padel Club Fuorigrotta'],
    dilemma: { question: 'Concerto in prima fila o al bar in fondo a parlare?', options: ['Prima fila', 'Bar in fondo', 'Dipende dalla band'] },
    bestie: { worstFlaw: 'Ti fa sentire la demo nuova. In macchina. A tutto volume.', whyGoOut: 'Ti porta nei posti dove suonano i migliori, prima che diventino famosi.', redFlag: 'Accorda la chitarra durante le conversazioni serie.', by: 'Peppe, bassista' },
    karma: 172, badges: ['fast'],
    gender: 'm', intent: ['date', 'friends'], distanceKm: 2.4, look: { skin: 2, hair: 'long', hairColor: '#1a120c', shirt: '#111827', beard: true },
  },
  {
    id: 'u-aurora', name: 'Aurora', age: 23, city: 'Napoli', hue: 300, emoji: '🌙',
    bio: 'Studio astrofisica, vivo di notte. Ti spiego le costellazioni dal Belvedere se mi offri un caffè.',
    interests: ['stelle', 'libri', 'Murakami', 'camminate', 'jazz'],
    habitats: ['Belvedere di Posillipo', 'Biblioteca Nazionale'],
    dilemma: { question: 'Se potessi vivere in un’altra epoca per un giorno, quale?', options: [] },
    bestie: { worstFlaw: 'Guarda il cielo invece della strada. Abbiamo perso due bus.', whyGoOut: 'Ti fa sentire piccolo nel modo più bello possibile.', redFlag: 'Ha dato un nome a ogni pianta di casa. Sono 34.', by: 'Gaia, coinquilina' },
    karma: 210, badges: ['voice', 'zero'],
    gender: 'f', intent: ['date', 'friends'], distanceKm: 3.1, look: { skin: 3, hair: 'long', hairColor: '#0f0a08', shirt: '#8B5CF6', glasses: true },
  },
  {
    id: 'u-samuele', name: 'Samuele', age: 27, city: 'Napoli', hue: 140, emoji: '🧗',
    bio: 'Arrampicata, sentieri e colazioni infinite. Cerco gente con cui fare cose all’aperto senza prendersi sul serio.',
    interests: ['arrampicata', 'camminate', 'running', 'podcast', 'ramen'],
    habitats: ['Parco della Floridiana', 'Palestra Vomero Fit'],
    dilemma: { question: 'Alba in vetta o tramonto al mare?', options: ['Alba in vetta', 'Tramonto al mare'] },
    bestie: { worstFlaw: 'Ti sveglia alle 5 per “vedere l’alba”. Senza preavviso.', whyGoOut: 'Con lui anche una salita diventa una storia da raccontare.', redFlag: 'Ha 7 borracce. Tutte con un nome.', by: 'Ale, compagno di cordata' },
    karma: 204, badges: ['fast', 'zero'],
    gender: 'm', intent: ['friends', 'date'], distanceKm: 5.2, look: { skin: 4, hair: 'buzz', hairColor: '#0d0907', shirt: '#22c55e' },
  },
  {
    id: 'u-irene', name: 'Irene', age: 25, city: 'Napoli', hue: 50, emoji: '📷',
    bio: 'Fotografa di matrimoni (ironico, lo so). Il weekend scatto in analogico per i vicoli e cerco modelli involontari.',
    interests: ['fotografia analogica', 'mercati', 'city pop', 'ramen', 'cinema d’autore'],
    habitats: ['Mercato di Porta Nolana', 'Ramen bar · Decumani'],
    dilemma: { question: 'Una foto che non hai mai scattato ma ricordi benissimo?', options: [] },
    bestie: { worstFlaw: 'Ti dice “fermo così” nel mezzo di una frase.', whyGoOut: 'Vede la bellezza nelle cose che tutti ignorano. Anche in te.', redFlag: 'Annusa i rullini nuovi.', by: 'Vale, sorella' },
    karma: 189, badges: ['voice'],
    gender: 'f', intent: ['friends', 'date'], distanceKm: 1.9, look: { skin: 0, hair: 'short', hairColor: '#d6a65c', shirt: '#f472b6', earring: true },
  },
  {
    id: 'u-omar', name: 'Omar', age: 29, city: 'Milano', hue: 200, emoji: '☕',
    bio: 'Barista specialty e nottambulo. Scambio vocali lunghi su libri, caffè e città dove vorrei vivere.',
    interests: ['caffè', 'libri', 'viaggi', 'jazz', 'synthwave'],
    habitats: [],
    dilemma: { question: 'La città dove vivresti domani, senza pensarci?', options: ['Lisbona', 'Tokyo', 'Napoli, ovvio'] },
    bestie: { worstFlaw: 'Giudica il tuo caffè. In silenzio. Ma lo vedi.', whyGoOut: 'Ti scrive i vocali più belli che riceverai quest’anno.', redFlag: 'Pesa il caffè col bilancino anche in vacanza.', by: 'Sara, ex coinquilina' },
    karma: 215, badges: ['voice', 'zero'],
    gender: 'm', intent: ['date', 'friends'], distanceKm: 660, look: { skin: 3, hair: 'curly', hairColor: '#120c08', shirt: '#F6F4EF', beard: true },
  },
  {
    id: 'u-lea', name: 'Léa', age: 26, city: 'Lisbona', hue: 180, emoji: '🌊',
    bio: 'Italo-francese a Lisbona, surf all’alba e fado la sera. Cerco pen-pal per scambiarci città e canzoni.',
    interests: ['surf', 'viaggi', 'lingue', 'vinili', 'scrittura'],
    habitats: [],
    dilemma: { question: 'Mi mandi una canzone che sa di estate senza dire il titolo?', options: [] },
    bestie: { worstFlaw: 'Risponde dopo tre giorni. Ma con un vocale di 9 minuti.', whyGoOut: 'Ti fa venire voglia di prenotare un volo. Subito.', redFlag: 'Ha una mappa con le spille di tutti i posti dove ha pianto.', by: 'Inès, amica di Erasmus' },
    karma: 198, badges: ['voice'],
    gender: 'f', intent: ['friends', 'date'], distanceKm: 2200, look: { skin: 2, hair: 'wavy', hairColor: '#b07a3f', shirt: '#06B6D4' },
  },
  {
    id: 'u-matteo', name: 'Matteo', age: 17, city: 'Napoli', hue: 205, emoji: '⚽',
    bio: 'Quinto anno di liceo scientifico. Calcetto il sabato e videogiochi la sera. Cerco gente per il torneo di quartiere.',
    interests: ['calcetto', 'videogiochi', 'serie tv', 'musica', 'padel'],
    habitats: ['Parco della Floridiana', 'Palestra Vomero Fit'],
    dilemma: { question: 'Rigore decisivo: tiri centrale o all’angolo?', options: ['Centrale', 'All’angolo', 'Lo lascio tirare a un altro'] },
    bestie: { worstFlaw: 'Commenta ogni partita come un telecronista.', whyGoOut: 'Ti coinvolge sempre, anche se non sai giocare.', redFlag: 'Ha un salvadanaio solo per le figurine.', by: 'Pietro, compagno di classe' },
    karma: 168, badges: ['fast'],
    gender: 'm', intent: ['friends'], distanceKm: 2.2, look: { skin: 1, hair: 'short', hairColor: '#3b2416', shirt: '#2f5d8a' },
  },
  {
    id: 'u-ludovica', name: 'Ludovica', age: 16, city: 'Napoli', hue: 320, emoji: '🎨',
    bio: 'Disegno fumetti e leggo manga. Cerco qualcuno per andare al Comicon o anche solo per disegnare insieme al parco.',
    interests: ['fumetti', 'disegno', 'anime', 'libri', 'musica'],
    habitats: ['Parco della Floridiana', 'Biblioteca Nazionale'],
    dilemma: { question: 'Supereroe o cattivo dei fumetti: chi saresti?', options: ['Supereroe', 'Cattivo con buone ragioni'] },
    bestie: { worstFlaw: 'Ti disegna mentre parli. Senza dirtelo.', whyGoOut: 'Ha sempre un’idea nuova per il pomeriggio.', redFlag: 'Ha 40 matite e le chiama per nome.', by: 'Sara, migliore amica' },
    karma: 175, badges: ['zero'],
    gender: 'f', intent: ['friends'], distanceKm: 1.4, look: { skin: 0, hair: 'bob', hairColor: '#6b3a1f', shirt: '#a3445e' },
  },
  {
    id: 'u-gaia', name: 'Gaia', age: 17, city: 'Napoli', hue: 160, emoji: '🏐',
    bio: 'Pallavolo tre volte a settimana, il resto del tempo musica e gelato. Organizzo uscite di gruppo, mai da sola.',
    interests: ['pallavolo', 'musica', 'serie tv', 'camminate', 'fotografia'],
    habitats: ['Lungomare Caracciolo', 'Palestra Vomero Fit'],
    dilemma: { question: 'Gelato: cono o coppetta?', options: ['Cono', 'Coppetta', 'Due gusti, due coni'] },
    bestie: { worstFlaw: 'Organizza tutto con tre settimane di anticipo.', whyGoOut: 'Con lei il gruppo non si perde mai nessuno.', redFlag: 'Ha una playlist per ogni stato d’animo.', by: 'Chiara, compagna di squadra' },
    karma: 190, badges: ['fast', 'zero'],
    gender: 'f', intent: ['friends'], distanceKm: 3.0, look: { skin: 2, hair: 'long', hairColor: '#2a1d14', shirt: '#3f7d5e' },
  },
]

export function createMe(): User {
  return {
    id: 'me', name: 'Alex', age: 25, city: 'Napoli', hue: 72, emoji: '⚡',
    bio: 'Nuovo in città, voglia di fare cose vere con persone vere. Ramen, cinema VO e camminate lunghe.',
    interests: ['ramen', 'Nolan', 'synthwave', 'camminate', 'libri', 'padel'],
    habitats: ['Ramen bar · Decumani', 'Cinema d’essai Chiaia', 'Lungomare Caracciolo'],
    dilemma: { question: 'Sei su un’isola deserta con un solo album: quale porti?', options: [] },
    bestie: { worstFlaw: 'Dice sempre “5 minuti e arrivo” mentre è ancora sotto la doccia.', whyGoOut: 'Ti fa ridere fino alle lacrime e si ricorda il tuo ordine al bar.', redFlag: 'Salva i meme in cartelle tematiche. Con sottocartelle.', by: 'Il tuo bestie (in attesa di revisione)' },
    karma: 120, badges: [],
    gender: 'nb', intent: ['date', 'friends'], look: { skin: 1, hair: 'wavy', hairColor: '#2b1a10', shirt: '#D7FF66' },
  }
}

const day = (offsetDays: number, hour: number, min = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(hour, min, 0, 0)
  return d.getTime()
}

const plans = (now: number): Plan[] => [
  {
    id: 'p-ramen', hostId: 'u-giulia', title: 'Ramen tonkotsu ai Decumani', category: 'food', mode: 'local', city: 'Napoli',
    habitat: 'Ramen bar · Decumani', district: 'Centro Storico', when: day(0, 20, 30), capacity: 4,
    participants: ['u-giulia', 'u-irene'], vibes: ['Chiacchiere vere', 'Niente telefoni a tavola', 'Si divide tutto'],
    dilemma: users[0].dilemma, details: { cuisine: 'Giapponese', budget: '15–20 €' }, privacy: false, cost: 68, interested: ['u-chiara'], createdAt: now - 18 * H,
  },
  {
    id: 'p-nolan', hostId: 'u-sofia', title: 'Maratona Nolan in lingua originale', category: 'cinema', mode: 'local', city: 'Napoli',
    habitat: 'Cinema d’essai Chiaia', district: 'Chiaia', when: day(0, 21, 0), capacity: 5,
    participants: ['u-sofia', 'me', 'u-tommaso'], vibes: ['VO sottotitolata', 'Analisi post-film', 'Popcorn salati'],
    dilemma: users[2].dilemma, details: { film: 'Interstellar + Inception', language: 'Inglese · sub ITA' }, privacy: true, cost: 18, interested: [], createdAt: now - 45 * H,
  },
  {
    id: 'p-padel', hostId: 'u-marco', title: 'Manca il quarto a padel', category: 'sport', mode: 'local', city: 'Napoli',
    habitat: 'Padel Club Fuorigrotta', district: 'Fuorigrotta', when: day(1, 19, 0), capacity: 4,
    participants: ['u-marco', 'me', 'u-tommaso'], vibes: ['Competitivo ma chill', 'Birra post-partita'],
    dilemma: users[1].dilemma, details: { level: 'Intermedio (3.0–3.5)', missing: 1 }, privacy: false, cost: 40, interested: ['u-chiara', 'u-giulia'], createdAt: now - 39 * H,
  },
  {
    id: 'p-valorant', hostId: 'u-luca', title: 'Duo serale Valorant / Rocket League', category: 'gaming', mode: 'remote', city: 'Milano',
    habitat: 'Discord · PC', when: day(0, 22, 0), whenLabel: 'Ogni sera · 22:00', capacity: 2,
    participants: ['u-luca'], vibes: ['Zero tossicità', 'Mic on', 'Si ride anche perdendo'],
    dilemma: users[3].dilemma, details: { platform: 'PC · Discord', timezone: 'CET (UTC+1)' }, privacy: false, interested: [], createdAt: now - 6 * H,
  },
  {
    id: 'p-study', hostId: 'u-chiara', title: 'Coworking silenzioso in biblioteca', category: 'study', mode: 'local', city: 'Napoli',
    habitat: 'Biblioteca Nazionale', district: 'San Ferdinando', when: day(1, 15, 0), capacity: 6,
    participants: ['u-chiara', 'u-giulia'], vibes: ['Pomodoro 50/10', 'Caffè alle 17', 'Cuffie ok'],
    dilemma: users[4].dilemma, details: { studyMode: 'silenzioso' }, privacy: false, interested: [], createdAt: now - 3 * H,
  },
  {
    id: 'p-valencia', hostId: 'u-davide', title: 'Viaggio a Valencia a fine mese', category: 'travel', mode: 'remote', city: 'Roma',
    habitat: 'Valencia · 27–30 del mese', when: day(21, 9, 0), whenLabel: 'Fine mese · 4 giorni', capacity: 4,
    participants: ['u-davide', 'u-elena'], vibes: ['Paella vera', 'Tramonti alla Malvarrosa', 'Budget smart'],
    dilemma: users[5].dilemma, details: { destination: 'Valencia', budget: '350 € tutto incluso', timezone: 'CET' }, privacy: false, interested: [], createdAt: now - 26 * H,
  },
  {
    id: 'p-playlist', hostId: 'u-nina', title: 'Scambio playlist notturne · city pop & synth', category: 'music', mode: 'remote', city: 'Bologna',
    habitat: 'Spotify · vocali', when: day(0, 23, 30), whenLabel: 'Ogni notte dopo le 23', capacity: 6,
    participants: ['u-nina', 'u-luca', 'u-kenji'], vibes: ['Una canzone a testa', 'Note vocali', 'Niente giudizi (forse)'],
    dilemma: users[6].dilemma, details: { track: { title: 'Plastic Love', artist: 'Mariya Takeuchi', length: '7:54' }, platform: 'Spotify' }, privacy: false, interested: [], createdAt: now - 10 * H,
  },
  {
    id: 'p-books', hostId: 'u-kenji', title: 'Book club di mezzanotte: Murakami', category: 'books', mode: 'remote', city: 'Torino',
    habitat: 'Audio-capsule · asincrono', when: day(2, 0, 0), whenLabel: 'Domenica · 00:00', capacity: 5,
    participants: ['u-kenji', 'u-sofia'], vibes: ['Lento e profondo', 'Spoiler ammessi dal cap. 10'],
    dilemma: users[7].dilemma, details: { platform: 'Audio-capsule', timezone: 'CET' }, privacy: true, interested: [], createdAt: now - 30 * H,
  },
  {
    id: 'p-tapas', hostId: 'u-elena', title: 'Tour di tapas dove vanno i locali', category: 'food', mode: 'local', city: 'Barcellona',
    habitat: 'Gràcia · Plaça del Sol', district: 'Gràcia', when: day(30, 20, 0), whenLabel: 'Settembre · su richiesta', capacity: 6,
    participants: ['u-elena'], vibes: ['Napoletani benvenuti', 'Vermut alle 13', 'Spagnolo maccheronico ok'],
    dilemma: users[8].dilemma, details: { cuisine: 'Tapas', budget: '20–25 €', destination: 'Barcellona' }, privacy: false, interested: [], createdAt: now - 50 * H,
  },
  {
    id: 'p-sunset', hostId: 'u-tommaso', title: 'Camminata al tramonto a Posillipo', category: 'walk', mode: 'local', city: 'Napoli',
    habitat: 'Belvedere di Posillipo', district: 'Posillipo', when: day(1, 17, 45), capacity: 4,
    participants: ['u-tommaso', 'u-chiara', 'u-sofia', 'u-giulia'], vibes: ['Passo lento', 'Foto al belvedere', 'Gelato finale'],
    dilemma: users[9].dilemma, details: {}, privacy: false, confirmed: true, interested: [], createdAt: now - 20 * H,
  },
  {
    id: 'p-spritz', hostId: 'u-giulia', title: 'Spritz in Piazza Bellini', category: 'drink', mode: 'local', city: 'Napoli',
    habitat: 'Bar storico · Piazza Bellini', district: 'Centro Storico', when: day(-1, 19, 0), capacity: 5,
    participants: ['u-giulia', 'u-marco'], vibes: ['After work', 'Musica dal vivo'],
    dilemma: users[0].dilemma, details: { budget: '8 €' }, privacy: false, interested: [], createdAt: now - 70 * H,
  },
  {
    id: 'p-mine', hostId: 'me', title: 'Aperitivo vista mare sul Lungomare', category: 'drink', mode: 'local', city: 'Napoli',
    habitat: 'Lungomare Caracciolo', district: 'Chiaia', when: day(2, 19, 30), capacity: 4,
    participants: ['me'], vibes: ['Tramonto', 'Taralli e chiacchiere'],
    dilemma: { question: 'Sei su un’isola deserta con un solo album: quale porti?', options: [] }, details: { budget: '10 €' }, privacy: false, interested: ['u-sofia', 'u-tommaso', 'u-kenji'], createdAt: now - 2 * H,
  },
  {
    id: 'p-martina', hostId: 'u-martina', title: 'Passeggiata nei vicoli + pizza fritta', category: 'walk', mode: 'local', city: 'Napoli',
    habitat: 'Bar storico · Piazza Bellini', district: 'Centro Storico', when: day(0, 19, 0), capacity: 2,
    participants: ['u-martina'], vibes: ['Passo lento', 'Storie di affreschi', 'Pizza fritta finale'],
    dilemma: { question: 'Primo appuntamento: museo vuoto o mercato rumoroso?', options: ['Museo vuoto', 'Mercato rumoroso', 'Entrambi, in quest’ordine'] }, details: { budget: '6 €' }, privacy: true, interested: [], createdAt: now - 4 * H,
  },
  {
    id: 'p-federico', hostId: 'u-federico', title: 'Live acustico + birra artigianale', category: 'drink', mode: 'local', city: 'Napoli',
    habitat: 'Bar storico · Piazza Bellini', district: 'Centro Storico', when: day(1, 21, 30), capacity: 2,
    participants: ['u-federico'], vibes: ['Musica dal vivo', 'Niente small talk'],
    dilemma: { question: 'Concerto in prima fila o al bar in fondo a parlare?', options: ['Prima fila', 'Bar in fondo', 'Dipende dalla band'] }, details: { budget: '10 €' }, privacy: true, interested: [], createdAt: now - 7 * H,
  },
  {
    id: 'p-aurora', hostId: 'u-aurora', title: 'Stelle dal Belvedere (porto il telescopio)', category: 'walk', mode: 'local', city: 'Napoli',
    habitat: 'Belvedere di Posillipo', district: 'Posillipo', when: day(2, 22, 0), capacity: 3,
    participants: ['u-aurora'], vibes: ['Coperta e tè caldo', 'Domande grandi'],
    dilemma: { question: 'Se potessi vivere in un’altra epoca per un giorno, quale?', options: [] }, details: {}, privacy: true, interested: [], createdAt: now - 9 * H,
  },
  {
    id: 'p-samuele', hostId: 'u-samuele', title: 'Corsa all’alba alla Floridiana + colazione', category: 'sport', mode: 'local', city: 'Napoli',
    habitat: 'Parco della Floridiana', district: 'Vomero', when: day(1, 7, 0), capacity: 4,
    participants: ['u-samuele'], vibes: ['5 km tranquilli', 'Cornetto obbligatorio'],
    dilemma: { question: 'Alba in vetta o tramonto al mare?', options: ['Alba in vetta', 'Tramonto al mare'] }, details: { level: 'Principianti ok' }, privacy: false, cost: 12, interested: [], createdAt: now - 5 * H,
  },
  {
    id: 'p-irene', hostId: 'u-irene', title: 'Photo walk analogica al mercato', category: 'walk', mode: 'local', city: 'Napoli',
    habitat: 'Mercato di Porta Nolana', district: 'Porta Nolana', when: day(3, 10, 30), capacity: 3,
    participants: ['u-irene'], vibes: ['Rullino condiviso', 'Ramen dopo'],
    dilemma: { question: 'Una foto che non hai mai scattato ma ricordi benissimo?', options: [] }, details: {}, privacy: true, interested: [], createdAt: now - 12 * H,
  },
  {
    id: 'p-omar', hostId: 'u-omar', title: 'Pen-pal di vocali: libri & caffè', category: 'talk', mode: 'remote', city: 'Milano',
    habitat: 'Audio-capsule · asincrono', when: day(0, 23, 0), whenLabel: 'Quando vuoi, di notte', capacity: 2,
    participants: ['u-omar'], vibes: ['Vocali lunghi', 'Un libro a settimana'],
    dilemma: { question: 'La città dove vivresti domani, senza pensarci?', options: ['Lisbona', 'Tokyo', 'Napoli, ovvio'] }, details: { platform: 'Audio-capsule', timezone: 'CET' }, privacy: true, interested: [], createdAt: now - 15 * H,
  },
  {
    id: 'p-lea', hostId: 'u-lea', title: 'Scambio città: tu mi racconti Napoli, io Lisbona', category: 'travel', mode: 'remote', city: 'Lisbona',
    habitat: 'Vocali · Spotify', when: day(5, 21, 0), whenLabel: 'Questa settimana', capacity: 2,
    participants: ['u-lea'], vibes: ['Una canzone a testa', 'Magari un volo'],
    dilemma: { question: 'Mi mandi una canzone che sa di estate senza dire il titolo?', options: [] }, details: { destination: 'Lisbona', timezone: 'WET (UTC+0)' }, privacy: true, interested: [], createdAt: now - 20 * H,
  },
  {
    id: 'p-calcetto', hostId: 'u-matteo', title: 'Calcetto del sabato, mancano due', category: 'sport', mode: 'local', city: 'Napoli',
    habitat: 'Palestra Vomero Fit', district: 'Vomero', when: day(2, 15, 30), capacity: 10,
    participants: ['u-matteo', 'u-gaia'], vibes: ['Squadre miste', 'Merenda dopo'],
    dilemma: { question: 'Rigore decisivo: tiri centrale o all’angolo?', options: ['Centrale', 'All’angolo', 'Lo lascio tirare a un altro'] }, details: { level: 'Tutti i livelli' }, privacy: false, interested: [], createdAt: now - 6 * H,
  },
  {
    id: 'p-disegno', hostId: 'u-ludovica', title: 'Disegno al parco + gelato', category: 'walk', mode: 'local', city: 'Napoli',
    habitat: 'Parco della Floridiana', district: 'Vomero', when: day(1, 16, 0), capacity: 5,
    participants: ['u-ludovica'], vibes: ['Porta il tuo album', 'Gelato alle 18'],
    dilemma: { question: 'Supereroe o cattivo dei fumetti: chi saresti?', options: ['Supereroe', 'Cattivo con buone ragioni'] }, details: {}, privacy: false, interested: [], createdAt: now - 8 * H,
  },
]

const msg = (from: string, text: string, at: number, extra: Partial<Chat['messages'][number]> = {}) => ({
  id: `m-${Math.random().toString(36).slice(2, 9)}`, from, kind: 'text' as const, text, at, ...extra,
})

const chats = (now: number): Chat[] => [
  {
    id: 'c-ramen', planId: 'p-ramen', peerIds: ['u-giulia'], mode: 'local', title: 'Ramen tonkotsu ai Decumani', status: 'evolved', closedReason: 'Evoluta dal vivo',
    createdAt: now - 60 * H, deadline: now - 12 * H, clockStopped: true, unread: 0,
    messages: [
      { id: 'm1', from: 'me', kind: 'dilemma', question: users[0].dilemma.question, text: 'Panna. Non si discute.', at: now - 18 * H },
      msg('u-giulia', 'Risposta corretta, sei dentro 😂 Ramen stasera alle 20:30?', now - 17.8 * H),
      msg('me', 'Perfetto! Tonkotsu o shoyu per te?', now - 17.6 * H),
      msg('u-giulia', 'Tonkotsu, sempre. Ho prenotato per 4, mancano ancora due persone ✨', now - 2 * H),
      { id: 'm1b', from: 'system', kind: 'system', text: 'Missione compiuta: vi vedete dal vivo / contatti scambiati. Slot liberato 🎉', at: now - 1.5 * H },
    ],
  },
  {
    id: 'c-padel', planId: 'p-padel', peerIds: ['u-marco', 'u-tommaso'], mode: 'local', title: 'Manca il quarto a padel', status: 'active',
    createdAt: now - 39 * H, deadline: now - 39 * H + 48 * H, unread: 2,
    messages: [
      { id: 'm2', from: 'me', kind: 'dilemma', question: users[1].dilemma.question, text: 'Birra? Offro io', at: now - 39 * H },
      msg('u-marco', 'Questo è lo spirito giusto 🍻 Campo prenotato domani alle 19.', now - 38.5 * H),
      msg('u-tommaso', 'Io porto le palline nuove. Livello? Io sono un 3.0 generoso', now - 38 * H),
      { id: 'm3', from: 'u-marco', kind: 'voice', duration: 14, wave: [3, 6, 9, 5, 8, 10, 7, 4, 6, 9, 5, 3, 7, 8, 4, 6, 9, 7, 5, 3], at: now - 2.5 * H },
      msg('u-marco', 'Il campo costa 40€, dividiamo. Manca ancora il quarto!', now - 2.4 * H),
    ],
  },
  {
    id: 'c-nolan', planId: 'p-nolan', peerIds: ['u-sofia', 'u-tommaso'], mode: 'local', title: 'Maratona Nolan in lingua originale', status: 'active',
    createdAt: now - 45 * H, deadline: now - 45 * H + 48 * H, unread: 0,
    messages: [
      { id: 'm4', from: 'me', kind: 'dilemma', question: users[2].dilemma.question, text: 'Mi perdo apposta e cerco il cinema più vecchio della città', at: now - 45 * H },
      msg('u-sofia', 'Ok questa risposta mi piace troppo. Interstellar o Inception per primo?', now - 44 * H),
      msg('me', 'Inception, così Interstellar ci distrugge per ultimo', now - 43.5 * H),
    ],
  },
  {
    id: 'c-luca', peerIds: ['u-luca'], mode: 'remote', title: 'Ha risposto al tuo dilemma del profilo', status: 'waiting',
    createdAt: now - 3 * H, unread: 0, incoming: { question: 'Sei su un’isola deserta con un solo album: quale porti?', answer: 'Random Access Memories. Ma solo se c’è un Wi-Fi per Valorant.' },
    messages: [],
  },
  {
    id: 'c-tommaso', planId: 'p-mine', peerIds: ['u-tommaso'], mode: 'local', title: 'Aperitivo vista mare sul Lungomare', status: 'waiting',
    createdAt: now - 1 * H, unread: 0, incoming: { question: 'Sei su un’isola deserta con un solo album: quale porti?', answer: 'Terra mia di Pino Daniele. Per non sentire mai nostalgia di casa.' },
    messages: [],
  },
  {
    id: 'c-old', planId: 'p-spritz', peerIds: ['u-marco'], mode: 'local', title: 'Spritz in Piazza Bellini', status: 'closed', closedReason: 'Chiusura con eleganza',
    createdAt: now - 70 * H, deadline: now - 22 * H, unread: 0,
    messages: [
      msg('u-marco', 'Ehi! Ci sei per lo spritz?', now - 69 * H),
      { id: 'm5', from: 'me', kind: 'farewell', text: 'È stato un piacere, ma non sento la scintilla giusta. Buona fortuna! ✨', at: now - 60 * H },
    ],
  },
]

const MY_DILEMMA = 'Sei su un’isola deserta con un solo album: quale porti?'

export const DEMO_VERSION = 5

export const todayKey = () => new Date().toLocaleDateString('sv-SE')
export const DAILY_LIMIT = 20

export function createInitialState(): AppState {
  const now = Date.now()
  return {
    version: DEMO_VERSION,
    me: createMe(),
    users: Object.fromEntries(users.map((u) => [u.id, u])),
    plans: plans(now),
    chats: chats(now),
    saved: ['p-valencia'],
    lifetime: false,
    stats: { replyTimes: [42, 95, 60, 30], voiceSent: 2, textSent: 7, elegantCloses: 1, ghosted: 0, clocksStopped: 0 },
    travelDestinations: [],
    onboarded: false,
    swipes: {},
    swipeHistory: [],
    likesIn: [
      { id: 'l-1', userId: 'u-federico', question: MY_DILEMMA, answer: 'Un live dei Daft Punk. Così se mi annoio ballo da solo sulla spiaggia.', at: now - 40 * M, status: 'new' },
      { id: 'l-2', userId: 'u-aurora', question: MY_DILEMMA, answer: 'Kind of Blue. Di notte, con le stelle, non serve altro.', at: now - 3 * H, status: 'new' },
      { id: 'l-3', userId: 'u-omar', question: MY_DILEMMA, answer: 'Un disco di Pino Daniele. Tanto prima o poi passo da Napoli.', at: now - 9 * H, status: 'new' },
    ],
    likesOut: [],
    prefs: { intent: 'date', show: 'all', ageMin: 20, ageMax: 35, readReceipts: true, typingIndicator: true },
    savedBy: ['u-irene', 'u-samuele', 'u-lea'],
    daily: { day: todayKey(), seen: 0, answered: 0, matches: 0 },
    blocked: [],
    reports: [],
  }
}

export const TEMPLATES: Array<{ label: string; title: string; category: Plan['category']; mode: Plan['mode']; capacity: number; emoji: string }> = [
  { label: 'Un caffè', title: 'Un caffè e due chiacchiere', category: 'drink', mode: 'local', capacity: 2, emoji: '☕' },
  { label: 'Manca il quarto a padel', title: 'Manca il quarto a padel', category: 'sport', mode: 'local', capacity: 4, emoji: '🎾' },
  { label: 'Studio insieme', title: 'Studio insieme in biblioteca', category: 'study', mode: 'local', capacity: 4, emoji: '📚' },
  { label: 'Cinema in VO', title: 'Cinema in lingua originale', category: 'cinema', mode: 'local', capacity: 4, emoji: '🎬' },
  { label: 'Duo gaming', title: 'Duo gaming serale', category: 'gaming', mode: 'remote', capacity: 2, emoji: '🎮' },
  { label: 'Cena fuori', title: 'Cena in trattoria', category: 'food', mode: 'local', capacity: 6, emoji: '🍝' },
]

export const PRESET_DILEMMAS = [
  'Hai 2 ore libere in una città sconosciuta senza telefono: cosa fai?',
  'Se prendiamo una pizza, cosa non deve MAI esserci sopra?',
  'Il film che hai visto più volte senza vergognarti?',
  'Alba o tramonto? E perché proprio quello?',
  'Una cosa che sai fare benissimo e nessuno se lo aspetta?',
]

export const DILEMMA_LIST: Array<{ tone: string; items: string[] }> = [
  {
    tone: 'Divertenti',
    items: [
      'Se prendiamo una pizza, cosa non deve MAI esserci sopra?',
      'Sei su un’isola deserta con un solo album: quale porti?',
      'Il film che hai visto più volte senza vergognarti?',
      'Superpotere inutile ma bellissimo: quale scegli?',
    ],
  },
  {
    tone: 'Profondi',
    items: [
      'Hai 2 ore libere in una città sconosciuta senza telefono: cosa fai?',
      'Una cosa che sai fare benissimo e nessuno se lo aspetta?',
      'Il consiglio più utile che hai ricevuto?',
      'Alba o tramonto? E perché proprio quello?',
    ],
  },
  {
    tone: 'Napoletani',
    items: [
      'Pizza fritta o margherita al forno a legna?',
      'Lungomare a piedi o funicolare per il Vomero?',
      'Sfogliatella riccia o frolla? Pensaci bene.',
      'La canzone napoletana che canti sotto la doccia?',
    ],
  },
  {
    tone: 'Per uscire',
    items: [
      'Primo incontro: museo vuoto o mercato rumoroso?',
      'Piano preciso o improvvisazione totale?',
      'Colazione lunga o aperitivo al tramonto?',
      'Concerto in prima fila o al bar in fondo a parlare?',
    ],
  },
]

/** Sample answers per dilemma, used for simulated incoming likes after onboarding. */
export const SAMPLE_ANSWERS: Record<string, string[]> = {
  'Se prendiamo una pizza, cosa non deve MAI esserci sopra?': ['L’ananas. Su questo non si tratta.', 'La panna. Chi la mette va denunciato.'],
  'Sei su un’isola deserta con un solo album: quale porti?': ['Kind of Blue, per le notti lunghe.', 'Un best of di Pino Daniele, per non sentire nostalgia.'],
  'Il film che hai visto più volte senza vergognarti?': ['Ritorno al futuro. Almeno venti volte.', 'Il favoloso mondo di Amélie, ogni inverno.'],
  'Superpotere inutile ma bellissimo: quale scegli?': ['Trovare sempre parcheggio al primo giro.', 'Sapere sempre che ore sono senza guardare.'],
  'Hai 2 ore libere in una città sconosciuta senza telefono: cosa fai?': ['Cerco un mercato e mangio quello che mangiano i locali.', 'Mi siedo in un bar e attacco bottone con chi c’è.'],
  'Una cosa che sai fare benissimo e nessuno se lo aspetta?': ['Il ragù della domenica, alla napoletana vera.', 'Fischiare con due dita, fortissimo.'],
  'Il consiglio più utile che hai ricevuto?': ['Chiedi sempre, il no ce l’hai già.', 'Non rispondere alle email quando sei arrabbiat*.'],
  'Alba o tramonto? E perché proprio quello?': ['Tramonto, perché la giornata è ancora tutta da raccontare.', 'Alba: la città è tua e nessuno ti disturba.'],
  'Pizza fritta o margherita al forno a legna?': ['Fritta, con la ricotta. Senza discussioni.', 'Margherita, ma solo se il cornicione è giusto.'],
  'Lungomare a piedi o funicolare per il Vomero?': ['Lungomare, fino a Mergellina.', 'Funicolare, e poi panorama da Sant’Elmo.'],
  'Sfogliatella riccia o frolla? Pensaci bene.': ['Riccia, calda, con lo zucchero a velo dappertutto.', 'Frolla. So che è impopolare.'],
  'La canzone napoletana che canti sotto la doccia?': ['Napule è, tutta, anche gli assoli.', 'Malafemmena, con la voce impostata.'],
  'Primo incontro: museo vuoto o mercato rumoroso?': ['Mercato rumoroso, poi museo per riposarsi.', 'Museo vuoto: si parla meglio.'],
  'Piano preciso o improvvisazione totale?': ['Piano preciso, ma con un buco per l’imprevisto.', 'Improvvisazione, e un posto di riserva.'],
  'Colazione lunga o aperitivo al tramonto?': ['Aperitivo, con il mare davanti.', 'Colazione lunga, la domenica è sacra.'],
  'Concerto in prima fila o al bar in fondo a parlare?': ['Prima fila, voglio sentire il basso nello stomaco.', 'Al bar in fondo: le chiacchiere migliori.'],
}

export const FAREWELL = 'È stato un piacere conoscerti, ma non sento la scintilla giusta. Ti auguro il meglio!'

export const FAREWELLS = [
  { label: 'Non sento la scintilla', text: 'È stato un piacere conoscerti, ma non sento la scintilla giusta. Ti auguro il meglio!' },
  { label: 'Non è il momento giusto', text: 'Mi ha fatto piacere parlare con te, ma non è il momento giusto per me. Buona fortuna!' },
  { label: 'Cerchiamo cose diverse', text: 'Credo che cerchiamo cose diverse, e preferisco dirtelo subito. In bocca al lupo!' },
]

export const AUTO_REPLIES: Record<string, string[]> = {
  generic: [
    'Ahah mi piace come ragioni 😄',
    'Ok, segnato! Dimmi tu l’orario che ti torna meglio.',
    'Top. Ci vediamo lì direttamente o ci becchiamo prima?',
    'Vero! Io intanto avviso gli altri della crew.',
    'Ti mando un vocale appena esco da lavoro 🎙️',
    'Per me perfetto, fermiamo il timer quando siamo tutti d’accordo?',
  ],
  remote: [
    'Ti lascio una capsula audio stanotte 🌙',
    'Questa me la salvo. Tu cosa stai ascoltando adesso?',
    'Domanda seria: qual è la tua ora preferita della giornata?',
    'Ok ora mi hai incuriosito, raccontami di più.',
  ],
  dilemma: [
    'Risposta approvata ✅ Benvenut* nella crew!',
    'Ahah questa non me l’aspettavo. Sei dentro!',
    'Ok mi hai convinto in una riga. Parliamone!',
  ],
}

export const INCOMING_POOL: Array<{ userId: string; answer: string }> = [
  { userId: 'u-kenji', answer: 'Kind of Blue di Miles Davis. Per le notti lunghe sull’isola.' },
  { userId: 'u-nina', answer: 'Un best of di city pop giapponese, così il tramonto ha la colonna sonora.' },
  { userId: 'u-chiara', answer: 'Folklore di Taylor Swift. Non giudicatemi, è per studiare.' },
  { userId: 'u-davide', answer: 'Buena Vista Social Club, così mi sembra di essere a Cuba.' },
  { userId: 'u-tommaso', answer: 'Lucio Dalla, live. Per cantare da solo senza vergogna.' },
]

export { H, M }
