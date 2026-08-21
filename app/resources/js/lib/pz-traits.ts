/**
 * Project Zomboid Traits metadata & authentic PZwiki icons resolver.
 */

export interface TraitDefinition {
    label: string;
    type: 'positive' | 'negative' | 'neutral';
    desc?: string;
    icon?: string;
}

export const PZ_TRAITS: Record<string, TraitDefinition> = {
    // === Positive Traits ===
    adrenalinejunkie: {
        label: 'Nghiện Adrenaline (Adrenaline Junkie)',
        type: 'positive',
        desc: 'Chạy nhanh hơn khi cực kỳ hoảng sợ',
        icon: '/images/traits/adrenalinejunkie.png',
    },
    athletic: {
        label: 'Lực lưỡng (Athletic)',
        type: 'positive',
        desc: 'Chạy nhanh hơn, ít tiêu hao thể lực',
        icon: '/images/traits/athletic.png',
    },
    axeman: {
        label: 'Chuyên gia dùng rìu (Axeman)',
        type: 'positive',
        desc: 'Chặt cây & vung rìu nhanh hơn',
        icon: '/images/traits/axeman.png',
    },
    baseballplayer: {
        label: 'Cầu thủ bóng chày (Baseball Player)',
        type: 'positive',
        desc: '+1 Điểm Vũ khí cùn dài & Thể lực',
        icon: '/images/traits/baseballplayer.png',
    },
    blacksmith: {
        label: 'Thợ rèn (Blacksmith)',
        type: 'positive',
        desc: '+1 Điểm Rèn kim loại & Chế tác',
        icon: '/images/traits/blacksmith.png',
    },
    brave: {
        label: 'Dũng cảm (Brave)',
        type: 'positive',
        desc: 'Ít bị hoảng sợ khi đối mặt với zombie',
        icon: '/images/traits/brave.png',
    },
    brawler: {
        label: 'Đấu sĩ đường phố (Brawler)',
        type: 'positive',
        desc: '+1 Điểm Rìu & Vũ khí cùn dài',
        icon: '/images/traits/brawler.png',
    },
    burglar: {
        label: 'Trộm xe chuyên nghiệp (Burglar)',
        type: 'positive',
        desc: 'Có thể đấu dây điện khởi động xe ngay',
        icon: '/images/traits/burglar.png',
    },
    cateyes: {
        label: 'Mắt mèo (Cat\'s Eyes)',
        type: 'positive',
        desc: 'Nhìn rõ hơn nhiều trong đêm tối',
        icon: '/images/traits/cateyes.png',
    },
    nightvision: {
        label: 'Mắt mèo / Nhìn đêm (Night Vision)',
        type: 'positive',
        desc: 'Nhìn rõ hơn nhiều trong bóng tối',
        icon: '/images/traits/nightvision.png',
    },
    cook: {
        label: 'Đầu bếp (Cook)',
        type: 'positive',
        desc: '+2 Điểm Nấu ăn & chế biến thực phẩm',
        icon: '/images/traits/cook.png',
    },
    dextrous: {
        label: 'Khéo tay (Dextrous)',
        type: 'positive',
        desc: 'Chuyển đồ đạc trong túi nhanh gấp đôi',
        icon: '/images/traits/dextrous.png',
    },
    eagleeyed: {
        label: 'Mắt đại bàng (Eagle Eyed)',
        type: 'positive',
        desc: 'Tầm nhìn rộng, phát hiện mục tiêu nhanh',
        icon: '/images/traits/eagleeyed.png',
    },
    fasthealer: {
        label: 'Hồi phục nhanh (Fast Healer)',
        type: 'positive',
        desc: 'Vết thương hồi phục nhanh hơn đáng kể',
        icon: '/images/traits/fasthealer.png',
    },
    fastlearner: {
        label: 'Học nhanh (Fast Learner)',
        type: 'positive',
        desc: '+30% XP cho hầu hết kỹ năng',
        icon: '/images/traits/fastlearner.png',
    },
    fastreader: {
        label: 'Đọc nhanh (Fast Reader)',
        type: 'positive',
        desc: 'Đọc sách truyện và sách kỹ năng nhanh hơn',
        icon: '/images/traits/fastreader.png',
    },
    firstaid: {
        label: 'Sơ cứu y tế (First Aid)',
        type: 'positive',
        desc: '+1 Điểm Sơ cứu y tế',
        icon: '/images/traits/firstaid.png',
    },
    fishing: {
        label: 'Câu cá (Angler / Fishing)',
        type: 'positive',
        desc: '+1 Điểm Câu cá',
        icon: '/images/traits/fishing.png',
    },
    fit: {
        label: 'Cân đối (Fit)',
        type: 'positive',
        desc: '+2 Thể lực thể chất',
        icon: '/images/traits/fit.png',
    },
    formerscout: {
        label: 'Cựu hướng đạo sinh (Former Scout)',
        type: 'positive',
        desc: '+1 Điểm Sơ cứu & Tìm kiếm',
        icon: '/images/traits/formerscout.png',
    },
    gardener: {
        label: 'Làm vườn (Gardener)',
        type: 'positive',
        desc: '+1 Điểm Nông nghiệp',
        icon: '/images/traits/gardener.png',
    },
    graceful: {
        label: 'Duyên dáng (Graceful)',
        type: 'positive',
        desc: 'Tạo ít tiếng động hơn khi di chuyển',
        icon: '/images/traits/graceful.png',
    },
    gymnast: {
        label: 'Vận động viên thể dục (Gymnast)',
        type: 'positive',
        desc: '+1 Điểm Đi nhẹ & Nhanh nhẹn',
        icon: '/images/traits/gymnast.png',
    },
    handy: {
        label: 'Khéo tay thợ sửa (Handy)',
        type: 'positive',
        desc: '+1 Điểm Mộc, Bảo trì, xây dựng nhanh hơn',
        icon: '/images/traits/handy.png',
    },
    hardy: {
        label: 'Bền bỉ (Hardy)',
        type: 'positive',
        desc: 'Thể lực hồi phục nhanh hơn',
        icon: '/images/traits/hardy.png',
    },
    herbalist: {
        label: 'Dược thảo gia (Herbalist)',
        type: 'positive',
        desc: 'Nhận biết cây cỏ độc & pha chế thuốc thảo dược',
        icon: '/images/traits/herbalist.png',
    },
    hiker: {
        label: 'Dã ngoại (Hiker)',
        type: 'positive',
        desc: '+1 Điểm Đi bẫy & Tìm kiếm sinh tồn',
        icon: '/images/traits/hiker.png',
    },
    hunter: {
        label: 'Thợ săn (Hunter)',
        type: 'positive',
        desc: '+1 Điểm Bắn súng, Dùng dao, Đi bẫy',
        icon: '/images/traits/hunter.png',
    },
    inconspicuous: {
        label: 'Kín đáo (Inconspicuous)',
        type: 'positive',
        desc: 'Zombie ít phát hiện hơn 50%',
        icon: '/images/traits/inconspicuous.png',
    },
    irongut: {
        label: 'Bao tử sắt (Iron Gut)',
        type: 'positive',
        desc: 'Ít bị ngộ độc thực phẩm',
        icon: '/images/traits/irongut.png',
    },
    keenhearing: {
        label: 'Thính tai (Keen Hearing)',
        type: 'positive',
        desc: 'Tăng bán kính nhận diện zombie phía sau',
        icon: '/images/traits/keenhearing.png',
    },
    lighteater: {
        label: 'Ăn ít (Light Eater)',
        type: 'positive',
        desc: 'Ít bị đói bụng hơn',
        icon: '/images/traits/lighteater.png',
    },
    lowthirst: {
        label: 'Ít khát (Low Thirst)',
        type: 'positive',
        desc: 'Ít bị khát nước hơn',
        icon: '/images/traits/lowthirst.png',
    },
    lucky: {
        label: 'May mắn (Lucky)',
        type: 'positive',
        desc: 'Tăng tỉ lệ tìm thấy đồ quý hiếm',
        icon: '/images/traits/lucky.png',
    },
    marksman: {
        label: 'Xạ thủ (Marksman)',
        type: 'positive',
        desc: '+1 Điểm Bắn súng & Nạp đạn',
        icon: '/images/traits/marksman.png',
    },
    mechanics: {
        label: 'Thợ cơ khí (Mechanics)',
        type: 'positive',
        desc: '+1 Điểm Cơ khí ô tô',
        icon: '/images/traits/mechanics.png',
    },
    mechanic: {
        label: 'Thợ cơ khí (Mechanic)',
        type: 'positive',
        desc: '+1 Điểm Cơ khí ô tô',
        icon: '/images/traits/mechanics.png',
    },
    needslesssleep: {
        label: 'Ít ngủ (Needs Less Sleep / Wakeful)',
        type: 'positive',
        desc: 'Cần ngủ ít hơn, hồi phục nhanh',
        icon: '/images/traits/needslesssleep.png',
    },
    wakeful: {
        label: 'Tỉnh táo (Wakeful)',
        type: 'positive',
        desc: 'Cần ngủ ít hơn',
        icon: '/images/traits/wakeful.png',
    },
    nutritionist: {
        label: 'Chuyên gia dinh dưỡng (Nutritionist)',
        type: 'positive',
        desc: 'Thấy toàn bộ giá trị dinh dưỡng của thực phẩm',
        icon: '/images/traits/nutritionist.png',
    },
    organized: {
        label: 'Ngăn nắp (Organized)',
        type: 'positive',
        desc: '+30% sức chứa của mọi túi đồ và thùng chứa',
        icon: '/images/traits/organized.png',
    },
    outdoorsman: {
        label: 'Người sống ngoài trời (Outdoorsman)',
        type: 'positive',
        desc: 'Kháng cảm lạnh, không sợ mưa gió',
        icon: '/images/traits/outdoorsman.png',
    },
    resilient: {
        label: 'Kháng bệnh (Resilient)',
        type: 'positive',
        desc: 'Giảm nguy cơ nhiễm trùng vết thương',
        icon: '/images/traits/resilient.png',
    },
    runner: {
        label: 'Chạy nhanh (Jogger / Runner)',
        type: 'positive',
        desc: '+1 Điểm Chạy bộ',
        icon: '/images/traits/jogger.png',
    },
    jogger: {
        label: 'Chạy bộ (Jogger)',
        type: 'positive',
        desc: '+1 Điểm Chạy bộ',
        icon: '/images/traits/jogger.png',
    },
    speeddemon: {
        label: 'Tay lái lụa (Speed Demon)',
        type: 'positive',
        desc: 'Lái xe nhanh hơn, lùi xe khỏe hơn',
        icon: '/images/traits/speeddemon.png',
    },
    stout: {
        label: 'Vạm vỡ (Stout)',
        type: 'positive',
        desc: '+2 Sức mạnh, đẩy lùi zombie tốt hơn',
        icon: '/images/traits/stout.png',
    },
    strong: {
        label: 'Khỏe như voi (Strong)',
        type: 'positive',
        desc: '+4 Sức mạnh, gây sát thương tối đa',
        icon: '/images/traits/strong.png',
    },
    tailor: {
        label: 'Thợ may (Tailor / Sewer)',
        type: 'positive',
        desc: '+1 Điểm May vá quần áo & vá giáp',
        icon: '/images/traits/tailor.png',
    },
    sewer: {
        label: 'Thợ may (Sewer)',
        type: 'positive',
        desc: '+1 Điểm May vá',
        icon: '/images/traits/tailor.png',
    },
    thickskinned: {
        label: 'Da dày (Thick Skinned)',
        type: 'positive',
        desc: 'Giảm tỷ lệ bị cắn hoặc cào rách da',
        icon: '/images/traits/thickskinned.png',
    },

    // === Negative Traits ===
    agoraphobic: {
        label: 'Sợ không gian rộng (Agoraphobic)',
        type: 'negative',
        desc: 'Hoảng sợ khi ở ngoài trời',
        icon: '/images/traits/agoraphobic.png',
    },
    allthumbs: {
        label: 'Vụng về (All Thumbs)',
        type: 'negative',
        desc: 'Chuyển đồ đạc trong túi chậm gấp 4 lần',
        icon: '/images/traits/allthumbs.png',
    },
    asthmatic: {
        label: 'Hen suyễn (Asthmatic)',
        type: 'negative',
        desc: 'Mất thể lực nhanh hơn khi chạy hoặc tấn công',
        icon: '/images/traits/asthmatic.png',
    },
    claustophobic: {
        label: 'Sợ phòng kín (Claustophobic)',
        type: 'negative',
        desc: 'Hoảng sợ khi ở trong phòng kín',
        icon: '/images/traits/claustophobic.png',
    },
    clumsy: {
        label: 'Hậu đậu (Clumsy)',
        type: 'negative',
        desc: 'Tạo nhiều tiếng ồn hơn khi di chuyển',
        icon: '/images/traits/clumsy.png',
    },
    conspicuous: {
        label: 'Dễ bị chú ý (Conspicuous)',
        type: 'negative',
        desc: 'Zombie dễ phát hiện gấp đôi',
        icon: '/images/traits/conspicuous.png',
    },
    cowardly: {
        label: 'Nhút nhát (Cowardly)',
        type: 'negative',
        desc: 'Dễ hoảng loạn cực độ khi thấy zombie',
        icon: '/images/traits/cowardly.png',
    },
    deaf: {
        label: 'Điếc (Deaf)',
        type: 'negative',
        desc: 'Không nghe thấy bất kỳ âm thanh nào trong game',
        icon: '/images/traits/deaf.png',
    },
    disorganized: {
        label: 'Bừa bãi (Disorganized)',
        type: 'negative',
        desc: '-30% sức chứa của mọi túi đồ',
        icon: '/images/traits/disorganized.png',
    },
    feeble: {
        label: 'Yếu ớt (Feeble)',
        type: 'negative',
        desc: '-2 Sức mạnh thể chất',
        icon: '/images/traits/feeble.png',
    },
    hardofhearing: {
        label: 'Lãng tai (Hard of Hearing)',
        type: 'negative',
        desc: 'Tầm nghe và nhận biết âm thanh bị giảm mạnh',
        icon: '/images/traits/hardofhearing.png',
    },
    heartyappetite: {
        label: 'Ăn khỏe (Hearty Appetite)',
        type: 'negative',
        desc: 'Cần ăn nhiều thức ăn hơn',
        icon: '/images/traits/heartyappetite.png',
    },
    hemophobic: {
        label: 'Sợ máu (Hemophobic / Fear of Blood)',
        type: 'negative',
        desc: 'Hoảng sợ khi dính máu hoặc tự băng bó',
        icon: '/images/traits/hemophobic.png',
    },
    fearofblood: {
        label: 'Sợ máu (Fear of Blood)',
        type: 'negative',
        desc: 'Hoảng sợ khi dính máu hoặc tự băng bó',
        icon: '/images/traits/hemophobic.png',
    },
    highthirst: {
        label: 'Hay khát nước (High Thirst)',
        type: 'negative',
        desc: 'Uống nước nhiều gấp đôi',
        icon: '/images/traits/highthirst.png',
    },
    illiterate: {
        label: 'Mù chữ (Illiterate)',
        type: 'negative',
        desc: 'Không thể đọc bất kỳ loại sách truyện nào',
        icon: '/images/traits/illiterate.png',
    },
    outofshape: {
        label: 'Thể lực kém (Out of Shape)',
        type: 'negative',
        desc: '-2 Thể lực, mau mệt',
        icon: '/images/traits/outofshape.png',
    },
    pacifist: {
        label: 'Hòa bình (Pacifist)',
        type: 'negative',
        desc: 'Gây ít sát thương vũ khí hơn',
        icon: '/images/traits/pacifist.png',
    },
    pronefillness: {
        label: 'Dễ ốm (Prone to Illness)',
        type: 'negative',
        desc: 'Dễ bị cảm lạnh và tốc độ biến zombie nhanh hơn',
        icon: '/images/traits/pronetoillness.png',
    },
    pronetoillness: {
        label: 'Dễ ốm (Prone to Illness)',
        type: 'negative',
        desc: 'Dễ bị cảm lạnh và tốc độ biến zombie nhanh hơn',
        icon: '/images/traits/pronetoillness.png',
    },
    restlesssleeper: {
        label: 'Ngủ chập chờn (Restless Sleeper)',
        type: 'negative',
        desc: 'Ngủ không sâu, chậm hồi phục thể lực',
        icon: '/images/traits/restlesssleeper.png',
    },
    shorttempered: {
        label: 'Nóng tính (Short Tempered)',
        type: 'negative',
        desc: 'Dễ nổi giận và bực bội',
        icon: '/images/traits/shorttempered.png',
    },
    shortsighted: {
        label: 'Cận thị (Short Sighted)',
        type: 'negative',
        desc: 'Tầm nhìn phát hiện mục tiêu bị hạn chế',
        icon: '/images/traits/shortsighted.png',
    },
    sleepyhead: {
        label: 'Ham ngủ (Sleepyhead)',
        type: 'negative',
        desc: 'Cần ngủ nhiều hơn bình thường',
        icon: '/images/traits/sleepyhead.png',
    },
    slowhealer: {
        label: 'Chậm hồi phục (Slow Healer)',
        type: 'negative',
        desc: 'Vết thương lành rất chậm',
        icon: '/images/traits/slowhealer.png',
    },
    slowlearner: {
        label: 'Tiếp thu chậm (Slow Learner)',
        type: 'negative',
        desc: '-30% kinh nghiệm XP nhận được',
        icon: '/images/traits/slowlearner.png',
    },
    slowreader: {
        label: 'Đọc chậm (Slow Reader)',
        type: 'negative',
        desc: 'Mất nhiều thời gian để đọc sách',
        icon: '/images/traits/slowreader.png',
    },
    smoker: {
        label: 'Nghiện thuốc lá (Smoker)',
        type: 'negative',
        desc: 'Bị căng thẳng và không vui nếu lâu không hút thuốc lá',
        icon: '/images/traits/smoker.png',
    },
    sundaydriver: {
        label: 'Lái xe rùa (Sunday Driver)',
        type: 'negative',
        desc: 'Lái xe rất chậm và tăng tốc kém',
        icon: '/images/traits/sundaydriver.png',
    },
    thin_skinned: {
        label: 'Da mỏng (Thin Skinned)',
        type: 'negative',
        desc: 'Dễ bị cào rách da hoặc cắn thủng',
        icon: '/images/traits/thinskinned.png',
    },
    thinskinned: {
        label: 'Da mỏng (Thin Skinned)',
        type: 'negative',
        desc: 'Dễ bị cào rách da hoặc cắn thủng',
        icon: '/images/traits/thinskinned.png',
    },
    unfit: {
        label: 'Mất thể lực (Unfit)',
        type: 'negative',
        desc: '-4 Thể lực thể chất',
        icon: '/images/traits/unfit.png',
    },
    unlucky: {
        label: 'Xui xẻo (Unlucky)',
        type: 'negative',
        desc: 'Ít nhặt được đồ ngon và dễ gặp tai nạn',
        icon: '/images/traits/unlucky.png',
    },
    veryunderweight: {
        label: 'Quá gầy (Very Underweight)',
        type: 'negative',
        desc: 'Sức mạnh và thể lực bị suy giảm trầm trọng',
        icon: '/images/traits/veryunderweight.png',
    },
    underweight: {
        label: 'Thiếu cân (Underweight)',
        type: 'negative',
        desc: '-1 Thể lực, sức mạnh giảm nhẹ',
        icon: '/images/traits/underweight.png',
    },
    overweight: {
        label: 'Thừa cân (Overweight)',
        type: 'negative',
        desc: '-1 Thể lực, dễ kiệt sức khi chạy',
        icon: '/images/traits/overweight.png',
    },
    obese: {
        label: 'Béo phì (Obese)',
        type: 'negative',
        desc: '-2 Thể lực, tốc độ chạy giảm mạnh',
        icon: '/images/traits/obese.png',
    },
    weak: {
        label: 'Suy nhược (Weak)',
        type: 'negative',
        desc: '-5 Sức mạnh, đẩy zombie rất yếu',
        icon: '/images/traits/weak.png',
    },
};

/**
 * Resolve trait information with authentic PZwiki icon.
 */
export function resolvePzTrait(rawName: string): {
    key: string;
    label: string;
    type: 'positive' | 'negative' | 'neutral';
    desc?: string;
    iconUrl: string;
} {
    const clean = rawName.replace(/^(trait_|base\.)/i, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (PZ_TRAITS[clean]) {
        return {
            key: clean,
            label: PZ_TRAITS[clean].label,
            type: PZ_TRAITS[clean].type,
            desc: PZ_TRAITS[clean].desc,
            iconUrl: PZ_TRAITS[clean].icon || `/images/traits/${clean}.png`,
        };
    }

    // Fuzzy match
    for (const [k, val] of Object.entries(PZ_TRAITS)) {
        if (clean.includes(k) || k.includes(clean)) {
            return {
                key: k,
                label: val.label,
                type: val.type,
                desc: val.desc,
                iconUrl: val.icon || `/images/traits/${k}.png`,
            };
        }
    }

    // Default neutral fallback
    const formatted = rawName
        .replace(/^(trait_|base\.)/i, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_\-]/g, ' ')
        .trim();

    return {
        key: clean,
        label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
        type: 'neutral',
        iconUrl: `/images/traits/${clean}.png`,
    };
}
