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
import { Annotation } from 'Annotation.js';
import { AnnotationServices } from 'AnnotationServices.js';
import { Campaign } from 'Campaign.js';
import { CampaignServices } from 'CampaignServices.js';
import { Record } from 'Record.js';
import { RecordServices } from 'RecordServices.js';
import { UserServices } from 'UserServices';
import { I18N } from 'aurelia-i18n';
import settings from 'global.config.js';

let instance = null;
let COUNT = 24;

@inject(AnnotationServices, CampaignServices, RecordServices, UserServices, Router, I18N)
export class Validation {

  constructor(annotationServices, campaignServices, recordServices, userServices, router, i18n) {
  	if (instance) {
  		return instance;
  	}
    this.colorSet = [
			["Black",       "background-color: #111111", "color: #111111; filter: brightness(500%);"],
			["Grey",        "background-color: #AAAAAA","color: #AAAAAA; filter: brightness(60%);"],
			["Brown",       "background-color: brown", "color:brown; filter: brightness(60%);"],
			["Red",         "background-color: #FF4136","color: #FF4136; filter: brightness(60%);"],
			["Orange",      "background-color: #FF851B", "color: #FF851B; filter: brightness(60%);"],
			["Beige",       "background-color: beige", "color: beige; filter: brightness(60%);"],
			["Yellow",      "background-color: #FFDC00", "color: #FFDC00; filter: brightness(60%);"],
			["Green",       "background-color: #2ECC40", "color: #2ECC40; filter: brightness(60%);"],
			["Blue",        "background-color: #0074D9", "color: #0074D9; filter: brightness(60%);"],
			["Purple",      "background-color: #B10DC9", "color: #B10DC9; filter: brightness(60%);"],
			["Pink",        "background-color: pink", "color: pink; filter: brightness(60%);"],
			["White",       "background-color: #FFFFFF", "color: #FFFFFF; filter: brightness(60%);"],
			["Copper",      "background-image: url(/img/color/copper.jpg)", "color: #b87333; filter: brightness(50%);"],
			["Silver",      "background-image: url(/img/color/silver.jpg)", "color:  #DDDDDD; filter: brightness(30%);"],
			["Bronze",      "background-image: url(/img/color/bronze.jpg)", "color: #cd7f32; filter: brightness(50%);" ],
			["Gold",        "background-image: url(/img/color/gold.jpg)", "color: #FFD700; filter: brightness(50%);"],
			["Multicolor",  "background-image: linear-gradient(to right, red,orange,yellow,green,blue,indigo,violet)", " color: white; text-shadow: 1px 1px 2px #424242;"],
			["Transparent", "", "color: white; text-shadow: 1px 1px 2px #424242;"]
		];
    this.annotationServices = annotationServices;
  	this.campaignServices = campaignServices;
    this.recordServices = recordServices;
  	this.userServices = userServices;
  	this.router = router;
  	this.i18n = i18n;

  	this.loc;
    this.project = settings.project;

    this.campaignItem = null;
    this.recordIds = [];
    this.records = [];
    this.record = null;
    this.annotation = null;
    this.offset = 0;
    this.label = "";
    this.generators = [];
    this.annotationsToDelete = [];
    this.sortBy = "upvoted";

    this.annotations = [];
    this.geoannotations = [];
    this.colorannotations = [];
    this.pollannotations = [];

    this.loadCamp = false;
    this.loading = false;
    this.deleting = false;
  	if (!instance) {
  		instance = this;
  	}
  }

  get isAuthenticated() { return this.userServices.isAuthenticated(); }
  get user()            { return this.userServices.current; }
  get more()            { return this.offset < this.recordIds.length; }

  scrollToTop() {
    window.scrollTo(0,0);
  }

  hasMotivation(name) {
    return !!this.campaign.motivation.includes(name);
  }

  hasColourTag() {
		if(this.cname==="colours-catwalk")
		   return true;
		else
      return false;
  }

