import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import * as XLSX from 'xlsx';

import * as Utility from "../shared/utility";
import { DatabaseService } from '../shared/database.service';
import { ExpeditionInfo } from '../shared/expeditions';

declare var $: any;
declare var bootstrap: any;

@Component({
    selector: 'app-expedition-generator',
    templateUrl: './expedition-generator.component.html',
    styleUrls: ['./expedition-generator.component.scss']
})
export class ExpeditionGeneratorComponent implements OnInit {
    expeditionInfo = [];

    database = {};

    selectedExpeditionInfo = null;
    expeditionDatabase = {};
    comparingData = [];

    constructor(
        private http: HttpClient,
        private databaseService: DatabaseService) {

        ExpeditionInfo.forEach((expeditionVersion, index) => {
            this.expeditionInfo.push({
                'name': expeditionVersion,
                'checked': index == ExpeditionInfo.length - 1,
                'compareable': index != 0
            });
        });

        this.selectedExpeditionInfo = this.expeditionInfo[this.expeditionInfo.length - 1];

        this.databaseService.getCardData().subscribe((database) => {
            this.database = database;
        });

        window.onload = () => {
            this._hotfixScrollSpy();
            window.scrollBy(0, 1);
        }
    }

    ngOnInit(): void {

    }

    ngAfterViewInit() {
        setTimeout(() => {
            this.displayExpedition(this.selectedExpeditionInfo.name);
        }, 500);
    }

    private getExpeditionData(version, callback = null) {
        if (this.expeditionDatabase[version]) {
            if (typeof callback == 'function') {
                callback(this.expeditionDatabase[version])
            }
        }
        else {

            let selectedExpeditionVersion = version || this.expeditionInfo.find(e => e.checked).name;

            var oReq = new XMLHttpRequest();
            oReq.open("GET", `./assets/others/expedition/v${selectedExpeditionVersion}.xlsx`, true);
            oReq.responseType = "arraybuffer";

            oReq.onload = () => {
                var arrayBuffer = oReq.response; // Note: not oReq.responseText
                if (arrayBuffer) {
                    const data = new Uint8Array(arrayBuffer);
                    const arr = new Array();
                    for (let i = 0; i !== data.length; ++i) { arr[i] = String.fromCharCode(data[i]); }
                    const bstr = arr.join('');
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const first_sheet_name = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[first_sheet_name];

                    const JSON_Object = XLSX.utils.sheet_to_json(worksheet, { header: "A" });

                    if (typeof callback == 'function') {
                        callback(this._handleExpeditionJSON(JSON_Object))
                    }
                }
            };
            oReq.send(null);
        }
    }

    _hotfixScrollSpy() {
        var dataSpyList = [].slice.call(document.querySelectorAll('[data-bs-spy="scroll"]'))
        let curScroll = window.pageYOffset || document.documentElement.scrollTop;
        dataSpyList.forEach(function (dataSpyEl) {
            let offsets = bootstrap.ScrollSpy.getInstance(dataSpyEl)['_offsets'];
            for (let i = 0; i < offsets.length; i++) {
                offsets[i] += curScroll;
            }
        })
    }

    changeExpeditionInfo(expeditionInfo) {
        this.expeditionInfo.find(p => p.checked).checked = false;
        expeditionInfo.checked = true;

        this.selectedExpeditionInfo = expeditionInfo;
        this.displayExpedition(expeditionInfo.name);
    }

    scrollToElement($event, selector) {
        $event.preventDefault();
        $([document.documentElement, document.body]).animate(
            {
                scrollTop: $(selector).offset().top - 20,
            },
            250
        );
    }

