import { ImageResponse } from 'next/og';

export const alt = 'Orb, a calmer private browser for macOS';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#F4F1EA',
          color: '#141310',
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: 28, fontWeight: 600 }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 999,
              border: '3px solid #A0522D',
            }}
          >
            <div style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: '#141310' }} />
          </div>
          Orb
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              maxWidth: 900,
              fontSize: 76,
              fontWeight: 600,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
            }}
          >
            Focus without the tab sprawl.
          </div>
          <div style={{ display: 'flex', marginTop: 24, fontSize: 28, color: '#6E6960' }}>
            A private browser for macOS. Open source under MIT.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, color: '#6E6960' }}>
          <span>Spaces · Command bar · Real blocking</span>
          <span>github.com/flashrod/orb</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
