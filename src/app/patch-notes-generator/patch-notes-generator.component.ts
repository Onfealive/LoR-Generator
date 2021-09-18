import { Component, OnInit } from '@angular/core';
import * as Diff from "diff";
import * as Utility from "../shared/utility";
import { saveAs } from 'file-saver';
import { PatchInfo } from '../shared/patches';
import { DatabaseService } from '../shared/database.service';

declare var $: any;

@Component({
    selector: 'app-patch-notes-generator',
    templateUrl: './patch-notes-generator.component.html',
    styleUrls: ['./patch-notes-generator.component.scss']
})
export class PatchNotesGeneratorComponent implements OnInit {
    title = 'Drop JSON patch files, with format: "<Set Name>_<Patch Name>.json". Example: set2_1.6.json.';
    files: File[] = [];
    error = '';

    defaultImage = `./assets/icons/Queue Card Back.png`;

    modifyTypes = [];
    displayType = 'display';

    selectedPatch = null;
    comparingPatch = null;
    selectedDatabase = {};
    comparingDatabase = {};

    customDatabase = {};

    isCompleted = false;

    patchInfo = [];
    logs: any = [];
    PatchInfo = PatchInfo; // for Client-only
    MODIFY_TYPE = MODIFY_TYPE; // for Client-only

    constructor(
        private databaseService: DatabaseService
    ) { }

    ngOnInit(): void {
        let patchLength = Object.keys(PatchInfo).length;
        Object.keys(PatchInfo).forEach((patchVersion, index) => {
            this.patchInfo.push({
                'name': patchVersion,
                'code': PatchInfo[patchVersion].code,
                'checked': index == patchLength - 1,
                'maxSet': PatchInfo[patchVersion].maxSet
            })
        });

        this.addModifyTypes();

        let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
        this.selectedPatch = this.patchInfo[selectedPatchIndex].name;
        this.comparingPatch = this.patchInfo[selectedPatchIndex - 1].name;
    }

    addModifyTypes() {
        this.modifyTypes = [];

        let modifyTypes = [];
        modifyTypes.push({ id: 'add', text: 'Added', type: MODIFY_TYPE.ADD, value: true });
        modifyTypes.push({ id: 'change', text: 'Changed', type: MODIFY_TYPE.CHANGE | MODIFY_TYPE.CHANGE_FLAVOR, value: true });
        modifyTypes.push({ id: 'remove', text: 'Removed', type: MODIFY_TYPE.REMOVE, value: true });

        this.modifyTypes = modifyTypes;
    }

    getCards(modifyType: MODIFY_TYPE) {
        return this.logs.map(function (logGroup) {
            return logGroup.list.filter(l => l.type & modifyType).map(l => l.data)
        }).flat();
    }

    get getAddedCards() {
        return this.getCards(MODIFY_TYPE.ADD);
    }

    get getChangedCards() {
        return this.getCards(MODIFY_TYPE.CHANGE | MODIFY_TYPE.CHANGE_FLAVOR);
    }

    get getRemovedCards() {
        return this.getCards(MODIFY_TYPE.REMOVE);
    }

    selectPatchInfo(pathcInfo) {
        this.patchInfo.find(p => p.checked).checked = false;
        pathcInfo.checked = true;
        this.isCompleted = false;

        let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
        this.selectedPatch = this.patchInfo[selectedPatchIndex].name;
        this.comparingPatch = this.patchInfo[selectedPatchIndex - 1].name;

        this.addModifyTypes();
    }

    compare() {
        let flag = 0;
        if (this.selectedPatch !== 'custom') {
            this.databaseService.getCardData(this.comparingPatch).subscribe(database => {
                this.comparingDatabase = database;
                flag++;
                if (flag == 2) {
                    setTimeout(() => {
                        this._compareJson();
                    }, 0);
                }
            });
            this.databaseService.getCardData(this.selectedPatch).subscribe(database => {
                this.selectedDatabase = database;
                flag++;
                if (flag == 2) {
                    setTimeout(() => {
                        this._compareJson();
                    }, 0);
                }
            });
        } else {
            this.selectedDatabase = this.customDatabase;
            this.databaseService.getCardData().subscribe(database => {
                this.comparingDatabase = database;
                setTimeout(() => {
                    this._compareJson();
                }, 0);
            });
        }
    }

    getAPIImage(patchCode, cardcode) {
        return this.databaseService.getAPIImage(patchCode, cardcode);
    }

    optionDisplayChanged(inputOption) {
        this.displayType = inputOption;
        this.compare();
    }

