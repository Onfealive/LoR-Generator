import { nullSafeIsEquivalent } from '@angular/compiler/src/output/output_ast';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { DatabaseService } from '../shared/database.service';
import * as Utility from '../shared/utility';
import { NgSelectComponent } from '@ng-select/ng-select';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Artists, Groups, Keywords } from '../shared/gameMechanics';

declare var $: any;
@Component({
    selector: 'app-database',
    templateUrl: './database.component.html',
    styleUrls: ['./database.component.scss'],
})
export class DatabaseComponent implements OnInit {
    @ViewChild('keywordSelector') keywordSelectorComponent: NgSelectComponent;

    isMobile = false;

    isCompleted = false;
    database = {};

    form: FormGroup;
    defaultFormValues = null;
    sortType = null;

    defaultImage = `./assets/icons/Queue Card Back.png`;
    defaultArtwork = `./assets/gifs/Loading.gif`;

    selectedKeywords: [];
    keywords = Keywords;

    selectedGroups: [];
    groups = Groups;

    selectedArtists: [];
    artist = Artists;

    sortData: Array<any> = [
        { id: 'sortedCode', name: 'Code', sort: 'sortedCode' },
        { id: 'name', name: 'Name', sort: 'name' },
        { id: 'cost', name: 'Cost', sort: 'cost,name' },
        { id: 'power', name: 'Power (⇓)', sort: 'power,health,name', sortOrder: { 'power': false, 'health': false } },
        { id: 'health', name: 'Health (⇓)', sort: 'health,power,name', sortOrder: { 'power': false, 'health': false } },
    ];

    regionsData: Array<FormOption> = [
        { id: 'BC', icon: 'Bandle City' },
        { id: 'BW', icon: 'Bilgewater' },
        { id: 'DE', icon: 'Demacia' },
        { id: 'FR', icon: 'Freljord' },
        { id: 'IO', icon: 'Ionia' },
        { id: 'NX', icon: 'Noxus' },
        { id: 'PZ', icon: 'Piltover and Zaun', name: 'Piltover & Zaun' },
        { id: 'SI', icon: 'Shadow Isles' },
        { id: 'SH', icon: 'Shurima' },
        { id: 'MT', icon: 'Targon' },
        { id: 'RU', icon: 'Runeterra' },
    ];

    setsData: Array<FormOption> = [
        { id: '01', icon: 'Foundations' },
        { id: '02', icon: 'Rising Tides' },
        { id: '03', icon: 'Call of the Mountain' },
        { id: '04', icon: 'Empires of the Ascended' },
        { id: '05', icon: 'Beyond the Bandlewood' },
        { id: '06', icon: 'Worldwalker' },
    ];

    cardTypesData: Array<FormOption> = this._reformatFormOptions([
        { id: 'Champion', icon: 'Champion' },
        { id: 'Follower', icon: 'Follower' },
        {
            id: 'Spell', icon: 'Spell', children: [
                { id: 'Burst', icon: 'Burst' },
                { id: 'Fast', icon: 'Fast' },
                { id: 'Focus', icon: 'Focus' },
                { id: 'Slow', icon: 'Slow' },
            ]
        },
        { id: 'Landmark', icon: 'Landmark' },
        { id: 'Skill', icon: 'Skill' },
        { id: 'Boon', name: 'Boon' },
        { id: 'Origin', name: 'Origin' },
        { id: 'Trap', name: 'Trap' },
    ]);

    costData: Array<FormOption> = [
        { id: '0', icon: 'Cost', circle: true, name: '0' },
        { id: '1', icon: 'Cost', circle: true, name: '1' },
        { id: '2', icon: 'Cost', circle: true, name: '2' },
        { id: '3', icon: 'Cost', circle: true, name: '3' },
        { id: '4', icon: 'Cost', circle: true, name: '4' },
        { id: '5', icon: 'Cost', circle: true, name: '5' },
        { id: '6', icon: 'Cost', circle: true, name: '6' },
        { id: '7', icon: 'Cost', circle: true, name: '7' },
        { id: '8', icon: 'Cost', circle: true, name: '8' },
        { id: '9', icon: 'Cost', circle: true, name: '9' },
        { id: '10', icon: 'Cost', circle: true, name: '10+' },
    ];

    rarityData: Array<FormOption> = [
        { id: 'Common', icon: 'Common' },
        { id: 'Rare', icon: 'Rare' },
        { id: 'Epic', icon: 'Epic' },
        { id: 'Champion', icon: 'Champion' },
        { id: 'None', name: 'None' }
    ];

    collectibleData: Array<FormOption> = [
        { id: 'true', icon: 'Collectible', name: 'Collectible', default: true },
        { id: 'false', icon: 'Uncollectible', name: 'Uncollectible', default: true },
    ];

    searchResults = [];

    get regionFormArray() {
        return this.form.get('regions') as FormArray;
    }
    get setFormArray() {
        return this.form.get('sets') as FormArray;
    }
    get cardTypeFormArray() {
        return this.form.get('cardTypes') as FormArray;
    }
    get costFormArray() {
        return this.form.get('costs') as FormArray;
    }
    get rarityFormArray() {
        return this.form.get('rarities') as FormArray;
    }
    get collectibleFormArray() {
        return this.form.get('collectibles') as FormArray;
    }

