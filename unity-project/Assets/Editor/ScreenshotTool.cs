using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace GDGGo.EditorTools
{
    public static class ScreenshotTool
    {
        private const string OutDir = "/Users/karangarg/Desktop/gdg-go/screenshots";

        [MenuItem("GDG Go/Take All Feature Screenshots", priority = 99)]
        public static string CaptureAllScreenshots()
        {
            Directory.CreateDirectory(OutDir);

            // Clean old screenshots
            foreach (var f in Directory.GetFiles(OutDir, "*.png"))
            {
                File.Delete(f);
            }

            // Force rebuild all prefabs and scene so crystal orbs & rings are freshly baked
            PrefabsBuilder.DeleteQuaterniusDerivedPrefabs();
            PrefabsBuilder.BuildAll();
            SceneBuilder.BuildGameScene();

            EditorSceneManager.OpenScene("Assets/Scenes/Game.unity");

            // Build temporary rich environment for screenshot capture
            var envRoot = new GameObject("ScreenshotEnvironment");
            var roadPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Road/Street_Straight.prefab");
            var buildingA = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Scenery/Scenery_skyscraper-skyscraper-a.prefab");
            var buildingB = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Scenery/Scenery_skyscraper-skyscraper-c.prefab");
            var treePrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Scenery/Prop_Tree.prefab");
            var lightPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Scenery/Prop_Streetlight.prefab");

            for (int z = -6; z <= 16; z++)
            {
                float zPos = z * 12f;
                if (roadPrefab != null)
                {
                    var road = Object.Instantiate(roadPrefab, envRoot.transform);
                    road.transform.position = new Vector3(0f, 0f, zPos);
                }
                if (buildingA != null && z % 2 == 0)
                {
                    var b1 = Object.Instantiate(buildingA, envRoot.transform);
                    b1.transform.position = new Vector3(-13f, 0f, zPos + 3f);
                    b1.transform.rotation = Quaternion.Euler(0f, 90f, 0f);
                }
                if (buildingB != null && z % 2 != 0)
                {
                    var b2 = Object.Instantiate(buildingB, envRoot.transform);
                    b2.transform.position = new Vector3(13f, 0f, zPos + 6f);
                    b2.transform.rotation = Quaternion.Euler(0f, -90f, 0f);
                }
                if (treePrefab != null)
                {
                    var t1 = Object.Instantiate(treePrefab, envRoot.transform);
                    t1.transform.position = new Vector3(-6.4f, 0f, zPos + 2f);
                    var t2 = Object.Instantiate(treePrefab, envRoot.transform);
                    t2.transform.position = new Vector3(6.4f, 0f, zPos + 8f);
                }
                if (lightPrefab != null && z % 2 == 0)
                {
                    var l1 = Object.Instantiate(lightPrefab, envRoot.transform);
                    l1.transform.position = new Vector3(-5.8f, 0f, zPos + 4f);
                    l1.transform.rotation = Quaternion.Euler(0f, 90f, 0f);
                }
            }

            var player = Object.FindObjectOfType<Gameplay.PlayerCar>();
            if (player == null)
            {
                Object.DestroyImmediate(envRoot);
                return "PlayerCar not found!";
            }

            // Create Capture Camera
            var camGo = new GameObject("ScreenshotCaptureCam");
            var cam = camGo.AddComponent<Camera>();
            cam.fieldOfView = 50f;
            cam.clearFlags = CameraClearFlags.Skybox;
            cam.nearClipPlane = 0.1f;

            GameObject BuildTempGlobe(string name, Color baseColor, Color emissionColor)
            {
                var root = new GameObject(name);
                root.transform.SetParent(player.transform, false);
                root.transform.localPosition = new Vector3(0f, 0.65f, 0f);

                var sphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                sphere.transform.SetParent(root.transform, false);
                sphere.transform.localScale = new Vector3(2.6f, 1.8f, 4.0f);
                Object.DestroyImmediate(sphere.GetComponent<Collider>());

                var sMat = MaterialLibrary.GetOrCreateTransparent(
                    $"{MaterialLibrary.WorldFolder}/VFX_{name}_Sphere.mat", baseColor, emissionColor);
                sphere.GetComponent<MeshRenderer>().sharedMaterial = sMat;

                CreateTempRing(root.transform, $"{name}_R1", new Vector3(3.2f, 0.04f, 3.2f), Quaternion.Euler(28f, 0f, 22f), emissionColor);
                CreateTempRing(root.transform, $"{name}_R2", new Vector3(3.0f, 0.04f, 3.4f), Quaternion.Euler(-32f, 45f, -18f), emissionColor);
                return root;
            }

            void CreateTempRing(Transform parent, string ringName, Vector3 scale, Quaternion rot, Color em)
            {
                var ring = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                ring.name = ringName;
                ring.transform.SetParent(parent, false);
                ring.transform.localScale = scale;
                ring.transform.localRotation = rot;
                Object.DestroyImmediate(ring.GetComponent<Collider>());
                var rMat = MaterialLibrary.GetOrCreateTransparent(
                    $"{MaterialLibrary.WorldFolder}/VFX_Ring_{ringName}.mat", new Color(em.r, em.g, em.b, 0.45f), em * 2.5f);
                ring.GetComponent<MeshRenderer>().sharedMaterial = rMat;
            }

            // ----------------------------------------------------
            // 1. Shield Globe Action Shot
            // ----------------------------------------------------
            var shield = BuildTempGlobe("ShieldGlobe", new Color(0f, 0.85f, 1f, 0.28f), new Color(0f, 0.7f, 1f) * 2.0f);
            camGo.transform.position = player.transform.position + new Vector3(-3.2f, 1.9f, -4.6f);
            camGo.transform.LookAt(player.transform.position + new Vector3(0f, 0.7f, 1.2f));
            Capture(cam, 1920, 1080, "01_shield_globe_action.png");
            Object.DestroyImmediate(shield);

            // ----------------------------------------------------
            // 2. Fire Rocket Booster Jump Action Shot
            // ----------------------------------------------------
            Vector3 origPos = player.transform.position;
            player.transform.position = origPos + Vector3.up * 2.2f;

            var jumpBoosters = new GameObject("TempJumpBoosters");
            jumpBoosters.transform.SetParent(player.transform, false);

            Vector3[] nozzles = new Vector3[]
            {
                new Vector3(-0.68f, 0.08f,  1.15f),
                new Vector3( 0.68f, 0.08f,  1.15f),
                new Vector3(-0.68f, 0.08f, -1.15f),
                new Vector3( 0.68f, 0.08f, -1.15f)
            };

            var outerFlameMat = MaterialLibrary.GetOrCreateTransparent(
                $"{MaterialLibrary.WorldFolder}/VFX_BoosterFlameOuter.mat", new Color(1f, 0.42f, 0.02f, 0.88f), new Color(1f, 0.32f, 0f) * 3.8f);
            var innerFlameMat = MaterialLibrary.GetOrCreateTransparent(
                $"{MaterialLibrary.WorldFolder}/VFX_BoosterFlameInner.mat", new Color(1f, 0.96f, 0.3f, 0.96f), new Color(1f, 0.92f, 0.35f) * 4.8f);
            var bellMat = MaterialLibrary.GetOrCreate(
                $"{MaterialLibrary.WorldFolder}/VFX_NozzleBell.mat", new Color(0.2f, 0.2f, 0.25f), 0.85f, 0.9f);

            Mesh outerCone = CreateConeMesh(0.22f, 0.03f, 0.68f);
            Mesh innerCone = CreateConeMesh(0.13f, 0.015f, 0.44f);

            foreach (var nPos in nozzles)
            {
                // Metal nozzle bell
                var bell = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                bell.transform.SetParent(jumpBoosters.transform, false);
                bell.transform.localPosition = nPos;
                bell.transform.localScale = new Vector3(0.26f, 0.06f, 0.26f);
                Object.DestroyImmediate(bell.GetComponent<Collider>());
                bell.GetComponent<MeshRenderer>().sharedMaterial = bellMat;

                // Outer flame plume
                var fOuter = new GameObject("FlameOuter");
                fOuter.transform.SetParent(jumpBoosters.transform, false);
                fOuter.transform.localPosition = nPos + new Vector3(0f, -0.04f, 0f);
                var mfO = fOuter.AddComponent<MeshFilter>();
                mfO.sharedMesh = outerCone;
                var mrO = fOuter.AddComponent<MeshRenderer>();
                mrO.sharedMaterial = outerFlameMat;

                // Inner core flame
                var fInner = new GameObject("FlameInner");
                fInner.transform.SetParent(jumpBoosters.transform, false);
                fInner.transform.localPosition = nPos + new Vector3(0f, -0.04f, 0f);
                var mfI = fInner.AddComponent<MeshFilter>();
                mfI.sharedMesh = innerCone;
                var mrI = fInner.AddComponent<MeshRenderer>();
                mrI.sharedMaterial = innerFlameMat;
            }

            var lightObj = new GameObject("TempJumpLight");
            lightObj.transform.SetParent(player.transform, false);
            lightObj.transform.localPosition = new Vector3(0f, -0.3f, 0f);
            var lightComp = lightObj.AddComponent<Light>();
            lightComp.type = LightType.Point;
            lightComp.color = new Color(1f, 0.55f, 0.08f);
            lightComp.range = 14f;
            lightComp.intensity = 4.5f;

            camGo.transform.position = player.transform.position + new Vector3(-2.8f, -0.5f, -3.2f);
            camGo.transform.LookAt(player.transform.position + new Vector3(0f, 0.2f, 0.5f));
            Capture(cam, 1920, 1080, "02_fire_booster_rocket_jump.png");

            player.transform.position = origPos;
            Object.DestroyImmediate(jumpBoosters);
            Object.DestroyImmediate(lightObj);

            // ----------------------------------------------------
            // 3. Magnet Powerup Globe Shot
            // ----------------------------------------------------
            var magnet = BuildTempGlobe("MagnetGlobe", new Color(1f, 0.82f, 0.05f, 0.28f), new Color(1f, 0.78f, 0f) * 2.0f);
            camGo.transform.position = player.transform.position + new Vector3(-3.2f, 1.9f, -4.6f);
            camGo.transform.LookAt(player.transform.position + new Vector3(0f, 0.7f, 1.2f));
            Capture(cam, 1920, 1080, "03_magnet_powerup_globe.png");
            Object.DestroyImmediate(magnet);

            // ----------------------------------------------------
            // 4. TwoX Multiplier Globe Shot
            // ----------------------------------------------------
            var twoX = BuildTempGlobe("TwoXGlobe", new Color(0.1f, 0.95f, 0.4f, 0.28f), new Color(0.05f, 1f, 0.35f) * 2.0f);
            camGo.transform.position = player.transform.position + new Vector3(-3.2f, 1.9f, -4.6f);
            camGo.transform.LookAt(player.transform.position + new Vector3(0f, 0.7f, 1.2f));
            Capture(cam, 1920, 1080, "04_twox_multiplier_globe.png");
            Object.DestroyImmediate(twoX);

            // ----------------------------------------------------
            // 5. In-World Powerups Crystal Orbs Lineup
            // ----------------------------------------------------
            var powerupPrefabs = new string[]
            {
                "Assets/Prefabs/PowerUps/PowerUp_Magnet.prefab",
                "Assets/Prefabs/PowerUps/PowerUp_Shield.prefab",
                "Assets/Prefabs/PowerUps/PowerUp_TwoX.prefab",
                "Assets/Prefabs/PowerUps/PowerUp_Nitro.prefab",
                "Assets/Prefabs/PowerUps/PowerUp_Freeze.prefab",
                "Assets/Prefabs/PowerUps/Fuel.prefab"
            };

            var lineup = new GameObject("PowerUpLineup");
            for (int i = 0; i < powerupPrefabs.Length; i++)
            {
                var p = AssetDatabase.LoadAssetAtPath<GameObject>(powerupPrefabs[i]);
                if (p != null)
                {
                    var inst = Object.Instantiate(p, lineup.transform);
                    inst.transform.position = new Vector3((i - 2.5f) * 2.4f, 1.3f, 14f);
                    inst.transform.rotation = Quaternion.Euler(15f, 30f, 0f);
                }
            }

            camGo.transform.position = new Vector3(0f, 2.0f, 4.8f);
            camGo.transform.LookAt(new Vector3(0f, 1.3f, 14f));
            Capture(cam, 1920, 1080, "05_powerups_crystal_lineup.png");
            Object.DestroyImmediate(lineup);

            // ----------------------------------------------------
            // 6. Traffic Lane Switching & Pedestrian Walking
            // ----------------------------------------------------
            var trafficCarPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Traffic/Traffic_Sedan.prefab");
            var pedPrefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Pedestrians/Ped_Male_Casual.prefab");

            var dynamicDemo = new GameObject("DynamicDemo");
            if (trafficCarPrefab != null)
            {
                var t1 = Object.Instantiate(trafficCarPrefab, dynamicDemo.transform);
                t1.transform.position = new Vector3(-1.2f, 0.35f, 12f);
                t1.transform.rotation = Quaternion.Euler(0f, 14f, 0f); // Steering into middle lane!
            }
            if (pedPrefab != null)
            {
                var p1 = Object.Instantiate(pedPrefab, dynamicDemo.transform);
                p1.transform.position = new Vector3(6.2f, 0.18f, 10f);
                p1.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
            }

            camGo.transform.position = new Vector3(0f, 2.8f, -2.0f);
            camGo.transform.LookAt(new Vector3(0f, 1.0f, 12f));
            Capture(cam, 1920, 1080, "06_traffic_and_pedestrian.png");
            Object.DestroyImmediate(dynamicDemo);

            // Clean up temporary environment and camera
            Object.DestroyImmediate(envRoot);
            Object.DestroyImmediate(camGo);

            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene());
            return "Successfully captured all 6 showcase screenshots to " + OutDir;
        }

        private static void Capture(Camera cam, int width, int height, string filename)
        {
            var rt = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32);
            cam.targetTexture = rt;
            cam.Render();
            RenderTexture.active = rt;

            var tex = new Texture2D(width, height, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, width, height), 0, 0);
            tex.Apply();

            byte[] bytes = tex.EncodeToPNG();
            File.WriteAllBytes(Path.Combine(OutDir, filename), bytes);

            cam.targetTexture = null;
            RenderTexture.active = null;
            Object.DestroyImmediate(rt);
            Object.DestroyImmediate(tex);
        }

        private static Mesh CreateConeMesh(float topRadius, float bottomRadius, float length, int segments = 12)
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
