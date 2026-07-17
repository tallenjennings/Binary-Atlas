import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AtlasScene, DEFAULT_OVERLAYS, getVisibleLocationBinaries } from '../src/components/AtlasScene';
import { binaryToLocation } from '../src/lib/binaryAtlas';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useThree: () => ({ camera: { position: { set: () => undefined }, lookAt: () => undefined } }),
}));
vi.mock('@react-three/drei', () => ({
  Line: () => <div data-testid="line" />,
  OrbitControls: React.forwardRef((_props, ref: React.ForwardedRef<{ target: { set: () => void }; update: () => void }>) => {
    if (typeof ref === 'function') ref({ target: { set: () => undefined }, update: () => undefined });
    else if (ref) ref.current = { target: { set: () => undefined }, update: () => undefined };
    return <div data-testid="controls" />;
  }),
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('AtlasScene overlays', () => {
  it('renders exactly one marker for binary 101 when overlays are disabled', () => {
    render(<AtlasScene selected={binaryToLocation('101')} landmarks={[]} overlays={DEFAULT_OVERLAYS} />);
    const markers = screen.getAllByTestId('atlas-marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].getAttribute('data-binary')).toBe('101');
  });

  it('derives proper ancestors for 101 only', () => {
    expect(getVisibleLocationBinaries('101', [], { ...DEFAULT_OVERLAYS, showAncestors: true })).toEqual(['101', '1', '10']);
  });

  it('adds children without duplicating selected 101', () => {
    expect(getVisibleLocationBinaries('101', [], { ...DEFAULT_OVERLAYS, showChildren: true })).toEqual(['101', '1010', '1011']);
  });

  it('deduplicates saved landmarks matching the selected node', () => {
    const landmark = { id: 'same', name: 'same', description: '', inputType: 'binary', binary: '101', key: '12', level: 3, coordinate: { angle: 0, visualY: 0, radius: 4 }, createdAt: '', exact: true };
    expect(getVisibleLocationBinaries('101', [landmark], { ...DEFAULT_OVERLAYS, showSavedLandmarks: true })).toEqual(['101']);
  });
});
