import { shareTeamCode } from '@/components/dashboard/share-team-code';
import { TrainerHome } from '@/components/dashboard/trainer/trainer-home';
import { createContext, useContext } from 'react';

import { AthleteBand, AthleteHome, AthleteSessions } from '@/components/dashboard/athlete/athlete-tabs';
import { LearnTab } from '@/components/dashboard/athlete/learn-tab';
import { AlertsTab } from '@/components/dashboard/coach/alerts-tab';
import { CoachHome as CoachHomeScreen } from '@/components/dashboard/coach/coach-home';
import { PlanTab } from '@/components/dashboard/coach/plan-tab';
import { TeamTabClassic } from '@/components/dashboard/coach/team-tab';
import { CoachLargeTitle, LargeTitle, type DashboardRole } from '@/components/dashboard/dashboard-shell';
import { ProfileTab } from '@/components/dashboard/profile-tab';
import { ProtocolsTab } from '@/components/dashboard/trainer/protocols-tab';
import { TrainerAthletes } from '@/components/dashboard/trainer/trainer-athletes';
import { TrainerMonitor } from '@/components/dashboard/trainer/trainer-monitor';
import { useTeamDraft } from '@/state/onboarding';

/** Lets a section's "Show All" link switch tabs without threading props through every screen. */
const NavContext = createContext<(tab: string) => void>(() => {});

export function DashboardContent({ onNavigate, role, tab }: { onNavigate?: (tab: string) => void; role: DashboardRole; tab: string }) {
  let content;
  switch (role) {
    case 'coach':
      content = <CoachContent tab={tab} />;
      break;
    case 'trainer':
      content = <TrainerContent tab={tab} />;
      break;
    default:
      content = <AthleteContent tab={tab} />;
  }
  return <NavContext.Provider value={onNavigate ?? (() => {})}>{content}</NavContext.Provider>;
}

function CoachContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'plan') return <><CoachLargeTitle title="Plan" /><PlanTab /></>;
  if (tab === 'team') return <><CoachLargeTitle title="Team" /><TeamTabClassic /></>;
  if (tab === 'alerts') return <><CoachLargeTitle title="Alerts" /><AlertsTab onNavigate={go} /></>;
  if (tab === 'profile') return <><CoachLargeTitle title="Profile" /><ProfileTab role="Coach" /></>;
  return <CoachHome />;
}

function TrainerContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'monitor') return <><LargeTitle title="Monitor" /><TrainerMonitor /></>;
  if (tab === 'athletes') return <><LargeTitle title="Athletes" /><TrainerAthletes /></>;
  if (tab === 'protocols') return <><LargeTitle title="Protocols" /><ProtocolsTab /></>;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athletic trainer" /></>;
  return <><LargeTitle title="Today" /><TrainerHome onOpenMonitor={() => go('monitor')} /></>;
}

function AthleteContent({ tab }: { tab: string }) {
  const go = useContext(NavContext);
  if (tab === 'band') return <><LargeTitle title="Band" /><AthleteBand /></>;
  if (tab === 'sessions') return <><LargeTitle title="Sessions" /><AthleteSessions /></>;
  if (tab === 'learn') return <><LargeTitle title="Learn" /><LearnTab onOpenBand={() => go('band')} /></>;
  if (tab === 'profile') return <><LargeTitle title="Profile" /><ProfileTab role="Athlete" /></>;
  return <><LargeTitle title="Today" /><AthleteHome onOpenBand={() => go('band')} /></>;
}

/** Route the coach Home actions to the shared dashboard navigation. */
function CoachHome() {
  const go = useContext(NavContext);
  const draft = useTeamDraft();
  return <CoachHomeScreen onInvite={() => shareTeamCode(draft)} onOpenPlan={() => go('plan')} />;
}