    constructor(
        private formBuilder: FormBuilder,
        private databaseService: DatabaseService,
        private deviceService: DeviceDetectorService
    ) {
        this.isMobile = this.deviceService.isMobile();

        this.form = this.formBuilder.group({
            regions: this.formBuilder.array([]),
            sets: this.formBuilder.array([]),
            cardTypes: this.formBuilder.array([]),
            costs: this.formBuilder.array([]),
            rarities: this.formBuilder.array([]),
            collectibles: this.formBuilder.array([]),
            text: this.formBuilder.control(''),
        });

        this.databaseService.getCardData().subscribe((database) => {
            this.database = database;

            // var a = [...new Set(Object.values(this.database).map(a => a['artist']))]
            // console.log(a.sort())
        });

        this.sortType = this.sortData[0].id;

        this.addCheckboxData();
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.searchCards(true);
        }, 2000);
    }

    private _reformatFormOptions(formOptions: Array<FormOption>, isRealIndex: boolean = false): Array<FormOption> {
        let index = 0;
        let results = [];
        formOptions.forEach(o => {
            o.index = index;
            isRealIndex && results.push(o);
            index++;

            if (o.children && o.children.length) {
                o.children.forEach(c => {
                    c.index = index;
                    isRealIndex && results.push(c);
                    index++;
                });
            }
        });

        return isRealIndex ? results : formOptions;
    }

    private addCheckboxData() {
        this.regionsData.forEach((o) =>
            this.regionFormArray.push(new FormControl(o.default))
        );
        this.setsData.forEach((o) =>
            this.setFormArray.push(new FormControl(o.default))
        );

        this.cardTypesData.forEach((o) => {
            this.cardTypeFormArray.push(new FormControl(o.default));
            if (o.children && o.children.length) {
                o.children.forEach(c => {
                    this.cardTypeFormArray.push(new FormControl(c.default))
                });
            }
        });

        this.costData.forEach((o) =>
            this.costFormArray.push(new FormControl(o.default))
        );
        this.rarityData.forEach((o) =>
            this.rarityFormArray.push(new FormControl(o.default))
        );

        this.collectibleData.forEach((o) =>
            this.collectibleFormArray.push(new FormControl(o.default))
        );
        this.defaultFormValues = this.form.value;
    }

    getAPIImage(cardcode) {
        return this.databaseService.getAPIImage(cardcode);
    }

    getAPIArtwork(cardcode) {
        return this.databaseService.getAPIArtwork(cardcode);
    }

    getRegion(cardCode) {
        let regionCode = cardCode.substring(2, 4);
        return this.regionsData.find((r) => r.id == regionCode).icon;
    }

    clearTextSearch() {
        this.form.controls['text'].setValue('');
    }

    clearFilters() {
        this.form.setValue(this.defaultFormValues);
        this.selectedGroups = [];
        this.selectedKeywords = [];
        this.selectedArtists = [];
    }

    changeSort(sortCode) {
        this.sortType = sortCode;
        this.searchCards();
    }

    card2Clipboard(card) {
        this.databaseService.copy2Clipboard(`{{LoR|${card.name}|code=${card.code}}}`);
    }

    selectCardInfo(resultIndex) {
        let cardData = this.searchResults[resultIndex];

        if ($('#detail_' + cardData.code).length == 0) {
            this.searchResults.splice(
                resultIndex + 1,
                0,
                Object.assign({}, cardData, {
                    detail: true,
                })
            );
        } else {
            $('#detail_' + cardData.code).show();
        }

        setTimeout(() => {
            $([document.documentElement, document.body]).animate(
                {
                    scrollTop: $('#detail_' + cardData.code).offset().top - 20,
                },
                250
            );
        }, 0);
    }

    selectCardDetail(resultIndex) {
        let cardData = this.searchResults[resultIndex];

        $('#detail_' + cardData.code).hide();

        setTimeout(() => {
            $([document.documentElement, document.body]).animate(
                {
                    scrollTop: $('#card_' + cardData.code).offset().top - 20,
                },
                0
            );
        }, 0);
    }

    hideAllCardDetails(resultIndex) {
        let cardData = this.searchResults[resultIndex];

        $('.card-detail').hide();

        setTimeout(() => {
            $([document.documentElement, document.body]).animate(
                {
                    scrollTop: $('#card_' + cardData.code).offset().top - 20,
                },
                0
            );
        }, 0);
    }

    searchCards(isFirstTime = false) {
        this.isCompleted = false;
        this.searchResults = [];

        const selectedRegionNames = this.form.value['regions']
            .map((checked, i) => (checked ? (this.regionsData[i].name || this.regionsData[i].icon) : null))
            .filter((v) => v !== null);

        const selectedSetIds = this.form.value['sets']
            .map((checked, i) => (checked ? this.setsData[i].id : null))
            .filter((v) => v !== null);

        let realCardTypesData = this._reformatFormOptions(this.cardTypesData, true);
        const selectedCardTypeIds = this.form.value['cardTypes']
            .map((checked, i) => (checked ? realCardTypesData[i].id : null))
            .filter((v) => v !== null);

        const selectedCostIds = this.form.value['costs']
            .map((checked, i) => (checked ? this.costData[i].id : null))
            .filter((v) => v !== null);

        const selectedRarityIds = this.form.value['rarities']
            .map((checked, i) => (checked ? this.rarityData[i].id : null))
            .filter((v) => v !== null);

        const selectedCollectibleIds = this.form.value['collectibles']
            .map((checked, i) => (checked ? this.collectibleData[i].id : null))
            .filter((v) => v !== null);

        const searchText = this.form.value['text'];
        const searchKeywords = this.selectedKeywords || [];
        const searchGroups = this.selectedGroups || [];
        const searchArtists = this.selectedArtists || [];

        let filterList = [];
        if (selectedRegionNames.length) {
            filterList.push((c) => {
                let found = false;
                selectedRegionNames.forEach((regionName) => {
                    if (c.regions.includes(regionName)) {
                        found = true;
                    }
                });
                return found;
            });
        }
        if (selectedSetIds.length) {
            filterList.push((c) => {
                let found = false;
                selectedSetIds.forEach((setCode) => {
                    if (c.code.substring(0, 2) == setCode) {
                        found = true;
                    }
                });
                return found;
            });
        }
        if (selectedCardTypeIds.length) {
            let parents = this.cardTypesData.filter(c => c.children);
            let removedParents = [];
            let removedChildrens = [];
            parents.forEach(parent => {
                if (parent.children.some(o => selectedCardTypeIds.includes(o.id))) {
                    removedParents.push(parent.id);
                }
                if (!selectedCardTypeIds.includes(parent.id)) {
                    removedChildrens = removedChildrens.concat(parent.children.map(c => c.id));
                }
            });

            let realSelectedCardTypeIds = selectedCardTypeIds.filter(c => !removedParents.concat(removedChildrens).includes(c));

            if (realSelectedCardTypeIds.length) {
                filterList.push((c) => {
                    let found = false;
                    realSelectedCardTypeIds.forEach((cardTypeCode) => {
                        if (c.type == cardTypeCode || c.spellSpeed == cardTypeCode) {
                            found = true;
                        }
                    });
                    return found;
                });
            }
        }
        if (selectedCostIds.length) {
            filterList.push((c) => {
                let found = false;
                selectedCostIds.forEach((costCode) => {
                    if (
                        (costCode == 10 && c.cost >= costCode) ||
                        (costCode != 10 && c.cost == costCode)
                    ) {
                        found = true;
                    }
                });
                return found;
            });
        }
        if (selectedRarityIds.length) {
            filterList.push((c) => {
                let found = false;
                selectedRarityIds.forEach((rarityCode) => {
                    if (rarityCode == c.rarity) {
                        found = true;
                    }
                });
                return found;
            });
        }
        if (selectedCollectibleIds.length) {
            filterList.push((c) => {
                let found = false;
                selectedCollectibleIds.forEach((collectibleCode) => {
                    if (c.collectible.toString() == collectibleCode) {
                        found = true;
                    }
                });
                return found;
            });
        }
        if (searchText) {
            filterList.push((c) => {
                let found = false;
                if (
                    [
                        c.name,
                        c.description,
                        c.levelupDescription,
                        c.code,
                    ].find((text: string) =>
                        text.toLowerCase().includes(searchText.toLowerCase())
                    )
                ) {
                    found = true;
                }
                return found;
            });
        }

        if (searchKeywords.length) {
            filterList.push((c) => {
                let found = 0;
                searchKeywords.forEach((keyword) => {
                    if (c.keywords.includes(keyword)) {
                        found++;
                    }
                });
                return found == searchKeywords.length;
            });
        }

        if (searchGroups.length) {
            filterList.push((c) => {
                let found = 0;
                searchGroups.forEach((group) => {
                    if (c.group.includes(group)) {
                        found++;
                    }
                });
                return found == searchGroups.length;
            });
        }

        if (searchArtists.length) {
            filterList.push((c) => {
                let found = 0;
                searchArtists.forEach((artist) => {
                    if (c.artist == artist) {
                        found++;
                    }
                });
                return found == searchArtists.length;
            });
        }

        let searchResult = Object.values(this.database);
        filterList.forEach((filterLogic) => {
            searchResult = searchResult.filter(filterLogic);
        });

        // Sort settings
        let selectedSortData = this.sortData.find(s => s.id == this.sortType);
        searchResult = Utility.sortArrayByValues(searchResult, selectedSortData.sort.split(','), selectedSortData.sortOrder);

        this.searchResults = searchResult;

        this.isCompleted = true;

        if (!isFirstTime) {
            setTimeout(() => {
                $([document.documentElement, document.body]).animate(
                    {
                        scrollTop: $('.search-result').offset().top,
                    },
                    750
                );
            }, 0);
        }
    }
}

export class FormOption {
    id: string;
    index?: number;
    icon?: string;
    name?: string;
    default?: boolean = false;
    circle?: boolean = false;
    children?: Array<FormOption>;
}
