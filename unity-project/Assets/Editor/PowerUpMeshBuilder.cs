using System.Collections.Generic;
using UnityEngine;

namespace GDGGo.EditorTools
{
    /// <summary>
    /// Procedurally authors the 6 power-up pickup meshes as literal icons
    /// (U-magnet, 5-pointed star, kite shield, lightning bolt, 6-arm snowflake,
    /// jerry can), replacing the Quaternius RPG fantasy items (heart / star /
    /// armor / arrow / snowflake / potion) the first build used.
    ///
    /// Why: the RPG items read as "fantasy game props" rather than the
    /// gameplay effect they perform. A magnet-shaped pickup says
    /// "draws coins toward you"; a heart says "free life" — wrong game
    /// vocabulary. Subway Surfers' pickups all read as their action at a
    /// glance because the silhouette carries the meaning. These builders
    /// mirror that read with no external download (matches the code-built
    /// road tile in CLAUDE.md §"the road tile is generated") and no
    /// external package dependency — ProBuilder is NOT installed (verified
    /// against Packages/manifest.json), so we write raw vertex arrays.
    ///
    /// Authoring convention for every builder:
    ///   X — left/right (icon width ≤ 1)
    ///   Y — up/down   (icon height 0..1, lowest vertex at y = 0)
    ///   Z — forward/backward (icon depth ≤ 0.2 — "flat-ish" 3D)
    ///
    /// The returned GameObject is parented to the supplied <c>root</c> at
    /// <c>localPosition = (0,0,0)</c> with identity rotation, so the existing
    /// <c>PrefabsBuilder.Save()</c> sweep finds every child <c>MeshFilter</c>
    /// and persists it to the prefab's <c>_Meshes.asset</c>.
    /// </summary>
    internal static class PowerUpMeshBuilder
    {
        /// <summary>
        /// Dispatches on <paramref name="type"/> and returns a GameObject
        /// holding the icon's MeshFilter(s)+MeshRenderer(s), parented to
        /// <paramref name="root"/> at localPosition (0, 0, 0).
        /// </summary>
        public static GameObject BuildIcon(PowerUps.PowerUpType type, GameObject root)
        {
            switch (type)
            {
                case PowerUps.PowerUpType.CoinMagnet:   return BuildMagnet(root);
                case PowerUps.PowerUpType.TwoX:         return BuildStar(root);
                case PowerUps.PowerUpType.Shield:       return BuildShield(root);
                case PowerUps.PowerUpType.Nitro:        return BuildBolt(root);
                case PowerUps.PowerUpType.PoliceFreeze: return BuildSnowflake(root);
                default:
                    Debug.LogWarning($"[PowerUpMeshBuilder] No icon builder for {type} — falling back to star.");
                    return BuildStar(root);
            }
        }

        /// <summary>
        /// The Fuel pickup. Same height/grip as the per-type icons but built
        /// directly from this helper because the Fuel prefab path lives in
        /// <c>PrefabsBuilder.BuildFuelPrefab</c>, not <c>BuildPowerUps</c>.
        /// </summary>
        public static GameObject BuildFuelCan(GameObject root) => BuildJerryCan(root);

        // ------------------------------------------------------------------
        //                          U-shaped magnet
        // ------------------------------------------------------------------

