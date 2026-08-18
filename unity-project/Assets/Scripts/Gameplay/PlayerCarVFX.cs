using UnityEngine;
using GDGGo.Core;

namespace GDGGo.Gameplay
{
    /// <summary>
    /// AAA Arcade visual effects & power-up auras for the player car:
    /// - Holographic Particle Energy Fields (Shield, Magnet, 2X, Nitro, Freeze)
    /// - Dynamic Neon Underglow casting vibrant colored illumination on the asphalt
    /// - 3 Orbiting Sci-Fi Shield Satellites with smooth geometric rotation
    /// - Swirling Golden Electromagnetic Vortex for Magnet
    /// - Emerald Energy Helix & Radiant Sparkles for 2X
    /// - Supersonic Dual Cyan Exhaust Flames for Nitro
    /// - Fire Rocket Booster Jump Thrusters under the chassis
    /// - High-Speed Aerodynamic Wind Tunnel Lines
    /// </summary>
    [RequireComponent(typeof(PlayerCar))]
    public sealed class PlayerCarVFX : MonoBehaviour
    {
        private PlayerCar _car;
        private GameSession _session;

        // Dynamic Neon Underglow Light
        private Light _underglowLight;

        // Shield Energy VFX
        private GameObject _shieldRoot;
        private ParticleSystem _shieldParticleField;
        private ParticleSystem _shieldElectricArcs;
        private Transform[] _shieldSatellites;

        // Magnet Energy VFX
        private GameObject _magnetRoot;
        private ParticleSystem _magnetVortexPS;
        private ParticleSystem _magnetSparksPS;

        // 2X Multiplier Energy VFX
        private GameObject _twoXRoot;
        private ParticleSystem _twoXSparklesPS;
        private ParticleSystem _twoXRingsPS;

        // Nitro Boost Energy VFX
        private GameObject _nitroRoot;
        private ParticleSystem _nitroFlamesPS;
        private ParticleSystem _speedLinesPS;

        // Police Freeze VFX
        private GameObject _freezeRoot;
        private ParticleSystem _freezeMistPS;

        // Jump Fire Rocket Boosters
        private GameObject _jumpBoostersRoot;
        private ParticleSystem _jumpFirePS;
        private Light _jumpFlameLight;
        private Transform[] _nozzleFlames;

        private void Awake()
        {
            _car = GetComponent<PlayerCar>();

            CreateNeonUnderglow();
            CreateShieldVFX();
            CreateMagnetVFX();
            CreateTwoXVFX();
            CreateNitroVFX();
            CreateFreezeVFX();
            CreateJumpRocketBoosters();
            CreateSpeedLines();
        }

        private void Start()
        {
            _session = GameSession.Instance;
        }

        // ============================================================
        // 1. Neon Ground Underglow System
        // ============================================================

        private void CreateNeonUnderglow()
        {
            var lightGo = new GameObject("VFX_NeonUnderglowLight");
            lightGo.transform.SetParent(transform, false);
            lightGo.transform.localPosition = new Vector3(0f, -0.15f, 0f);

            _underglowLight = lightGo.AddComponent<Light>();
            _underglowLight.type = LightType.Point;
            _underglowLight.range = 7.5f;
            _underglowLight.intensity = 0f;
            _underglowLight.color = Color.cyan;
        }

        // ============================================================
        // 2. Shield Holographic Forcefield & Satellites
        // ============================================================

        private void CreateShieldVFX()
        {
            _shieldRoot = new GameObject("VFX_ShieldRoot");
            _shieldRoot.transform.SetParent(transform, false);
            _shieldRoot.transform.localPosition = new Vector3(0f, 0.4f, 0f);

            // 1. Smooth Spherical Particle Forcefield Halo
            var psGo = new GameObject("ShieldHalo");
            psGo.transform.SetParent(_shieldRoot.transform, false);
            _shieldParticleField = psGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_shieldParticleField, false);

            var main = _shieldParticleField.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0f, 0.85f, 1f, 0.55f), new Color(0.3f, 0.6f, 1f, 0.35f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.45f, 0.85f);
            main.startSpeed = 0.5f;
            main.startLifetime = 0.5f;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;