  containsAnnotation() {
    for (let ann of this.annotationsToDelete) {
      if (ann.dbId === this.annotation.dbId) {
        return true;
      }
    }
    return false;
  }

  getColorLabel(label) {
    return this.i18n.tr('item:color:'+label);
  }

  toggleSortMenu() {
    if ($('.sort').hasClass('open')) {
      $('.sort').removeClass('open');
    }
    else {
      $('.sort').addClass('open');
    }
  }

  attached() {
    $('.accountmenu').removeClass('active');
    // window.addEventListener('scroll', e => this.scrollAndLoadMore());
  }

  detached() {
		this.record=null;
	}

	async activate(params, route) {
    this.loc = params.lang;
		this.i18n.setLocale(params.lang);

		this.cname = params.cname;
    this.loadCamp = true;
    let result = await this.campaignServices.getCampaignByName(params.cname)
      .then(response => {
        // Based on the selected language, set the campaign {title, description, instructions, prizes}
        response.title = ( response.title[this.loc] ? response.title[this.loc] : response.title['en'] );
        response.description = ( response.description[this.loc] ? response.description[this.loc] : response.description['en'] );
        response.instructions = ( response.instructions[this.loc] ? response.instructions[this.loc] : response.instructions['en'] );
        response.prizes.gold = ( response.prizes.gold[this.loc] ? response.prizes.gold[this.loc] : response.prizes.gold['en'] );
        response.prizes.silver = ( response.prizes.silver[this.loc] ? response.prizes.silver[this.loc] : response.prizes.silver['en'] );
        response.prizes.bronze = ( response.prizes.bronze[this.loc] ? response.prizes.bronze[this.loc] : response.prizes.bronze['en'] );
        response.prizes.rookie = ( response.prizes.rookie[this.loc] ? response.prizes.rookie[this.loc] : response.prizes.rookie['en'] );

        this.campaign = new Campaign(response);
      })
      .catch(error => {
        let index = this.router.routes.find(x => x.name === 'index');
        this.router.navigateToRoute('index', {lang: 'en'});
      });
    this.loadCamp = false;

    route.navModel.setTitle('Validation | ' + this.campaign.title);
	}

  selectLabel(label, sortBy, reload) {
    // If the label is the already selected label, do nothing
    if ( !reload && (this.sortBy === sortBy) && (this.label === label.toLowerCase()) ) {
      return;
    }

    this.loading = true;
    // Clear the previously retrieved records
    this.annotationsToDelete.splice(0, this.annotationsToDelete.length);
    $('.validation-button-group').addClass('hiddenfile');
    $('.validation-info').addClass('hiddenfile');
    this.recordIds.splice(0, this.recordIds.length);
    this.records.splice(0, this.records.length);
    this.offset = 0;

    $('.enlarge-color').removeClass('enlarge-color');
    $('.'+label).addClass('enlarge-color');
    // Set up the query parameters for the new RecordIds retrieval
    this.label = label.toLowerCase();
    if (this.label === 'multicolor') {
      this.label = 'multicoloured';
    }
    this.sortBy = sortBy;
    this.generators.splice(0, this.generators.length);
    this.generators.push(this.project + " " + this.campaign.username);
    if (this.campaign.username == "colours-catwalk") {
      this.generators.push("Image Analysis");
    }
    // Retrieve the new recordIds array
    this.recordServices.getRecordIdsByAnnLabel(this.label, this.generators, this.sortBy)
      .then( response => {
        this.recordIds = response;
        console.log("RESPONSE", response);
        // Fill the record array with the first batch of records
        this.getRecords(0);
      })
      .catch(error => {
        console.error(error.message);
      });
  }

	async getRecords(offset) {
    // Clone the recordIds array
    let recIds = this.recordIds.slice(0, this.recordIds.length);
    // Keep only the next batch in the array
    recIds.splice(0, offset);
    recIds.splice(COUNT, recIds.length-COUNT);
    // Retrieve the records
    this.recordServices.getMultipleRecords(recIds)
      .then ( results => {
        this.offset = this.offset + COUNT;
        this.fillRecordArray(results);
      })
      .catch(error => {
        console.error(error.message);
      });
	}