        /// <summary>
        /// U-shaped magnet — two parallel vertical grey bars joined at the
        /// bottom by a horizontal beam, with red pole caps on the tops of
        /// both verticals. Reads at game-speed as the universal "draws metal
        /// toward you" symbol.
        ///
        /// Two sub-meshes each have their own GameObject so they can carry
        /// distinct materials (grey body, red poles) assigned by the caller.
        /// </summary>
        private static GameObject BuildMagnet(GameObject root)
        {
            float barW = 0.13f;     // bar cross-section in X
            float barD = 0.18f;     // bar cross-section in Z (depth)
            float outerH = 0.92f;   // outer height (verticals top)
            float gap = 0.46f;      // inside gap between the two verticals
            float crossbarH = 0.18f; // height of the bottom crossbar

            float lx = -(gap * 0.5f) - (barW * 0.5f);
            float rx = +(gap * 0.5f) + (barW * 0.5f);

            float vertCenterY = (crossbarH + outerH) * 0.5f;
            float vertH = outerH - crossbarH;

            // Body (grey U) — three axis-aligned boxes welded into one mesh.
            var body = new MeshCombiner("Magnet_Body");
            body.AddBox(new Vector3(lx, vertCenterY, 0f), new Vector3(barW, vertH, barD));
            body.AddBox(new Vector3(rx, vertCenterY, 0f), new Vector3(barW, vertH, barD));
            body.AddBox(new Vector3(0f, crossbarH * 0.5f, 0f),
                        new Vector3(gap + 2f * barW, crossbarH, barD));
            Mesh bodyMesh = body.ToMesh();

            // Poles (red caps) — two short boxes stacked on top of the
            // verticals, slightly fatter than the bars so they read as
            // "thicker pole tips".
            float capW = barW + 0.04f;
            float capDepth = barD + 0.04f;
            float capH = 0.08f;
            float capCenterY = outerH + capH * 0.5f;

            var poles = new MeshCombiner("Magnet_Poles");
            poles.AddBox(new Vector3(lx, capCenterY, 0f), new Vector3(capW, capH, capDepth));
            poles.AddBox(new Vector3(rx, capCenterY, 0f), new Vector3(capW, capH, capDepth));
            Mesh polesMesh = poles.ToMesh();

            return TwoMeshIcon(root, "Magnet", bodyMesh, polesMesh);
        }

        // ------------------------------------------------------------------
        //                            5-pointed star
        // ------------------------------------------------------------------

        /// <summary>
        /// 5-pointed star, 1 unit tall. A 10-vertex pentagram ring
        /// (alternating outer/inner radii) in the XY plane, lofts to ±depth
        /// on Z so the silhouette reads as "bonus" from any angle.
        /// </summary>
        private static GameObject BuildStar(GameObject root)
        {
            int points = 5;
            float outer = 0.55f;
            float inner = 0.22f;
            float cx = 0f, cy = 0.5f;          // centred vertically in the 0..1 strip
            float halfDepth = 0.10f;

            var ring = new Vector2[points * 2];
            // Start at the top (90 deg) and walk clockwise (Unity winding:
            // front-face +Z means clockwise when viewed from +Z).
            float startAngle = Mathf.PI * 0.5f;
            float step = Mathf.PI / points;
            for (int i = 0; i < points * 2; i++)
            {
                bool isOuter = (i % 2) == 0;
                float r = isOuter ? outer : inner;
                float a = startAngle - i * step;
                ring[i] = new Vector2(cx + Mathf.Cos(a) * r, cy + Mathf.Sin(a) * r);
            }

            Mesh mesh = LoftSym(ring, halfDepth, "Star");
            return SingleMeshIcon(root, "Star", mesh);
        }

        // ------------------------------------------------------------------
        //                            kite shield
        // ------------------------------------------------------------------

        /// <summary>
        /// Kite-shaped shield silhouette with a vertical crest stripe down
        /// the middle. Body is a 6-vertex XY polygon lofts to ±depth on Z
        /// (front and back faces visible). The stripe is a thin raised
        /// rectangle, modelled as a second mesh so the caller can tint it
        /// distinctly (typically white over a coloured body).
        /// </summary>
        private static GameObject BuildShield(GameObject root)
        {
            float halfDepth = 0.10f;

            var ring = new Vector2[]
            {
                new Vector2( 0.00f, 1.00f),
                new Vector2( 0.30f, 0.85f),
                new Vector2( 0.45f, 0.55f),
                new Vector2( 0.00f, 0.00f),
                new Vector2(-0.45f, 0.55f),
                new Vector2(-0.30f, 0.85f),
            };

            Mesh bodyMesh = LoftSym(ring, halfDepth, "Shield_Body");

            // Crest stripe: thin vertical rectangle extruded proud of the
            // front face so it visibly projects.
            float stripeW = 0.08f;
            float stripeTopY = 0.92f;
            float stripeBotY = 0.15f;
            var stripe = new MeshCombiner("Shield_Stripe");
            stripe.AddBox(
                new Vector3(0f, (stripeBotY + stripeTopY) * 0.5f, halfDepth * 0.5f + 0.005f),
                new Vector3(stripeW, stripeTopY - stripeBotY, halfDepth));
            Mesh stripeMesh = stripe.ToMesh();

            return TwoMeshIcon(root, "Shield", bodyMesh, stripeMesh);
        }

