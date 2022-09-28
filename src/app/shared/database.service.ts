import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PatchInfo, PatchInfoInterface } from '../shared/patches';
import * as Utility from "../shared/utility";
import { Observable, Observer, forkJoin, BehaviorSubject, of } from 'rxjs';
import { Artists, Keywords } from './gameMechanics';
import { ClipboardService } from 'ngx-clipboard';
import { delay, concatMap } from 'rxjs/operators';
import * as Diff from "diff";

import { Toast } from 'bootstrap';
import * as DeckEncoder from 'lor-deckcodes-ts';
import { MODIFY_TYPE, Card, PatchCards } from './defined';
import { saveAs } from 'file-saver';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private globalDatabase: PatchCards[] = [];
    historyDatabase: any[] = [];
    removedDatabase: Card[] = [];

    copyToast;

    public loadingCompleted$ = new BehaviorSubject<boolean>(false);
    public trackingCompleted$ = new BehaviorSubject<boolean>(false);

    skippingKeywords = ['Missing Translation', 'Support', 'Plunder', 'Last Breath', 'Countdown', 'Flow', 'Imbue', "Fast", "Slow", "Focus", "Burst"];

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

    get newestPatch(): PatchInfoInterface {
        return PatchInfo[PatchInfo.length - 1];
    }

    get newestPatchCards(): Card[] {
        return this.getDatabaseOfPatch(this.newestPatch);
    }

    constructor(
        private http: HttpClient,
        private clipboardService: ClipboardService,
    ) {
        this.getCardData(this.newestPatch).subscribe(database => {
            this.globalDatabase.push({
                name: this.newestPatch.name,
                cards: database
            });

            this.getHistoryData().subscribe(histories => {
                this.historyDatabase = histories;

                this.getRemovedData().subscribe(removedCards => {
                    this.removedDatabase = removedCards;
                    this.loadingCompleted$.next(true);
                })
            })
        });

        // PRIVATE: Turn on when new Patch
        // this.backgroundDatabaseLoading();
    }

    getDatabaseOfPatch(patchInfo: PatchInfoInterface): Card[] {
        let foundDB = this.globalDatabase.find(pc => pc.name == patchInfo.name);
        return foundDB ? foundDB.cards : []
    }

    private backgroundDatabaseLoading() {
        let patches = PatchInfo;
        let databasePatches = Object.values(this.globalDatabase).map(pc => pc.name);

        let missingPatches = patches.filter(p => !databasePatches.includes(p.name));

        if (missingPatches.length) {
            let missingPatch = missingPatches[0];
            setTimeout(() => {
                this.getCardData(missingPatch).subscribe(database => {
                    this.globalDatabase.push({
                        name: missingPatch.name,
                        cards: database
                    });

                    this.backgroundDatabaseLoading();
                });
            }, 0);
        } else {
            this.trackingCompleted$.next(true);
            this.trackingCardHistory();
        }
    }

    trackingCardHistory() {
        let modifyTypes = [];
        modifyTypes.push({ id: 'add', text: 'Added', type: MODIFY_TYPE.ADD, value: false });
        modifyTypes.push({ id: 'change', text: 'Changed', type: MODIFY_TYPE.CHANGE | MODIFY_TYPE.CHANGE_FLAVOR, value: true });
        modifyTypes.push({ id: 'remove', text: 'Removed', type: MODIFY_TYPE.REMOVE, value: true });
        modifyTypes.push({ id: 'backed', text: 'Back-End', type: MODIFY_TYPE.BACK_END, value: false });

        let options = {
            display: true,
            changeLog: false,
            patchNote: false,
            modifyTypes: modifyTypes,
            selectedPatch: null,
            isGrouped: false,
            isLink: false
        };

        let database = [...this.newestPatchCards];
        let databaseCodes = database.map(c => c.code);
        let removedCardCodes = [];

        PatchInfo.slice().reverse().forEach((patch: PatchInfoInterface, index) => {
            let queryingDB = this.getDatabaseOfPatch(patch);

            databaseCodes = [... new Set(databaseCodes.concat(queryingDB.map(c => c.code)))];

            databaseCodes.filter(x => !database.map(c => c.code).includes(x)).forEach(removedCardCode => {
                let removedCard = queryingDB.find(card => card.code == removedCardCode);
                removedCard.removed = true;
                database.push(removedCard);
                removedCardCodes.push(removedCardCode)
            });
        });

        database.forEach((cardData) => {
            let oldCardData: Card = null
            let currentPatch = null;
            let histories = [];

            PatchInfo.forEach((patch: PatchInfoInterface, index) => {
                let queryingDB = this.getDatabaseOfPatch(patch);

                if (index == 0) {
                    oldCardData = queryingDB.find(card => card.code == cardData.code);
                    currentPatch = patch;

                    return;
                }

                let newCardData = queryingDB.find(card => card.code == cardData.code);

                options.selectedPatch = patch;
                let logs = this.getCardChangeData(options, oldCardData ? [oldCardData] : [], newCardData ? [newCardData] : []);

                if (logs.length) {
                    let log = Object.assign({}, logs[0]);

                    if (log.visible) {
                        log.oldPatch = currentPatch.name;
                        log.newPatch = patch.name;
                        log.oldURL = oldCardData ? this.getAPIImage(oldCardData) : null;
                        if (!removedCardCodes.includes(cardData.code)) {
                            log.newURL = newCardData ? this.getAPIImage(newCardData) : null;
                        }
                        delete log.newCard;
                        delete log.oldCard;
                        histories.push(log);
                    }
                }

                oldCardData = newCardData;
                currentPatch = patch;
            });

            if (histories.length) {
                histories.reverse();
                cardData.histories = histories;
            }
        });

        database = Utility.sortArrayByValues(database, ['sortedCode']);
        let exportedData = {};
        let removedDatabase = [];

        database.forEach((cardData, index) => {
            if (cardData.histories) {
                exportedData[cardData.code] = cardData.histories;
            }

            if (removedCardCodes.includes(cardData.code)) {
                removedDatabase.push(cardData);
                delete cardData.histories;
            }
        });

        const historyBlob = new Blob([JSON.stringify(JSON['decycle'](exportedData))], { type: "application/json;charset=utf-8" });
        saveAs(historyBlob, `${this.newestPatch.code}_history.json`);

        const removedBlob = new Blob([JSON.stringify(JSON['decycle'](removedDatabase))], { type: "application/json;charset=utf-8" });
        saveAs(removedBlob, `${this.newestPatch.code}_removed.json`);
    }

    setCopyToast() {
        setTimeout(() => {
            this.copyToast = new Toast(document.getElementById('copyToast'));
        }, 0);
    }

    getCardData(patchInfo: PatchInfoInterface = null): Observable<Card[]> {
        if (patchInfo == null) {
            patchInfo = this.newestPatch;
        }
        if (this.globalDatabase.find(pc => pc.name == patchInfo.name)) {
            return new Observable<Card[]>((observer: Observer<Card[]>) => {
                observer.next(this.globalDatabase.find(pc => pc.name == patchInfo.name).cards);
                observer.complete();
            });
        }

        let rawLatestDatabase = {};

        let list = [];
        patchInfo.sets.forEach(set => {

            list.push(this.getDataJSON(patchInfo.name, set));
        });

        return new Observable((observer: Observer<Card[]>) => {
            forkJoin(list)
                .pipe(
                    concatMap(item => of(item).pipe(delay(patchInfo.name == this.newestPatch.name ? 0 : 200)))
                ).subscribe(results => {
                    results.forEach((result, index) => {
                        let set = patchInfo.sets[index];
                        if (!rawLatestDatabase['set' + set]) {
                            rawLatestDatabase['set' + set] = {};
                        }

                        rawLatestDatabase['set' + set][patchInfo.code] = JSON.stringify(result || []);
                    });

                    let convertedDatabase = this.convertData2Database(rawLatestDatabase, patchInfo.code);

                    this.globalDatabase.push({
                        name: patchInfo.name,
                        cards: convertedDatabase
                    });

                    observer.next(convertedDatabase);
                    observer.complete();
                }, err => observer.error(err));
        });
    }

    getHistoryData(): Observable<any> {
        return this.http.get(`./assets/jsons/histories/${this.newestPatch.code}.json`);
    }

    getRemovedData(): Observable<any> {
        return this.http.get(`./assets/jsons/removed/${this.newestPatch.code}.json`);
    }

    convertData2Database(rawData, patchCode: string): Card[] {
        let database: Card[] = []
        let spellSpeedKeywords = ['Slow', 'Fast', 'Burst', 'Focus'];
        let keywords = Keywords.filter(k => !k.specialIndicators);
        let specialKeywords = Keywords.filter(k => k.specialIndicators);

        Object.keys(rawData).forEach(setID => {
            const rawSetData = rawData[setID][patchCode];

            JSON.parse(rawSetData).forEach(rawCardData => {
                let sortedCode: string = rawCardData.cardCode;

                if (database.find(card => card.code == rawCardData.cardCode)) {
                    return;
                }

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
                    description: Utility.cleanUpTextContent(rawCardData.descriptionRaw),
                    levelupDescription: Utility.cleanUpTextContent(rawCardData.levelupDescriptionRaw),
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
                    weightRarity: this.WEIGHT_RARITY[rarity],
                    set: rawCardData.set ? rawCardData.set.replace('Set', '') : parseInt(rawCardData.cardCode.substring(0, 2)),
                    patch: patchCode,
                    histories: null,
                    removed: false
                }

                card.description = card.description.split(' </').join('</');
                card.description = card.description.split('  ').join(' ');

                if (!card['keywords'].length) {
                    card['keywords'] = [];
                }

                if (rawCardData.keywordRefs.includes('AuraVisualFakeKeyword')) {
                    card['keywords'].push('Aura');
                }

                rawCardData.keywords = rawCardData.keywords.filter(keyword => !this.skippingKeywords.includes(keyword));
                rawCardData.keywordRefs = rawCardData.keywordRefs.filter(keyword => !['AuraVisualFakeKeyword'].includes(keyword));

                keywords.forEach(keywordData => {
                    let keywordText = [`<link=vocab.${keywordData.name || keywordData.id}>`, `<link=keyword.${keywordData.name || keywordData.id}>`, `<style=Vocab>${keywordData.name || keywordData.id}`];
                    keywordText.forEach(kText => {
                        if (rawCardData.description.toLowerCase().includes(kText.toLowerCase())) {
                            card['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                    });
                });

                specialKeywords.forEach(keywordData => {
                    keywordData.specialIndicators.forEach(specialIndicator => {
                        if (rawCardData['keywords'].includes(specialIndicator)) {
                            card['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['levelupDescription'].includes(specialIndicator)) {
                            card['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['description'].includes(specialIndicator)) {
                            card['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                        if (rawCardData['descriptionRaw'].includes(specialIndicator)) {
                            card['keywords'].push(keywordData.name || keywordData.id);
                            return;
                        }
                    })

                })

                card['keywords'] = [...new Set(card['keywords'].filter(x => !this.skippingKeywords.includes(x)))];

                database.push(card);
            });
        });

        database.filter(card => card.groupedType == null).forEach((cardData: Card) => {
            cardData.groupedType = this.getCardType(cardData._data, true);
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
                if (this.newestPatchCards.find(c => c.code == mainCardCode)) {
                    if (this.newestPatchCards.find(c => c.code == mainCardCode)._data.supertype == 'Champion') {
                        return 'Champion'
                    }
                }
            }
        }

        return cardData.type;
    }

    public getDataJSON(patch, set = '1'): Observable<any> {
        return this.http.get(`./assets/jsons/data/set${set}_${patch}.json`);
    }

    public getAPIImage(cardData: Card) {
        return `https://dd.b.pvp.net/${cardData.patch}/set${cardData.set}/en_us/img/cards/${cardData.code}.png`;
    }

    public getAPIImageFromPatch(cardCode, cardPatchName) {
        let cardData = this.getDatabaseOfPatch(PatchInfo.find(p => p.name == cardPatchName))
            .find(c => c.code == cardCode);

        return this.getAPIImage(cardData);
    }

    public getExpeditionJSON(patchCode) {
        if (!patchCode) {
            patchCode = PatchInfo[PatchInfo.length - 1].code;
        }

        return this.http.get(`./assets/jsons/expedition/v${patchCode}.json`);
    }

    public getAPIArtwork(cardData: Card) {
        return `https://dd.b.pvp.net/${cardData.patch}/set${cardData.set}/en_us/img/cards/${cardData.code}-full.png`;
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

    private isSkippingAddingSpace(currentPart, nextPart) {
        let prevSkippingCharacters = ["\"", "'", "("];
        let nextSkippingCharacters = [',', ',', '.', "'", '-', "\"", "!", "’", ":", ")"];

        let prevCharacter = currentPart.value[currentPart.value.length - 1];
        let nextCharacter = nextPart.value[0];

        // 10+
        if (!isNaN(prevCharacter) && ['+', '-', '|'].includes(nextCharacter)) {
            return true;
        }

        // +3, |4
        if (['+', '-', '|'].includes(prevCharacter) && !isNaN(nextCharacter)) {
            return true;
        }

        // "x
        if (prevSkippingCharacters.includes(prevCharacter)) {
            return true;
        }

        // x.
        if (nextSkippingCharacters.includes(nextCharacter)) {
            return true;
        }

        // 8/9
        if (!isNaN(prevCharacter) && !isNaN(nextCharacter)) {
            return true;
        }

        return false;
    }

    public getCardChangeData(options: { display, modifyTypes, changeLog, patchNote, selectedPatch, isGrouped, isLink }, totalOldJSONData: Card[], totalNewJSONData: Card[]) {
        let logs = [];

        options.isGrouped = options.isGrouped == undefined ? true : options.isGrouped;
        options.isLink = options.isLink == undefined ? true : options.isLink;

        // Sort for Patch Note
        const sortRules = ['type', 'name', 'sortedCode'];
        totalOldJSONData = Utility.sortArrayByValues(totalOldJSONData, sortRules);
        totalNewJSONData = Utility.sortArrayByValues(totalNewJSONData, sortRules);

        const commonPrefix = !options.display ? '* ' : '';

        let currentPrefixText = "Text becomes: \"";
        let previousPrefixText = "Old Text: \"";
        let addedPrefixText = "Text added: \"";
        let removedPrefixText = "Text removed";
        let currentPrefixLevelUp = "Level Up becomes: \"";
        let previousPrefixLevelUp = "Old Level Up: \"";
        let currentPrefixFlavor = "Flavor becomes: \"";
        let previousPrefixFlavor = "Old Flavor: \"";
        let addedPrefixFlavor = "Flavor added: \"";
        let removedPrefixFlavor = "Flavor removed.";
        let newKeywordPrefix = "Now gain ";
        let removedKeywordPrefix = "No longer ";
        let addedHighlightedContent = '';
        let removedHighlightedContent = '';
        let startTipContent = '';
        let endTipContent = '';

        if (!options.display) {
            currentPrefixText = '* ' + currentPrefixText;
            previousPrefixText = '** ' + previousPrefixText;
            addedPrefixText = '* ' + addedPrefixText;
            removedPrefixText = '* ' + removedPrefixText;
            currentPrefixLevelUp = '* ' + currentPrefixLevelUp;
            previousPrefixLevelUp = '** ' + previousPrefixLevelUp;
            currentPrefixFlavor = "* " + currentPrefixFlavor;
            previousPrefixFlavor = "** " + previousPrefixFlavor;
            addedPrefixFlavor = "** " + addedPrefixFlavor;
            addedHighlightedContent = `'''`;
            removedHighlightedContent = `''`;
            startTipContent = '{{TipLoR|';
            endTipContent = '}}';
        }

        let handleLogDiff = (log) => {
            if (!log.diff.length) {
                return;
            }

            log.visible = options.modifyTypes.find(type => type.type & log.type).value == true;

            let unshiftContents = [];

            let additionalHref = '';
            if (options.changeLog) {
                additionalHref = '#Change_Log';
            }

            let href = `
                <a href="${'https://leagueoflegends.fandom.com/wiki/' + (log.newCard || log.oldCard).code + ' (Legends_of_Runeterra)' + additionalHref}"
                    target="_blank">
                    <i>To Wiki</i>
                    <svg width="24px" height="24px" viewBox="0 0 24 24">
                        <g stroke="#0d6efd" stroke-width="1.5" fill="none"
                            fill-rule="evenodd" stroke-linecap="round"
                            stroke-linejoin="round">
                            <polyline points="17 13.5 17 19.5 5 19.5 5 7.5 11 7.5">
                            </polyline>
                            <path d="M14,4.5 L20,4.5 L20,10.5 M20,4.5 L11,13.5"></path>
                        </g>
                    </svg>
                </a>`;
            if (options.display) {
                if (options.isLink) {
                    unshiftContents = [
                        `${(log.newCard || log.oldCard).name} (${(log.newCard || log.oldCard).code}) ${href}`
                    ]
                }
            }
            if (options.patchNote) {
                unshiftContents = [
                    `${href}`,
                    `: {{LoR|${(log.newCard || log.oldCard).name}|code=${(log.newCard || log.oldCard).code}}}`
                ]
            }
            if (options.changeLog) {
                let edittedCardName = (log.newCard || log.oldCard).name;
                // if ((log.newCard || log.oldCard).type == 'Champion' && (log.newCard || log.oldCard).code.lastIndexOf('T') >= 0) {
                //     edittedCardName += ' - Level 2';
                // }

                if (options.changeLog && (log.type & MODIFY_TYPE.ADD)) {
                    unshiftContents = [
                        `${href}`,
                        `== Change Log ==`,
                        `{| class="article-table ruling-table"`,
                        `! colspan="2" | <b>${edittedCardName}</b>`
                    ];
                } else {
                    unshiftContents = [
                        `<b>${edittedCardName}</b> ${href}`
                    ];
                }

                unshiftContents = unshiftContents.concat([
                    `|-`,
                    `| [[V${options.selectedPatch} (Legends of Runeterra)|V${options.selectedPatch}]]`,
                    `|`
                ]);
            }

            if (options.changeLog && (log.type & MODIFY_TYPE.ADD)) {
                log.diff.push(`|}`);
            }

            unshiftContents.reverse();
            unshiftContents.forEach(u => log.diff.unshift(u));

            if (options.isGrouped) {
                let logGroup = logs.find(l => l.type == (log.newCard || log.oldCard).groupedType);
                if (!logGroup) {
                    logGroup = {
                        type: (log.newCard || log.oldCard).groupedType,
                        list: []
                    }
                    logs.push(logGroup);
                }
                logGroup.list.push(log);
            } else {
                logs.push(log);
            }
        }

        totalNewJSONData.forEach(newCard => {
            const oldCard = totalOldJSONData.find(c => c.code == newCard.code);

            if (JSON.stringify(JSON['decycle'](oldCard)) != JSON.stringify(JSON['decycle'](newCard))) {
                let log = {
                    newCard,
                    oldCard,
                    'diff': [],
                    'type': null
                };

                if (!oldCard) {
                    log.diff.push(commonPrefix + `Added.`);
                    log.type = MODIFY_TYPE.ADD
                } else {
                    if (oldCard.name != newCard.name) {
                        log.diff.push(commonPrefix + `Renamed from <b>${addedHighlightedContent + oldCard.name + addedHighlightedContent}</b>.`);
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    if (oldCard.cost != newCard.cost) {
                        log.diff.push(commonPrefix + `Mana cost ${oldCard.cost < newCard.cost ? 'increased' : 'reduced'} to ${newCard.cost} from ${oldCard.cost}.`);
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    if (oldCard.power != newCard.power) {
                        log.diff.push(commonPrefix + `Power ${oldCard.power < newCard.power ? 'increased' : 'reduced'} to ${newCard.power} from ${oldCard.power}.`);
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    if (oldCard.health != newCard.health) {
                        log.diff.push(commonPrefix + `Health ${oldCard.health < newCard.health ? 'increased' : 'reduced'} to ${newCard.health} from ${oldCard.health}.`);
                        log.type = MODIFY_TYPE.CHANGE;
                    }


                    if (newCard.spellSpeed && oldCard.spellSpeed != newCard.spellSpeed) {
                        const startTip = startTipContent + newCard.spellSpeed + endTipContent;
                        const endTip = startTipContent + oldCard.spellSpeed + endTipContent;
                        log.diff.push(commonPrefix + `Spell speed changed to ${startTip} from ${endTip}.`);
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    let removedRegions = oldCard.regions.filter(x => !newCard.regions.includes(x));
                    let newRegions = newCard.regions.filter(x => !oldCard.regions.includes(x));

                    if (removedRegions.length || newRegions.length) {
                        if (removedRegions.length && !newRegions.length) {
                            const removedRegionContent = addedHighlightedContent + removedRegions.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `No longer belong to ${removedRegionContent}.`);
                        } else if (!removedRegions.length && newRegions.length) {
                            const newRegionContent = addedHighlightedContent + newRegions.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `Now belong to ${newRegionContent}.`);
                        } else {
                            const removedRegionContent = addedHighlightedContent + removedRegions.join(', ') + addedHighlightedContent;
                            const newRegionContent = addedHighlightedContent + newRegions.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `Now belong to ${newRegionContent} instead of ${removedRegionContent}.`);
                        }
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    let removedGroups = oldCard.group.filter(x => !newCard.group.includes(x));
                    let newGroups = newCard.group.filter(x => !oldCard.group.includes(x));
                    if (removedGroups.length || newGroups.length) {
                        if (removedGroups.length && !newGroups.length) {
                            const removedGroupContent = addedHighlightedContent + removedGroups.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `No longer belong to ${removedGroupContent}.`);
                        } else if (!removedGroups.length && newGroups.length) {
                            const newGroupContent = addedHighlightedContent + newGroups.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `Now belong to ${newGroupContent}.`);
                        } else {
                            const removedGroupContent = addedHighlightedContent + removedGroups.join(', ') + addedHighlightedContent;
                            const newGroupContent = addedHighlightedContent + newGroups.join(', ') + addedHighlightedContent;
                            log.diff.push(commonPrefix + `Now belong to ${newGroupContent} instead of ${removedGroupContent}.`);
                        }
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    let removedKeywords = oldCard._data['keywords'].filter(x => !newCard._data['keywords'].includes(x)).filter(x => !this.skippingKeywords.includes(x));
                    let newKeywords = newCard._data['keywords'].filter(x => !oldCard._data['keywords'].includes(x)).filter(x => !this.skippingKeywords.includes(x));
                    if (newKeywords.length) {
                        if (newKeywords.length == 1 && ["Skill", "Landmark"].includes(newKeywords[0])) {
                            log.diff.push(commonPrefix + `Back-end Updated.`);
                            if (!log.type) {
                                log.type = MODIFY_TYPE.BACK_END;
                            }
                        } else {
                            let content = commonPrefix + newKeywordPrefix + startTipContent + newKeywords.join(endTipContent + ', ') + endTipContent + '.';

                            log.diff.push(content);
                            log.type = MODIFY_TYPE.CHANGE;
                        }
                    }

                    if (removedKeywords.length) {
                        let content = commonPrefix + removedKeywordPrefix + startTipContent + removedKeywords.join(endTipContent + ', ') + endTipContent + '.';

                        log.diff.push(content);
                        log.type = MODIFY_TYPE.CHANGE;
                    }

                    let largeContents = [
                        {
                            object: 'description',
                            text: 'Description has',
                            currentPrefix: currentPrefixText,
                            previousPrefix: previousPrefixText,
                            addedPrefix: addedPrefixText,
                            removedPrefix: removedPrefixText,
                            isCheckedVisual: true
                        },
                        {
                            object: 'levelupDescription',
                            text: 'Level Up has',
                            currentPrefix: currentPrefixLevelUp,
                            previousPrefix: previousPrefixLevelUp,
                            isCheckedVisual: true
                        },
                        {
                            object: 'flavor',
                            currentPrefix: currentPrefixFlavor,
                            previousPrefix: previousPrefixFlavor,
                            addedPrefix: addedPrefixFlavor,
                            removedPrefix: removedPrefixFlavor
                        }
                    ]

                    let flag = 0;
                    largeContents.forEach(largeContent => {
                        if (oldCard[largeContent.object] != newCard[largeContent.object]) {
                            flag++;
                            if (largeContent.object == 'flavor' && flag == 1) {
                                if (!log.type) {
                                    log.type = MODIFY_TYPE.CHANGE_FLAVOR;
                                }
                            } else {
                                log.type = MODIFY_TYPE.CHANGE;
                            }

                            const diffParts = Diff.diffWords(oldCard[largeContent.object], newCard[largeContent.object], {
                                newlineIsToken: false,
                                ignoreWhitespace: true
                            });

                            if (largeContent.isCheckedVisual && oldCard[largeContent.object].trim() == newCard[largeContent.object].trim()) {
                                log.diff.push(commonPrefix + largeContent.text + ` Back-end Text Updated.`);
                                if (!log.type) {
                                    log.type = MODIFY_TYPE.BACK_END;
                                }
                            } else {
                                let prevExist = true;
                                let currentExist = true;
                                if (oldCard[largeContent.object].trim() == '' && largeContent.removedPrefix) {
                                    prevExist = false;
                                } else if (newCard[largeContent.object].trim() == '' && largeContent.addedPrefix) {
                                    currentExist = false;
                                }

                                let cleanedDiffParts = this.getCleanedDiffParts(diffParts);
                                let newDiv = [];

                                let currentPrefix = largeContent.currentPrefix;
                                if (!prevExist) {
                                    currentPrefix = largeContent.addedPrefix;
                                }

                                let newComparingContent = [{ value: currentPrefix }, ...cleanedDiffParts, { value: "\"" }];

                                if (!currentExist) {
                                    newComparingContent = [{ value: removedPrefixText }, { value: "." }]
                                }

                                let newContent = '';
                                newComparingContent.filter(p => !p.removed).forEach((part, index, array) => {
                                    // green for additions, red for deletions
                                    // grey for common parts
                                    const color = part.added ? 'green' :
                                        part.removed ? 'red' : 'black';

                                    if (index == 1 && part.value == '\n') {
                                        return;
                                    }

                                    let content = part.value;
                                    if (part.removed) {
                                        content = '';
                                    }

                                    if (index != 0) {
                                        newContent += content;
                                    }

                                    if (part.added) {
                                        content = addedHighlightedContent + part.value + addedHighlightedContent;
                                    }

                                    if (options.display) {
                                        let nextPart = array[index + 1];
                                        if (index > 0 && index < array.length - 2 && nextPart && !nextPart.removed) {
                                            if (!part.removed || index != 1) {
                                                if (!this.isSkippingAddingSpace(part, nextPart)) {
                                                    content += ' ';
                                                    newContent += ' ';
                                                }
                                            }
                                        }
                                    }

                                    newDiv.push(`<span style="color: ${color}">${content}</span>`);
                                });


                                let oldContent = '';

                                let oldDiv = [];
                                let oldComparingContent = []
                                if (oldCard[largeContent.object].trim() == '' && largeContent.removedPrefix) {
                                    // Added text.
                                } else {
                                    oldComparingContent = [{ value: largeContent.previousPrefix }, ...cleanedDiffParts, { value: "\"" }]
                                }
                                oldComparingContent.filter(p => !p.added).forEach((part, index, array) => {
                                    const color = part.added ? 'green' :
                                        part.removed ? 'red' : 'black';

                                    let content = part.value;

                                    if (part.added) {
                                        content = '';
                                    }

                                    if (index != 0) {
                                        oldContent += content;
                                    }

                                    if (part.removed) {
                                        content = removedHighlightedContent + part.value + removedHighlightedContent;
                                    }

                                    if (options.display) {
                                        let nextPart = array[index + 1];
                                        if (index > 0 && index < array.length - 2 && nextPart && !nextPart.added) {
                                            if (!part.added || index != 1) {
                                                if (!this.isSkippingAddingSpace(part, nextPart)) {
                                                    content += ' ';
                                                    oldContent += ' ';
                                                }
                                            }
                                        }
                                    }

                                    oldDiv.push(`<span style="color: ${color}">${content}</span>`);
                                });

                                if (oldContent == newContent) {
                                    log.diff.push(commonPrefix + largeContent.text + ` Back-end Text Updated.`);
                                    log.type = MODIFY_TYPE.BACK_END;
                                } else {
                                    if (newDiv.length) {
                                        log.diff.push(newDiv.join(''));
                                    }

                                    if (oldDiv.length) {
                                        if (options.display) {
                                            oldDiv.unshift(`<span style="display: inline-block; width: 37px;"></span>`);
                                        }

                                        log.diff.push(oldDiv.join(''));
                                    }
                                }
                            }
                        } else if (largeContent.isCheckedVisual) {
                            if (Utility.cleanUpTextContent(oldCard['_data'][largeContent.object]) != Utility.cleanUpTextContent(newCard['_data'][largeContent.object])) {
                                log.diff.push(commonPrefix + largeContent.text + ` Back-end Text Updated.`);
                                if (!log.type) {
                                    log.type = MODIFY_TYPE.BACK_END;
                                }
                            }
                        }
                    });

                    if (oldCard.artist != newCard.artist) {
                        let oldArtist = oldCard.artist != '<Unknown>' ? oldCard.artist : '';
                        let newArtist = newCard.artist != '<Unknown>' ? newCard.artist : '';
                        if (!oldArtist) {
                            log.diff.push(commonPrefix + `Artist added: ${newArtist}.`);
                        } else {
                            if (!newArtist) {
                                log.diff.push(commonPrefix + `Artist removed, before that was ${oldArtist}.`);
                            } else {
                                log.diff.push(commonPrefix + `Artist changed to ${newArtist} from ${oldArtist}.`);
                            }
                        }

                        if (!log.type) {
                            log.type = MODIFY_TYPE.CHANGE_FLAVOR;
                        }
                    }
                }

                handleLogDiff(log);
            }
        });

        // Check Removed cards
        totalOldJSONData.forEach(oldCard => {
            const newCard = totalNewJSONData.find(c => c.code == oldCard.code)
            if (!newCard) {
                let log = {
                    newCard,
                    oldCard,
                    'diff': [],
                    'type': MODIFY_TYPE.REMOVE
                };

                log.diff.push(commonPrefix + `Removed.`);

                handleLogDiff(log);
            }
        });

        if (options.isGrouped) {
            logs.forEach(logGroup => {
                logGroup.list = logGroup.list.sort((a, b) => (a.newCard || a.oldCard).name.localeCompare((b.newCard || b.oldCard).name));
            });
        }

        return logs;
    }

    private getCleanedDiffParts(diffParts) {
        let cleanedDiffParts = [...diffParts];
        let emptyDiffIndexs = [];

        cleanedDiffParts.forEach((part, index) => {
            if (!part.added && !part.removed && part.value == " ") {
                emptyDiffIndexs.push(index);
            }
        });

        emptyDiffIndexs.forEach(emptyIndex => {
            if (emptyIndex - 2 >= 0) {
                cleanedDiffParts[emptyIndex - 2].value += cleanedDiffParts[emptyIndex].value;
            }
            if (emptyIndex - 1 >= 0) {
                cleanedDiffParts[emptyIndex - 1].value += cleanedDiffParts[emptyIndex].value;
            }
        });
        emptyDiffIndexs.reverse();

        emptyDiffIndexs.forEach(emptyIndex => {
            cleanedDiffParts.splice(emptyIndex, 1)
        });

        // Join continuous added/removed parts
        cleanedDiffParts.forEach((part, index) => {
            if (part.removed) {
                let loopIndex = index;
                let sameIndexes = [];
                let firstPart = cleanedDiffParts[loopIndex];
                while (loopIndex + 2 <= cleanedDiffParts.length - 1) {
                    if (cleanedDiffParts[loopIndex + 1].added) {
                        if (cleanedDiffParts[loopIndex + 1].value.indexOf(" ") >= 0 &&
                            cleanedDiffParts[loopIndex + 1].value.slice(-1) != ' ') {
                            break;
                        }

                        if (cleanedDiffParts[loopIndex + 2].removed) {
                            sameIndexes.push(loopIndex + 2);
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                    loopIndex += 2;
                }

                sameIndexes.forEach(i => {
                    firstPart.value += cleanedDiffParts[i].value;
                });

                sameIndexes.reverse();

                sameIndexes.forEach(i => {
                    cleanedDiffParts.splice(i, 1)
                });
            } else if (part.added) {
                let loopIndex = index;
                let sameIndexes = [];
                let firstPart = cleanedDiffParts[loopIndex];
                while (loopIndex + 1 <= cleanedDiffParts.length - 1) {
                    if (cleanedDiffParts[loopIndex + 1].added) {
                        sameIndexes.push(loopIndex + 1);
                    } else {
                        break;
                    }
                    loopIndex += 1;
                }

                sameIndexes.forEach(i => {
                    firstPart.value += cleanedDiffParts[i].value;
                });

                sameIndexes.reverse();
                sameIndexes.forEach(i => {
                    cleanedDiffParts.splice(i, 1)
                });
            }
        });

        // Clean up parts
        cleanedDiffParts.forEach((part, index) => {
            let prevPart = cleanedDiffParts[index - 1];
            if (!prevPart) {
                return;
            }

            if (["'", ",", "."].includes(part.value[0])) {
                if (prevPart.value[prevPart.value.length - 1] == ' ') {
                    prevPart.value = prevPart.value.slice(0, -1);
                }
            }

            let nextPart = cleanedDiffParts[index + 1];
            if (!nextPart) {
                return;
            }

            if ((part.added && nextPart.added) || (part.removed && nextPart.removed)) {
                part.value += nextPart.value;
                nextPart.value = '';
            }
        });

        cleanedDiffParts = cleanedDiffParts.filter(part => part.value != '');

        return cleanedDiffParts;
    }
}
