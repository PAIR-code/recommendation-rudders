import { computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';
import { Experiment, ExpStage, UserData, ExpDataKinds, UserProfile, ChatAboutItems } from './staged-exp/data-model';
import { Session } from './session';
import { SavedAppData, ParticipantSession } from './app';

export class Participant {
  public userData: Signal<UserData>;
  public experiment: Signal<Experiment>;
  public viewingStage: Signal<ExpStage>;
  public workingOnStage: Signal<ExpStage>;

  constructor(
    private appData: WritableSignal<SavedAppData>,
    private session: Session<ParticipantSession>,
    public experimentName: string,
    public userId: string,
  ) {
    this.experiment = computed(() => {
      const experiment = this.appData().experiments[experimentName];
      if (!experiment) {
        throw new Error(`No such experiment name: ${experimentName}`);
      }
      return experiment;
    });
    this.userData = computed(() => {
      const user = this.experiment().participants[userId];
      if (!user) {
        throw new Error(`No such user id: ${userId}`);
      }
      return user;
    });
    this.viewingStage = computed(() => this.userData().stageMap[this.session.sessionData().stage]);
    this.workingOnStage = computed(() => this.userData().stageMap[this.userData().workingOnStageName]);
  }

  public edit(f: (user: UserData) => UserData | void): void {
    const data = this.appData();
    // We have to force update the user object also, because change tracking for
    // the user Signal is based on reference.
    let user: UserData = { ...this.userData() };
    const maybeNewUser = f(user);
    if (maybeNewUser) {
      user = { ...maybeNewUser };
    }
    if (user.userId !== this.userId) {
      // TODO: we could consider allowing this with an option to the call...
      throw new Error(`Editing a user should not their id: new: ${user.userId}, old: ${this.userId}`);
    }
    // TODO...
    // Editing experiment like this means we assume no async changes to the experiment...
    // If we had signals linked to the experiment, tracked by reference, they will not know...
    this.experiment().participants[user.userId] = user;
    this.appData.set({ ...data });
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