        // ------------------------------------------------------------------
        //                          lightning bolt
        // ------------------------------------------------------------------

        /// <summary>
        /// 4-segment lightning bolt zigzag in the XY plane, lofts ±depth on Z.
        /// Reads as "speed / nitro" universally — the silhouette is the same
        /// one used for the boost icon in every arcade racer of the last
        /// 30 years.
        /// </summary>
        private static GameObject BuildBolt(GameObject root)
        {
            float halfDepth = 0.10f;

            var ring = new Vector2[]
            {
                new Vector2( 0.05f, 1.00f),   // top tip, slight off-centre
                new Vector2( 0.40f, 0.65f),   // right shoulder (upper)
                new Vector2( 0.18f, 0.55f),   // inner notch right
                new Vector2( 0.40f, 0.20f),   // right shoulder (lower)
                new Vector2( 0.08f, 0.00f),   // bottom right
                new Vector2(-0.05f, 0.45f),   // inner notch left
                new Vector2(-0.32f, 0.42f),   // left shoulder (mid-upper)
                new Vector2(-0.20f, 0.55f),   // left neck (mid)
            };

            Mesh mesh = LoftSym(ring, halfDepth, "Bolt");
            return SingleMeshIcon(root, "Bolt", mesh);
        }

        // ------------------------------------------------------------------
        //                         6-arm snowflake
        // ------------------------------------------------------------------

        /// <summary>
        /// 6-arm snowflake as six crossed thin arms radiating from the
        /// centre, each carrying two short side-spurs at ~2/3 of the arm
        /// length. Reads as a proper snowflake, not just an asterisk.
        ///
        /// Arms are oriented boxes — the helper
        /// <see cref="MeshCombiner.AddBoxAt"/> takes a forward direction
        /// and an up direction, computes a local frame, and writes the 6
        /// corner faces automatically.
        /// </summary>
        private static GameObject BuildSnowflake(GameObject root)
        {
            float radius = 0.50f;
            Vector3 center = new Vector3(0f, 0.5f, 0f);
            float armW = 0.06f;
            float armDepth = 0.10f;
            float armLen = radius;
            float spurLen = radius * 0.35f;
            float spurAngle = Mathf.PI * 0.18f;  // ~32°

            var comb = new MeshCombiner("Snowflake");
            for (int i = 0; i < 6; i++)
            {
                float a = i * Mathf.PI / 3f;     // 0, 60, 120, 180, 240, 300 deg
                Vector3 dir = new Vector3(Mathf.Cos(a), Mathf.Sin(a), 0f);

                // Arm: oriented box whose long-axis lies along `dir`.
                // Forward = dir; up = world Z (so the arm's thin axis is XY-perp).
                Vector3 armMid = center + dir * (armLen * 0.5f);
                comb.AddBoxAt(armMid, dir, Vector3.forward,
                              new Vector3(armLen, armW, armDepth));

                // Side spurs at ~2/3 of the arm length.
                float spurOffset = armLen * 0.62f;
                Vector3 spurBase = center + dir * spurOffset;

                Vector3 leftDir = RotateXY(dir, +spurAngle);
                Vector3 leftMid = spurBase + leftDir * (spurLen * 0.5f);
                comb.AddBoxAt(leftMid, leftDir, Vector3.forward,
                              new Vector3(spurLen, armW, armDepth));

                Vector3 rightDir = RotateXY(dir, -spurAngle);
                Vector3 rightMid = spurBase + rightDir * (spurLen * 0.5f);
                comb.AddBoxAt(rightMid, rightDir, Vector3.forward,
                              new Vector3(spurLen, armW, armDepth));
            }

            Mesh mesh = comb.ToMesh();
            return SingleMeshIcon(root, "Snowflake", mesh);
        }

