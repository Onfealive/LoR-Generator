import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PatchInfo } from '../shared/patches';
import * as Utility from "../shared/utility";
import { Observable, Observer, Subject } from 'rxjs';
import { forkJoin } from 'rxjs';
import { Artists, Keywords } from './gameMechanics';
import { ClipboardService } from 'ngx-clipboard';

import { Toast } from 'bootstrap';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  newestPatch = null;
  private newestPatchCode = null;
  latestDatabase = {};
  copyToast;

  constructor(
    private http: HttpClient,
    private clipboardService: ClipboardService,
  ) {
    let newestPatch = this.newestPatch = Object.keys(PatchInfo).slice(-1)[0];
    this.newestPatchCode = PatchInfo[newestPatch].code;
    this.getCardData(newestPatch).subscribe(database => this.latestDatabase = database);
  }

  setCopyToast() {
    setTimeout(() => {
      this.copyToast = new Toast(document.getElementById('copyToast'));
    }, 0);
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
    let keywords = Keywords.filter(k => !k.specialIndicator);
    let specialKeywords = Keywords.filter(k => k.specialIndicator);
    let skippingKeywords = ['Missing Translation'];

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

        let group = [];
        if (cardData.subtypes) {
          if (cardData.subtypes.length) {
            group = cardData.subtypes;
          }
        } else if (cardData.subtype) {
          if (!Array.isArray(cardData.subtype)) {
            group = [cardData.subtype];
          }
        }

        let artist = cardData.artistName;
        Artists.forEach(artistData => {
          let artists = [artistData.name];
          if (artistData.specialIndicator && artistData.specialIndicator.length) {
            artists = artists.concat(artistData.specialIndicator);
          }

          if (artists.includes(artist)) {
            artist = artistData.name;
            return;
          }
        })

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
          groupedType: this.getCardType(cardData, true),
          spellSpeed: realSpellSpeed,
          group: Utility.capitalize(group),
          flavor: cardData.flavorText.trim().replace(/(?:\r\n|\r|\n)/g, ' '),
          keywords: [...cardData.keywords],
          artist: artist
        }

        if (!setData[cardData.cardCode]['keywords'].length) {
          setData[cardData.cardCode]['keywords'] = [];
        }

        if (cardData.keywordRefs.includes('AuraVisualFakeKeyword')) {
          setData[cardData.cardCode]['keywords'].push('Aura');
        }

        keywords.forEach(keywordData => {
          let keywordText = [`<link=vocab.${keywordData.name}>`, `<link=keyword.${keywordData.name}>`, `<style=Vocab>${keywordData.name}`];
          keywordText.forEach(kText => {
            if (cardData.description.toLowerCase().includes(kText.toLowerCase())) {
              setData[cardData.cardCode]['keywords'].push(keywordData.name);
              return;
            }
          });
        });

        specialKeywords.forEach(keywordData => {
          if (cardData['keywords'].includes(keywordData.specialIndicator)) {
            setData[cardData.cardCode]['keywords'].push(keywordData.name);
            return;
          }
          if (cardData['levelupDescription'].includes(keywordData.specialIndicator)) {
            setData[cardData.cardCode]['keywords'].push(keywordData.name);
            return;
          }
          if (cardData['description'].includes(keywordData.specialIndicator)) {
            setData[cardData.cardCode]['keywords'].push(keywordData.name);
            return;
          }
          if (cardData['descriptionRaw'].includes(keywordData.specialIndicator)) {
            setData[cardData.cardCode]['keywords'].push(keywordData.name);
            return;
          }
        })

        setData[cardData.cardCode]['keywords'] = [...new Set(setData[cardData.cardCode]['keywords'].filter(x => !skippingKeywords.includes(x)))];
      });

      database = Object.assign(database, setData);
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
      return 'Skill'
    }

    if (isgroupedType) {
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

  public copy2Clipboard(text) {
    this.clipboardService.copy(text);
    this.copyToast.show();
  }
}
