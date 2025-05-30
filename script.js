let scene, camera, renderer, earth, sunLight;
let currentTimeElement;
let brazilHours = 0;
let lastApiUpdate = 0; // timestamp da última atualização da API
let baseApiDate = null; // data/hora da última atualização da API
let baseApiTimestamp = 0; // timestamp local da última atualização da API

function init() {
  // Configuração Three.js
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const isMobile = window.innerWidth <= 768;
  const earthRadius = isMobile ? 2.0 : 3.5;

  const geometry = new THREE.SphereGeometry(earthRadius, 64, 64);
  const textureLoader = new THREE.TextureLoader();

  const dayTexture = textureLoader.load('textures/earth-day.jpg');
  const nightTexture = textureLoader.load('textures/earth-night.jpg');

  sunLight = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(sunLight);

  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayTexture;
      uniform sampler2D nightTexture;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;
          float diffuse = smoothstep(-0.2, 0.2, dot(vNormal, sunDirection));
          vec3 finalColor = mix(nightColor, dayColor, diffuse);
          gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });

  earth = new THREE.Mesh(geometry, earthMaterial);
  scene.add(earth);

  camera.position.set(4, -2, 6);
  camera.lookAt(earth.position);

  currentTimeElement = document.getElementById('current-time');
  window.addEventListener('resize', onWindowResize);

  // Exibe hora local de imediato (base inicial)
  showLocalTime();

  // Atualiza hora da API depois
  updateBrazilTimeFromAPI();

  animate();
}

function showLocalTime() {
  const now = new Date();
  
  // Ajusta para fuso horário de São Paulo (offset -3h ou -2h se horário de verão)
  // Para simplicidade, usa toLocaleString com timezone
  const spTime = now.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  currentTimeElement.textContent = spTime;

  // Atualiza brazilHours para rotação (hora decimal)
  const spDate = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  const h = spDate.getHours();
  const m = spDate.getMinutes();
  const s = spDate.getSeconds();
  brazilHours = h + m / 60 + s / 3600;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function updateBrazilTimeFromAPI() {
  try {
    const response = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo');

    if (!response.ok) throw new Error('Resposta inválida da API');

    const data = await response.json();

    if (!data.datetime) throw new Error('Data não encontrada na resposta da API');

    baseApiDate = new Date(data.datetime);
    baseApiTimestamp = Date.now();

    const h = baseApiDate.getHours();
    const m = baseApiDate.getMinutes();
    const s = baseApiDate.getSeconds();

    brazilHours = h + m / 60 + s / 3600;

    currentTimeElement.textContent = baseApiDate.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    lastApiUpdate = Date.now();
  } catch (error) {
    console.error('Erro ao buscar hora do Brasil:', error);
    // Continua mostrando a hora local até API funcionar
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = Date.now();

  // Atualiza API a cada 60s
  if (now - lastApiUpdate > 60000) {
    updateBrazilTimeFromAPI();
  }

  if (baseApiDate) {
    const elapsedMs = now - baseApiTimestamp;
    const currentDate = new Date(baseApiDate.getTime() + elapsedMs);

    currentTimeElement.textContent = currentDate.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const h = currentDate.getHours();
    const m = currentDate.getMinutes();
    const s = currentDate.getSeconds();
    brazilHours = h + m / 60 + s / 3600;
  } else {
    // Enquanto não tem dados da API, continua atualizando a hora local
    showLocalTime();
  }

  // Rotação da sombra
  const speedFactor = 1.3;
  const longitude = -46.6;
  const hoursToRadians = (brazilHours / 24) * Math.PI * 2;
  const longitudeOffset = (longitude / 360) * Math.PI * 2;
  const textureRotationOffset = Math.PI / 2;

  const angle = hoursToRadians * speedFactor + longitudeOffset + textureRotationOffset;

  const radius = 10;
  const lightX = Math.cos(angle) * radius;
  const lightZ = Math.sin(angle) * radius;

  sunLight.position.set(lightX, 0, lightZ);
  sunLight.position.normalize();

  const sunDir = new THREE.Vector3().copy(sunLight.position).negate();
  earth.material.uniforms.sunDirection.value.copy(sunDir);

  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
  init();
});

