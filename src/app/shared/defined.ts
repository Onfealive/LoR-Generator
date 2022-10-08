export enum MODIFY_TYPE {
    ADD = 1,
    CHANGE = 2,
    CHANGE_FLAVOR = 4,
    REMOVE = 8,
    BACK_END = 16,
}

export class Card {
    _data: any;
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
    keywordRefs: Array<string>;
    artist: string;
    regions: Array<string>;
    rarity: string;
    weightRarity: number;
    set: number;
    patch: string;
    histories: Array<any>;
    removed: boolean;
}

export interface PatchCards {
    name: string,
    cards: Card[],
}