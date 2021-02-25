import { nullSafeIsEquivalent } from '@angular/compiler/src/output/output_ast';
import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { DatabaseService } from '../shared/database.service';
import * as Utility from "../shared/utility";

declare var $: any;
@Component({
  selector: 'app-database',
  templateUrl: './database.component.html',
  styleUrls: ['./database.component.scss']
})
export class DatabaseComponent implements OnInit {
  isCompleted = false;
  database = {};

  form: FormGroup;
  defaultFormValues = null;
  sortType = null;

  defaultImage = `./assets/icons/Queue Card Back.png`;

  sortData: Array<FormOption> = [
    { id: 'name', name: 'Name' },
    { id: 'code', name: 'Code' },
    { id: 'cost', name: 'Cost' }
  ];

  regionsData: Array<FormOption> = [
    { id: 'BW', icon: 'Bilgewater' },
    { id: 'DE', icon: 'Demacia' },
    { id: 'FR', icon: 'Freljord' },
    { id: 'IO', icon: 'Ionia' },
    { id: 'NX', icon: 'Noxus' },
    { id: 'PZ', icon: 'Piltover and Zaun' },
    { id: 'SI', icon: 'Shadow Isles' },
    { id: 'SH', icon: 'Shurima' },
    { id: 'MT', icon: 'Targon' }
  ];

  setsData: Array<FormOption> = [
    { id: '01', icon: 'Foundations' },
    { id: '02', icon: 'Rising Tides' },
    { id: '03', icon: 'Call of the Mountain' },
    { id: '04', name: 'Empires of the Ascended' }
  ];

  cardTypesData: Array<FormOption> = [
    { id: 'Champion', icon: 'Champion' },
    { id: 'Follower', icon: 'Follower' },
    { id: 'Spell', icon: 'Spell' },
    { id: 'Landmark', icon: 'Landmark' },
    { id: 'Skill', icon: 'Skill' },
    { id: 'Trap', name: 'Trap' }
  ];

  collectibleData: Array<FormOption> = [
    { id: 'true', icon: 'Collectible', default: true, name: 'Collectible' },
    { id: 'false', icon: 'Uncollectible', name: 'Uncollectible' }
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
  get collectibleFormArray() {
    return this.form.get('collectibles') as FormArray;
  }

  constructor(
    private formBuilder: FormBuilder,
    private databaseService: DatabaseService
  ) {
    this.form = this.formBuilder.group({
      regions: this.formBuilder.array([]),
      sets: this.formBuilder.array([]),
      cardTypes: this.formBuilder.array([]),
      collectibles: this.formBuilder.array([]),
      text: this.formBuilder.control('')
    });

    this.databaseService.getCardData().subscribe(database => {
      this.database = database;
    });

    this.sortType = 'name';

    this.addCheckboxData();
  }

  ngOnInit(): void { }

  private addCheckboxData() {
    this.regionsData.forEach((o) => this.regionFormArray.push(new FormControl(o.default)));
    this.setsData.forEach((o) => this.setFormArray.push(new FormControl(o.default)));
    this.cardTypesData.forEach((o) => this.cardTypeFormArray.push(new FormControl(o.default)));
    this.collectibleData.forEach((o) => this.collectibleFormArray.push(new FormControl(o.default)));
    this.defaultFormValues = this.form.value;
  }

  getAPIImage(cardcode) {
    return this.databaseService.getAPIImage(cardcode);
  }

  clearFilters() {
    this.form.setValue(this.defaultFormValues);
  }

  changeSort(sortCode) {
    this.sortType = sortCode;
    this.submit();
  }

  submit() {
    this.isCompleted = false;
    this.searchResults = [];

    const selectedRegionIds = this.form.value['regions']
      .map((checked, i) => checked ? this.regionsData[i].id : null)
      .filter(v => v !== null);

    const selectedSetIds = this.form.value['sets']
      .map((checked, i) => checked ? this.setsData[i].id : null)
      .filter(v => v !== null);

    const selectedCardTypeIds = this.form.value['cardTypes']
      .map((checked, i) => checked ? this.cardTypesData[i].id : null)
      .filter(v => v !== null);

    const selectedCollectibleIds = this.form.value['collectibles']
      .map((checked, i) => checked ? this.collectibleData[i].id : null)
      .filter(v => v !== null);

    const searchText = this.form.value['text'];

    let filterList = [];
    if (selectedRegionIds.length) {
      filterList.push(c => {
        let found = false;
        selectedRegionIds.forEach(regionCode => {
          if (c.code.includes(regionCode)) {
            found = true;
          }
        });
        return found;
      });
    }
    if (selectedSetIds.length) {
      filterList.push(c => {
        let found = false;
        selectedSetIds.forEach(setCode => {
          if (c.code.substring(0, 2) == setCode) {
            found = true;
          }
        });
        return found;
      })
    }
    if (selectedCardTypeIds.length) {
      filterList.push(c => {
        let found = false;
        selectedCardTypeIds.forEach(cardTypeCode => {
          if (c.type == cardTypeCode) {
            found = true;
          }
        });
        return found;
      });
    }
    if (selectedCollectibleIds.length) {
      filterList.push(c => {
        let found = false;
        selectedCollectibleIds.forEach(collectibleCode => {
          if (c.collectible.toString() == collectibleCode) {
            found = true;
          }
        });
        return found;
      });
    }
    if (searchText) {
      filterList.push(c => {
        let found = false;
        if ([c.name, c.description, c.levelupDescription].find((text: string) => text.toLowerCase().includes(searchText.toLowerCase()))) {
          found = true;
        }
        return found;
      })
    }

    let searchResult = Object.values(this.database);
    filterList.forEach(filterLogic => {
      searchResult = searchResult.filter(filterLogic);
    });

    let sortOrders = ['name'];
    sortOrders.unshift(this.sortType);
    sortOrders = [...new Set(sortOrders)];

    searchResult = Utility.sortArrayByValues(searchResult, sortOrders);

    this.searchResults = searchResult;

    this.isCompleted = true;

    setTimeout(() => {
      $([document.documentElement, document.body]).animate({
        scrollTop: $(".search-result").offset().top
      }, 750);
    }, 0);
  }
}

export class FormOption {
  id: string;
  icon?: string;
  name?: string;
  default?: boolean = false;
}