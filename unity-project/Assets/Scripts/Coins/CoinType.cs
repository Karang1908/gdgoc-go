namespace GDGGo.Coins
{
    /// <summary>
    /// The five coin variants.
    ///
    /// Red, Blue, Yellow and Green are the Google brand colours and exist purely as
    /// visual variety — all four are worth 1 point. The GDG pill is the rare one,
    /// worth 25, and uses the logo from <c>Branding/</c> as its albedo.
    ///
    /// All five share one mesh (Quaternius RPG <c>Coin.fbx</c>, single "Gold" material
    /// slot); only the material differs.
    /// </summary>
    public enum CoinType
    {
        Red,        // Google red    — 1 pt
        Blue,       // Google blue   — 1 pt
        Yellow,     // Google yellow — 1 pt
        Green,      // Google green  — 1 pt
        GDGPill,    // rare GDG logo — 25 pt
        Fuel        // refills the tank — worth no points, but the run ends without it
    }
}