    optionModifyChanged(modifyType: MODIFY_TYPE) {
        let modifyData = this.modifyTypes.find(m => m.type == modifyType);
        modifyData.value = !modifyData.value;
        this.compare();
    }

    onSelect(event) {
        this.error = '';
        this.isCompleted = false;
        this.files = [];

        const draggedFiles = [...event.addedFiles];
        draggedFiles.sort((a, b) => {
            return a.name - b.name;
        });

        this.files.push(...draggedFiles);

        this.customDatabase = {};
        this.selectedPatch = 'custom';

        let customDatabase = {};
        let countFiles = 0;

        this.files.forEach(file => {
            let currentFile = file.name.replace('.json', '').split('_');

            const selectedFile = file;
            const fileReader = new FileReader();
            fileReader.readAsText(selectedFile, "UTF-8");
            fileReader.onload = () => {
                try {
                    if (!customDatabase[currentFile[0]]) {
                        customDatabase[currentFile[0]] = {};
                    }
                    customDatabase[currentFile[0]][currentFile[1]] = fileReader.result as string;

                    countFiles += 1;
                    if (countFiles == this.files.length) {
                        if ($.isEmptyObject(customDatabase)) {
                            throw 'Empty Object';
                        }
                        this.customDatabase = this.databaseService.convertData2Database(customDatabase, currentFile[1])
                        this.compare();
                    }
                } catch (error) {
                    console.log(error);
                    this.error = 'The file contains no data, or is not formatted in Riot. Please refer to the "Utility" tab.';
                }

            }
            fileReader.onerror = (error) => {
                console.log(error);
                this.error = 'The file contains no data, or is not formatted in Riot. Please refer to the "Utility" tab.';
            }
        });
    }

    onRemove(event) {
        this.files.splice(this.files.indexOf(event), 1);
    }