    _handleExpeditionJSON(expeditionJSON) {
        let eDatabase = {};
        let headers = {};

        let maxIndex = expeditionJSON.findIndex(row => row['A'] && row['A'] == 'LAST UPDATED');
        if (!maxIndex) {
            maxIndex = 32;
        }

        for (let i = 0; i <= maxIndex - 1; i++) {
            let rowData = expeditionJSON[i];
            if (i == 0) {
                let maxColumn = Object.keys(expeditionJSON[6]); // Card column

                for (let j = 0; j < maxColumn.length; j++) {
                    let letter = this.columnIndex2Letter(j);
                    if (letter != 'A') {
                        if (rowData[letter]) {
                            headers[letter] = Utility.capitalize(rowData[letter]);
                        } else {
                            let previousLetter = this.columnIndex2Letter(j - 1);
                            headers[letter] = Utility.capitalize(headers[previousLetter]);
                        }
                    }
                }
            } else if (i >= 5) {
                Object.keys(rowData).forEach(key => {
                    if (key == 'A') {
                        return;
                    }
                    let archetype = headers[key];
                    if (!archetype) {
                        return;
                    }

                    let cards = rowData[key].split(' / ');
                    cards.forEach(cardName => {

                        let card = Object.values(this.database).find(c => c['name'].toLowerCase() == cardName.toLowerCase());
                        let type = Utility.camelize(card ? (card['type'] + 's') : 'Unknown');

                        if (!eDatabase[archetype]['cards']) {
                            eDatabase[archetype]['cards'] = {};
                        }

                        if (!eDatabase[archetype]['cards'][type]) {
                            eDatabase[archetype]['cards'][type] = [];
                        }
                        eDatabase[archetype]['cards'][type].push(card ? card['name'] : cardName);
                    });
                });
            } else {
                let subject = '';
                Object.keys(rowData).forEach(key => {
                    if (key == 'A') {
                        subject = Utility.camelize(rowData[key].replace('(S)', '').replace('%', ''));
                        return;
                    }
                    let archetype = headers[key];
                    if (!archetype) {
                        return;
                    }

                    if (!eDatabase[archetype]) {
                        eDatabase[archetype] = {
                            'name': archetype
                        };
                    }

                    let subjectValue = rowData[key];
                    if (eDatabase[archetype][subject] && subject == 'region') {
                        subjectValue = eDatabase[archetype][subject] + ', ' + subjectValue;
                    }

                    eDatabase[archetype][subject] = subjectValue;
                });
            }
        }

        let expeditionDatabase = Object.values(eDatabase);

        Utility.sortArrayByValues(expeditionDatabase, ['name']);

        expeditionDatabase.forEach(archetype => {
            let archetypeCards = archetype['cards'];

            let deck = [];
            Object.keys(archetypeCards).forEach(type => {
                archetypeCards[type].forEach(cardName => {
                    if (type == 'unknown') {
                        return;
                    }
                    let card = Object.values(this.database).find(c =>
                        c['name'] == cardName && !c['code'].replace('MT', '').includes('T'));

                    if (!card) {
                        console.log(cardName)
                    } else {
                        deck.push(card);
                    }
                });
            });

            archetype['code'] = this.databaseService.deck2Code(deck)
        });

        return expeditionDatabase;
    }

    columnIndex2Letter(n) {
        var ordA = 'a'.charCodeAt(0);
        var ordZ = 'z'.charCodeAt(0);
        var len = ordZ - ordA + 1;

        var s = "";
        while (n >= 0) {
            s = String.fromCharCode(n % len + ordA) + s;
            n = Math.floor(n / len) - 1;
        }
        return s.toUpperCase();
    }

    letterToColumnIndex(letter) {
        var column = 0, length = letter.length;
        for (var i = 0; i < length; i++) {
            column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
        }
        return column;
    }

    getChangeLogJSON(): Observable<any> {
        return this.http.get(`./assets/jsons/expedition/v2.3.json`);
    }

    displayExpedition(version) {
        this.comparingData = null;
        $('#expedition-scroll').hide();

        let scrollSpy = bootstrap.ScrollSpy.getInstance(document.body);
        if (scrollSpy) {
            scrollSpy.dispose();
        }

        this.getExpeditionData(version, (eDatabase) => {
            this.expeditionDatabase[version] = eDatabase;

            setTimeout(() => {
                $('#expedition-scroll').show();
                new bootstrap.ScrollSpy(document.body, {
                    target: '#expedition-scroll',
                    offset: 10,
                    method: 'position'
                });
            }, 500);
        });
    }

