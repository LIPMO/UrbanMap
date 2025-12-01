mapboxgl.accessToken = 'pk.eyJ1IjoiY2hhcmxlc2JhZXJ0IiwiYSI6ImNtYzY2Y2Q1YTBibG4yanM2c29oYnRjczYifQ.ldeqUPrH69_SpOtiF9uo-w';
const socket = io(window.location.origin);

const login = document.getElementById("login");
const hud = document.getElementById("hud");
const speedSpan = document.getElementById("speed");
const vmaxSpan = document.getElementById("vmax");

let map, marker;
let lastPos = null;
let vmax = Number(localStorage.getItem("vmax")) || 0;
let userColor;

/* -------- COLOR BY USER -------- */
function colorFromPseudo(pseudo) {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) {
    hash = pseudo.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 80%, 60%)`;
}

/* -------- START -------- */
function start() {
  let pseudo = document.getElementById("pseudoInput").value || localStorage.getItem("pseudo");
  if (!pseudo) return alert("Pseudo obligatoire");

  localStorage.setItem("pseudo", pseudo);

  userColor = colorFromPseudo(pseudo);
  document.documentElement.style.setProperty("--user-color", userColor);

  login.style.display = "none";
  hud.style.display = "flex";

  initMap();
}

if (localStorage.getItem("pseudo")) start();

/* -------- MAP -------- */
function initMap(){
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    zoom: 16
  });

  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    let speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;

    if (speed > 200) speed = 0;
    if (speed > 120) speed = 120;

    if (speed > vmax){
      vmax = speed;
      localStorage.setItem("vmax", vmax);
    }

    speedSpan.textContent = speed;
    vmaxSpan.textContent = vmax;

    if (!marker){
      marker = new mapboxgl.Marker({ color: userColor })
        .setLngLat([lon, lat])
        .addTo(map);

      map.setCenter([lon, lat]);
    } else {
      marker.setLngLat([lon, lat]);
    }

    lastPos = { lat, lon };

    socket.emit("update", { lat, lon, speed, vmax, color: userColor });

  },
  () => alert("GPS désactivé"),
  { enableHighAccuracy: true });
}

socket.emit("join", {
  pseudo: localStorage.getItem("pseudo"),
  vmax,
  color: userColor
});

/* -------- OTHER RIDERS -------- */
const riders = {};
const MAX_DISTANCE_KM = 5;

socket.on("users", data => {
  if (!map || !lastPos) return;

  Object.keys(riders).forEach(id => {
    if (!data[id]) {
      riders[id].marker.remove();
      riders[id].card.remove();
      delete riders[id];
    }
  });

  Object.keys(data).forEach(id => {
    if (!data[id].lat || !data[id].lon) return;

    const dist = getDistance(lastPos.lat, lastPos.lon, data[id].lat, data[id].lon);
    if (dist > MAX_DISTANCE_KM) {
      if (riders[id]) {
        riders[id].marker.remove();
        riders[id].card.remove();
        delete riders[id];
      }
      return;
    }

    const color = data[id].color || "orange";

    const cardContent = `
      <div class="user-card">
        <b>${data[id].pseudo}</b><br>
        ${data[id].speed} km/h<br>
        Vmax ${data[id].vmax}
      </div>
    `;

    if (!riders[id]) {
      const el = document.createElement('div');
      el.className = 'user-dot';
      el.style.background = color;
      el.style.color = color;

      const card = new mapboxgl.Marker({ offset: [0,-40] })
        .setLngLat([data[id].lon, data[id].lat])
        .setPopup(new mapboxgl.Popup({ closeButton:false, closeOnClick:false }).setHTML(cardContent))
        .addTo(map);

      card.togglePopup();

      riders[id] = {
        marker: new mapboxgl.Marker(el)
          .setLngLat([data[id].lon, data[id].lat])
          .addTo(map),
        card
      };
    } else {
      riders[id].marker.setLngLat([data[id].lon, data[id].lat]);
      riders[id].card
        .setLngLat([data[id].lon, data[id].lat])
        .getPopup().setHTML(cardContent);
    }
  });
});

/* -------- DISTANCE -------- */
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2)**2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
