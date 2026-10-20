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
    { name: 'Mercedes-Benz', aliases: ['мерседес', 'мерс'] }, { name: 'Mini', aliases: ['мини'] }, { name: 'Mitsubishi', aliases: ['митсубиси', 'мицубиси'] },
    { name: 'Moskvich', aliases: ['москвич'] }, { name: 'Nissan', aliases: ['ниссан'] }, { name: 'Omoda', aliases: ['омода'] },
    { name: 'Opel', aliases: ['опель'] }, { name: 'Peugeot', aliases: ['пежо'] }, { name: 'Porsche', aliases: ['порше'] },
    { name: 'Renault', aliases: ['рено'] }, { name: 'Rolls-Royce', aliases: ['роллс'] }, { name: 'Skoda', aliases: ['шкода'] },
    { name: 'Solaris', aliases: ['солярис'] }, { name: 'Subaru', aliases: ['субару'] }, { name: 'Suzuki', aliases: ['сузуки'] },
    { name: 'Tank', aliases: ['танк'] }, { name: 'Tenet', aliases: ['тенет'] }, { name: 'Tesla', aliases: ['тесла'] },
    { name: 'Toyota', aliases: ['тойота'] }, { name: 'UAZ', aliases: ['уаз'] }, { name: 'GAZ', aliases: ['газ', 'газель'] },
    { name: 'Volkswagen', aliases: ['фольксваген', 'фольц', 'vw'] }, { name: 'Volvo', aliases: ['вольво'] }, { name: 'Voyah', aliases: ['воя'] },
    { name: 'Xpeng', aliases: ['икспенг'] }, { name: 'Zeekr', aliases: ['зикр'] },
]
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
