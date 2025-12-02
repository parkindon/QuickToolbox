using Microsoft.AspNetCore.Mvc.RazorPages;

namespace QuickToolbox.Pages
{
    public class IndexModel : PageModel
    {
        private readonly IWebHostEnvironment _env;

        // category → list of tools
        public Dictionary<string, List<ToolInfo>> GroupedTools { get; set; } = new();

        // map filenames to categories
        private static readonly Dictionary<string, string> ToolCategories =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ["WordCounter"] = "Text",
                ["TextFormatter"] = "Text",
                ["CaseConverter"] = "Text",
                ["LoanCalculator"] = "Finance",
                ["SavingsCalculator"] = "Finance",
                ["Tournament"] = "Games",
                ["League"] = "Games",
                ["TeamRandomiser"] = "Games",
                ["PercentageDifference"] = "Numbers",
                ["ColourPalette"] = "Design",
                ["TimeZoneMeetingFinder"] = "Global",
                ["TypographyScaleGenerator"] = "Design",
                ["ThemePreview"] = "Design"

                // add more here as you go
            };

        public IndexModel(IWebHostEnvironment env)
        {
            _env = env;
        }

        public class ToolInfo
        {
            public string Name { get; set; } = "";
            public string Url { get; set; } = "";
            public string Category { get; set; } = "Other";
        }


        public void OnGet()
        {
            var toolsFolder = Path.Combine(_env.ContentRootPath, "Pages", "Tools");
            if (!Directory.Exists(toolsFolder))
                return;

            var files = Directory.GetFiles(toolsFolder, "*.cshtml")
                                 .Where(f => !Path.GetFileName(f).StartsWith("_"))
                                 .ToList();

            foreach (var file in files)
            {
                var fileName = Path.GetFileNameWithoutExtension(file);
                var displayName = FormatName(fileName);

                var category = ToolCategories.TryGetValue(fileName, out var cat)
                    ? cat
                    : "Other";

                var tool = new ToolInfo
                {
                    Name = displayName,
                    Url = $"/Tools/{fileName}",
                    Category = category
                };

                if (!GroupedTools.TryGetValue(category, out var list))
                {
                    list = new List<ToolInfo>();
                    GroupedTools[category] = list;
                }

                list.Add(tool);
            }
        }

        private string FormatName(string name)
        {
            // "WordCounter" → "Word Counter"
            return string.Concat(
                name.Select((c, i) =>
                    i > 0 && char.IsUpper(c) ? " " + c : c.ToString()
                )
            );
        }
    }
}
