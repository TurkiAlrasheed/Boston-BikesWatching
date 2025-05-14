import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoidHVya2ktYWxyYXNoZWVkIiwiYSI6ImNtYWxsajBnazBhdHgya29lcTcxNWFnem4ifQ.VTfjEEBrx4p2gWahIa5BxA';

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
    // Step 3: Fetch Bluebikes Station JSON
try {
  // Step 4.1: Fetch Bluebikes Traffic CSV

    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
  
    // Await JSON fetch
    const jsonData = await d3.json(jsonurl);
    console.log('Loaded JSON Data:', jsonData); // Verify structure
    
    // Access the nested station array
    let stations = jsonData.data.stations;
    console.log('Stations Array:', stations); // Verify stations

        // Step 4.1: Importing Bluebikes traffic data
    try {
      const trafficUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
      const trips = await d3.csv(trafficUrl);
      console.log('Loaded traffic data:', trips);
      console.log('Example trip:', trips[0]); // to verify structure
    } catch (error) {
      console.error('Error loading traffic CSV:', error);
    }
  

console.log('Enriched stations with traffic:', stations);
    const circles = svg
  .selectAll('circle')
  .data(stations)
  .enter()
  .append('circle')
  .attr('r', 5) // Radius of the circle
  .attr('fill', 'steelblue') // Circle fill color
  .attr('stroke', 'white') // Circle border color
  .attr('stroke-width', 1) // Circle border thickness
  .attr('opacity', 0.8); // Circle opacity
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
  } catch (error) {
    console.error('Error loading JSON:', error); // Error handling
  }
  });


  
