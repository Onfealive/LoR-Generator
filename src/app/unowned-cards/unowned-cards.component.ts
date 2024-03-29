import { Component, OnInit } from '@angular/core';

import * as Utility from "../shared/utility";
import * as DeckEncoder from 'lor-deckcodes-ts';
import { DatabaseService } from '../shared/database.service';
import { Regions } from '../shared/gameMechanics';
import { PatchInfo } from '../shared/patches';
import { Card } from '../shared/defined';

@Component({
    selector: 'app-unowned-cards',
    templateUrl: './unowned-cards.component.html',
    styleUrls: ['./unowned-cards.component.scss']
})
export class UnownedCardsComponent implements OnInit {

    database: Card[] = [];
    isCompleted = false;
    isViewDetail = false;
    defaultImage = `./assets/icons/Queue Card Back.png`;

    unownedCards = [];
    ownedCardCode = '';

    generalValues: any = {};

    details = [];

    sortType = null;
    sortData: Array<any> = [
        { id: 'sortedCode', name: 'Code', sort: 'sortedCode,count' },
        { id: 'region', name: 'Region', sort: 'regions,count,code' },
        { id: 'name', name: 'Name', sort: 'name,count' },
        { id: 'cost', name: 'Cost', sort: 'cost,count,code' },
        { id: 'rarity', name: 'Rarity (⇓)', sort: 'weightRarity,count,code' }
    ];

    constructor(
        private databaseService: DatabaseService,
    ) {
        this.databaseService.loadingCompleted$.subscribe(isCompleted => {
            if (!isCompleted) {
                return;
            }

            this.database = this.databaseService.newestPatchCards;
        });

        this.ownedCardCode = 'CEOQCBABBEAQIBQLAECAEAIBAQEQYAIEAQFAGBAAAEDQQBAEAMBAICQSAQBACAICAYEQKAYEAECQUDQZAUBQMBQHBAHA6BICAIAQIBIHBACQGAYCAMGRCEQGAMCQEAYEAYFA6BQCAABAGBAHBAEQMBAHEYWTOPSDNMDAEBABAMDAQCIKA4BQCAQEAYDREEYUA4BQABIGA4EAUDQZBABAGAIDAQCQMBYIBEEAEBIBAMCAKBQHBEFAUAYCAEBAGCAKBMIREFAWBUBQSDYQCMKBYMCKKJKFQXC5LYKQEBQEBAFAYFAWC4MRYHJCEYUCSLBNGE4TUOZ7DQAQEAQDAUDASCYMBYHRCEYUCYLRQHA6D4TCOKBMFYYDCNBWG4QACAABAMCAMBYJBMGA2DYSCMKBKFQXDANBWHA5DYQCEJBHFIWDEMZWG4RQCBABAIDQQCIKBQGQ4EQTCQMRUGY5DYQSEJRHFAVCWLBNFYZDINJWG44TUOZEAEBQEBAFAYEQYDIPCAIRGFYYDIOR4HZAEERCGJJGE4UCSKZOF4YDEMZUGU3TQKIBAUAQIBIGA4FAWDAPCAJBGFIWC4NBYHI6EARCGJBGE4UCSKRLFQWS6MBRGIZTKNRXHA5CUAIBAEBQIBIIBEFQYDIQCEJRIFIWDENB2HQ7EERCGJBFEYTSQKJKFMWS4MBRGIZTKNRXHA4RYAIEAQHACBADB4AQIAQOAECACCQBAQCQSAQCAIBQUAQCAQCAOAQCAMBAUAQCAUBAQAYEA4FQ2XIDAMAACAYMAMBACBIHBIBQGBQCBEKAIAYFAECQYDIEAIAACBIGBICAIAACBEFA4BIDAMAQMCIOCMCQCAYHBMKRSLAFAECQSGI7EE2AMAYEAIFQYDITCYDAGAQFAYDQSEYZAYBQCAYFBAERCGIIAEAQMBYKBYLSALZUBAAQIBIQCEKROLZQGEEQCAQEA4JB2IJEEUVDSCQCAYBQSEIYDMSCKNZ4HUFACAACBIHCCJJJFMXTININAMEQMDJHFAVDGPB7JBINMAOYAHOACFIBAMARMAIEAMBQCBAGBABAEAIEBABQIAADAYGQGAIBCIMBWBAEAUCQ2DYRAUBQMAIDAQIBCBIDAABAICYNB4CQGBADAQIREFAFAMBQIBIHB4LAMBABAUDQ2DQQCEDAGBIHBAEQ4EASA4AQAEIZD4TC2MBYA4AQGCAKCQNS2MJWA4AQKAYOCQNSKLRZBAAQIBAYDQPSGJBTHAFAIBYEBEHRUMJZHNCU2UQKAEBAUDIQDINSAKJLGI4BKAQGAICQMBYLBUHBAEQTCUNB4IBBE4YDEMZWHATQGCIBAMCQOCIMCEKROGQ3EMTCSLBNF42DMNZZHZAEGR2JJRHVKVSXLFQGEZGZAHNADWYB3UAQ';
    }

