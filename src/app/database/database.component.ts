import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { DatabaseService } from '../shared/database.service';

@Component({
  selector: 'app-database',
  templateUrl: './database.component.html',
  styleUrls: ['./database.component.scss']
})
export class DatabaseComponent implements OnInit {
  isCompleted = false;
  database = {};

  form: FormGroup;

  defaultImage = `./assets/icons/Queue Card Back.png`;

  regionsData = [
    // { id: 'NE', name: 'Runeterra', icon: true },
    { id: 'BW', name: 'Bilgewater', icon: true },
    { id: 'DE', name: 'Demacia', icon: true },
    { id: 'FR', name: 'Freljord', icon: true },
    { id: 'IO', name: 'Ionia', icon: true },
    { id: 'NX', name: 'Noxus', icon: true },
    { id: 'PZ', name: 'Piltover and Zaun', icon: true },
    { id: 'SI', name: 'Shadow Isles', icon: true },
    { id: 'SH', name: 'Shurima', icon: true },
    { id: 'MT', name: 'Targon', icon: true }
  ];

  setsData = [
    { id: '01', name: 'Foundations', icon: true },
    { id: '02', name: 'Rising Tides', icon: true },
    { id: '03', name: 'Call of the Mountain', icon: true },
    { id: '04', name: 'Empires of the Ascended' }
  ];

  cardTypesData = [
    { id: 'Champion', name: 'Champion', icon: true },
    { id: 'Follower', name: 'Follower', icon: true },
    { id: 'Spell', name: 'Spell', icon: true },
    { id: 'Landmark', name: 'Landmark', icon: true },
    { id: 'Skill', name: 'Skill', icon: true },
    { id: 'Trap', name: 'Trap' }
  ];

  searchResults = [];

  get regionsFormArray() {
    return this.form.get('regions') as FormArray;
  }
  get setsFormArray() {
    return this.form.get('sets') as FormArray;
  }
  get cardTypesFormArray() {
    return this.form.get('cardTypes') as FormArray;
  }

  constructor(
    private formBuilder: FormBuilder,
    private databaseService: DatabaseService
  ) {
    this.form = this.formBuilder.group({
      regions: this.formBuilder.array([]),
      sets: this.formBuilder.array([]),
      cardTypes: this.formBuilder.array([])
    });

    this.databaseService.getCardData().subscribe(database => {
      this.database = database;
    });

    this.addCheckboxData();
  }

  ngOnInit(): void {}

  private addCheckboxData() {
    this.regionsData.forEach(() => this.regionsFormArray.push(new FormControl(false)));
    this.setsData.forEach(() => this.setsFormArray.push(new FormControl(false)));
    this.cardTypesData.forEach(() => this.cardTypesFormArray.push(new FormControl(false)));
  }

  getAPIImage(cardcode) {
    return this.databaseService.getAPIImage(cardcode);
  }

  clearFilters() {
    this.form.reset();
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

    let nameSort = (a, b) => {
      if (a['name'] < b['name']) { return -1; }
      if (a['name'] > b['name']) { return 1; }
      return 0;
    };

    let sortList = [nameSort];
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
          console.log(c.type, cardTypeCode)
          if (c.type == cardTypeCode) {
            found = true;
          }
        });
        return found;
      })
    }

    let searchResult = Object.values(this.database);
    filterList.forEach(filterLogic => {
      searchResult = searchResult.filter(filterLogic);
    });

    sortList.forEach(sortLogic => {
      searchResult = searchResult.sort(sortLogic);
    });

    this.searchResults = searchResult;

    this.isCompleted = true;
    console.log(searchResult)
  }
}