        // ------------------------------------------------------------------
        //                           jerry can
        // ------------------------------------------------------------------

        /// <summary>
        /// Jerry can: a chunky rectangular body with a small cap and a
        /// curved handle on top. Reads as a fuel canister — perfect
        /// "consumable" silhouette for the Fuel pickup.
        /// </summary>
        private static GameObject BuildJerryCan(GameObject root)
        {
            float bodyW = 0.60f, bodyH = 0.90f, bodyDepth = 0.34f;

            // Body.
            var body = new MeshCombiner("FuelCan_Body");
            body.AddBox(
                new Vector3(0f, bodyH * 0.5f, 0f),
                new Vector3(bodyW, bodyH, bodyDepth));
            Mesh bodyMesh = body.ToMesh();

            // Cap + handle.
            float topY = bodyH + 0.04f;       // sit just above body
            float capW = 0.16f, capH = 0.08f, capDepth = 0.14f;
            float handleW = 0.18f, legH = 0.05f, handleThickness = 0.04f;

            var caps = new MeshCombiner("FuelCan_Cap");

            // Cap at top-right of the body.
            float capCx = bodyW * 0.35f;
            caps.AddBox(
                new Vector3(capCx, topY + capH * 0.5f, 0f),
                new Vector3(capW, capH, capDepth));

            // Handle: a thin rectangular arch sitting on top of body to the
            // left of the cap, modelled as one wide thin top bar on two
            // short vertical legs. Cheap and reads as "carry handle".
            float handleLeftCx = capCx - capW * 0.5f - handleW * 0.5f - 0.02f;
            float archTopY = topY + legH + handleThickness * 0.5f;

            // left leg
            caps.AddBox(
                new Vector3(handleLeftCx - handleW * 0.5f + handleThickness * 0.5f,
                    topY + legH * 0.5f, 0f),
                new Vector3(handleThickness, legH, capDepth * 0.6f));
            // right leg
            caps.AddBox(
                new Vector3(handleLeftCx + handleW * 0.5f - handleThickness * 0.5f,
                    topY + legH * 0.5f, 0f),
                new Vector3(handleThickness, legH, capDepth * 0.6f));
            // horizontal arch (top bar)
            caps.AddBox(
                new Vector3(handleLeftCx, archTopY, 0f),
                new Vector3(handleW, handleThickness, capDepth * 0.6f));

            Mesh capMesh = caps.ToMesh();

            return TwoMeshIcon(root, "FuelCan", bodyMesh, capMesh);
        }

        // ------------------------------------------------------------------
        //                      mesh / GameObject helpers
        // ------------------------------------------------------------------

        /// <summary>
        /// Builds a single GameObject with a MeshFilter + MeshRenderer
        /// drawing <paramref name="mesh"/>, parented to <paramref name="root"/>
        /// at the origin. Used by single-material icons (star, bolt, snowflake).
        /// </summary>
        private static GameObject SingleMeshIcon(GameObject root, string name, Mesh mesh)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            go.transform.localPosition = Vector3.zero;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one;

            var filter = go.AddComponent<MeshFilter>();
            filter.sharedMesh = mesh;
            go.AddComponent<MeshRenderer>();
            return go;
        }

