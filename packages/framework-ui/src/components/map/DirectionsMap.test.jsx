import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DirectionsMap from './Direction';

const mapProps = vi.fn();
vi.mock('./MapView', () => ({ default: (props) => { mapProps(props); return <div data-testid="map" />; } }));

afterEach(() => { cleanup(); mapProps.mockClear(); });

describe('DirectionsMap', () => {
  test('works with any record through getPosition, title and description', () => {
    const site = { site_name: 'Tema depot', gps_lat: '5.67', gps_lng: '-0.01', street: 'Harbour Rd' };
    render(
      <DirectionsMap
        destination={site}
        getPosition={(row) => ({ lat: Number(row.gps_lat), lng: Number(row.gps_lng) })}
        title={(row) => row.site_name}
        description={(row) => row.street}
      />,
    );
    expect(screen.getByText(/to Tema depot/)).toBeTruthy();
    expect(screen.getByText('Harbour Rd')).toBeTruthy();
    const { center, markers } = mapProps.mock.lastCall[0];
    expect(center).toEqual({ lat: 5.67, lng: -0.01 });
    expect(markers[0]).toMatchObject({ id: 'destination', title: 'Tema depot', popup: 'Tema depot — Harbour Rd' });
  });

  test('reads latitude/longitude and a name by default, and says when there is no position', () => {
    render(<DirectionsMap destination={{ name: 'Accra office', latitude: 5.6, longitude: -0.19, address: 'Ring Rd' }} />);
    expect(mapProps.mock.lastCall[0].center).toEqual({ lat: 5.6, lng: -0.19 });
    expect(screen.getByText(/to Accra office/)).toBeTruthy();
    cleanup();

    render(<DirectionsMap destination={{ name: 'No GPS' }} emptyMessage="Add the shop's location first." />);
    expect(screen.getByText("Add the shop's location first.")).toBeTruthy();
    expect(screen.queryByTestId('map')).toBeNull();
  });
});
