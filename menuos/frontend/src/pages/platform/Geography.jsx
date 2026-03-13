import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../api/queries.js';

const PLAN_COLORS = { free: '#64748b', basic: '#2563EB', pro: '#C8A84B', premium: '#7C3AED' };

export default function Geography() {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['geography'],
    queryFn: platformApi.getGeography,
  });

  const restaurants = data?.restaurants || [];
  const summary = data?.summary || { byCountry: {}, total: 0 };

  // Simple SVG world map visualization
  const countries = Object.entries(summary.byCountry).sort((a, b) => b[1].count - a[1].count);

  if (isLoading) return <div style={{ padding: 32, color: '#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>🌍 Geographic Distribution</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>Restaurant locations and coverage by region</p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#C8A84B' }}>{summary.total}</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Total Locations</div>
        </div>
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#16A34A' }}>{countries.length}</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Countries</div>
        </div>
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#2563EB' }}>
            {restaurants.filter(r => r.is_active).length}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>Active Restaurants</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Country List */}
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>By Country</h2>
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {countries.map(([country, data]) => (
              <div
                key={country}
                onClick={() => setSelectedCountry(selectedCountry === country ? null : country)}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #334155',
                  cursor: 'pointer',
                  background: selectedCountry === country ? '#0f172a' : 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>🌐</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{country}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {Object.keys(data.states).length} state{Object.keys(data.states).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#C8A84B' }}>{data.count}</div>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>{data.active} active</div>
                  </div>
                </div>

                {/* States breakdown */}
                {selectedCountry === country && Object.keys(data.states).length > 0 && (
                  <div style={{ marginTop: 16, paddingLeft: 36 }}>
                    {Object.entries(data.states).map(([state, stateData]) => (
                      <div key={state} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                        <span style={{ color: '#94a3b8', fontSize: 14 }}>{state}</span>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ color: '#16A34A', fontSize: 12 }}>{stateData.active} active</span>
                          <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{stateData.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Restaurant List */}
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              {selectedCountry ? `Restaurants in ${selectedCountry}` : 'All Locations'}
            </h2>
          </div>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {restaurants
              .filter(r => !selectedCountry || r.country === selectedCountry)
              .map((restaurant) => (
              <div
                key={restaurant.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                      {restaurant.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {restaurant.city}{restaurant.city && restaurant.state ? ', ' : ''}{restaurant.state}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                      📍 {restaurant.latitude.toFixed(4)}, {restaurant.longitude.toFixed(4)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: PLAN_COLORS[restaurant.subscription_plan],
                      color: '#fff',
                      textTransform: 'capitalize'
                    }}>
                      {restaurant.subscription_plan}
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        background: restaurant.is_active ? '#dcfce7' : '#fee2e2',
                        color: restaurant.is_active ? '#16A34A' : '#dc2626'
                      }}>
                        {restaurant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan Distribution by Country */}
      <div style={{ marginTop: 32, background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Plan Distribution by Region</h2>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['free', 'basic', 'pro', 'premium'].map(plan => {
              const count = restaurants.filter(r => r.subscription_plan === plan).length;
              const percentage = restaurants.length > 0 ? Math.round((count / restaurants.length) * 100) : 0;
              return (
                <div key={plan} style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ textTransform: 'capitalize', color: '#94a3b8', fontSize: 14 }}>{plan}</span>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: '#334155', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: PLAN_COLORS[plan],
                      borderRadius: 4
                    }} />
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', marginTop: 4 }}>{percentage}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
