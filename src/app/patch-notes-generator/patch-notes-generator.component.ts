import { Component, OnInit } from '@angular/core';

import * as Utility from "../shared/utility";
import { saveAs } from 'file-saver';
import { PatchInfo, PatchInfoInterface } from '../shared/patches';
import { DatabaseService } from '../shared/database.service';
import { Card, MODIFY_TYPE } from '../shared/defined';

declare let $: any;

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

    oldPatch: PatchInfoInterface = null;
    newPatch: PatchInfoInterface = null;

    customDatabase: Card[] = [];

    isCompleted = false;
    isLoading = false;
    isCustom = false;

    patchInfo = [];
    logs: any = [];
    PatchInfo = PatchInfo; // for Client-only
    MODIFY_TYPE = MODIFY_TYPE; // for Client-only

    constructor(
        private databaseService: DatabaseService
    ) { }

    ngOnInit(): void {
        let patchLength = PatchInfo.length;
        PatchInfo.forEach((patchInfo, index) => {
            this.patchInfo.push({
                'name': patchInfo.name,
                'code': patchInfo.code,
                'checked': index == patchLength - 1,
                'upcoming': patchInfo.isUpcoming
            })
        });

        this.addModifyTypes();

        let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
        this.newPatch = PatchInfo[selectedPatchIndex];
        this.oldPatch = PatchInfo[selectedPatchIndex - 1];
    }

    addModifyTypes() {
        this.modifyTypes = [];

        let modifyTypes = [];
        modifyTypes.push({ id: 'add', text: 'Added', type: MODIFY_TYPE.ADD, value: true });
        modifyTypes.push({ id: 'change', text: 'Changed', type: MODIFY_TYPE.CHANGE | MODIFY_TYPE.CHANGE_FLAVOR, value: true });
        modifyTypes.push({ id: 'remove', text: 'Removed', type: MODIFY_TYPE.REMOVE, value: false });
        modifyTypes.push({ id: 'backed', text: 'Back-End', type: MODIFY_TYPE.BACK_END, value: false });

        this.modifyTypes = modifyTypes;
    }

    getCards(modifyType: MODIFY_TYPE) {
        return this.logs.map(function (logGroup) {
            return logGroup.list.filter(l => l.type & modifyType).map(l => l.newCard)
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

        let selectedPatchIndex = this.patchInfo.findIndex(p => p.checked);
        this.newPatch = PatchInfo[selectedPatchIndex];
        this.oldPatch = PatchInfo[selectedPatchIndex - 1];

        this.isCustom = false;
        this.files = [];
    }

    compare() {
        this.isLoading = true;
        this.logs = [];
        this.addModifyTypes();

        let flag = 0;
        this.isCustom = false;
        this.files = [];

        this.databaseService.getCardData(this.oldPatch).subscribe(database => {
            flag++;
            if (flag == 2) {
                setTimeout(() => {
                    this._compareJson();
                }, 0);
            }
        });
        this.databaseService.getCardData(this.newPatch).subscribe(database => {
            flag++;
            if (flag == 2) {
                setTimeout(() => {
                    this._compareJson();
                }, 0);
            }
        });
    }

    getAPIImage(cardData: Card) {
        return this.databaseService.getAPIImage(cardData);
    }

    optionDisplayChanged(inputOption) {
        this.displayType = inputOption;
        this.logs = [];
        this._compareJson();
    }

    optionModifyChanged(modifyType: MODIFY_TYPE) {
        let modifyData = this.modifyTypes.find(m => m.type == modifyType);
        modifyData.value = !modifyData.value;
        this._compareJson();
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

        this.customDatabase = []
        this.isCustom = true;

        let customDatabase: Card[] = [];
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
                        this._compareJson();
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
        this.logs = [];

        this.isCompleted = true;
        this.isLoading = true;

        let options: any = {};
        options[this.displayType] = true;
        // Init
        const defaults = {
            display: false,
            patchNote: false,
            changeLog: false
        };

        options = Object.assign({}, defaults, options);
        options.modifyTypes = this.modifyTypes;
        options.selectedPatch = this.newPatch.name;

        // Handleing
        let totalOldJSONData = this.isCustom ? this.databaseService.newestPatchCards : this.databaseService.getDatabaseOfPatch(this.oldPatch)
        let totalNewJSONData = this.isCustom ? this.customDatabase : this.databaseService.getDatabaseOfPatch(this.newPatch);

        this.logs = this.databaseService.getCardChangeData(options, totalOldJSONData, totalNewJSONData);

        this.isLoading = false;
    }

    convertNewCards() {
        let addedCards = Utility.sortArrayByValues(this.getAddedCards, ['sortedCode']);
        let result = {};

        addedCards.forEach((cardData: Card) => {
            let rawCardData = cardData._data;
            let subtypes = Utility.capitalize(rawCardData.subtypes);

            result[rawCardData.cardCode] = Utility.cleanObject({
                name: rawCardData.name,
                type: rawCardData.type,
                rarity: rawCardData.collectible ? rawCardData.rarityRef : 'None',
                subtype: subtypes.length ? subtypes : '',
                supertype: rawCardData.supertype,
                keywords: cardData.keywords,
                keywordRefs: cardData.keywordRefs,
                collectible: rawCardData.collectible,
                cost: rawCardData.cost,
                power: rawCardData.attack,
                health: rawCardData.health,
                desc: rawCardData.descriptionRaw,
                lvldesc: rawCardData.levelupDescriptionRaw,
                categoryRefs: subtypes.length ? subtypes : '',
                flavor: rawCardData.flavorText,
                regions: rawCardData.regions,
                artist: rawCardData.artistName
            });

            if (!["Unit", "Equipment"].includes(rawCardData.type)) {
                delete result[rawCardData.cardCode].power;
                delete result[rawCardData.cardCode].health;
            }
        });

        let fileContent = JSON.stringify(result, (key, value) => {
            if (Array.isArray(value) && !value.some(x => x && typeof x === 'object')) {
                return `\uE000${JSON.stringify(value.map(v => typeof v === 'string' ? v.replace(/"/g, '\uE001') : v))}\uE000`;
            }
            return value;
        }, 4).replace(/"\uE000([^\uE000]+)\uE000"/g, match => match.substring(2, match.length - 2).replace(/\\"/g, '"').replace(/\uE001/g, '\\\"'));

        fileContent = fileContent.split(`’`).join(`'`);
        fileContent = fileContent.split(`“`).join(`\\"`);
        fileContent = fileContent.split(`”`).join(`\\"`);
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

        const blob = new Blob([fileContent], { type: "application/lua;charset=utf-8" });
        saveAs(blob, `${this.isCustom ? 'custom' : this.newPatch.name}_AddedCardsData.lua`);
    }

    copy2Clipboard(diffData) {
        let htmlElementRegex = /(<([^>]+)>)/ig;

        let copiedText = diffData.slice(1, diffData.length).join('\n').replace(htmlElementRegex, "");
        copiedText = copiedText.replace(/  +/g, ' ');

        copiedText = copiedText.replace(/(\r\n|\r|\n){2}/g, '$1');
        copiedText = copiedText.replace(/(\r\n|\r|\n){3,}/g, '$1\n');

        this.databaseService.copy2Clipboard(copiedText);
    }
}

