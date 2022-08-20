import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PatchInfo } from '../shared/patches';
import * as Utility from "../shared/utility";
import { Observable, Observer, forkJoin } from 'rxjs';
import { Artists, Card, Keywords } from './gameMechanics';
import { ClipboardService } from 'ngx-clipboard';

import { Toast } from 'bootstrap';
import * as DeckEncoder from 'lor-deckcodes-ts';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {

    newestPatch = null;
    private newestPatchCode = null;
    latestDatabase = {};
    copyToast;

    private FACTIONS = {
        DE: 0,
        FR: 1,
        IO: 2,
        NX: 3,
        PZ: 4,
        SI: 5,
        BW: 6,
        MT: 9,
        SH: 7
    };

    private SHARDS = {
        'Common': 100,
        'Rare': 300,
        'Epic': 1200,
        'Champion': 3000
    }

    WEIGHT_RARITY = {
        'Champion': 0,
        'Epic': 1,
        'Rare': 2,
        'Common': 3,
        'None': 3,
    }

    constructor(
        private http: HttpClient,
        private clipboardService: ClipboardService,
    ) {
        let newestPatch = this.newestPatch = Object.keys(PatchInfo).slice(-1)[0];
        this.newestPatchCode = PatchInfo[newestPatch].code;
        this.getCardData(newestPatch).subscribe(database => this.latestDatabase = database);
    }

    setCopyToast() {
        setTimeout(() => {
            this.copyToast = new Toast(document.getElementById('copyToast'));
        }, 0);
    }

    getValidCardData(): Observable<any> {
        let newestValidPatch = Object.keys(PatchInfo).filter(patch => !PatchInfo[patch]['upcoming']).slice(-1)[0];

        return this.getCardData(newestValidPatch);
    }

    getCardData(patch = null): Observable<any> {
        if (!patch) {
            patch = this.newestPatch;
        }

        let maxSet = PatchInfo[patch].maxSet;

        let rawLatestDatabase = {}

        let list = [];
        for (let set = 1; set <= maxSet; set++) {
            list.push(this.getDataJSON(patch, set))
        }

        return new Observable((observer: Observer<any>) => {
            forkJoin(list)
                .subscribe(results => {
                    results.forEach((result, set) => {
                        if (!rawLatestDatabase['set' + (set + 1)]) {
                            rawLatestDatabase['set' + (set + 1)] = {};
                        }

                        rawLatestDatabase['set' + (set + 1)][patch] = JSON.stringify(result || []);
                    });

                    observer.next(this.convertData2Database(rawLatestDatabase, patch));
                    observer.complete();
                }, err => observer.error(err));
        })
    }

    convertData2Database(rawData, patch) {
        let database = {}
        let spellSpeedKeywords = ['Slow', 'Fast', 'Burst', 'Focus'];
        let keywords = Keywords.filter(k => !k.specialIndicators);
        let specialKeywords = Keywords.filter(k => k.specialIndicators);
        let skippingKeywords = ['Missing Translation', 'Support', 'Plunder', 'Last Breath'];

        Object.keys(rawData).forEach(setID => {
            const rawSetData = rawData[setID][patch];
            let setData = {};
            JSON.parse(rawSetData).forEach(rawCardData => {
                let sortedCode: string = rawCardData.cardCode;
                let isAssociatedCard = false;
                if (sortedCode.includes('MT')) {
                    if (sortedCode.lastIndexOf('T') != sortedCode.lastIndexOf('MT') + 1) {
                        isAssociatedCard = true;
                    }
                } else if (sortedCode.includes('T')) {
                    isAssociatedCard = true;
                }

                if (isAssociatedCard) {
                    let wordTIndex = sortedCode.lastIndexOf('T');
                    let associatedText = sortedCode.slice(wordTIndex + 1)
                    sortedCode = sortedCode.slice(0, wordTIndex) + associatedText.padStart(3, '0');
                }

                let realSpellSpeed = rawCardData.spellSpeed;
                if (rawCardData.keywords.filter(k => spellSpeedKeywords.includes(k))) {
                    realSpellSpeed = rawCardData.keywords.find(k => spellSpeedKeywords.includes(k));
                }

                let group = [];
                if (rawCardData.subtypes) {
                    if (rawCardData.subtypes.length) {
                        group = rawCardData.subtypes;
                    }
                } else if (rawCardData.subtype) {
                    if (!Array.isArray(rawCardData.subtype)) {
                        group = [rawCardData.subtype];
                    }
                }

                let artist = rawCardData.artistName;
                Artists.forEach(artistData => {
                    let artists = [artistData.name];
                    if (artistData.specialIndicators && artistData.specialIndicators.length) {
                        artists = artists.concat(artistData.specialIndicators);
                    }

                    if (artists.includes(artist)) {
                        artist = artistData.name;
                        return;
                    }
                });

                if (rawCardData.type == 'Ability' && !rawCardData.keywords.includes('Skill')) {
                    if (rawCardData.keywords.length == 0) {
                        rawCardData.type = 'Origin'
                    }

                    if (rawCardData.keywords.includes('Boon')) {
                        rawCardData.type = 'Boon'
                    }
                }

                let rarity = rawCardData.collectible ? rawCardData.rarityRef : 'None';

                let card: Card = {
                    _data: rawCardData,
                    sortedCode: sortedCode,
                    code: rawCardData.cardCode,
                    name: rawCardData.name.trim(),
                    collectible: rawCardData.collectible,
                    cost: rawCardData.cost,
                    power: rawCardData.attack,
                    health: rawCardData.health,
                    description: Utility.cleanNewline(rawCardData.descriptionRaw),
                    levelupDescription: Utility.cleanNewline(rawCardData.levelupDescriptionRaw),
                    type: this.getCardType(rawCardData),
                    groupedType: this.getCardType(rawCardData, true),
                    spellSpeed: realSpellSpeed,
                    group: Utility.capitalize(group),
                    subtype: Utility.capitalize(group),
                    flavor: rawCardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
                    keywords: [...rawCardData.keywords],
                    artist: artist,
                    regions: rawCardData.regions ? rawCardData.regions : [rawCardData.region],
                    rarity: rarity,
                    weightRarity: this.WEIGHT_RARITY[rarity]
                }
                card.description = card.description.split(' </').join('</');
                card.description = card.description.split('  ').join(' ');

                setData[rawCardData.cardCode] = card;

                if (!setData[rawCardData.cardCode]['keywords'].length) {
                    setData[rawCardData.cardCode]['keywords'] = [];
                }

                if (rawCardData.keywordRefs.includes('AuraVisualFakeKeyword')) {
                    setData[rawCardData.cardCode]['keywords'].push('Aura');
                }

                rawCardData.keywords = rawCardData.keywords.filter(keyword => !skippingKeywords.includes(keyword));
                rawCardData.keywordRefs = rawCardData.keywordRefs.filter(keyword => !['AuraVisualFakeKeyword'].includes(keyword));

                keywords.forEach(keywordData => {
                    let keywordText = [`<link=vocab.${keywordData.name || keywordData.id}>`, `<link=keyword.${keywordData.name || keywordData.id}>`, `<style=Vocab>${keywordData.name || keywordData.id}`];
                    keywordText.forEach(kText => {
                        if (rawCardData.description.toLowerCase().includes(kText.toLowerCase())) {
                            setData[rawCardData.cardCode]['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                    });
                });

                specialKeywords.forEach(keywordData => {
                    keywordData.specialIndicators.forEach(specialIndicator => {
                        if (rawCardData['keywords'].includes(specialIndicator)) {
                            setData[rawCardData.cardCode]['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['levelupDescription'].includes(specialIndicator)) {
                            setData[rawCardData.cardCode]['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['description'].includes(specialIndicator)) {
                            setData[rawCardData.cardCode]['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['descriptionRaw'].includes(specialIndicator)) {
                            setData[rawCardData.cardCode]['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                    })

                })

                setData[rawCardData.cardCode]['keywords'] = [...new Set(setData[rawCardData.cardCode]['keywords'].filter(x => !skippingKeywords.includes(x)))];
            });

            database = Object.assign(database, setData);
        });
        Object.values(database).filter(card => card['groupedType'] == null).forEach((cardData: any) => {
            database[cardData.code].groupedType = this.getCardType(cardData._data, true);
        });

        return database;
    }

    private getCardType = (cardData, isgroupedType = false) => {
        if (cardData.type == 'Unit') {
            if (cardData.supertype) {
                return 'Champion';
            }

            return 'Follower';
        }

        if (cardData.type == 'Ability') {
            return !cardData.keywords.includes('Skill') ? 'Origin' : 'Skill'
        }

        if (cardData.type == 'Trap') {
            return cardData.keywords.includes('Trap') ? 'Trap' : 'Boon'
        }

        if (isgroupedType) {
            if (cardData.supertype == 'Champion') {
                if (cardData.type == 'Spell') {
                    return 'Champion'
                }
            } else if (cardData.cardCode.length > 7) {
                let mainCardCode = cardData.cardCode.substring(0, 7);
                if (this.latestDatabase[mainCardCode]) {
                    if (this.latestDatabase[mainCardCode]._data.supertype == 'Champion') {
                        return 'Champion'
                    }
                }
            }
        }

        return cardData.type;
    }

    public getDataJSON(patch, set = 1): Observable<any> {
        return this.http.get(`./assets/jsons/data/set${set}_${patch}.json`);
    }

    public getAPIImage(patchData, cardCode, isRetry = false) {
        if (!patchData) {
            patchData = PatchInfo[this.newestPatch];
        }
        let patchCode = patchData.code;
        let set = parseInt(cardCode.substring(0, 2));
        if (isRetry && patchData.customSets && patchData.customSets[set]) {
            set = patchData.customSets && patchData.customSets[set];
        }

        return `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardCode}.png`;
    }

    public getExpeditionJSON(patchCode) {
        if (!patchCode) {
            patchCode = this.newestPatchCode;
        }

        return this.http.get(`./assets/jsons/expedition/v${patchCode}.json`);
    }

    public getAPIArtwork(cardcode, patchCode = null) {
        if (!patchCode) {
            patchCode = this.newestPatchCode;
        }
        let set = parseInt(cardcode.substring(0, 2));
        let url = `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardcode}-full.png`;

        return url;
    }

    public copy2Clipboard(text) {
        this.clipboardService.copy(text);
        this.copyToast.show();
    }

    public deck2Code(inputDeck) {
        let deck = [];

        inputDeck.forEach(card => {
            deck.push({
                cardCode: card['code'],
                count: card['count'] || 1
            });
        });

        return DeckEncoder.getCodeFromDeck(deck);
    }

    public deck2Shards(inputDeck, isMissingDeck = false): number {
        return inputDeck.map(card => this.SHARDS[card.rarity] * (isMissingDeck ? 3 - card.count : card.count)).reduce((a, current) => a + current, 0);
    }

    public deck2WildCards(inputDeck, isMissingDeck = false) {
        let wildcards = {};

        inputDeck.forEach(card => {
            if (!wildcards[card.rarity]) {
                wildcards[card.rarity] = 0;
            }

            wildcards[card.rarity] += (isMissingDeck ? 3 - card.count : card.count);
        });

        return wildcards;
    }
}
