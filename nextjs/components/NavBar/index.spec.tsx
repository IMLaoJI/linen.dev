import React from 'react';
import NavBar from '.';
import { render } from '@testing-library/react';
import { build } from '__tests__/factory';
import { Mode } from 'hooks/mode';

describe('NavBar', () => {
  it('renders channels', () => {
    const channel1 = build('channel');
    const channel2 = build('channel');
    const channels = [channel1, channel2];
    const { container } = render(
      <NavBar
        channelName={channel1.channelName}
        channels={channels}
        permissions={build('permissions')}
        mode={Mode.Default}
      />
    );
    expect(container).toHaveTextContent(channel1.channelName);
    expect(container).toHaveTextContent(channel2.channelName);
  });
});
