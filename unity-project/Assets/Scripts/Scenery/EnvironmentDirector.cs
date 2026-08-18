using UnityEngine;

namespace GDGGo.Scenery
{
    /// <summary>
    /// Drives dynamic time-of-day and weather transitions (Sunny City -> Sunset -> Cyberpunk Night -> Rain Storm)
    /// based on distance travelled, giving GDG Go the evolving visual thrill of AAA arcade runners.
    /// </summary>
    public sealed class EnvironmentDirector : MonoBehaviour
    {
        public static EnvironmentDirector Instance { get; private set; }

        public enum BiomeType
        {
            SunnyDay = 0,
            GoldenSunset = 1,
            CyberpunkNight = 2,
            RainyStorm = 3
        }

        [Header("Biome Cycling")]
        [Tooltip("Distance in metres per biome cycle.")]
        public float biomeDistance = 800f;

        [Header("Sun / Directional Light")]
        public Light sunLight;

        [Header("Rain FX")]
        public ParticleSystem rainFX;

        public BiomeType CurrentBiome { get; private set; } = BiomeType.SunnyDay;

        private float _lightningTimer = 0f;
        private float _baseSunIntensity = 1.15f;

        // Biome visual profiles
        private struct BiomeProfile
        {
            public Color sunColor;
            public float sunIntensity;
            public Vector3 sunRotation;
            public Color ambientSky;
            public Color ambientEquator;
            public Color ambientGround;
            public Color fogColor;
            public float fogStart;
            public float fogEnd;
            public bool hasRain;
        }

        private BiomeProfile _sunny = new BiomeProfile
        {
            sunColor = new Color(1f, 0.97f, 0.91f),
            sunIntensity = 1.15f,
            sunRotation = new Vector3(48f, -28f, 0f),
            ambientSky = new Color(0.76f, 0.70f, 0.56f),
            ambientEquator = new Color(0.52f, 0.46f, 0.36f),
            ambientGround = new Color(0.20f, 0.16f, 0.13f),
            fogColor = new Color(0.86f, 0.80f, 0.66f),
            fogStart = 200f,
            fogEnd = 315f,
            hasRain = false
        };

        private BiomeProfile _sunset = new BiomeProfile
        {
            sunColor = new Color(1f, 0.55f, 0.22f), // Golden Coral Sunset
            sunIntensity = 1.35f,
            sunRotation = new Vector3(18f, -42f, 0f), // Low sun angle
            ambientSky = new Color(0.72f, 0.32f, 0.45f), // Rich Magenta Sunset Sky
            ambientEquator = new Color(0.60f, 0.35f, 0.22f),
            ambientGround = new Color(0.18f, 0.10f, 0.08f),
            fogColor = new Color(0.88f, 0.42f, 0.30f),
            fogStart = 175f,
            fogEnd = 295f,
            hasRain = false
        };

        private BiomeProfile _cyberpunk = new BiomeProfile
        {
            sunColor = new Color(0.12f, 0.85f, 1f), // Neon Cyan Moonlight & Streetglow
            sunIntensity = 0.82f,
            sunRotation = new Vector3(65f, 120f, 0f),
            ambientSky = new Color(0.18f, 0.06f, 0.35f), // Deep Midnight Purple
            ambientEquator = new Color(0.08f, 0.16f, 0.30f), // Neon Blue ambient
            ambientGround = new Color(0.04f, 0.03f, 0.08f),
            fogColor = new Color(0.09f, 0.05f, 0.20f), // Midnight haze
            fogStart = 150f,
            fogEnd = 275f,
            hasRain = false
        };

        private BiomeProfile _rainStorm = new BiomeProfile
        {
            sunColor = new Color(0.35f, 0.55f, 0.70f), // Dim Stormy Slate
            sunIntensity = 0.65f,
            sunRotation = new Vector3(45f, -30f, 0f),
            ambientSky = new Color(0.15f, 0.22f, 0.32f),
            ambientEquator = new Color(0.12f, 0.16f, 0.22f),
            ambientGround = new Color(0.06f, 0.08f, 0.12f),
            fogColor = new Color(0.12f, 0.18f, 0.25f), // Rain mist fog
            fogStart = 130f,
            fogEnd = 250f,
            hasRain = true
        };

        private void Awake()
        {
            Instance = this;
            if (sunLight == null)
            {
                var lightObj = GameObject.Find("Directional Light");
                if (lightObj != null) sunLight = lightObj.GetComponent<Light>();
            }

            BuildRainFX();
        }

