using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Loader;
using System.Text.RegularExpressions;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;
using Microsoft.Extensions.Logging;

namespace JellyfinCinemaLoader;

/// <summary>
/// Diese ganze Klasse hat GENAU EINE Aufgabe: beim Serverstart einen
/// &lt;script&gt;-Tag in die von Jellyfin ausgelieferte index.html
/// einschleusen, der auf die externe, feste Raw-URL des eigentlichen
/// Cinema-Skripts zeigt. Das Skript selbst liegt NICHT hier im Plugin
/// -- es wird bei jedem Seitenaufruf frisch vom Browser nachgeladen,
/// exakt wie bei jedem normalen &lt;script src="..."&gt;-Tag. Das
/// heisst: dieses Plugin muss praktisch nie wieder neu gebaut werden,
/// sobald es einmal installiert ist -- jede neue Version des
/// eigentlichen Cinema-Skripts wird automatisch beim naechsten Laden
/// von Jellyfin Web ausgeliefert, ganz ohne erneute Installation.
///
/// Bevorzugter Weg: registriert sich per Reflection beim separat
/// installierten "File Transformation"-Plugin (IAmParadox27) -- das
/// veraendert index.html nicht dauerhaft auf der Festplatte, sondern
/// klinkt sich nur beim Ausliefern ein. Ueberlebt Server-Updates,
/// keine Dateiberechtigungs-Probleme.
///
/// Rueckfallebene, falls "File Transformation" nicht installiert ist:
/// direktes, einmaliges Schreiben in die echte index.html-Datei auf
/// der Festplatte. Kann in manchen Docker-Aufbauten an fehlenden
/// Schreibrechten scheitern -- in dem Fall zeigt das Jellyfin-eigene
/// Server-Log genau, woran es liegt.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>
{
    // TODO: An die tatsaechliche Raw-URL des Cinema-Skripts anpassen,
    // falls sich Benutzername/Repository/Dateiname je aendern sollten.
    private const string ScriptUrl = "https://raw.githubusercontent.com/chrissix666/Jellyfin-Cinema-Project/refs/heads/main/Jellyfin-Cinema-Project.js";

    private const string InjectedScriptTag = "<script defer src=\"" + ScriptUrl + "\"></script>";

    // Fest vergebene, eindeutige Kennung dieses Plugins -- einmal
    // erzeugt, nie wieder aendern, sonst behandelt Jellyfin eine
    // spaetere Version als ein komplett ANDERES Plugin.
    public static readonly Guid PluginGuid = new("a6e6b7d2-2f6a-4c7e-9c1a-6d1e3f9b8a11");

    private readonly ILogger<Plugin> _logger;

    public Plugin(
        IApplicationPaths applicationPaths,
        IXmlSerializer xmlSerializer,
        ILogger<Plugin> logger)
        : base(applicationPaths, xmlSerializer)
    {
        _logger = logger;

        if (!TryRegisterWithFileTransformation())
        {
            _logger.LogInformation(
                "JellyfinCinemaLoader: 'File Transformation' Plugin nicht gefunden -- " +
                "fuehre stattdessen die direkte index.html-Injektion als Rueckfallebene aus.");
            TryDirectIndexHtmlInjection(applicationPaths);
        }
    }

    public override string Name => "Cinema Project";

    public override Guid Id => PluginGuid;

    public override string Description =>
        "Loads the Cinema Project script into Jellyfin Web.";

    /// <summary>
    /// Sucht per Reflection nach dem separat installierten "File
    /// Transformation"-Plugin und registriert dort eine Transformation,
    /// die den Skript-Tag beim Ausliefern von index.html einfuegt.
    /// Absichtlich per Reflection (nicht als feste Projekt-Abhaengigkeit)
    /// -- so funktioniert dieses Plugin auch bei jemandem, der "File
    /// Transformation" gar nicht installiert hat, statt beim Laden
    /// direkt mit einem fehlenden-Typ-Fehler abzustuerzen.
    /// </summary>
    private bool TryRegisterWithFileTransformation()
    {
        try
        {
            Assembly? fileTransformationAssembly = AssemblyLoadContext.All
                .SelectMany(ctx => ctx.Assemblies)
                .FirstOrDefault(asm => asm.FullName?.Contains(".FileTransformation", StringComparison.OrdinalIgnoreCase) ?? false);

            if (fileTransformationAssembly is null)
            {
                return false;
            }

            Type? pluginInterfaceType = fileTransformationAssembly.GetType("Jellyfin.Plugin.FileTransformation.PluginInterface");
            MethodInfo? registerMethod = pluginInterfaceType?.GetMethod("RegisterTransformation");

            if (registerMethod is null)
            {
                _logger.LogWarning(
                    "JellyfinCinemaLoader: 'File Transformation' Plugin gefunden, aber die erwartete " +
                    "RegisterTransformation-Methode fehlt -- vermutlich eine inkompatible Version.");
                return false;
            }

            var payload = Newtonsoft.Json.Linq.JObject.FromObject(new
            {
                id = PluginGuid,
                fileNamePattern = @"^index\.html$",
                callbackAssembly = typeof(Plugin).Assembly.FullName,
                callbackClass = typeof(IndexHtmlTransform).FullName,
                callbackMethod = nameof(IndexHtmlTransform.Transform),
            });

            registerMethod.Invoke(null, new object?[] { payload });
            _logger.LogInformation("JellyfinCinemaLoader: erfolgreich bei 'File Transformation' registriert.");
            return true;
        }
        catch (Exception ex)
        {
            // Absichtlich breit gefangen -- ein Fehler HIER darf niemals
            // den ganzen Jellyfin-Serverstart zum Absturz bringen, nur
            // weil ein optionales Begleit-Plugin unerwartet reagiert.
            _logger.LogWarning(ex, "JellyfinCinemaLoader: Registrierung bei 'File Transformation' fehlgeschlagen.");
            return false;
        }
    }

    /// <summary>
    /// Rueckfallebene ohne "File Transformation": sucht die echte,
    /// auf der Festplatte liegende index.html im Web-Ordner und fuegt
    /// den Skript-Tag einmalig direkt davor ein -- nur, wenn er nicht
    /// schon vorhanden ist (verhindert doppelte Injektion bei jedem
    /// Server-Neustart).
    /// </summary>
    private void TryDirectIndexHtmlInjection(IApplicationPaths applicationPaths)
    {
        try
        {
            // WebPath zeigt bei den allermeisten Installationen (Docker
            // wie auch native) direkt auf den Ordner, der index.html
            // enthaelt.
            string indexPath = Path.Combine(applicationPaths.WebPath, "index.html");

            if (!File.Exists(indexPath))
            {
                _logger.LogWarning("JellyfinCinemaLoader: index.html nicht gefunden unter {Path}.", indexPath);
                return;
            }

            string html = File.ReadAllText(indexPath);

            if (html.Contains(ScriptUrl, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("JellyfinCinemaLoader: Skript-Tag bereits vorhanden, keine erneute Injektion noetig.");
                return;
            }

            string patched = Regex.Replace(
                html,
                "</body>",
                InjectedScriptTag + "</body>",
                RegexOptions.IgnoreCase);

            File.WriteAllText(indexPath, patched);
            _logger.LogInformation("JellyfinCinemaLoader: index.html erfolgreich direkt gepatcht.");
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(
                ex,
                "JellyfinCinemaLoader: Keine Schreibrechte auf index.html. In Docker-Umgebungen hilft meist " +
                "die Installation des 'File Transformation'-Plugins als sauberer Weg ohne dieses Problem.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "JellyfinCinemaLoader: Direkte index.html-Injektion fehlgeschlagen.");
        }
    }

    /// <summary>
    /// Die eigentliche Transformations-Callback-Methode, die "File
    /// Transformation" bei jedem Ausliefern von index.html aufruft.
    /// Muss als eigene, oeffentliche statische Klasse/Methode
    /// existieren, da sie per Reflection (ueber Assembly/Klassen-/
    /// Methodenname als Text) aufgerufen wird, nicht per direktem
    /// Funktionsverweis.
    /// </summary>
    public static class IndexHtmlTransform
    {
        public static object Transform(object payload)
        {
            // The payload's exact runtime type isn't something we can
            // safely assume -- the registration call itself needed a
            // real Newtonsoft JObject (see TryRegisterWithFileTransformation's
            // own comment), so this callback's own payload plausibly
            // is one too, but reflection-based property access (the
            // ORIGINAL approach here, matching common examples found
            // elsewhere) won't work on a JObject at all -- its "contents"
            // is a JSON key reached via the indexer, not a real C#
            // property discoverable via GetProperty. Handling BOTH
            // shapes here, trying JObject first, means this doesn't
            // depend on guessing which one is actually correct.
            if (payload is Newtonsoft.Json.Linq.JObject jObj)
            {
                string? contents = jObj["contents"]?.ToString();
                if (string.IsNullOrEmpty(contents) || contents.Contains(ScriptUrl, StringComparison.OrdinalIgnoreCase))
                {
                    return payload;
                }
                jObj["contents"] = Regex.Replace(contents, "</body>", InjectedScriptTag + "</body>", RegexOptions.IgnoreCase);
                return jObj;
            }

            string? reflContents = payload?.GetType().GetProperty("contents")?.GetValue(payload) as string;

            if (string.IsNullOrEmpty(reflContents) || reflContents.Contains(ScriptUrl, StringComparison.OrdinalIgnoreCase))
            {
                return payload!;
            }

            string patched = Regex.Replace(
                reflContents,
                "</body>",
                InjectedScriptTag + "</body>",
                RegexOptions.IgnoreCase);

            payload!.GetType().GetProperty("contents")?.SetValue(payload, patched);
            return payload;
        }
    }
}
