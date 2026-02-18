import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './ZoneMap.css';

// Component to handle recentering the map when the center prop changes
function ChangeView({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView([center.lat, center.lng], zoom);
        }
    }, [center, zoom, map]);
    return null;
}

// Fix for default marker icons in Leaflet with React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const LocationMarker = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
};

const ZoneMap = ({ center, radius, otherZones = [], onUpdate, t }) => {
    const [pos, setPos] = useState(center || { lat: 31.7683, lng: 35.2137 });
    const [rad, setRad] = useState(radius || 1000);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const mapRef = React.useRef(null);

    useEffect(() => {
        if (center) setPos(center);
        if (radius) setRad(radius);
    }, [center, radius]);

    const handleUpdate = (newPos, newRad) => {
        onUpdate({
            lat: newPos.lat,
            lng: newPos.lng,
            radius: newRad
        });
    };

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            const data = await response.json();
            if (data && data.length > 0) {
                const newPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setPos(newPos);
                handleUpdate(newPos, rad);

                // Fly to the new location if map instance is accessible via the MapContainer ref
            } else {
                alert(t('store.coordsNotFound') || 'Location not found');
            }
        } catch (error) {
            console.error('Search error:', error);
            alert(t('store.coordsFetchError') || 'Error searching for location');
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="zone-map-container">
            <div className="map-wrapper">
                <form className="map-search-bar" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder={t('store.searchLocation') || 'Search location...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit" disabled={searchLoading}>
                        {searchLoading ? '...' : (t('store.searchBtn') || 'Search')}
                    </button>
                </form>

                <MapContainer
                    center={[pos.lat, pos.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <ChangeView center={pos} zoom={13} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Other Zones as Reference */}
                    {otherZones.map((z, idx) => (
                        (z.lat && z.lng && z.radius) && (
                            <Circle
                                key={`other-${idx}`}
                                center={[z.lat, z.lng]}
                                radius={z.radius}
                                pathOptions={{
                                    fillColor: '#64748b',
                                    color: '#64748b',
                                    fillOpacity: 0.1,
                                    dashArray: '5, 10'
                                }}
                            />
                        )
                    ))}

                    <LocationMarker
                        position={pos}
                        setPosition={(p) => {
                            setPos(p);
                            handleUpdate(p, rad);
                        }}
                    />
                    <Circle
                        center={[pos.lat, pos.lng]}
                        radius={rad}
                        pathOptions={{
                            fillColor: '#A62B82',
                            color: '#A62B82',
                            fillOpacity: 0.2
                        }}
                    />
                </MapContainer>
            </div>

            <div className="map-controls">
                <div className="control-group">
                    <label>{t('store.zoneRadius')} (متر)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="range"
                            min="100"
                            max="50000"
                            step="100"
                            value={rad}
                            onChange={(e) => {
                                const r = parseInt(e.target.value);
                                setRad(r);
                                handleUpdate(pos, r);
                            }}
                            className="radius-slider"
                        />
                        <span className="radius-value">{rad} {t('store.meters')}</span>
                    </div>
                </div>

                <div className="control-group">
                    <label>{t('store.coordinates')}</label>
                    <div className="coords-display">
                        {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
                    </div>
                </div>
            </div>

            <p className="map-helper">
                {t('store.mapClickHelper') || 'اضغط على الخريطة لتحديد مركز منطقة التوصيل'}
            </p>
        </div>
    );
};

export default ZoneMap;