        private void BuildRainFX()
        {
            if (rainFX != null) return;

            var rainGo = new GameObject("RainParticleSystem");
            rainGo.transform.SetParent(transform, false);
            rainGo.transform.position = new Vector3(0f, 14f, 10f);
            rainGo.transform.rotation = Quaternion.Euler(75f, 0f, 0f);

            rainFX = rainGo.AddComponent<ParticleSystem>();
            var main = rainFX.main;
            main.maxParticles = 300;
            main.startSpeed = new ParticleSystem.MinMaxCurve(26f, 38f);
            main.startSize = new ParticleSystem.MinMaxCurve(0.04f, 0.08f);
            main.startLifetime = 0.45f;
            main.startColor = new Color(0.85f, 0.93f, 1f, 0.25f);
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission = rainFX.emission;
            emission.rateOverTime = 180f;

            var shape = rainFX.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(20f, 26f, 1f);

            var renderer = rainGo.GetComponent<ParticleSystemRenderer>();
            renderer.renderMode = ParticleSystemRenderMode.Stretch;
            renderer.velocityScale = 0.12f;
            renderer.lengthScale = 2.2f;

            var particleShader = Shader.Find("Sprites/Default") 
                ?? Shader.Find("Legacy Shaders/Particles/Alpha Blended Premultiply") 
                ?? Shader.Find("Mobile/Particles/Additive");
            if (particleShader != null)
            {
                var rainMat = new Material(particleShader);
                rainMat.name = "RainParticleMat";
                rainMat.color = new Color(0.85f, 0.93f, 1f, 0.30f);
                renderer.material = rainMat;
            }

            rainFX.Stop();
        }

        private void Update()
        {
            var session = Core.GameSession.Instance;
            float dist = session != null ? session.DistanceMeters : 0f;

            // Total cycle length: 4 biomes * biomeDistance
            float cyclePos = (dist % (biomeDistance * 4f)) / biomeDistance;
            int fromIndex = Mathf.FloorToInt(cyclePos) % 4;
            int toIndex = (fromIndex + 1) % 4;
            float t = cyclePos - Mathf.Floor(cyclePos);

            // Smooth ease transition
            t = Mathf.SmoothStep(0f, 1f, t);

            BiomeProfile from = GetProfile((BiomeType)fromIndex);
            BiomeProfile to = GetProfile((BiomeType)toIndex);

            CurrentBiome = (BiomeType)fromIndex;

            // Blend lighting
            if (sunLight != null)
            {
                sunLight.color = Color.Lerp(from.sunColor, to.sunColor, t);
                _baseSunIntensity = Mathf.Lerp(from.sunIntensity, to.sunIntensity, t);
                sunLight.intensity = _baseSunIntensity;

                Quaternion rotFrom = Quaternion.Euler(from.sunRotation);
                Quaternion rotTo = Quaternion.Euler(to.sunRotation);
                sunLight.transform.rotation = Quaternion.Slerp(rotFrom, rotTo, t);
            }

            // Blend ambient
            RenderSettings.ambientSkyColor = Color.Lerp(from.ambientSky, to.ambientSky, t);
            RenderSettings.ambientEquatorColor = Color.Lerp(from.ambientEquator, to.ambientEquator, t);
            RenderSettings.ambientGroundColor = Color.Lerp(from.ambientGround, to.ambientGround, t);

            // Blend fog
            RenderSettings.fogColor = Color.Lerp(from.fogColor, to.fogColor, t);
            RenderSettings.fogStartDistance = Mathf.Lerp(from.fogStart, to.fogStart, t);
            RenderSettings.fogEndDistance = Mathf.Lerp(from.fogEnd, to.fogEnd, t);

            // Rain particle control
            bool shouldRain = (CurrentBiome == BiomeType.RainyStorm) || (toIndex == 3 && t > 0.4f);
            if (rainFX != null)
            {
                if (shouldRain && !rainFX.isPlaying) rainFX.Play();
                else if (!shouldRain && rainFX.isPlaying) rainFX.Stop();

                // Move rain with player camera
                if (Camera.main != null)
                {
                    Vector3 camPos = Camera.main.transform.position;
                    rainFX.transform.position = new Vector3(0f, camPos.y + 8f, camPos.z + 12f);
                }
            }

            // Storm lightning flash
            if (CurrentBiome == BiomeType.RainyStorm && sunLight != null)
            {
                _lightningTimer -= Time.deltaTime;
                if (_lightningTimer <= 0f)
                {
                    _lightningTimer = Random.Range(3.5f, 8f);
                    StartCoroutine(LightningFlash());
                }
            }
        }

        private System.Collections.IEnumerator LightningFlash()
        {
            if (sunLight == null) yield break;
            sunLight.intensity = 2.4f;
            yield return new WaitForSeconds(0.06f);
            sunLight.intensity = _baseSunIntensity;
            yield return new WaitForSeconds(0.04f);
            sunLight.intensity = 2.0f;
            yield return new WaitForSeconds(0.08f);
            sunLight.intensity = _baseSunIntensity;
        }

        private BiomeProfile GetProfile(BiomeType type)
        {
            switch (type)
            {
                case BiomeType.GoldenSunset: return _sunset;
                case BiomeType.CyberpunkNight: return _cyberpunk;
                case BiomeType.RainyStorm: return _rainStorm;
                case BiomeType.SunnyDay:
                default: return _sunny;
            }
        }
    }
}
