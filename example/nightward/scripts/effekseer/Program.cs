using System.Text.Json;
using Effekseer;
using Effekseer.Data;
using Effekseer.Data.Value;
using Effekseer.Utl;
using Path = System.IO.Path;

var root = Path.GetFullPath(args[0]);
var catalog = JsonDocument.Parse(File.ReadAllText(Path.Combine(root, "img/nightward/reference/effekseer.json")));
var output = Path.Combine(root, "effects/nightward");
Directory.CreateDirectory(output);
Core.New();
Effekseer.Utils.Logger.LogPath = Path.Combine(Path.GetTempPath(), "nightward-effekseer-export.log");
foreach (var entry in catalog.RootElement.GetProperty("effects").EnumerateArray())
{
    Core.New();
    var name = entry.GetProperty("name").GetString();
    var filename = Path.Combine(output, name + ".efkefc");
    Core.Root.SetFullPath(filename);
    var mode = entry.GetProperty("mode").GetString();
    var materialName = mode.StartsWith("beam-") ? mode : mode == "mask" || mode == "multiply" ? mode : "sprite";
    var materialPath = Path.Combine(output, materialName + ".efkmat");
    var info = new MaterialInformation
    {
        Version = MaterialVersion.Version17,
        GUID = (ulong)(100 + Array.IndexOf(new[] { "sprite", "mask", "multiply", "beam-a", "beam-b" }, materialName)),
        ShadingModel = 1,
        CustomData1Count = 4,
        CustomData = new[] { new MaterialInformation.CustomDataInformation { DefaultValues = new float[] { 1, 1, 0, 0 } } },
        Textures = new[] { new MaterialInformation.TextureInformation
        {
            Name = "Atlas", UniformName = "nightwardAtlas", Index = 0, Type = TextureType.Value,
            IsParam = true, Sampler = 1, DefaultPath = "../../../img/nightward/reference/combat-fx.png",
        } },
        Uniforms = new[] {
            new MaterialInformation.UniformInformation { Name = "Atlas frame", UniformName = "atlasFrame", Type = 3, DefaultValues = new float[] { 0, 0, 1, 1 } },
            new MaterialInformation.UniformInformation { Name = "View exposure and clipping", UniformName = "nightwardGlobals", Type = 3, DefaultValues = new float[] { 1, .5f, 500, 1.5f } },
            new MaterialInformation.UniformInformation { Name = "View linear fog", UniformName = "nightwardFog", Type = 3, DefaultValues = new float[] { 0, 0, 0, 0 } },
        },
        Code = File.ReadAllText(Path.Combine(root, "scripts/effekseer", materialName + ".glsl")),
    };
    info.CustomData[0].Summaries[Language.English] = "Nightward appearance and fog";
    info.CustomData[0].Descriptions[Language.English] = "Driven by the original presentation, independently of gameplay.";
    File.WriteAllBytes(materialPath, info.SaveToBytes());
    var node = Core.Root.Children[0];
    node.Name.SetValue(name);
    node.CommonValues.MaxGeneration.Value.SetValue(1);
    node.CommonValues.Life.SetCenter(100000);
    node.CommonValues.RemoveWhenLifeIsExtinct.SetValue(false);
    node.DrawingValues.Type.SetValue(RendererValues.ParamaterType.Sprite);
    node.DrawingValues.Sprite.Billboard.SetValue(RendererValues.BillboardType.Fixed);
    if (mode.StartsWith("beam-"))
    {
        node.DrawingValues.Sprite.Position.SetValue(RendererValues.SpriteParamater.PositionType.Fixed);
        node.DrawingValues.Sprite.Position_Fixed_UR.X.SetValue(-.5f);
        node.DrawingValues.Sprite.Position_Fixed_UR.Y.SetValue(.5f);
    }
    var renderer = node.RendererCommonValues;
    renderer.Material.SetValue(RendererCommonValues.MaterialType.File);
    renderer.MaterialFile.Path.SetAbsolutePath(materialPath);
    renderer.AlphaBlend.SetValue(mode == "add" || mode.StartsWith("beam-") ? AlphaBlendType.Add : mode == "multiply" ? AlphaBlendType.Mul : mode == "mask" ? AlphaBlendType.Opacity : AlphaBlendType.Blend);
    renderer.ZTest.SetValue(true);
    renderer.ZWrite.SetValue(mode == "mask");
    renderer.Filter.SetValue(entry.GetProperty("nearest").GetBoolean() ? RendererCommonValues.FilterType.Nearest : RendererCommonValues.FilterType.Linear);
    renderer.CustomData1.CustomData.SetValue(CustomDataType.DynamicInput);
    var texture = (Effekseer.Data.Value.Path)renderer.MaterialFile.GetTextures(info)[0].Item1.Value;
    texture.SetAbsolutePath(Path.Combine(root, entry.GetProperty("texture").GetString()));
    var frame = (Vector4D)renderer.MaterialFile.GetUniforms(info)[0].Item1.Value;
    var values = entry.GetProperty("uv").EnumerateArray().Select(value => value.GetSingle()).ToArray();
    frame.X.SetValue(values[0]); frame.Y.SetValue(values[1]); frame.Z.SetValue(values[2]); frame.W.SetValue(values[3]);
    Core.SaveTo(filename);
}
Console.WriteLine($"Exported {catalog.RootElement.GetProperty("effects").GetArrayLength()} Nightward effects with Effekseer {Core.Version}.");