            var emission = _shieldParticleField.emission;
            emission.rateOverTime = 65f;

            var shape = _shieldParticleField.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 2.1f;

            // 2. Electric Arcs dancing around perimeter
            var arcsGo = new GameObject("ShieldElectricArcs");
            arcsGo.transform.SetParent(_shieldRoot.transform, false);
            _shieldElectricArcs = arcsGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_shieldElectricArcs, true);

            var aMain = _shieldElectricArcs.main;
            aMain.startColor = new Color(0.4f, 0.95f, 1f, 0.9f);
            aMain.startSize = new ParticleSystem.MinMaxCurve(0.18f, 0.35f);
            aMain.startSpeed = new ParticleSystem.MinMaxCurve(1.5f, 3.5f);
            aMain.startLifetime = 0.25f;
            aMain.simulationSpace = ParticleSystemSimulationSpace.Local;

            var aEmission = _shieldElectricArcs.emission;
            aEmission.rateOverTime = 40f;

            var aShape = _shieldElectricArcs.shape;
            aShape.shapeType = ParticleSystemShapeType.Circle;
            aShape.radius = 1.9f;

            // 3. Orbiting Sci-Fi Defense Satellites
            int satCount = 3;
            _shieldSatellites = new Transform[satCount];
            Material satMat = CreateAdditiveMaterial(new Color(0f, 0.9f, 1f, 0.95f), new Color(0f, 0.85f, 1f) * 4f);

            for (int i = 0; i < satCount; i++)
            {
                var sat = GameObject.CreatePrimitive(PrimitiveType.Cube);
                sat.name = $"ShieldDrone_{i}";
                sat.transform.SetParent(_shieldRoot.transform, false);
                sat.transform.localScale = new Vector3(0.20f, 0.20f, 0.20f);

                var col = sat.GetComponent<Collider>();
                if (col != null) Destroy(col);

                var rend = sat.GetComponent<Renderer>();
                if (rend != null) rend.material = satMat;

                _shieldSatellites[i] = sat.transform;
            }

            _shieldRoot.SetActive(false);
        }

        // ============================================================
        // 3. Golden Electromagnetic Vortex (Magnet)
        // ============================================================

        private void CreateMagnetVFX()
        {
            _magnetRoot = new GameObject("VFX_MagnetRoot");
            _magnetRoot.transform.SetParent(transform, false);
            _magnetRoot.transform.localPosition = new Vector3(0f, 0.35f, 0.6f);

            // Inward Spiral Particle Vortex
            var vortexGo = new GameObject("MagnetVortex");
            vortexGo.transform.SetParent(_magnetRoot.transform, false);
            _magnetVortexPS = vortexGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_magnetVortexPS, true);

            var main = _magnetVortexPS.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.85f, 0.1f, 0.95f), new Color(1f, 0.65f, 0f, 0.75f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.2f, 0.45f);
            main.startSpeed = -4.5f; // Pulls inward toward magnetic core
            main.startLifetime = 0.42f;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;

            var emission = _magnetVortexPS.emission;
            emission.rateOverTime = 55f;

            var shape = _magnetVortexPS.shape;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius = 2.3f;

            // Electric Magnetic Sparks
            var sparksGo = new GameObject("MagnetSparks");
            sparksGo.transform.SetParent(_magnetRoot.transform, false);
            _magnetSparksPS = sparksGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_magnetSparksPS, true);

            var sMain = _magnetSparksPS.main;
            sMain.startColor = new Color(1f, 0.95f, 0.3f, 0.95f);
            sMain.startSize = 0.18f;
            sMain.startSpeed = 3.0f;
            sMain.startLifetime = 0.3f;
            sMain.simulationSpace = ParticleSystemSimulationSpace.Local;

            var sEmission = _magnetSparksPS.emission;
            sEmission.rateOverTime = 30f;

            var sShape = _magnetSparksPS.shape;
            sShape.shapeType = ParticleSystemShapeType.Box;
            sShape.scale = new Vector3(1.8f, 0.6f, 2.8f);

            _magnetRoot.SetActive(false);
        }

        // ============================================================
        // 4. Emerald Radiance & Rising Helix (2X Multiplier)
        // ============================================================

        private void CreateTwoXVFX()
        {
            _twoXRoot = new GameObject("VFX_TwoXRoot");
            _twoXRoot.transform.SetParent(transform, false);
            _twoXRoot.transform.localPosition = new Vector3(0f, 0.2f, 0f);

            // Upward Sparkling Stars
            var sparksGo = new GameObject("TwoXSparkles");
            sparksGo.transform.SetParent(_twoXRoot.transform, false);
            _twoXSparklesPS = sparksGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_twoXSparklesPS, true);

            var main = _twoXSparklesPS.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.2f, 1f, 0.45f, 0.95f), new Color(1f, 0.9f, 0.2f, 0.95f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.22f, 0.5f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(2.5f, 5.0f);
            main.startLifetime = 0.6f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission = _twoXSparklesPS.emission;
            emission.rateOverTime = 45f;

            var shape = _twoXSparklesPS.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(1.9f, 0.3f, 3.2f);
            shape.rotation = new Vector3(-90f, 0f, 0f); // Float upward

            // Expanding Emerald Ring Pulses
            var ringsGo = new GameObject("TwoXRings");
            ringsGo.transform.SetParent(_twoXRoot.transform, false);
            _twoXRingsPS = ringsGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_twoXRingsPS, true);

            var rMain = _twoXRingsPS.main;
            rMain.startColor = new Color(0.1f, 0.95f, 0.4f, 0.6f);
            rMain.startSize = 1.2f;
            rMain.startSpeed = 1.5f;
            rMain.startLifetime = 0.4f;
            rMain.simulationSpace = ParticleSystemSimulationSpace.Local;

            var rEmission = _twoXRingsPS.emission;
            rEmission.rateOverTime = 12f;

            var rShape = _twoXRingsPS.shape;
            rShape.shapeType = ParticleSystemShapeType.Circle;
            rShape.radius = 1.2f;

            _twoXRoot.SetActive(false);
        }

        // ============================================================
        // 5. Supersonic Blue Jet Flames (Nitro Boost)
        // ============================================================

        private void CreateNitroVFX()
        {
            _nitroRoot = new GameObject("VFX_NitroRoot");
            _nitroRoot.transform.SetParent(transform, false);
            _nitroRoot.transform.localPosition = new Vector3(0f, 0.28f, -1.35f);

            var psGo = new GameObject("NitroJetFlames");
            psGo.transform.SetParent(_nitroRoot.transform, false);
            _nitroFlamesPS = psGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_nitroFlamesPS, true);

            var main = _nitroFlamesPS.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.2f, 0.95f, 1f, 1f), new Color(0f, 0.45f, 1f, 0.85f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.35f, 0.7f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(-24f, -38f);
            main.startLifetime = 0.20f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission = _nitroFlamesPS.emission;
            emission.rateOverTime = 95f;

            var shape = _nitroFlamesPS.shape;
            shape.shapeType = ParticleSystemShapeType.Cone;
            shape.angle = 6f;
            shape.radius = 0.35f;

            _nitroRoot.SetActive(false);
        }

        // ============================================================
        // 6. Glacial Sub-Zero Frost (Police Freeze)
        // ============================================================

        private void CreateFreezeVFX()
        {
            _freezeRoot = new GameObject("VFX_FreezeRoot");
            _freezeRoot.transform.SetParent(transform, false);
            _freezeRoot.transform.localPosition = new Vector3(0f, 0.3f, 0f);

            var psGo = new GameObject("FreezeFrostMist");
            psGo.transform.SetParent(_freezeRoot.transform, false);
            _freezeMistPS = psGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_freezeMistPS, true);

            var main = _freezeMistPS.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(0.6f, 0.85f, 1f, 0.6f), new Color(0.8f, 0.95f, 1f, 0.4f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.4f, 0.9f);
            main.startSpeed = 1.0f;
            main.startLifetime = 0.5f;
            main.simulationSpace = ParticleSystemSimulationSpace.Local;

            var emission = _freezeMistPS.emission;
            emission.rateOverTime = 40f;

            var shape = _freezeMistPS.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(2.2f, 0.6f, 3.6f);

            _freezeRoot.SetActive(false);
        }

        // ============================================================
        // 7. Jump Rocket Booster Thrusters
        // ============================================================

        private void CreateJumpRocketBoosters()
        {
            _jumpBoostersRoot = new GameObject("VFX_JumpBoostersRoot");
            _jumpBoostersRoot.transform.SetParent(transform, false);
            _jumpBoostersRoot.transform.localPosition = Vector3.zero;

            Vector3[] nozzlePositions = new Vector3[]
            {
                new Vector3(-0.68f, 0.08f,  1.15f),
                new Vector3( 0.68f, 0.08f,  1.15f),
                new Vector3(-0.68f, 0.08f, -1.15f),
                new Vector3( 0.68f, 0.08f, -1.15f)
            };

            _nozzleFlames = new Transform[nozzlePositions.Length];
            Material flameMat = CreateAdditiveMaterial(new Color(1f, 0.5f, 0.05f, 0.9f), new Color(1f, 0.4f, 0f) * 4f);
            Mesh coneMesh = CreateConeMesh(0.20f, 0.025f, 0.60f);

            for (int i = 0; i < nozzlePositions.Length; i++)
            {
                var flame = new GameObject($"JumpFlame_{i}");
                flame.transform.SetParent(_jumpBoostersRoot.transform, false);
                flame.transform.localPosition = nozzlePositions[i] + new Vector3(0f, -0.04f, 0f);

                var mf = flame.AddComponent<MeshFilter>();
                mf.sharedMesh = coneMesh;
                var mr = flame.AddComponent<MeshRenderer>();
                mr.material = flameMat;

                _nozzleFlames[i] = flame.transform;
            }

            // Downward Fire Sparks Particle System
            var psGo = new GameObject("JumpFirePS");
            psGo.transform.SetParent(_jumpBoostersRoot.transform, false);
            psGo.transform.localPosition = new Vector3(0f, 0.1f, 0f);

            _jumpFirePS = psGo.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_jumpFirePS, true);

            var main = _jumpFirePS.main;
            main.startColor = new ParticleSystem.MinMaxGradient(new Color(1f, 0.95f, 0.3f, 0.95f), new Color(1f, 0.25f, 0f, 0.95f));
            main.startSize = new ParticleSystem.MinMaxCurve(0.25f, 0.55f);
            main.startSpeed = new ParticleSystem.MinMaxCurve(10f, 18f);
            main.startLifetime = 0.28f;
            main.simulationSpace = ParticleSystemSimulationSpace.World;

            var emission = _jumpFirePS.emission;
            emission.rateOverTime = 110f;

            var shape = _jumpFirePS.shape;
            shape.shapeType = ParticleSystemShapeType.Box;
            shape.scale = new Vector3(1.6f, 0.1f, 2.6f);
            shape.rotation = new Vector3(90f, 0f, 0f);

            // Ground Underglow Light during Jump
            var lightGo = new GameObject("JumpFlameLight");
            lightGo.transform.SetParent(_jumpBoostersRoot.transform, false);
            lightGo.transform.localPosition = new Vector3(0f, -0.2f, 0f);

            _jumpFlameLight = lightGo.AddComponent<Light>();
            _jumpFlameLight.type = LightType.Point;
            _jumpFlameLight.color = new Color(1f, 0.52f, 0.08f);
            _jumpFlameLight.range = 10f;
            _jumpFlameLight.intensity = 3.5f;

            _jumpBoostersRoot.SetActive(false);
        }

        // ============================================================
        // 8. Dynamic Speed Lines
        // ============================================================

        private void CreateSpeedLines()
        {
            var root = new GameObject("SpeedLinesVFX");
            root.transform.SetParent(transform, false);
            root.transform.localPosition = new Vector3(0f, 1.4f, 6.0f);

            _speedLinesPS = root.AddComponent<ParticleSystem>();
            AssignParticleMaterial(_speedLinesPS, false);

            var main = _speedLinesPS.main;
            main.startLifetime = 0.22f;
            main.startSpeed = -48f;
            main.startSize = 0.13f;
            main.startColor = new Color(1f, 1f, 1f, 0.45f);
            main.simulationSpace = ParticleSystemSimulationSpace.Local;

            var emission = _speedLinesPS.emission;
            emission.rateOverTime = 0f;

            var shape = _speedLinesPS.shape;
            shape.shapeType = ParticleSystemShapeType.Circle;
            shape.radius = 4.5f;
        }

        // ============================================================
        // 9. Per-Frame Update & Animation
        // ============================================================

        private void Update()
        {
            if (_session == null) _session = GameSession.Instance;
            if (_session == null || !_session.IsRunning) return;

            float dt = Time.deltaTime;
            float time = Time.time;

            bool hasShield = _session.HasShield;
            bool hasMagnet = _session.HasMagnet;
            bool has2x = _session.Has2x;
            bool isBoosting = _car.IsBoosting;
            bool isFreeze = _session.PoliceFreezeActive;
            bool isJumping = _car.IsJumping;

            // 1. Shield VFX & Satellites
            if (_shieldRoot != null)
            {
                if (hasShield && !_shieldRoot.activeSelf) _shieldRoot.SetActive(true);
                else if (!hasShield && _shieldRoot.activeSelf) _shieldRoot.SetActive(false);

                if (hasShield && _shieldSatellites != null)
                {
                    float satRadius = 2.2f;
                    float satSpeed = 2.8f;
                    for (int i = 0; i < _shieldSatellites.Length; i++)
                    {
                        if (_shieldSatellites[i] == null) continue;
                        float angle = time * satSpeed + (i * Mathf.PI * 2f / _shieldSatellites.Length);
                        float sx = Mathf.Cos(angle) * (satRadius * 0.95f);
                        float sz = Mathf.Sin(angle) * (satRadius * 1.35f);
                        float sy = 0.25f + 0.12f * Mathf.Sin(time * 4f + i);
                        _shieldSatellites[i].localPosition = new Vector3(sx, sy, sz);
                        _shieldSatellites[i].Rotate(80f * dt, 110f * dt, 40f * dt, Space.Self);
                    }
                }
            }

            // 2. Magnet VFX
            if (_magnetRoot != null)
            {
                if (hasMagnet && !_magnetRoot.activeSelf) _magnetRoot.SetActive(true);
                else if (!hasMagnet && _magnetRoot.activeSelf) _magnetRoot.SetActive(false);
            }

            // 3. 2X Multiplier VFX
            if (_twoXRoot != null)
            {
                if (has2x && !_twoXRoot.activeSelf) _twoXRoot.SetActive(true);
                else if (!has2x && _twoXRoot.activeSelf) _twoXRoot.SetActive(false);
            }

            // 4. Nitro Boost VFX
            if (_nitroRoot != null)
            {
                if (isBoosting && !_nitroRoot.activeSelf) _nitroRoot.SetActive(true);
                else if (!isBoosting && _nitroRoot.activeSelf) _nitroRoot.SetActive(false);
            }

            // 5. Police Freeze VFX
            if (_freezeRoot != null)
            {
                if (isFreeze && !_freezeRoot.activeSelf) _freezeRoot.SetActive(true);
                else if (!isFreeze && _freezeRoot.activeSelf) _freezeRoot.SetActive(false);
            }

            // 6. Jump Thruster VFX
            if (_jumpBoostersRoot != null)
            {
                if (isJumping && !_jumpBoostersRoot.activeSelf) _jumpBoostersRoot.SetActive(true);
                else if (!isJumping && _jumpBoostersRoot.activeSelf) _jumpBoostersRoot.SetActive(false);

                if (isJumping && _nozzleFlames != null)
                {
                    float flicker = 1f + 0.25f * Mathf.Sin(time * 38f) + 0.15f * Mathf.Cos(time * 55f);
                    for (int i = 0; i < _nozzleFlames.Length; i++)
                    {
                        if (_nozzleFlames[i] != null)
                        {
                            _nozzleFlames[i].localScale = new Vector3(0.20f * flicker, 0.45f * flicker, 0.20f * flicker);
                        }
                    }
                }
            }

            // 7. Dynamic Neon Underglow Color & Intensity
            if (_underglowLight != null)
            {
                if (hasShield)
                {
                    _underglowLight.color = new Color(0f, 0.85f, 1f);
                    _underglowLight.intensity = 2.4f + 0.4f * Mathf.Sin(time * 6f);
                }
                else if (hasMagnet)
                {
                    _underglowLight.color = new Color(1f, 0.82f, 0.05f);
                    _underglowLight.intensity = 2.2f + 0.35f * Mathf.Sin(time * 8f);
                }
                else if (has2x)
                {
                    _underglowLight.color = new Color(0.1f, 0.95f, 0.35f);
                    _underglowLight.intensity = 2.4f + 0.4f * Mathf.Sin(time * 6f);
                }
                else if (isBoosting)
                {
                    _underglowLight.color = new Color(0.1f, 0.75f, 1f);
                    _underglowLight.intensity = 3.0f + 0.5f * Mathf.Sin(time * 12f);
                }
                else if (isFreeze)
                {
                    _underglowLight.color = new Color(0.6f, 0.8f, 1f);
                    _underglowLight.intensity = 2.0f;
                }
                else
                {
                    _underglowLight.intensity = Mathf.MoveTowards(_underglowLight.intensity, 0f, 6f * dt);
                }
            }

            // 8. Speed Lines
            if (_speedLinesPS != null)
            {
                var world = WorldScroller.Instance;
                float speed = world != null ? world.Speed : 16f;
                bool showSpeedLines = isBoosting || speed > 26f;

                var emission = _speedLinesPS.emission;
                emission.rateOverTime = showSpeedLines ? 60f : 0f;
            }
        }

        // ============================================================
        // Helpers
        // ============================================================

        private void AssignParticleMaterial(ParticleSystem ps, bool additive)
        {
            if (ps == null) return;
            var rend = ps.GetComponent<ParticleSystemRenderer>();
            if (rend == null) return;

            string shaderName = additive ? "Mobile/Particles/Additive" : "Sprites/Default";
            var shader = Shader.Find(shaderName)
                         ?? Shader.Find("Legacy Shaders/Particles/Additive")
                         ?? Shader.Find("Sprites/Default")
                         ?? Shader.Find("Standard");

            if (shader != null)
            {
                rend.material = new Material(shader);
            }
        }

        private Material CreateAdditiveMaterial(Color baseColor, Color emissionColor)
        {
            var shader = Shader.Find("Sprites/Default")
                         ?? Shader.Find("Unlit/Transparent")
                         ?? Shader.Find("Legacy Shaders/Transparent/Diffuse")
                         ?? Shader.Find("Standard");

            var mat = new Material(shader);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", baseColor);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", baseColor);

            mat.SetOverrideTag("RenderType", "Transparent");
            mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            mat.SetInt("_ZWrite", 0);
            mat.renderQueue = 3000;

            if (mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", emissionColor);
            }
            return mat;
        }

        private Mesh CreateConeMesh(float topRadius, float bottomRadius, float length, int segments = 12)
        {
            var mesh = new Mesh();
            var vertices = new Vector3[segments * 2 + 2];
            var triangles = new int[segments * 6 + segments * 3];

            int topCenterIdx = segments * 2;
            int bottomCenterIdx = segments * 2 + 1;
            vertices[topCenterIdx] = Vector3.zero;
            vertices[bottomCenterIdx] = new Vector3(0f, -length, 0f);

            for (int i = 0; i < segments; i++)
            {
                float angle = (float)i / segments * Mathf.PI * 2f;
                float cos = Mathf.Cos(angle);
                float sin = Mathf.Sin(angle);

                vertices[i] = new Vector3(cos * topRadius, 0f, sin * topRadius);
                vertices[segments + i] = new Vector3(cos * bottomRadius, -length, sin * bottomRadius);
            }

            int triIdx = 0;
            for (int i = 0; i < segments; i++)
            {
                int next = (i + 1) % segments;
                // Side Quad
                triangles[triIdx++] = i;
                triangles[triIdx++] = segments + i;
                triangles[triIdx++] = next;

                triangles[triIdx++] = next;
                triangles[triIdx++] = segments + i;
                triangles[triIdx++] = segments + next;

                // Bottom Cap
                triangles[triIdx++] = bottomCenterIdx;
                triangles[triIdx++] = segments + i;
                triangles[triIdx++] = segments + next;
            }

            mesh.vertices = vertices;
            mesh.triangles = triangles;
            mesh.RecalculateNormals();
            return mesh;
        }
    }
}
