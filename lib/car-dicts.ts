// Справочники для карточки машины: марки (подсказки при вводе) и стандартные цвета (кружки).
// aliases — как марку пишут/говорят по-русски, чтобы «мерс» или «тойота» тоже находили нужное.
export const BRANDS: { name: string; aliases?: string[] }[] = [
    { name: 'Audi', aliases: ['ауди'] }, { name: 'Avatr', aliases: ['аватр'] }, { name: 'BAIC', aliases: ['баик'] },
    { name: 'Belgee', aliases: ['белджи'] }, { name: 'Bentley', aliases: ['бентли'] }, { name: 'BMW', aliases: ['бмв', 'бэха'] },
    { name: 'BYD', aliases: ['бид', 'буд'] }, { name: 'Cadillac', aliases: ['кадиллак'] }, { name: 'Changan', aliases: ['чанган'] },
    { name: 'Chery', aliases: ['чери'] }, { name: 'Chevrolet', aliases: ['шевроле', 'шеви'] }, { name: 'Citroen', aliases: ['ситроен'] },
    { name: 'Daewoo', aliases: ['дэу'] }, { name: 'Denza', aliases: ['денза'] }, { name: 'Dongfeng', aliases: ['донгфенг'] },
    { name: 'Exeed', aliases: ['эксид'] }, { name: 'FAW', aliases: ['фав'] }, { name: 'Ferrari', aliases: ['феррари'] },
    { name: 'Fiat', aliases: ['фиат'] }, { name: 'Ford', aliases: ['форд'] }, { name: 'GAC', aliases: ['гак'] },
    { name: 'Geely', aliases: ['джили'] }, { name: 'Genesis', aliases: ['генезис'] }, { name: 'Great Wall', aliases: ['грейт волл'] },
    { name: 'Haval', aliases: ['хавейл', 'хавал'] }, { name: 'Honda', aliases: ['хонда'] }, { name: 'Hongqi', aliases: ['хончи', 'хунцы'] },
    { name: 'Hyundai', aliases: ['хендай', 'хундай', 'хёндэ'] }, { name: 'Infiniti', aliases: ['инфинити'] }, { name: 'JAC', aliases: ['джак'] },
    { name: 'Jaecoo', aliases: ['джейку'] }, { name: 'Jaguar', aliases: ['ягуар'] }, { name: 'Jeep', aliases: ['джип'] },
    { name: 'Jetour', aliases: ['джетур'] }, { name: 'Kaiyi', aliases: ['каи'] }, { name: 'Kia', aliases: ['киа'] },
    { name: 'Lada', aliases: ['лада', 'ваз', 'жигули'] }, { name: 'Lamborghini', aliases: ['ламборгини'] }, { name: 'Land Rover', aliases: ['ленд ровер', 'рендж'] },
    { name: 'Lexus', aliases: ['лексус'] }, { name: 'Li Auto', aliases: ['лисян', 'lixiang', 'ли'] }, { name: 'Livan', aliases: ['ливан'] },
    { name: 'Lynk & Co', aliases: ['линк'] }, { name: 'Maserati', aliases: ['мазерати'] }, { name: 'Mazda', aliases: ['мазда'] },
    { name: 'Mercedes', aliases: ['мерседес', 'мерс', 'mercedes-benz'] }, { name: 'Mini', aliases: ['мини'] }, { name: 'Mitsubishi', aliases: ['митсубиси', 'мицубиси'] },
    { name: 'Moskvich', aliases: ['москвич'] }, { name: 'Nissan', aliases: ['ниссан'] }, { name: 'Omoda', aliases: ['омода'] },
    { name: 'Opel', aliases: ['опель'] }, { name: 'Peugeot', aliases: ['пежо'] }, { name: 'Porsche', aliases: ['порше'] },
    { name: 'Renault', aliases: ['рено'] }, { name: 'Rolls-Royce', aliases: ['роллс'] }, { name: 'Skoda', aliases: ['шкода'] },
    { name: 'Solaris', aliases: ['солярис'] }, { name: 'Subaru', aliases: ['субару'] }, { name: 'Suzuki', aliases: ['сузуки'] },
    { name: 'Tank', aliases: ['танк'] }, { name: 'Tenet', aliases: ['тенет'] }, { name: 'Tesla', aliases: ['тесла'] },
    { name: 'Toyota', aliases: ['тойота'] }, { name: 'UAZ', aliases: ['уаз'] }, { name: 'GAZ', aliases: ['газ', 'газель'] },
    { name: 'Volkswagen', aliases: ['фольксваген', 'фольц', 'vw'] }, { name: 'Volvo', aliases: ['вольво'] }, { name: 'Voyah', aliases: ['воя'] },
    { name: 'Xpeng', aliases: ['икспенг'] }, { name: 'Zeekr', aliases: ['зикр'] },
]
// Марки пишем коротко: «Mercedes», а не «Mercedes-Benz» (так ввёл бы мастер и так короче в списке)
const SHORT_BRANDS: Record<string, string> = { 'mercedes-benz': 'Mercedes', 'mercedes benz': 'Mercedes', 'мерседес-бенц': 'Mercedes', 'мерседес': 'Mercedes' }
export const shortBrand = (b: string) => SHORT_BRANDS[b.trim().toLowerCase()] ?? b.trim()
export function suggestBrands(q: string, limit = 6) {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const starts = BRANDS.filter((b) => b.name.toLowerCase().startsWith(s) || b.aliases?.some((a) => a.startsWith(s)))
    const inside = s.length < 2 ? [] : BRANDS.filter((b) => !starts.includes(b) && b.name.toLowerCase().includes(s))
    return [...starts, ...inside].map((b) => b.name).filter((n) => n.toLowerCase() !== s).slice(0, limit)
}

