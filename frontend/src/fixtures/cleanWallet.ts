import type { RiskResult } from '@/types/api';

export const cleanWallet: RiskResult = {
  address: '0x1111111111111111111111111111111111111111',
  chain: 'ethereum',
  score: 12,
  band: 'low',
  sanctions_hit: false,
  reasons: [
    {
      code: 'NEW_WALLET',
      title: 'New Wallet',
      weight: 12,
      detail: 'Account age is 30 days',
    },
  ],
  graph: {
    nodes: [
      { id: 'addr_1', label: '0x1111...1111', risk: 'low' },
      { id: 'addr_2', label: '0xaaaa...aaaa', risk: 'low' },
    ],
    edges: [{ source: 'addr_1', target: 'addr_2', value: 5.0 }],
  },
  generated_at: '2026-11-10T00:00:00Z',
  data_mode: 'fixture',
};

export const defaultWallet: RiskResult = {
  address: '0x3333333333333333333333333333333333333333',
  chain: 'ethereum',
  score: 20,
  band: 'low',
  sanctions_hit: false,
  reasons: [
    {
      code: 'NEW_WALLET',
      title: 'New Wallet',
      weight: 12,
      detail: 'Account age is 30 days',
    },
    {
      code: 'RISKY_COUNTERPARTY',
      title: 'Risky Counterparty',
      weight: 8,
      detail: 'Address interacts with random_address (risk: medium)',
    },
  ],
  graph: {
    nodes: [
      { id: 'addr_4', label: 'random_address', risk: 'medium' },
      { id: 'addr_5', label: '0xbbbb...bbbb', risk: 'medium' },
    ],
    edges: [{ source: 'addr_4', target: 'addr_5', value: 10.0 }],
  },
  generated_at: '2026-11-10T00:00:00Z',
  data_mode: 'fixture',
};
