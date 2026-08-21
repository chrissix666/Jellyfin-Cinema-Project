using MediaBrowser.Model.Plugins;

namespace JellyfinCinemaLoader;

/// <summary>
/// Bewusst leer gelassen -- diese erste Version speichert noch keine
/// eigenen Einstellungen server-seitig. Die Basisklasse allein reicht
/// aus, damit Jellyfin das Plugin ueberhaupt als vollstaendig erkennt;
/// eine spaetere Erweiterung (server-seitige Persistenz der Cinema-
/// Einstellungen) wuerde hier eigene Felder ergaenzen, ohne dass sich
/// sonst etwas am Plugin aendern muss.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
}
