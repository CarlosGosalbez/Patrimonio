import { describe, expect, it } from 'vitest'
import {
  descriptionSimilarity,
  detectPossibleDuplicate,
  detectUnexpectedCharge,
  suggestCategory,
} from '@/lib/imports/matching'

describe('imports matching', () => {
  it('detects likely duplicate transactions with fuzzy description', () => {
    const candidate = detectPossibleDuplicate(
      'account-1',
      {
        amount_cents: 1599,
        description: 'NETFLIX MADRID',
        external_id: null,
        is_income: false,
        merchant_key: 'netflix madrid',
        notes: null,
        source_row_index: 0,
        transaction_date: '2026-04-01',
        value_date: null,
      },
      [
        {
          account_id: 'account-1',
          amount_cents: 1599,
          description: 'Netflix Madrid ES',
          id: 'tx-1',
          transaction_date: '2026-04-02',
        },
      ],
    )

    expect(candidate).toEqual(
      expect.objectContaining({
        existing_id: 'tx-1',
      }),
    )
    expect(candidate?.confidence).toBeGreaterThanOrEqual(0.75)
  })

  it('applies user categorization rules before merchant heuristics', () => {
    const suggestion = suggestCategory(
      {
        amount_cents: 4990,
        description: 'PAGO ENDESA MARZO',
        external_id: null,
        is_income: false,
        merchant_key: 'endesa marzo',
        notes: null,
        source_row_index: 0,
        transaction_date: '2026-03-28',
        value_date: null,
      },
      [
        {
          category_id: 'cat-utilities',
          is_case_sensitive: false,
          is_regex: false,
          pattern: 'ENDESA',
          priority: 100,
        },
      ],
      [
        {
          color: null,
          icon: null,
          id: 'cat-utilities',
          is_income: false,
          name: 'Suministros (luz, agua, gas)',
          user_id: null,
        },
      ],
    )

    expect(suggestion).toEqual(
      expect.objectContaining({
        category_id: 'cat-utilities',
        source: 'rule',
      }),
    )
  })

  it('flags unexpected charges against cancelled subscriptions', () => {
    const unexpected = detectUnexpectedCharge(
      {
        amount_cents: 1299,
        description: 'SPOTIFY FAMILY',
        external_id: null,
        is_income: false,
        merchant_key: 'spotify family',
        notes: null,
        source_row_index: 1,
        transaction_date: '2026-04-05',
        value_date: null,
      },
      [
        {
          cancelled_at: '2026-03-15T00:00:00+00:00',
          id: 'commitment-1',
          name: 'Spotify',
          service_name: 'Spotify',
        },
      ],
    )

    expect(unexpected).toEqual(
      expect.objectContaining({
        commitment_id: 'commitment-1',
        service_name: 'Spotify',
      }),
    )
  })

  it('computes normalized similarity for merchant names', () => {
    expect(descriptionSimilarity('Nómina ACME, S.L.', 'Nomina ACME SL')).toBeGreaterThan(0.9)
  })
})