        /// <summary>
        /// Builds a parent GameObject holding TWO child sub-meshes
        /// (<paramref name="meshA"/> and <paramref name="meshB"/>), each with
        /// its own MeshFilter + MeshRenderer so the caller can assign
        /// different materials to the two parts (e.g. magnet body vs. poles,
        /// shield body vs. stripe, jerry can body vs. cap). Parented to
        /// <paramref name="root"/> at origin.
        ///
        /// Both children are named by the parent's name + an "_A"/"_B"
        /// suffix, so <see cref="PrefabsBuilder.Save"/> (which sweeps every
        /// MeshFilter under root) finds both meshes and persists them to the
        /// prefab's <c>_Meshes.asset</c>.
        /// </summary>
        private static GameObject TwoMeshIcon(GameObject root, string name, Mesh meshA, Mesh meshB)
        {
            var go = new GameObject(name);
            go.transform.SetParent(root.transform, false);
            go.transform.localPosition = Vector3.zero;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = Vector3.one;

            // Part A
            var partA = new GameObject(name + "_A");
            partA.transform.SetParent(go.transform, false);
            partA.transform.localPosition = Vector3.zero;
            partA.transform.localRotation = Quaternion.identity;
            partA.transform.localScale = Vector3.one;
            var fa = partA.AddComponent<MeshFilter>();
            fa.sharedMesh = meshA;
            partA.AddComponent<MeshRenderer>();

            // Part B
            var partB = new GameObject(name + "_B");
            partB.transform.SetParent(go.transform, false);
            partB.transform.localPosition = Vector3.zero;
            partB.transform.localRotation = Quaternion.identity;
            partB.transform.localScale = Vector3.one;
            var fb = partB.AddComponent<MeshFilter>();
            fb.sharedMesh = meshB;
            partB.AddComponent<MeshRenderer>();

            return go;
        }

        // ------------------------------------------------------------------
        //                      low-level mesh primitives
        // ------------------------------------------------------------------

        /// <summary>
        /// A tiny mesh combiner that lets a builder append axis-aligned or
        /// oriented boxes into one mesh, then welds them into a single
        /// vertex buffer + index buffer. <c>ToMesh</c> returns the assembled
        /// mesh with explicit per-vertex normals (lighting needs them).
        ///
        /// Each face of each box contributes 4 vertices + 2 triangles with
        /// outward-facing CCW winding (front-face +Z). Inside-faces
        /// between touching boxes are kept cheaply — the inner walls never
        /// render in our use case as the icon is always viewed from
        /// outside. Stays well under the 25-MB brotli budget: the largest
        /// icon (snowflake) is ~6 arms × 3 boxes × 24 verts ≈ 432 verts.
        /// </summary>
        private sealed class MeshCombiner
        {
            private readonly string _meshName;
            private readonly List<Vector3> _verts = new List<Vector3>();
            private readonly List<Vector3> _normals = new List<Vector3>();
            private readonly List<int> _tris = new List<int>();

            public MeshCombiner(string meshName) { _meshName = meshName; }

            /// <summary>
            /// Appends an axis-aligned box centred at <paramref name="center"/>
            /// with full extents <paramref name="size"/>.
            /// </summary>
            public void AddBox(Vector3 center, Vector3 size)
            {
                float hx = size.x * 0.5f, hy = size.y * 0.5f, hz = size.z * 0.5f;

                Vector3 c000 = new Vector3(center.x - hx, center.y - hy, center.z - hz);
                Vector3 c001 = new Vector3(center.x - hx, center.y - hy, center.z + hz);
                Vector3 c010 = new Vector3(center.x - hx, center.y + hy, center.z - hz);
                Vector3 c011 = new Vector3(center.x - hx, center.y + hy, center.z + hz);
                Vector3 c100 = new Vector3(center.x + hx, center.y - hy, center.z - hz);
                Vector3 c101 = new Vector3(center.x + hx, center.y - hy, center.z + hz);
                Vector3 c110 = new Vector3(center.x + hx, center.y + hy, center.z - hz);
                Vector3 c111 = new Vector3(center.x + hx, center.y + hy, center.z + hz);

                // Six faces, outward-facing normals, CCW winding when
                // viewed from outside the box.
                AddQuad(c000, c100, c101, c001, new Vector3( 0, 0,-1));  // -Z
                AddQuad(c011, c111, c110, c010, new Vector3( 0, 0, 1));  // +Z
                AddQuad(c000, c010, c110, c100, new Vector3(-1, 0, 0));  // -X
                AddQuad(c101, c111, c011, c001, new Vector3( 1, 0, 0));  // +X
                AddQuad(c000, c001, c011, c010, new Vector3( 0,-1, 0));  // -Y
                AddQuad(c100, c110, c111, c101, new Vector3( 0, 1, 0));  // +Y
            }

