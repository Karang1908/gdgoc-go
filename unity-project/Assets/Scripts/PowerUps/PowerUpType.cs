namespace GDGGo.PowerUps
{
    /// <summary>
    /// Subway Surfers-equivalent power-ups (PROJECT.md §5.6).
    /// MVP ships with CoinMagnet + Nitro; the rest are code-complete but
    /// spawn-disabled until stretch.
    /// </summary>
    public enum PowerUpType
    {
        CoinMagnet,    // MVP — pulls coins within ~3 lanes toward the car
        TwoX,          // stretch — doubles coin + distance score
        Shield,        // stretch — absorbs one crash
        Nitro,         // MVP — +50% speed, invulnerable, widens police gap
        PoliceFreeze   // stretch — police heat frozen for N seconds
    }
}
