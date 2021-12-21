export const Keywords = [
    { name: "Advance" },
    { name: "Allegiance" },
    { name: "Attack" },
    { name: "Attune", icon: "Attune" },
    { name: "Augment", icon: "Augment" },
    { name: "Aura", icon: "Aura" },
    { name: "Barrier", icon: "Barrier" },
    { name: "Behold" },
    { name: "Blade Dance" },
    { name: "Blockade", specialIndicator: "can't take damage or die" },
    { name: "Burst", icon: "Burst" },
    { name: "Can block Elusives", specialIndicator: 'can block units with Elusive' },
    { name: "Can't Attack", icon: "Can't Attack", specialIndicator: "Immobile" },
    { name: "Can't Block", icon: "Can't Block", specialIndicator: "Immobile" },
    { name: "Capture", icon: "Capture" },
    { name: "Challenger", icon: "Challenger" },
    { name: "Countdown" },
    { name: "Daybreak" },
    { name: "Deep", icon: "Deep" },
    { name: "Double Attack", icon: "Double Attack" },
    { name: "Drain" },
    { name: "Elusive", icon: "Elusive" },
    { name: "Enlightened" },
    { name: "Ephemeral", icon: "Ephemeral" },
    { name: "Everywhere", icon: "Ephemeral" },
    { name: "Fast", icon: "Fast" },
    { name: "Fated", icon: "Fated" },
    { name: "Fearsome", icon: "Fearsome" },
    { name: "Fleeting", icon: "Fleeting" },
    { name: "Focus", icon: "Focus" },
    { name: "Frostbite", icon: "Frostbite" },
    { name: "Fury", icon: "Fury" },
    { name: "Imbue", icon: "Imbue" },
    { name: "Invoke", icon: "Invoke" },
    { name: "Impact", icon: "Impact" },
    { name: "Last Breath", icon: "Last Breath" },
    { name: "Lifesteal", icon: "Lifesteal" },
    { name: "Lurk" },
    { name: "Manifest" },
    { name: "Nab" },
    { name: "Nexus Strike" },
    { name: "Nightfall" },
    { name: "Obliterate" },
    { name: "Phase" },
    { name: "Play" },
    { name: "Plunder" },
    { name: "Predict" },
    { name: "Quick Attack", icon: "Quick Attack" },
    { name: "Rally", icon: "Rally" },
    { name: "Recall" },
    { name: "Reforge" },
    { name: "Regeneration", icon: "Regeneration" },
    { name: "Reputation" },
    { name: "Restore the Sun Disc", specialIndicator: 'SunDiscRestore' },
    { name: "Round End" },
    { name: "Round Start" },
    { name: "Scout", icon: "Scout" },
    { name: "Silence", icon: "Silence" },
    { name: "Slay" },
    { name: "Slow", icon: "Slow" },
    { name: "SpellShield", icon: "SpellShield" },
    { name: "Strike" },
    { name: "Strongest" },
    { name: "Stun", icon: "Stun" },
    { name: "Support", icon: "Support" },
    { name: "Toss" },
    { name: "Tough", icon: "Tough" },
    // { name: "Trigger", icon: "Trigger" },
    { name: "Vulnerable", icon: "Vulnerable" },
    { name: "Weakest" },
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
    { name: '<Unknown>', specialIndicator: [''] },
    { name: 'Alex Heath' },
    { name: 'Aron Elekes' },
    { name: 'Chin LikHui' },
    { name: 'Dao Le' },
    { name: 'Eunice' },
    { name: 'Grafit Studio' },
    { name: 'Greg Faillace' },
    { name: 'JiHun Lee', specialIndicator: ['Jihun Lee'] },
    { name: 'Kudos Productions', specialIndicator: ['Kudos Production'] },
    { name: 'MAR Studio' },
    { name: 'Max Grecke' },
    { name: 'Oliver Chipping' },
    { name: 'Original Force' },
    { name: 'Polar Engine Studio', specialIndicator: ['Polar Engine'] },
    { name: 'Rafael Zanchetin' },
    { name: 'SIXMOREVODKA' },
    { name: 'Slawomir Maniak' },
    { name: 'Wild Blue Studios', specialIndicator: ['Wild Blue Studio', 'Wild Blue'] }
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
    { id: 'SI', icon: 'Shadow Isles', name: 'Shadow Isles' },
    { id: 'SH', icon: 'Shurima', name: 'Shurima' },
    { id: 'MT', icon: 'Targon', name: 'Targon' },
];
