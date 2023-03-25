export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoiamltbXlrdiIsImEiOiJjbGRnZDZvZzEwNGZhM29sMXk1anpjOXN1In0.Fgdw3qSvjBPC0LkzoLY2xQ';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    scrollZoom: false,
    /* center: [-118.11349134, 34.111745],
  zoom: 4,
  interactive:false */
  });
  //zelimo da zumiramo mapu u odnosu na lokaciju ture
  const bounds = new mapboxgl.LngLatBounds();
  //pravimo marker po lokacijama iz dataseta
  locations.forEach((loc) => {
    //Create   marker
    const el = document.createElement('div');
    el.className = 'marker';
    //add Marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);
    //Add popup

    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);
    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