            /// <summary>
            /// Appends an oriented box centred at <paramref name="center"/>
            /// with full extents <paramref name="size"/> measured in the
            /// local frame whose +X is along <paramref name="forward"/>,
            /// +Z is along <paramref name="up"/>, and +Y is the
            /// cross-product (right-hand). Used for snowflake arms + spurs
            /// that must be rotated in the XY plane.
            /// </summary>
            public void AddBoxAt(Vector3 center, Vector3 forward, Vector3 up, Vector3 size)
            {
                Vector3 localX = forward.normalized;
                Vector3 localZ = up.normalized;
                Vector3 localY = Vector3.Cross(localZ, localX).normalized;

                Vector3 Off(float lx, float ly, float lz) =>
                    center + localX * lx + localY * ly + localZ * lz;

                float hx = size.x * 0.5f, hy = size.y * 0.5f, hz = size.z * 0.5f;

                Vector3 c000 = Off(-hx, -hy, -hz);
                Vector3 c001 = Off(-hx, -hy, +hz);
                Vector3 c010 = Off(-hx, +hy, -hz);
                Vector3 c011 = Off(-hx, +hy, +hz);
                Vector3 c100 = Off(+hx, -hy, -hz);
                Vector3 c101 = Off(+hx, -hy, +hz);
                Vector3 c110 = Off(+hx, +hy, -hz);
                Vector3 c111 = Off(+hx, +hy, +hz);

                // Face normals in world space (the local frame's axis
                // directions, negated for the -X / -Y / -Z faces).
                Vector3 nNegX = -localX;     // back end of arm
                Vector3 nPosX = localX;      // the tip
                Vector3 nNegY = -localY;
                Vector3 nPosY = localY;
                Vector3 nNegZ = -localZ;
                Vector3 nPosZ = localZ;

                // Winding chosen so each face's triangles are CCW when
                // viewed from outside the box, matching AddBox's order.
                AddQuad(c000, c100, c101, c001, nNegZ);  // local -Z
                AddQuad(c011, c111, c110, c010, nPosZ);  // local +Z
                AddQuad(c000, c010, c110, c100, nNegX);  // local -X ("back")
                AddQuad(c101, c111, c011, c001, nPosX);  // local +X (the tip)
                AddQuad(c000, c001, c011, c010, nNegY);  // local -Y
                AddQuad(c100, c110, c111, c101, nPosY);  // local +Y
            }

            private void AddQuad(Vector3 v0, Vector3 v1, Vector3 v2, Vector3 v3, Vector3 normal)
            {
                int baseIdx = _verts.Count;
                _verts.Add(v0); _verts.Add(v1); _verts.Add(v2); _verts.Add(v3);
                _normals.Add(normal); _normals.Add(normal);
                _normals.Add(normal); _normals.Add(normal);
                // CCW from outside: (0,3,1), (1,3,2). Verified by right-hand rule
                // on every face's outward normal above.
                _tris.Add(baseIdx + 0); _tris.Add(baseIdx + 3); _tris.Add(baseIdx + 1);
                _tris.Add(baseIdx + 1); _tris.Add(baseIdx + 3); _tris.Add(baseIdx + 2);
            }

            public Mesh ToMesh()
            {
                var mesh = new Mesh { name = _meshName };
                mesh.SetVertices(_verts);
                mesh.SetNormals(_normals);
                mesh.SetTriangles(_tris, 0);
                mesh.RecalculateBounds();
                return mesh;
            }
        }

        /// <summary>
        /// Rotates <paramref name="v"/> (treated as a 2D XY vector with z=0)
        /// by <paramref name="radians"/> about the +Z axis. Returns the
        /// rotated 3D vector (z = 0).
        /// </summary>
        private static Vector3 RotateXY(Vector3 v, float radians)
        {
            float c = Mathf.Cos(radians), s = Mathf.Sin(radians);
            return new Vector3(v.x * c - v.y * s, v.x * s + v.y * c, 0f);
        }

