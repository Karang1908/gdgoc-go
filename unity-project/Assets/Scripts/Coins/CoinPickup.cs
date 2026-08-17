using UnityEngine;
using GDGGo.Core;

namespace GDGGo.Coins
{
    /// <summary>
    /// One coin. Spins, bobs, flies to the player while the magnet power-up is active,
    /// and reports itself to <see cref="GameSession"/> when collected.
    ///
    /// The mesh is the Quaternius RPG <c>Coin.fbx</c> for every variant — the five types
    /// differ only by material, which is what lets the coins be "original art" without
    /// any original mesh. The material is pushed in by the spawner rather than the coin
    /// holding all five, so each coin carries one reference instead of five.
    /// </summary>
    public sealed class CoinPickup : MonoBehaviour
    {
        [Header("Identity")]
        public CoinType coinType = CoinType.Red;
        public int coinValue = 1;

        [Header("Renderer")]
        [Tooltip("Renderer whose material is swapped per coin type. Found in children if unset.")]
        public MeshRenderer coinMeshRenderer;

        [Header("Motion")]
        [Tooltip("Spin speed around Y, degrees/sec.")]
        public float rotationSpeedDeg = 200f;

        [Tooltip("Vertical bob amplitude in world units. 0 disables the bob.")]
        public float bobAmplitude = 0.16f;
        public float bobFrequency = 1.8f;

        [Header("Magnet")]
        [Tooltip("Radius within which an active magnet starts pulling this coin.")]
        public float magnetRadius = 7f;
        [Tooltip("Speed the coin flies toward the player under the magnet.")]
        public float magnetSpeed = 18f;

        [Tooltip("Distance at which the coin counts as collected while being magneted. " +
                 "Needed because a coin flying at the player can outrun the trigger test.")]
        public float magnetCollectDistance = 0.8f;

        public bool IsGDGPill => coinType == CoinType.GDGPill;
        public bool IsFuel => coinType == CoinType.Fuel;

        private float _bobPhase;
        private float _baseY;
        private bool _collected;

        private void Awake()
        {
            if (coinMeshRenderer == null) coinMeshRenderer = GetComponentInChildren<MeshRenderer>(true);
            _bobPhase = Random.value * Mathf.PI * 2f;
        }

        private void Start()
        {
            // Captured after the spawner has positioned us. The bob is then applied as an
            // absolute offset from this height rather than a per-frame delta, which would
            // accumulate float error and let coins slowly sink or climb over a long run.
            _baseY = transform.position.y;
        }

        private void Update()
        {
            var session = GameSession.Instance;
            if (session != null && !session.IsRunning) return;

            transform.Rotate(0f, rotationSpeedDeg * Time.deltaTime, 0f, Space.World);

            if (session != null && session.HasMagnet) { ApplyMagnet(session); return; }

            if (bobAmplitude > 0f)
            {
                _bobPhase += Time.deltaTime * bobFrequency * Mathf.PI * 2f;
                Vector3 p = transform.position;
                p.y = _baseY + Mathf.Sin(_bobPhase) * bobAmplitude;
                transform.position = p;
            }
        }

        private void ApplyMagnet(GameSession session)
        {
            var player = Gameplay.PlayerCar.Current;
            if (player == null) return;

            Vector3 target = player.transform.position;
            Vector3 here = transform.position;

            float dx = target.x - here.x;
            float dy = target.y - here.y;
            float dz = target.z - here.z;
            float sqr = dx * dx + dy * dy + dz * dz;

            if (sqr > magnetRadius * magnetRadius) return;

            transform.position = Vector3.MoveTowards(here, target, magnetSpeed * Time.deltaTime);

            if (sqr <= magnetCollectDistance * magnetCollectDistance)
                Collect(session);
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other == null || !other.CompareTag(Tags.Player)) return;
            Collect(GameSession.Instance);
        }

        private void Collect(GameSession session)
        {
            if (_collected) return;
            if (session == null || !session.IsRunning) return;

            _collected = true;

            // Fuel is not scored — it buys distance instead, and AddFuel plays its own
            // sound. Routing it through OnCoinCollected would inflate the coin counter
            // and, worse, extend the combo, so a fuel can would silently act as a coin.
            if (IsFuel)
            {
                session.AddFuel();
                Destroy(gameObject);
                return;
            }

            session.OnCoinCollected(coinValue, IsGDGPill);

            var audio = Audio.AudioManager.Instance;
            if (audio != null)
            {
                if (IsGDGPill) audio.PlayPill();
                else audio.PlayCoin();
            }

            // The pill is the signature pickup, so it gets a burst instead of just
            // vanishing. A plain Destroy on the rarest object in the game wastes the
            // moment the whole drop-rate gate exists to create.
            if (IsGDGPill) SpawnCollectBurst();

            Destroy(gameObject);
        }

        /// <summary>
        /// A short expanding ring where the pill was collected.
        ///
        /// Built from the coin's own renderer rather than a particle system: the object is
        /// about to be destroyed, so the burst has to be an independent GameObject, and
        /// reusing the mesh keeps it to zero new assets and one extra draw call for well
        /// under a second.
        /// </summary>
        private void SpawnCollectBurst()
        {
            if (coinMeshRenderer == null) return;

            var burst = new GameObject("PillBurst");
            burst.transform.position = transform.position;
            burst.transform.rotation = transform.rotation;
            burst.transform.localScale = coinMeshRenderer.transform.lossyScale;

            var filter = coinMeshRenderer.GetComponent<MeshFilter>();
            if (filter == null || filter.sharedMesh == null) { Destroy(burst); return; }

            burst.AddComponent<MeshFilter>().sharedMesh = filter.sharedMesh;
            var renderer = burst.AddComponent<MeshRenderer>();
            renderer.sharedMaterial = coinMeshRenderer.sharedMaterial;
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;

            burst.AddComponent<PickupBurst>();
        }

        /// <summary>Assigns the material for this coin's type. Called by the spawner.</summary>
        public void ApplyMaterial(Material material)
        {
            if (material == null || coinMeshRenderer == null) return;
            coinMeshRenderer.sharedMaterial = material;
        }
    }
}
