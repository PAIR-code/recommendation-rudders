// -------------------------------------------------------------------------------------
//  Session management: stored in the URL

import { ActivatedRoute, Params, Router } from '@angular/router';
import { Participant } from './participant';
import { Session } from './session';
import { Experiment } from './staged-exp/data-model';
import { initialExperimentSetup } from './staged-exp/example-experiment';
import { EffectRef, effect, signal } from '@angular/core';
import * as _ from 'underscore';
import { Subscription } from 'rxjs';

// -------------------------------------------------------------------------------------
export interface ParticipantSession {
  user: string;
  experiment: string;
  stage: string;
}
// export interface AppSessionParamState {
//   session: Partial<ParticipantSession>;
//   errors: string[];
// }
export const DEFAULT_SESSION: ParticipantSession = {
  user: '',
  experiment: '',
  stage: '',
};

export const APPSTATE_LANDING_PAGE = 'landing-page';
export const APPSTATE_PARTICIPANT = 'participant';
export const APPSTATE_EXPERIMENTER = 'experimenter';

// Idea to handle different state kinds of classes...
export class GenericAppState<SessionData> {
  public session: Session<SessionData>;
  private paramsSubscription: Subscription;
  private queryParamsSubscription: Subscription;
  private sessionToRouterEffectRef: EffectRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private defaultSessionData: SessionData,
  ) {
    const routeParamsSignal = signal<Params>({}, { equal: _.isEqual });

    this.paramsSubscription = this.route.params.subscribe((params) => {
      console.log(JSON.stringify(params));
      routeParamsSignal.set(params);
    });

    const queryParamsSignal = signal<Partial<SessionData>>({}, { equal: _.isEqual });
    this.queryParamsSubscription = this.route.queryParams.subscribe((params) =>
      queryParamsSignal.set(params as Partial<SessionData>),
    );
    this.session = new Session(queryParamsSignal, this.defaultSessionData);
    this.sessionToRouterEffectRef = effect(() =>
      this.router.navigate([], { relativeTo: this.route, queryParams: this.session.toUrlParams }),
    );
  }

  destroy() {
    this.paramsSubscription.unsubscribe();
    this.queryParamsSubscription.unsubscribe();
    this.sessionToRouterEffectRef.destroy();
  }
}

export class AppStateLandingPage {}

export interface AppStateLandingPage {
  kind: typeof APPSTATE_LANDING_PAGE;
}
export interface AppStateParticipant {
  kind: typeof APPSTATE_PARTICIPANT;
  particpant: Participant;
  session: Session<ParticipantSession>;
}
export interface AppStateExperimenter {
  kind: typeof APPSTATE_EXPERIMENTER;
}

export type AppState = AppStateLandingPage | AppStateParticipant | AppStateExperimenter;

export const initAppState: AppState = { kind: APPSTATE_LANDING_PAGE };

// class AppController {
//   state: AppState;

//   constructor(
//     private router: Router,
//     private route: ActivatedRoute,
//   ) {}
// }

// -------------------------------------------------------------------------------------
//  App Settings & Data (saved in local storage / firebase)
// -------------------------------------------------------------------------------------
// App setting and data saved in localstorage/server side.
export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}
export interface SavedAppData {
  settings: AppSettings;
  experiments: { [name: string]: Experiment };
}

export function initialAppData(): SavedAppData {
  const experiment = initialExperimentSetup(3);
  const experiments: { [name: string]: Experiment } = {};
  experiments[experiment.name] = experiment;

  return {
    settings: {
      name: 'LLM-Mediators',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiments,
  };
}
