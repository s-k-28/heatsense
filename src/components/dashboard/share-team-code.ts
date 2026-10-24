import { router } from 'expo-router';
import { shareMessage, type InviteShareResult } from '@/components/ui/share-message';
import { ensureTeamInvite, getMyTeamInvite } from '@/services/team-invites';
import type { TeamDraft } from '@/state/onboarding';

export async function shareTeamCode(draft: TeamDraft): Promise<InviteShareResult> {
  try {
    // A coach who already created a team shares that team's active code; otherwise use the setup draft.
    const existing = await getMyTeamInvite();
    const complete = Boolean(draft.school.trim() && draft.teamName.trim() && draft.sport && draft.level);
    // No team yet: the code comes from creating one, so go there instead of explaining.
    if (!existing && !complete) {
      router.push('/team/create');
      return 'cancelled';
    }
    const teamName = existing ? existing.team.teamName : draft.teamName;
    const invite = existing
      ? existing.invite
      : await ensureTeamInvite({ school: draft.school, teamName: draft.teamName, sport: draft.sport!, level: draft.level! });
    return await shareMessage(`Join ${teamName} on HeatSense with the code ${invite.code}.`);
  } catch {
    return 'error';
  }
}
