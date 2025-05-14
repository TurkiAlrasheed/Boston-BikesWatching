import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoidHVya2ktYWxyYXNoZWVkIiwiYSI6ImNtYWxsajBnazBhdHgya29lcTcxNWFnem4ifQ.VTfjEEBrx4p2gWahIa5BxA';
// Format minutes to HH:MM AM/PM
function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}
const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id
  );

  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}
// Global time filter variable
let timeFilter = -1;
// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});
function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point); // Project to pixel coordinates
    return { cx: x, cy: y }; // Return as object for use in SVG attributes
  }
  function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
  }
  function filterTripsbyTime(trips, timeFilter) {
    return timeFilter === -1
      ? trips
      : trips.filter((trip) => {
          const startedMinutes = minutesSinceMidnight(trip.started_at);
          const endedMinutes = minutesSinceMidnight(trip.ended_at);
  
          return (
            Math.abs(startedMinutes - timeFilter) <= 60 ||
            Math.abs(endedMinutes - timeFilter) <= 60
          );
        });
  }
// Wait until the map is fully loaded
map.on('load', async () => {
    const svg = d3.select('#map').select('svg');
    const cam_bikeLaneStyle = {
        'line-color': '#1f78b4',  // Bright green
        'line-width': 3,
        'line-opacity': 0.6
      };
    // Add the GeoJSON data source for Boston's existing bike network
    map.addSource('boston_route', {
      type: 'geojson',
      data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
    });
  
    // Add a layer to visualize the bike lanes
    map.addLayer({
      id: 'bike-lanes',
      type: 'line',
      source: 'boston_route',
      paint: {
        'line-color': '#32D400',
        'line-width': 3,
        'line-opacity': 0.6,
      },
    });
    // Cambridge bike lanes
    map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
    });

    map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: cam_bikeLaneStyle
    });
try {

    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  
    const jsonData = await d3.json(jsonurl);
    
    let stations = jsonData.data.stations;

    
      let trips = await d3.csv(
        'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
        (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
        },
    );
     
    stations = computeStationTraffic(stations, trips);
    
    const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, d => d.totalTraffic)])
    .range([0, 25]);

    console.log(d3.extent(stations, d => d.totalTraffic));
    const circles = svg
  .selectAll('circle')
  .data(stations, d => d.short_name)  // ✅ Use short_name as the key
  .enter()
  .append('circle')
  .attr('r', d => radiusScale(d.totalTraffic))
  .attr('stroke', 'white')
  .attr('stroke-width', 1)
  .attr('opacity', 0.8)
  .on('mouseover', function (event, d) {
    d3.select('#tooltip')
      .style('display', 'block')
      .html(`
        <strong>${d.totalTraffic}</strong> trips<br>
        ${d.departures} departures<br>
        ${d.arrivals} arrivals
      `);
  })
  .on('mousemove', function (event) {
    d3.select('#tooltip')
      .style('left', (event.pageX + 12) + 'px')
      .style('top', (event.pageY - 28) + 'px');
  })
  .on('mouseout', function () {
    d3.select('#tooltip').style('display', 'none');
  }).style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic));

  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx)
      .attr('cy', (d) => getCoords(d).cy);
  }

  // Initial draw
  updatePositions();
  // Update on map changes
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');
  function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);
  
    if (timeFilter === -1) {
      selectedTime.textContent = '';         // Clear formatted time
      anyTimeLabel.style.display = 'block';  // Show (any time)
    } else {
      selectedTime.textContent = formatTime(timeFilter); // Show formatted time
      anyTimeLabel.style.display = 'none';   // Hide (any time)
    }
  
    // You can trigger filtering here, e.g.:
    updateScatterPlot(timeFilter);
  }
  function updateScatterPlot(timeFilter) {
    const filteredTrips = filterTripsbyTime(trips, timeFilter);
    const filteredStations = computeStationTraffic(stations, filteredTrips);
  
    // Optionally scale differently if filtering
    timeFilter === -1
      ? radiusScale.range([0, 25])
      : radiusScale.range([3, 50]);
  
    // Update circles
    timeFilter === -1
    ? radiusScale.range([0, 25])
    : radiusScale.range([3, 50]);
  
  circles
    .data(filteredStations, d => d.short_name)  // ✅ Use key for efficient join
    .join('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .style('--departure-ratio', d => stationFlow(d.departures / d.totalTraffic));
    
  }
  
  // Bind event listener to update on slider input
  timeSlider.addEventListener('input', updateTimeDisplay);
  
  // Initial display on load
  updateTimeDisplay();
  
  } catch (error) {
    console.error('Error loading JSON:', error); // Error handling
  }
  
  });


  
