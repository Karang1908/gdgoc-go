using UnityEngine;
using UnityEngine.UI;
using TMPro;
using GDGGo.Core;
using GDGGo.Audio;

namespace GDGGo.UI
{
    /// <summary>
    /// Car selection screen — shows 3–4 cars the player can pick (visual only at MVP;
    /// no stat differences). The available cars come from prefabs the integrator builds
    /// using the Quaternius / Kenney car packs. Selection is persisted in
    /// <c>PlayerPrefs</c> as a string identifier.
    /// </summary>
    public sealed class CarSelectScreen : MonoBehaviour
    {
        [System.Serializable]
        public struct CarEntry
        {
            public string id;       // e.g. "SportsCar", "SUV", "Taxi"
            public GameObject prefabOrThumbnail;  // 3D preview spawn or sprite thumbnail; assign in prefab
            public Button selectionButton;
        }

        public CarEntry[] cars;
        public Button startGameButton;
        public Button backButton;

        public TMP_Text selectionNameLabel;

        // PlayerPrefs key — read by the Game scene spawner to choose which player-car prefab to load.
        public const string PlayerPrefsKey = "GDGGo.SelectedCar";

        private string _selectedCarId;

        private void Awake()
        {
            foreach (var entry in cars)
            {
                if (entry.selectionButton != null)
                {
                    var local = entry;  // capture for closure
                    entry.selectionButton.onClick.AddListener(() => OnPickCar(local.id));
                }
            }
            if (startGameButton) startGameButton.onClick.AddListener(OnStart);
            if (backButton)      backButton.onClick.AddListener(OnBack);

            // Restore last selection.
            _selectedCarId = PlayerPrefs.GetString(PlayerPrefsKey, cars.Length > 0 ? cars[0].id : string.Empty);
        }

        private void OnEnable()
        {
            UpdateNameLabel();
            if (selectionNameLabel)
                selectionNameLabel.text = "Currently selected: " + _selectedCarId;
        }

        private void OnPickCar(string id)
        {
            AudioManager.Instance?.PlayClick();
            _selectedCarId = id;
            PlayerPrefs.SetString(PlayerPrefsKey, id);
            PlayerPrefs.Save();
            UpdateNameLabel();
        }

        private void OnStart()
        {
            AudioManager.Instance?.PlayClick();
            GameManager.Instance?.LoadGame();
        }

        private void OnBack()
        {
            AudioManager.Instance?.PlayClick();
            GameManager.Instance?.LoadMenu();
        }

        private void UpdateNameLabel()
        {
            if (selectionNameLabel) selectionNameLabel.text = "Selected: " + _selectedCarId;
        }
    }
}
