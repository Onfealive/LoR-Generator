import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import $ from "jquery";
import { PatchInfo } from '../shared/patches';
import { HttpClient } from '@angular/common/http';

import * as Utiliy from "../shared/utility";
import { Observable } from 'rxjs';
@Component({
  selector: 'app-expedition-generator',
  templateUrl: './expedition-generator.component.html',
  styleUrls: ['./expedition-generator.component.scss']
})
export class ExpeditionGeneratorComponent implements OnInit {
  @ViewChild('expedition') expeditionElement: ElementRef;

  title = 'Drop JSON patch file (only 3, and newest). Example: set2_1.5.json.';
  files: File[] = [];
  error = '';

  expeditionContent = '';
  setContents = {};

  patchIDs = {
    old: '',
    new: ''
  }

  newestPatch = '';
  isCompleted = false;

  constructor(
    private http: HttpClient
    ) {
  }

  ngOnInit(): void {
    this.newestPatch = Object.keys(PatchInfo).slice(-1)[0];

    let selectedPatch = this.newestPatch;

    this.patchIDs.new = this.newestPatch;
    
    let maxSet = PatchInfo[this.newestPatch].maxSet;

    let countFiles = 0;
    for (let i = 1; i <= maxSet; i++) {
      this.getJSON(selectedPatch, i).subscribe(data => {

        if (!this.setContents['set' + i]) {
          this.setContents['set' + i] = {};
        }

        this.setContents['set' + i][selectedPatch] = JSON.stringify(data || []);

        countFiles += 1;
        if (countFiles == maxSet) {
          this.isCompleted = true;
        }

        console.log(this.setContents)
      });
    }
  }

  public getJSON(patch, set = 1): Observable<any> {
    return this.http.get(`./assets/json/set${set}_${patch}.json`);
  }

  onSelect(event) {
    this.files = [];

    const draggedFiles = [...event.addedFiles];
    if (draggedFiles.length != 3) {
      this.error = 'Only 3 and newest files.'
      return;
    }

    draggedFiles.sort((a, b) => {
      return a.name - b.name;
    });

    for (let i = 0; i <= draggedFiles.length - 2; i += 2) {
      let currentFile = draggedFiles[i].name.replace('.json', '').split('_');
      let nextFile = draggedFiles[i + 1].name.replace('.json', '').split('_');

      if (currentFile[0] == nextFile[0]) {
        this.error = 'The files must include a pair with an old file and a new file, of the same Patch, different Set.';
        return;
      } else if (!["set1", "set2", "set3"].includes(currentFile[0]) || !["set1", "set2", "set3"].includes(nextFile[0])) {
        this.error = 'Only support Set 1 to 3.';
        return;
      }

      this.patchIDs.old = currentFile[1];
      this.patchIDs.new = nextFile[1];
    }

    this.files.push(...draggedFiles);

    this.files.forEach(file => {
      let currentFile = file.name.replace('.json', '').split('_');

      const selectedFile = file;
      const fileReader = new FileReader();
      fileReader.readAsText(selectedFile, "UTF-8");
      fileReader.onload = () => {
        if (!this.setContents[currentFile[0]]) {
          this.setContents[currentFile[0]] = {};
        }
        this.setContents[currentFile[0]][currentFile[1]] = fileReader.result as string;
      }
      fileReader.onerror = (error) => {
        console.log(error);
      }
    });
  }

  executeExpedition() {
    this.expeditionContent = this.expeditionContent.replace(/(^[ \t]*\n)/gm, "");
    $(this.expeditionElement.nativeElement).scrollTop(0);

    // Handleing
    let totalNewJSONData = {};

    const getCardType = (cardData) => {
      if (cardData.type == 'Unit') {
        if (cardData.supertype) {
          return 'Champion';
        }

        return 'Follower';
      }

      return cardData.type;
    }

    Object.keys(this.setContents).forEach(setID => {
      // New Set
      const newData = this.setContents[setID][this.patchIDs.new];
      console.log(newData)
      let newDataJSON = {};
      JSON.parse(newData).forEach(cardData => {
        newDataJSON[cardData.cardCode] = {
          _data: cardData,
          code: cardData.cardCode,
          name: cardData.name,
          cost: cardData.cost,
          power: cardData.attack,
          health: cardData.health,
          description: cardData.descriptionRaw.split("\r\n").join(" "),
          levelupDescription: cardData.levelupDescriptionRaw.split("\r\n").join(" "),
          // type: cardData.cardCode.indexOf('T') >= 0 ? '' : getCardType(cardData)
          type: getCardType(cardData)
        }
      });

      totalNewJSONData = Object.assign(totalNewJSONData, newDataJSON);
    });

    // Sort for Patch Note
    const sortRules = ['name'];
    totalNewJSONData = Utiliy.sortObjectByValues(totalNewJSONData, sortRules, false);

    let replaceCards = [];
    Object.keys(totalNewJSONData).forEach(cardCode => {
      const cardData = totalNewJSONData[cardCode];

      if (this.expeditionContent.indexOf(cardData.name) >= 0) {
        if (replaceCards.find(cardName => cardName.indexOf(cardData.name) >= 0)) {
          return;
        }

        const isChampion = cardData.type == 'Unit' && cardData.supertype;
        replaceCards.push(cardData.name);

        this.expeditionContent = this.expeditionContent
          .split(cardData.name)
          .join(isChampion ? `{{LoR|${cardData.name}}}` : `{{LoR|${cardData.name}|code=${cardData.code}}}`);
      }
    });
  }
}
