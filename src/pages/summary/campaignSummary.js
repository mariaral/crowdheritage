/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import { inject } from 'aurelia-framework';
import { Router } from 'aurelia-router';
import { Campaign } from '../../modules/Campaign.js';
import { CampaignServices } from '../../modules/CampaignServices.js';
import { Collection } from '../../modules/Collection.js';
import { CollectionServices } from '../../modules/CollectionServices.js';
import { Record } from '../../modules/Record.js';
import { RecordServices } from '../../modules/RecordServices.js';
import { UserServices } from '../../modules/UserServices';

let COUNT = 2;

@inject(CampaignServices, CollectionServices, UserServices, RecordServices, Router)
export class CampaignSummary {
  scrollTo(anchor) {
    $('html, body').animate({
      scrollTop: $(anchor).offset().top
    }, 1000);
  }

  constructor(campaignServices, collectionServices, userServices, recordServices, router) {
    this.campaignServices = campaignServices;
    this.collectionServices = collectionServices;
    this.userServices = userServices;
    this.recordServices = recordServices;
    this.router = router;
    this.records = [];
    this.recId = "";

    this.campaign = 0;
    this.collections = [];
    this.collectionsCount = 0;
    this.currentCount = 0;
    this.loading = false;
    this.more = true;

    this.userPoints = 0;
    this.userBadge = 0;
    this.userBadgeName = "";
  }

  get isAuthenticated() { return this.userServices.isAuthenticated(); }
	get user() { return this.userServices.current; }

  attached() {
    $('.accountmenu').removeClass('active');
  }

  async activate(params, route) {
    if (this.userServices.isAuthenticated() && this.userServices.current === null) {
      await this.userServices.reloadCurrentUser();
    }

    if ( route.campaign ) {
      this.campaign = route.campaign;
      route.navModel.setTitle(this.campaign.title);
      this.collectionsCount = this.campaign.targetCollections.length;
      this.getCampaignCollections(this.campaign.targetCollections, 0, COUNT);
      this.getUserStats();
    }
    else {
      this.campaignServices.getCampaignByName(params.cname)
        .then( (result) => {
          this.campaign = new Campaign(result);
          route.navModel.setTitle(this.campaign.title);
          this.collectionsCount = this.campaign.targetCollections.length;
          this.getCampaignCollections(this.campaign.targetCollections, 0, COUNT);
          this.getUserStats();
      });
    }
  }

  getUserStats() {
    if (this.userServices.current) {
      let id = this.userServices.current.dbId;
      if (this.campaign.userPoints.hasOwnProperty(id)) {
        this.userPoints = this.campaign.userPoints[id].created +
                          this.campaign.userPoints[id].approved +
                          this.campaign.userPoints[id].rejected;
      }

      if (this.userPoints < this.campaign.badges.bronze) {
        this.userBadge = '/img/badges.png';
      }
      else if (this.userPoints < this.campaign.badges.silver) {
        this.userBadge = '/img/badge-bronze.png';
        this.userBadgeName = 'bronze';
      }
      else if (this.userPoints < this.campaign.badges.gold) {
        this.userBadge = '/img/badge-silver.png';
        this.userBadgeName = 'silver';
      }
      else {
        this.userBadge = '/img/badge-gold.png';
        this.userBadgeName = 'gold';
      }
    }
  }

  getCollections(data, offset) {
    let cols = [];
    for (let i in data) {
      cols.push(new Collection(data[i]));
    }
    return cols;
  }

  getCampaignCollections(colIds, offset, count) {
    this.loading = true;
    this.collectionServices.getMultipleCollections(colIds, offset, count)
      .then( response => {
        this.currentCount = this.currentCount + count;
        if (this.currentCount >= this.collectionsCount) {
          this.more = false;
        }
        this.collections = this.collections.concat(this.getCollections(response, 10));
      });
    this.loading = false;
  }

  goToItem(camp, col, records, offset) {
    let item = this.router.routes.find(x => x.name === 'item');
    item.campaign = camp;
    item.offset = offset;

    // Get 2 random records to start annotating
    if (col == 0) {
      this.loading = true;
      this.recordServices.getRandomRecordsFromCollections(this.campaign.targetCollections, 2)
        .then(response => {
          if (response.length>0) {
            for (let i in response) {
              let result = response[i];
              if (result !== null) {
                let record = new Record(result);
                this.records.push(record);
              }
            }
            this.loading = false;
            item.collection = 0;
            item.records = this.records;
            this.router.navigateToRoute('item', {cname: camp.username, gname: camp.spacename, recid: this.records[0].dbId});
          }
          })
        .catch(error => {
          this.loading = false;
          console.log(error.message);
        });
    }

    // Get the first 2 records from the given collection
    else {
      this.loading = true;
      this.collectionServices.getRecords(col.dbId, 0, 2)
        .then(response => {
          if (response.records.length>0) {
            for (let i in response.records) {
              let result = response.records[i];
              if (result !== null) {
                let record = new Record(result);
                this.records.push(record);
              }
            }
            this.loading = false;
            item.collection = col;
            item.records = this.records;
            this.router.navigateToRoute('item', {cname: camp.username, gname: camp.spacename, recid: this.records[0].dbId});
          }
        }).catch(error => {
          this.loading = false;
          console.log(error.message);
        });
    }
  }

  loadMore() {
    this.getCampaignCollections(this.campaign.targetCollections, this.currentCount, COUNT);
  }

}