export const COLORS: { name: string; hex: string }[] = [
    { name: 'белый', hex: '#F4F4F2' }, { name: 'чёрный', hex: '#151515' }, { name: 'серебристый', hex: '#C3C8CD' },
    { name: 'серый', hex: '#7D848B' }, { name: 'графитовый', hex: '#3E444B' }, { name: 'синий', hex: '#2D58C8' }, { name: 'голубой', hex: '#6EC1F0' },
    { name: 'красный', hex: '#D33A2F' }, { name: 'бордовый', hex: '#7A1E2A' }, { name: 'зелёный', hex: '#2E8B57' },
    { name: 'жёлтый', hex: '#F2C94C' }, { name: 'оранжевый', hex: '#EE8A2A' }, { name: 'коричневый', hex: '#74492B' },
    { name: 'бежевый', hex: '#D8C29E' }, { name: 'золотистый', hex: '#C8A24C' }, { name: 'фиолетовый', hex: '#7B4FC9' },
]
const n = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')
export const colorHex = (name: string) => COLORS.find((c) => n(c.name) === n(name))?.hex

// Модели по маркам — подсказки в поле «Модель» с первых букв. Самые ходовые в России первыми.
// В скобках после «|» — как модель говорят по-русски (камри, солярис), чтобы находилось и так.
const M: Record<string, string> = {
    'Audi': 'A4|а4, A6|а6, Q5|ку5, Q7|ку7, A3, A5, A8, Q3, Q8, e-tron|етрон, TT, RS6',
    'Avatr': '11, 12, 07',
    'BAIC': 'X35, X55, X7, U5 Plus, BJ40',
    'Belgee': 'X50, X70',
    'Bentley': 'Bentayga, Continental GT, Flying Spur',
    'BMW': 'X5|икс5, 3 Series|трешка, 5 Series|пятерка, X3|икс3, X6|икс6, X7, X1, 7 Series|семерка, X4, M5, i3, iX, i4, 1 Series, 2 Series, 4 Series, M3',
    'BYD': 'Song Plus|сонг, Han|хан, Tang|танг, Seal|сил, Atto 3, Qin Plus, Dolphin, Seagull, Yuan Plus, Song L',
    'Cadillac': 'Escalade|эскалейд, XT5, XT6, CT6, Lyriq',
    'Changan': 'CS35 Plus, CS55 Plus, CS75 Plus, UNI-K, UNI-V, UNI-T, Alsvin, Hunter, Lamore, Eado',
    'Chery': 'Tiggo 7 Pro|тигго 7, Tiggo 4 Pro|тигго 4, Tiggo 8 Pro|тигго 8, Tiggo 9, Arrizo 8, Tiggo 2',
    'Chevrolet': 'Cruze|круз, Niva|нива, Aveo|авео, Lacetti|лачетти, Cobalt, Captiva, Tahoe|тахо, Spark, Camaro, Malibu, Orlando, Trailblazer',
    'Citroen': 'C4, C5 Aircross, C3, Berlingo, C-Elysee, Jumpy',
    'Daewoo': 'Nexia|нексия, Matiz|матиз, Gentra, Lanos',
    'Denza': 'D9, N7, N8',
    'Dongfeng': 'Shine Max, 580, AX7, Box, Huge',
    'Exeed': 'TXL, LX, VX, RX',
    'FAW': 'Bestune T77, Bestune T99, Bestune B70',
    'Ferrari': 'Roma, Purosangue, 296, F8, SF90',
    'Fiat': 'Ducato|дукато, Doblo, Panda, 500',
    'Ford': 'Focus|фокус, Mondeo|мондео, Kuga|куга, Fiesta|фиеста, Transit|транзит, Explorer|эксплорер, EcoSport, Mustang, Ranger, Galaxy, S-Max',
    'GAC': 'GS8, GS3, GN8, M8, Emkoo, Empow',
    'Geely': 'Monjaro|монжаро, Coolray|кулрей, Atlas Pro|атлас, Tugella|тугелла, Emgrand|эмгранд, Okavango, Preface, Cityray, Galaxy',
    'Genesis': 'G80, GV80, G70, GV70, G90',
    'Great Wall': 'Poer|поер, Wingle, Hover',
    'Haval': 'Jolion|джолион, F7|ф7, Dargo|дарго, H6, F7x, H9, M6, H3',
    'Honda': 'CR-V|црв, Civic|цивик, Accord|аккорд, Pilot, Fit, HR-V, Stepwgn, Freed, Vezel, Odyssey',
    'Hongqi': 'H5, HS5, E-HS9, H9, HQ9',
    'Hyundai': 'Solaris|солярис, Creta|крета, Tucson|туссан, Santa Fe|санта фе, Elantra|элантра, Sonata|соната, i30, ix35, Palisade, Getz|гетц, Accent|акцент, Starex|старекс, Staria',
    'Infiniti': 'QX50, QX60, QX80, FX35, FX37, QX70, Q50',
    'JAC': 'J7, JS4, JS6, T6, T8, S3, N56',
    'Jaecoo': 'J7, J8',
    'Jaguar': 'F-Pace, XF, XE, E-Pace, F-Type, XJ',
    'Jeep': 'Grand Cherokee|чероки, Wrangler|вранглер, Compass, Cherokee, Renegade',
    'Jetour': 'Dashing, X70 Plus, X90 Plus, T2, Traveller',
    'Kaiyi': 'E5, X3 Pro, X7',
    'Kia': 'Rio|рио, Sportage|спортейдж, Ceed|сид, Optima|оптима, K5, Sorento|соренто, Seltos|селтос, Cerato|церато, Soul|соул, Carnival, Mohave, Stinger, Picanto',
    'Lada': 'Vesta|веста, Granta|гранта, Niva|нива, Largus|ларгус, XRAY|иксрей, Priora|приора, Kalina|калина, 2107|семерка, 2114|четырка, 2110|десятка, Niva Travel, Iskra|искра',
    'Lamborghini': 'Urus|урус, Huracan, Aventador, Revuelto',
    'Land Rover': 'Range Rover|рендж ровер, Range Rover Sport, Range Rover Evoque|эвок, Range Rover Velar|велар, Discovery|дискавери, Defender|дефендер, Freelander|фрилендер, Discovery Sport',
    'Lexus': 'RX|рх, LX|лх, NX|нх, ES, GX, IS, LS, UX, RX350, LX570',
    'Li Auto': 'L7, L9, L8, L6, Li One, Mega',
    'Livan': 'X3 Pro, X6 Pro, S6 Pro',
    'Lynk & Co': '01, 05, 06, 08, 09',
    'Maserati': 'Levante, Ghibli, Quattroporte, Grecale, MC20',
    'Mazda': '6|шестерка, CX-5|сх5, 3|тройка, CX-9, CX-30, CX-7, CX-60, MX-5, 2',
    'Mercedes': 'E-Class|ешка, C-Class|цешка, S-Class|эска, GLE, GLC, G-Class|гелик, GLS, ML, GL, A-Class, B-Class, CLA, CLS, GLA, GLB, V-Class|виано, Vito|вито, Sprinter|спринтер, EQS, EQE, Maybach',
    'Mini': 'Cooper|купер, Countryman, Clubman',
    'Mitsubishi': 'Outlander|аутлендер, Pajero|паджеро, Lancer|лансер, ASX, L200, Pajero Sport, Eclipse Cross, Galant, Delica',
    'Moskvich': '3, 3e, 6',
    'Nissan': 'Qashqai|кашкай, X-Trail|икстрейл, Almera|альмера, Teana|теана, Juke|жук, Murano|мурано, Patrol|патрол, Note, Tiida, Terrano|террано, Pathfinder, Leaf|лиф, Navara, Micra, Serena',
    'Omoda': 'C5, S5, C7',
    'Opel': 'Astra|астра, Corsa|корса, Insignia|инсигния, Mokka|мокка, Zafira|зафира, Vectra|вектра, Antara, Meriva',
    'Peugeot': '308, 408, 3008, 5008, 208, 2008, 508, Partner, Boxer|боксер',
    'Porsche': 'Cayenne|каен, Macan|макан, Panamera|панамера, 911, Taycan|тайкан, Boxster, Cayman',
    'Renault': 'Logan|логан, Duster|дастер, Sandero|сандеро, Kaptur|каптюр, Arkana|аркана, Megane|меган, Fluence|флюенс, Koleos, Symbol, Kangoo, Scenic',
    'Rolls-Royce': 'Cullinan, Ghost, Phantom, Wraith, Spectre',
    'Skoda': 'Octavia|октавия, Rapid|рапид, Kodiaq|кодиак, Karoq, Superb|суперб, Fabia|фабия, Yeti|йети, Kamiq',
    'Solaris': 'HS, KRS, KRX, HC',
    'Subaru': 'Forester|форестер, Outback|аутбек, XV, Impreza|импреза, Legacy, Tribeca, WRX',
    'Suzuki': 'Vitara|витара, Grand Vitara, SX4, Jimny|джимни, Swift, Liana',
    'Tank': '300, 500, 400, 700',
    'Tenet': 'T4, T7, T8',
    'Tesla': 'Model 3|модель 3, Model Y|модель у, Model S, Model X, Cybertruck',
    'Toyota': 'Camry|камри, RAV4|рав4, Land Cruiser|крузак, Land Cruiser Prado|прадо, Corolla|королла, Highlander|хайлендер, Hilux|хайлюкс, Prius|приус, Alphard|альфард, Avensis|авенсис, Auris, Fortuner, C-HR, Yaris, Mark II|марк 2, Crown, Harrier, Sequoia, Tundra',
    'UAZ': 'Patriot|патриот, Hunter|хантер, Буханка|буханка, Профи, Pickup',
    'GAZ': 'Газель Next|газель, Газель Бизнес, Соболь|соболь, Валдай, Газон Next',
    'Volkswagen': 'Polo|поло, Tiguan|тигуан, Passat|пассат, Golf|гольф, Jetta|джетта, Touareg|туарег, Teramont|терамонт, Transporter|транспортер, Multivan|мультивэн, Caddy|кадди, Amarok, ID.4, ID.6, Taos, Arteon, Crafter',
    'Volvo': 'XC90, XC60, XC40, S60, S90, V60, V90, S80',
    'Voyah': 'Free, Dream, Passion, Courage',
    'Xpeng': 'G9, P7, G6, X9',
    'Zeekr': '001, 007, 009, 7X, X, 001 FR',
}
export type ModelHint = { brand: string; model: string; aliases: string[] }
export const MODELS: ModelHint[] = Object.entries(M).flatMap(([brand, list]) =>
    list.split(',').map((x) => { const [model, ...al] = x.trim().split('|'); return { brand, model, aliases: al } }))

