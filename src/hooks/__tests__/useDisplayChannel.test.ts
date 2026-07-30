import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAudienceChannel, useOperatorChannel } from '../useDisplayChannel';
import { defaultDisplaySettings } from '../../lib/events';

describe('operator <-> audience channel sync', () => {
  it('syncs a shown bidder from the operator hook to the audience hook', async () => {
    const settings = defaultDisplaySettings();
    const operator = renderHook(() => useOperatorChannel({ settings, current: null }));
    const audience = renderHook(() => useAudienceChannel(settings));

    await waitFor(() => expect(operator.result.current.connected).toBe(true));

    act(() => {
      operator.result.current.showBidder('254', 'John & Sarah Smith');
    });

    await waitFor(() => {
      expect(audience.result.current.current?.bidderNumber).toBe('254');
      expect(audience.result.current.stage).toBe('bidder');
    });
  });

  it('clears the audience stage when the operator clears the display', async () => {
    const settings = defaultDisplaySettings();
    const operator = renderHook(() => useOperatorChannel({ settings, current: null }));
    const audience = renderHook(() => useAudienceChannel(settings));

    await waitFor(() => expect(operator.result.current.connected).toBe(true));

    act(() => {
      operator.result.current.showBidder('101', 'Alex Johnson');
    });
    await waitFor(() => expect(audience.result.current.stage).toBe('bidder'));

    act(() => {
      operator.result.current.clearDisplay();
    });
    await waitFor(() => expect(audience.result.current.stage).toBe('cleared'));
  });

  it('sends a full state sync to a freshly opened audience window', async () => {
    const settings = defaultDisplaySettings();
    const operator = renderHook(() =>
      useOperatorChannel({ settings, current: { bidderNumber: '312', displayName: 'Billings Community Foundation' } }),
    );
    await waitFor(() => expect(operator.result.current.supported).toBe(true));

    const audience = renderHook(() => useAudienceChannel(defaultDisplaySettings()));

    await waitFor(() => {
      expect(audience.result.current.current?.bidderNumber).toBe('312');
    });
  });
});
