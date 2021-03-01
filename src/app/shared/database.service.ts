import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PatchInfo } from '../shared/patches';
import * as Utility from "../shared/utility";
import { Observable, Observer, Subject } from 'rxjs';
import { forkJoin } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private queue: PendingRequest[] = [];

  newestPatch = null;
  private newestPatchCode = null;
  latestDatabase = {};

  constructor(
    private http: HttpClient
  ) {
    let newestPatch = this.newestPatch = Object.keys(PatchInfo).slice(-1)[0];
    this.newestPatchCode = PatchInfo[newestPatch].code;
    this.getCardData(newestPatch).subscribe(database => this.latestDatabase = database);
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

          observer.next(this._convertData2Database(rawLatestDatabase, patch));
          observer.complete();
        }, err => observer.error(err));
    })
  }

  _convertData2Database(rawData, patch) {
    let database = {}
    Object.keys(rawData).forEach(setID => {
      const rawSetData = rawData[setID][patch];
      let setData = {};
      JSON.parse(rawSetData).forEach(cardData => {
        let sortedCode : string = cardData.cardCode;
        if (sortedCode.includes('T')) {
          let wordTIndex = sortedCode.lastIndexOf('T');
          let associatedText = sortedCode.slice(wordTIndex + 1)
          sortedCode = sortedCode.slice(0, wordTIndex) +  associatedText.padStart(3, '0');
        }

        setData[cardData.cardCode] = {
          _data: cardData,
          sortedCode: sortedCode,
          code: cardData.cardCode,
          name: cardData.name,
          collectible: cardData.collectible,
          cost: cardData.cost,
          power: cardData.attack,
          health: cardData.health,
          description: cardData.descriptionRaw.split("\r\n").join(" ").trim(),
          levelupDescription: cardData.levelupDescriptionRaw.split("\r\n").join(" ").trim(),
          type: this.getCardType(cardData),
          spellSpeed: cardData.spellSpeed,
          group: Utility.capitalize(cardData.subtypes ? cardData.subtypes[0] : cardData.subtype),
          flavor: cardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
          keywords: cardData.keywords.filter(k => !['Slow', 'Fast', 'Burst'].includes(k)),
        }
      });

      database = Object.assign(database, setData);
    });

    return database;
  }

  private getCardType = (cardData) => {
    if (cardData.type == 'Unit') {
      if (cardData.supertype) {
        return 'Champion';
      }

      return 'Follower';
    }

    if (cardData.type == 'Ability') {
      return 'Skill'
    }

    return cardData.type;
  }

  public getDataJSON(patch, set = 1): Observable<any> {
    return this.http.get(`./assets/json/set${set}_${patch}.json`);
  }

  public getAPIImage(cardcode, patchCode = null) {
    if (!patchCode) {
      patchCode = this.newestPatchCode;
    }
    let set = parseInt(cardcode.substring(0, 2));
    let url = `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardcode}.png`;

    return url;
  }

  public getAPIArtwork(cardcode, patchCode = null) {
    if (!patchCode) {
      patchCode = this.newestPatchCode;
    }
    let set = parseInt(cardcode.substring(0, 2));
    let url = `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardcode}-full.png`;

    return url;
  }
}

export class PendingRequest {
  url: string;
  method: string;
  options: any;
  subscription: Subject<any>;

  constructor(url: string, method: string, options: any, subscription: Subject<any>) {
    this.url = url;
    this.method = method;
    this.options = options;
    this.subscription = subscription;
  }
}