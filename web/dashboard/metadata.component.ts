/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Component } from "@angular/core";
import { Router } from "@angular/router";

import { GenericRecordsComponent } from "./generic-records.component";
import { Metadata } from "./metadata";
import { MetadataService } from "./metadata.service";
import { ProcessingService } from "./processing.service";
import { METADATA } from "./route-paths";

@Component({
  // moduleId: module.id,
  selector: "metadata-component",
  templateUrl: "./metadata.component.html",
  providers: [
    { provide: "Loader", useExisting: MetadataService },
    { provide: "Clearable", useExisting: MetadataService },
  ],
})
export class MetadataComponent extends
GenericRecordsComponent<Metadata, MetadataService> {
  // We must have the constructor here so that it can be annotated by the
  // decorator and Angular can find its bearings.
  constructor(router: Router,
              files: MetadataService,
              processing: ProcessingService) {
    super(router, files, processing, METADATA);
  }

  protected getDownloadData(record: Metadata): Promise<string> {
    return Promise.resolve(record.data);
  }
}