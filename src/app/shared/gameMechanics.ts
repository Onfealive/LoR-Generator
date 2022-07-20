export const Keywords = [
    { id: "Advance" },
    { id: "Allegiance" },
    { id: "Attach" },
    { id: "Attack (no Skill)", name: 'Attack' },
    { id: "Attack with Skill", name: 'Attack', icon: "Skill", specialIndicators: ['AttackSkillMark'] },
    { id: "Attune", icon: "Attune" },
    { id: "Augment", icon: "Augment" },
    { id: "Aura", icon: "Aura", specialIndicators: ['AuraVisualFakeKeyword'] },
    { id: "Barrier", icon: "Barrier" },
    { id: "Behold" },
    { id: "Blade Dance" },
    { id: "Blockade", specialIndicators: ["can't take damage or die"] },
    { id: "Burst", icon: "Burst" },
    { id: "Can block Elusives", specialIndicators: ['can block units with Elusive'] },
    { id: "Can't Attack", icon: "Can't Attack", specialIndicators: ["Immobile"] },
    { id: "Can't Block", icon: "Can't Block", specialIndicators: ["Immobile"] },
    { id: "Capture", icon: "Capture" },
    { id: "Challenger", icon: "Challenger" },
    { id: "Countdown" },
    { id: "Daybreak" },
    { id: "Deep", icon: "Deep" },
    { id: "Double Attack", icon: "Double Attack" },
    { id: "Drain" },
    { id: "Elusive", icon: "Elusive" },
    { id: "Evolve" },
    { id: "Enlightened" },
    { id: "Ephemeral", icon: "Ephemeral" },
    { id: "Everywhere", icon: "Ephemeral" },
    { id: "Fast", icon: "Fast" },
    { id: "Fated", icon: "Fated" },
    { id: "Fearsome", icon: "Fearsome" },
    { id: "Fleeting", icon: "Fleeting" },
    { id: "Focus", icon: "Focus" },
    { id: "Formidable" },
    { id: "Frostbite", icon: "Frostbite" },
    { id: "Fury", icon: "Fury" },
    { id: "Hallowed" },
    { id: "Imbue", icon: "Imbue" },
    { id: "Invoke", icon: "Invoke" },
    { id: "Impact", icon: "Impact" },
    { id: "Last Breath", icon: "Last Breath" },
    { id: "Lifesteal", icon: "Lifesteal" },
    { id: "Lurk" },
    { id: "Manifest" },
    { id: "Nab" },
    { id: "Nexus Strike" },
    { id: "Nightfall" },
    { id: "Obliterate" },
    { id: "Origin" },
    { id: "Overwhelm", icon: "Overwhelm" },
    { id: "Phase" },
    { id: "Play (no Skill)", name: 'Play' },
    { id: "Play with Skill", name: 'Play', icon: "Skill", specialIndicators: ['PlaySkillMark'] },
    { id: "Plunder" },
    { id: "Predict" },
    { id: "Quick Attack", icon: "Quick Attack" },
    { id: "Rally", icon: "Rally" },
    { id: "Recall" },
    { id: "Reforge" },
    { id: "Regeneration", icon: "Regeneration" },
    { id: "Reputation" },
    { id: "Restore the Sun Disc", specialIndicators: ['SunDiscRestore'] },
    { id: "Round End" },
    { id: "Round Start" },
    { id: "Scout", icon: "Scout" },
    { id: "Silence", icon: "Silence" },
    { id: "Skill-related", name: 'Skill', icon: "Skill", specialIndicators: ["SkillMark"] },
    { id: "Slay" },
    { id: "Slow", icon: "Slow" },
    { id: "Spawn" },
    { id: "SpellShield", icon: "SpellShield" },
    { id: "Strike" },
    { id: "Strongest" },
    { id: "Stun", icon: "Stun" },
    { id: "Support", icon: "Support" },
    { id: "Toss" },
    { id: "Tough", icon: "Tough" },
    // { id: "Trigger", icon: "Trigger" },
    { id: "Vulnerable", icon: "Vulnerable" },
    { id: "Weakest" },
];

export const Groups = [
    { name: 'Ascended' },
    { name: 'Celestial' },
    { name: 'Dragon' },
    { name: 'Elite' },
    { name: 'Elnuk' },
    { name: 'Fae' },
    { name: 'Lurker' },
    { name: 'Mecha-Yordle' },
    { name: 'Moon Weapon' },
    { name: 'Poro' },
    { name: 'Sea Monster' },
    { name: 'Spider' },
    { name: 'Tech' },
    { name: 'Treasure' },
    { name: 'Yeti' },
    { name: 'Yordle' }
];

export const Artists = [
    { name: '<Unknown>', specialIndicators: [''] },
    { name: 'Alessandro Poli' },
    { name: 'Alex Heath' },
    { name: 'Aron Elekes' },
    { name: 'Ben Skutt' },
    { name: 'Caravan Studio' },
    { name: 'Chin LikHui' },
    { name: 'Chris Kintner' },
    { name: 'Concept Art House' },
    { name: 'Dao Le' },
    { name: 'Envar Studio' },
    { name: 'Eunice' },
    { name: 'Grafit Studio' },
    { name: 'Greg Faillace' },
    { name: 'JiHun Lee', specialIndicators: ['Jihun Lee'] },
    { name: 'Kudos Productions', specialIndicators: ['Kudos Production', 'Kudos Illustrations'] },
    { name: 'MAR Studio' },
    { name: 'Michael Ivan', specialIndicators: ['MICHAEL IVAN', 'Michal Ivan'] },
    { name: 'Max Grecke' },
    { name: 'Oliver Chipping' },
    { name: 'Original Force' },
    { name: 'Polar Engine Studio', specialIndicators: ['Polar Engine'] },
    { name: 'Rafael Zanchetin' },
    { name: 'SIXMOREVODKA' },
    { name: 'Slawomir Maniak' },
    { name: 'Valentin Gloaguen' },
    { name: 'Wild Blue Studios', specialIndicators: ['Wild Blue Studio', 'Wild Blue'] },
    { name: 'Will Gist' }
];

export class Card {
    _data: object;
    sortedCode: string;
    code: string;
    name: string;
    collectible: boolean;
    cost: number;
    power: number;
    health: number;
    description: string;
    levelupDescription: string;
    type: string;
    groupedType: string;
    spellSpeed: string;
    group: Array<string>;
    subtype: Array<string>;
    flavor: string;
    keywords: Array<string>;
    artist: string;
    regions: string;
    rarity: string;
    weightRarity: number;
}

export const Regions = [
    { id: 'BC', icon: 'Bandle City', name: 'Bandle City' },
    { id: 'BW', icon: 'Bilgewater', name: 'Bilgewater' },
    { id: 'DE', icon: 'Demacia', name: 'Demacia' },
    { id: 'FR', icon: 'Freljord', name: 'Freljord' },
    { id: 'IO', icon: 'Ionia', name: 'Ionia' },
    { id: 'NX', icon: 'Noxus', name: 'Noxus' },
    { id: 'PZ', icon: 'Piltover and Zaun', name: 'Piltover and Zaun' },
    { id: 'RU', icon: 'Runeterra', name: 'Runeterra' },
    { id: 'SI', icon: 'Shadow Isles', name: 'Shadow Isles' },
    { id: 'SH', icon: 'Shurima', name: 'Shurima' },
    { id: 'MT', icon: 'Targon', name: 'Targon' },
];
