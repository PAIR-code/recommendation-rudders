/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { VertexApiService } from '../vertex-api.service';

@Component({
  selector: 'app-llm-api-config',
  templateUrl: './llm-api-config.component.html',
  styleUrls: ['./llm-api-config.component.scss']
})
export class LlmApiConfigComponent {
  public tokenControl: FormControl<string | null>;
  public projectControl: FormControl<string | null>;

  constructor(private llmService: VertexApiService) {
    this.tokenControl = new FormControl<string | null>(this.llmService.accessToken);
    this.projectControl = new FormControl<string | null>(this.llmService.projectId);

    this.tokenControl.valueChanges.forEach(update => {
      if (update && this.llmService.accessToken !== update) {
        this.llmService.accessToken = update
      }
    });
    this.projectControl.valueChanges.forEach(update => {
      if (update && this.llmService.projectId !== update) {
        this.llmService.projectId = update
      }
    });
  }
}