    compareExpedition(version) {
        $('.expedition-scroll').hide();

        let scrollSpy = bootstrap.ScrollSpy.getInstance(document.body);
        if (scrollSpy) {
            scrollSpy.dispose();
        }

        let selectedVersion = version;
        let compareVersion = this.expeditionInfo[this.expeditionInfo.findIndex(v => v.name == version) - 1].name;

        let flag = 0;

        [selectedVersion, compareVersion].forEach(ver => {
            this.getExpeditionData(ver, (eDatabase) => {
                this.expeditionDatabase[ver] = eDatabase;
                flag++;

                if (flag == 2) {
                    this._compareExpedition(selectedVersion, compareVersion);
                }
            });
        });
    }

    _compareExpedition(selectedVersion, compareVersion) {
        let logs = [];

        // New and Changed Archetypes
        this.expeditionDatabase[selectedVersion].forEach(selectedArchetype => {
            let comparingArchetype = this.expeditionDatabase[compareVersion].find(a => a.name == selectedArchetype.name);

            if (!comparingArchetype) {
                let log = {
                    'name': selectedArchetype.name,
                    'diff': []
                };

                log.diff.push(`Added.`);

                logs.push(log);
                return;
            }

            if (JSON.stringify(selectedArchetype, Object.keys(selectedArchetype).sort()) != JSON.stringify(comparingArchetype, Object.keys(comparingArchetype).sort())) {
                let log = {
                    'name': selectedArchetype.name,
                    'diff': []
                };

                if (selectedArchetype.offeringRate != comparingArchetype.offeringRate) {
                    log.diff.push(`Offering Rate ${selectedArchetype.offeringRate > comparingArchetype.offeringRate ? 'increased to' : 'reduced to'} ${selectedArchetype.offeringRate * 100}% from ${comparingArchetype.offeringRate * 100}.`);
                }
                if (selectedArchetype.cohesiveness != comparingArchetype.cohesiveness) {
                    log.diff.push(`Cohesiveness Rating changed to ${selectedArchetype.cohesiveness} from ${comparingArchetype.cohesiveness}.`);
                }
                if (selectedArchetype.wildPickBonus != comparingArchetype.wildPickBonus) {
                    log.diff.push(`Wild Pick Bonus Ratio changed to ${selectedArchetype.wildPickBonus} from ${comparingArchetype.wildPickBonus}.`);
                }

                if (JSON.stringify(selectedArchetype.cards) != JSON.stringify(comparingArchetype.cards)) {
                    let newChampions = selectedArchetype.cards.champions.filter(x => !comparingArchetype.cards.champions.includes(x));
                    let removedChampions = comparingArchetype.cards.champions.filter(x => !selectedArchetype.cards.champions.includes(x));

                    let otherSelectedCards = [].concat(selectedArchetype.cards.followers, selectedArchetype.cards.landmarks, selectedArchetype.cards.spells, selectedArchetype.cards.unknown);
                    let otherCompartingCards = [].concat(comparingArchetype.cards.followers, comparingArchetype.cards.landmarks, comparingArchetype.cards.spells, comparingArchetype.cards.unknown);

                    let otherNewCards = otherSelectedCards.filter(x => !otherCompartingCards.includes(x));
                    let otherRemovedCards = otherCompartingCards.filter(x => !otherSelectedCards.includes(x));
                    otherNewCards.sort();
                    otherRemovedCards.sort();

                    let addedCards = [].concat(newChampions, otherNewCards);
                    let removedCards = [].concat(removedChampions, otherRemovedCards);

                    if (addedCards.length) {
                        log.diff.push(`Added: ${addedCards.join(', ')}.`);
                    }
                    if (removedCards.length) {
                        log.diff.push(`Removed: ${removedCards.join(', ')}.`);
                    }
                }

                logs.push(log);
            }
        });

        this.expeditionDatabase[compareVersion].forEach(selectedArchetype => {
            let comparingArchetype = this.expeditionDatabase[selectedVersion].find(a => a.name == selectedArchetype.name);

            if (!comparingArchetype) {
                let log = {
                    'name': selectedArchetype.name,
                    'diff': []
                };

                log.diff.push(`Removed.`);

                logs.push(log);
                return;
            }
        });

        this.comparingData = logs;
    }
}
