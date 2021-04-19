import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PatchInfo } from '../shared/patches';
import * as Utility from "../shared/utility";
import { Observable, Observer, Subject } from 'rxjs';
import { forkJoin } from 'rxjs';
import { Keywords } from './keywords';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

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
    let spellSpeedKeywords = ['Slow', 'Fast', 'Burst', 'Focus'];
    let specialKeywords = Keywords.map(k => k.name);

    Object.keys(rawData).forEach(setID => {
      const rawSetData = rawData[setID][patch];
      let setData = {};
      JSON.parse(rawSetData).forEach(cardData => {
        let sortedCode: string = cardData.cardCode;
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

        let realSpellSpeed = cardData.spellSpeed;
        if (cardData.keywords.filter(k => spellSpeedKeywords.includes(k))) {
          realSpellSpeed = cardData.keywords.find(k => spellSpeedKeywords.includes(k));
        }

        setData[cardData.cardCode] = {
          _data: cardData,
          sortedCode: sortedCode,
          code: cardData.cardCode,
          name: cardData.name.trim(),
          collectible: cardData.collectible,
          cost: cardData.cost,
          power: cardData.attack,
          health: cardData.health,
          description: Utility.cleanNewline(cardData.descriptionRaw),
          levelupDescription: Utility.cleanNewline(cardData.levelupDescriptionRaw),
          type: this.getCardType(cardData),
          groupType: this.getCardType(cardData, true),
          spellSpeed: realSpellSpeed,
          group: Utility.capitalize(cardData.subtypes ? cardData.subtypes[0] : cardData.subtype),
          flavor: cardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
          keywords: cardData.keywords
        }

        if (!setData[cardData.cardCode]['keywords'].length) {
          setData[cardData.cardCode]['keywords'] = [];
        }

        if (cardData.keywordRefs.includes('AuraVisualFakeKeyword')) {
          setData[cardData.cardCode]['keywords'].push('Aura');
        }

        specialKeywords.forEach(keyword => {
          let keywordText = [`<link=vocab.${keyword}>`, `<link=keyword.${keyword}>`, `<style=Vocab>${keyword}`];
          keywordText.forEach(kText => {
            if (cardData.description.toLowerCase().includes(kText.toLowerCase())) {
              setData[cardData.cardCode]['keywords'].push(keyword);
            }
          });
        });

        if (setData[cardData.cardCode]['keywords'].includes('Immobile')) {
          setData[cardData.cardCode]['keywords'] = setData[cardData.cardCode]['keywords'].concat(["Can't Attack", "Can't Block"]);
        }

        setData[cardData.cardCode]['keywords'] = [...new Set(setData[cardData.cardCode]['keywords'])];
      });

      database = Object.assign(database, setData);
    });

    return database;
  }

  private getCardType = (cardData, isGroupType = false) => {
    if (cardData.type == 'Unit') {
      if (cardData.supertype) {
        return 'Champion';
      }

      return 'Follower';
    }

    if (cardData.type == 'Ability') {
      return 'Skill'
    }

    if (isGroupType) {
      if (cardData.type == 'Spell' && cardData.supertype == 'Champion') {
        return 'Champion'
      }
    }

    return cardData.type;
  }

  public getDataJSON(patch, set = 1): Observable<any> {
    return this.http.get(`./assets/jsons/data/set${set}_${patch}.json`);
  }

  public getAPIImage(cardcode, patchCode = null) {
    if (!patchCode) {
      patchCode = this.newestPatchCode;
    }
    let set = parseInt(cardcode.substring(0, 2));
    let url = `https://dd.b.pvp.net/${patchCode}/set${set}/en_us/img/cards/${cardcode}.png`;

    return url;
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
}