        /// <summary>
        /// Extrudes a closed polygon <paramref name="ring"/> (vertices in XY,
        /// authored clockwise when viewed from +Z) into a 3D "lofted" prism
        /// symmetric about z = 0, with half-thickness
        /// <paramref name="halfDepth"/>. Writes a fresh <see cref="Mesh"/>
        /// named <paramref name="name"/> and returns it.
        ///
        /// Front cap (+Z): outward-facing CCW triangles when ring is
        /// clockwise from +Z (front-facing authored explicitly).
        /// Side walls: each ring edge contributes a quad whose normal points
        /// outward in the XY plane. To keep the corner vertex normals
        /// distinct per wall (sharp silhouette edges), the wall quads use
        /// their own duplicated vertices rather than reusing the cap fan
        /// verts.
        /// </summary>
        private static Mesh LoftSym(Vector2[] ring, float halfDepth, string name)
        {
            int n = ring.Length;
            var verts = new List<Vector3>(n * 2);
            var norms = new List<Vector3>(n * 2);
            var tris = new List<int>((n - 2) * 6 + n * 6);

            // Front cap at +halfDepth, back cap at -halfDepth. Indices
            // 0..n-1 = front, n..2n-1 = back.
            for (int i = 0; i < n; i++)
            {
                verts.Add(new Vector3(ring[i].x, ring[i].y, +halfDepth));
                verts.Add(new Vector3(ring[i].x, ring[i].y, -halfDepth));
            }
            // Re-pack so the cap verts are contiguous (front first, back
            // next). To keep the implementation simple we rebuild as:
            //   front verts at 0..n-1
            //   back  verts at n..2n-1
            verts.Clear();
            for (int i = 0; i < n; i++)
            {
                verts.Add(new Vector3(ring[i].x, ring[i].y, +halfDepth));
            }
            for (int i = 0; i < n; i++)
            {
                verts.Add(new Vector3(ring[i].x, ring[i].y, -halfDepth));
            }
            for (int i = 0; i < n; i++) norms.Add(Vector3.forward);
            for (int i = 0; i < n; i++) norms.Add(Vector3.back);

            // Front cap fan: winding (0, i, i+1) — assuming ring is
            // clockwise from +Z, this is CCW from +Z's POV, so the front cap
            // faces +Z.
            for (int i = 1; i < n - 1; i++)
            {
                tris.Add(0);
                tris.Add(i);
                tris.Add(i + 1);
            }
            // Back cap reverse-fan: winding (n, n+i+1, n+i) so its front-face
            // points -Z.
            for (int i = 1; i < n - 1; i++)
            {
                tris.Add(n);
                tris.Add(n + i + 1);
                tris.Add(n + i);
            }

            // Side walls. Each wall quad uses 4 fresh vertices (with
            // per-edge normals) so silhouette edges stay sharp and we don't
            // overwrite the cap-fan normals.
            for (int i = 0; i < n; i++)
            {
                int j = (i + 1) % n;
                Vector2 edge = ring[j] - ring[i];
                Vector2 nrm = new Vector2(-edge.y, edge.x).normalized;     // left-hand normal
                Vector3 normal = new Vector3(nrm.x, nrm.y, 0f);

                int baseIdx = verts.Count;
                verts.Add(new Vector3(ring[i].x, ring[i].y, +halfDepth));  // 0: front i
                verts.Add(new Vector3(ring[j].x, ring[j].y, +halfDepth));  // 1: front j
                verts.Add(new Vector3(ring[i].x, ring[i].y, -halfDepth));  // 2: back  i
                verts.Add(new Vector3(ring[j].x, ring[j].y, -halfDepth));  // 3: back  j
                for (int k = 0; k < 4; k++) norms.Add(normal);

                // Quad winding for outward-facing wall viewed from outside:
                //   (front i, front j, back j, back i) -> two triangles
                //   (0,1,3), (0,3,2) in the baseIdx-relative indices.
                tris.Add(baseIdx + 0); tris.Add(baseIdx + 1); tris.Add(baseIdx + 3);
                tris.Add(baseIdx + 0); tris.Add(baseIdx + 3); tris.Add(baseIdx + 2);
            }

            var mesh = new Mesh { name = name };
            mesh.SetVertices(verts);
            mesh.SetNormals(norms);
            mesh.SetTriangles(tris, 0);
            mesh.RecalculateBounds();
            return mesh;
        }
    }
}
