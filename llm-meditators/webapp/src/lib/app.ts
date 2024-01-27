// -------------------------------------------------------------------------------------
//  Session management: stored in the URL

import { ActivatedRoute, ActivatedRouteSnapshot, Params, Router } from '@angular/router';
import { Participant } from './participant';
import { Session } from './session';
import { ChatAboutItems, ExpDataKinds, Experiment, UserData } from './staged-exp/data-model';
import { initialExperimentSetup } from './staged-exp/example-experiment';
import { EffectRef, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import * as _ from 'underscore';
import { Subscription } from 'rxjs';
import { option } from 'yargs';

// function getPathArray(route: ActivatedRouteSnapshot) {
//   let array = [];
//   if (route.routeConfig && route.routeConfig.path !== '') {
//     array.push(route.routeConfig.path);
//   }
//   if (route.firstChild) {
//     array = array.concat(getPathArray(route.firstChild));
//   }
//   return array;
// }

// -------------------------------------------------------------------------------------
export interface ParticipantRouteParams {
  user: string;
  experiment: string;
}
export interface ParticipantQueryParams {
  stage: string;
}
export type ParticipantSession = ParticipantRouteParams & ParticipantQueryParams;

// export interface AppSessionParamState {
//   session: Partial<ParticipantSession>;
//   errors: string[];
// }
export const DEFAULT_PARTICIPANT_SESSION: ParticipantSession = {
  user: '',
  experiment: '',
  stage: '',
};

export const APPSTATE_LANDING_PAGE = 'landing-page';
export const APPSTATE_PARTICIPANT = 'participant';
export const APPSTATE_EXPERIMENTER = 'experimenter';

// Idea to handle different state kinds of classes...
//
// Combines routeParams and queryParams into a single Session, and sets them appropriately.
export class GenericAppState<RouteParamData, QueryParamData> {
  // type Session = RouteParamData & QueryParamData;
  public session: Session<RouteParamData & QueryParamData>;
  private paramsSubscription: Subscription;
  private queryParamsSubscription: Subscription;
  private sessionToRouterEffectRef: EffectRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    // The subset of top level session variables
    private routeParamNames: Set<keyof RouteParamData>,
    private defaultSessionData: RouteParamData & QueryParamData,
  ) {
    const routeParamsSignal = signal<Partial<RouteParamData>>({}, { equal: _.isEqual });
    this.paramsSubscription = this.route.params.subscribe((params) => {
      console.log(JSON.stringify(params));
      routeParamsSignal.set(params as Partial<RouteParamData>);
    });

    const queryParamsSignal = signal<Partial<QueryParamData>>({}, { equal: _.isEqual });
    this.queryParamsSubscription = this.route.queryParams.subscribe((params) =>
      queryParamsSignal.set(params as Partial<QueryParamData>),
    );

    const allParamsSignal = computed(() => {
      return { ...routeParamsSignal(), ...queryParamsSignal() } as Partial<
        RouteParamData & QueryParamData
      >;
    });

    this.session = new Session(allParamsSignal, this.defaultSessionData);
    this.sessionToRouterEffectRef = effect(() => {
      const routeParams = {} as RouteParamData;
      const queryParams = {} as Params;
      const urlParams = this.session.toUrlParams();
      Object.keys(urlParams).forEach((k) => {
        // const key = k as keyof (RouteParamData & QueryParamData);
        if (routeParamNames.has(k as keyof RouteParamData)) {
          const routeKey = k as keyof RouteParamData;
          routeParams[routeKey] = urlParams[routeKey] as RouteParamData[keyof RouteParamData];
        } else {
          const queryKey = k as keyof QueryParamData;
          queryParams[k] = urlParams[queryKey] as Params[keyof Params];
        }
      });
      // TODO: set navigate route params too...
      this.router.navigate([], { relativeTo: this.route, queryParams });
    });
  }

  destroy() {
    this.paramsSubscription.unsubscribe();
    this.queryParamsSubscription.unsubscribe();
    this.sessionToRouterEffectRef.destroy();
  }
}

