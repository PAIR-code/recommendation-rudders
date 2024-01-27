import { computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { Experiment, ExpStage, UserData, ExpDataKinds, UserProfile } from './staged-exp/data-model';
import { Session } from './session';
import { SavedAppData, ParticipantSession, editParticipant } from './app';

export class Participant {
  public userData: Signal<UserData>;
  public experiment: Signal<Experiment>;
  public viewingStage: Signal<ExpStage>;
  public workingOnStage: Signal<ExpStage>;

  constructor(
    private appData: WritableSignal<SavedAppData>,
    private session: Session<ParticipantSession>,
    public participant: { experiment: string; id: string },
  ) {
    this.experiment = computed(() => {
      const experiment = this.appData().experiments[participant.experiment];
      if (!experiment) {
        throw new Error(`No such experiment name: ${participant.experiment}`);
      }
      return experiment;
    });
    this.userData = computed(() => {
      const user = this.experiment().participants[participant.id];
      if (!user) {
        throw new Error(`No such user id: ${participant.id}`);
      }
      return user;
    });
    this.viewingStage = computed(() => this.userData().stageMap[this.session.sessionData().stage]);
    this.workingOnStage = computed(
      () => this.userData().stageMap[this.userData().workingOnStageName],
    );
  }

  public edit(f: (user: UserData) => UserData | void): void {
    editParticipant(this.appData, this.participant, f);
  }

  setViewingStage(expStageName: string) {
    this.session.edit((session) => {
      session.stage = expStageName;
    });
  }

  setWorkingOnStage(expStageName: string) {
    this.edit((user) => {
      user.workingOnStageName = expStageName;
    });
  }

  setStageComplete(complete: boolean) {
    this.edit((user) => {
      user.stageMap[user.workingOnStageName].complete = complete;
    });
  }

  editStageData<T extends ExpDataKinds>(f: (oldExpStage: T) => T | void) {
    this.edit((user) => {
      const maybeNewData = f(user.stageMap[user.workingOnStageName].config as T);
      if (maybeNewData) {
        user.stageMap[user.workingOnStageName].config = maybeNewData;
      }
    });
  }

  setProfile(newUserProfile: UserProfile) {
    this.edit((user) => {
      user.profile = newUserProfile;
    });
  }

  nextStep() {
    let currentStageName = this.viewingStage().name;
    this.edit((u) => {
      if (u.workingOnStageName === currentStageName) {
        const nextStageName = u.futureStageNames.shift();
        if (!nextStageName) {
          return;
        }
        u.completedStageNames.push(u.workingOnStageName);
        u.workingOnStageName = nextStageName;
        currentStageName = nextStageName;
      } else {
        // here, we can assume that u.currentStageName is among one of the completed stages.
        const currentStageIdx = u.completedStageNames.indexOf(currentStageName);
        currentStageName =
          currentStageIdx === u.completedStageNames.length - 1
            ? u.workingOnStageName
            : u.completedStageNames[currentStageIdx + 1];
      }

      this.session.edit((session) => {
        session.stage = currentStageName;
      });
    });
  }
}