    _compareJson() {
        this.isCompleted = true;

        let options: any = {};
        options[this.displayType] = true;
        // Init
        const defaults = {
            display: false,
            patchNote: false,
            newChangeLog: false
        };

        options = Object.assign({}, defaults, options);

        // Handleing
        let totalOldJSONData = this.comparingDatabase;
        let totalNewJSONData = this.selectedDatabase;

        // Sort for Patch Note
        const sortRules = ['type', 'name', 'sortedCode'];
        totalOldJSONData = Utility.sortObjectByValues(totalOldJSONData, sortRules);
        totalNewJSONData = Utility.sortObjectByValues(totalNewJSONData, sortRules);

        this.logs = [];

        const commonPrefix = !options.display ? '* ' : '';

        let newPrefixText = "Text becomes: \"";
        let oldPrefixText = "Old Text: \"";
        let newPrefixLevelUp = "Level Up becomes: \"";
        let oldPrefixLevelUp = "Old Level Up: \"";
        let newPrefixFlavor = "Flavor becomes: \"";
        let oldPrefixFlavor = "Old Flavor: \"";
        let newKeywordPrefix = "Now gain ";
        let removedKeywordPrefix = "No longer ";
        let addedHighlightedContent = '';
        let removedHighlightedContent = '';
        let startTipContent = '';
        let endTipContent = '';

        if (!options.display) {
            newPrefixText = '* ' + newPrefixText;
            oldPrefixText = '** ' + oldPrefixText;
            newPrefixLevelUp = '* ' + newPrefixLevelUp;
            oldPrefixLevelUp = '** ' + oldPrefixLevelUp;
            newPrefixFlavor = "* " + newPrefixFlavor;
            oldPrefixFlavor = "** " + oldPrefixFlavor;
            addedHighlightedContent = `'''`;
            removedHighlightedContent = `''`;
            startTipContent = '{{TipLoR|';
            endTipContent = '}}';
        }

        let handleLogDiff = (log) => {
            if (!log.diff.length) {
                return;
            }

            log.display = this.modifyTypes.find(type => type.type & log.type).value == true;
            let unshiftContents = [];

            let href = `
                <a href="${'https://leagueoflegends.fandom.com/wiki/' + log.data.code + ' (Legends_of_Runeterra)'}"
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
                unshiftContents = [
                    `${log.data.name} (${log.data.code}) ${href}`
                ]
            }
            if (options.patchNote) {
                unshiftContents = [
                    `${href}`,
                    `: {{LoR|${log.data.name}|code=${log.data.code}}}`
                ]
            }
            if (options.newChangeLog) {
                let edittedCardName = log.data.name;
                if (log.data.type == 'Champion' && log.data.code.lastIndexOf('T') >= 0) {
                    edittedCardName += ' - Level 2';
                }

                if (options.newChangeLog && (log.type & MODIFY_TYPE.ADD)) {
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
                    `| [[V${this.selectedPatch} (Legends of Runeterra)|V${this.selectedPatch}]]`,
                    `|`
                ]);
            }

            if (options.newChangeLog && (log.type & MODIFY_TYPE.ADD)) {
                log.diff.push(`|}`);
            }

            unshiftContents.reverse().forEach(u => log.diff.unshift(u));

            let logGroup = this.logs.find(l => l.type == log.data.groupedType);
            if (!logGroup) {
                logGroup = {
                    type: log.data.groupedType,
                    list: []
                }
                this.logs.push(logGroup);
            }
            logGroup.list.push(log);
        }

        Object.keys(totalNewJSONData).forEach(cardCode => {
            const oldCard = totalOldJSONData[cardCode];
            const newCard = totalNewJSONData[cardCode];
            if (JSON.stringify(oldCard) != JSON.stringify(newCard)) {
                let log = {
                    'data': newCard,
                    'diff': [],
                    'type': MODIFY_TYPE.CHANGE
                };

                if (!oldCard) {
                    log.diff.push(commonPrefix + `Added.`);
                    log.type = MODIFY_TYPE.ADD
                } else {
                    // newCard.code == '03SI015' && console.log(JSON.stringify(oldCard), JSON.stringify(newCard))
                    if (oldCard.name != newCard.name) {
                        log.diff.push(commonPrefix + `Renamed from ${addedHighlightedContent + oldCard.name + addedHighlightedContent}.`);
                    }

                    if (oldCard.cost != newCard.cost) {
                        log.diff.push(commonPrefix + `Mana cost ${oldCard.cost < newCard.cost ? 'increased' : 'reduced'} to ${newCard.cost} from ${oldCard.cost}.`);
                    }

                    if (oldCard.power != newCard.power) {
                        log.diff.push(commonPrefix + `Power ${oldCard.power < newCard.power ? 'increased' : 'reduced'} to ${newCard.power} from ${oldCard.power}.`);
                    }

                    if (oldCard.health != newCard.health) {
                        log.diff.push(commonPrefix + `Health ${oldCard.health < newCard.health ? 'increased' : 'reduced'} to ${newCard.health} from ${oldCard.health}.`);
                    }

                    if (oldCard.spellSpeed != newCard.spellSpeed) {
                        const startTip = startTipContent + newCard.spellSpeed + endTipContent;
                        const endTip = startTipContent + oldCard.spellSpeed + endTipContent;
                        log.diff.push(commonPrefix + `Spell speed changed to ${startTip} from ${endTip}.`);
                    }

                    let removedRegions = oldCard.regions.filter(x => !newCard.regions.includes(x));
                    let newRegions = newCard.regions.filter(x => !oldCard.regions.includes(x));
                    if (newCard.code == '02BW046') {
                        console.log(oldCard, newCard)
                    }
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
                    }

                    let removedKeywords = oldCard._data.keywords.filter(x => !newCard._data.keywords.includes(x));
                    let newKeywords = newCard._data.keywords.filter(x => !oldCard._data.keywords.includes(x));
                    if (newKeywords.length) {
                        let content = commonPrefix + newKeywordPrefix + startTipContent + newKeywords.join(endTipContent + ', ') + endTipContent + '.';

                        log.diff.push(content);
                    }

                    if (removedKeywords.length) {
                        let content = commonPrefix + removedKeywordPrefix + startTipContent + removedKeywords.join(endTipContent + ', ') + endTipContent + '.';

                        log.diff.push(content);
                    }

                    let largeContents = [
                        {
                            object: 'description',
                            text: 'Description has',
                            newPrefix: newPrefixText,
                            oldPrefix: oldPrefixText,
                            isCheckedVisual: true
                        },
                        {
                            object: 'levelupDescription',
                            text: 'Level Up has',
                            newPrefix: newPrefixLevelUp,
                            oldPrefix: oldPrefixLevelUp,
                            isCheckedVisual: true
                        },
                        {
                            object: 'flavor',
                            newPrefix: newPrefixFlavor,
                            oldPrefix: oldPrefixFlavor
                        }
                    ]

                    let flag = 0;
                    largeContents.forEach(largeContent => {
                        if (oldCard[largeContent.object] != newCard[largeContent.object]) {
                            flag++;
                            if (largeContent.object == 'flavor' && flag == 1) {
                                log.type = MODIFY_TYPE.CHANGE_FLAVOR;
                            }
                            if (largeContent.isCheckedVisual && oldCard[largeContent.object].trim() == newCard[largeContent.object].trim()) {
                                log.diff.push(commonPrefix + largeContent.text + ` Back-end Text Updated.`);
                            } else {
                                const diffParts = Diff.diffWords(oldCard[largeContent.object], newCard[largeContent.object], {
                                    newlineIsToken: false
                                });

                                let cleanedDiffParts = this.getCleanedDiffParts(diffParts);

                                let newDiv = [];
                                [{ value: largeContent.newPrefix }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.removed).forEach((part, index) => {
                                    // green for additions, red for deletions
                                    // grey for common parts
                                    const color = part.added ? 'green' :
                                        part.removed ? 'red' : 'black';

                                    if (index == 1 && part.value == '\n') {
                                        return;
                                    }

                                    let content = part.value;
                                    if (part.added) {
                                        content = addedHighlightedContent + part.value + addedHighlightedContent
                                    }

                                    newDiv.push(`<span style="color: ${color}">${content}</span>`);
                                });

                                if (newDiv.length) {
                                    log.diff.push(newDiv.join(''));
                                }

                                let oldDiv = [];
                                [{ value: largeContent.oldPrefix }, ...cleanedDiffParts, { value: "\"" }].filter(part => !part.added).forEach((part, index) => {
                                    const color = part.added ? 'green' :
                                        part.removed ? 'red' : 'black';

                                    let content = part.value;
                                    if (part.removed) {
                                        content = removedHighlightedContent + part.value + removedHighlightedContent;
                                    }

                                    oldDiv.push(`<span style="color: ${color}">${content}</span>`);
                                });

                                if (oldDiv.length) {
                                    if (options.display) {
                                        oldDiv.unshift(`<span style="display: inline-block; width: 37px;"></span>`);
                                    }

                                    log.diff.push(oldDiv.join(''));
                                }
                            }
                        } else if (largeContent.isCheckedVisual) {
                            if (Utility.cleanNewline(oldCard['_data'][largeContent.object]) != Utility.cleanNewline(newCard['_data'][largeContent.object])) {
                                log.diff.push(commonPrefix + largeContent.text + ` Back-end Text Updated.`);
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
                    }
                }

                handleLogDiff(log);
            }
        });

        // Check Removed cards
        Object.keys(totalOldJSONData).forEach(cardCode => {
            const oldCard = totalOldJSONData[cardCode];
            const newCard = totalNewJSONData[cardCode];
            if (!newCard) {
                let log = {
                    'data': oldCard,
                    'diff': [],
                    'type': MODIFY_TYPE.REMOVE
                };

                log.diff.push(commonPrefix + `Removed.`);

                handleLogDiff(log);
            }
        });
    }

    generateChangedCardList() {
        let changedCards = this.getChangedCards;

        let cardChangeContent = changedCards.map(card => card.code + '.png').join('\n');
        cardChangeContent += ('\n') + changedCards.map(card => card.code + '-alt.png').join('\n');

        const blob = new Blob([cardChangeContent], { type: "text/plain;charset=utf-8" });
        saveAs(blob, `${this.selectedPatch}_CardChangesList.txt`);
    }

    generateNewCardList() {
        let addedCards = this.getAddedCards;

        let cardAddedContent = addedCards.map(card => card.code + '.png').join('\n');
        cardAddedContent += ('\n') + addedCards.map(card => card.code + '-alt.png').join('\n');
        cardAddedContent += ('\n') + addedCards.map(card => card.code + '-full.png').join('\n');
        cardAddedContent += ('\n') + addedCards.map(card => card.code + '-alt-full.png').join('\n');

        const blob = new Blob([cardAddedContent], { type: "text/plain;charset=utf-8" });
        saveAs(blob, `${this.selectedPatch}_CardChangesList.txt`);
    }

    convertNewCards() {
        let addedCards = this.getAddedCards;
        var result = {};

        let database = {};
        if (this.selectedPatch !== 'custom') {
            database = this.selectedDatabase;
        } else {
            database = this.customDatabase;
        }

        addedCards.forEach(addedCard => {
            let cardData = database[addedCard.code];
            let rawCardData = cardData._data;
            let subtype = Utility.capitalize(rawCardData.subtype);

            let keywords = cardData.keywords;
            keywords.sort();

            result[rawCardData.cardCode] = Utility.cleanObject({
                name: rawCardData.name,
                type: rawCardData.type,
                rarity: rawCardData.collectible ? rawCardData.rarityRef : 'None',
                subtype: subtype ? [subtype] : '',
                supertype: rawCardData.supertype,
                keywords: rawCardData.keywords,
                keywordRefs: keywords,
                collectible: rawCardData.collectible,
                cost: rawCardData.cost,
                power: rawCardData.attack,
                health: rawCardData.health,
                desc: rawCardData.descriptionRaw,
                lvldesc: rawCardData.levelupDescriptionRaw,
                categoryRefs: subtype ? [subtype] : '',
                flavor: rawCardData.flavorText,
                regions: rawCardData.regions,
                artist: rawCardData.artistName
            });
        });

        result = Utility.sortObjectByKey(result);

        let fileContent = JSON.stringify(result, (key, value) => {
            if (Array.isArray(value) && !value.some(x => x && typeof x === 'object')) {
                return `\uE000${JSON.stringify(value.map(v => typeof v === 'string' ? v.replace(/"/g, '\uE001') : v))}\uE000`;
            }
            return value;
        }, 4).replace(/"\uE000([^\uE000]+)\uE000"/g, match => match.substr(2, match.length - 4).replace(/\\"/g, '"').replace(/\uE001/g, '\\\"'));

        fileContent = fileContent.split(`\\r\\n`).join(`<br />`);
        fileContent = fileContent.split(`\\n`).join(`<br />`);
        fileContent = fileContent.split(`[`).join(`{`);
        fileContent = fileContent.split(`]`).join(`}`);
        fileContent = fileContent.split(`"0`).join(`["0`);

        let titles = ['name', 'type', 'rarity', 'subtype', 'supertype', 'keywords', 'keywordRefs', 'collectible', 'cost', 'power', 'health', 'desc', 'lvldesc', 'categoryRefs', 'flavor', 'artist', 'regions']

        titles.forEach(title => {
            fileContent = fileContent.split(`"${title}": `).join(`["${title}"]`.padEnd(17, ' ') + '= ');
        });

        fileContent = fileContent.split(`": {`).join(`"] = {`);

        const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
        saveAs(blob, `${this.selectedPatch}_AddedCardsData.txt`);
    }

    copy2Clipboard(diffData) {
        var htmlElementRegex = /(<([^>]+)>)/ig;

        let copiedText = diffData.slice(1, diffData.length).join('\n').replace(htmlElementRegex, "");
        copiedText = copiedText.replace(/  +/g, ' ');

        copiedText = copiedText.replace(/(\r\n|\r|\n){2}/g, '$1');
        copiedText = copiedText.replace(/(\r\n|\r|\n){3,}/g, '$1\n');

        this.databaseService.copy2Clipboard(copiedText);
    }

    getCleanedDiffParts(diffParts) {
        let cleanedDiffParts = [...diffParts];
        let emptyDiffIndexs = [];
        cleanedDiffParts.forEach((part, index) => {
            if (!part.added && !part.removed && part.value == " ") {
                emptyDiffIndexs.push(index);
            }
        })
        emptyDiffIndexs.forEach(emptyIndex => {
            if (emptyIndex - 2 >= 0) {
                cleanedDiffParts[emptyIndex - 2].value += cleanedDiffParts[emptyIndex].value;
            }
            if (emptyIndex - 1 >= 0) {
                cleanedDiffParts[emptyIndex - 1].value += cleanedDiffParts[emptyIndex].value;
            }
        });
        emptyDiffIndexs.reverse().forEach(emptyIndex => {
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

                sameIndexes.reverse().forEach(i => {
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

                sameIndexes.reverse().forEach(i => {
                    cleanedDiffParts.splice(i, 1)
                });
            }
        });

        // Clean up parts
        cleanedDiffParts.forEach((part, index) => {
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

        cleanedDiffParts.forEach((part, index) => {
            if (part.added || part.removed) {
                if (part.value[0] == ' ') {
                    if (cleanedDiffParts[index - 1]) {
                        part.value = part.value.slice(1);
                        cleanedDiffParts[index - 1].value = cleanedDiffParts[index - 1].value + " ";
                    }
                }
                if (part.value[part.value.length - 1] == ' ') {
                    if (cleanedDiffParts[index + 1]) {
                        part.value = part.value.slice(0, -1);
                        cleanedDiffParts[index + 1].value = " " + cleanedDiffParts[index + 1].value;
                    }
                }
            }
        });

        return cleanedDiffParts;
    }
}

enum MODIFY_TYPE {
    ADD = 1,
    CHANGE = 2,
    CHANGE_FLAVOR = 4,
    REMOVE = 8
}
