namespace GDGGo
{
    /// <summary>
    /// Tag names used at runtime, in one place.
    ///
    /// These must exist in Project Settings &gt; Tags and Layers or Unity throws
    /// <c>UnityException: Tag is not defined</c> the first time one is assigned or
    /// compared. "Player" is a Unity built-in; <see cref="Obstacle"/> is not, and the
    /// editor setup pass registers it (see <c>ProjectSetup.EnsureTags</c>).
    /// </summary>
    public static class Tags
    {
        public const string Player = "Player";
        public const string Obstacle = "Obstacle";

        /// <summary>Every custom (non-built-in) tag the project needs registered.</summary>
        public static readonly string[] Custom = { Obstacle };
    }
}