  fillRecordArray(records) {
    for (let i in records) {
      let recordData = records[i];
      if (recordData !== null) {
        this.records.push(new Record(recordData));
      }
    }
    this.loading = false;
  }

  quickView(record){
	  this.record=record;
		$('.action').removeClass('active');
		$('.action.itemview').addClass('active');
  }

  async findAnnotation(record) {
    let camelLabel = this.label.charAt(0).toUpperCase() + this.label.slice(1);
    let found = false;
    await this.getRecordAnnotations(record.dbId);
    if (this.hasMotivation('ColorTagging')) {
      for (let ann of this.colorannotations) {
        if (ann.label === camelLabel) {
          this.annotation = ann;
          found = true;
        }
      }
    }
    if (!found) {
      this.annotation = null;
    }
  }

  async selectAnnotation(record) {
    await this.findAnnotation(record);
    if (this.annotation == null) {
      toastr.error("The annotation failed to get selected");
      return;
    }

    if (this.containsAnnotation()) {
      // If the annotation is already selected, unselect it, instead
      this.unselectAnnotation(record);
      return;
    }
    else {
      // Select which annotations to discard
      $('.'+record.dbId).addClass('discardAnnotation');
      this.annotationsToDelete.push(this.annotation);
    }
    $('.validation-button-group').removeClass('hiddenfile');
    $('.validation-info').removeClass('hiddenfile');
    console.log("[SELECT] ANNOTATIONS TO DELETE:", this.annotationsToDelete);
  }

  unselectAnnotation(record) {
    if (this.annotation == null) {
      toastr.error("The annotation failed to get selected");
      return;
    }
    // Undo the selection of an annotation
    for (let i in this.annotationsToDelete) {
      if (this.annotationsToDelete[i].dbId === this.annotation.dbId) {
        this.annotationsToDelete.splice(i, 1);
        $('.'+record.dbId).removeClass('discardAnnotation');
        console.log("[UNSELECT] ANNOTATIONS TO DELETE:", this.annotationsToDelete);
        if (this.annotationsToDelete.length == 0) {
          $('.validation-button-group').addClass('hiddenfile');
          $('.validation-info').addClass('hiddenfile');
        }
        return;
      }
    }
    toastr.error("The annotation failed to get unselected");
  }

  clearSelections() {
    // Cancel the selections you made
    this.annotationsToDelete.splice(0, this.annotationsToDelete.length);
    $('.discardAnnotation').removeClass('discardAnnotation');
    $('.validation-button-group').addClass('hiddenfile');
    $('.validation-info').addClass('hiddenfile');
    console.log("[CLEAR] ANNOTATIONS TO DELETE:", this.annotationsToDelete);
  }

  deleteAnnotations() {
    if (this.annotationsToDelete.length == 0) {
      toastr.error("You have not selected any annotations");
      return
    }
    if (confirm('ATTENTION: This action can not be undone!!\nAre you sure you want to delete the selected annotations?')) {
      console.log("Deleting annotations...");
    }
    else {
      return;
    }

    // Discard the selected annotations
    for (var ann of this.annotationsToDelete) {
      this.annotationServices.delete(ann.dbId)
      .then( () => {
        // Remove one point from each of the upvoters
        for (let upvoter of ann.approvedBy) {
          this.campaignServices.decUserPoints(this.campaign.dbId, upvoter.withCreator, 'approved');
        }
        // Remove one point from each of the annotators
        for (let annotator of ann.createdBy) {
          this.campaignServices.decUserPoints(this.campaign.dbId, annotator.withCreator, 'created');
        }
        // Refresh the view
        this.annotationsToDelete.splice(0, this.annotationsToDelete.length);
        this.selectLabel(this.label, this.sortBy, true);
        let camelLabel = this.label.charAt(0).toUpperCase() + this.label.slice(1);
        $('.'+camelLabel).addClass('enlarge-color');
        $('.validation-button-group').addClass('hiddenfile');
        $('.validation-info').addClass('hiddenfile');
        console.log("[DELETE] ANNOTATIONS TO DELETE:", this.annotationsToDelete);
      })
      .catch(error => {
        console.log(error.message);
        toastr.error("An error occured during the annotation deletion.");
      });
    }
  }


