mapboxgl.accessToken = 'REMPLACE_PAR_TA_CLE_MAPBOX'
const socket = io()

const login = document.getElementById("login")
const hud = document.getElementById("hud")
const speedSpan = document.getElementById("speed")
const vmaxSpan = document.getElementById("vmax")

let map, marker
let vmax = localStorage.getItem("vmax") || 0

function start() {
  let pseudo = document.getElementById("pseudoInput").value

  if (!pseudo) return alert("Pseudo obligatoire")

  localStorage.setItem("pseudo", pseudo)
  login.style.display = "none"
  hud.style.display = "block"

  initMap()
}

if (localStorage.getItem("pseudo")) start()

function initMap(){
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    zoom: 15
  })

  navigator.geolocation.watchPosition(pos => {

    const lat = pos.coords.latitude
    const lon = pos.coords.longitude
    let speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0

    if (speed > vmax){
      vmax = speed
      localStorage.setItem("vmax", vmax)
    }

    speedSpan.textContent = speed
    vmaxSpan.textContent = vmax

    if (!marker){
      marker = new mapboxgl.Marker({color:'deepskyblue'})
      .setLngLat([lon, lat])
      .addTo(map)
      map.setCenter([lon, lat])
    } else {
      marker.setLngLat([lon, lat])
    }

    socket.emit("update", {
      lat, lon, speed, vmax
    })

  },
  () => alert("GPS OFF"),
  { enableHighAccuracy: true })
}

// Transmission au serveur
socket.emit("join", {
  pseudo: localStorage.getItem("pseudo"),
  vmax
})

// Affichage des autres
const riders = {}

socket.on("users", data => {

  Object.keys(data).forEach(id => {

    if (!data[id].lat) return

    if (!riders[id]) {
      riders[id] = new mapboxgl.Marker({color:'orange'})
      .setLngLat([data[id].lon, data[id].lat])
      .setPopup(new mapboxgl.Popup().setHTML(
        `<b>${data[id].pseudo}</b><br>Vitesse: ${data[id].speed}<br>Vmax: ${data[id].vmax}`
      ))
      .addTo(map)
    } else {
      riders[id].setLngLat([data[id].lon, data[id].lat])
    }
  })
})