    ngOnInit(): void {
        this.sortType = this.sortData[0].id;
    }

    getUnownedCards() {
        this.isViewDetail = false;

        let ownedLibCards: DeckEncoder.Deck = DeckEncoder.getDeckFromCode(this.ownedCardCode);
        let ownedCards = [];
        ownedLibCards.forEach(card => {
            let deckCard = this.database.find(c => c.code == card.cardCode);
            deckCard['count'] = card.count;
            ownedCards.push(Object.assign({}, deckCard));
        });

        let ownedLibCardCode = ownedCards.map(card => card.code);
        let upcomingPatchs = PatchInfo.filter(p => p.isUpcoming).map(p => p.code);

        let collectibleCards = Object.assign([], Object.values(this.database).filter((c: Card) => c.collectible && !upcomingPatchs.includes(c.patch)));
        collectibleCards.forEach(c => { c['count'] = 3 })

        collectibleCards.forEach(card => {
            card['count'] = 3;
        });

        let notCollectEnoughCards = ownedCards.filter(card => card.count < 3).map(libCard => {
            let card = Object.assign({}, this.database.find(c => c.code == libCard.code));
            card['count'] = libCard.count

            return card;
        });

        let notCollectedCards = Object.assign([], collectibleCards)
            .filter((card: Card) => !ownedLibCardCode.includes(card.code))
            .map((card: Card) => {
                let unownCard = Object.assign({}, card)
                unownCard['count'] = 0;
                return unownCard;
            });

        let unownedCards = notCollectEnoughCards.concat(notCollectedCards);

        // Sort settings
        let selectedSortData = this.sortData.find(s => s.id == this.sortType);
        unownedCards = Utility.sortArrayByValues(unownedCards, selectedSortData.sort.split(','), selectedSortData.sortOrder);

        this.unownedCards = unownedCards;
        this.isCompleted = true;

        let cardByRegions = {};
        let cardBySets = {};

        unownedCards.forEach((card: Card) => {
            let set = card.code.substring(0, 2);

            let regionCode = card.code.substring(2, 4);
            let region = Regions.find(region => region.id == regionCode);
            if (!cardByRegions[region.name]) {
                cardByRegions[region.name] = {
                    'count': 0,
                    'totalDeck': [],
                    'deckCode': [],
                    'name': region.name,
                    'shards': [],
                    'icon': region.icon
                }
            }

            if (!cardBySets[set]) {
                cardBySets[set] = {
                    'count': 0,
                    'cards': [],
                    'set': set
                }
            }

            cardByRegions[region.name]['count'] += card['count'] || 1;
            cardByRegions[region.name]['totalDeck'].push(Object.assign({}, card));

            cardBySets[set]['count'] += card['count'] || 1;
            cardBySets[set]['cards'].push(Object.assign({}, card));
        });

        Object.values(cardByRegions).forEach(region => {
            let temparray = [], chunk = 40, count = 0;
            region['totalDeck'].forEach(card => {
                let editedCard = Object.assign({}, card);
                editedCard.count = 3 - editedCard.count;

                if (count + editedCard.count <= chunk) {
                    temparray.push(editedCard);
                    count += editedCard.count;
                } else {
                    region['deckCode'].push(this.databaseService.deck2Code(temparray));
                    region['shards'].push(Utility.numberFormat(this.databaseService.deck2Shards(temparray)));
                    temparray = [];
                    count = 0;
                }
            });

            if (temparray.length) {
                region['deckCode'].push(this.databaseService.deck2Code(temparray));
                region['shards'].push(Utility.numberFormat(this.databaseService.deck2Shards(temparray)));
            }
        });

        this.details = Object.values(cardByRegions);
        // General
        let totalOwnedCards = ownedCards.reduce((accumulator, currentValue) => accumulator + currentValue.count, 0);
        let totalCards = collectibleCards.length * 3;

        let ownedShards = this.databaseService.deck2Shards(ownedCards);
        let totalShards = this.databaseService.deck2Shards(collectibleCards);

        this.generalValues = {
            'owned': totalOwnedCards,
            'total': totalCards,
            'ratio': parseFloat((totalOwnedCards / totalCards * 100).toFixed(1)),
            'shardRatio': parseFloat((ownedShards / totalShards * 100).toFixed(1)),
            'shards': Utility.numberFormat(ownedShards),
            'totalShards': Utility.numberFormat(totalShards),
            'missingShards': Utility.numberFormat(totalShards - ownedShards),
            'missingWildcards': this.databaseService.deck2WildCards(unownedCards, true),
        }
    }

    changeSort(sortCode) {
        this.sortType = sortCode;
        this.getUnownedCards();
    }

    getAPIImage(cardData: Card) {
        return this.databaseService.getAPIImage(cardData);
    }
}