  // DOES NOT WORK : IT LOADS THE SAME IMAGES
  scrollAndLoadMore() {
		if (($("#recs").height() - window.scrollY < 900 ) && !this.loading && this.more )
    this.loading = true;
	 		this.getRecords(this.offset);
	}

  async loadMore() {
    this.loading = true;
		this.getRecords(this.offset);
  }



  async getRecordAnnotations(id) {
    if (this.hasMotivation('Polling')) {
      await this.recordServices.getAnnotations(id, 'Polling').then(response => {
        for (var i = 0; i < response.length; i++) {
          //if (response[i].annotators[0].generator == (settings.project+' '+(this.campaign.username))) {
          if (!this.userServices.current) {
            this.pollannotations.push(new Annotation(response[i], ""));
          } else {
            this.pollannotations.push(new Annotation(response[i], this.userServices.current.dbId));
          }
          //}
        }
        // Bring first the annotation associated with the spedific collection
        for (var i in this.pollannotations) {
          if (this.pollannotations[i].label == this.colTitle) {
            let temp = this.pollannotations[0];
            this.pollannotations[0] = this.pollannotations[i];
            this.pollannotations[i] = temp;
            break;
          }
        }
        if (this.pollannotations.length > 0) {
          this.pollTitle = this.pollannotations[0].label;
        }
        else {
          toastr.error(this.i18n.tr('item:toastr-empty'));
        }
      });
    }
    if (this.hasMotivation('GeoTagging')) {
      await this.recordServices.getAnnotations(id, 'GeoTagging').then(response => {
        this.geoannotations = [];
        for (var i = 0; i < response.length; i++) {
          if (!this.userServices.current) {
            this.geoannotations.push(new Annotation(response[i], ""));
          } else {
            this.geoannotations.push(new Annotation(response[i], this.userServices.current.dbId));
          }
        }
      });
      // Sort the annotations in descending order, based on their score
      this.geoannotations.sort(function(a, b) {
        return b.score - a.score;
      });
    }
    if (this.hasMotivation('Tagging')) {
      await this.recordServices.getAnnotations(id, 'Tagging').then(response => {
        this.annotations = [];
        for (var i = 0; i < response.length; i++) {
          if (!this.userServices.current) {
            this.annotations.push(new Annotation(response[i], "", this.loc));
          } else {
            this.annotations.push(new Annotation(response[i], this.userServices.current.dbId, this.loc));
          }
        }
      });
      // Sort the annotations in descending order, based on their score
      this.annotations.sort(function(a, b) {
        return b.score - a.score;
      });
    }
    if (this.hasMotivation('ColorTagging')) {
      await this.recordServices.getAnnotations(id, 'ColorTagging').then(response => {
        this.colorannotations = [];
        for (var i = 0; i < response.length; i++) {
          // Filter the annotations based on the generator
          var flag = false;
          for (var annotator of response[i].annotators) {
            if ( (annotator.generator == (settings.project+' '+(this.campaign.username)))
              || (annotator.generator == 'Image Analysis') ) {
                flag = true;
                break;
            }
          }
          // If the criterias are met, push the annotation inside the array
          if (flag) {
            if (response[i].body.label.en && response[i].body.label.en=="gray") {
              response[i].body.label.en = ["grey"];
              response[i].body.label.default = ["grey"];
            }
            if (!this.userServices.current) {
              this.colorannotations.push(new Annotation(response[i], ""));
            } else {
              this.colorannotations.push(new Annotation(response[i], this.userServices.current.dbId));
            }
          }
        }
      });
      // Sort the annotations in descending order, based on their score
      this.colorannotations.sort(function(a, b) {
        return b.score - a.score;
      });
    }
  }
}