// Подсказки модели: по выбранной марке (или по всем, если марка ещё не указана — тогда подставим и марку).
// known — модели, которые уже есть в базе гаража: их показываем первыми.
export function suggestModels(q: string, brand: string, known: { brand: string; model: string }[] = [], limit = 6) {
    const s = q.trim().toLowerCase()
    const b = brand.trim().toLowerCase()
    const pool: ModelHint[] = [...known.map((k) => ({ ...k, aliases: [] })), ...MODELS]
    const sameBrand = (h: ModelHint) => !b || h.brand.toLowerCase() === b
    const seen = new Set<string>()
    const uniq = (h: ModelHint) => { const k = `${h.brand}|${h.model}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }
    if (!s) return b ? pool.filter(sameBrand).filter(uniq).slice(0, limit) : [] // марка выбрана — сразу показать популярные
    const words = (t: string) => t.toLowerCase().split(/[\s-]+/)
    const starts = pool.filter((h) => sameBrand(h) && (h.model.toLowerCase().startsWith(s) || words(h.model).some((w) => w.startsWith(s)) || h.aliases.some((a) => a.startsWith(s))))
    // точное совпадение — первым; при выбранной марке его не показываем (уже вписано), без марки — нужно, чтобы подставить марку
    const exact = (h: ModelHint) => h.model.toLowerCase() === s
    return [...starts.filter(exact), ...starts.filter((h) => !exact(h))].filter(uniq).filter((h) => !b || !exact(h)).slice(0, limit)
}