export class AppStateLandingPage {}

// export interface AppStateLandingPage {
//   kind: typeof APPSTATE_LANDING_PAGE;
// }

const participantRouteParams = new Set<keyof ParticipantRouteParams>(['experiment', 'user']);
export class AppStateParticipant extends GenericAppState<
  ParticipantRouteParams,
  ParticipantSession
> {
  participant: Participant;

  constructor(
    router: Router,
    route: ActivatedRoute,
    private appData: WritableSignal<SavedAppData>,
    participant: { experiment: string; id: string },
  ) {
    super(router, route, participantRouteParams, DEFAULT_PARTICIPANT_SESSION);
    this.participant = new Participant(this.appData, this.session, participant);
  }
}

// export interface AppStateParticipant {
//   kind: typeof APPSTATE_PARTICIPANT;
//   particpant: Participant;
//   session: Session<ParticipantSession>;
// }
// export interface AppStateExperimenter {
//   kind: typeof APPSTATE_EXPERIMENTER;
// }
export class AppStateExperimenter {}

// export type AppState = AppStateLandingPage | AppStateParticipant | AppStateExperimenter;

// export const initAppState: AppState =
// { kind: APPSTATE_LANDING_PAGE };

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

export function editParticipant(
  appData: WritableSignal<SavedAppData>,
  participant: { experiment: string; id: string },
  f: (user: UserData) => UserData | void,
  options?: { skipSetting: boolean },
): void {
  const data = appData();
  const experiment = data.experiments[participant.experiment];
  const userData = experiment.participants[participant.id];
  // We have to force update the user object also, because change tracking for
  // the user Signal is based on reference.
  let user: UserData = { ...userData };
  const maybeNewUser = f(user);
  if (maybeNewUser) {
    user = { ...maybeNewUser };
  }
  if (user.userId !== participant.id) {
    // TODO: we could consider allowing this with an option to the call...
    throw new Error(
      `Editing a user should not their id: new: ${user.userId}, old: ${participant.id}`,
    );
  }
  // TODO...
  // Editing experiment like this means we assume no async changes to the experiment...
  // If we had signals linked to the experiment, tracked by reference, they will not know...
  experiment.participants[user.userId] = user;
  if (options && options.skipSetting) {
    return;
  }
  appData.set({ ...data });
}

// IDEA: every stage has it's kind in it's (indexed) name. That way, we
// can check dynmically for trying to edit the wrong stage kind also.

export function editParticipantStage<T extends ExpDataKinds>(
  appData: WritableSignal<SavedAppData>,
  participant: { experiment: string; id: string },
  stageName: string,
  f: (oldExpStage: T) => T | void,
  options?: { skipSetting: boolean },
) {
  editParticipant(
    appData,
    participant,
    (user) => {
      const maybeNewData = f(user.stageMap[stageName].config as T);
      if (maybeNewData) {
        user.stageMap[stageName].config = maybeNewData;
      }
    },
    options,
  );
}

export function sendParticipantMessage(
  appData: WritableSignal<SavedAppData>,
  fromParticipant: { experiment: string; id: string },
  to: { stageName: string; message: string },
  options?: { withoutSetting: boolean },
): void {
  const experiment = appData().experiments[fromParticipant.experiment];

  for (const u of Object.values(experiment.participants)) {
    editParticipantStage<ChatAboutItems>(
      appData,
      fromParticipant,
      to.stageName,
      (config) => {
        console.log(u.userId, config);
        config.messages.push({
          userId: fromParticipant.id,
          messageType: 'userMessage',
          text: to.message,
          timestamp: new Date().valueOf(),
        });
      },
      { skipSetting: true },
    );
  }
  if (options && options.withoutSetting) {
    return;
  }
  appData.set({ ...appData() });
}
