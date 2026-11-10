import type { RiskResult } from '@/types/api';

export const highRiskWallet: RiskResult = {
  address: '0x2222222222222222222222222222222222222222',
  chain: 'ethereum',
  score: 87,
  band: 'severe',
  sanctions_hit: true,
  reasons: [
    {
      code: 'SANCTIONS_MATCH',
      title: 'Sanctions Match',
      weight: 60,
      detail: 'Address found on sanctions list (FAKE test fixture)',
    },
    {
      code: 'MIXER_EXPOSURE',
      title: 'Mixer Exposure',
      weight: 27,
      detail: 'Mixer share: 35%',
    },
  ],
  graph: {
    nodes: [
      { id: 'addr_2', label: '0x2222...2222', risk: 'high' },
      { id: 'addr_3', label: '0x3333...3333', risk: 'medium' },
    ],
    edges: [{ source: 'addr_2', target: 'addr_3', value: 10.0 }],
  },
  generated_at: '2026-11-10T00:00:00Z',
  data_mode: 'fixture',
};
